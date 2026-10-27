"""
Konfiguracja bazy danych SQLite z wykorzystaniem SQLAlchemy 2.0.

Cyberbezpieczeństwo i architektura:
- Zastosowanie ORM (Object-Relational Mapping) automatycznie parametryzuje zapytania SQL,
  stanowiąc podstawową linię obrony przed wstrzykiwaniem kodu SQL (SQL Injection - CWE-89).
- `check_same_thread: False` jest wymogiem SQLite w środowiskach wielowątkowych/asynchronicznych
  takich jak FastAPI (gdzie jedno zapytanie HTTP może być obsługiwane w osobnym wątku puli).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import DATABASE_URL

# Silnik bazy danych (Engine)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Fabryka sesji bazodanowych
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Nowoczesna klasa bazowa modeli w SQLAlchemy 2.0 (DeclarativeBase)
class Base(DeclarativeBase):
    pass
