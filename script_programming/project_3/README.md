# Laboratorium 03 – Prywatny rejestr linków (FastAPI + frontend)

Struktura:

```
lab03/
├── backend/     FastAPI + SQLAlchemy 2.0 + SQLite + JWT (bcrypt)
└── frontend/    Lab 02 rozszerzony o logowanie i komunikację z API
```

## Uruchomienie

**Backend** (terminal 1):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python run.py                   # http://127.0.0.1:8000  (Swagger: /docs)
```

**Frontend** (terminal 2, nie otwieraj index.html przez file://):

```bash
cd frontend
python -m http.server 5500      # http://127.0.0.1:5500
```

Do `frontend/` skopiuj swój folder `assets/` z Lab 02 (obrazki i ikony).

## Co zostało dopisane względem startera

- `backend/app/models/link.py` – pola `title`, `url`, `created_at`
- `backend/app/schemas/link.py` – `LinkCreate` (walidacja `HttpUrl`), `LinkResponse`
- `backend/app/routers/links.py` – GET/POST/DELETE `/api/links` z ochroną BOLA (403)
- `frontend/js/api.js` – `linksApi.getAll / create / delete`
- `frontend/js/links.js` – zamiana `localStorage` na wywołania API, ukrywanie panelu zależnie od sesji
- `frontend/js/main.js` – wywołanie `initAuth()`
- `frontend/index.html` – `auth.css`, pasek `#userSession`, panel linków startuje z `.hidden`
- `frontend/js/auth.js` – poprawka: komunikat „Konto utworzone” znikał od razu po rejestracji

## Test BOLA w Swagger UI

1. Zarejestruj `userA` i `userB` (POST `/api/auth/register`).
2. Zaloguj się jako `userA` (przycisk Authorize), dodaj link (POST `/api/links`).
3. Zaloguj się jako `userB` i wywołaj DELETE `/api/links/{id}` linku użytkownika A. Odpowiedź: **403**.
