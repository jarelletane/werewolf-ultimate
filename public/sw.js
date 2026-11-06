const CACHE = "werewolf-ultimate-v1";
const scopeUrl = (path = "./") => new URL(path, self.registration.scope).toString();

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const manifestResponse = await fetch(scopeUrl("offline-assets.json"));
    const audio = manifestResponse.ok ? await manifestResponse.json() : [];
    const shell = ["./", "manifest.webmanifest", "offline-assets.json", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
    const responses = await Promise.allSettled([...shell, ...audio].map(async (path) => {
      const request = new Request(scopeUrl(path), { cache: "reload" });
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
        if (path === "./") {
          const html = await response.text();
          const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]).filter((asset) => asset.startsWith("./assets/") || asset.startsWith("/assets/"));
          await Promise.all(assets.map(async (asset) => {
            const assetRequest = new Request(new URL(asset, scopeUrl()), { cache: "reload" });
            const assetResponse = await fetch(assetRequest);
            if (assetResponse.ok) await cache.put(assetRequest, assetResponse);
          }));
        }
      }
    }));
    if (!responses.some((result) => result.status === "fulfilled")) throw new Error("Offline cache could not be created");
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (response.ok) (await caches.open(CACHE)).put(scopeUrl(), response.clone());
      return response;
    }).catch(() => caches.match(scopeUrl()).then((response) => response || Response.error())));
    return;
  }
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then(async (response) => {
    if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());
    return response;
  })));
});
