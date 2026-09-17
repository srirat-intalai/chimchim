// chimchim-i18n.js
// ระบบภาษา (EN default / TH) + โหมด Light/Dark — โหลดเป็นสคริปต์แรกสุดในทุกหน้า
// (ก่อน chimchim-data.js) เพื่อให้ตั้งค่า data-theme บน <html> ได้ก่อนหน้าจะ paint
// เก็บค่าที่ผู้ใช้เลือกไว้ใน localStorage คีย์เดียว: chimchim_prefs

var CHIMCHIM_PREFS_KEY = "chimchim_prefs";

function getPrefs() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_PREFS_KEY)) || {};
	} catch (e) {
		return {};
	}
}
function savePrefs(patch) {
	var p = getPrefs();
	var key;
	for (key in patch) {
		if (Object.prototype.hasOwnProperty.call(patch, key)) p[key] = patch[key];
	}
	localStorage.setItem(CHIMCHIM_PREFS_KEY, JSON.stringify(p));
}
// ภาษาเริ่มต้นของแอปคือ English ตามที่กำหนดไว้ ผู้ใช้เปลี่ยนเป็นไทยได้ในหน้า Settings
function getLang() {
	return getPrefs().lang === "th" ? "th" : "en";
}
function setLang(lang) {
	savePrefs({ lang: lang === "th" ? "th" : "en" });
	applyI18n();
}
function getTheme() {
	return getPrefs().theme === "dark" ? "dark" : "light";
}
function setTheme(theme) {
	savePrefs({ theme: theme === "dark" ? "dark" : "light" });
	applyThemeAttr();
}
function applyThemeAttr() {
	document.documentElement.setAttribute("data-theme", getTheme());
}
applyThemeAttr();
document.documentElement.setAttribute("lang", getLang());

/* =====================================================================
   พจนานุกรมคำแปล — ครอบคลุมส่วนหลักของแอป (nav, top bar, auth, ปุ่ม/หัวข้อทั่วไป)
   ===================================================================== */
