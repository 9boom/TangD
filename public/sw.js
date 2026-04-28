const CACHE_NAME = 'cache-v2'; // เปลี่ยนเลขเวอร์ชันเมื่อแก้ไข CSS/JS
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

// 1. Install: เก็บไฟล์ Static ลง Cache ทันที
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching Static Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting()) // บังคับให้ SW ตัวใหม่ทำงานทันที
  );
});

// 2. Activate: ล้าง Cache เก่าที่ไม่ได้ใช้
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); // ให้ SW เข้าควบคุมทุก Tab ทันที
});

// 3. Fetch: กลยุทธ์ Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // ดึงจากเน็ตมาอัปเดต Cache ไว้ (Background Update)
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // เก็บเฉพาะ Request ที่สำเร็จเท่านั้น
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // กรณีไม่มีเน็ต และเข้าหน้าเว็บ (Navigate) ให้ไปหน้า Offline
          if (event.request.mode === 'navigate' && !cachedResponse) {
            return caches.match('/index.html');
          }
        });

        // คืนค่าจาก Cache ก่อน (ถ้ามี) ถ้าไม่มีให้รอจากเน็ต
        return cachedResponse || fetchedResponse;
      });
    })
  );
});