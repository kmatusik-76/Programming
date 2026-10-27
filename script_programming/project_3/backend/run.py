"""
Skrypt uruchomieniowy serwera REST API (FastAPI + Uvicorn).

Uruchomienie w terminalu:
    python run.py

Dostęp do interaktywnej dokumentacji OpenAPI/Swagger UI:
    http://127.0.0.1:8000/docs
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
