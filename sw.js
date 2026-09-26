// sw.js
// Service worker เบา ๆ พอให้ผ่านเกณฑ์ "ติดตั้งเป็นแอพ" (installable PWA) ของ Chrome/Android เท่านั้น
// ตั้งใจไม่ cache ไฟล์ .html/.js/.css เลย กัน "เปิดแอพแล้วเจอโค้ดเก่าค้าง" หลังอัปเดตเว็บ (ปัญหาคลาสสิกของ PWA)
// cache แค่รูป/ฟอนต์ที่แทบไม่เปลี่ยนเลย ด้วยกลยุทธ์ stale-while-revalidate (โชว์ของแคชไว้ก่อนให้เร็ว
// พร้อมโหลดของใหม่แทนเงียบ ๆ ไปด้วย) ไม่ใช่ full offline mode และไม่ยุ่งกับ request ไป Supabase เลย

const CACHE_NAME = "chimchim-static-v1";
const STATIC_ASSET_RE = /\.(png|jpe?g|webp|svg|gif|woff2?)$/i;

self.addEventListener("install", function() {
	self.skipWaiting();
});

self.addEventListener("activate", function(event) {
	event.waitUntil(
		caches.keys().then(function(keys) {
			return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
		}).then(function() { return self.clients.claim(); })
	);
});

self.addEventListener("fetch", function(event) {
	var req = event.request;
	// เฉพาะ GET รูป/ฟอนต์ของเว็บนี้เองเท่านั้น ปล่อย HTML/JS/CSS/Supabase/ภายนอกอื่น ๆ ผ่านตามปกติทั้งหมด
	if (req.method !== "GET" || !STATIC_ASSET_RE.test(new URL(req.url).pathname)) return;

	event.respondWith(
		caches.open(CACHE_NAME).then(function(cache) {
			return cache.match(req).then(function(cached) {
				var fetchPromise = fetch(req).then(function(res) {
					if (res && res.status === 200) cache.put(req, res.clone());
					return res;
				}).catch(function() { return cached; });
				return cached || fetchPromise;
			});
		})
	);
});
