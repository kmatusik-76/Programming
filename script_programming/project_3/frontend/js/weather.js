import { createEl } from './dom.js';

const API_BASE = 'https://danepubliczne.imgw.pl/api/data/synop/station/';
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_STATION = 'krakow';

const STATIONS = [
    { slug: 'krakow', label: 'Kraków' },
    { slug: 'warszawa', label: 'Warszawa' },
    { slug: 'wroclaw', label: 'Wrocław' },
    { slug: 'gdansk', label: 'Gdańsk' },
];

async function fetchWeather(slug) {
    const response = await fetch(`${API_BASE}${encodeURIComponent(slug)}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`Błąd HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
        throw new Error('Nieprawidłowa odpowiedź API');
    }
    return data;
}

function formatValue(raw, unit) {
    if (raw === null || raw === undefined || raw === '') {
        return 'brak danych';
    }
    const number = Number(raw);
    if (!Number.isFinite(number)) {
        return 'brak danych';
    }
    return `${number.toLocaleString('pl-PL')} ${unit}`;
}

function buildRow(label, value) {
    const row = createEl('div');
    row.append(createEl('dt', { text: label }), createEl('dd', { text: value }));
    return row;
}

function buildWeatherView(data, fallbackName) {
    const list = createEl('dl', { className: 'weather-data' });
    list.append(
        buildRow('Stacja', data.stacja || fallbackName),
        buildRow('Temperatura', formatValue(data.temperatura, '°C')),
        buildRow('Ciśnienie', formatValue(data.cisnienie, 'hPa')),
        buildRow('Wiatr', formatValue(data.predkosc_wiatru, 'm/s')),
        buildRow('Wilgotność', formatValue(data.wilgotnosc_wzgledna, '%')),
    );

    const fragment = document.createDocumentFragment();
    fragment.append(list);

    if (data.data_pomiaru && data.godzina_pomiaru) {
        fragment.append(
            createEl('p', {
                className: 'weather-meta',
                text: `Pomiar: ${data.data_pomiaru}, godz. ${data.godzina_pomiaru}:00`,
            }),
        );
    }
    return fragment;
}

export function initWeather(city = DEFAULT_STATION) {
    const box = document.getElementById('weather-box');
    if (!box) {
        return;
    }

    // Szkielet widgetu: nagłówek z wyborem miasta + obszar na treść/stany.
    const select = createEl('select', { attrs: { id: 'weather-station', 'aria-label': 'Wybierz miasto' } });
    for (const { slug, label } of STATIONS) {
        const option = createEl('option', { text: label, attrs: { value: slug } });
        select.append(option);
    }
    select.value = STATIONS.some((item) => item.slug === city) ? city : DEFAULT_STATION;

    const header = createEl('div', { className: 'widget-header' });
    header.append(createEl('h3', { text: 'Pogoda' }), select);

    const content = createEl('div', { attrs: { 'aria-live': 'polite' } });

    box.replaceChildren(header, content);
    box.classList.add('is-ready');

    let requestId = 0;

    async function load(slug) {
        const currentRequest = ++requestId;
        const station = STATIONS.find((item) => item.slug === slug);

        box.setAttribute('aria-busy', 'true');
        content.replaceChildren(createEl('p', { className: 'widget-state', text: 'Ładowanie danych…' }));

        try {
            const data = await fetchWeather(slug);
            if (currentRequest !== requestId) {
                return; // zignoruj spóźnioną odpowiedź po zmianie miasta
            }
            content.replaceChildren(buildWeatherView(data, station?.label ?? slug));
        } catch {
            if (currentRequest !== requestId) {
                return;
            }
            const retry = createEl('button', {
                className: 'widget-retry',
                text: 'Spróbuj ponownie',
                attrs: { type: 'button' },
            });
            retry.addEventListener('click', () => load(select.value));

            const errorBox = createEl('div');
            errorBox.append(
                createEl('p', {
                    className: 'widget-error',
                    text: 'Nie udało się pobrać danych pogodowych. Sprawdź połączenie z internetem lub spróbuj później.',
                }),
                retry,
            );
            content.replaceChildren(errorBox);
        } finally {
            if (currentRequest === requestId) {
                box.removeAttribute('aria-busy');
            }
        }
    }

    select.addEventListener('change', () => load(select.value));
    load(select.value);
}
