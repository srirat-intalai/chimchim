// chimchim-core.js
// เลเยอร์ข้อมูล/เซสชันที่ต้องพร้อมใช้งาน "ก่อน" สคริปต์เฉพาะหน้าทุกไฟล์ (เพราะ Match % ต้องใช้)
// โหลดต่อจาก chimchim-data.js ทันที ในทุกหน้า ก่อน chimchim-nav.js และสคริปต์เฉพาะหน้า
// เก็บข้อมูลทั้งหมดใน localStorage ของเบราว์เซอร์ผู้ใช้เท่านั้น (prototype ฝั่ง front-end ล้วน ๆ)

/* =====================================================================
   HELPERS ทั่วไป
   ===================================================================== */
function escapeHtml(str) {
	var div = document.createElement("div");
	div.textContent = str == null ? "" : String(str);
	return div.innerHTML.replace(/"/g, "&quot;");
}

/* --- URL รูปที่มาจากข้อมูลผู้ใช้/ฐานข้อมูล (รูปโพสต์ รูปร้าน รูปโปรไฟล์) ต้องผ่านสองฟังก์ชันนี้ก่อนต่อเข้า HTML/CSS เสมอ
   กัน Stored XSS: ใครก็แก้ค่า image_url / images ในฐานข้อมูลเองได้ผ่าน API เช่น ใส่ x" onerror="… ถ้าต่อสตริงตรง ๆ
   สคริปต์จะไปรันบนเครื่องคนอื่นที่เปิดดู — รับเฉพาะรูป data:image, http(s)://, blob: และ path รูปภายในแอป (img/…) --- */
var CHIMCHIM_SAFE_IMG_RE = /^(data:image\/[a-z0-9.+-]+[;,]|https?:\/\/|blob:|(\.\/)?img\/)/i;
function safeImgSrc(url) {
	var u = url == null ? "" : String(url).trim();
	return CHIMCHIM_SAFE_IMG_RE.test(u) ? escapeHtml(u) : "";
}
// สำหรับใส่ใน url('…') ของ CSS — เข้ารหัสอักขระที่หลุดออกจากเครื่องหมายคำพูด/วงเล็บได้
function cssUrl(url) {
	var u = url == null ? "" : String(url).trim();
	if (!CHIMCHIM_SAFE_IMG_RE.test(u)) return "";
	return u.replace(/[\\'"()\s<>]/g, function(c) { return encodeURIComponent(c); });
}

// ผูกกล่องอัปโหลดรูปเอง (input type=file) เข้ากับ hidden input ที่เก็บค่าจริง (data URL) + รูปพรีวิว
// ใช้ร่วมกันได้ทุกฟอร์มที่ให้ผู้ใช้อัปโหลดรูปเอง (รูปเพจร้าน, รูปเมนูเด่นตอนโพสต์ร้าน) แทนดรอปดาวน์เลือกรูปสต็อกเดิม
// บีบอัด + ย่อขนาดรูปก่อนเก็บเป็น base64 ในเครื่องเสมอ — รูปจากกล้องมือถือจริงมักใหญ่ 3-8MB/รูป
// เก็บแบบเต็มความละเอียดได้ไม่กี่รูปก็ชน localStorage quota (~5-10MB รวมทั้งเว็บ) แล้วโพสต์เงียบ ๆ ไม่สำเร็จ
// (เจอบั๊กจริง: กดโพสต์แล้วไม่มีอะไรเกิดขึ้นเลย เพราะ setItem() throw QuotaExceededError แล้วไม่มีใครจับ)
// ย่อเหลือด้านยาวสุดไม่เกิน 1280px + แปลงเป็น JPEG คุณภาพ 80% ลดขนาดไฟล์ลงได้หลายสิบเท่าโดยภาพยังดูดีอยู่
var CHIMCHIM_IMG_MAX_DIMENSION = 1280;
var CHIMCHIM_IMG_JPEG_QUALITY = 0.8;
function บีบอัดรูปภาพ(dataUrl) {
	return new Promise(function(resolve) {
		var img = new Image();
		img.onload = function() {
			var scale = Math.min(1, CHIMCHIM_IMG_MAX_DIMENSION / Math.max(img.width, img.height));
			var canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(img.width * scale));
			canvas.height = Math.max(1, Math.round(img.height * scale));
			var ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			try {
				resolve(canvas.toDataURL("image/jpeg", CHIMCHIM_IMG_JPEG_QUALITY));
			} catch (e) {
				resolve(dataUrl); // บีบอัดไม่ได้ (เช่น canvas tainted) ก็ใช้ของเดิมไปก่อน ดีกว่าทำให้อัปโหลดพังทั้งหมด
			}
		};
		img.onerror = function() { resolve(dataUrl); };
		img.src = dataUrl;
	});
}

function wireImageUpload(fileInputId, hiddenInputId, previewImgId, boxId, existingValue) {
	var fileInput = document.getElementById(fileInputId);
	var hiddenInput = document.getElementById(hiddenInputId);
	var previewImg = document.getElementById(previewImgId);
	var box = document.getElementById(boxId);
	if (!fileInput || !hiddenInput) return;

	function showPreview(dataUrl) {
		hiddenInput.value = dataUrl;
		if (previewImg) {
			previewImg.src = dataUrl;
			previewImg.hidden = false;
		}
		if (box) box.classList.add("haspreview");
	}

	if (existingValue) showPreview(existingValue);

	fileInput.addEventListener("change", function() {
		var file = fileInput.files && fileInput.files[0];
		if (!file) return;
		var reader = new FileReader();
		reader.onload = function(e) {
			บีบอัดรูปภาพ(e.target.result).then(showPreview);
		};
		reader.readAsDataURL(file);
	});
}

/* --- รูปหลายรูปต่อโพสต์/รีวิว (สูงสุด 10) — กติกาเดียวกันทุกฟอร์ม ---
   ฝั่งฐานข้อมูลบังคับซ้ำด้วย CHECK constraint (supabase/schema.sql Phase 11) กันการยิง request ตรงเกินจำนวน */
var CHIMCHIM_MAX_IMAGES = 10;
var CHIMCHIM_IMG_MAX_FILE_MB = 20; // ไฟล์ดิบก่อนบีบอัด (รูปกล้องมือถือปกติ 3-8MB)
// รูปหลายรูปบีบเล็กกว่ารูปเดี่ยวนิดหน่อย — 10 รูปต้องพอดีทั้ง localStorage (~5MB ทั้งเว็บ) และแถวใน Supabase
var CHIMCHIM_MULTI_IMG_MAX_DIMENSION = 1080;
var CHIMCHIM_MULTI_IMG_JPEG_QUALITY = 0.74;
var CHIMCHIM_MULTI_IMG_MAX_DATAURL = 1500000; // ~1.1MB ต่อรูปหลังบีบอัด (ตรงกับ CHECK ฝั่งฐานข้อมูล)
function เป็นไฟล์รูป(file) {
	if (file.type) return /^image\//.test(file.type);
	return /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name || ""); // บางเครื่องไม่ส่ง MIME มา
}
// บีบอัดแบบเข้ม: ถ้าเบราว์เซอร์ถอดรหัสรูปไม่ได้ (เช่น HEIC บน Chrome) ให้ล้มเหลวเลย ไม่เก็บไฟล์ดิบขนาดใหญ่แทน
function บีบอัดรูปหลายรูป(dataUrl) {
	return new Promise(function(resolve, reject) {
		var img = new Image();
		img.onload = function() {
			var scale = Math.min(1, CHIMCHIM_MULTI_IMG_MAX_DIMENSION / Math.max(img.width, img.height));
			var canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(img.width * scale));
			canvas.height = Math.max(1, Math.round(img.height * scale));
			canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
			var out;
			try { out = canvas.toDataURL("image/jpeg", CHIMCHIM_MULTI_IMG_JPEG_QUALITY); } catch (e) { reject(e); return; }
			if (out.length > CHIMCHIM_MULTI_IMG_MAX_DATAURL) out = canvas.toDataURL("image/jpeg", 0.55);
			if (out.length > CHIMCHIM_MULTI_IMG_MAX_DATAURL) { reject(new Error("too_big")); return; }
			resolve(out);
		};
		img.onerror = function() { reject(new Error("decode")); };
		img.src = dataUrl;
	});
}

// เหมือน wireImageUpload แต่รองรับเลือกได้หลายรูปพร้อมกัน (หรือกดเพิ่มทีละรอบหลายครั้งก็ได้) — ใช้กับฟอร์มโพสต์/รีวิวที่แนบได้หลายรูป
// onFilesAdded(dataUrls) จะถูกเรียกพร้อมอาร์เรย์ data URL ของรูปที่ผ่านการตรวจแล้ว (บีบอัดแล้วทุกรูป)
// opts.remaining() = ยังเพิ่มได้อีกกี่รูป — ไฟล์เกินจำนวนจะไม่ถูกอ่านเลย และแจ้งผู้ใช้ว่าทำไมบางรูปไม่ถูกเพิ่ม
function wireMultiImageUpload(fileInputId, onFilesAdded, opts) {
	var fileInput = document.getElementById(fileInputId);
	if (!fileInput) return;
	opts = opts || {};
	var busy = false;
	fileInput.addEventListener("change", function() {
		var files = Array.prototype.slice.call(fileInput.files || []);
		fileInput.value = ""; // เคลียร์ค่าเดิม เผื่อผู้ใช้อยากเลือกรูปเดิมซ้ำได้อีกรอบ
		if (!files.length || busy) return;
		var problems = { over: 0, type: 0, size: 0, failed: 0 };
		var ok = files.filter(function(f) {
			if (!เป็นไฟล์รูป(f)) { problems.type++; return false; }
			if (f.size > CHIMCHIM_IMG_MAX_FILE_MB * 1024 * 1024) { problems.size++; return false; }
			return true;
		});
		var room = typeof opts.remaining === "function" ? Math.max(0, opts.remaining()) : CHIMCHIM_MAX_IMAGES;
		if (ok.length > room) { problems.over = ok.length - room; ok = ok.slice(0, room); }
		busy = true;
		if (opts.onBusy) opts.onBusy(true);
		Promise.all(ok.map(function(file) {
			return new Promise(function(resolve) {
				var reader = new FileReader();
				reader.onload = function(e) { resolve(e.target.result); };
				reader.onerror = function() { resolve(null); };
				reader.readAsDataURL(file);
			}).then(function(dataUrl) {
				return dataUrl ? บีบอัดรูปหลายรูป(dataUrl) : Promise.reject(new Error("read"));
			}).catch(function() { problems.failed++; return null; });
		})).then(function(results) {
			busy = false;
			if (opts.onBusy) opts.onBusy(false);
			var good = results.filter(Boolean);
			if (good.length) onFilesAdded(good);
			แจ้งปัญหาการเลือกรูป(problems);
		});
	});
}
function แจ้งปัญหาการเลือกรูป(p) {
	if (typeof showToast !== "function") return;
	var msgs = [];
	if (p.over) msgs.push(t("photos.overLimit").replace("{n}", CHIMCHIM_MAX_IMAGES).replace("{x}", p.over));
	if (p.type) msgs.push(t("photos.badType").replace("{x}", p.type));
	if (p.size) msgs.push(t("photos.tooLarge").replace("{mb}", CHIMCHIM_IMG_MAX_FILE_MB).replace("{x}", p.size));
	if (p.failed) msgs.push(t("photos.readFailed").replace("{x}", p.failed));
	if (msgs.length) showToast(msgs.join(" · "));
}

// ผู้ใช้คนนี้ต้องบันทึกขึ้นเซิร์ฟเวอร์ให้สำเร็จก่อนถึงจะนับว่าโพสต์/รีวิวสำเร็จไหม
// (มี Supabase + เป็นบัญชี Supabase จริง (id เป็น UUID) — รีวิว/โพสต์ต้องล็อกอินก่อนเสมอ)
// บัญชีทดลองแบบ localStorage ล้วน (id ไม่ใช่ UUID) เขียนขึ้นเซิร์ฟเวอร์ไม่ได้อยู่แล้ว จึงบันทึกในเครื่องอย่างเดียวเหมือนเดิม
function ต้องบันทึกขึ้นเซิร์ฟเวอร์() {
	if (typeof sbClient === "undefined" || !sbClient) return false;
	var s = getSession();
	return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id);
}

/* --- ดูรูปขนาดใหญ่ (แกลเลอรีเต็มจอ ปัดซ้าย-ขวา / ปุ่มลูกศรบน Desktop / Esc ปิด) — ใช้กับรูปแนบรีวิว --- */
function openPhotoViewer(images, startIndex) {
	if (!images || !images.length) return;
	var box = document.getElementById("photoViewer");
	if (!box) {
		box = document.createElement("div");
		box.id = "photoViewer";
		box.className = "photoviewer";
		box.setAttribute("role", "dialog");
		box.setAttribute("aria-modal", "true");
		box.innerHTML =
			'<button type="button" class="pvw-close" aria-label="' + escapeHtml(t("common.close")) + '"><i class="fas fa-times"></i></button>' +
			'<div class="pvw-count" aria-live="polite"></div>' +
			'<button type="button" class="pvw-nav pvw-prev" aria-label="' + escapeHtml(t("photos.prev")) + '"><i class="fas fa-chevron-left"></i></button>' +
			'<div class="pvw-strip"></div>' +
			'<button type="button" class="pvw-nav pvw-next" aria-label="' + escapeHtml(t("photos.next")) + '"><i class="fas fa-chevron-right"></i></button>';
		document.body.appendChild(box);
		var strip = box.querySelector(".pvw-strip");
		function idx() { return Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth)); }
		function go(d) { strip.scrollTo({ left: (idx() + d) * strip.clientWidth, behavior: "smooth" }); }
		box.querySelector(".pvw-prev").addEventListener("click", function() { go(-1); });
		box.querySelector(".pvw-next").addEventListener("click", function() { go(1); });
		box.querySelector(".pvw-close").addEventListener("click", closePhotoViewer);
		box.addEventListener("click", function(e) { if (e.target === box || e.target.classList.contains("pvw-slide")) closePhotoViewer(); });
		strip.addEventListener("scroll", function() { updatePhotoViewerCount(); });
		document.addEventListener("keydown", function(e) {
			if (!box.classList.contains("open")) return;
			if (e.key === "Escape") closePhotoViewer();
			if (e.key === "ArrowRight") go(1);
			if (e.key === "ArrowLeft") go(-1);
		});
	}
	var strip2 = box.querySelector(".pvw-strip");
	strip2.innerHTML = images.map(function(src) {
		return '<div class="pvw-slide"><img src="' + safeImgSrc(src) + '" alt=""/></div>';
	}).join("");
	box.dataset.total = images.length;
	box.classList.toggle("single", images.length < 2);
	box.classList.add("open");
	box._returnFocus = document.activeElement;
	document.body.style.overflow = "hidden";
	// เปิดแล้ว layout พร้อมทันที (display:flex) — เลื่อนไปรูปที่กดได้เลยแบบ synchronous ไม่ต้องรอเฟรมถัดไป
	strip2.scrollLeft = (startIndex || 0) * strip2.clientWidth;
	updatePhotoViewerCount();
	box.querySelector(".pvw-close").focus();
}
function updatePhotoViewerCount() {
	var box = document.getElementById("photoViewer");
	if (!box) return;
	var strip = box.querySelector(".pvw-strip");
	var total = parseInt(box.dataset.total, 10) || 1;
	var i = Math.min(total - 1, Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth)));
	box.querySelector(".pvw-count").textContent = total > 1 ? (i + 1) + " / " + total : "";
	box.querySelector(".pvw-prev").disabled = i <= 0;
	box.querySelector(".pvw-next").disabled = i >= total - 1;
}
function closePhotoViewer() {
	var box = document.getElementById("photoViewer");
	if (!box) return;
	box.classList.remove("open");
	document.body.style.overflow = "";
	if (box._returnFocus && box._returnFocus.focus) box._returnFocus.focus();
}

