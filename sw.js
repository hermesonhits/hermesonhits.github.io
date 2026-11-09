/* Hermeson hits Studio · service worker
   Guarda o app no celular para ele abrir mesmo sem internet.
   Os pedidos ao Gemini, ao Suno e as denúncias sempre vão direto para a internet. */
const VERSAO = "hh-app-1.1.0";
const NUCLEO = [
  "./", "index.html", "app.js", "config.js", "manifest.webmanifest", "privacidade.html",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"
];
const FONTES = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith("hh-app-") && k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  // fonte das letras: usa a guardada; se não tiver, baixa e guarda
  if(FONTES.includes(url.hostname)){
    e.respondWith(caches.match(req).then(g => g || fetch(req).then(r => {
      if(r && (r.ok || r.type === "opaque")){ const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
      return r;
    })));
    return;
  }

  // qualquer outro site (Gemini, Suno, denúncias) não passa por aqui
  if(url.origin !== self.location.origin) return;

  // arquivos do app: internet primeiro (pega a versão nova); sem sinal, usa o guardado
  e.respondWith(
    fetch(req).then(r => {
      if(r && r.ok){ const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
      return r;
    }).catch(async () => {
      const guardada = await caches.match(req, { ignoreSearch: true });
      if(guardada) return guardada;
      if(req.mode === "navigate") return (await caches.match("index.html")) || Response.error();
      return Response.error();
    })
  );
});
