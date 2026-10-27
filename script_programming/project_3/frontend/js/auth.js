/**
 * Moduł uwierzytelniania i obsługi sesji (auth.js).
 * Zgodny ze standardem i wzorcami z Wykładu 3 (ToDoWithBackend).
 * 
 * Zagadnienia inżynierskie i cyberbezpieczeństwo:
 * 1. Przechowywanie tokena w pamięci RAM (In-Memory Token Storage):
 *    - Token JWT trzymany jest wyłącznie w zmiennej modułu w pamięci operacyjnej (ochrona przed XSS).
 * 2. Automatyczne przywracanie sesji (HttpOnly Cookie):
 *    - Zapytania z credentials: "include" pozwalają na automatyczną weryfikację tożsamości po F5.
 * 3. Prosty kontrakt DOM paska nawigacji:
 *    - #loginBtn       - przycisk otwierający okno logowania
 *    - #userInfo       - kontener profilu użytkownika (widoczny po zalogowaniu)
 *    - #loggedUsername - element wyświetlający nazwę zalogowanego użytkownika
 *    - #logoutBtn      - przycisk wylogowania
 * 4. Subskrypcje zdarzeń tożsamości (Wzorzec z wykładu):
 *    - Moduł eksportuje onLoginSuccess oraz onLogoutSuccess, aby inne moduły (np. links.js)
 *      mogły reagować na zmianę tożsamości bez komplikowania pliku wejściowego main.js.
 */

import { authApi, setToken, onUnauthorized } from "./api.js";

// Rejestry słuchaczy zdarzeń uwierzytelniania (dokładnie jak w projekcie z wykładu)
let loginSuccessCallback = null;
let logoutSuccessCallback = null;

export function onLoginSuccess(callback) {
  loginSuccessCallback = callback;
}

export function onLogoutSuccess(callback) {
  logoutSuccessCallback = callback;
}

/**
 * Automatyczne wstrzyknięcie okna modalnego HTML5 <dialog>, jeśli brak w pliku HTML.
 */