// ไอคอนหมวดอาหาร — เดิมเป็นอิโมจิดิบ เปลี่ยนเป็นคลาส Font Awesome แทน (ดูเป็นมืออาชีพขึ้น ไม่ขึ้นกับฟอนต์อิโมจิของแต่ละเครื่อง)
// catEmoji() คืน HTML ของ <i> ไม่ใช่ตัวอักษรเฉย ๆ แล้ว — จุดที่เรียกใช้ต้องแปะด้วย innerHTML เท่านั้น ห้ามใช้ textContent
var CHIMCHIM_CAT_ICON = {
	"ข้าว": "bowl-rice", "เส้น": "utensils", "ซุป": "mug-hot", "Fast Food": "burger", "ญี่ปุ่น": "fish", "ของหวาน": "ice-cream", "เผ็ด": "pepper-hot",
	"อาหารเจ": "leaf", "อาหารฮาลาล": "mosque", "มังสวิรัติ": "carrot", "วีแกน": "seedling", "อาหารตามสั่ง": "egg",
	"ส้มตำ": "apple-whole", "ยำ": "pepper-hot", "หม่าล่า": "fire-flame-curved", "ของทอด": "shrimp", "ผลไม้": "apple-whole", "ของหวาน/เบเกอรี่": "ice-cream",
	"ปิ้งย่าง": "drumstick-bite", "อาหารญี่ปุ่น": "fish", "อาหารจีน": "bread-slice", "อาหารเกาหลี": "bowl-rice", "เครื่องดื่ม": "mug-saucer",
	"สเต็ก": "bacon", "เบอร์เกอร์": "burger", "เมนูเส้น": "utensils", "ก๋วยเตี๋ยว": "fire-flame-curved", "อาหารอินเดีย": "bowl-rice",
	"อาหารเวียดนาม": "utensils", "พิซซ่า": "pizza-slice", "อาหารใต้": "pepper-hot", "อีสาน": "fire", "เหนือ": "bowl-rice", "กลาง": "bowl-rice",
	"อาหารป่า": "drumstick-bite", "ข้าวแกง": "bowl-rice"
};
function catEmoji(cat) {
	return '<i class="fas fa-' + (CHIMCHIM_CAT_ICON[cat] || "utensils") + ' caticon"></i>';
}

// กันไม่ให้แถวรูปภาพ/วงล้อไหนก็ตามโชว์ร้านที่ใช้รูปซ้ำกันติดกัน — ใช้กับแถวที่เรียงตาม Match แล้ว
// เพราะบางร้าน (โดยเฉพาะร้านที่ชุมชนโพสต์) อาจเลือกรูปเดียวกันโดยไม่ตั้งใจ
function กรองรูปไม่ซ้ำ(list, getImg) {
	var seen = {};
	return list.filter(function(item) {
		var img = getImg(item);
		if (seen[img]) return false;
		seen[img] = true;
		return true;
	});
}

/* =====================================================================
   ระบบสมาชิก (Auth) — localStorage เท่านั้น เวอร์ชันทดลอง
   ===================================================================== */
var CHIMCHIM_USERS_KEY = "chimchim_users";
var CHIMCHIM_SESSION_KEY = "chimchim_session";
var CHIMCHIM_AI_CHAT_KEY = "chimchim_ai_chat";
var CHIMCHIM_SHOPS_KEY = "chimchim_shops";
var CHIMCHIM_REVIEWS_KEY = "chimchim_reviews";
var CHIMCHIM_FOLLOWS_KEY = "chimchim_follows";
var CHIMCHIM_POSTS_KEY = "chimchim_posts";

/* --- แฮชรหัสผ่านก่อนเก็บ (SHA-256 + salt สุ่มต่อบัญชี) แทนการเก็บ plaintext ตรง ๆ
   หมายเหตุ: เวอร์ชันนี้ยังเป็น localStorage ล้วน ๆ ไม่มี backend ตรวจสอบ การแฮชฝั่ง client
   ช่วยกันไม่ให้รหัสผ่านจริงโผล่เป็นข้อความอ่านได้ในเครื่อง แต่ยังไม่เทียบเท่าระบบ auth ฝั่งเซิร์ฟเวอร์จริง
   (แผนย้ายไป Supabase Auth จะแทนที่กลไกนี้ทั้งหมดในอนาคต) --- */
function generateSalt() {
	var bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.prototype.map.call(bytes, function(b) { return b.toString(16).padStart(2, "0"); }).join("");
}
function hashPassword(password, salt) {
	var data = new TextEncoder().encode(salt + password);
	return crypto.subtle.digest("SHA-256", data).then(function(buf) {
		return Array.prototype.map.call(new Uint8Array(buf), function(b) { return b.toString(16).padStart(2, "0"); }).join("");
	});
}

function getUsers() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_USERS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
// คืน true/false — รูปโปรไฟล์เก็บเป็น base64 ในนี้ด้วย ถ้าที่เก็บในเบราว์เซอร์เต็มจะ throw ได้เหมือนโพสต์/ร้าน
function saveUsers(list) {
	try {
		localStorage.setItem(CHIMCHIM_USERS_KEY, JSON.stringify(list));
		return true;
	} catch (e) {
		return false;
	}
}
function getSession() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_SESSION_KEY));
	} catch (e) {
		return null;
	}
}
function setSession(user) {
	localStorage.setItem(CHIMCHIM_SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
}
function clearSession() {
	localStorage.removeItem(CHIMCHIM_SESSION_KEY);
	// ออกจากระบบแล้วลบแชท AI Finder ที่เก็บไว้ทิ้งไปด้วย (ผู้ใช้คนถัดไปที่ใช้เครื่องนี้จะได้ไม่เห็นบทสนทนาเก่า)
	localStorage.removeItem(CHIMCHIM_AI_CHAT_KEY);
}
function getMe() {
	var session = getSession();
	if (!session) return null;
	var users = getUsers();
	var i;
	for (i = 0; i < users.length; i++) {
		if (users[i].id === session.id) return users[i];
	}
	return null;
}
// คืน true/false เหมือน saveUsers — ผู้เรียกควรเช็คก่อนบอกผู้ใช้ว่า "บันทึกแล้ว"
function updateMe(patch) {
	var session = getSession();
	if (!session) return false;
	var users = getUsers();
	var i;
	for (i = 0; i < users.length; i++) {
		if (users[i].id === session.id) {
			var key;
			for (key in patch) {
				if (Object.prototype.hasOwnProperty.call(patch, key)) {
					users[i][key] = patch[key];
				}
			}
			break;
		}
	}
	return saveUsers(users);
}

/* --- ย้ายโพสต์/รีวิว/เพจ/ร้านที่เคยสร้างไว้ด้วยบัญชีเก่า (สมัยก่อนมี Supabase Auth เก็บ id แบบ
   "u"+timestamp ในเครื่องล้วน ๆ) มาอยู่ใต้บัญชีใหม่ที่ล็อกอินผ่าน Supabase อยู่ตอนนี้ โดยจับคู่จากอีเมลเดียวกัน
   เรียกอัตโนมัติทุกครั้งที่ล็อกอิน/สมัครสำเร็จ (ดู sbSyncLocalSession ใน chimchim-supabase-client.js)
   กันปัญหาโพสต์/รีวิวเก่า "หาย" เพราะเปลี่ยนมาใช้ id ใหม่หลังสลับระบบล็อกอิน --- */
function migrateOrphanedLocalData(newUserId, email) {
	var users = getUsers();
	var oldEntries = users.filter(function(u) { return u.email === email && u.id !== newUserId; });
	if (!oldEntries.length) return;

	oldEntries.forEach(function(old) {
		var oldId = old.id;

		var posts = getAllPosts();
		var postsChanged = false;
		posts.forEach(function(p) {
			if (p.userId === oldId) {
				p.userId = newUserId;
				postsChanged = true;
			}
		});
		if (postsChanged) localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));

		try {
			var allReviews = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
			var reviewsChanged = false;
			Object.keys(allReviews).forEach(function(shopId) {
				allReviews[shopId].forEach(function(r) {
					if (r.userId === oldId) {
						r.userId = newUserId;
						reviewsChanged = true;
					}
				});
			});
			if (reviewsChanged) localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(allReviews));
		} catch (e) {
			// ข้อมูลรีวิวเสีย/parse ไม่ได้ ข้ามไปเลย ไม่ให้การย้ายส่วนอื่นล้มไปด้วย
		}

		var pages = getPages();
		var pagesChanged = false;
		pages.forEach(function(pg) {
			if (pg.ownerId === oldId) {
				pg.ownerId = newUserId;
				pagesChanged = true;
			}
		});
		if (pagesChanged) savePages(pages);

		var shops = getShops();
		var shopsChanged = false;
		shops.forEach(function(s) {
			if (s.vendorId === oldId) {
				s.vendorId = newUserId;
				s.vendorName = old.name;
				shopsChanged = true;
			}
		});
		if (shopsChanged) saveShops(shops);
	});

	// ลบบัญชีเก่าที่ย้ายข้อมูลออกหมดแล้วทิ้ง กันซ้ำ/สับสนกับบัญชีใหม่
	var remaining = users.filter(function(u) { return !(u.email === email && u.id !== newUserId); });
	saveUsers(remaining);
}

/* --- ใช้ Food DNA ส่วนตัวของผู้ใช้ (ถ้าทำแบบสอบถามตอนสมัครไว้แล้ว) แทนค่าเริ่มต้น
   ถ้ายังไม่ได้ทำแบบทดสอบ/ยังไม่ได้ล็อกอิน ให้เดาความชอบจากพฤติกรรมจริงแทน (ร้านที่เคย
   กดถูกใจ/Follow/รีวิวดี ๆ ไว้ในเบราว์เซอร์นี้) เพื่อให้ Match % ตรงกับผู้ใช้จริง ไม่ใช่ค่ากลาง ๆ เดิมทุกคน --- */
function applyPersonalFoodDNA() {
	var me = getMe();
	if (me && me.foodDNA) {
		foodDNA.ชอบชาติอาหาร = me.foodDNA.ชอบชาติอาหาร;
		foodDNA.ชอบรส = me.foodDNA.ชอบรส;
		foodDNA.งบเฉลี่ยที่ใช้บ่อย = me.foodDNA.งบเฉลี่ยที่ใช้บ่อย;
		foodDNA.ระยะที่ยอมไป = me.foodDNA.ระยะที่ยอมไป;
		// ชอบหมวด เก็บไว้ตอนทำแบบทดสอบอยู่แล้ว แต่เอามาใช้จริงในคำนวณMatch ด้วยเลย (เดิมเก็บไว้เฉยๆ ไม่ได้ใช้)
		foodDNA.ชอบหมวด = me.foodDNA.ชอบหมวด || [];
		return;
	}
	var inferred = inferDnaFromBehavior();
	if (inferred) {
		if (inferred.ชอบชาติอาหาร.length) foodDNA.ชอบชาติอาหาร = inferred.ชอบชาติอาหาร;
		if (inferred.ชอบรส.length) foodDNA.ชอบรส = inferred.ชอบรส;
		if (inferred.ชอบหมวด.length) foodDNA.ชอบหมวด = inferred.ชอบหมวด;
	}
}

/* =====================================================================
   Feedback loop จากแชท AI Food Finder — กดเข้าไปดูร้านที่ "ชิมชิม" แนะนำจริง ๆ
   ถือเป็นสัญญาณว่าคำแนะนำครั้งนั้นตรงใจ (implicit signal อ่อนกว่าการกดถูกใจตรง ๆ
   แต่ยังบอกแนวโน้มได้) เก็บแค่ N รายการล่าสุดพอ กันโตไม่รู้จบ
   ===================================================================== */
var CHIMCHIM_AI_CLICKS_KEY = "chimchim_ai_clicks";
var AI_CLICK_HISTORY_LIMIT = 30;
function getAiClickedShops() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_AI_CLICKS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function recordAiClickedShop(shopId) {
	var list = getAiClickedShops();
	list.push(shopId);
	if (list.length > AI_CLICK_HISTORY_LIMIT) {
		list = list.slice(-AI_CLICK_HISTORY_LIMIT);
	}
	localStorage.setItem(CHIMCHIM_AI_CLICKS_KEY, JSON.stringify(list));
}

// เรียนรู้พฤติกรรมจริงของผู้ใช้ในเบราว์เซอร์นี้ (กดถูกใจ / Follow / เขียนรีวิวให้คะแนนดี ๆ / กดดูร้านที่ AI แนะนำ)
// แล้วสรุปออกมาเป็นแนวโน้มที่ชอบ 3 มิติ: ชาติอาหาร / รสชาติ / หมวดหมู่ ใช้แทนแบบทดสอบ Food DNA
// สำหรับคนที่ยังไม่ได้ทำแบบทดสอบ หรือใช้เสริมแบบทดสอบเดิมให้แม่นขึ้นเรื่อย ๆ ตามการใช้งานจริง
function inferDnaFromBehavior() {
	var likedIds = getLikedShops();
	var followedIds = getFollowedShops();
	var aiClickedIds = getAiClickedShops();
	var reviewedIds = [];
	var session = getSession();
	if (session) {
		getReviewsByUser(session.id).forEach(function(r) {
			// รีวิวที่ให้คะแนนเฉลี่ย 4/5 ขึ้นไป นับเป็นสัญญาณว่าชอบร้านนี้จริง ๆ (ต่ำกว่านั้นไม่เอามานับ กันทายผิดทาง)
			var avg = (r.taste + r.atmosphere + r.service) / 3;
			if (avg >= 4) reviewedIds.push(r.shopId);
		});
	}
	var ids = likedIds.concat(followedIds).concat(reviewedIds).concat(aiClickedIds);
	if (!ids.length) return null;
	var cuisineCount = {};
	var flavorCount = {};
	var catCount = {};
	ids.forEach(function(id) {
		var r = หาร้านจากId(id);
		if (!r) return;
		cuisineCount[r.ชาติอาหาร] = (cuisineCount[r.ชาติอาหาร] || 0) + 1;
		(r.รส || []).forEach(function(f) {
			flavorCount[f] = (flavorCount[f] || 0) + 1;
		});
		if (r.หมวด) catCount[r.หมวด] = (catCount[r.หมวด] || 0) + 1;
	});
	var topCuisines = Object.keys(cuisineCount).sort(function(a, b) { return cuisineCount[b] - cuisineCount[a]; }).slice(0, 3);
	var topFlavors = Object.keys(flavorCount).sort(function(a, b) { return flavorCount[b] - flavorCount[a]; }).slice(0, 3);
	var topCats = Object.keys(catCount).sort(function(a, b) { return catCount[b] - catCount[a]; }).slice(0, 3);
	return { ชอบชาติอาหาร: topCuisines, ชอบรส: topFlavors, ชอบหมวด: topCats };
}

/* =====================================================================
   ตำแหน่งที่อยู่จริงของผู้ใช้ (Geolocation) — ใช้หามหาวิทยาลัยที่ใกล้ที่สุดจากพิกัดจริง 3 แห่ง
   (ไม่มีพิกัด GPS จริงของร้านแต่ละร้าน มีแค่ระยะทางประมาณจากมหาลัยที่ใส่ไว้ตอนโพสต์ร้าน
   เลยใช้ "มหาลัยที่ใกล้คุณที่สุด" แทนการเทียบระยะทางร้านทีละร้านตรงๆ เพื่อไม่ต้องเดาพิกัดร้านที่ไม่มีข้อมูลจริง) --- */
var CHIMCHIM_LOCATION_KEY = "chimchim_user_location";
/* =====================================================================
   พื้นที่ที่เลือกดูอาหาร (มหาวิทยาลัย) — ปุ่มบนแถบบนทุกหน้า เลือกแล้วทั้งแอปโชว์ร้านแถวนั้น
   "" = ทุกพื้นที่ / ยังไม่เคยเลือก → ใช้มหาลัยที่ตั้งไว้ในโปรไฟล์ (ถ้ามี) ไม่งั้นทุกพื้นที่
   พื้นที่ที่ยังไม่มีร้าน → โชว์แค่ไม่กี่ร้านที่ใกล้ที่สุด (วัดจากพิกัดมหาลัย) พร้อมบอกว่ายังไม่มีร้านแถวนี้
   ===================================================================== */
