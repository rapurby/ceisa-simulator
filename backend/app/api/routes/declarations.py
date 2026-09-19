from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.database import get_db
from app.core.security import require_role
from app.models.declaration import IncomingDeclaration, DeclarationStatus
from app.models.user import User
from app.core.config import settings
from typing import Optional
import datetime, uuid, logging, httpx, base64

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/declarations")
async def list_declarations(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: User = Depends(require_role("admin", "officer")),
    db: AsyncSession = Depends(get_db),
):
    q = select(IncomingDeclaration).order_by(desc(IncomingDeclaration.received_at)).limit(limit).offset(offset)
    if status:
        try:
            q = q.where(IncomingDeclaration.status == DeclarationStatus(status))
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status}")
    result = await db.execute(q)
    rows = result.scalars().all()
    return [_serialize(r) for r in rows]

@router.get("/declarations/stats")
async def stats(
    current_user: User = Depends(require_role("admin", "officer")),
    db: AsyncSession = Depends(get_db),
):
    total    = await db.scalar(select(func.count(IncomingDeclaration.id)))
    pending  = await db.scalar(select(func.count(IncomingDeclaration.id)).where(IncomingDeclaration.status == DeclarationStatus.PENDING))
    accepted = await db.scalar(select(func.count(IncomingDeclaration.id)).where(IncomingDeclaration.status == DeclarationStatus.ACCEPTED))
    rejected = await db.scalar(select(func.count(IncomingDeclaration.id)).where(IncomingDeclaration.status == DeclarationStatus.REJECTED))
    today_count = await db.scalar(
        select(func.count(IncomingDeclaration.id)).where(
            IncomingDeclaration.received_at >= datetime.datetime.utcnow().replace(hour=0, minute=0, second=0)
        )
    )
    return {
        "total": total or 0,
        "pending": pending or 0,
        "accepted": accepted or 0,
        "rejected": rejected or 0,
        "today": today_count or 0,
    }

