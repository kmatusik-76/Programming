"""
Schematy Pydantic dla użytkowników (User).

Cyberbezpieczeństwo:
- Walidacja danych wejściowych (Input Validation): narzucenie minimalnej długości hasła (8 znaków)
  oraz loginu (3 znaki) eliminuje trywialne dane już na poziomie deserializacji.
- Zapobieganie wyciekowi danych (CWE-200): `UserResponse` celowo NIE zawiera pola `hashed_password`.
  Hasz hasła nigdy nie powinien opuszczać serwera bazy danych i pamięci backendu.
"""
from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Nazwa użytkownika (min. 3 znaki)"
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Hasło użytkownika (min. 8 znaków)"
    )


class UserResponse(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)
