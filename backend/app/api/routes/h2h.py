"""
H2H (Host-to-Host) endpoint — called by DeclarAI/CDP when submitting a declaration.
Auth: Authorization: Bearer <CDP_API_KEY>
"""
import uuid, datetime, random, logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.models.declaration import IncomingDeclaration, DeclarationStatus

router = APIRouter()
logger = logging.getLogger(__name__)

def _reg_number():
    date = datetime.datetime.utcnow().strftime("%Y%m%d")
    return f"PIB-{date}-{random.randint(10000, 99999)}"

def _extract(payload: dict) -> dict:
    """Flatten nested CEISA payload into display fields."""
    header    = payload.get("header", {})
    importer  = payload.get("importer", {})
    exporter  = payload.get("exporter", {})
    transport = payload.get("transport", {})
    invoice   = payload.get("invoice", {})
    packaging = payload.get("packaging", {})
    goods     = payload.get("goods", [])
    return {
        "cdp_declaration_id": header.get("declaration_id"),
        "consignee":     importer.get("consignee_name"),
        "npwp":          importer.get("npwp"),
        "shipper":       exporter.get("shipper_name"),
        "invoice_number": invoice.get("invoice_number"),
        "invoice_date":  invoice.get("invoice_date"),
        "currency":      invoice.get("currency"),
        "declared_value": invoice.get("declared_value"),
        "cif_value":     invoice.get("cif_value"),
        "gross_weight":  packaging.get("gross_weight"),
        "vessel_name":   transport.get("vessel_name"),
        "bl_number":     transport.get("bl_number"),
        "port_of_loading":  exporter.get("port_of_loading"),
        "port_of_discharge": transport.get("port_of_discharge"),
        "goods_count":   len(goods),
    }

@router.post("/h2h/declaration", tags=["H2H"])
async def receive_declaration(
    payload: dict,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate API key from CDP
    token = authorization.removeprefix("Bearer ").strip()
    if token != settings.CDP_API_KEY:
        logger.warning(f"H2H: rejected invalid API key")
        raise HTTPException(status_code=401, detail="Invalid API key")

    fields = _extract(payload)
    reg    = _reg_number()

    decl = IncomingDeclaration(
        status=DeclarationStatus.PENDING,
        registration_number=reg,
        raw_payload=payload,
        **fields,
    )
    db.add(decl)
    await db.commit()
    await db.refresh(decl)

    logger.info(f"✅ H2H received declaration {decl.id} from CDP ({fields.get('consignee')})")

    return {
        "status": "ACCEPTED",
        "registration_number": reg,
        "message": "Declaration received and registered [CEISA Simulator]",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "simulator": True,
    }
