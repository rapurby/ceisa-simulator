from sqlalchemy import Column, String, Float, DateTime, JSON, Text, Integer
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum, uuid

class DeclarationStatus(str, enum.Enum):
    PENDING  = "pending"    # baru masuk, belum di-review
    ACCEPTED = "accepted"   # diterima (auto atau manual)
    REJECTED = "rejected"   # ditolak (manual)

class IncomingDeclaration(Base):
    __tablename__ = "ceisa_declarations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # CDP source info
    cdp_declaration_id = Column(String, nullable=True, index=True)
    cdp_source         = Column(String, default="DeclarAI / Cikarang Dry Port")

    # Status
    # PENTING: nama type enum HARUS eksplisit dan unik ("ceisa_declaration_status").
    # Tanpa ini SQLAlchemy memakai nama default "declarationstatus" yang SUDAH ada
    # di database gabungan (milik DeclarAI, isinya uploaded/processing/dll) —
    # insert 'pending' akan ditolak Postgres.
    status = Column(
        SAEnum(DeclarationStatus, name="ceisa_declaration_status"),
        default=DeclarationStatus.PENDING,
        index=True,
    )
    registration_number = Column(String, nullable=True)   # BC reg number setelah accepted
    review_notes        = Column(Text, nullable=True)
    reviewed_by         = Column(String, nullable=True)

    # Key fields (flattened for display)
    consignee       = Column(String, nullable=True)
    npwp            = Column(String, nullable=True)
    shipper         = Column(String, nullable=True)
    invoice_number  = Column(String, nullable=True)
    invoice_date    = Column(String, nullable=True)
    currency        = Column(String, nullable=True)
    declared_value  = Column(Float, nullable=True)
    cif_value       = Column(Float, nullable=True)
    gross_weight    = Column(Float, nullable=True)
    vessel_name     = Column(String, nullable=True)
    bl_number       = Column(String, nullable=True)
    port_of_loading = Column(String, nullable=True)
    port_of_discharge = Column(String, nullable=True)
    goods_count     = Column(Integer, nullable=True)

    # Full raw payload for reference
    raw_payload = Column(JSON, nullable=True)

    received_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
