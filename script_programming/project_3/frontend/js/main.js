import { initTheme } from './theme.js';
import { initCalendar } from './calendar.js';
import { initWeather } from './weather.js';
import { initLinks } from './links.js';
import { initAuth } from './auth.js';

initTheme();
initCalendar();
initWeather();
initLinks();   // najpierw rejestruje reakcje na logowanie/wylogowanie...
initAuth();    // ...a potem auth sprawdza sesję i może je od razu wywołać