var CHIMCHIM_AREA_KEY = "chimchim_area";
var CHIMCHIM_AREA_FALLBACK_MAX = 3;
var CHIMCHIM_AREA_SHORT = { "มหาวิทยาลัยกรุงเทพ": "ม.กรุงเทพ", "เกษตรศาสตร์": "ม.เกษตร", "ธรรมศาสตร์ รังสิต": "มธ. รังสิต" };
function getSelectedArea() {
	var v = null;
	try { v = localStorage.getItem(CHIMCHIM_AREA_KEY); } catch (e) {}
	if (v !== null) return (typeof มหาวิทยาลัยพิกัด !== "undefined" && มหาวิทยาลัยพิกัด[v]) ? v : "";
	var me = typeof getMe === "function" ? getMe() : null;
	return me && me.university && typeof มหาวิทยาลัยพิกัด !== "undefined" && มหาวิทยาลัยพิกัด[me.university] ? me.university : "";
}
function setSelectedArea(area) {
	try { localStorage.setItem(CHIMCHIM_AREA_KEY, area || ""); } catch (e) {}
}
function areaShortName(area) {
	if (!area) return t("area.all");
	return getLang() === "th" ? (CHIMCHIM_AREA_SHORT[area] || area) : area;
}
// ระยะทางที่ "บอกได้ตามจริง" ของร้านหนึ่ง:
// - ร้านมีหมุดจริง (พิกัด) + ผู้ใช้แชร์ตำแหน่งไว้ → ระยะจริงจากตำแหน่งผู้ใช้ถึงหมุดร้าน { fromUser: true }
// - ไม่งั้น → ระยะโดยประมาณจากมหาลัยของร้าน (ตัวเลขที่กรอกไว้) { fromUser: false, uni } ห้ามบอกว่า "จากตำแหน่งคุณ"
// ร้านตั้งต้นในแอปยังไม่มีพิกัด — ใส่ฟิลด์ พิกัด: { lat, lng } ใน chimchim-data.js เมื่อได้พิกัดจริงของร้านมาแล้ว
function ข้อมูลระยะทาง(r) {
	var loc = getUserLocation();
	if (r && r.พิกัด && typeof r.พิกัด.lat === "number" && loc && typeof loc.lat === "number") {
		return { meters: Math.round(ระยะทางฮาเวอร์ไซน์(loc.lat, loc.lng, r.พิกัด.lat, r.พิกัด.lng)), fromUser: true, uni: r.มหาลัย || null };
	}
	return { meters: r ? r.ระยะทาง : 0, fromUser: false, uni: (r && r.มหาลัย) || null };
}
// ป้ายบอกที่มาของระยะทาง เช่น "จากตำแหน่งคุณ" / "จาก ม.กรุงเทพ"
function ป้ายที่มาระยะทาง(info) {
	if (info.fromUser) return t("home.fromYou");
	return info.uni ? t("home.fromUni").replace("{uni}", areaShortName(info.uni)) : t("home.approxDistance");
}

// กรองร้านตามพื้นที่ที่เลือก คืน { list, area, fallback, km }
// fallback = พื้นที่นี้ยังไม่มีร้าน list คือร้านที่ใกล้ที่สุดไม่กี่ร้าน / km = ระยะโดยประมาณถึงร้านที่ใกล้ที่สุด
function กรองร้านตามพื้นที่(list) {
	var area = getSelectedArea();
	if (!area) return { list: list, area: "", fallback: false, km: null };
	var here = list.filter(function(r) { return r.มหาลัย === area; });
	if (here.length) return { list: here, area: area, fallback: false, km: null };
	var c = มหาวิทยาลัยพิกัด[area];
	var near = list.map(function(r) {
		var u = มหาวิทยาลัยพิกัด[r.มหาลัย];
		return u ? { r: r, d: ระยะทางฮาเวอร์ไซน์(c.lat, c.lng, u.lat, u.lng) + (r.ระยะทาง || 0) } : null;
	}).filter(Boolean).sort(function(a, b) { return a.d - b.d; }).slice(0, CHIMCHIM_AREA_FALLBACK_MAX);
	return { list: near.map(function(x) { return x.r; }), area: area, fallback: true, km: near.length ? Math.max(1, Math.round(near[0].d / 1000)) : null };
}
function ร้านในพื้นที่() {
	return กรองร้านตามพื้นที่(typeof รายการร้าน !== "undefined" ? รายการร้าน : []).list;
}

function getUserLocation() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_LOCATION_KEY));
	} catch (e) {
		return null;
	}
}
// สูตร Haversine — ระยะทางจริงระหว่างพิกัด 2 จุดบนโลก (หน่วยเมตร)
function ระยะทางฮาเวอร์ไซน์(lat1, lng1, lat2, lng2) {
	var R = 6371000;
	var toRad = function(d) { return (d * Math.PI) / 180; };
	var dLat = toRad(lat2 - lat1);
	var dLng = toRad(lng2 - lng1);
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}
// ขอตำแหน่งจริงจากเบราว์เซอร์ (ต้องเรียกตอนผู้ใช้กดปุ่มเอง ไม่เรียกลอยๆ ตอนโหลดหน้า) แล้วหามหาลัยที่ใกล้สุด
// เก็บผลไว้ใน localStorage เพื่อให้คำนวณMatch ให้คะแนนโบนัสร้านแถวมหาลัยนั้นในครั้งถัดไปทุกหน้า
function ขอตำแหน่งผู้ใช้() {
	return new Promise(function(resolve, reject) {
		if (!navigator.geolocation) {
			reject(new Error("เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง"));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			function(pos) {
				var lat = pos.coords.latitude;
				var lng = pos.coords.longitude;
				var nearestUni = null;
				var nearestDist = Infinity;
				Object.keys(มหาวิทยาลัยพิกัด).forEach(function(uni) {
					var p = มหาวิทยาลัยพิกัด[uni];
					var d = ระยะทางฮาเวอร์ไซน์(lat, lng, p.lat, p.lng);
					if (d < nearestDist) {
						nearestDist = d;
						nearestUni = uni;
					}
				});
				var result = { lat: lat, lng: lng, nearestUni: nearestUni, nearestUniDistance: Math.round(nearestDist), updatedAt: new Date().toISOString() };
				localStorage.setItem(CHIMCHIM_LOCATION_KEY, JSON.stringify(result));
				resolve(result);
			},
			function(err) { reject(err); },
			{ timeout: 10000 }
		);
	});
}

/* =====================================================================
   ร้านค้าในชุมชน — ผสานเข้ากับ รายการร้าน ตั้งแต่ต้น เพื่อให้ทุกหน้า
   (Discovery Feed, AI Finder, หน้ารายละเอียดร้าน) มองเห็นร้านที่ผู้ใช้โพสต์ด้วย
   ===================================================================== */
function getShops() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_SHOPS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function saveShops(list) {
	try {
		localStorage.setItem(CHIMCHIM_SHOPS_KEY, JSON.stringify(list));
		return true;
	} catch (e) {
		return false;
	}
}

// ร้านของฉัน (ผูกกับ vendorId ของบัญชีที่ล็อกอินอยู่) — ใช้บอกว่าจะสร้างร้านใหม่ หรือแก้ไขร้านเดิม
function getMyShop() {
	var me = getMe();
	if (!me) return null;
	return getShops().filter(function(s) { return s.vendorId === me.id; })[0] || null;
}
// สุ่ม id เลขที่ไม่ชนกับร้านชุมชนที่มีอยู่แล้ว (ตั้งตอนสร้างร้านครั้งแรกเลย จะได้เป็นค่าคงที่ถาวร
// ไม่ต้องพึ่ง index ในอาร์เรย์ที่ขยับได้เวลามีร้านใหม่มาแทรก — กันไลก์/follow/รีวิวเดิมหลุดจากร้าน)
function generateUniqueShopNumId() {
	var used = getShops().map(function(s) { return s.numId; });
	var id;
	do {
		id = 9000000 + Math.floor(Math.random() * 900000);
	} while (used.indexOf(id) !== -1);
	return id;
}
function createOrUpdateMyShop(data) {
	var me = getMe();
	if (!me) return null;
	var shops = getShops();
	var existing = shops.filter(function(s) { return s.vendorId === me.id; })[0];
	if (existing) {
		existing.name = data.name;
		existing.dish = data.dish;
		existing.cat = data.cat;
		existing.img = data.img;
		existing.priceLow = data.priceLow;
		existing.priceHigh = data.priceHigh;
		existing.distance = data.distance;
		existing.uni = data.uni;
		existing.desc = data.desc;
		existing.hours = data.hours;
		existing.promo = data.promo;
		if (typeof data.lat === "number" && typeof data.lng === "number") {
			existing.lat = data.lat;
			existing.lng = data.lng;
		}
	} else {
		existing = {
			numId: generateUniqueShopNumId(),
			vendorId: me.id,
			vendorName: me.name,
			name: data.name,
			dish: data.dish,
			cat: data.cat,
			img: data.img,
			priceLow: data.priceLow,
			priceHigh: data.priceHigh,
			distance: data.distance,
			uni: data.uni,
			desc: data.desc,
			hours: data.hours,
			promo: data.promo,
			lat: typeof data.lat === "number" ? data.lat : null,
			lng: typeof data.lng === "number" ? data.lng : null
		};
		shops.push(existing);
		logEvent("shop_posted", { shopId: existing.numId });
	}
	// คืน null ถ้าบันทึกไม่สำเร็จ (ที่เก็บในเบราว์เซอร์เต็ม) — ผู้เรียกต้องเช็คก่อนบอกว่าโพสต์ร้านสำเร็จ
	// (เจอบั๊กเดียวกับโพสต์ชุมชนมาก่อน: setItem() throw เงียบ ๆ แล้วฟอร์มไม่ปิด ดูเหมือนปุ่มกดไม่ติด)
	if (!saveShops(shops)) return null;
	return existing;
}
// ลบร้านของฉันทิ้งถาวร (กู้คืนไม่ได้) — ลบทั้งในเครื่องนี้และ Supabase จริง โพสต์ในนามร้านนี้ถูกลบตามไปด้วย
// (ฝั่ง Supabase cascade เองผ่าน posts.page_id -> shops(id) on delete cascade, ฝั่งเครื่องนี้ลบเองตรงนี้เลย)
function deleteMyShop() {
	var me = getMe();
	if (!me) return;
	var shops = getShops();
	var mine = shops.filter(function(s) { return s.vendorId === me.id; })[0];
	if (!mine) return;
	saveShops(shops.filter(function(s) { return s.vendorId !== me.id; }));
	var idx = รายการร้าน.findIndex(function(r) { return r.id === mine.numId; });
	if (idx !== -1) รายการร้าน.splice(idx, 1);
	var posts = getAllPosts().filter(function(p) { return p.pageId !== mine.numId; });
	localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
	if (getActivePersona() === String(mine.numId)) setActivePersona("self");
	if (typeof sbDeleteMyShop === "function") sbDeleteMyShop(mine.numId);
}

function shopToร้าน(shop) {
	var ชาติอาหาร = "ไทย";
	if (shop.cat === "ญี่ปุ่น") ชาติอาหาร = "ญี่ปุ่น";
	else if (shop.cat === "ของหวาน") ชาติอาหาร = "ของหวาน";
	else if (shop.cat === "Fast Food") ชาติอาหาร = "ฝรั่ง";

	var รส = shop.cat === "เผ็ด" ? ["เผ็ด", "เค็ม"] : ["กลมกล่อม"];

	return {
		id: shop.numId,
		เมนู: shop.dish,
		ร้าน: shop.name,
		หมวด: shop.cat,
		ชาติอาหาร: ชาติอาหาร,
		รส: รส,
		ราคาต่ำ: shop.priceLow,
		ราคาสูง: shop.priceHigh,
		// ถ้าร้านนี้มีพิกัดจริง (เจ้าของร้านกดใช้ตำแหน่งปัจจุบันตอนโพสต์) และผู้ชมหน้านี้แชร์ตำแหน่งตัวเองไว้แล้ว
		// คำนวณระยะทางจริงสด ๆ แทนตัวเลขที่เจ้าของร้านกรอกเอง (แม่นกว่า เพราะอิงตำแหน่งจริงของทั้งสองฝั่ง)
		ระยะทาง: (typeof shop.lat === "number" && typeof shop.lng === "number" && getUserLocation() && typeof getUserLocation().lat === "number")
			? Math.round(ระยะทางฮาเวอร์ไซน์(getUserLocation().lat, getUserLocation().lng, shop.lat, shop.lng))
			: shop.distance,
		รูป: shop.img,
		บัคเก็ต: ["foryou", "new"],
		แท็ก: [shop.cat, "ชุมชนโพสต์"],
		มหาลัย: shop.uni || มหาวิทยาลัยทั้งหมด[0],
		เทรนด์: false,
		มื้อที่เหมาะ: ["เช้า", "เที่ยง", "บ่าย", "เย็น", "ดึก"],
		vendorId: shop.vendorId,
		vendorName: shop.vendorName,
		// พิกัดจริงของร้าน (หมุดที่เจ้าของร้านปักไว้) — ใช้คำนวณระยะจากตำแหน่งผู้ใช้สด ๆ ใน ข้อมูลระยะทาง()
		พิกัด: (typeof shop.lat === "number" && typeof shop.lng === "number") ? { lat: shop.lat, lng: shop.lng } : null,
		เวลาเปิดกำหนดเอง: shop.hours || null,
		โปรโมชั่นกำหนดเอง: shop.promo || null,
		คำโปรยกำหนดเอง: shop.desc || null,
		community: true
	};
}

// คืนค่ารายการร้านชุมชน (เรียงใหม่สุดก่อน) พร้อมผสานเข้า รายการร้าน ให้เรียบร้อยแล้ว
function mergeCommunityShopsIntoรายการร้าน() {
	var shops = getShops();
	var i;
	for (i = shops.length - 1; i >= 0; i--) {
		// เผื่อร้านเก่าที่เคยถูกสร้างไว้ก่อนจะมี generateUniqueShopNumId() แล้วไม่มี numId ติดมา
		// (ร้านที่สร้างผ่าน createOrUpdateMyShop() ตอนนี้ได้ numId ถาวรตั้งแต่ตอนสร้างแล้ว ไม่ต้องพึ่งจุดนี้)
		if (!shops[i].numId) {
			shops[i].numId = 9000000 + i;
		}
		// ร้านที่ถูกรายงานถึงเกณฑ์ ไม่โชว์ในหน้าแนะนำ/ค้นหา/AI Finder อีกต่อไป (เจ้าของยังจัดการผ่าน getMyShop() ได้ปกติ
		// เพราะอ่านจาก getShops() ตรง ๆ ไม่ผ่านตัวกรองนี้)
		if (isContentHidden("shop", shops[i].numId)) continue;
		รายการร้าน.push(shopToร้าน(shops[i]));
	}
	return shops;
}

/* --- ผสานร้านที่ดึงมาจาก Supabase จริง (ทุกคนเห็นเหมือนกัน ไม่ใช่แค่เบราว์เซอร์นี้) เข้ากับ รายการร้าน
   remote ชนะเสมอถ้ามี id ซ้ำกับของเดิม (ข้อมูลจาก Supabase ถือเป็นข้อมูลล่าสุด) เรียกจากหน้าที่โชว์รายชื่อร้าน
   หลัง initial render เดิมเสร็จแล้ว (ดู syncShopsWithSupabase ใน chimchim-supabase-client.js) --- */
function mergeRemoteShopsIntoรายการร้าน(remoteShops) {
	remoteShops.forEach(function(remote) {
		if (isContentHidden("shop", remote.numId)) return;
		var mapped = shopToร้าน(remote);
		var idx = รายการร้าน.findIndex(function(r) { return r.id === remote.numId; });
		if (idx !== -1) {
			รายการร้าน[idx] = mapped;
		} else {
			รายการร้าน.push(mapped);
		}
	});
}

