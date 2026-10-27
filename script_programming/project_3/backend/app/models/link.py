"""
Model bazy danych SQLAlchemy dla odnośnika (Link).
"""
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Link(Base):
    __tablename__ = "links"

    # Klucz główny oraz relacja tożsamości gwarantujące bezbłędny start aplikacji (kod 0)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    owner: Mapped["User"] = relationship("User", back_populates="links")

    # Pola właściwe odnośnika
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
