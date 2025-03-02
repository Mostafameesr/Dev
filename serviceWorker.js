const CACHE_NAME = 'megaos-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'manifest.json',
  'images/megaos-icon.png',
  'images/android13.png',
  'images/android14.png',
  'images/android15.png'
];

// Function to get icon based on URL
function getVersionIcon(url) {
  if (url.includes('android13')) {
    return 'images/android13.png';
  } else if (url.includes('android14')) {
    return 'images/android14.png';
  } else if (url.includes('android15')) {
    return 'images/android15.png';
  }
  return 'images/megaos-icon.png';
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Handle icon requests specially
  if (event.request.url.includes('favicon.ico') || event.request.url.includes('icon')) {
    event.respondWith(
      fetch(getVersionIcon(event.request.referrer || self.location.origin))
        .catch(() => caches.match('images/megaos-icon.png'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache same-origin requests
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // If fetch fails, try to return offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const currentPath = self.location.pathname;
  const options = {
    body: event.data.text(),
    icon: getVersionIcon(currentPath),
    badge: 'images/megaos-icon.png'
  };

  event.waitUntil(
    self.registration.showNotification('MegaOS Update', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
}); 