/* --- ร้านของฉันเพิ่งถูก sync ขึ้น Supabase ครั้งแรก แล้วได้ id ใหม่จากเซิร์ฟเวอร์มา (id เดิมที่เบราว์เซอร์
   สุ่มไว้เองใช้ต่อไม่ได้แล้ว) ย้าย id เดิมทุกจุดที่เคยอ้างอิงไว้ (รีวิว/ไลก์/follow/โพสต์/persona) ให้ตรงกับ id ใหม่
   กันข้อมูลเดิมหลุดหาย เหมือนกับตอนย้ายบัญชีเก่าไปบัญชี Supabase (migrateOrphanedLocalData) --- */
function reconcileShopNumId(oldNumId, newNumId) {
	if (oldNumId === newNumId) return;

	try {
		var allReviews = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
		if (allReviews[oldNumId]) {
			allReviews[newNumId] = (allReviews[newNumId] || []).concat(allReviews[oldNumId]);
			delete allReviews[oldNumId];
			localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(allReviews));
		}
	} catch (e) {
		// ข้อมูลรีวิวเสีย/parse ไม่ได้ ข้ามไปเลย ไม่ให้การย้ายส่วนอื่นล้มไปด้วย
	}

	var likes = getLikedShops();
	var likeIdx = likes.indexOf(oldNumId);
	if (likeIdx !== -1) {
		likes[likeIdx] = newNumId;
		localStorage.setItem(CHIMCHIM_LIKES_KEY, JSON.stringify(likes));
	}

	var follows = getFollowedShops();
	var followIdx = follows.indexOf(oldNumId);
	if (followIdx !== -1) {
		follows[followIdx] = newNumId;
		localStorage.setItem(CHIMCHIM_FOLLOWS_KEY, JSON.stringify(follows));
	}

	var posts = getAllPosts();
	var postsChanged = false;
	posts.forEach(function(p) {
		if (p.pageId === oldNumId) {
			p.pageId = newNumId;
			postsChanged = true;
		}
	});
	if (postsChanged) localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));

	if (getActivePersona() === String(oldNumId)) {
		setActivePersona(String(newNumId));
	}

	var shops = getShops();
	shops.forEach(function(s) {
		if (s.numId === oldNumId) s.numId = newNumId;
	});
	saveShops(shops);
}

/* =====================================================================
   รีวิวร้าน (เก็บแยกตาม id ร้าน)
   ===================================================================== */
function getReviews(shopId) {
	try {
		var all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
		return all[shopId] || [];
	} catch (e) {
		return [];
	}
}
// คืน Promise<{ ok, reason }> — ok=false แปลว่ายังบันทึกไม่ครบ ผู้เรียกต้องแจ้งผู้ใช้ ห้ามบอกว่าส่งสำเร็จ
// reason: "storage" (เครื่องเต็ม) / "server" (ส่งขึ้น Supabase ไม่สำเร็จ) / "images_column" (ยังไม่ได้รัน SQL ช่องรูป)
function addReview(shopId, review) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	if (review.images) review.images = review.images.slice(0, CHIMCHIM_MAX_IMAGES);
	if (!all[shopId]) all[shopId] = [];
	// localId ใช้แค่ชั่วคราวเพื่อหารีวิวนี้เจอตอน push ขึ้น Supabase เสร็จแล้วมาแปะ remoteId จริงให้ (ดูด้านล่าง)
	var localId = "rev" + Date.now() + Math.random().toString(36).slice(2, 6);
	review.localId = localId;
	all[shopId].unshift(review);
	try {
		localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
	} catch (e) {
		return Promise.resolve({ ok: false, reason: "storage" });
	}
	var mustReachServer = ต้องบันทึกขึ้นเซิร์ฟเวอร์();
	// คืน Promise ให้ผู้เรียกรอจน push ขึ้น Supabase เสร็จก่อนเปลี่ยนหน้า — ถ้าเปลี่ยนหน้าทันที request จะโดนยกเลิก
	// กลางทาง รีวิวไม่ขึ้นเครื่องอื่น และไม่เคยได้ remoteId (ปุ่มแก้ไขรีวิวเลยไม่โผล่)
	if (typeof sbSubmitReview !== "function") return Promise.resolve({ ok: true });
	return sbSubmitReview(shopId, review).then(function(res) {
		if (res && res.saved && res.saved.remoteId) {
			tagReviewRemoteId(shopId, localId, res.saved.remoteId);
			logEvent("review_submitted", { shopId: shopId });
			return { ok: true };
		}
		if (!mustReachServer) { // บัญชีทดลองในเครื่อง — เก็บในเครื่องอย่างเดียวเหมือนเดิม
			logEvent("review_submitted", { shopId: shopId });
			return { ok: true };
		}
		// เซิร์ฟเวอร์ไม่รับ → ถอนรีวิวในเครื่องออก ไม่ให้ขึ้นเหมือนสำเร็จ (ฟอร์มยังเก็บข้อมูลไว้ให้กดส่งใหม่)
		deleteReview(shopId, { localId: localId });
		return { ok: false, reason: (res && res.error) || "server" };
	});
}
// รอ promise ไม่เกิน ms มิลลิวินาที — กันเน็ตช้า/ค้างจนผู้ใช้ติดอยู่หน้าเดิมไม่ได้ไปไหน
function waitAtMost(promise, ms) {
	return Promise.race([
		Promise.resolve(promise).catch(function() {}),
		new Promise(function(resolve) { setTimeout(resolve, ms); })
	]);
}
function tagReviewRemoteId(shopId, localId, remoteId) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		return;
	}
	var list = all[shopId] || [];
	var found = false;
	var i;
	for (i = 0; i < list.length; i++) {
		if (list[i].localId === localId) { list[i].remoteId = remoteId; found = true; break; }
	}
	// ผู้ใช้กดลบรีวิวไปก่อนที่ push ขึ้น Supabase จะเสร็จ — ลบแถวที่เพิ่งขึ้นไปทิ้งด้วย ไม่งั้นมันจะโผล่กลับมาตอน sync
	if (!found) {
		if (typeof sbDeleteReview === "function") sbDeleteReview(remoteId);
		return;
	}
	all[shopId] = list;
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
}
// แก้ไข/ลบรีวิวของตัวเอง — ใช้ได้เฉพาะรีวิวที่ sync ขึ้น Supabase แล้วเท่านั้น (มี remoteId จริง)
// คืน Promise<{ ok, reason }> เหมือน addReview — ถ้าเซิร์ฟเวอร์ไม่รับ จะคืนค่ารีวิวในเครื่องกลับเป็นของเดิม
function updateReview(shopId, remoteId, patch) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	if (Array.isArray(patch.images)) patch.images = patch.images.slice(0, CHIMCHIM_MAX_IMAGES);
	var list = all[shopId] || [];
	var before = null;
	var i;
	for (i = 0; i < list.length; i++) {
		if (String(list[i].remoteId) === String(remoteId)) {
			before = JSON.parse(JSON.stringify(list[i]));
			if (typeof patch.taste === "number") list[i].taste = patch.taste;
			if (typeof patch.atmosphere === "number") list[i].atmosphere = patch.atmosphere;
			if (typeof patch.service === "number") list[i].service = patch.service;
			if (typeof patch.text === "string") list[i].text = patch.text;
			if (Array.isArray(patch.images)) list[i].images = patch.images;
			break;
		}
	}
	all[shopId] = list;
	try {
		localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
	} catch (e) {
		return Promise.resolve({ ok: false, reason: "storage" });
	}
	if (typeof sbUpdateReview !== "function") return Promise.resolve({ ok: true });
	var mustReachServer = ต้องบันทึกขึ้นเซิร์ฟเวอร์();
	return sbUpdateReview(remoteId, patch).then(function(res) {
		if (res && res.ok) return { ok: true };
		if (!mustReachServer) return { ok: true };
		if (before) {
			list[i] = before;
			try { localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all)); } catch (e) {}
		}
		return { ok: false, reason: (res && res.error) || "server" };
	});
}
// ลบรีวิวของตัวเอง — ระบุตัวด้วย remoteId ถ้า sync ขึ้น Supabase แล้ว ไม่งั้นใช้ localId (รีวิวที่ยังค้างอยู่ในเครื่องนี้
// ก็ลบได้เหมือนกัน ถ้า push ขึ้นไปเสร็จทีหลัง tagReviewRemoteId จะตามไปลบแถวบน Supabase ให้เอง)
function deleteReview(shopId, review) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	all[shopId] = (all[shopId] || []).filter(function(r) {
		if (review.remoteId) return String(r.remoteId) !== String(review.remoteId);
		return r.localId !== review.localId;
	});
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
	if (review.remoteId && typeof sbDeleteReview === "function") return sbDeleteReview(review.remoteId);
	return Promise.resolve(null);
}
function getReviewByRemoteId(shopId, remoteId) {
	return getReviews(shopId).filter(function(r) { return String(r.remoteId) === String(remoteId); })[0] || null;
}
// ผสานรีวิวจริงจาก Supabase (ของทุกคน ไม่ใช่แค่เครื่องนี้) เข้ากับรีวิวในเครื่องนี้ — กันซ้ำด้วย remoteId
// เป็นหลักถ้ามี (รีวิวของตัวเองที่เพิ่งโพสต์จะถูกแปะ remoteId ไว้แล้วจาก tagReviewRemoteId ตอน sync สำเร็จ)
// เดิมใช้ ผู้เขียน+เวลา+ข้อความ เทียบกัน แต่ "เวลา" ฝั่ง local (ตอนกดโพสต์) กับฝั่ง Supabase (created_at
// ที่ตั้งตอน insert จริง) ไม่ตรงกันเป๊ะเพราะมี network round-trip คั่น เลยไม่แมตช์กัน ทำให้รีวิวตัวเอง
// โผล่ซ้ำ 2 ชุดหลัง sync กลับมา — ถ้ามี remoteId ให้ใช้แค่นั้นพอ ไม่ต้องเทียบเวลาเลย
function ขีดรีวิว(r) {
	if (r.remoteId) return "id:" + r.remoteId;
	return (r.author || "") + "|" + (r.date || "") + "|" + (r.text || "");
}
function mergeRemoteReviewsIntoLocal(shopId, remoteReviews) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	var local = all[shopId] || [];
	var existingKeys = {};
	local.forEach(function(r) { existingKeys[ขีดรีวิว(r)] = true; });
	remoteReviews.forEach(function(r) {
		var k = ขีดรีวิว(r);
		if (existingKeys[k]) return;
		// รีวิวของตัวเองในเครื่องที่ยังไม่มี remoteId (push สำเร็จแต่เปลี่ยนหน้าก่อนแปะ id) — จับคู่ด้วย ผู้เขียน+ข้อความ
		// +เวลาห่างกันไม่เกิน 5 นาที แล้วแปะ remoteId ให้แทน ไม่งั้นรีวิวเดียวกันจะโผล่ซ้ำ 2 อัน
		var pending = local.filter(function(l) {
			return !l.remoteId && l.userId && l.userId === r.userId && (l.text || "") === (r.text || "") &&
				Math.abs(new Date(l.date) - new Date(r.date)) < 5 * 60 * 1000;
		})[0];
		if (pending) {
			pending.remoteId = r.remoteId;
		} else {
			local.push(r);
		}
		existingKeys[k] = true;
	});
	local.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
	all[shopId] = local;
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
}
/* =====================================================================
   เลเวลนักชิม — XP คิดจากกิจกรรมจริงของผู้ใช้ในแอป (ไม่มีตัวเลขสมมติ)
   รีวิว 30 · โพสต์ 20 · ทำ Food DNA 20 (ครั้งเดียว) · ความคิดเห็น 5 · ถูกใจ/บันทึก/ติดตาม 2 ต่อครั้ง
   ===================================================================== */
var CHIMCHIM_XP_RULES = [
	{ key: "reviews", xp: 30, icon: "pen", label: "level.srcReviews" },
	{ key: "posts", xp: 20, icon: "image", label: "level.srcPosts" },
	{ key: "dna", xp: 20, icon: "dna", label: "level.srcDna" },
	{ key: "comments", xp: 5, icon: "comment", label: "level.srcComments" },
	{ key: "social", xp: 2, icon: "heart", label: "level.srcSocial" }
];
var CHIMCHIM_LEVELS = [
	{ min: 0, name: "level.l1" },
	{ min: 50, name: "level.l2" },
	{ min: 150, name: "level.l3" },
	{ min: 300, name: "level.l4" },
	{ min: 500, name: "level.l5" },
	{ min: 800, name: "level.l6" },
	{ min: 1200, name: "level.l7" }
];
function นับคอมเมนต์ของฉัน(userId) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
	} catch (e) {
		return 0;
	}
	var n = 0;
	Object.keys(all).forEach(function(postId) {
		(all[postId] || []).forEach(function(c) { if (c.userId === userId) n++; });
	});
	return n;
}
// คืน { xp, counts: { reviews, posts, dna, comments, social } }
function คำนวณXP(userId) {
	var me = getUsers().filter(function(u) { return u.id === userId; })[0];
	var counts = {
		reviews: countReviewsByUser(userId),
		posts: getPostsByUser(userId).length,
		dna: me && me.foodDNA ? 1 : 0,
		comments: นับคอมเมนต์ของฉัน(userId),
		social: getLikedShops().length + getLikedPosts().length + getSavedShops().length + getFollowedShops().length + getFollowedUsers().length
	};
	var xp = 0;
	CHIMCHIM_XP_RULES.forEach(function(r) { xp += (counts[r.key] || 0) * r.xp; });
	return { xp: xp, counts: counts };
}
// คืน { level (1-7), name, xp, min, next (null = ระดับสูงสุด), nextName, progress 0-1 }
function เลเวลจากXP(xp) {
	var i = 0;
	while (i + 1 < CHIMCHIM_LEVELS.length && xp >= CHIMCHIM_LEVELS[i + 1].min) i++;
	var cur = CHIMCHIM_LEVELS[i];
	var nxt = CHIMCHIM_LEVELS[i + 1] || null;
	return {
		level: i + 1,
		name: t(cur.name),
		xp: xp,
		min: cur.min,
		next: nxt ? nxt.min : null,
		nextName: nxt ? t(nxt.name) : null,
		progress: nxt ? Math.max(0, Math.min(1, (xp - cur.min) / (nxt.min - cur.min))) : 1
	};
}

// นับจำนวนรีวิวทั้งหมดที่ผู้ใช้คนนี้เคยเขียนไว้ (ใช้คำนวณ XP) — รีวิวต้องมี userId ติดไว้ตอนบันทึกถึงจะนับได้
function countReviewsByUser(userId) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		return 0;
	}
	var count = 0;
	Object.keys(all).forEach(function(shopId) {
		all[shopId].forEach(function(r) {
			if (r.userId === userId) count++;
		});
	});
	return count;
}
// ดึงรีวิวทั้งหมดที่ผู้ใช้คนนี้เคยเขียน (พร้อม shopId ติดไปด้วย) เรียงใหม่สุดก่อน — ใช้แสดงประวัติการรีวิวในโปรไฟล์
function getReviewsByUser(userId) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		return [];
	}
	var result = [];
	Object.keys(all).forEach(function(shopId) {
		all[shopId].forEach(function(r) {
			if (r.userId === userId) {
				result.push({
					shopId: parseInt(shopId, 10),
					taste: r.taste,
					atmosphere: r.atmosphere,
					service: r.service,
					text: r.text,
					author: r.author,
					date: r.date
				});
			}
		});
	});
	result.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
	return result;
}