var CHIMCHIM_DICT = {
	en: {
		"nav.trending": "Trending",
		"nav.ai": "AI",
		"nav.following": "Following",
		"nav.profile": "Profile",
		"ai.greetingTitle": "Hey there 👋",
		"ai.greetingSub": "Chat with chimchim about anything — not just food",
		"ai.inputPlaceholder": "Type anything, e.g. something spicy under 150 baht",
		"ai.startBubble": "Hungry? Tell chimchim what you're craving — or just chat about anything else 🦖",
		"ai.genericFallback1": "Haha fair point! Anyway — what are you in the mood to eat today? 😋",
		"ai.genericFallback2": "Good one! While we're at it, got any cravings right now? Chimchim's always up for food talk 🦖",
		"ai.genericFallback3": "Totally hear you! Let's circle back to that later — for now, what sounds good to eat? 🍜",
		"ai.genericFallback4": "Haha okay noted! Speaking of which... hungry yet? Tell me what you're craving 😄",
		"auth.login": "Log In",
		"auth.register": "Sign Up",
		"auth.email": "Email",
		"auth.password": "Password",
		"auth.whoAreYou": "Who are you?",
		"auth.regularUser": "Regular User",
		"auth.regularUserDesc": "Discover and follow restaurants",
		"auth.vendor": "Restaurant / Vendor",
		"auth.vendorDesc": "Post your shop to the community",
		"auth.yourName": "Your name",
		"auth.createAccount": "Create Account",
		"auth.haveAccount": "Already have an account?",
		"auth.loginLink": "Log in",
		"auth.noAccount": "Don't have an account?",
		"auth.registerLink": "Sign up now",
		"auth.disclaimer": "Demo account system — your data is stored in this browser only.",
		"shop.postMyShop": "Post My Shop",
		"shop.formHint": "Fill in your shop's details and it'll show up in the Discovery Feed right away.",
		"shop.shopName": "Shop name",
		"shop.category": "Food category",
		"shop.featuredImage": "Featured photo",
		"shop.uploadPhoto": "Tap to upload a photo",
		"shop.featuredDish": "Featured dish",
		"shop.priceLow": "Price low (฿)",
		"shop.priceHigh": "Price high (฿)",
		"shop.distance": "Distance (m)",
		"shop.nearUni": "Near which university",
		"shop.shortDesc": "Short pitch",
		"shop.hours": "Opening hours",
		"shop.promo": "Special promotion (optional)",
		"shop.submit": "Post to Community",
		"shop.editMyShop": "Edit My Shop",
		"shop.saveChanges": "Save Changes",
		"profile.editShop": "Edit",
		"home.searchPlaceholder": "Search restaurants, dishes, people, places...",
		"home.sellpoint": "Every Match % is calculated from your real Food DNA — not a guess 🦖",
		"home.feedTitle": "📸 Community Feed",
		"home.feedSub": "Posts from shops and foodies you follow, freshest first",
		"home.feedEmpty": "No posts yet — be the first to post!",
		"feed.justNow": "just now",
		"feed.minsAgo": "m ago",
		"feed.hoursAgo": "h ago",
		"feed.daysAgo": "d ago",
		"home.recommendedTitle": "🎯 Recommended For You",
		"home.recommendedSub": "Only showing 70%+ Match, ranked highest first",
		"home.matchHeroSub": "Matches your taste perfectly",
		"home.fromYou": "from your location",
		"home.allShops": "📋 All Shops",
		"home.forYou": "For You",
		"home.nearYou": "Near You",
		"home.hiddenGems": "Hidden Gems",
		"home.popular": "Popular",
		"home.new": "New",
		"search.food": "Food",
		"search.restaurants": "Restaurants",
		"search.people": "People",
		"search.locations": "Locations",
		"search.noResults": "No results found",
		"following.topReviewers": "Shops Near BU",
		"following.people": "People",
		"following.restaurants": "Restaurants",
		"following.updates": "Updates",
		"following.emptyFollowed": "Not following any restaurant yet — hit Follow on a restaurant's page.",
		"following.emptyUpdates": "No updates yet from the restaurants you follow.",
		"following.allPeople": "All",
		"following.onlyFollowing": "Following",
		"following.emptyFollowedPeople": "Not following anyone yet — hit Follow on someone's profile.",
		"profile.notLoggedIn": "You're not logged in",
		"profile.notLoggedInDesc": "Sign up or log in to see your Food DNA profile, followed shops, or manage your restaurant.",
		"profile.signup": "Sign Up",
		"profile.foodDna": "Your Food DNA",
		"profile.noDnaDesc": "You haven't taken the Food DNA quiz yet. Take the short quiz so chimchim can recommend food that truly fits you.",
		"profile.takeTest": "Take the Food DNA Quiz",
		"profile.retakeTest": "Retake the Quiz",
		"profile.xpHint": "Follow shops, like dishes, write reviews, and post to earn more XP.",
		"profile.followedShops": "Restaurants You Follow",
		"profile.following": "Who & What You Follow",
		"profile.viewAll": "View all followed restaurants",
		"profile.viewAllPeople": "View all followed people",
		"profile.likeHistory": "Like History",
		"profile.likeHistoryEmpty": "You haven't liked any dish yet.",
		"profile.reviewHistory": "Review History",
		"profile.reviewHistoryEmpty": "You haven't written any review yet.",
		"profile.myShops": "My Shops",
		"profile.postNewShop": "Post a New Shop",
		"profile.myPage": "My Restaurant Page",
		"profile.noPageDesc": "You don't have a restaurant page yet. Create one to post as your business, separate from your personal profile.",
		"profile.createPage": "Create My Page",
		"profile.viewPage": "View Page",
		"profile.managePage": "Manage",
		"profile.myPosts": "My Posts",
		"profile.addPost": "Add New Post",
		"profile.pickPhotos": "Pick photos (add multiple, just like IG)",
		"profile.captionLbl": "Caption",
		"profile.postBtn": "Post",
		"profile.settings": "Settings",
		"profile.logout": "Log Out",
		"settings.title": "Settings",
		"settings.appearance": "Appearance",
		"settings.light": "Light",
		"settings.dark": "Dark",
		"settings.language": "Language",
		"settings.english": "English",
		"settings.thai": "ไทย (Thai)",
		"settings.myPage": "My Restaurant Page",
		"settings.pageLoginHint": "Log in to create a page for your restaurant.",
		"settings.pageName": "Page name",
		"settings.pageAvatar": "Page photo",
		"settings.pageSave": "Save Page",
		"settings.pageView": "View my page",
		"settings.postingAs": "Posting As",
		"settings.myself": "Myself",
		"settings.postingAsHint": "New posts you add from your profile will be posted as whichever you pick here.",
		"settings.postingAsPrefix": "Posting as",
		"restaurant.overview": "Overview",
		"restaurant.reviews": "Reviews",
		"restaurant.navigate": "Directions",
		"restaurant.writeReview": "Write a Review",
		"restaurant.viewFull": "View Full Details",
		"restaurant.follow": "Follow",
		"restaurant.following": "Following",
		"restaurant.hours": "Opening Hours",
		"restaurant.promotions": "Promotions & Offers"
	},
	th: {
		"nav.trending": "เทรนด์",
		"nav.ai": "AI",
		"nav.following": "ติดตาม",
		"nav.profile": "โปรไฟล์",
		"ai.greetingTitle": "สวัสดี 👋",
		"ai.greetingSub": "คุยกับชิมชิมได้เลย ถามอะไรก็ได้ ไม่ใช่แค่เรื่องกิน",
		"ai.inputPlaceholder": "พิมพ์อะไรก็ได้ เช่น อยากกินเผ็ด ๆ งบไม่เกิน 150 บาท",
		"ai.startBubble": "อยากกินอะไรวันนี้ บอกชิมชิมได้เลย หรือจะคุยเรื่องอื่นก็ได้นะ 🦖",
		"ai.genericFallback1": "ฮ่า ๆ เอาจริงดิ! ว่าแต่วันนี้อยากกินอะไรดีอ่ะ 😋",
		"ai.genericFallback2": "เออว่ะ จริงด้วย! ระหว่างนี้บอกชิมชิมหน่อยสิ ตอนนี้หิวรึยัง อยากกินแนวไหน 🦖",
		"ai.genericFallback3": "เห็นด้วยเลย! เดี๋ยวค่อยคุยเรื่องนั้นต่อ ตอนนี้ขอถามหน่อย มื้อนี้อยากกินอะไรอยู่ 🍜",
		"ai.genericFallback4": "โอ้ เข้าใจละ! ว่าแต่...หิวยัง บอกชิมชิมมาสิว่าอยากกินอะไร 😄",
		"auth.login": "เข้าสู่ระบบ",
		"auth.register": "สมัครสมาชิก",
		"auth.email": "อีเมล",
		"auth.password": "รหัสผ่าน",
		"auth.whoAreYou": "คุณเป็นใคร?",
		"auth.regularUser": "ผู้ใช้ทั่วไป",
		"auth.regularUserDesc": "ค้นหาและติดตามร้านอาหาร",
		"auth.vendor": "ร้านค้า / พ่อค้าแม่ค้า",
		"auth.vendorDesc": "โพสต์ร้านของคุณเข้าชุมชน",
		"auth.yourName": "ชื่อของคุณ",
		"auth.createAccount": "สร้างบัญชี",
		"auth.haveAccount": "มีบัญชีอยู่แล้ว?",
		"auth.loginLink": "เข้าสู่ระบบ",
		"auth.noAccount": "ยังไม่มีบัญชี?",
		"auth.registerLink": "สมัครสมาชิกเลย",
		"auth.disclaimer": "ระบบสมาชิกเวอร์ชันทดลอง ข้อมูลเก็บไว้ในเบราว์เซอร์นี้เท่านั้น",
		"shop.postMyShop": "โพสต์ร้านของฉัน",
		"shop.formHint": "กรอกรายละเอียดร้าน แล้วร้านของคุณจะไปโผล่ใน Discovery Feed ทันที",
		"shop.shopName": "ชื่อร้าน",
		"shop.category": "หมวดอาหาร",
		"shop.featuredImage": "รูปเมนูเด่น",
		"shop.uploadPhoto": "แตะเพื่ออัปโหลดรูป",
		"shop.featuredDish": "เมนูเด่น",
		"shop.priceLow": "ราคาต่ำ (฿)",
		"shop.priceHigh": "ราคาสูง (฿)",
		"shop.distance": "ระยะทาง (ม.)",
		"shop.nearUni": "ใกล้มหาวิทยาลัยไหน",
		"shop.shortDesc": "คำโปรยสั้น ๆ",
		"shop.hours": "เวลาเปิด-ปิด",
		"shop.promo": "โปรโมชั่นพิเศษ (ถ้ามี)",
		"shop.submit": "โพสต์ร้านเข้าชุมชน",
		"shop.editMyShop": "แก้ไขร้านของฉัน",
		"shop.saveChanges": "บันทึกการแก้ไข",
		"profile.editShop": "แก้ไข",
		"home.searchPlaceholder": "ค้นหาร้าน เมนู คน หรือสถานที่...",
		"home.sellpoint": "Match % ทุกร้านคำนวณจาก Food DNA จริงของคุณ ไม่ใช่การเดา 🦖",
		"home.feedTitle": "📸 ฟีดชุมชน",
		"home.feedSub": "โพสต์จากร้านและเพื่อนนักชิมที่คุณติดตาม อัปเดตล่าสุดก่อนเสมอ",
		"home.feedEmpty": "ยังไม่มีโพสต์ในฟีด ลองเป็นคนแรกที่โพสต์สิ!",
		"feed.justNow": "เมื่อสักครู่",
		"feed.minsAgo": " นาทีที่แล้ว",
		"feed.hoursAgo": " ชม. ที่แล้ว",
		"feed.daysAgo": " วันที่แล้ว",
		"home.recommendedTitle": "🎯 แนะนำสำหรับคุณ",
		"home.recommendedSub": "แสดงเฉพาะร้าน Match 70% ขึ้นไป เรียงจากมากไปน้อย",
		"home.matchHeroSub": "ตรงรสนิยมคุณมาก",
		"home.fromYou": "จากตำแหน่งคุณ",
		"home.allShops": "📋 ร้านทั้งหมด",
		"home.forYou": "For You",
		"home.nearYou": "Near You",
		"home.hiddenGems": "Hidden Gems",
		"home.popular": "Popular",
		"home.new": "New",
		"search.food": "เมนูอาหาร",
		"search.restaurants": "ร้านอาหาร",
		"search.people": "คน",
		"search.locations": "สถานที่",
		"search.noResults": "ไม่พบผลลัพธ์",
		"following.topReviewers": "ร้านใกล้ ม.กรุงเทพ",
		"following.people": "คน",
		"following.restaurants": "ร้านอาหาร",
		"following.updates": "อัปเดต",
		"following.emptyFollowed": "ยังไม่ได้ Follow ร้านไหนเลย ลองกดปุ่ม Follow ในหน้ารายละเอียดร้านดูนะ",
		"following.emptyUpdates": "ยังไม่มีอัปเดตจากร้านที่คุณ Follow ไว้",
		"following.allPeople": "ทั้งหมด",
		"following.onlyFollowing": "ที่ติดตามแล้ว",
		"following.emptyFollowedPeople": "ยังไม่ได้ติดตามใครเลย ลองกดปุ่ม Follow ที่โปรไฟล์คนอื่นดูนะ",
		"profile.notLoggedIn": "ยังไม่ได้เข้าสู่ระบบ",
		"profile.notLoggedInDesc": "สมัครสมาชิกหรือเข้าสู่ระบบ เพื่อดูโปรไฟล์ Food DNA ร้านที่ Follow ไว้ หรือจัดการร้านของคุณ",
		"profile.signup": "สมัครสมาชิก",
		"profile.foodDna": "Food DNA ของคุณ",
		"profile.noDnaDesc": "ยังไม่ได้ทำแบบทดสอบ Food DNA ทำแบบทดสอบสั้น ๆ เพื่อให้ชิมชิมแนะนำร้านได้ตรงใจคุณมากขึ้น",
		"profile.takeTest": "ทำแบบทดสอบ Food DNA",
		"profile.retakeTest": "ทำแบบทดสอบใหม่อีกครั้ง",
		"profile.xpHint": "Follow ร้าน กดถูกใจ เขียนรีวิว หรือโพสต์ เพื่อรับ XP เพิ่ม",
		"profile.followedShops": "ร้านที่ Follow ไว้",
		"profile.following": "สิ่งที่คุณติดตามไว้",
		"profile.viewAll": "ดูร้านที่ Follow ทั้งหมด",
		"profile.viewAllPeople": "ดูคนที่ Follow ทั้งหมด",
		"profile.likeHistory": "ประวัติการกดถูกใจ",
		"profile.likeHistoryEmpty": "ยังไม่ได้กดถูกใจเมนูไหนเลย",
		"profile.reviewHistory": "ประวัติการรีวิว",
		"profile.reviewHistoryEmpty": "ยังไม่ได้เขียนรีวิวไว้เลย",
		"profile.myShops": "ร้านของฉัน",
		"profile.postNewShop": "โพสต์ร้านใหม่",
		"profile.myPage": "เพจร้านของฉัน",
		"profile.noPageDesc": "คุณยังไม่มีเพจร้านอาหาร สร้างเพจเพื่อโพสต์ในนามร้านค้า แยกจากโปรไฟล์ส่วนตัวของคุณ",
		"profile.createPage": "สร้างเพจของฉัน",
		"profile.viewPage": "ดูเพจ",
		"profile.managePage": "จัดการ",
		"profile.myPosts": "โพสต์ของฉัน",
		"profile.addPost": "เพิ่มโพสต์ใหม่",
		"profile.pickPhotos": "เลือกรูป (เพิ่มได้หลายรูปเหมือน IG)",
		"profile.captionLbl": "แคปชั่น",
		"profile.postBtn": "โพสต์",
		"profile.settings": "ตั้งค่า",
		"profile.logout": "ออกจากระบบ",
		"settings.title": "ตั้งค่า",
		"settings.appearance": "ธีมการแสดงผล",
		"settings.light": "โหมดสว่าง",
		"settings.dark": "โหมดมืด",
		"settings.language": "ภาษา",
		"settings.english": "English",
		"settings.thai": "ไทย",
		"settings.myPage": "เพจร้านอาหารของฉัน",
		"settings.pageLoginHint": "เข้าสู่ระบบก่อนเพื่อสร้างเพจร้านของคุณ",
		"settings.pageName": "ชื่อเพจ",
		"settings.pageAvatar": "รูปเพจ",
		"settings.pageSave": "บันทึกเพจ",
		"settings.pageView": "ดูเพจของฉัน",
		"settings.postingAs": "โพสต์ในนาม",
		"settings.myself": "ตัวเอง",
		"settings.postingAsHint": "โพสต์ใหม่ที่คุณเพิ่มจากหน้าโปรไฟล์ จะโพสต์ในนามที่คุณเลือกไว้ตรงนี้",
		"settings.postingAsPrefix": "กำลังโพสต์ในนาม",
		"restaurant.overview": "ภาพรวม",
		"restaurant.reviews": "รีวิว",
		"restaurant.navigate": "นำทาง",
		"restaurant.writeReview": "เขียนรีวิว",
		"restaurant.viewFull": "ดูรายละเอียดเต็ม",
		"restaurant.follow": "Follow ร้าน",
		"restaurant.following": "Following",
		"restaurant.hours": "เวลาเปิด-ปิด",
		"restaurant.promotions": "โปรโมชั่น & ข้อเสนอพิเศษ"
	}
};

