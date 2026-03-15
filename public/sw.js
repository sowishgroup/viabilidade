/* Service worker mínimo para PWA – permite instalação no celular */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})
