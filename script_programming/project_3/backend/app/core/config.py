"""
Konfiguracja aplikacji (Core Config).

Cyberbezpieczeństwo:
- CWE-798: Użycie twardo zakodowanych danych uwierzytelniających. W produkcji
  klucze kryptograficzne i hasła bazodanowe ZAWSZE pobiera się ze zmiennych środowiskowych (.env / vault).
- RFC 7518 (sekcja 3.2): Algorytm HS256 (HMAC with SHA-256) wymaga klucza o długości
  co najmniej 256 bitów (32 bajty). Krótsze klucze są podatne na szybkie złamanie metodą brute-force.
"""
import os

# Mechanizm: Pobieramy zmienne środowiskowe z domyślnymi wartościami dydaktycznymi dla środowiska lokalnego
SECRET_KEY: str = os.getenv(
    "SECRET_KEY",
    "wyklad-03-super-bezpieczny-klucz-jwt-min-32-znaki-1234567890"  # Klucz > 32 bajty (256 bitów)
)
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# SQLite zero-configuration dla zajęć laboratoryjnych
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./links.db")

# Dozwolone domeny dla CORS (Cross-Origin Resource Sharing)
# W celach dydaktycznych zezwalamy na lokalne serwery frontendu (Live Server, Vite, file://)
CORS_ORIGINS: list[str] = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
