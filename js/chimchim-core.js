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

// ผูกกล่องอัปโหลดรูปเอง (input type=file) เข้ากับ hidden input ที่เก็บค่าจริง (data URL) + รูปพรีวิว
// ใช้ร่วมกันได้ทุกฟอร์มที่ให้ผู้ใช้อัปโหลดรูปเอง (รูปเพจร้าน, รูปเมนูเด่นตอนโพสต์ร้าน) แทนดรอปดาวน์เลือกรูปสต็อกเดิม
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
			showPreview(e.target.result);
		};
		reader.readAsDataURL(file);
	});
}

// เหมือน wireImageUpload แต่รองรับเลือกได้หลายรูปพร้อมกัน (หรือกดเพิ่มทีละรอบหลายครั้งก็ได้) — ใช้กับฟอร์มโพสต์ที่แนบได้หลายรูป
// onFilesAdded(dataUrls) จะถูกเรียกพร้อมอาร์เรย์ data URL ของรูปที่เพิ่งเลือกทั้งหมด
function wireMultiImageUpload(fileInputId, onFilesAdded) {
	var fileInput = document.getElementById(fileInputId);
	if (!fileInput) return;
	fileInput.addEventListener("change", function() {
		var files = Array.prototype.slice.call(fileInput.files || []);
		if (!files.length) return;
		var readers = files.map(function(file) {
			return new Promise(function(resolve) {
				var reader = new FileReader();
				reader.onload = function(e) { resolve(e.target.result); };
				reader.readAsDataURL(file);
			});
		});
		Promise.all(readers).then(function(dataUrls) {
			onFilesAdded(dataUrls);
			fileInput.value = ""; // เคลียร์ค่าเดิม เผื่อผู้ใช้อยากเลือกรูปเดิมซ้ำได้อีกรอบ
		});
	});
}

