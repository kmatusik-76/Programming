"""
Router uwierzytelniania (/api/auth).

Cyberbezpieczeństwo:
- Rejestracja: bezpieczne haszowanie haseł funkcją bcrypt z unikalną solą (salt).
- Logowanie: unikanie precyzowania przyczyny błędu (zwracamy generyczny komunikat:
  "Niepoprawny login lub hasło"), co zapobiega wyliczaniu użytkowników (User Enumeration - CWE-204).
- JWT: generowanie podpisanego kryptograficznie biletu wstępu o ograniczonym czasie ważności.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Base
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Rejestracja nowego użytkownika"
)
def register(user_data: UserCreate, db: Session = Depends(get_db)) -> User:
    """
    Kody HTTP:
    - 201 Created: konto pomyślnie utworzone.
    - 400 Bad Request: nazwa użytkownika jest już zajęta.
    - 422 Unprocessable Entity: błąd walidacji danych (np. za krótkie hasło < 8 znaków).
    """
    stmt = select(User).where(User.username == user_data.username)
    existing_user = db.scalars(stmt).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Użytkownik o podanej nazwie już istnieje."
        )

    # Bezpieczne haszowanie hasła przed zapisem do bazy danych
    hashed_pwd = hash_password(user_data.password)

    new_user = User(
        username=user_data.username,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Logowanie i generowanie tokenu JWT (oraz ciasteczka HttpOnly)"
)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Token:
    """
    Obsługuje standardowy formularz OAuth2PasswordRequestForm (pola username i password).
    Kody HTTP:
    - 200 OK: poprawna autoryzacja, zwraca access_token JWT oraz ustawia ciasteczko HttpOnly.
    - 401 Unauthorized: błędne poświadczenia (login lub hasło).
    """
    stmt = select(User).where(User.username == form_data.username)
    user = db.scalars(stmt).first()

    # 🛡️ Zabezpieczenie przed User Enumeration:
    # Weryfikacja hasła wykonywana jest tylko jeśli użytkownik istnieje, lecz komunikat
    # o błędzie jest identyczny w obu przypadkach, aby atakujący nie poznał listy loginów.
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Niepoprawny login lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generujemy token JWT z nazwą użytkownika w claimie `sub` (Subject)
    access_token = create_access_token(data={"sub": user.username})

    # 🛡️ Cyberbezpieczeństwo (Podejście B - Złoty Standard Produkcyjny):
    # Ustawiamy token w ciasteczku z flagą HttpOnly.
    # Zapobiega to kradzieży tożsamości przez ataki XSS (JavaScript nie ma dostępu do ciasteczka),
    # a jednocześnie przeglądarka pamięta zalogowanego użytkownika po odświeżeniu strony (F5).
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Na produkcji z HTTPS ustawić True
        max_age=60 * 60 * 24  # 24 godziny
    )

    return Token(access_token=access_token, token_type="bearer")


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Wylogowanie (unieważnienie ciasteczka HttpOnly)"
)
def logout(response: Response):
    """
    Usuwa bezpieczne ciasteczko sesyjne access_token po stronie przeglądarki.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Pomyślnie wylogowano"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Pobranie profilu zalogowanego użytkownika"
)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    """
    Zwraca tożsamość zalogowanego użytkownika na podstawie przesłanego tokenu JWT.
    Kody HTTP:
    - 200 OK: dane profilowe.
    - 401 Unauthorized: brak ważnego tokena.
    """
    return current_user
