The objective of this assignment was to extend the static portfolio from the previous laboratory with dynamic behavior written in pure vanilla JavaScript (ES6+): a modular architecture, a persistent theme switcher, a live calendar, an asynchronous weather widget backed by a public REST API, and an interactive link registry with strict input validation.

---

## 🛠️ Tech Stack & Standards

- **Vanilla JavaScript (ES2020+):** Logic split into dedicated native **ES6 modules** (`theme.js`, `calendar.js`, `weather.js`, `links.js`) with explicit `import` / `export`; `main.js` acts purely as an orchestrator and entry point loaded via `<script type="module">`.
- **Zero External JS Libraries:** Everything relies solely on native Web APIs (DOM, Fetch, Web Storage, `Intl`) — no jQuery, Axios, lodash, or frameworks.
- **Modern CSS:** Dark mode implemented by overriding the design tokens (Custom Properties) under `body.dark`, so the entire UI re-themes without duplicating any rules.

---

## ✨ Features

- **Theme switcher:** Light/dark mode toggled through a class on `<body>`, persisted in `localStorage`, applied immediately on page load and falling back to the system `prefers-color-scheme` preference on the first visit.
- **Calendar card:** Current date with the full weekday and month name in Polish, formatted via `Intl.DateTimeFormat`.
- **Time telemetry (bonus):** Real-time UTC clock and Unix Epoch timestamp refreshed every second with `setInterval()`, updating only text nodes to avoid layout flicker.
- **Weather widget:** Live synoptic data (station, temperature, pressure, wind speed, humidity) from the **IMGW public API** with a city selector, a clear loading state, and a graceful in-page error message with a retry button. Stale responses are discarded when the user switches cities quickly.
- **Link registry:** Form with validated inputs (name of at least 3 characters, URL restricted to `http:` / `https:`), visual error states, automatic form reset, and persistence across sessions through `localStorage`.
- **Domain check (bonus):** Async "Check URL" action using a `no-cors` request with `AbortSignal.timeout(3000)`.
- **Non-blocking delete confirmation (bonus):** In-place two-click pattern ("Na pewno?") that reverts after 3 seconds, with no `confirm()` dialog.

---

## 🔒 Security & Reliability

- **Zero-XSS rendering:** No `innerHTML` / `outerHTML` anywhere — all elements are built with `createElement`, `textContent`, and `append`.
- **URL sanitization:** Whitelist-based protocol validation blocks `javascript:` and `data:` payloads; stored entries are re-validated on load, since `localStorage` is treated as untrusted input.
- **Safe outbound links:** Generated links open in a new tab with `rel="noopener noreferrer"`.
- **Defensive error handling:** `response.ok` is verified on every request, and all async calls and `JSON.parse()` operations are wrapped in `try...catch`. No blocking `alert()`, `confirm()`, or `prompt()` calls.
- **Efficient event handling:** Link removal uses **event delegation** on the list container instead of per-item listeners.
- **Accessibility:** `aria-pressed` on the theme toggle, `aria-live` regions for dynamic widgets, and `aria-invalid` on form fields with errors.