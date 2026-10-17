// Service worker do Magno Space.
// Estratégia "rede primeiro, cache como reserva": com internet, o app sempre abre a versão
// mais nova (sem ficar preso a um deploy antigo); sem internet, abre a última versão salva.
// O scripts/build.js troca __BUILD_ID__ a cada build, o que renova o cache automaticamente.

const CACHE_NAME = "magno-space-__BUILD_ID__";

// Toda alteração nesta lista é conferida pelo build (npm run build falha se algo estiver faltando ou sobrando).
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/main.js",
  "./src/domain.js",
  "./src/store.js",
  "./src/content.js",
  "./src/quotes.js",
  "./src/richtext.js",
  "./src/ouroboros.js",
  "./src/util.js",
  "./src/styles.css",
  "./src/assets/icon.svg",
  "./src/assets/logo.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      })
  );
});
