const STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark';

function readStoredTheme() {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === 'dark' || value === 'light' ? value : null;
    } catch {
        return null;
    }
}

function storeTheme(theme) {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Storage niedostępny (np. tryb prywatny) - motyw działa, ale nie jest zapamiętany.
    }
}

function applyTheme(theme, button) {
    const isDark = theme === 'dark';
    document.body.classList.toggle(DARK_CLASS, isDark);
    if (button) {
        button.setAttribute('aria-pressed', String(isDark));
    }
}

export function initTheme() {
    const button = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initialTheme = readStoredTheme() ?? (prefersDark ? 'dark' : 'light');

    applyTheme(initialTheme, button);

    if (!button) {
        return;
    }

    button.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains(DARK_CLASS) ? 'light' : 'dark';
        applyTheme(nextTheme, button);
        storeTheme(nextTheme);
    });
}
