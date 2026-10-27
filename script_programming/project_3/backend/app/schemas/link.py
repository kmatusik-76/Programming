"""
Schematy walidacji Pydantic v2 dla odnośników (Link).
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class LinkCreate(BaseModel):
    """Dane wejściowe tworzenia odnośnika (walidacja po stronie serwera)."""
    title: str = Field(..., min_length=3, max_length=100, description="Nazwa odnośnika")
    url: HttpUrl = Field(..., description="Prawidłowy adres URI (wyłącznie schematy http/https)")


class LinkResponse(BaseModel):
    """Dane wyjściowe odnośnika zwracane klientowi."""
    id: int
    title: str
    url: HttpUrl
    created_at: datetime
    owner_id: int

    model_config = ConfigDict(from_attributes=True)