/* --- แถวประวัติกดถูกใจ/รีวิว ใช้ร่วมกันได้ทุกหน้า (ตอนนี้ใช้ในหน้าตั้งค่า) --- */
function buildLikeRow(ร้าน) {
	var row = document.createElement("div");
	row.className = "profshoprow";
	row.style.cursor = "pointer";
	row.innerHTML =
		'<img src="' + safeImgSrc(ร้าน.รูป) + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
		'<div style="flex:1;min-width:0;">' +
			'<div class="profshopnm">' + escapeHtml(ร้าน.เมนู) + "</div>" +
			'<div class="profshopmeta">' + escapeHtml(ร้าน.ร้าน) + " · " + catEmoji(ร้าน.หมวด) + " " + escapeHtml(catLabel(ร้าน.หมวด)) + "</div>" +
		"</div>";
	row.addEventListener("click", function() {
		window.location.href = "restaurant.html?id=" + ร้าน.id;
	});
	return row;
}
function buildReviewItem(r) {
	var ร้าน = หาร้านจากId(r.shopId);
	if (!ร้าน) return null;
	var avgScore = Math.round((r.taste + r.atmosphere + r.service) / 3 * 10) / 10;
	var item = document.createElement("div");
	item.className = "profreviewitem";
	item.innerHTML =
		'<div class="profreviewrow">' +
			'<img src="' + safeImgSrc(ร้าน.รูป) + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
			'<div style="flex:1;min-width:0;">' +
				'<div class="profshopnm">' + escapeHtml(ร้าน.ร้าน) + "</div>" +
				'<div class="profshopmeta">🎯 ' + avgScore + t("restaurant.avgScoreSuffix") + "</div>" +
			"</div>" +
		"</div>" +
		(r.text ? '<p class="profreviewtxt">' + escapeHtml(r.text) + "</p>" : "");
	item.querySelector(".profreviewrow").addEventListener("click", function() {
		window.location.href = "restaurant.html?id=" + ร้าน.id;
	});
	return item;
}

// เติม id ที่มีจริงบน Supabase (remoteIds) เข้าไปใน set ที่เก็บไว้ในเครื่องนี้ (localStorage key เดียว = array of id)
// ใช้ตอนล็อกอิน/เข้าแอป เพื่อดึงไลก์/ติดตามที่เคยทำไว้จากเครื่องอื่นกลับมา โดยไม่ทำของเดิมในเครื่องนี้หาย (union)
function mergeLocalIdSet(key, remoteIds) {
	var local;
	try {
		local = JSON.parse(localStorage.getItem(key)) || [];
	} catch (e) {
		local = [];
	}
	remoteIds.forEach(function(id) {
		if (local.indexOf(id) === -1) local.push(id);
	});
	localStorage.setItem(key, JSON.stringify(local));
}

// ต้องเข้าสู่ระบบก่อนถึงจะกดถูกใจ/ติดตามได้ (กันข้อมูลกดไปแล้วไม่ sync ไปไหนเลยเพราะไม่มีบัญชี)
// เรียกจาก toggleLikeShop/toggleFollowShop/togglePostLike/toggleFollowUser ทุกจุด — ยังไม่ล็อกอินจะเด้ง
// popup เข้าสู่ระบบ/สมัครสมาชิกให้เอง แล้วคืน true (บล็อกการกระทำ) ล็อกอินแล้วคืน false (ทำต่อได้ปกติ)
function ต้องล็อกอินก่อนไหม() {
	if (getSession()) return false;
	if (typeof showToast === "function") showToast(t("auth.loginRequiredToast"));
	if (typeof openAuthPop === "function") openAuthPop("login");
	return true;
}

/* =====================================================================
   Follow ร้าน (บันทึกไว้ในเบราว์เซอร์)
   ===================================================================== */
function getFollowedShops() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_FOLLOWS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function toggleFollowShop(shopId) {
	if (ต้องล็อกอินก่อนไหม()) return null;
	var list = getFollowedShops();
	var idx = list.indexOf(shopId);
	var nowFollowing = idx === -1;
	if (nowFollowing) {
		list.push(shopId);
		logEvent("shop_followed", { shopId: shopId });
	} else {
		list.splice(idx, 1);
	}
	localStorage.setItem(CHIMCHIM_FOLLOWS_KEY, JSON.stringify(list));
	if (typeof sbSetFollow === "function") sbSetFollow("shop", shopId, nowFollowing);
	return nowFollowing;
}
function isShopFollowed(shopId) {
	return getFollowedShops().indexOf(shopId) !== -1;
}

/* =====================================================================
   Like ร้าน (กดถูกใจเร็ว ๆ เหมือนฟีดโซเชียล) — แยกจาก Follow
   Follow = ติดตามรับอัปเดตจากร้าน, Like = กดถูกใจโพสต์/เมนูเฉย ๆ ไม่ผูกกับการติดตาม
   ===================================================================== */
var CHIMCHIM_LIKES_KEY = "chimchim_likes";
function getLikedShops() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_LIKES_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function isShopLiked(shopId) {
	return getLikedShops().indexOf(shopId) !== -1;
}
function toggleLikeShop(shopId) {
	if (ต้องล็อกอินก่อนไหม()) return null;
	var list = getLikedShops();
	var idx = list.indexOf(shopId);
	var nowLiked = idx === -1;
	if (nowLiked) {
		list.push(shopId);
		logEvent("shop_liked", { shopId: shopId });
	} else {
		list.splice(idx, 1);
	}
	localStorage.setItem(CHIMCHIM_LIKES_KEY, JSON.stringify(list));
	// ปรับเลขไลก์จริงที่ cache ไว้ทันที (optimistic) กันต้องรอ fetch ใหม่ทุกครั้งที่กด
	CHIMCHIM_REAL_SHOP_LIKE_COUNTS[shopId] = Math.max(0, getLikeCount(shopId) + (nowLiked ? 1 : -1));
	if (typeof sbSetShopLike === "function") sbSetShopLike(shopId, nowLiked);
	return nowLiked;
}
// ยอดไลก์จริงจาก Supabase (นับแถวจริงในตาราง likes_shops ไม่ใช่เลขสุ่มมั่ว ๆ อีกต่อไป)
// เริ่มที่ 0 จนกว่าจะดึงของจริงมาได้ (ดู queueShopLikeCountFetch ด้านล่าง — ผูกอัตโนมัติจาก initLikeUI ทุกจุด)
var CHIMCHIM_REAL_SHOP_LIKE_COUNTS = {};
// ยอดจากเซิร์ฟเวอร์ยังไม่รวมการกดของเราที่ค้างส่งอยู่ (คิวรอส่งใน supabase-client.js) — บวก/ลบให้ตรงกับที่ผู้ใช้เห็นว่ากดไว้
function ยอดรวมที่ค้างส่ง(kind, id, count) {
	if (typeof sbPendingState !== "function") return count;
	var st = sbPendingState(kind, id);
	if (st === true) return count + 1;
	if (st === false) return Math.max(0, count - 1);
	return count;
}
function getLikeCount(shopId) {
	return CHIMCHIM_REAL_SHOP_LIKE_COUNTS.hasOwnProperty(shopId) ? CHIMCHIM_REAL_SHOP_LIKE_COUNTS[shopId] : 0;
}
function formatLikeCount(n) {
	if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
	return String(n);
}

/* =====================================================================
   บันทึกร้านไว้ดูทีหลัง (Save) — แยกจาก Like โดยเจตนา (ชอบตอนเห็น ≠ อยากเก็บไว้ดูอีกที)
   ก่อนหน้านี้ปุ่ม "บันทึก" บนหน้าร้านคือปุ่ม Like แปะป้ายใหม่เฉย ๆ ของจริงยังไม่มี อันนี้คือของจริง
   ===================================================================== */
var CHIMCHIM_SAVES_KEY = "chimchim_saved_shops";
function getSavedShops() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_SAVES_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function isShopSaved(shopId) {
	return getSavedShops().indexOf(shopId) !== -1;
}
function toggleSaveShop(shopId) {
	if (ต้องล็อกอินก่อนไหม()) return null;
	var list = getSavedShops();
	var idx = list.indexOf(shopId);
	var nowSaved = idx === -1;
	if (nowSaved) {
		list.unshift(shopId);
		logEvent("shop_saved", { shopId: shopId });
	} else {
		list.splice(idx, 1);
	}
	localStorage.setItem(CHIMCHIM_SAVES_KEY, JSON.stringify(list));
	if (typeof sbSetShopSave === "function") sbSetShopSave(shopId, nowSaved);
	return nowSaved;
}
/* --- โพสต์ที่บันทึกไว้ (ปุ่มบุ๊กมาร์กในหน้าดูโพสต์) — แสดงในแท็บ "บันทึกไว้" ของหน้าโปรไฟล์
   เก็บเป็น id สตริง (โพสต์จริง = ตัวเลข / โพสต์ตัวอย่างร้านตั้งต้น = "bu-…-postN" / โพสต์ที่ยังไม่ sync = "post…")
   sync ขึ้นตาราง saved_posts (SQL Phase 12) --- */
var CHIMCHIM_SAVED_POSTS_KEY = "chimchim_saved_posts";
function getSavedPosts() {
	try {
		return (JSON.parse(localStorage.getItem(CHIMCHIM_SAVED_POSTS_KEY)) || []).map(String);
	} catch (e) {
		return [];
	}
}
function isPostSaved(postId) {
	return getSavedPosts().indexOf(String(postId)) !== -1;
}
function toggleSavePost(postId) {
	if (ต้องล็อกอินก่อนไหม()) return null;
	var id = String(postId);
	var list = getSavedPosts();
	var idx = list.indexOf(id);
	var nowSaved = idx === -1;
	if (nowSaved) list.unshift(id);
	else list.splice(idx, 1);
	localStorage.setItem(CHIMCHIM_SAVED_POSTS_KEY, JSON.stringify(list));
	if (nowSaved) logEvent("post_saved", {});
	if (typeof sbSetPostSave === "function") sbSetPostSave(id, nowSaved);
	return nowSaved;
}
// โพสต์ที่บันทึกไว้ที่ยังหาเจอในฟีดจริง (โพสต์ที่ถูกลบ/ถูกซ่อนไปแล้วไม่แสดง และไม่นับ)
function โพสต์ที่บันทึกไว้() {
	var items = getFeedItems();
	return getSavedPosts().map(function(id) {
		return items.filter(function(it) { return String(it.id) === id; })[0] || null;
	}).filter(Boolean);
}

// รวมคำขอนับไลก์จริงของหลายร้านที่โชว์บนหน้าเดียวกันให้เป็นคำขอ Supabase เดียว (debounce ด้วย setTimeout สั้น ๆ)
// กันยิง query แยกทีละการ์ด ๆ ตอนหน้ามีการ์ดร้านเป็นสิบ ๆ ใบพร้อมกัน (แถวแนะนำ/ฟีด/ค้นหา/วงล้อ ฯลฯ)
var __pendingShopLikeIds = [];
var __pendingShopLikeEls = {};
var __shopLikeFlushScheduled = false;
function queueShopLikeCountFetch(shopId, countEl) {
	if (!__pendingShopLikeEls[shopId]) __pendingShopLikeEls[shopId] = [];
	__pendingShopLikeEls[shopId].push(countEl);
	if (__pendingShopLikeIds.indexOf(shopId) === -1) __pendingShopLikeIds.push(shopId);
	if (__shopLikeFlushScheduled) return;
	__shopLikeFlushScheduled = true;
	setTimeout(function() {
		var ids = __pendingShopLikeIds.slice();
		var elsMap = __pendingShopLikeEls;
		__pendingShopLikeIds = [];
		__pendingShopLikeEls = {};
		__shopLikeFlushScheduled = false;
		if (typeof sbFetchShopLikeCounts !== "function") return;
		sbFetchShopLikeCounts(ids).then(function(counts) {
			ids.forEach(function(id) {
				var count = ยอดรวมที่ค้างส่ง("likeShop", id, counts[id] || 0);
				CHIMCHIM_REAL_SHOP_LIKE_COUNTS[id] = count;
				(elsMap[id] || []).forEach(function(el) { el.textContent = formatLikeCount(count); });
			});
		});
	}, 40);
}
// ผูกปุ่มถูกใจ + ตัวเลขยอดไลก์ให้การ์ดร้าน (ใช้ได้ทุกหน้าที่มี .mhrt อยู่ในการ์ด)
function initLikeUI(card) {
	var id = parseInt(card.getAttribute("data-id"), 10);
	var heart = card.querySelector(".mhrt");
	if (!heart || isNaN(id) || heart.getAttribute("data-like-wired") === "1") return;
	heart.setAttribute("data-like-wired", "1");
	var countEl = heart.querySelector(".mhrtcount");
	if (!countEl) {
		countEl = document.createElement("span");
		countEl.className = "mhrtcount";
		heart.appendChild(countEl);
	}
	function refresh() {
		var liked = isShopLiked(id);
		var ico = heart.querySelector("i");
		ico.classList.toggle("far", !liked);
		ico.classList.toggle("fas", liked);
		heart.classList.toggle("liked", liked);
		countEl.textContent = formatLikeCount(getLikeCount(id));
	}
	heart.addEventListener("click", function(e) {
		e.stopPropagation();
		toggleLikeShop(id);
		refresh();
	});
	refresh();
	queueShopLikeCountFetch(id, countEl);
}

/* =====================================================================
   Like โพสต์ในฟีดชุมชน (แยกจาก Like ร้านด้านบน) — postId เป็น string เสมอ
   ===================================================================== */
var CHIMCHIM_POST_LIKES_KEY = "chimchim_post_likes";
function getLikedPosts() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_POST_LIKES_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function isPostLiked(postId) {
	return getLikedPosts().indexOf(postId) !== -1;
}
function togglePostLike(postId) {
	if (ต้องล็อกอินก่อนไหม()) return null;
	var list = getLikedPosts();
	var idx = list.indexOf(postId);
	var nowLiked = idx === -1;
	if (nowLiked) list.push(postId); else list.splice(idx, 1);
	localStorage.setItem(CHIMCHIM_POST_LIKES_KEY, JSON.stringify(list));
	CHIMCHIM_REAL_POST_LIKE_COUNTS[postId] = Math.max(0, getPostLikeCount(postId) + (nowLiked ? 1 : -1));
	if (typeof sbSetPostLike === "function") sbSetPostLike(postId, nowLiked);
	return nowLiked;
}
// ยอดไลก์จริงจาก Supabase (นับแถวจริงในตาราง likes_posts) เหมือนร้าน — ดู queueShopLikeCountFetch ด้านบน
var CHIMCHIM_REAL_POST_LIKE_COUNTS = {};
function getPostLikeCount(postId) {
	if (CHIMCHIM_REAL_POST_LIKE_COUNTS.hasOwnProperty(postId)) return CHIMCHIM_REAL_POST_LIKE_COUNTS[postId];
	// ยังไม่ได้ยอดจริงจากเซิร์ฟเวอร์ → อย่างน้อยนับไลก์ของเราเอง ไม่โชว์ 0 ทั้งที่เพิ่งกดถูกใจ
	return isPostLiked(postId) ? 1 : 0;
}
var __pendingPostLikeIds = [];
var __pendingPostLikeEls = {};
var __postLikeFlushScheduled = false;
// target = element (ใส่ตัวเลขให้) หรือ function(count) (ผู้เรียกจัดการแสดงผลเอง)
function queuePostLikeCountFetch(postId, target) {
	if (!__pendingPostLikeEls[postId]) __pendingPostLikeEls[postId] = [];
	__pendingPostLikeEls[postId].push(target);
	if (__pendingPostLikeIds.indexOf(postId) === -1) __pendingPostLikeIds.push(postId);
	if (__postLikeFlushScheduled) return;
	__postLikeFlushScheduled = true;
	setTimeout(function() {
		var ids = __pendingPostLikeIds.slice();
		var elsMap = __pendingPostLikeEls;
		__pendingPostLikeIds = [];
		__pendingPostLikeEls = {};
		__postLikeFlushScheduled = false;
		if (typeof sbFetchPostLikeCounts !== "function") return;
		sbFetchPostLikeCounts(ids).then(function(counts) {
			ids.forEach(function(id) {
				// ดึงไม่ได้ (เช่น ตารางไลก์โพสต์ตัวอย่างยังไม่มี) → ไม่ทับยอดเดิมด้วย 0
				if (!counts.hasOwnProperty(id)) return;
				var count = ยอดรวมที่ค้างส่ง("likePost", String(id), counts[id]);
				CHIMCHIM_REAL_POST_LIKE_COUNTS[id] = count;
				(elsMap[id] || []).forEach(function(target) {
					if (typeof target === "function") target(count);
					else target.textContent = formatLikeCount(count);
				});
			});
		});
	}, 40);
}
// นับคอมเมนต์จริงจาก Supabase เหมือนกัน (แทน getComments(postId).length ที่เดิมนับแค่ในเครื่องนี้)
var CHIMCHIM_REAL_COMMENT_COUNTS = {};
function getCommentCount(postId) {
	return CHIMCHIM_REAL_COMMENT_COUNTS.hasOwnProperty(postId) ? CHIMCHIM_REAL_COMMENT_COUNTS[postId] : getComments(postId).length;
}
var __pendingCommentCountIds = [];
var __pendingCommentCountEls = {};
var __commentCountFlushScheduled = false;
// target = element (ใส่จำนวนให้) หรือ function(summary) — summary = { count, latest: [{ author, text }] }
function queueCommentCountFetch(postId, target) {
	if (!__pendingCommentCountEls[postId]) __pendingCommentCountEls[postId] = [];
	__pendingCommentCountEls[postId].push(target);
	if (__pendingCommentCountIds.indexOf(postId) === -1) __pendingCommentCountIds.push(postId);
	if (__commentCountFlushScheduled) return;
	__commentCountFlushScheduled = true;
	setTimeout(function() {
		var ids = __pendingCommentCountIds.slice();
		var elsMap = __pendingCommentCountEls;
		__pendingCommentCountIds = [];
		__pendingCommentCountEls = {};
		__commentCountFlushScheduled = false;
		if (typeof sbFetchCommentSummaries !== "function") return;
		sbFetchCommentSummaries(ids).then(function(sums) {
			ids.forEach(function(id) {
				if (!sums.hasOwnProperty(id)) return;
				CHIMCHIM_REAL_COMMENT_COUNTS[id] = sums[id].count;
				(elsMap[id] || []).forEach(function(target) {
					if (typeof target === "function") target(sums[id]);
					else target.textContent = sums[id].count;
				});
			});
		});
	}, 40);
}

