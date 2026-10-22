// js/calendar.js
/**
 * Moduł kartki z kalendarza.
 * 
 * Odpowiedzialność:
 * - Pobranie bieżącej daty systemowej (new Date())
 * - Sformatowanie dnia tygodnia, dnia i miesiąca w języku polskim
 *   (Wskazówka: new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }))
 * - Bezpieczne wstrzyknięcie sformatowanej treści do dedykowanego slotu DOM (Zero-XSS)
 */

import { createEl } from './dom.js';

const LOCALE = 'pl-PL';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const utcFormatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

function capitalize(text) {
    return text.charAt(0).toLocaleUpperCase(LOCALE) + text.slice(1);
}

function getDateParts(date) {
    const parts = {};
    for (const { type, value } of dateFormatter.formatToParts(date)) {
        parts[type] = value;
    }
    return {
        weekday: capitalize(parts.weekday),
        day: parts.day,
        monthYear: `${parts.month} ${parts.year}`,
    };
}

export function initCalendar() {
    const box = document.getElementById('calendar-box');
    if (!box) {
        return;
    }

    const weekdayEl = createEl('span', { className: 'calendar-weekday' });
    const dayEl = createEl('span', { className: 'calendar-day' });
    const monthEl = createEl('span', { className: 'calendar-month' });
    const utcEl = createEl('p');
    const epochEl = createEl('p');

    const card = createEl('div', { className: 'calendar-card' });
    card.append(weekdayEl, dayEl, monthEl);

    const clock = createEl('div', { className: 'calendar-clock' });
    clock.append(utcEl, epochEl);

    box.replaceChildren(card, clock);
    box.classList.add('is-ready');

    let renderedDay = '';

    function render() {
        const now = new Date();

        // Datę odświeżamy tylko przy zmianie dnia, zegar co sekundę (bez migotania).
        const { weekday, day, monthYear } = getDateParts(now);
        const dayKey = `${weekday}|${day}|${monthYear}`;
        if (dayKey !== renderedDay) {
            renderedDay = dayKey;
            weekdayEl.textContent = weekday;
            dayEl.textContent = day;
            monthEl.textContent = monthYear;
        }

        utcEl.textContent = `${utcFormatter.format(now)} UTC`;
        epochEl.textContent = `Epoch: ${Math.floor(now.getTime() / 1000)}`;
    }

    render();
    setInterval(render, 1000);
}
