import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');
const app = new App({ target: target! });

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const base = import.meta.env.BASE_URL;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
            /* offline caching is optional; the app still runs online */
        });
    });
}

export default app;