function ensureModalExists() {
  if (document.querySelector("#authDialog")) return;

  const modalHtml = `
  <dialog id="authDialog" class="auth-dialog">
    <div class="auth-modal-content">
      <div class="auth-header">
        <h3 id="authTitle">Logowanie do systemu</h3>
        <button id="authCloseBtn" type="button" class="btn-close" aria-label="Zamknij">&times;</button>
      </div>

      <div id="authMessage" class="auth-message" aria-live="polite"></div>

      <form id="authForm" novalidate>
        <div class="form-group">
          <label for="authUsername">Login:</label>
          <input type="text" id="authUsername" name="username" required autocomplete="username" />
        </div>

        <div class="form-group">
          <label for="authPassword">Hasło:</label>
          <input type="password" id="authPassword" name="password" required autocomplete="current-password" />
        </div>

        <div class="form-actions">
          <button type="submit" id="authSubmitBtn" class="btn btn-primary">Zaloguj się</button>
          <button type="button" id="authSwitchBtn" class="btn-link">Nie masz konta? Zarejestruj się</button>
        </div>
      </form>
    </div>
  </dialog>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

/**
 * Aktualizacja paska tożsamości użytkownika w nawigacji.
 */
function updateSessionUI(user) {
  const loggedUsername = document.querySelector("#loggedUsername");
  const userInfo = document.querySelector("#userInfo");
  const loginBtn = document.querySelector("#loginBtn");

  if (user) {
    if (loggedUsername) loggedUsername.textContent = user.username;
    if (userInfo) userInfo.classList.remove("hidden");
    if (loginBtn) loginBtn.classList.add("hidden");
  } else {
    if (loggedUsername) loggedUsername.textContent = "--";
    if (userInfo) userInfo.classList.add("hidden");
    if (loginBtn) loginBtn.classList.remove("hidden");
  }
}

/**
 * Wewnętrzna obsługa wylogowania użytkownika.
 */
async function handleLogout() {
  await authApi.logout();
  updateSessionUI(null);

  if (typeof logoutSuccessCallback === "function") {
    logoutSuccessCallback();
  }
}

/**
 * Wewnętrzne sprawdzenie aktywnej sesji HttpOnly po załadowaniu strony (F5).
 */
async function checkSession() {
  try {
    const user = await authApi.getMe();
    if (user && user.username) {
      updateSessionUI(user);
      if (typeof loginSuccessCallback === "function") {
        loginSuccessCallback(user);
      }
      return;
    }
  } catch {
    // Brak aktywnej sesji lub serwer wyłączony
  }
  updateSessionUI(null);
}

/**
 * Główna funkcja inicjalizująca moduł uwierzytelniania.
 * Wywoływana w main.js bezargumentowo: initAuth();
 */
export function initAuth() {
  // Gwarancja obecności modala w drzewie DOM
  ensureModalExists();

  const authDialog = document.querySelector("#authDialog");
  const authTitle = document.querySelector("#authTitle");
  const authMessage = document.querySelector("#authMessage");
  const authForm = document.querySelector("#authForm");
  const authUsername = document.querySelector("#authUsername");
  const authPassword = document.querySelector("#authPassword");
  const authSubmitBtn = document.querySelector("#authSubmitBtn");
  const authSwitchBtn = document.querySelector("#authSwitchBtn");
  const authCloseBtn = document.querySelector("#authCloseBtn");

  let isLoginMode = true;

  function showMessage(text, type = "error") {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
    authMessage.style.display = "block";
  }

  function clearMessage() {
    if (!authMessage) return;
    authMessage.textContent = "";
    authMessage.className = "auth-message";
    authMessage.style.display = "none";
    if (authUsername) authUsername.classList.remove("error-field");
    if (authPassword) authPassword.classList.remove("error-field");
  }

  function setMode(loginMode) {
    isLoginMode = loginMode;
    clearMessage();
    if (!authTitle || !authSubmitBtn || !authSwitchBtn) return;

    if (isLoginMode) {
      authTitle.textContent = "Logowanie do systemu";
      authSubmitBtn.textContent = "Zaloguj się";
      authSwitchBtn.textContent = "Nie masz konta? Zarejestruj się";
    } else {
      authTitle.textContent = "Rejestracja nowego konta";
      authSubmitBtn.textContent = "Utwórz konto";
      authSwitchBtn.textContent = "Masz już konto? Zaloguj się";
    }
  }

  function openDialog() {
    setMode(true);
    clearMessage();
    if (authForm) authForm.reset();
    if (authDialog && typeof authDialog.showModal === "function") {
      authDialog.showModal();
    }
  }

  function closeDialog() {
    if (authDialog && typeof authDialog.close === "function") {
      authDialog.close();
    }
    clearMessage();
  }

  // Obsługa przycisków wewnątrz okna dialogowego
  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", closeDialog);
  }

  if (authSwitchBtn) {
    authSwitchBtn.addEventListener("click", () => setMode(!isLoginMode));
  }

  // Obsługa przycisków paska nawigacji (logowanie / wylogowanie)
  document.addEventListener("click", (e) => {
    if (e.target.closest("#loginBtn")) {
      openDialog();
    } else if (e.target.closest("#logoutBtn")) {
      handleLogout();
    }
  });

  // Obsługa wysłania formularza (Logowanie / Rejestracja)
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessage();

      const username = authUsername?.value.trim() || "";
      const password = authPassword?.value || "";

      if (username.length < 3) {
        showMessage("Login musi zawierać co najmniej 3 znaki.", "error");
        authUsername?.classList.add("error-field");
        return;
      }
      if (password.length < 8) {
        showMessage("Hasło musi mieć co najmniej 8 znaków.", "error");
        authPassword?.classList.add("error-field");
        return;
      }

      try {
        if (isLoginMode) {
          // 1. Logowanie -> pobranie tokena JWT do pamięci API
          const tokenData = await authApi.login(username, password);
          setToken(tokenData.access_token);

          // 2. Pobranie danych profilu zalogowanego użytkownika
          const user = await authApi.getMe();
          updateSessionUI(user);
          closeDialog();

          if (typeof loginSuccessCallback === "function") {
            loginSuccessCallback(user);
          }
        } else {
          // Rejestracja nowego konta
          await authApi.register(username, password);
          // Najpierw przełączamy tryb (setMode czyści komunikaty), dopiero potem pokazujemy sukces
          setMode(true);
          showMessage("Konto zostało pomyślnie utworzone! Możesz się teraz zalogować.", "success");
          if (authUsername) authUsername.value = username;
          if (authPassword) authPassword.value = "";
        }
      } catch (err) {
        showMessage(err.message, "error");
      }
    });
  }

  // Globalny nasłuch wygaśnięcia sesji (HTTP 401 z backendu)
  onUnauthorized(() => {
    updateSessionUI(null);
    if (typeof logoutSuccessCallback === "function") {
      logoutSuccessCallback();
    }
  });

  // Weryfikacja aktywnej sesji HttpOnly po odświeżeniu witryny (F5)
  checkSession();
}
