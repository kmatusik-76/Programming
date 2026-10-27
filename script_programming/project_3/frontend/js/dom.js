/**
 * Pomocnicza fabryka elementów DOM.
 * Używa wyłącznie createElement / textContent / setAttribute (Zero-XSS).
 */
export function createEl(tag, { className, text, attrs } = {}) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    if (attrs) {
        for (const [name, value] of Object.entries(attrs)) {
            element.setAttribute(name, value);
        }
    }
    return element;
}