var CHIMCHIM_CAT_EMOJI = {
	"ข้าว": "🍚", "เส้น": "🍜", "ซุป": "🥣", "Fast Food": "🍔", "ญี่ปุ่น": "🍣", "ของหวาน": "🍰", "เผ็ด": "🌶️",
	"อาหารเจ": "🥬", "อาหารฮาลาล": "🕌", "มังสวิรัติ": "🥗", "วีแกน": "🌱", "อาหารตามสั่ง": "🍳",
	"ส้มตำ": "🥭", "ยำ": "🌶️", "หม่าล่า": "🍲", "ของทอด": "🍤", "ผลไม้": "🍉", "ของหวาน/เบเกอรี่": "🍰",
	"ปิ้งย่าง": "🍖", "อาหารญี่ปุ่น": "🍣", "อาหารจีน": "🥟", "อาหารเกาหลี": "🍚", "เครื่องดื่ม": "🥤",
	"สเต็ก": "🥩", "เบอร์เกอร์": "🍔", "เมนูเส้น": "🍜", "ก๋วยเตี๋ยว": "🍲", "อาหารอินเดีย": "🍛",
	"อาหารเวียดนาม": "🍜", "พิซซ่า": "🍕", "อาหารใต้": "🌶️", "อีสาน": "🍢", "เหนือ": "🍛", "กลาง": "🍚",
	"อาหารป่า": "🦌", "ข้าวแกง": "🍛"
};
function catEmoji(cat) {
	return CHIMCHIM_CAT_EMOJI[cat] || "🍽️";
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
function saveUsers(list) {
	localStorage.setItem(CHIMCHIM_USERS_KEY, JSON.stringify(list));
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
function updateMe(patch) {
	var session = getSession();
	if (!session) return;
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
	saveUsers(users);
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
	localStorage.setItem(CHIMCHIM_SHOPS_KEY, JSON.stringify(list));
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
			promo: data.promo
		};
		shops.push(existing);
		logEvent("shop_posted", { shopId: existing.numId });
	}
	saveShops(shops);
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
		ระยะทาง: shop.distance,
		รูป: shop.img,
		บัคเก็ต: ["foryou", "new"],
		แท็ก: [shop.cat, "ชุมชนโพสต์"],
		มหาลัย: shop.uni || มหาวิทยาลัยทั้งหมด[0],
		เทรนด์: false,
		มื้อที่เหมาะ: ["เช้า", "เที่ยง", "บ่าย", "เย็น", "ดึก"],
		vendorId: shop.vendorId,
		vendorName: shop.vendorName,
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
   ข้อมูลเสริมของร้าน (เวลาเปิด-ปิด + โปรโมชั่น) — เพื่อให้หน้าโปรไฟล์ร้านและ
   ฟีดอัปเดตใน Following ดูมีชีวิตชีวา ใช้สูตรคงที่จาก id ร้าน (ไม่ต้องเก็บ state)
   จะได้ผลลัพธ์เดิมทุกครั้งไม่ว่าจะรีเฟรชกี่รอบ ใช้ได้ทั้งร้านตัวอย่างและร้านที่ชุมชนโพสต์
   ===================================================================== */
var เวลาเปิดตัวอย่าง = {
	th: ["10:00 – 20:00 น.", "08:00 – 18:00 น.", "11:00 – 22:00 น.", "09:00 – 19:00 น.", "17:00 – 01:00 น."],
	en: ["10:00 AM – 8:00 PM", "8:00 AM – 6:00 PM", "11:00 AM – 10:00 PM", "9:00 AM – 7:00 PM", "5:00 PM – 1:00 AM"]
};
var โปรโมชั่นตัวอย่าง = {
	th: [
		{ icon: "🎉", text: "ลด 10% เมื่อสั่งผ่านแอป ChimChim" },
		{ icon: "🍜", text: "ซื้อ 1 แถม 1 ทุกวันจันทร์" },
		{ icon: "🔥", text: "เมนูใหม่ประจำสัปดาห์นี้ ลองเลย!" },
		{ icon: "🎁", text: "สะสมแต้มครบ 10 ครั้ง รับฟรี 1 เมนู" },
		{ icon: "📢", text: "เปิดสาขาใหม่ใกล้มหาลัยของคุณแล้ว!" }
	],
	en: [
		{ icon: "🎉", text: "10% off when you order through the ChimChim app" },
		{ icon: "🍜", text: "Buy 1 get 1 free every Monday" },
		{ icon: "🔥", text: "New menu item this week — try it!" },
		{ icon: "🎁", text: "Collect 10 stamps, get 1 free item" },
		{ icon: "📢", text: "New branch just opened near your university!" }
	]
};
function getShopExtra(id) {
	var h = Math.abs((id * 2654435761) % 2147483647);
	var lang = getLang();
	var เวลา = เวลาเปิดตัวอย่าง[lang] || เวลาเปิดตัวอย่าง.en;
	var โปรโมชั่น = โปรโมชั่นตัวอย่าง[lang] || โปรโมชั่นตัวอย่าง.en;
	return {
		hours: เวลา[h % เวลา.length],
		promo: โปรโมชั่น[Math.floor(h / 7) % โปรโมชั่น.length]
	};
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
function addReview(shopId, review) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	if (!all[shopId]) all[shopId] = [];
	// localId ใช้แค่ชั่วคราวเพื่อหารีวิวนี้เจอตอน push ขึ้น Supabase เสร็จแล้วมาแปะ remoteId จริงให้ (ดูด้านล่าง)
	var localId = "rev" + Date.now() + Math.random().toString(36).slice(2, 6);
	review.localId = localId;
	all[shopId].unshift(review);
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
	logEvent("review_submitted", { shopId: shopId });
	if (typeof sbSubmitReview === "function") {
		sbSubmitReview(shopId, review).then(function(saved) {
			if (saved && saved.remoteId) tagReviewRemoteId(shopId, localId, saved.remoteId);
		});
	}
}
function tagReviewRemoteId(shopId, localId, remoteId) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		return;
	}
	var list = all[shopId] || [];
	var i;
	for (i = 0; i < list.length; i++) {
		if (list[i].localId === localId) { list[i].remoteId = remoteId; break; }
	}
	all[shopId] = list;
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
}
// แก้ไข/ลบรีวิวของตัวเอง — ใช้ได้เฉพาะรีวิวที่ sync ขึ้น Supabase แล้วเท่านั้น (มี remoteId จริง)
function updateReview(shopId, remoteId, patch) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	var list = all[shopId] || [];
	var i;
	for (i = 0; i < list.length; i++) {
		if (String(list[i].remoteId) === String(remoteId)) {
			if (typeof patch.taste === "number") list[i].taste = patch.taste;
			if (typeof patch.atmosphere === "number") list[i].atmosphere = patch.atmosphere;
			if (typeof patch.service === "number") list[i].service = patch.service;
			if (typeof patch.text === "string") list[i].text = patch.text;
			break;
		}
	}
	all[shopId] = list;
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
	if (typeof sbUpdateReview === "function") sbUpdateReview(remoteId, patch);
}
function deleteReview(shopId, remoteId) {
	var all;
	try {
		all = JSON.parse(localStorage.getItem(CHIMCHIM_REVIEWS_KEY)) || {};
	} catch (e) {
		all = {};
	}
	all[shopId] = (all[shopId] || []).filter(function(r) { return String(r.remoteId) !== String(remoteId); });
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
	if (typeof sbDeleteReview === "function") sbDeleteReview(remoteId);
}
function getReviewByRemoteId(shopId, remoteId) {
	return getReviews(shopId).filter(function(r) { return String(r.remoteId) === String(remoteId); })[0] || null;
}
// ผสานรีวิวจริงจาก Supabase (ของทุกคน ไม่ใช่แค่เครื่องนี้) เข้ากับรีวิวในเครื่องนี้ — กันซ้ำด้วย
// คีย์ ผู้เขียน+เวลา+ข้อความ เดียวกัน (รีวิวจริงแทบเป็นไปไม่ได้ที่จะชนกันพอดีทั้ง 3 อย่าง)
function ขีดรีวิว(r) { return (r.author || "") + "|" + (r.date || "") + "|" + (r.text || ""); }
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
		if (!existingKeys[k]) {
			local.push(r);
			existingKeys[k] = true;
		}
	});
	local.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
	all[shopId] = local;
	localStorage.setItem(CHIMCHIM_REVIEWS_KEY, JSON.stringify(all));
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
		'<img src="' + ร้าน.รูป + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
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
			'<img src="' + ร้าน.รูป + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
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
function getLikeCount(shopId) {
	return CHIMCHIM_REAL_SHOP_LIKE_COUNTS.hasOwnProperty(shopId) ? CHIMCHIM_REAL_SHOP_LIKE_COUNTS[shopId] : 0;
}
function formatLikeCount(n) {
	if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
	return String(n);
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
				var count = counts[id] || 0;
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
	return CHIMCHIM_REAL_POST_LIKE_COUNTS.hasOwnProperty(postId) ? CHIMCHIM_REAL_POST_LIKE_COUNTS[postId] : 0;
}
var __pendingPostLikeIds = [];
var __pendingPostLikeEls = {};
var __postLikeFlushScheduled = false;
function queuePostLikeCountFetch(postId, countEl) {
	if (!__pendingPostLikeEls[postId]) __pendingPostLikeEls[postId] = [];
	__pendingPostLikeEls[postId].push(countEl);
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
				var count = counts[id] || 0;
				CHIMCHIM_REAL_POST_LIKE_COUNTS[id] = count;
				(elsMap[id] || []).forEach(function(el) { el.textContent = formatLikeCount(count); });
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
function queueCommentCountFetch(postId, countEl) {
	if (!__pendingCommentCountEls[postId]) __pendingCommentCountEls[postId] = [];
	__pendingCommentCountEls[postId].push(countEl);
	if (__pendingCommentCountIds.indexOf(postId) === -1) __pendingCommentCountIds.push(postId);
	if (__commentCountFlushScheduled) return;
	__commentCountFlushScheduled = true;
	setTimeout(function() {
		var ids = __pendingCommentCountIds.slice();
		var elsMap = __pendingCommentCountEls;
		__pendingCommentCountIds = [];
		__pendingCommentCountEls = {};
		__commentCountFlushScheduled = false;
		if (typeof sbFetchCommentCounts !== "function") return;
		sbFetchCommentCounts(ids).then(function(counts) {
			ids.forEach(function(id) {
				if (!counts.hasOwnProperty(id)) return;
				CHIMCHIM_REAL_COMMENT_COUNTS[id] = counts[id];
				(elsMap[id] || []).forEach(function(el) { el.textContent = counts[id]; });
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
			'<img src="' + ร้าน.รูป + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
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
function getFollowedUsers() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_FOLLOWED_USERS_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function toggleFollowUser(userId) {
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
function addPost(userId, images, caption, pageId) {
	var imgList = Array.isArray(images) ? images.filter(Boolean) : [images];
	var posts = getAllPosts();
	var localId = "post" + Date.now();
	posts.unshift({ id: localId, userId: userId, pageId: pageId || null, images: imgList, img: imgList[0], caption: caption, date: new Date().toISOString() });
	localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
	logEvent("post_created", { pageId: pageId || null });
	// ผลักโพสต์ขึ้น Supabase จริงทันที ให้คนอื่นเห็นในฟีดข้ามเครื่องได้เลย ไม่ต้องรอ sync รอบถัดไป
	// (ถ้า pageId เป็นร้านที่ยังไม่เคย sync id จริง ครั้งนี้อาจ push ไม่สำเร็จ — syncPostsWithSupabase()
	// จะ retry ให้เองตอนเข้าแอปครั้งถัดไป เพราะโพสต์นี้ยังไม่มี remoteId)
	if (typeof sbSavePost === "function") {
		sbSavePost({ userId: userId, pageId: pageId || null, images: imgList, caption: caption }).then(function(saved) {
			if (saved) reconcilePostId(localId, String(saved.id));
		});
	}
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
function updatePost(postId, patch) {
	var posts = getAllPosts();
	var i, target = null;
	for (i = 0; i < posts.length; i++) {
		if (posts[i].id === postId) {
			if (patch.images) {
				posts[i].images = patch.images;
				posts[i].img = patch.images[0];
			}
			if (typeof patch.caption === "string") posts[i].caption = patch.caption;
			target = posts[i];
			break;
		}
	}
	localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
	if (target && target.remoteId && typeof sbSavePost === "function") sbSavePost(target);
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
			posterColor: shop ? "var(--cream2)" : "linear-gradient(135deg, var(--dark), #7d6fb0)",
			posterLink: shop ? ("restaurant.html?id=" + shop.numId) : ("public-profile.html?u=" + p.userId),
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
				posterColor: "linear-gradient(135deg, var(--primary), var(--secondary))",
				posterLink: "public-profile.html?u=bu-" + shop.id,
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
	all[postId].push({ id: "cmt" + Date.now(), author: author, text: text, date: new Date().toISOString() });
	localStorage.setItem(CHIMCHIM_COMMENTS_KEY, JSON.stringify(all));
	// คอมเมนต์ได้จริงข้ามเครื่องเฉพาะโพสต์ที่ sync ขึ้น Supabase แล้ว (id เป็นตัวเลขจริง ไม่ใช่ "post"+timestamp ชั่วคราว)
	if (typeof sbAddComment === "function") sbAddComment(postId, author, text);
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
	all[postId] = comments;
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
function reportContent(targetType, targetId, reason) {
	var session = getSession();
	var reports = getReports();
	reports.push({
		targetType: targetType,
		targetId: String(targetId),
		reporterId: session ? session.id : null,
		reason: reason,
		date: new Date().toISOString()
	});
	saveReports(reports);
	if (typeof logEvent === "function") logEvent("content_reported", { targetType: targetType, reason: reason });
	// ผลักรายงานขึ้น Supabase จริง — ต้องมีรายงานจริงสะสมถึงเกณฑ์ (3 รายงาน) ข้ามผู้ใช้/เครื่องถึงจะซ่อนเนื้อหาได้จริง
	// (ไม่งั้นนับแค่รายงานในเครื่องนี้เครื่องเดียว ซึ่งแทบไม่มีทางถึงเกณฑ์จริง) ตาราง moderation_reports อ่านกลับไม่ได้
	// (insert-only ตาม RLS) แต่ trigger check_report_threshold() ฝั่ง Supabase จะเซ็ต is_hidden ให้เองอัตโนมัติ
	// แล้ว sbFetchCommunityShops/sbFetchAllPosts ที่กรอง is_hidden=false อยู่แล้วจะไม่ดึงเนื้อหานั้นมาอีกทุกเครื่อง
	if (typeof sbReportContent === "function") sbReportContent(targetType, targetId, reason);
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

/* --- ป็อปอัพเลือกเหตุผลรายงาน ใช้ร่วมกันได้ทุกหน้า (สร้าง DOM เองเหมือน postViewModal) ---
   เรียกใช้ผ่าน window.openReportPopup(targetType, targetId, onReported) --- */
(function setupReportPopup() {
	var modal = document.createElement("div");
	modal.id = "reportPopModal";
	var reasons = [
		["spam", "report.reasonSpam"],
		["inappropriate", "report.reasonInappropriate"],
		["fake", "report.reasonFake"],
		["other", "report.reasonOther"]
	];
	modal.innerHTML =
		'<div class="apbox" style="max-width:340px;padding:26px 24px 22px;">' +
			'<button class="apclose" id="reportPopClose"><i class="fas fa-times"></i></button>' +
			'<h4 class="sptitle2">' + t("report.title") + '</h4>' +
			'<p class="rowsub" style="margin:2px 0 14px;">' + t("report.hint") + '</p>' +
			'<div class="reportreasonlist">' +
				reasons.map(function(r) {
					return '<button type="button" class="rdghost" style="width:100%;margin-bottom:8px;" data-reason="' + r[0] + '">' + t(r[1]) + '</button>';
				}).join("") +
			'</div>' +
		'</div>';
	document.body.appendChild(modal);

	var currentTarget = null;
	var currentCallback = null;

	function closeReportPopup() {
		modal.classList.remove("open");
		document.body.style.overflow = "";
	}
	document.getElementById("reportPopClose").addEventListener("click", closeReportPopup);
	modal.addEventListener("click", function(e) {
		if (e.target === modal) closeReportPopup();
	});
	modal.querySelectorAll("[data-reason]").forEach(function(btn) {
		btn.addEventListener("click", function() {
			if (!currentTarget) return;
			reportContent(currentTarget.type, currentTarget.id, this.getAttribute("data-reason"));
			closeReportPopup();
			if (typeof showToast === "function") showToast(t("report.thanks"));
			if (currentCallback) currentCallback();
			currentTarget = null;
			currentCallback = null;
		});
	});

	window.openReportPopup = function(targetType, targetId, onReported) {
		if (hasUserReported(targetType, targetId)) {
			if (typeof showToast === "function") showToast(t("report.alreadyReported"));
			return;
		}
		currentTarget = { type: targetType, id: targetId };
		currentCallback = onReported;
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