// การ์ดร้านแบบย่อ (รูป + Match% + ชื่อร้าน/เมนู + ระยะทาง) ใช้ร่วมกันได้ทุกหน้าที่อยากโชว์ร้านแนะนำ
// เช่น แถวเทรนด์/มื้อนี้/แนะนำบนหน้าแรก และร้านที่คล้ายกันในหน้าวงล้อสุ่มเมนู
function buildMiniCard(ร้าน, onClick) {
	var คะแนน = คำนวณMatch(ร้าน, foodDNA);
	var card = document.createElement("div");
	card.className = "mcard card-enter";
	card.setAttribute("data-id", ร้าน.id);
	card.innerHTML =
		'<div class="mimg">' +
			'<img src="' + safeImgSrc(ร้าน.รูป) + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
			'<div class="mmatch" data-match-score="' + คะแนน + '">' + matchBadgeText(คะแนน) + "</div>" +
			'<div class="mhrt"><i class="far fa-heart"></i></div>' +
		"</div>" +
		'<div class="mbody">' +
			'<div class="mcat">' + catEmoji(ร้าน.หมวด) + " " + escapeHtml(catLabel(ร้าน.หมวด)) + "</div>" +
			'<div class="mrestaurant">' + escapeHtml(ร้าน.ร้าน) + "</div>" +
			'<div class="mtit">' + escapeHtml(ร้าน.เมนู) + "</div>" +
			'<div class="mmeta"><span><i class="fas fa-location-dot"></i>' + distanceText(ร้าน.ระยะทาง) + '</span><span class="muni"><i class="fas fa-graduation-cap"></i>' + escapeHtml(ร้าน.มหาลัย) + "</span></div>" +
		"</div>";
	card.addEventListener("click", function() {
		if (onClick) {
			onClick(ร้าน);
		} else {
			window.location.href = "restaurant.html?id=" + ร้าน.id;
		}
	});
	initLikeUI(card);
	return card;
}

/* --- Follow นักรีวิว/เพื่อนในชุมชน (แยกจาก Follow ร้าน) --- */
var CHIMCHIM_FOLLOWED_USERS_KEY = "chimchim_followed_users";
// นักรีวิวตัวอย่าง (id "seed-…") ถูกลบออกจากแอปแล้ว — ล้างการติดตาม/ถูกใจโพสต์ที่ค้างอยู่ในเครื่อง ไม่ให้นับเกินหรือโชว์แถวว่าง
(function ล้างนักรีวิวตัวอย่างที่ค้าง() {
	[["chimchim_followed_users", /^seed-/], ["chimchim_post_likes", /^seed-/]].forEach(function(x) {
		try {
			var list = JSON.parse(localStorage.getItem(x[0]));
			if (!Array.isArray(list)) return;
			var kept = list.filter(function(id) { return !x[1].test(String(id)); });
			if (kept.length !== list.length) localStorage.setItem(x[0], JSON.stringify(kept));
		} catch (e) {}
	});
})();
function getFollowedUsers() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_FOLLOWED_USERS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function toggleFollowUser(userId) {
	if (ต้องล็อกอินก่อนไหม()) return null;
	var list = getFollowedUsers();
	var idx = list.indexOf(userId);
	var nowFollowing = idx === -1;
	if (nowFollowing) list.push(userId); else list.splice(idx, 1);
	localStorage.setItem(CHIMCHIM_FOLLOWED_USERS_KEY, JSON.stringify(list));
	if (typeof sbSetFollow === "function") sbSetFollow("profile", userId, nowFollowing);
	return nowFollowing;
}
function isUserFollowed(userId) {
	return getFollowedUsers().indexOf(userId) !== -1;
}

/* =====================================================================
   จำร้านที่แนะนำไปแล้ว "วันนี้" — กันไม่ให้ขึ้นเมนูเดิมซ้ำในแถวแนะนำ/มื้อนี้
   พอข้ามวันใหม่ ตัวนับจะเริ่มใหม่เองอัตโนมัติ (key ผูกกับวันที่)
   ===================================================================== */
function วันนี้ตัวย่อ() {
	var d = new Date();
	return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function CHIMCHIM_SHOWN_KEY_TODAY() {
	return "chimchim_shown_" + วันนี้ตัวย่อ();
}
function getShownToday() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_SHOWN_KEY_TODAY())) || [];
	} catch (e) {
		return [];
	}
}
function markShownToday(ids) {
	var list = getShownToday();
	ids.forEach(function(id) {
		if (list.indexOf(id) === -1) list.push(id);
	});
	localStorage.setItem(CHIMCHIM_SHOWN_KEY_TODAY(), JSON.stringify(list));
}
// เลือก n ร้านจาก pool โดยเลี่ยงร้านที่เคยโชว์ไปแล้ววันนี้ก่อน (ถ้าพอ) แล้วบันทึกว่าโชว์แล้ว
function เลือกไม่ซ้ำวันนี้(pool, n) {
	var shown = getShownToday();
	var ยังไม่เคย = pool.filter(function(r) { return shown.indexOf(r.id) === -1; });
	var แหล่งเลือก = ยังไม่เคย.length >= n ? ยังไม่เคย : pool;
	var ผล = แหล่งเลือก.slice(0, n);
	markShownToday(ผล.map(function(r) { return r.id; }));
	return ผล;
}
// สำหรับแถวที่เรียงตาม Match แล้ว (Recommended / Match Hero): ร้านที่ยังไม่เคยโชว์วันนี้ขึ้นก่อนเสมอ
// ร้านที่เคยโชว์ไปแล้ว "ไม่หายไป" แค่ไหลลงไปอยู่ท้าย ๆ แทน (คงลำดับ Match เดิมไว้ในแต่ละกลุ่ม)
// เพื่อให้เปิดแอปแต่ละรอบในวันเดียวกันเห็นอะไรใหม่ ๆ ขึ้นก่อนบ้าง โดยของเดิมยังตามหาเจอ
function หมุนเวียนตามวันนี้(list, getId, n) {
	var shown = getShownToday();
	var ยังไม่เคย = list.filter(function(item) { return shown.indexOf(getId(item)) === -1; });
	var เคยแล้ว = list.filter(function(item) { return shown.indexOf(getId(item)) !== -1; });
	var ผล = ยังไม่เคย.concat(เคยแล้ว).slice(0, n);
	markShownToday(ผล.map(getId));
	return ผล;
}

/* =====================================================================
   โพสต์ของสมาชิก (ภาพ + แคปชั่น) — โชว์ในหน้าโปรไฟล์ตัวเอง และหน้าโปรไฟล์สาธารณะ
   เวอร์ชันย่อของฟีเจอร์คอมมูนิตี้ (ยังไม่รองรับสตอรี่/รีล/วิดีโอในเวอร์ชันนี้)
   ===================================================================== */
function getAllPosts() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_POSTS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
// โพสต์ส่วนตัวของผู้ใช้เท่านั้น (ไม่รวมโพสต์ที่โพสต์ในนาม "เพจร้าน" ของเขา — ดู getPostsByPage)
function getPostsByUser(userId) {
	return getAllPosts().filter(function(p) { return p.userId === userId && !p.pageId; });
}
function getPostsByPage(pageId) {
	return getAllPosts().filter(function(p) { return p.pageId === pageId; });
}
// pageId ใส่เฉพาะตอนโพสต์ในนามเพจร้าน (ไม่ใส่ = โพสต์ในนามตัวเอง) userId เก็บไว้เสมอเพื่อ audit/คำนวณ XP
// images รับได้ทั้ง string เดียว (รูปเดียว) หรืออาร์เรย์ (โพสต์ได้หลายรูปในโพสต์เดียวเหมือน IG)
// คืน Promise<{ ok, reason }> — ok=false: "storage" (localStorage เต็ม) หรือ "server" (Supabase ไม่รับ/รูปไม่ครบ)
// ผู้เรียกต้องรอผลนี้ก่อนบอกผู้ใช้ว่าโพสต์สำเร็จ (เดิมคืน true ทันทีแล้วส่งขึ้นเซิร์ฟเวอร์แบบไม่รอ ถ้าพังผู้ใช้ไม่รู้เลย)
// บัญชีทดลองในเครื่อง (ดู ต้องบันทึกขึ้นเซิร์ฟเวอร์) ยังเก็บในเครื่องอย่างเดียวได้เหมือนเดิม
function addPost(userId, images, caption, pageId) {
	var imgList = (Array.isArray(images) ? images.filter(Boolean) : [images]).slice(0, CHIMCHIM_MAX_IMAGES);
	var posts = getAllPosts();
	var localId = "post" + Date.now();
	posts.unshift({ id: localId, userId: userId, pageId: pageId || null, images: imgList, img: imgList[0], caption: caption, date: new Date().toISOString() });
	try {
		localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
	} catch (e) {
		return Promise.resolve({ ok: false, reason: "storage" });
	}
	if (typeof sbSavePost !== "function") {
		logEvent("post_created", { pageId: pageId || null });
		return Promise.resolve({ ok: true });
	}
	var mustReachServer = ต้องบันทึกขึ้นเซิร์ฟเวอร์();
	// ผลักโพสต์ขึ้น Supabase จริงทันที ให้คนอื่นเห็นในฟีดข้ามเครื่องได้เลย
	return sbSavePost({ userId: userId, pageId: pageId || null, images: imgList, caption: caption }).then(function(saved) {
		var complete = !!(saved && Array.isArray(saved.images) && saved.images.length === imgList.length);
		if (complete) reconcilePostId(localId, String(saved.id));
		if (complete || !mustReachServer) {
			logEvent("post_created", { pageId: pageId || null });
			return { ok: true };
		}
		// บันทึกไม่ครบ → ถอนโพสต์ในเครื่องออก (ถ้าแถวขึ้นไปแต่รูปไม่ครบ ลบแถวนั้นทิ้งด้วย) ฟอร์มยังเก็บรูป/แคปชั่นไว้ให้ลองใหม่
		if (saved && saved.id && typeof sbDeletePost === "function") sbDeletePost(saved.id);
		try {
			localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(getAllPosts().filter(function(p) { return p.id !== localId; })));
		} catch (e) {}
		return { ok: false, reason: "server" };
	});
}
// คืนอาร์เรย์รูปของโพสต์เสมอ ไม่ว่าโพสต์นั้นจะเป็นโพสต์เก่า (มีแค่ img เดียว) หรือใหม่ (มี images หลายรูป)
function getPostImages(p) {
	if (p.images && p.images.length) return p.images;
	return p.img ? [p.img] : [];
}
function deletePost(postId) {
	var posts = getAllPosts();
	var target = posts.filter(function(p) { return p.id === postId; })[0];
	posts = posts.filter(function(p) { return p.id !== postId; });
	localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
	// ลบโพสต์แล้วลบคอมเมนต์ที่ผูกกับโพสต์นั้นทิ้งไปด้วย กันคอมเมนต์ค้างเป็นขยะ
	var allComments;
	try {
		allComments = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
	} catch (e) {
		allComments = {};
	}
	delete allComments[postId];
	localStorage.setItem(CHIMCHIM_COMMENTS_KEY, JSON.stringify(allComments));
	if (target && target.remoteId && typeof sbDeletePost === "function") sbDeletePost(target.remoteId);
}
// แก้ไขโพสต์เดิม (รูป/แคปชั่น) — แก้ได้เฉพาะเจ้าของโพสต์อยู่แล้วในทางปฏิบัติ เพราะเรียกจากหน้า "โพสต์ของฉัน" เท่านั้น
// คืน true/false เหมือน addPost (ดูคอมเมนต์ที่ addPost ว่าทำไมต้องเช็คค่านี้)
// คืน Promise<{ ok, reason }> เหมือน addPost — ถ้าเซิร์ฟเวอร์ไม่รับ จะคืนโพสต์ในเครื่องกลับเป็นของเดิม
function updatePost(postId, patch) {
	var posts = getAllPosts();
	var i, target = null, before = null;
	if (patch.images) patch.images = patch.images.slice(0, CHIMCHIM_MAX_IMAGES);
	for (i = 0; i < posts.length; i++) {
		if (posts[i].id === postId) {
			before = JSON.parse(JSON.stringify(posts[i]));
			if (patch.images) {
				posts[i].images = patch.images;
				posts[i].img = patch.images[0];
			}
			if (typeof patch.caption === "string") posts[i].caption = patch.caption;
			target = posts[i];
			break;
		}
	}
	try {
		localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
	} catch (e) {
		return Promise.resolve({ ok: false, reason: "storage" });
	}
	if (!(target && target.remoteId && typeof sbSavePost === "function")) return Promise.resolve({ ok: true });
	var mustReachServer = ต้องบันทึกขึ้นเซิร์ฟเวอร์();
	return sbSavePost(target).then(function(saved) {
		var complete = !!(saved && Array.isArray(saved.images) && saved.images.length === target.images.length);
		if (complete || !mustReachServer) return { ok: true };
		posts[i] = before;
		try { localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts)); } catch (e) {}
		return { ok: false, reason: "server" };
	});
}
// ผสานโพสต์จริงของทุกคนจาก Supabase เข้ากับ localStorage เครื่องนี้ — แทนที่โพสต์เดิมถ้า id ตรงกัน (ข้อมูลใหม่กว่า)
// หรือเพิ่มเป็นโพสต์ใหม่ถ้ายังไม่เคยเห็น (เห็นโพสต์ของคนอื่นข้ามเครื่องได้จริง ไม่ใช่แค่โพสต์ตัวอย่าง)
function mergeRemotePostsIntoLocal(remotePosts) {
	var posts = getAllPosts();
	var remoteIds = {};
	remotePosts.forEach(function(remote) {
		remoteIds[remote.id] = true;
		if (isContentHidden("post", remote.id)) return;
		var idx = -1, i;
		for (i = 0; i < posts.length; i++) {
			if (posts[i].id === remote.id) { idx = i; break; }
		}
		// userName/userAvatar มาจาก join กับ profiles ตอนดึงจาก Supabase (ดู sbPostRowToLocal) — เก็บติดไว้ที่โพสต์เลย
		// กันปัญหาโพสต์ของคนอื่นที่เครื่องนี้ไม่เคยเห็นมาก่อน (ไม่มีใน getUsers() ในเครื่องนี้) ขึ้นเป็นชื่อกลาง ๆ
		// "นักชิม ChimChim" ทั้งที่จริงมีชื่อจริงอยู่แล้วบน Supabase (ดู getFeedItems())
		var withRemoteId = { id: remote.id, remoteId: remote.id, userId: remote.userId, userName: remote.userName || null, userAvatar: remote.userAvatar || null, pageId: remote.pageId, images: remote.images, img: remote.images[0], caption: remote.caption, date: remote.date };
		if (idx !== -1) { posts[idx] = withRemoteId; } else { posts.push(withRemoteId); }
	});
	// เอาโพสต์ที่เคย sync ไปแล้ว (มี remoteId) แต่ไม่อยู่ในชุดล่าสุดจาก Supabase ออกทิ้ง — แปลว่าโดนลบ/โดนซ่อน
	// จากเครื่องอื่นไปจริง ๆ แล้ว (ไม่งั้นจะค้างเป็นโพสต์ผีในเครื่องนี้ตลอดไป) โพสต์ที่ยังไม่เคย sync (ไม่มี remoteId) ไม่แตะ
	posts = posts.filter(function(p) { return !p.remoteId || remoteIds[p.remoteId]; });
	posts.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
	localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
}
// ย้าย id ชั่วคราวที่สร้างในเครื่อง (ตอน addPost ก่อนรู้ id จริงจาก Supabase) ไปเป็น id จริงทุกจุดที่อ้างถึง
// โพสต์นั้น (คอมเมนต์/ไลก์) เหมือนกับ reconcileShopNumId ตอน sync ร้าน
function reconcilePostId(oldId, newId) {
	if (oldId === newId) return;
	var posts = getAllPosts();
	posts.forEach(function(p) {
		if (p.id === oldId) { p.id = newId; p.remoteId = newId; }
	});
	localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));

	var allComments;
	try {
		allComments = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
	} catch (e) {
		allComments = {};
	}
	if (allComments[oldId]) {
		allComments[newId] = allComments[oldId];
		delete allComments[oldId];
		localStorage.setItem(CHIMCHIM_COMMENTS_KEY, JSON.stringify(allComments));
	}

	var savedPosts = getSavedPosts();
	var saveIdx = savedPosts.indexOf(String(oldId));
	if (saveIdx !== -1) {
		savedPosts[saveIdx] = String(newId);
		localStorage.setItem(CHIMCHIM_SAVED_POSTS_KEY, JSON.stringify(savedPosts));
		if (typeof sbSetPostSave === "function") sbSetPostSave(String(newId), true);
	}

	var likedPosts = getLikedPosts();
	var likeIdx = likedPosts.indexOf(oldId);
	if (likeIdx !== -1) {
		likedPosts[likeIdx] = newId;
		localStorage.setItem(CHIMCHIM_POST_LIKES_KEY, JSON.stringify(likedPosts));
	}
}

