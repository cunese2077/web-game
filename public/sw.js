// Service Worker：PWA 离线支持
// 策略：
//   - install：预缓存静态资源（public 图片/图标/manifest/入口页）
//   - 激活：清理旧版本缓存（发新版后自动生效）
//   - fetch：
//     - 页面导航请求 network-first（优先拿新版本），断网回退缓存 → 离线可玩
//     - 其余同源 GET 资源 stale-while-revalidate（先回缓存、后台更新，JS/图片带 hash 命中旧缓存也无害）
//   - 带 hash 的构建产物（assets/*.js）在运行时按需缓存，无需在 SW 里硬编码文件名
const CACHE_VERSION = "web-game-v1";

// 预缓存清单：public 目录静态资源（文件名稳定，不带 hash）
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./img/background.png",
  "./img/enemy1.png",
  "./img/enemy1_down1.png",
  "./img/enemy1_down2.png",
  "./img/enemy1_down3.png",
  "./img/enemy1_down4.png",
  "./img/enemy2.png",
  "./img/enemy2_down1.png",
  "./img/enemy2_down2.png",
  "./img/enemy2_down3.png",
  "./img/enemy2_down4.png",
  "./img/enemy3_down1.png",
  "./img/enemy3_down2.png",
  "./img/enemy3_down3.png",
  "./img/enemy3_down4.png",
  "./img/enemy3_down5.png",
  "./img/enemy3_down6.png",
  "./img/enemy3_hit.png",
  "./img/enemy3_n1.png",
  "./img/enemy3_n2.png",
  "./img/game_loading1.png",
  "./img/game_loading2.png",
  "./img/game_loading3.png",
  "./img/game_loading4.png",
  "./img/game_pause_nor.png",
  "./img/hero1.png",
  "./img/hero2.png",
  "./img/hero_blowup_n1.png",
  "./img/hero_blowup_n2.png",
  "./img/hero_blowup_n3.png",
  "./img/hero_blowup_n4.png",
  "./img/m.png",
  "./img/m1.png",
  "./img/m2.png",
  "./img/p1.png",
  "./img/p2.png",
  "./img/p3.png",
  "./img/p4.png",
  "./img/p5.png",
  "./img/p6.png",
  "./img/start.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // 新版 SW 立即激活
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())  // 无需刷新页面即接管
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // 只管同源请求

  // 页面导航：network-first，断网回退缓存（离线打开游戏的入口）
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 静态资源：stale-while-revalidate（缓存即时响应，后台静默更新）
  event.respondWith(
    caches.match(req).then((cached) => {
      const refresh = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);  // 断网且无缓存时兜底
      return cached || refresh;
    })
  );
});
