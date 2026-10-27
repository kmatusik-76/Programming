/**
 * Centralny klient HTTP API (api.js).
 * 
 * Zagadnienia inżynierskie i cyberbezpieczeństwo (Złoty Standard z Wykładu 3):
 * 1. Przechowywanie tokena w pamięci (In-Memory Token):
 *    - Token JWT jest trzymany w zmiennej modułu w pamięci RAM (`authToken`), a nie w `localStorage`.
 *    - Zabezpiecza to token przed kradzieżą przez złośliwe skrypty atakujące magazyn lokalny (XSS Stealing).
 * 2. Ciasteczko HttpOnly i sesja po F5:
 *    - Zapytania wykonują `credentials: "include"`, co nakazuje przeglądarce przesyłanie ciasteczek
 *      między domenami/portami. Dzięki temu sesja przetrwa odświeżenie strony bez narażania tokena na kradzież.
 * 3. Bezpieczne parsowanie błędów i odporność sieciowa:
 *    - W przypadku zatrzymania serwera backendowego `fetch` rzuca wyjątek TypeError,
 *      który jest przechwytywany i tłumaczony na zrozumiały komunikat dla użytkownika.
 */

const API_BASE = "http://127.0.0.1:8000/api";

// Prywatna zmienna modułowa przechowująca token w pamięci RAM
let authToken = null;

// Rejestr słuchaczy zdarzenia wygaśnięcia sesji (HTTP 401)
let onUnauthorizedCallback = null;

export function setToken(token) {
  authToken = token;
}

export function getToken() {
  return authToken;
}

export function clearToken() {
  authToken = null;
}

export function onUnauthorized(callback) {
  onUnauthorizedCallback = callback;
}

/**
 * Główny asynchroniczny wrapper zapytań fetch.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...(options.headers || {})
  };

  // Wstrzykiwanie tożsamości Bearer JWT
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Domyślny Content-Type JSON (jeśli ciało nie jest formularzem URLSearchParams)
  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include" // Przesyłanie poświadczeń sesyjnych HttpOnly (obsługa F5)
    });
  } catch {
    throw new Error("Brak łączności z serwerem API (upewnij się, że backend jest uruchomiony pod adresem http://127.0.0.1:8000).");
  }

  // Obsługa wygaśnięcia lub unieważnienia sesji (HTTP 401)
  if (response.status === 401 && endpoint !== "/auth/login") {
    clearToken();
    if (typeof onUnauthorizedCallback === "function") {
      onUnauthorizedCallback();
    }
  }

  return response;
}

/**
 * Klient endpointów uwierzytelniania (/api/auth)
 */
export const authApi = {
  async register(username, password) {
    const res = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Błąd podczas rejestracji użytkownika.");
    }
    return data;
  },

  async login(username, password) {
    // Format RFC 6749 OAuth2 application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const res = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Niepoprawny login lub hasło.");
    }
    return data; // { access_token, token_type }
  },

  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Ignorujemy błędy sieciowe przy wylogowaniu
    }
    clearToken();
  },

  async getMe() {
    const res = await request("/auth/me");
    if (!res.ok) {
      return null;
    }
    return await res.json().catch(() => null);
  }
};

/**
 * Wyciąga czytelny komunikat z odpowiedzi błędu FastAPI.
 * Dla 422 (walidacja Pydantic) pole "detail" jest listą, dla pozostałych błędów tekstem.
 */
function errorMessage(data, fallback) {
  if (data && typeof data.detail === "string") {
    return data.detail;
  }
  return fallback;
}

/**
 * Klient endpointów rejestru odnośników (/api/links).
 * Wzorzec architektoniczny: API Service Layer.
 */
export const linksApi = {
  /**
   * Pobiera listę prywatnych odnośników bieżącego użytkownika (GET /links).
   * @returns {Promise<Array<{id: number, title: string, url: string}>>}
   */
  async getAll() {
    const res = await request("/links");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(errorMessage(data, "Nie udało się pobrać listy odnośników."));
    }
    return Array.isArray(data) ? data : [];
  },

  /**
   * Zapisuje nowy odnośnik w bazie danych serwera (POST /links).
   * @param {{ title: string, url: string }} linkData
   * @returns {Promise<Object>} Utworzony obiekt odnośnika z bazy
   */
  async create(linkData) {
    const res = await request("/links", {
      method: "POST",
      body: JSON.stringify({ title: linkData.title, url: linkData.url })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(errorMessage(data, "Serwer odrzucił dane odnośnika."));
    }
    return data;
  },

  /**
   * Usuwa wybrany odnośnik z bazy serwera (DELETE /links/{id}).
   * @param {number|string} linkId - Identyfikator usuwanego odnośnika
   * @returns {Promise<boolean>}
   */
  async delete(linkId) {
    const res = await request(`/links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(errorMessage(data, "Nie udało się usunąć odnośnika."));
    }
    return true; // 204 No Content
  }
};