/* =====================================================================
   ฟีดชุมชนรวม (หน้าแรก) — รวมโพสต์จริงของผู้ใช้/เพจร้าน + โพสต์ของ 11 ร้านจริงใกล้ ม.กรุงเทพ (เพจร้านBU)
   คืนค่าเป็นรูปแบบเดียวกันหมด เรียงใหม่สุดก่อนเสมอ ไม่ว่าจะเป็นโพสต์จริงหรือของร้าน BU
   ===================================================================== */
function getFeedItems() {
	var users = getUsers();
	var shops = getShops();
	var fromReal = getAllPosts().map(function(p) {
		// pageId ตอนนี้คือ numId ของ "ร้านของฉัน" (เพจ/ร้านรวมเป็นเอนทิตีเดียวแล้ว ดู migratePageIntoShop)
		var shop = p.pageId ? shops.filter(function(s) { return s.numId === p.pageId; })[0] : null;
		var user = users.filter(function(u) { return u.id === p.userId; })[0];
		// เรียงลำดับหาชื่อ: ร้าน > ชื่อจริงที่ sync มาจาก Supabase (p.userName, ใช้ได้แม้เครื่องนี้ไม่เคยเห็นคนโพสต์มาก่อน)
		// > ชื่อในเครื่องนี้ (โพสต์ของตัวเอง) > "นักชิม ChimChim" (fallback จริง ๆ เฉพาะตอนหาไม่เจอทุกทางแล้วเท่านั้น)
		var posterName = shop ? shop.name : (p.userName || (user ? user.name : t("common.chimchimFoodie")));
		return {
			id: p.id,
			kind: shop ? "page" : "user",
			images: getPostImages(p),
			caption: p.caption || "",
			date: p.date,
			posterName: posterName,
			posterAvatarUrl: shop ? shop.img : (p.userAvatar || null),
			posterColor: shop ? "var(--cream2)" : "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))",
			posterLink: shop ? ("restaurant.html?id=" + shop.numId) : ("public-profile.html?u=" + p.userId),
			userId: p.userId || null,
			uni: shop ? (shop.uni || null) : null,
			cat: shop ? shop.cat : null
		};
	});
	var fromBuShops = [];
	เพจร้านBU.forEach(function(shop) {
		shop.posts.forEach(function(post, idx) {
			// ตัดเวลาทิ้งเหลือแค่วัน (เที่ยงคืน) กันปัญหาลำดับโพสต์ที่ daysAgo เท่ากันสลับกันไปมาทุกครั้งที่โหลดหน้า
			// เพราะ new Date() ปกติจะได้เวลาต่างกันเป็นมิลลิวินาทีทุกครั้ง ทำให้เรียงลำดับไม่นิ่ง
			var d = new Date();
			d.setHours(0, 0, 0, 0);
			d.setDate(d.getDate() - (post.daysAgo || 0));
			fromBuShops.push({
				id: "bu-" + shop.id + "-post" + idx,
				kind: "bushop",
				images: post.images,
				caption: post.caption,
				date: d.toISOString(),
				posterName: shop.name,
				posterAvatarUrl: shop.avatar,
				posterColor: "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))",
				posterLink: "public-profile.html?u=bu-" + shop.id,
				uni: (function() { var m = หาร้านจากId(shop.menuId); return m ? m.มหาลัย : null; })(),
				cat: shop.cat
			});
		});
	});
	// ซ่อนโพสต์จริงที่ถูกรายงานถึงเกณฑ์ (เพจ/ผู้ใช้ตั้งต้นของ ChimChim อย่างร้าน BU ไม่ต้องเช็ค รายงานไม่ได้อยู่แล้ว)
	fromReal = fromReal.filter(function(item) { return !isContentHidden("post", item.id); });
	return fromReal.concat(fromBuShops).sort(function(a, b) {
		return new Date(b.date) - new Date(a.date);
	});
}

/* =====================================================================
   คอมเมนต์บนโพสต์ (ทุกบัญชีคอมเมนต์กันได้ เหมือนเฟซบุ๊ค/IG) เก็บแยกตาม postId
   ===================================================================== */
var CHIMCHIM_COMMENTS_KEY = "chimchim_comments";
function getComments(postId) {
	try {
		var all = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
		return all[postId] || [];
	} catch (e) {
		return [];
	}
}
function addComment(postId, author, text) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	if (!all[postId]) all[postId] = [];
	// เก็บ userId ไว้ด้วยเพื่อรู้ว่าคอมเมนต์ไหนเป็นของเรา (โชว์เมนูแก้ไข/ลบ) และ pending = ยังไม่ได้ remoteId จาก Supabase
	var session = getSession();
	var localId = "cmtL" + Date.now() + Math.random().toString(36).slice(2, 6);
	all[postId].push({ id: localId, author: author, text: text, date: new Date().toISOString(), userId: session ? session.id : null, pending: true });
	localStorage.setItem(CHIMCHIM_COMMENTS_KEY, JSON.stringify(all));
	// คอมเมนต์ได้จริงข้ามเครื่องเฉพาะโพสต์ที่ sync ขึ้น Supabase แล้ว (id เป็นตัวเลขจริง ไม่ใช่ "post"+timestamp ชั่วคราว)
	if (typeof sbAddComment !== "function") return Promise.resolve(null);
	return sbAddComment(postId, author, text).then(function(row) {
		if (row) tagCommentRemoteId(postId, localId, row.id);
		return row;
	});
}
// คอมเมนต์ที่ผู้ใช้กดลบไปก่อน push ขึ้น Supabase เสร็จ — พอได้ id จริงกลับมาแล้วต้องตามไปลบแถวนั้นทิ้งด้วย
var __deletedPendingComments = {};
function tagCommentRemoteId(postId, localId, remoteId) {
	if (__deletedPendingComments[localId]) {
		delete __deletedPendingComments[localId];
		if (typeof sbDeleteComment === "function") sbDeleteComment(remoteId);
		return;
	}
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
	} catch (e) {
		return;
	}
	(all[postId] || []).forEach(function(c) {
		if (c.id === localId) {
			c.id = "cmt" + remoteId;
			c.remoteId = remoteId;
			delete c.pending;
		}
	});
	localStorage.setItem(CHIMCHIM_COMMENTS_KEY, JSON.stringify(all));
}
function saveCommentsOfPost(postId, list) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	all[postId] = list;
	localStorage.setItem(CHIMCHIM_COMMENTS_KEY, JSON.stringify(all));
}
// แก้ข้อความคอมเมนต์ของตัวเอง — อัปเดตในเครื่องทันที แล้วยืนยันกับ Supabase ถ้าไม่สำเร็จ (เช่น โดน RLS บล็อก)
// คืนข้อความเดิมกลับให้ ไม่ปล่อยให้ผู้ใช้เข้าใจผิดว่าแก้แล้ว — คืน Promise<boolean>
function updateComment(postId, commentId, newText) {
	var list = getComments(postId);
	var target = list.filter(function(c) { return c.id === commentId; })[0];
	if (!target || !target.remoteId) return Promise.resolve(false);
	var oldText = target.text;
	target.text = newText;
	saveCommentsOfPost(postId, list);
	if (typeof sbUpdateComment !== "function") return Promise.resolve(true);
	return sbUpdateComment(target.remoteId, newText).then(function(ok) {
		if (!ok) {
			var again = getComments(postId);
			again.forEach(function(c) { if (c.id === commentId) c.text = oldText; });
			saveCommentsOfPost(postId, again);
		}
		return ok;
	});
}
// ลบคอมเมนต์ของตัวเอง — ถ้ายัง pending (ยังไม่ได้ id จริง) จดไว้ให้ tagCommentRemoteId ตามไปลบบน Supabase ทีหลัง
// คืน Promise<boolean> (false = Supabase ไม่ยอมลบ ผู้เรียกควร sync ใหม่เพื่อดึงคอมเมนต์กลับมาแสดง)
function deleteComment(postId, commentId) {
	var list = getComments(postId);
	var target = list.filter(function(c) { return c.id === commentId; })[0];
	if (!target) return Promise.resolve(true);
	saveCommentsOfPost(postId, list.filter(function(c) { return c.id !== commentId; }));
	if (CHIMCHIM_REAL_COMMENT_COUNTS.hasOwnProperty(postId)) {
		CHIMCHIM_REAL_COMMENT_COUNTS[postId] = Math.max(0, CHIMCHIM_REAL_COMMENT_COUNTS[postId] - 1);
	}
	if (!target.remoteId) {
		__deletedPendingComments[commentId] = true;
		return Promise.resolve(true);
	}
	if (typeof sbDeleteComment !== "function") return Promise.resolve(true);
	return sbDeleteComment(target.remoteId);
}
// แทนที่คอมเมนต์ทั้งหมดของโพสต์นี้ด้วยของจริงจาก Supabase (เรียกหลัง sync — โพสต์ที่มี remoteId แล้วเท่านั้น
// ที่คอมเมนต์ขึ้น Supabase ได้จริง ปลอดภัยที่จะแทนที่ทั้งชุดเพราะทุกคอมเมนต์ต้องผ่าน sbAddComment มาแล้วเสมอ)
function replaceLocalComments(postId, comments) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_COMMENTS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	// คอมเมนต์ที่เพิ่งพิมพ์แต่ยัง push ไม่เสร็จ (pending) ยังไม่อยู่ในชุดจาก Supabase — เก็บไว้ต่อท้าย ไม่งั้นมันหายวูบ
	// ข้ามอันที่ชุดจริงมีแล้ว (ผู้เขียน+ข้อความตรงกัน) กันโผล่ซ้ำ
	var pending = (all[postId] || []).filter(function(c) {
		return c.pending && !comments.some(function(r) { return r.userId === c.userId && r.text === c.text; });
	});
	all[postId] = comments.concat(pending);
	localStorage.setItem(CHIMCHIM_COMMENTS_KEY, JSON.stringify(all));
}

/* =====================================================================
   Analytics แบบเบา ๆ — เก็บ event การใช้งานไว้ใน localStorage ของเบราว์เซอร์นี้เท่านั้น
   (ไม่ใช่ analytics ข้ามผู้ใช้จริง ต้องรอย้ายไป Supabase ก่อนถึงจะรวมข้อมูลข้ามเครื่องได้ —
   ดู analytics_events ใน supabase/schema.sql ที่ออกแบบ field ให้ตรงกับตรงนี้ไว้แล้ว)
   เก็บแค่ N รายการล่าสุดกันโตไม่รู้จบ ดูสรุปได้ที่หน้า analytics.html
   ===================================================================== */
var CHIMCHIM_EVENTS_KEY = "chimchim_events";
var MAX_STORED_EVENTS = 500;
function getEvents() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_EVENTS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function logEvent(eventType, metadata) {
	var events = getEvents();
	var session = getSession();
	events.push({
		eventType: eventType,
		userId: session ? session.id : null,
		metadata: metadata || {},
		date: new Date().toISOString()
	});
	if (events.length > MAX_STORED_EVENTS) {
		events = events.slice(-MAX_STORED_EVENTS);
	}
	localStorage.setItem(CHIMCHIM_EVENTS_KEY, JSON.stringify(events));
	// ผลักขึ้น Supabase จริงด้วย (analytics_events เป็น insert-only ตาม RLS — อ่านสรุปคืนได้เฉพาะฝั่ง dashboard
	// ที่ใช้ service role key เท่านั้น) หน้า analytics.html ในแอปยังคงโชว์แค่สถิติของเครื่องนี้เหมือนเดิม
	if (typeof sbLogEvent === "function") sbLogEvent(eventType, session ? session.id : null, metadata || {});
}
function getEventCounts() {
	var counts = {};
	getEvents().forEach(function(e) {
		counts[e.eventType] = (counts[e.eventType] || 0) + 1;
	});
	return counts;
}
// เรียกครั้งเดียวตอนโหลดไฟล์นี้ (ซึ่งโหลดทุกหน้าของแอป) เลยนับเป็น "เปิดแอป/เปิดหน้า" ได้ครบทุกหน้าอัตโนมัติ
// หน่วงด้วย setTimeout(0) เพราะไฟล์นี้โหลดก่อน chimchim-supabase-client.js เสมอ — เรียกตรง ๆ ตอนนี้เลย
// sbLogEvent จะยังไม่มีอยู่ (ยังไม่ได้ประกาศ) ทำให้ event แรกสุดของทุกหน้าไม่เคยถูกผลักขึ้น Supabase เลย
setTimeout(function() {
	logEvent("app_open", { page: (typeof location !== "undefined" ? location.pathname.split("/").pop() : "") });
}, 0);

/* =====================================================================
   ระบบรายงานเนื้อหา (Moderation) — รายงานได้เฉพาะโพสต์/ร้านที่ "ผู้ใช้" เพิ่มเข้ามาเอง
   (ไม่ใช่ร้าน/โพสต์ตัวอย่างของทีม ChimChim) ถึงเกณฑ์ 3 รายงานขึ้นไปต่อชิ้น ซ่อนออกจากฟีด/ผลแนะนำอัตโนมัติ
   ทำแบบเดียวกับ schema ที่เตรียมไว้ใน supabase/schema.sql (moderation_reports + is_hidden)
   เพื่อให้ย้ายไป Supabase ทีหลังไม่ต้องออกแบบใหม่ ===================================================================== */
