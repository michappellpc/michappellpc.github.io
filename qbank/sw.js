// AeroMedQBank moved to https://aeromedqbank.com. This worker clears the old copy and sends open pages to the new address.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('https://aeromedqbank.com/');
})()));
