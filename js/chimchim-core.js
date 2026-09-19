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
var CHIMCHIM_SHOPS_KEY = "chimchim_shops";
var CHIMCHIM_REVIEWS_KEY = "chimchim_reviews";
var CHIMCHIM_FOLLOWS_KEY = "chimchim_follows";
var CHIMCHIM_POSTS_KEY = "chimchim_posts";

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

// เรียนรู้พฤติกรรมจริงของผู้ใช้ในเบราว์เซอร์นี้ (กดถูกใจ / Follow / เขียนรีวิวให้คะแนนดี ๆ)
// แล้วสรุปออกมาเป็นแนวโน้มที่ชอบ 3 มิติ: ชาติอาหาร / รสชาติ / หมวดหมู่ ใช้แทนแบบทดสอบ Food DNA
// สำหรับคนที่ยังไม่ได้ทำแบบทดสอบ หรือใช้เสริมแบบทดสอบเดิมให้แม่นขึ้นเรื่อย ๆ ตามการใช้งานจริง
function inferDnaFromBehavior() {
	var likedIds = getLikedShops();
	var followedIds = getFollowedShops();
	var reviewedIds = [];
	var session = getSession();
	if (session) {
		getReviewsByUser(session.id).forEach(function(r) {
			// รีวิวที่ให้คะแนนเฉลี่ย 4/5 ขึ้นไป นับเป็นสัญญาณว่าชอบร้านนี้จริง ๆ (ต่ำกว่านั้นไม่เอามานับ กันทายผิดทาง)
			var avg = (r.taste + r.atmosphere + r.service) / 3;
			if (avg >= 4) reviewedIds.push(r.shopId);
		});
	}
	var ids = likedIds.concat(followedIds).concat(reviewedIds);
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
		vendorName: shop.vendorName,
		เวลาเปิดกำหนดเอง: shop.hours || null,
		โปรโมชั่นกำหนดเอง: shop.promo || null,
		community: true
	};
}

// คืนค่ารายการร้านชุมชน (เรียงใหม่สุดก่อน) พร้อมผสานเข้า รายการร้าน ให้เรียบร้อยแล้ว
function mergeCommunityShopsIntoรายการร้าน() {
	var shops = getShops();
	var i;
	for (i = shops.length - 1; i >= 0; i--) {
		if (!shops[i].numId) {
			shops[i].numId = 9000000 + i;
		}
		รายการร้าน.push(shopToร้าน(shops[i]));
	}
	return shops;
}

/* =====================================================================
   ข้อมูลเสริมของร้าน (เวลาเปิด-ปิด + โปรโมชั่น) — เพื่อให้หน้าโปรไฟล์ร้านและ
   ฟีดอัปเดตใน Following ดูมีชีวิตชีวา ใช้สูตรคงที่จาก id ร้าน (ไม่ต้องเก็บ state)
   จะได้ผลลัพธ์เดิมทุกครั้งไม่ว่าจะรีเฟรชกี่รอบ ใช้ได้ทั้งร้านตัวอย่างและร้านที่ชุมชนโพสต์
   ===================================================================== */
