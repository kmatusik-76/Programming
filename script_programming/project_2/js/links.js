// js/links.js
/**
 * Moduł dynamicznego rejestru odnośników w panelu bocznym (<aside id="linki">).
 * 
 * Odpowiedzialność:
 * - Obsługa formularza dodawania odnośnika (zdarzenie 'submit', preventDefault)
 * - Walidacja danych (minimalna długość nazwy, weryfikacja poprawności URL za pomocą sanitizeUrl)
 * - Dynamiczne renderowanie listy wpisów w DOM (Zero-XSS: createElement, textContent, append, rel="noopener noreferrer")
 * - Obsługa usuwania elementów za pomocą delegacji zdarzeń (Event Delegation z użyciem e.target.closest)
 * - Zapewnienie trwałości rejestru linków w localStorage (JSON.parse / JSON.stringify)
 */

/**
 * Pomocnicza funkcja weryfikująca i sanityzująca adres URL wprowadzony przez użytkownika:
 * - Wymaga podania pełnego adresu z bezpiecznym protokołem (http: lub https:)
 * - Odrzuca adresy niepoprawne składniowo oraz niebezpieczne pseudoprotokoły (javascript:, data:)
 * - Zwraca znormalizowany, bezpieczny ciąg URL (href) lub null w przypadku nieprawidłowego adresu
 * @param {string} urlString
 * @returns {string|null}
 */
import { createEl } from './dom.js';

const STORAGE_KEY = 'linkRegistry';
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

function generateId() {
    if (globalThis.crypto?.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadLinks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        
        return parsed
            .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
            .map((item) => ({ id: item.id, name: item.name, url: sanitizeUrl(item.url) }))
            .filter((item) => item.url !== null);
    } catch {
        return [];
    }
}

function saveLinks(links) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    } catch {
        
    }
}

export function initLinks() {
    const form = document.getElementById('link-form');
    const nameInput = document.getElementById('link-name');
    const urlInput = document.getElementById('link-url');
    const nameError = document.getElementById('link-name-error');
    const urlError = document.getElementById('link-url-error');
    const status = document.getElementById('link-status');
    const checkButton = document.getElementById('link-check');
    const list = document.getElementById('links-list');

    if (!form || !nameInput || !urlInput || !nameError || !urlError || !status || !checkButton || !list) {
        return;
    }

    let links = loadLinks();
    const pendingDeletes = new Map(); 

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
        const link = links.find((item) => item.id === button.dataset.id);
        const name = link ? link.name : 'odnośnik';
        button.textContent = confirming ? 'Na pewno?' : 'Usuń';
        button.classList.toggle('is-confirming', confirming);
        button.setAttribute('aria-label', confirming ? `Potwierdź usunięcie: ${name}` : `Usuń odnośnik: ${name}`);
    }

    function buildItem(link) {
        const item = createEl('li', { className: 'link-item' });

        const anchor = createEl('a', { text: link.name });
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';

        const deleteButton = createEl('button', {
            className: 'btn-delete',
            attrs: { type: 'button', 'data-id': link.id },
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

    function removeLink(id) {
        links = links.filter((item) => item.id !== id);
        saveLinks(links);
        render();
    }

    
    form.addEventListener('submit', (event) => {
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

        links.push({ id: generateId(), name, url });
        saveLinks(links);
        render();

        form.reset();
        setFieldError(nameInput, nameError, '');
        setFieldError(urlInput, urlError, '');
        setStatus('');
        nameInput.focus();
    });

    nameInput.addEventListener('input', () => setFieldError(nameInput, nameError, ''));
    urlInput.addEventListener('input', () => {
        setFieldError(urlInput, urlError, '');
        setStatus('');
    });

    
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

    render();
}