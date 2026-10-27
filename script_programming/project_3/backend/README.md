# Serwer REST API (Laboratorium 03)

Edukacyjny backend REST API w oparciu o FastAPI, SQLAlchemy 2.0 i SQLite.

## Uruchomienie lokalne:

1. Przejdź do katalogu backendu:
   ```bash
   cd backend
   ```

2. Utwórz wirtualne środowisko Pythona:
   ```bash
   python -m venv .venv
   ```

3. Aktywuj środowisko:
   * **Windows (PowerShell / CMD):**
     ```bash
     .venv\Scripts\activate
     ```
   * **Linux / macOS:**
     ```bash
     source .venv/bin/activate
     ```

4. Zainstaluj wymagane biblioteki:
   ```bash
   pip install -r requirements.txt
   ```

5. Uruchom serwer developerski:
   ```bash
   python run.py
   ```

Serwer jest dostępny pod adresem: `http://127.0.0.1:8000`  
Interaktywna dokumentacja Swagger UI: `http://127.0.0.1:8000/docs`