@router.get("/declarations/{declaration_id}")
async def get_declaration(
    declaration_id: str,
    current_user: User = Depends(require_role("admin", "officer")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(IncomingDeclaration).where(IncomingDeclaration.id == declaration_id))
    decl = result.scalar_one_or_none()
    if not decl:
        raise HTTPException(404, "Declaration not found")
    return _serialize(decl, full=True)

@router.patch("/declarations/{declaration_id}/review")
async def review_declaration(
    declaration_id: str,
    body: dict,
    current_user: User = Depends(require_role("admin", "officer")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(IncomingDeclaration).where(IncomingDeclaration.id == declaration_id))
    decl = result.scalar_one_or_none()
    if not decl:
        raise HTTPException(404, "Declaration not found")

    action = body.get("action")  # "accept" | "reject"
    if action not in ("accept", "reject"):
        raise HTTPException(400, "action must be 'accept' or 'reject'")

    decl.status = DeclarationStatus.ACCEPTED if action == "accept" else DeclarationStatus.REJECTED
    decl.review_notes = body.get("notes", "")
    decl.reviewed_by  = current_user.name
    await db.commit()
    await db.refresh(decl)

    # Callback ke CDP agar status di DeclarAI ikut terupdate.
    # Hasilnya dikembalikan ke UI: kalau gagal, petugas harus tahu bahwa
    # keputusannya belum sampai ke DeclarAI — sebelumnya ini gagal diam-diam
    # dan orang mengira rejection-nya tidak berfungsi.
    callback = {"attempted": False, "ok": False, "reason": None}
    if not settings.CDP_API_URL:
        callback["reason"] = "CDP_API_URL belum dikonfigurasi di server CEISA"
        logger.error("❌ Callback ke CDP dilewati: CDP_API_URL kosong")
    elif not decl.cdp_declaration_id:
        callback["reason"] = "Deklarasi ini tidak punya ID asal dari CDP"
        logger.warning("⚠️ Callback dilewati: cdp_declaration_id kosong")
    else:
        callback["attempted"] = True
        callback["ok"] = await _notify_cdp(
            decl.cdp_declaration_id, action, body.get("notes", "")
        )
        if not callback["ok"]:
            callback["reason"] = "CDP tidak merespons dengan benar — cek log server"

    out = _serialize(decl, full=True)
    out["cdp_callback"] = callback
    return out


async def _notify_cdp(cdp_declaration_id: str, action: str, notes: str = "") -> bool:
    """
    Kirim callback ke CDP backend setelah review.
    Mengembalikan True kalau CDP mengonfirmasi, supaya pemanggil bisa
    memberi tahu petugas ketika keputusannya tidak sampai ke DeclarAI.
    """
    base = settings.CDP_API_URL.rstrip("/")
    # Tanpa skema, httpx menolak URL-nya — ini pernah bikin callback gagal
    # diam-diam karena env var diisi tanpa "https://".
    if not base.startswith(("http://", "https://")):
        base = "https://" + base

    url = f"{base}/api/v1/declarations/{cdp_declaration_id}/ceisa-callback"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json={"action": action, "notes": notes},
                headers={"Authorization": f"Bearer {settings.CDP_API_KEY}"},
            )
            if resp.status_code == 200:
                logger.info(f"✅ CDP callback OK: {cdp_declaration_id} → {action}")
                return True
            logger.error(f"❌ CDP callback HTTP {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        logger.error(f"❌ CDP callback gagal: {e}")
        return False

@router.get("/declarations/{declaration_id}/source-document",
            summary="Proxy ke dokumen asli di CDP — butuh CDP_API_URL dikonfigurasi")
async def get_source_document(
    declaration_id: str,
    current_user: User = Depends(require_role("admin", "officer")),
    db: AsyncSession = Depends(get_db),
):
    """Fetch file asli (PDF/gambar) dari CDP dan stream ke browser petugas CEISA."""
    result = await db.execute(select(IncomingDeclaration).where(IncomingDeclaration.id == declaration_id))
    decl = result.scalar_one_or_none()
    if not decl:
        raise HTTPException(404, "Declaration not found")
    if not decl.cdp_declaration_id:
        raise HTTPException(404, "No CDP declaration ID — cannot fetch source document")
    if not settings.CDP_API_URL:
        raise HTTPException(503, "CDP_API_URL not configured on this server")

    file_url = f"{settings.CDP_API_URL}/api/v1/declarations/{decl.cdp_declaration_id}/file-by-key"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                file_url,
                headers={"Authorization": f"Bearer {settings.CDP_API_KEY}"},
            )
    except Exception as e:
        logger.error(f"CDP file fetch error: {e}")
        raise HTTPException(502, "Gagal mengambil dokumen dari CDP")

    if resp.status_code == 404:
        raise HTTPException(404, "File tidak ditemukan di CDP")
    if resp.status_code != 200:
        raise HTTPException(502, f"CDP returned {resp.status_code}")

    return Response(
        content=resp.content,
        media_type=resp.headers.get("content-type", "application/octet-stream"),
        headers={
            "Content-Disposition": resp.headers.get("content-disposition", "inline"),
        },
    )


@router.get("/declarations/{declaration_id}/aju-excel",
            summary="Download Excel AJU yang dilampirkan CDP saat submit H2H "
                    "(ASUMSI SEMENTARA: base64 di payload.attachment.data — "
                    "belum terverifikasi ke spek H2H CEISA asli)")
async def get_aju_excel(
    declaration_id: str,
    current_user: User = Depends(require_role("admin", "officer")),
    db: AsyncSession = Depends(get_db),
):
    """Decode & serve the Excel AJU attachment CDP sent alongside the H2H payload."""
    result = await db.execute(select(IncomingDeclaration).where(IncomingDeclaration.id == declaration_id))
    decl = result.scalar_one_or_none()
    if not decl:
        raise HTTPException(404, "Declaration not found")

    attachment = (decl.raw_payload or {}).get("attachment")
    if not attachment or not attachment.get("data"):
        raise HTTPException(404, "No Excel AJU attachment found on this declaration")

    try:
        file_bytes = base64.b64decode(attachment["data"])
    except Exception:
        raise HTTPException(500, "Attachment data is not valid base64")

    filename = attachment.get("filename", f"AJU_{str(decl.id)[:8]}.xlsx")
    return Response(
        content=file_bytes,
        media_type=attachment.get(
            "content_type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _serialize(d: IncomingDeclaration, full: bool = False) -> dict:
    out = {
        "id": str(d.id),
        "cdp_declaration_id": d.cdp_declaration_id,
        "cdp_source": d.cdp_source,
        "status": d.status,
        "registration_number": d.registration_number,
        "consignee": d.consignee,
        "npwp": d.npwp,
        "shipper": d.shipper,
        "invoice_number": d.invoice_number,
        "invoice_date": d.invoice_date,
        "currency": d.currency,
        "declared_value": d.declared_value,
        "cif_value": d.cif_value,
        "gross_weight": d.gross_weight,
        "vessel_name": d.vessel_name,
        "bl_number": d.bl_number,
        "port_of_loading": d.port_of_loading,
        "port_of_discharge": d.port_of_discharge,
        "goods_count": d.goods_count,
        "review_notes": d.review_notes,
        "reviewed_by": d.reviewed_by,
        "received_at": d.received_at.isoformat() if d.received_at else None,
        "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        # True kalau CDP_API_URL dikonfigurasi dan cdp_declaration_id ada → bisa tampilkan tombol view doc
        "has_document": bool(settings.CDP_API_URL and d.cdp_declaration_id),
        # True kalau CDP melampirkan Excel AJU di payload H2H → bisa tampilkan tombol download
        "has_aju_excel": bool((d.raw_payload or {}).get("attachment", {}).get("data")),
    }
    if full:
        out["raw_payload"] = d.raw_payload
    return out
