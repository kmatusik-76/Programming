"""
Schematy Pydantic dla tokenów JWT.

Cyberbezpieczeństwo (RFC 6750):
- Typ tokenu `bearer` oznacza, że okaziciel (bearer) tokenu jest traktowany jako uwierzytelniony podmiot.
- Token nie może być podatny na manipulacje, dlatego używamy kryptograficznego podpisu HMAC-SHA256.
"""
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None