function t(key) {
	var lang = getLang();
	var dict = CHIMCHIM_DICT[lang] || CHIMCHIM_DICT.en;
	if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
	return CHIMCHIM_DICT.en[key] || key;
}

// ชื่อหมวดอาหารในสองภาษา (ใช้แสดงบนการ์ด/แถบตัวกรอง/วงล้อ)
var CHIMCHIM_CAT_LABEL = {
	en: { "ข้าว": "Rice", "เส้น": "Noodles", "ซุป": "Soup", "Fast Food": "Fast Food", "ญี่ปุ่น": "Japanese", "ของหวาน": "Dessert", "เผ็ด": "Spicy" },
	th: { "ข้าว": "ข้าว", "เส้น": "เส้น", "ซุป": "ซุป", "Fast Food": "Fast Food", "ญี่ปุ่น": "ญี่ปุ่น", "ของหวาน": "ของหวาน", "เผ็ด": "เผ็ด" }
};
function catLabel(cat) {
	var lang = getLang();
	var map = CHIMCHIM_CAT_LABEL[lang] || CHIMCHIM_CAT_LABEL.en;
	return map[cat] || cat;
}

// ข้อความป้าย Match % — เขียนให้ตรงกับโหมดภาษาที่เลือกจริง ๆ (ไม่ใช้คำอังกฤษปนไทยตายตัว)
function matchBadgeText(score) {
	return getLang() === "th" ? ("🎯 ตรงใจ " + score + "%") : ("🎯 " + score + "% Match");
}
// หัวข้อสั้น ๆ ใช้ในการ์ดที่มีไอคอน 🎯 แยกอยู่แล้ว (ไม่ต้องมี emoji ซ้ำ)
function matchHeadline(score) {
	return getLang() === "th" ? ("ตรงใจ " + score + "%") : (score + "% Match");
}
function distanceText(meters) {
	if (meters >= 1000) {
		var km = (meters / 1000).toFixed(1).replace(/\.0$/, "");
		return getLang() === "th" ? (km + " กม.") : (km + " km");
	}
	return getLang() === "th" ? (meters + " ม.") : (meters + " m");
}