var CHIMCHIM_REPORTS_KEY = "chimchim_reports";
var REPORT_HIDE_THRESHOLD = 3;
function getReports() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_REPORTS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function saveReports(list) {
	localStorage.setItem(CHIMCHIM_REPORTS_KEY, JSON.stringify(list));
}
// note = รายละเอียดที่ผู้ใช้พิมพ์เอง (บังคับเมื่อเลือก "อื่น ๆ" นอกนั้นไม่บังคับ)
// remoteTargetId = id จริงบน Supabase (ใช้กับคอมเมนต์ ที่ id ในเครื่องเป็น "cmt123" ไม่ใช่ตัวเลข)
function reportContent(targetType, targetId, reason, note, remoteTargetId) {
	var session = getSession();
	var reports = getReports();
	reports.push({
		targetType: targetType,
		targetId: String(targetId),
		reporterId: session ? session.id : null,
		reason: reason,
		note: note || "",
		date: new Date().toISOString()
	});
	saveReports(reports);
	if (typeof logEvent === "function") logEvent("content_reported", { targetType: targetType, reason: reason });
	// ผลักรายงานขึ้น Supabase จริง — ต้องมีรายงานจริงสะสมถึงเกณฑ์ (3 รายงาน) ข้ามผู้ใช้/เครื่องถึงจะซ่อนเนื้อหาได้จริง
	// (ไม่งั้นนับแค่รายงานในเครื่องนี้เครื่องเดียว ซึ่งแทบไม่มีทางถึงเกณฑ์จริง) ตาราง moderation_reports อ่านกลับไม่ได้
	// (insert-only ตาม RLS) แต่ trigger check_report_threshold() ฝั่ง Supabase จะเซ็ต is_hidden ให้เองอัตโนมัติ
	// แล้ว sbFetchCommunityShops/sbFetchAllPosts ที่กรอง is_hidden=false อยู่แล้วจะไม่ดึงเนื้อหานั้นมาอีกทุกเครื่อง
	// คืน Promise ของการบันทึกรายงานบน Supabase (คอมเมนต์ต้องรอให้รายงานขึ้นก่อน ค่อยเรียก AI ตรวจ)
	if (typeof sbReportContent === "function") return sbReportContent(targetType, remoteTargetId != null ? remoteTargetId : targetId, reason, note || "");
	return Promise.resolve(null);
}
function getReportCount(targetType, targetId) {
	var id = String(targetId);
	return getReports().filter(function(r) { return r.targetType === targetType && r.targetId === id; }).length;
}
function isContentHidden(targetType, targetId) {
	return getReportCount(targetType, targetId) >= REPORT_HIDE_THRESHOLD;
}
function hasUserReported(targetType, targetId) {
	var session = getSession();
	if (!session) return false;
	var id = String(targetId);
	return getReports().some(function(r) { return r.targetType === targetType && r.targetId === id && r.reporterId === session.id; });
}

/* --- ป็อปอัพรายงาน ใช้ร่วมกันได้ทุกหน้า (สร้าง DOM เองเหมือน postViewModal) ---
   เลือกเหตุผลจากการ์ดที่แตะง่าย + ช่องเขียนรายละเอียด (บังคับเฉพาะ "อื่น ๆ") แล้วกดส่ง
   เรียกใช้ผ่าน window.openReportPopup(targetType, targetId, onReported, opts)
   targetType: "post" | "comment" | "shop"   opts.remoteId: id จริงบน Supabase (ใช้กับคอมเมนต์) --- */
var REPORT_REASONS = {
	spam: { icon: "bullhorn", label: "report.reasonSpam" },
	inappropriate: { icon: "eye-slash", label: "report.reasonInappropriate" },
	fake: { icon: "circle-exclamation", label: "report.reasonFake" },
	harassment: { icon: "hand", label: "report.reasonHarassment" },
	hate: { icon: "comment-slash", label: "report.reasonHate" },
	violence: { icon: "triangle-exclamation", label: "report.reasonViolence" },
	copyright: { icon: "copyright", label: "report.reasonCopyright" },
	wrong_info: { icon: "store-slash", label: "report.reasonWrongInfo" },
	other: { icon: "pen", label: "report.reasonOther" }
};
// แต่ละประเภทเนื้อหามีชุดเหตุผลที่เข้ากับมัน (เช่น "ข้อมูลร้านไม่ถูกต้อง" มีแค่ตอนรายงานร้าน)
var REPORT_REASONS_BY_TYPE = {
	post: ["spam", "inappropriate", "fake", "harassment", "hate", "violence", "copyright", "other"],
	comment: ["spam", "harassment", "hate", "inappropriate", "fake", "other"],
	shop: ["wrong_info", "fake", "spam", "inappropriate", "copyright", "other"]
};
var REPORT_NOTE_MAX = 300;
(function setupReportPopup() {
	var modal = document.createElement("div");
	modal.id = "reportPopModal";
	modal.innerHTML =
		'<div class="apbox rpbox">' +
			'<button class="apclose" id="reportPopClose" type="button"><i class="fas fa-times"></i></button>' +
			'<div class="rphead"><span class="rpheadicon"><i class="fas fa-flag"></i></span><h4 class="rptitle" id="reportPopTitle"></h4></div>' +
			'<p class="rpsub" id="reportPopHint"></p>' +
			'<div class="rpreasons" id="reportReasonList" role="radiogroup"></div>' +
			'<label class="rpnotelbl" for="reportNote"><span id="reportNoteLbl"></span><span class="rpnotecount" id="reportNoteCount"></span></label>' +
			'<textarea class="rpnote" id="reportNote" rows="3" maxlength="' + REPORT_NOTE_MAX + '"></textarea>' +
			'<p class="rperr" id="reportErr" hidden></p>' +
			'<button type="button" class="rpsubmit" id="reportSubmit" disabled><i class="fas fa-paper-plane"></i><span></span></button>' +
		"</div>";
	document.body.appendChild(modal);

	var listEl = modal.querySelector("#reportReasonList");
	var noteEl = modal.querySelector("#reportNote");
	var noteLbl = modal.querySelector("#reportNoteLbl");
	var noteCount = modal.querySelector("#reportNoteCount");
	var submitBtn = modal.querySelector("#reportSubmit");
	var errEl = modal.querySelector("#reportErr");
	var currentTarget = null;
	var currentCallback = null;
	var selectedReason = null;

	function closeReportPopup() {
		modal.classList.remove("open");
		document.body.style.overflow = "";
		currentTarget = null;
		currentCallback = null;
	}
	// ปุ่มส่งกดได้เมื่อเลือกเหตุผลแล้ว (และถ้าเลือก "อื่น ๆ" ต้องเขียนรายละเอียดด้วย)
	function refreshSubmitState() {
		var needNote = selectedReason === "other";
		var hasNote = noteEl.value.trim().length > 0;
		submitBtn.disabled = !selectedReason || (needNote && !hasNote);
		noteLbl.textContent = t(needNote ? "report.noteLabelRequired" : "report.noteLabel");
		noteEl.placeholder = t(needNote ? "report.notePlaceholderOther" : "report.notePlaceholder");
		noteCount.textContent = noteEl.value.length + "/" + REPORT_NOTE_MAX;
		modal.classList.toggle("rp-needs-note", needNote);
	}
	function renderReasons(type) {
		var keys = REPORT_REASONS_BY_TYPE[type] || REPORT_REASONS_BY_TYPE.post;
		listEl.innerHTML = keys.map(function(key) {
			var r = REPORT_REASONS[key];
			return '<button type="button" class="rpreason" role="radio" aria-checked="false" data-reason="' + key + '">' +
				'<i class="fas fa-' + r.icon + '"></i><span>' + t(r.label) + '</span></button>';
		}).join("");
	}
	listEl.addEventListener("click", function(e) {
		var btn = e.target.closest(".rpreason");
		if (!btn) return;
		selectedReason = btn.getAttribute("data-reason");
		listEl.querySelectorAll(".rpreason").forEach(function(b) {
			var on = b === btn;
			b.classList.toggle("selected", on);
			b.setAttribute("aria-checked", on ? "true" : "false");
		});
		errEl.hidden = true;
		refreshSubmitState();
		// เลือก "อื่น ๆ" แล้วพาไปที่ช่องเขียนเลย จะได้รู้ว่าต้องพิมพ์ต่อ
		if (selectedReason === "other") noteEl.focus();
	});
	noteEl.addEventListener("input", function() {
		errEl.hidden = true;
		refreshSubmitState();
	});
	modal.querySelector("#reportPopClose").addEventListener("click", closeReportPopup);
	modal.addEventListener("click", function(e) {
		if (e.target === modal) closeReportPopup();
	});
	document.addEventListener("keydown", function(e) {
		if (e.key === "Escape" && modal.classList.contains("open")) {
			e.stopPropagation();
			closeReportPopup();
		}
	}, true);
	submitBtn.addEventListener("click", function() {
		if (!currentTarget || !selectedReason) return;
		var note = noteEl.value.trim();
		if (selectedReason === "other" && !note) {
			errEl.textContent = t("report.noteRequiredErr");
			errEl.hidden = false;
			noteEl.focus();
			return;
		}
		var target = currentTarget;
		var cb = currentCallback;
		var saved = reportContent(target.type, target.id, selectedReason, note, target.remoteId);
		closeReportPopup();
		if (typeof showToast === "function") showToast(t(target.type === "comment" && target.remoteId ? "report.aiChecking" : "report.thanks"));
		if (cb) cb(saved);
	});

	window.openReportPopup = function(targetType, targetId, onReported, opts) {
		// ต้องล็อกอินก่อน (รายงานบน Supabase ผูกกับผู้ใช้ — กันคนเดียวรายงานซ้ำ ๆ จนเนื้อหาโดนซ่อน)
		if (typeof ต้องล็อกอินก่อนไหม === "function" && ต้องล็อกอินก่อนไหม()) return;
		if (hasUserReported(targetType, targetId)) {
			if (typeof showToast === "function") showToast(t("report.alreadyReported"));
			return;
		}
		currentTarget = { type: targetType, id: targetId, remoteId: opts && opts.remoteId != null ? opts.remoteId : null };
		currentCallback = onReported;
		selectedReason = null;
		noteEl.value = "";
		errEl.hidden = true;
		modal.querySelector("#reportPopTitle").textContent = t("report.title_" + targetType) || t("report.title");
		modal.querySelector("#reportPopHint").textContent = t("report.hint");
		modal.querySelector("#reportSubmit span").textContent = t("report.submit");
		renderReasons(targetType);
		refreshSubmitState();
		modal.classList.add("open");
		document.body.style.overflow = "hidden";
	};
})();

/* =====================================================================
   เพจร้านอาหาร (ระบบเก่า) — เดิมแยกจาก "ร้านของฉัน" ตอนนี้รวมเป็นเอนทิตีเดียวแล้ว
   (ดู migratePageIntoShop() ด้านล่าง) เหลือไว้แค่ getPages()/getPageById() เพราะยังใช้
   ตอนย้ายข้อมูลเก่า + โชว์ลิงก์เพจเก่าที่อาจมีคนแชร์ไว้ก่อนหน้านี้ (public-profile.html?u=page-<id>)
   ไม่มีทางสร้างเพจใหม่แบบนี้ได้อีกแล้ว (ฟอร์มสร้าง/แก้ไขเพจแยกถูกลบไปแล้ว ใช้ฟอร์ม "ร้านของฉัน" แทน)
   ===================================================================== */
var CHIMCHIM_PAGES_KEY = "chimchim_pages";
var CHIMCHIM_ACTIVE_PERSONA_KEY = "chimchim_active_persona";
function getPages() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_PAGES_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function savePages(list) {
	localStorage.setItem(CHIMCHIM_PAGES_KEY, JSON.stringify(list));
}
function getPageById(id) {
	return getPages().filter(function(p) { return p.id === id; })[0] || null;
}
// "โพสต์ในนามใคร" ตอนนี้ — "self" (ค่าเริ่มต้น) หรือ numId ของร้านตัวเอง (เดิมเป็น id ของเพจร้าน)
function getActivePersona() {
	return localStorage.getItem(CHIMCHIM_ACTIVE_PERSONA_KEY) || "self";
}
function setActivePersona(v) {
	localStorage.setItem(CHIMCHIM_ACTIVE_PERSONA_KEY, v);
}

/* --- รวม "เพจร้านอาหาร" (ระบบเก่า แยกจากร้าน) เข้ากับ "ร้านของฉัน" ให้เป็นอันเดียว
   เพจกับร้านเคยเป็นคนละระบบกัน (เพจ = โพสต์รูป, ร้าน = ราคา/หมวด/Match %) ตอนนี้รวมเป็นเอนทิตีเดียว
   เรียกครั้งเดียวตอนมี session อยู่ (ดูจุดเรียกท้ายไฟล์) ปลอดภัยเรียกซ้ำได้ ถ้าไม่มีเพจเก่าจะไม่ทำอะไรเลย --- */
function migratePageIntoShop() {
	var me = getMe();
	if (!me) return;
	var pages = getPages();
	var myPage = pages.filter(function(p) { return p.ownerId === me.id; })[0];
	if (!myPage) return;

	var shops = getShops();
	var myShop = shops.filter(function(s) { return s.vendorId === me.id; })[0];

	if (!myShop) {
		// ไม่เคยมีร้านมาก่อน -> ยกเพจเก่าขึ้นเป็นร้านใหม่เลย (ราคา/ระยะทางใส่ค่า default ไปก่อน เจ้าของแก้เพิ่มเองทีหลังได้)
		myShop = {
			numId: generateUniqueShopNumId(),
			vendorId: me.id,
			vendorName: me.name,
			name: myPage.name,
			dish: myPage.name,
			cat: myPage.cat,
			img: myPage.avatar,
			priceLow: 50,
			priceHigh: 150,
			distance: 500,
			uni: มหาวิทยาลัยทั้งหมด[0],
			desc: myPage.bio,
			hours: null,
			promo: null
		};
		shops.push(myShop);
	} else {
		if (!myShop.desc && myPage.bio) myShop.desc = myPage.bio;
		if (!myShop.img && myPage.avatar) myShop.img = myPage.avatar;
	}
	saveShops(shops);

	// ย้ายโพสต์ที่เคยผูกกับเพจเก่า มาผูกกับร้าน(ใหม่/เดิม)แทน
	var posts = getAllPosts();
	var postsChanged = false;
	posts.forEach(function(p) {
		if (p.pageId === myPage.id) {
			p.pageId = myShop.numId;
			postsChanged = true;
		}
	});
	if (postsChanged) localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));

	// ถ้ากำลังตั้งค่าโพสต์ในนามเพจเก่าอยู่ สลับมาชี้ร้านใหม่แทนให้อัตโนมัติ
	if (getActivePersona() === myPage.id) {
		setActivePersona(String(myShop.numId));
	}

	// ลบเพจเก่าออกจากลิสต์ กันซ้ำ/สับสน (ข้อมูลย้ายเข้าร้านหมดแล้ว)
	savePages(pages.filter(function(p) { return p.id !== myPage.id; }));
}

/* --- รันทันทีตอนโหลดไฟล์: เตรียมข้อมูลให้พร้อมก่อนหน้าเพจจะคำนวณ Match %
   (ต้อง migratePageIntoShop() ก่อน merge เสมอ เผื่อมันเพิ่งสร้าง/แก้ไขร้านจากเพจเก่า
   จะได้เห็นร้านนั้นในรายการร้านตั้งแต่รอบโหลดนี้เลย ไม่ต้องรีเฟรชซ้ำ) --- */
migratePageIntoShop();
var __chimchimCommunityShops = mergeCommunityShopsIntoรายการร้าน();
applyPersonalFoodDNA();
