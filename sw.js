const CACHE_NAME = '8bhub-v3';
const STATIC_ASSETS = [
    '/8B-HUB/',
    '/8B-HUB/index.html',
    '/8B-HUB/style.css',
    '/8B-HUB/script.js',
    '/8B-HUB/manifest.json',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => { }))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = event.request.url;
    if (url.includes('firebaseio') || url.includes('googleapis.com/identitytoolkit') || url.includes('imgbb') || url.includes('cloudinary')) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }
                return response;
            }).catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
