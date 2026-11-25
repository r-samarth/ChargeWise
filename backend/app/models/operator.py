import uuid

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class Operator(Base, TimestampMixin):
    __tablename__ = "operators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    official_website: Mapped[str | None] = mapped_column(Text, nullable=True)
    android_app_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    ios_app_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    support_phone: Mapped[str | None] = mapped_column(String(120), nullable=True)
    support_email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    payment_information: Mapped[str | None] = mapped_column(Text, nullable=True)
    reservation_support: Mapped[str] = mapped_column(String(64), nullable=False, default="unknown")
    api_or_ocpi_information: Mapped[str | None] = mapped_column(Text, nullable=True)

    stations = relationship("ChargingStation", back_populates="operator")
