/* Offline service worker for the LEGO SPIKE Simulator bundle.
 * Cache-first for same-origin GET requests, with the app shell and the
 * season bundle precached at install so the app runs offline after the
 * first load (Chromebook, macOS, Windows). */
const CACHE = 'spike-simulator-v1';
const SHELL = [
    '',
    'index.html',
    'season/manifest.json',
    'season/default.lsp-project',
    'complete.zip',
    'ldraw/parts.lst'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);
            const scope = self.registration.scope;
            for (const path of SHELL) {
                try {
                    await cache.add(new Request(scope + path, { cache: 'reload' }));
                } catch {
                    /* a missing optional shell entry must not fail install */
                }
            }
            try {
                const response = await fetch(scope + 'season/manifest.json');
                const manifest = await response.json();
                const assets = [
                    ...(manifest.models ?? []).map((model) => model.model),
                    ...(manifest.robots ?? []).map((robot) => robot.model)
                ];
                for (const asset of assets) {
                    try {
                        await cache.add(new Request(scope + asset, { cache: 'reload' }));
                    } catch {
                        /* ignore individual asset failures */
                    }
                }
            } catch {
                /* manifest unavailable; runtime caching still applies */
            }
            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE);
            const cached = await cache.match(request, { ignoreSearch: true });
            if (cached) {
                return cached;
            }
            try {
                const response = await fetch(request);
                if (response.ok) {
                    cache.put(request, response.clone());
                }
                return response;
            } catch (error) {
                if (request.mode === 'navigate') {
                    const fallback = await cache.match(self.registration.scope + 'index.html');
                    if (fallback) {
                        return fallback;
                    }
                }
                throw error;
            }
        })()
    );
});
