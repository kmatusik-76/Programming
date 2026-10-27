"""
Moduł kryptografii i bezpieczeństwa (Haszowanie haseł + JWT).

Zagadnienia cyberbezpieczeństwa:
1. Haszowanie haseł (bcrypt):
   - W przeciwieństwie do szybkich funkcji MD5/SHA256, bcrypt jest funkcją powolną (CPU/memory-intensive)
     z regulowanym kosztem (work factor).
   - Automatycznie generuje unikalną sól (salt) dla każdego hasła, co całkowicie unieszkodliwia
     ataki tablicami tęczowymi (rainbow tables).
2. JSON Web Token (JWT):
   - Bezstanowy (stateless) mechanizm autoryzacji: serwer nie musi trzymać stanu sesji w pamięci.
   - Podpis cyfrowy HMAC-SHA256 gwarantuje integralność i autentyczność payloadu (ochrona przed tamperingiem).
   - Ograniczony czas życia (claim `exp`) zmniejsza okno czasowe ataku przy kradzieży tokena (np. z XSS).
   - WAŻNE: Payload JWT jest zakodowany Base64Url, a NIE szyfrowany – każdy może odczytać jego treść!
"""
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


def hash_password(password: str) -> str:
    """
    Haszuje hasło tekstowe algorytmem bcrypt z solą.
    Koszty obliczeniowe bcrypt spowalniają ataki brute-force.
    """
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed_bytes = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_bytes.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Weryfikuje hasło w czasie stałym (constant-time comparison),
    zapobiegając atakom czasowym (timing attacks).
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Generuje token JWT z określonymi claimami oraz czasem wygaśnięcia (exp).
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Claim `exp` jest weryfikowany przez PyJWT podczas dekodowania
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Weryfikuje podpis kryptograficzny oraz ważność tokena JWT.
    Rzuca wyjątki jwt.PyJWTError w przypadku unieważnienia lub naruszenia integralności.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