function applyI18n() {
	document.documentElement.setAttribute("lang", getLang());
	document.querySelectorAll("[data-i18n]").forEach(function(el) {
		el.textContent = t(el.getAttribute("data-i18n"));
	});
	document.querySelectorAll("[data-i18n-ph]").forEach(function(el) {
		el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
	});
	document.querySelectorAll(".catchip[data-filter]").forEach(function(el) {
		var span = el.querySelector("span");
		var filter = el.getAttribute("data-filter");
		if (span && filter && filter !== "all") {
			span.textContent = catEmojiSafe(filter) + " " + catLabel(filter);
		}
	});
	// รีเฟรชป้าย Match % ทุกอันในหน้าให้ตรงภาษาปัจจุบัน (กันข้อความค้างภาษาเดิมตอนสลับ)
	document.querySelectorAll("[data-match-score]").forEach(function(el) {
		var score = parseInt(el.getAttribute("data-match-score"), 10);
		if (!isNaN(score)) el.textContent = matchBadgeText(score);
	});
	// รีเฟรชการ์ดร้าน + Match Hero บนหน้าแรก (ถ้ามีอยู่บนหน้านั้น) ให้ตรงภาษาที่เพิ่งสลับ
	if (typeof แสดงMatchในการ์ดทั้งหมด === "function") แสดงMatchในการ์ดทั้งหมด();
	if (typeof renderMatchHero === "function") renderMatchHero();
}
// เผื่อ catEmoji (ประกาศใน chimchim-core.js) ยังโหลดไม่ถึงตอนนี้
function catEmojiSafe(cat) {
	if (typeof catEmoji === "function") return catEmoji(cat);
	return "";
}

