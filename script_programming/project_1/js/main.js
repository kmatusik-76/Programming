// js/main.js
/**
 * Główny punkt wejścia aplikacji (Laboratorium 02).
 * Odpowiada za import i inicjalizację poszczególnych modułów po załadowaniu drzewa DOM.
 */

import { initTheme } from "./theme.js";
import { initCalendar } from "./calendar.js";
import { initWeather } from "./weather.js";
import { initLinks } from "./links.js";

function app() {
  console.log("Inicjalizacja aplikacji Lab 02...");

  // 1. Inicjalizacja motywu (Dark / Light mode)
  initTheme();

  // 2. Inicjalizacja kartki z kalendarza
  initCalendar();

  // 3. Inicjalizacja widgetu pogody (IMGW REST API)
  initWeather("krakow");

  // 4. Inicjalizacja rejestru linków (formularz, lista, zdarzenia)
  initLinks();
}

// Skrypty typu module domyślnie czekają na sparsowanie dokumentu HTML,
// jednak dobra praktyka inżynierska dopuszcza bezpośrednie uruchomienie:
app();
