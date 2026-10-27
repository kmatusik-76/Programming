import { createEl } from './dom.js';
import { linksApi } from './api.js';
import { onLoginSuccess, onLogoutSuccess } from './auth.js';

const MIN_NAME_LENGTH = 3;
const CONFIRM_TIMEOUT_MS = 3000;
const CHECK_TIMEOUT_MS = 3000;

/**
 * Waliduje i normalizuje adres URL.
 * Dopuszcza wyłącznie protokoły http: i https: (blokuje m.in. javascript: i data:).
 * @returns {string|null} znormalizowany adres lub null, gdy adres jest niepoprawny
 */
export function sanitizeUrl(rawUrl) {
    if (typeof rawUrl !== 'string') {
        return null;
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return null;
    }
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
    }
    if (!parsed.hostname) {
        return null;
    }
    return parsed.href;
}

export function initLinks() {
    const panel = document.getElementById('link-registry');
    const form = document.getElementById('link-form');
    const nameInput = document.getElementById('link-name');
    const urlInput = document.getElementById('link-url');
    const nameError = document.getElementById('link-name-error');
    const urlError = document.getElementById('link-url-error');
    const status = document.getElementById('link-status');
    const checkButton = document.getElementById('link-check');
    const list = document.getElementById('links-list');

    if (!panel || !form || !nameInput || !urlInput || !nameError || !urlError || !status || !checkButton || !list) {
        return;
    }

    let links = [];                      // stan lokalny = kopia danych z serwera
    const pendingDeletes = new Map();    // id -> id timera potwierdzenia

    function setFieldError(input, errorEl, message) {
        errorEl.textContent = message;
        input.classList.toggle('is-invalid', message !== '');
        input.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');
    }

    function setStatus(message, type = '') {
        status.textContent = message;
        status.classList.remove('is-success', 'is-error');
        if (type) {
            status.classList.add(`is-${type}`);
        }
    }

    function validateName() {
        const name = nameInput.value.trim();
        const message = name.length < MIN_NAME_LENGTH
            ? `Nazwa musi mieć co najmniej ${MIN_NAME_LENGTH} znaki (bez spacji na początku i końcu).`
            : '';
        setFieldError(nameInput, nameError, message);
        return message === '' ? name : null;
    }

    function validateUrl() {
        const url = sanitizeUrl(urlInput.value);
        const message = url === null
            ? 'Podaj poprawny adres zaczynający się od http:// lub https://.'
            : '';
        setFieldError(urlInput, urlError, message);
        return url;
    }

    function resetConfirmations() {
        for (const timerId of pendingDeletes.values()) {
            clearTimeout(timerId);
        }
        pendingDeletes.clear();
    }

    function setDeleteButtonState(button, confirming) {
        const link = links.find((item) => String(item.id) === button.dataset.id);
        const name = link ? link.title : 'odnośnik';
        button.textContent = confirming ? 'Na pewno?' : 'Usuń';
        button.classList.toggle('is-confirming', confirming);
        button.setAttribute('aria-label', confirming ? `Potwierdź usunięcie: ${name}` : `Usuń odnośnik: ${name}`);
    }

    function buildItem(link) {
        const item = createEl('li', { className: 'link-item' });

        // Dane z serwera traktujemy jako niezaufane: ponowna walidacja URL przed wstawieniem do href.
        const safeUrl = sanitizeUrl(link.url);
        const anchor = createEl('a', { text: link.title });
        if (safeUrl) {
            anchor.href = safeUrl;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
        }

        const deleteButton = createEl('button', {
            className: 'btn-delete',
            attrs: { type: 'button', 'data-id': String(link.id) },
        });
        setDeleteButtonState(deleteButton, false);

        item.append(anchor, deleteButton);
        return item;
    }

    function render() {
        resetConfirmations();
        if (links.length === 0) {
            list.replaceChildren(createEl('li', { className: 'links-empty', text: 'Brak zapisanych odnośników.' }));
            return;
        }
        list.replaceChildren(...links.map(buildItem));
    }

    async function loadFromServer() {
        try {
            links = await linksApi.getAll();
            setStatus('');
        } catch (error) {
            links = [];
            setStatus(error.message, 'error');
        }
        render();
    }

    async function removeLink(id) {
        try {
            await linksApi.delete(id);
            links = links.filter((item) => String(item.id) !== id);
            setStatus('');
        } catch (error) {
            setStatus(error.message, 'error');
        }
        render();
    }

    // Dodawanie wpisu: walidacja po stronie klienta, a potem zapis przez API
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = validateName();
        const url = validateUrl();

        if (name === null) {
            nameInput.focus();
            setStatus('');
            return;
        }
        if (url === null) {
            urlInput.focus();
            setStatus('');
            return;
        }

        try {
            const created = await linksApi.create({ title: name, url });
            links.push(created);
            render();

            form.reset();
            setFieldError(nameInput, nameError, '');
            setFieldError(urlInput, urlError, '');
            setStatus('');
            nameInput.focus();
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    nameInput.addEventListener('input', () => setFieldError(nameInput, nameError, ''));
    urlInput.addEventListener('input', () => {
        setFieldError(urlInput, urlError, '');
        setStatus('');
    });

    // Usuwanie: delegacja zdarzeń na kontenerze listy + potwierdzenie "Na pewno?" (dwuklik)
    list.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-id]');
        if (!button || !list.contains(button)) {
            return;
        }
        const id = button.dataset.id;

        if (pendingDeletes.has(id)) {
            clearTimeout(pendingDeletes.get(id));
            pendingDeletes.delete(id);
            removeLink(id);
            return;
        }

        setDeleteButtonState(button, true);
        const timerId = setTimeout(() => {
            pendingDeletes.delete(id);
            if (button.isConnected) {
                setDeleteButtonState(button, false);
            }
        }, CONFIRM_TIMEOUT_MS);
        pendingDeletes.set(id, timerId);
    });

    // Bonus: asynchroniczny test osiągalności domeny
    checkButton.addEventListener('click', async () => {
        const url = validateUrl();
        if (url === null) {
            urlInput.focus();
            setStatus('');
            return;
        }

        checkButton.disabled = true;
        setStatus('Sprawdzanie…');
        try {
            await fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
            setStatus('✔ Domena osiągalna', 'success');
        } catch {
            setStatus('✖ Brak odpowiedzi hosta', 'error');
        } finally {
            checkButton.disabled = false;
        }
    });

    // Sesja: panel prywatny widoczny tylko dla zalogowanego użytkownika
    onLoginSuccess(() => {
        panel.classList.remove('hidden');
        loadFromServer();
    });

    onLogoutSuccess(() => {
        links = [];
        resetConfirmations();
        list.replaceChildren();          // czyścimy listę z DOM
        setStatus('');
        form.reset();
        panel.classList.add('hidden');
    });

    // Start: niezalogowany użytkownik nie widzi panelu (klasa .hidden jest też w HTML)
    panel.classList.add('hidden');
}
