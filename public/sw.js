const CACHE_NAME = 'transcribe-v8';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/socket.io/socket.io.js',
  '/icon-192.svg',
  '/icon-512.svg',
  '/apple-touch-icon.png'
];

// Install event - cache resources and take control immediately
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Fetch event - network first, then cache (better for frequently updated apps)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip unsupported URL schemes (chrome-extension, moz-extension, etc.)
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Socket.IO and other dynamic requests
  if (event.request.url.includes('/socket.io/') || 
      event.request.url.includes('sockjs') ||
      event.request.url.includes('api/')) {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then((response) => {
        // If successful, update cache and return response
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              // Double-check URL scheme before caching
              const requestUrl = new URL(event.request.url);
              if (requestUrl.protocol.startsWith('http')) {
                cache.put(event.request, responseClone).catch((error) => {
                  console.warn('Failed to cache request:', event.request.url, error);
                });
              }
            });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              console.log('Serving from cache:', event.request.url);
              return response;
            }
            // If not in cache either, return a basic response for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
          });
      })
  );
});

// Activate event - clean up old caches and take control of all clients
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 