/// <reference lib="webworker" />
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[];
};

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, PrecacheEntry } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

// cache everything in current domain /assets because precache doesn't seem to include everything
registerRoute(
  ({ url }) => url.origin === location.origin && url.pathname.startsWith("/assets"),
  new StaleWhileRevalidate({
    cacheName: "assets-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        matchOptions: {
          ignoreVary: true,
        },
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.pathname.endsWith("/.well-known/nostr.json"),
  new StaleWhileRevalidate({
    cacheName: "nostr-json-cache",
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 4 * 60 * 60 })],
  }),
);

// Cache images from any domain
registerRoute(
  // match images except gif
  ({ request, url }) => request.destination === "image" && !url.pathname.endsWith(".gif"),
  new CacheFirst({
    cacheName: "image-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        matchOptions: {
          ignoreVary: true,
        },
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
self.addEventListener("install", (event) => {
  // delete all cache on install
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.debug("Deleting cache: ", cacheName);
          return caches.delete(cacheName);
        }),
      );
    }),
  );
  // always skip waiting
  self.skipWaiting();
});
