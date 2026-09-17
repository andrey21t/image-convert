self.addEventListener('install', () => {
  console.log('[image-convert] service worker install')
  self.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('[image-convert] service worker activate')
  self.clients.claim()
})

self.addEventListener('action.onClicked', () => {
  console.log('[image-convert] action clicked (popup handles UI)')
})
