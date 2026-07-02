from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.database import get_db
from app.core.security import require_role
from app.models.declaration import IncomingDeclaration, DeclarationStatus
from app.models.user import User
from typing import Optional
import datetime, uuid

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
    return _serialize(decl, full=True)

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
    }
    if full:
        out["raw_payload"] = d.raw_payload
    return out