var เวลาเปิดตัวอย่าง = ["10:00 – 20:00 น.", "08:00 – 18:00 น.", "11:00 – 22:00 น.", "09:00 – 19:00 น.", "17:00 – 01:00 น."];
var โปรโมชั่นตัวอย่าง = [
	{ icon: "🎉", text: "ลด 10% เมื่อสั่งผ่านแอปชิมชิม" },
	{ icon: "🍜", text: "ซื้อ 1 แถม 1 ทุกวันจันทร์" },
	{ icon: "🔥", text: "เมนูใหม่ประจำสัปดาห์นี้ ลองเลย!" },
	{ icon: "🎁", text: "สะสมแต้มครบ 10 ครั้ง รับฟรี 1 เมนู" },
	{ icon: "📢", text: "เปิดสาขาใหม่ใกล้มหาลัยของคุณแล้ว!" }
];
function getShopExtra(id) {
	var h = Math.abs((id * 2654435761) % 2147483647);
	return {
		hours: เวลาเปิดตัวอย่าง[h % เวลาเปิดตัวอย่าง.length],
		promo: โปรโมชั่นตัวอย่าง[Math.floor(h / 7) % โปรโมชั่นตัวอย่าง.length]
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
	all[shopId].unshift(review);
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
				'<div class="profshopmeta">🎯 ' + avgScore + "/5 คะแนนเฉลี่ย</div>" +
			"</div>" +
		"</div>" +
		(r.text ? '<p class="profreviewtxt">' + escapeHtml(r.text) + "</p>" : "");
	item.querySelector(".profreviewrow").addEventListener("click", function() {
		window.location.href = "restaurant.html?id=" + ร้าน.id;
	});
	return item;
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
	if (idx === -1) {
		list.push(shopId);
	} else {
		list.splice(idx, 1);
	}
	localStorage.setItem(CHIMCHIM_FOLLOWS_KEY, JSON.stringify(list));
	return idx === -1;
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
	if (idx === -1) list.push(shopId); else list.splice(idx, 1);
	localStorage.setItem(CHIMCHIM_LIKES_KEY, JSON.stringify(list));
	return idx === -1;
}
// ยอดไลก์เริ่มต้นของร้าน คำนวณแบบ deterministic จาก id (ทุกคนเห็นตัวเลขฐานเดียวกัน ไม่ต้องเก็บ state ส่วนกลาง)
function seedLikeCount(shopId) {
	var h = Math.abs((shopId * 40503) % 9973);
	return 20 + (h % 280);
}
function getLikeCount(shopId) {
	return seedLikeCount(shopId) + (isShopLiked(shopId) ? 1 : 0);
}
function formatLikeCount(n) {
	if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
	return String(n);
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
	if (idx === -1) list.push(postId); else list.splice(idx, 1);
	localStorage.setItem(CHIMCHIM_POST_LIKES_KEY, JSON.stringify(list));
	return idx === -1;
}
// ยอดไลก์เริ่มต้นของโพสต์ คำนวณแบบ deterministic จาก id (string) เหมือนร้าน กันต้องเก็บ state กลาง
function seedPostLikeCount(postId) {
	var h = 0, i;
	for (i = 0; i < postId.length; i++) h = (h * 31 + postId.charCodeAt(i)) >>> 0;
	return 5 + (h % 120);
}
function getPostLikeCount(postId) {
	return seedPostLikeCount(postId) + (isPostLiked(postId) ? 1 : 0);
}

// การ์ดร้านแบบย่อ (รูป + Match% + ชื่อร้าน/เมนู + ระยะทาง) ใช้ร่วมกันได้ทุกหน้าที่อยากโชว์ร้านแนะนำ
// เช่น แถวเทรนด์/มื้อนี้/แนะนำบนหน้าแรก และร้านที่คล้ายกันในหน้าวงล้อสุ่มเมนู
function buildMiniCard(ร้าน, onClick) {
	var คะแนน = คำนวณMatch(ร้าน, foodDNA);
	var card = document.createElement("div");
	card.className = "mcard";
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
	if (idx === -1) list.push(userId); else list.splice(idx, 1);
	localStorage.setItem(CHIMCHIM_FOLLOWED_USERS_KEY, JSON.stringify(list));
	return idx === -1;
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
	posts.unshift({ id: "post" + Date.now(), userId: userId, pageId: pageId || null, images: imgList, img: imgList[0], caption: caption, date: new Date().toISOString() });
	localStorage.setItem(CHIMCHIM_POSTS_KEY, JSON.stringify(posts));
}
// คืนอาร์เรย์รูปของโพสต์เสมอ ไม่ว่าโพสต์นั้นจะเป็นโพสต์เก่า (มีแค่ img เดียว) หรือใหม่ (มี images หลายรูป)
function getPostImages(p) {
	if (p.images && p.images.length) return p.images;
	return p.img ? [p.img] : [];
}
function deletePost(postId) {
	var posts = getAllPosts().filter(function(p) { return p.id !== postId; });
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
}

/* =====================================================================
   ฟีดชุมชนรวม (หน้าแรก) — รวมโพสต์จริงของผู้ใช้/เพจร้าน + โพสต์ของ 11 ร้านจริงใกล้ ม.กรุงเทพ (เพจร้านBU)
   คืนค่าเป็นรูปแบบเดียวกันหมด เรียงใหม่สุดก่อนเสมอ ไม่ว่าจะเป็นโพสต์จริงหรือของร้าน BU
   ===================================================================== */
function getFeedItems() {
	var users = getUsers();
	var pages = getPages();
	var fromReal = getAllPosts().map(function(p) {
		var page = p.pageId ? pages.filter(function(pg) { return pg.id === p.pageId; })[0] : null;
		var user = users.filter(function(u) { return u.id === p.userId; })[0];
		var posterName = page ? page.name : (user ? user.name : "นักชิมชิมชิม");
		return {
			id: p.id,
			kind: page ? "page" : "user",
			images: getPostImages(p),
			caption: p.caption || "",
			date: p.date,
			posterName: posterName,
			posterAvatarUrl: page ? page.avatar : null,
			posterColor: page ? "var(--cream2)" : "linear-gradient(135deg, var(--dark), #7d6fb0)",
			posterLink: page ? ("public-profile.html?u=page-" + page.id) : ("public-profile.html?u=" + p.userId),
			cat: page ? page.cat : null
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
}

/* =====================================================================
   เพจร้านอาหาร (เหมือนเพจ Facebook) — ผู้ใช้คนไหนก็สร้างได้จากหน้า Settings
   โดยไม่ต้องสมัครบัญชีร้านค้าแยก แล้วสลับ "โพสต์ในนาม" ตัวเอง/เพจได้ตลอด
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
function getMyPage() {
	var me = getMe();
	if (!me) return null;
	return getPages().filter(function(p) { return p.ownerId === me.id; })[0] || null;
}
function getPageById(id) {
	return getPages().filter(function(p) { return p.id === id; })[0] || null;
}
function createOrUpdateMyPage(data) {
	var me = getMe();
	if (!me) return null;
	var pages = getPages();
	var existing = pages.filter(function(p) { return p.ownerId === me.id; })[0];
	if (existing) {
		existing.name = data.name;
		existing.avatar = data.avatar;
		existing.cat = data.cat;
		existing.bio = data.bio;
	} else {
		existing = { id: "page" + Date.now(), ownerId: me.id, name: data.name, avatar: data.avatar, cat: data.cat, bio: data.bio };
		pages.push(existing);
	}
	savePages(pages);
	return existing;
}
// "โพสต์ในนามใคร" ตอนนี้ — "self" (ค่าเริ่มต้น) หรือ id ของเพจร้านที่ตัวเองเป็นเจ้าของ
function getActivePersona() {
	return localStorage.getItem(CHIMCHIM_ACTIVE_PERSONA_KEY) || "self";
}
function setActivePersona(v) {
	localStorage.setItem(CHIMCHIM_ACTIVE_PERSONA_KEY, v);
}

/* --- รันทันทีตอนโหลดไฟล์: เตรียมข้อมูลให้พร้อมก่อนหน้าเพจจะคำนวณ Match % --- */
var __chimchimCommunityShops = mergeCommunityShopsIntoรายการร้าน();
applyPersonalFoodDNA();
