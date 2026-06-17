const CACHE_VERSION = 'v2'
const CACHE_NAME = 'spe-cache-' + CACHE_VERSION

const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './img/icon-192.png',
  './img/icon-512.png'
]

self.addEventListener('install', function(event) {
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE)
    })
  )
})

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }

          return null
        })
      )
    }).then(function() {
      return self.clients.claim()
    })
  )
})

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        const respostaClone = response.clone()

        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, respostaClone)
        })

        return response
      })
      .catch(function() {
        return caches.match(event.request)
      })
  )
})
