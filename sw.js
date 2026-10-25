/* Crown Siege service worker: plays offline once opened online.
   The shell is network-first so a new release arrives as soon as you're online; icons are cache-first.
   Bump CACHE for every release, and add new files to SHELL. */
var CACHE = "crownsiege-v2";
var SHELL = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "src/main.js",
  "src/audio.js",
  "src/sim/world.js",
  "src/sim/factions.js",
  "src/sim/combat.js",
  "src/sim/economy.js",
  "src/sim/orders.js",
  "src/sim/spells.js",
  "src/sim/ai.js",
  "src/render/rig.js",
  "src/render/parts.js",
  "src/render/fx.js",
  "src/render/draw.js",
  "src/render/camera.js",
  "src/ui/hud.js",
  "src/ui/input.js",
  "src/ui/menus.js",
  "src/ui/store.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(cache){
    /* no-cache: revalidate, so the browser's HTTP cache can't mix files from two releases. */
    return cache.addAll(SHELL.map(function(u){ return new Request(u, {cache:"no-cache"}); }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function cacheFirst(req){
  return caches.match(req).then(function(hit){
    return hit || fetch(req).then(function(res){
      if(res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
      return res;
    });
  });
}

function networkFirst(req){
  return fetch(req.url, {cache:"no-cache", credentials:"same-origin"}).then(function(res){
    if(res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
    return res;
  }).catch(function(){
    return caches.match(req, {ignoreSearch:true}).then(function(hit){ return hit || caches.match("index.html"); });
  });
}

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== location.origin) return;
  e.respondWith(url.pathname.indexOf("/icons/") >= 0 ? cacheFirst(req) : networkFirst(req));
});
