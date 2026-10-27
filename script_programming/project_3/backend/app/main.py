"""
Główny moduł aplikacji FastAPI (Main Entrypoint).

Cyberbezpieczeństwo:
- CORS (Cross-Origin Resource Sharing):
  Domyślnie przeglądarki egzekwują politykę SOP (Same-Origin Policy) blokując zapytania
  asynchroniczne z innego źródła (inny port/domena). Middleware CORS definiuje dozwolone
  źródła, metody i nagłówki, zapobiegając nieautoryzowanym żądaniom międzywitrynowym.
- Zero-Friction Setup:
  Podczas startu aplikacji (lifespan) automatycznie tworzone są tabele w SQLite,
  co eliminuje konieczność manualnego konfigurowania bazy przez studentów.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.database import engine, Base
# Import modeli jest konieczny, aby SQLAlchemy zarejestrowało ich metadane w Base
import app.models  # noqa: F401
from app.routers import auth_router, links_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Upewniamy się, że tabele istnieją także w cyklu życia ASGI
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Prywatny Rejestr Linków API (Laboratorium 03)",
    description=(
        "Edukacyjny serwer REST API demonstrujący uwierzytelnianie JWT, "
        "ochronę przed BOLA/IDOR (OWASP API Security Top 1:2023), "
        "relacje SQLAlchemy 2.0 oraz walidację schematów Pydantic v2."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# 🛡️ Konfiguracja polityki CORS (Cross-Origin Resource Sharing)
# Konieczna, aby przeglądarka (SOP) zezwoliła frontendowi na komunikację z API na innym porcie.
app.add_middleware(
    CORSMiddleware,
    # [KONIECZNA w produkcji]: Ścisła biała lista znanych domen (np. :5500, :3000) - zakaz "*" przy uwierzytelnianiu
    allow_origins=CORS_ORIGINS,
    # [KONIECZNA w laboratorium]: Elastyczny regex dopuszczający dowolny lokalny port frontendu (Live Server 5500/5501, Vite 5173)
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    # [KONIECZNA dla sesji/auth]: Zezwala przeglądarce na przesyłanie poświadczeń (ciasteczek HttpOnly, tokenów tożsamości)
    allow_credentials=True,
    # [KONIECZNA dla CRUD]: Zezwala na metody modyfikujące (POST, PATCH, DELETE) w zapytaniach preflight OPTIONS
    allow_methods=["*"],
    # [KONIECZNA dla JWT]: Zezwala na przesyłanie niestandardowego nagłówka Authorization: Bearer <token> oraz Content-Type
    allow_headers=["*"],
)

# Rejestracja routerów
app.include_router(auth_router)
app.include_router(links_router)


@app.get("/", tags=["Health"])
def root():
    """Endpoint kontrolny stanu serwera."""
    return {
        "status": "online",
        "service": "Prywatny Rejestr Linków API",
        "docs_url": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "links": "/api/links"
        }
    }
