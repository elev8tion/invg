// Service Worker for Invoice Generator PWA
const CACHE_NAME = 'invoice-pro-v1';
const STATIC_CACHE = 'invoice-pro-static-v1';

// Assets to cache for offline functionality
const CACHE_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .catch((err) => {
        console.log('Service Worker: Error caching assets', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Supabase and external API requests
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('api.emailit.com') ||
      event.request.url.includes('chrome-extension')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the response
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // If offline, return index.html for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'invoice-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncOfflineData());
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      actions: [
        { action: 'view', title: 'View Invoice' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Sync offline data when connection restored
async function syncOfflineData() {
  try {
    // Get offline data from IndexedDB
    const offlineData = await getOfflineData();
    
    if (offlineData && offlineData.length > 0) {
      // Sync data with server
      for (const item of offlineData) {
        await syncDataToServer(item);
      }
      
      // Clear offline data after successful sync
      await clearOfflineData();
      
      // Notify user of successful sync
      self.registration.showNotification('Invoice Pro', {
        body: 'Offline data synced successfully!',
        icon: '/favicon.ico'
      });
    }
  } catch (error) {
    console.error('Service Worker: Error syncing offline data', error);
  }
}

// Helper functions for offline data management
async function getOfflineData() {
  // This would integrate with IndexedDB to get offline stored data
  return [];
}

async function syncDataToServer(data) {
  // This would sync data back to Supabase when online
  console.log('Syncing data:', data);
}

async function clearOfflineData() {
  // This would clear synced data from IndexedDB
  console.log('Clearing offline data');
}