/* =====================================================================
   ปุ่มลัดตั้งค่าด่วน (ไอคอนเฟืองบนแถบบน) — สลับ Light/Dark + EN/TH ได้ทันที
   โดยไม่ต้องเข้าหน้า Settings เต็มรูปแบบ (ใช้ได้กับทุกหน้าที่มี #quickSettingsBtn)
   ===================================================================== */
function setupQuickSettings() {
	var btn = document.getElementById("quickSettingsBtn");
	var panel = document.getElementById("quickSettingsPanel");
	if (!btn || !panel) return;

	function refreshQuickSettings() {
		var theme = getTheme();
		panel.querySelectorAll("[data-theme-choice]").forEach(function(b) {
			b.classList.toggle("active", b.getAttribute("data-theme-choice") === theme);
		});
		var lang = getLang();
		panel.querySelectorAll("[data-lang-choice]").forEach(function(b) {
			b.classList.toggle("active", b.getAttribute("data-lang-choice") === lang);
		});
	}

	btn.addEventListener("click", function(e) {
		e.stopPropagation();
		panel.hidden = !panel.hidden;
	});
	panel.addEventListener("click", function(e) {
		e.stopPropagation();
	});
	panel.querySelectorAll("[data-theme-choice]").forEach(function(b) {
		b.addEventListener("click", function() {
			setTheme(this.getAttribute("data-theme-choice"));
			refreshQuickSettings();
		});
	});
	panel.querySelectorAll("[data-lang-choice]").forEach(function(b) {
		b.addEventListener("click", function() {
			setLang(this.getAttribute("data-lang-choice"));
			refreshQuickSettings();
		});
	});
	document.addEventListener("click", function() {
		panel.hidden = true;
	});

	refreshQuickSettings();
}

document.addEventListener("DOMContentLoaded", function() {
	applyI18n();
	setupQuickSettings();
});
