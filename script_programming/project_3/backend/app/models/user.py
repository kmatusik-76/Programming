"""
Model bazy danych reprezentujący użytkownika (User).

Cyberbezpieczeństwo:
- Przechowujemy wyłącznie hashed_password (skrót bcrypt), NIGDY hasło w formie jawnej.
- Unikalny indeks na username zapobiega duplikatom tożsamości.
"""
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.link import Link


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relacja 1-do-wielu: użytkownik posiada listę prywatnych odnośników
    links: Mapped[list["Link"]] = relationship(
        "Link",
        back_populates="owner",
        cascade="all, delete-orphan"
    )
