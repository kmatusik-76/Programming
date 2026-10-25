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

  
  initTheme();

  
  initCalendar();

  
  initWeather("krakow");

  
  initLinks();
}


app();
