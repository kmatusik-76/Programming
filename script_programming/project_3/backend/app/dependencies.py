"""
Zależności aplikacji FastAPI (Dependency Injection).

Cyberbezpieczeństwo:
- Wstrzykiwanie zależności `get_current_user` wymusza uwierzytelnienie przed wykonaniem
  kodu endpointu (zasada Fail-Closed).
- W przypadku błędnego, sfałszowanego lub przeterminowanego tokena natychmiast zwracany jest
  kod HTTP 401 Unauthorized z nagłówkiem `WWW-Authenticate: Bearer`.
"""
from typing import Generator
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.core.security import decode_access_token

# Mechanizm: OAuth2PasswordBearer z auto_error=False pozwala na uwierzytelnienie
# zarówno przez nagłówek 'Authorization: Bearer <token>' (Swagger / cURL),
# jak i przez bezpieczne ciasteczko sesyjne 'HttpOnly' (przeglądarka internetowa po F5).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_db() -> Generator[Session, None, None]:
    """
    Zarządza cyklem życia sesji bazy danych dla pojedynczego żądania HTTP.
    Gwarantuje poprawne zamknięcie połączenia (db.close()) w bloku finally.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Ekstrahuje tożsamość użytkownika z nagłówka Authorization (Bearer) LUB ciasteczka HttpOnly.
    
    Cyberbezpieczeństwo (Podejście B - Złoty Standard):
    - Jeśli żądanie pochodzi ze Swagger UI lub klienta CLI, token przekazywany jest w nagłówku.
    - Jeśli żądanie pochodzi z przeglądarki, token przekazywany jest w bezpiecznym ciasteczku HttpOnly,
      co chroni przed atakami XSS i zapobiega wylogowaniu po odświeżeniu strony (F5).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowy lub wygasły token autoryzacyjny",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Priorytet: nagłówek Authorization: Bearer <token>
    # 2. Alternatywa: ciasteczko HttpOnly 'access_token'
    actual_token = token or request.cookies.get("access_token")
    if not actual_token:
        raise credentials_exception

    try:
        payload = decode_access_token(actual_token)
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except (jwt.PyJWTError, jwt.ExpiredSignatureError):
        # 🛡️ Ochrona przed fałszowaniem tokena (Tampering) oraz tokenami wygasłymi
        raise credentials_exception

    stmt = select(User).where(User.username == username)
    user = db.scalars(stmt).first()
    if user is None:
        raise credentials_exception

    return user
