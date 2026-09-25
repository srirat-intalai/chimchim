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
		"ai.greetingSub": "Chat with ChimChim about anything — not just food",
		"ai.inputPlaceholder": "Type anything, e.g. something spicy under 150 baht",
		"ai.startBubble": "Hungry? Tell ChimChim what you're craving — or just chat about anything else 🦖",
		"ai.genericFallback1": "Haha fair point! Anyway — what are you in the mood to eat today? 😋",
		"ai.genericFallback2": "Good one! While we're at it, got any cravings right now? ChimChim's always up for food talk 🦖",
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
		"shop.viewMyShop": "View my shop",
		"profile.editShop": "Edit",
		"home.searchPlaceholder": "Search restaurants, dishes, people, places...",
		"home.sellpoint": "Every Match % is calculated from your real Food DNA — not a guess 🦖",
		"home.feedTitle": "📸 Community Feed",
		"home.feedSub": "Posts from shops and foodies you follow, freshest first",
		"home.feedEmpty": "No posts yet — be the first to post!",
		"home.feedEmptyCat": "No posts in this category yet",
		"home.feedLoadingMore": "Loading more posts...",
		"home.recNoResultsCat": "No shops in this category yet — try another one",
		"home.catAll": "All",
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
		"following.searchPlaceholder": "Search shops or people...",
		"following.searchEmpty": "No shops or people found",
		"profile.notLoggedIn": "You're not logged in",
		"profile.notLoggedInDesc": "Sign up or log in to see your Food DNA profile, followed shops, or manage your restaurant.",
		"profile.signup": "Sign Up",
		"profile.foodDna": "Your Food DNA",
		"profile.noDnaDesc": "You haven't taken the Food DNA quiz yet. Take the short quiz so ChimChim can recommend food that truly fits you.",
		"profile.takeTest": "Take the Food DNA Quiz",
		"onboarding.stepOf": "Step {n} of 5",
		"onboarding.step1Title": "Build your eating profile",
		"onboarding.step1Hint": "What kind of food do you like? (pick as many as you want)",
		"onboarding.step2Title": "Cuisines you love",
		"onboarding.step2Hint": "Pick as many as you like — the more you pick, the wider ChimChim can recommend",
		"onboarding.step3Title": "Flavors you love",
		"onboarding.step3Hint": "Pick as many as you like",
		"onboarding.step4Title": "Budget & distance",
		"onboarding.budgetHint": "Your usual budget per meal",
		"onboarding.distanceHint": "How far you're willing to travel to eat",
		"onboarding.budget1": "฿0 – ฿80",
		"onboarding.budget2": "฿80 – ฿150",
		"onboarding.budget3": "฿150 and above",
		"onboarding.distance1": "Nearby (within 500m)",
		"onboarding.distance2": "Medium (500m – 2km)",
		"onboarding.distance3": "I'll go anywhere (2km+)",
		"onboarding.next": "Next",
		"onboarding.doneTitle": "All done! 🎉",
		"onboarding.doneDesc": "ChimChim is starting to get to know you, and will keep recommending better matches over time.",
		"onboarding.startExploring": "Start exploring!",
		"dna.category": "Favorite categories",
		"dna.cuisine": "Favorite cuisines",
		"dna.flavor": "Favorite flavors",
		"dna.budget": "Usual budget",
		"dna.distance": "Distance willing to travel",
		"profile.retakeTest": "Retake the Quiz",
		"profile.dnaCardHintHas": "Tap to see your full Food DNA breakdown",
		"profile.dnaCardHintNone": "You haven't taken the quiz yet — tap to start",
		"profile.followedShops": "Restaurants You Follow",
		"profile.viewAll": "View all followed restaurants",
		"profile.likeHistory": "Like History",
		"profile.likeHistoryEmpty": "You haven't liked any dish yet.",
		"profile.reviewHistory": "Review History",
		"profile.reviewHistoryEmpty": "You haven't written any review yet.",
		"profile.myPosts": "My Posts",
		"profile.addPost": "Add New Post",
		"profile.pickPhotos": "Pick photos (add multiple, just like IG)",
		"profile.captionLbl": "Caption",
		"profile.postBtn": "Post",
		"profile.settings": "Settings",
		"profile.logout": "Log Out",
		"profile.statPosts": "Posts",
		"profile.statFollowing": "Following",
		"profile.editProfile": "Edit Profile",
		"profile.shareProfile": "Share Profile",
		"profile.linkCopied": "Profile link copied!",
		"settings.title": "Settings",
		"settings.appearance": "Appearance",
		"settings.light": "Light",
		"settings.dark": "Dark",
		"settings.language": "Language",
		"settings.english": "English",
		"settings.thai": "ไทย (Thai)",
		"settings.myLocation": "My Location",
		"settings.locationHint": "Let ChimChim know your real location so it can prioritize shops near you.",
		"settings.useMyLocation": "Use My Current Location",
		"settings.locationFound": "Nearest to you: {uni} — shops there get a small match boost",
		"settings.locationLoading": "Getting your location...",
		"settings.locationSuccess": "Got it! We'll prioritize shops near you 📍",
		"settings.locationError": "Couldn't get your location — check your browser's location permission",
		"settings.myPage": "My Restaurant Page",
		"settings.pageLoginHint": "Log in to create a page for your restaurant.",
		"settings.pageName": "Page name",
		"settings.pageAvatar": "Page photo",
		"settings.pageSave": "Save Page",
		"settings.pageView": "View my page",
		"settings.shopLoginHint": "Log in to post your shop to the community.",
		"settings.postingAs": "Posting As",
		"settings.myself": "Myself",
		"settings.postingAsHint": "New posts you add from your profile will be posted as whichever you pick here.",
		"settings.postingAsPrefix": "Posting as",
		"restaurant.overview": "Overview",
		"restaurant.reviews": "Reviews",
		"restaurant.navigate": "Directions",
		"restaurant.writeReview": "Write a Review",
		"restaurant.viewFull": "View Full Details",
		"roulette.recommendTitle": "Recommended For You",
		"roulette.recommendSub": "Ranked by Match % with your Food DNA",
		"roulette.recommendEmpty": "No shops match yet — try taking the Food DNA quiz first",
		"restaurant.follow": "Follow",
		"restaurant.following": "Following",
		"restaurant.hours": "Opening Hours",
		"restaurant.promotions": "Promotions & Offers",
		"restaurant.near": "Near ",
		"restaurant.followedToast": "You're now following this shop 🎉",
		"restaurant.unfollowedToast": "Unfollowed this shop",
		"restaurant.linkCopiedToast": "Link copied! (demo mode)",
		"restaurant.noReviewsYet": "No reviews yet — be the first to review this shop!",
		"restaurant.avgScoreSuffix": "/5 avg score",
		"restaurant.noReviewText": "(No additional comments)",
		"restaurant.defaultDesc": "Recommended by the ChimChim team, with a Match % calculated from your real Food DNA.",
		"restaurant.postedBy": "This shop was posted to the community by {vendor} 🏪",
		"roulette.miniGameLabel": "A ChimChim mini-game",
		"roulette.heading1": "Menu",
		"roulette.heading2": "Roulette",
		"roulette.desc": "Can't decide what to eat? Spin the wheel and let ChimChim pick a great dish for you",
		"roulette.modeLike": "Eat What I Like",
		"roulette.modeOpposite": "Try My Opposite",
		"roulette.modeMix": "Mix It Up",
		"roulette.modeDescLike": "Spin for a higher chance of landing on dishes/shops that best match your Food DNA 🎯",
		"roulette.modeDescOpposite": "Feeling adventurous? This mode leans toward the opposite of what you usually like 🙃",
		"roulette.modeDescMix": "A mix of what you like and don't — fun, unpredictable results 🎲",
		"roulette.spinBtn": "Spin!",
		"roulette.initialTag": "🎲 Ready to spin?",
		"roulette.initialTitle": "Tap spin to get started",
		"roulette.initialDesc": "ChimChim will pick one dish for you from a pool of 60+ menu items — great for those \"what should I eat\" days",
		"roulette.spinAgain": "Spin Again",
		"roulette.viewRecommended": "View Recommended",
		"roulette.similarShops": "🍽️ Similar Shops",
		"roulette.resultDescLike": "ChimChim picked this because it really matches your Food DNA — you won't be disappointed 🦖",
		"roulette.resultDescOpposite": "Try something you might not normally pick — you could find a new favorite! 🙃",
		"roulette.resultDescMix": "Randomly picked with no fixed formula — a mix of favorites and new finds, good luck! 🎲",
		"roulette.noRealShopYet": "No real shops in this category yet — give it another spin to see a category with real shops 🦖",
		"common.shopNotFound": "This shop wasn't found — it may have been removed.",
		"common.backToHome": "Back to Home",
		"common.profileNotFound": "This profile wasn't found",
		"common.anonymousFoodie": "Anonymous foodie",
		"common.chimchimFoodie": "ChimChim Foodie",
		"common.follow": "Follow",
		"common.following": "Following",
		"common.member": "Member",
		"common.photoCount": "{n} photos",
		"publicprofile.buShopLevel": "🏪 Shop near Bangkok University",
		"publicprofile.pageLevel": "🏪 Restaurant Page",
		"publicprofile.mapBtn": "Map",
		"publicprofile.reviewsSuffix": " reviews",
		"publicprofile.foodExplorerLevel": "🦖 Food Explorer Lv.",
		"publicprofile.chimchimUser": "ChimChim User",
		"publicprofile.defaultBio": "A ChimChim member sharing dishes and favorite shops through posts below",
		"publicprofile.recentPosts": "Recent Posts",
		"publicprofile.noPosts": "No posts yet",
		"community.commentPlaceholder": "Add a comment...",
		"community.noCommentsYet": "No comments yet — be the first to comment!",
		"auth.fillAllFields": "Please fill in all fields, and use a password with at least 4 characters",
		"auth.emailExists": "This email already has an account — try logging in instead",
		"auth.invalidCredentials": "Incorrect email or password",
		"auth.welcomeBack": "Welcome back, {name}! 🦖",
		"home.recNoResultsAll": "No shops matching 70%+ yet — try taking the Food DNA quiz for more accurate results",
		"home.shopPostedToast": "Your shop was posted to the community! 🎉",
		"home.reviewThanksToast": "Thanks for your review! 🎉",
		"shop.pageFillRequired": "Fill in the page name and pick a photo first",
		"shop.pageSavedToast": "Saved page “{name}”! 🎉",
		"shop.fillRequired": "Fill in the shop name, featured dish, photo, and prices first",
		"shop.priceOrderError": "The low price must be less than or equal to the high price",
		"shop.postedToast": "Posted “{name}” to the community! 🎉",
		"profile.logoutToast": "Logged out — see you again soon! 👋",
		"profile.memberRole": "🧑‍🎓 ChimChim Member",
		"common.removePhoto": "Remove photo",
		"profile.selectPhotoAndCaption": "Pick at least 1 photo and add a caption first",
		"profile.postedAsToast": "Posted as “{name}”! 🎉",
		"profile.postedToast": "Posted! 🎉",
		"common.deletePost": "Delete post",
		"common.editPost": "Edit post",
		"profile.saveChangesPost": "Save Changes",
		"profile.postUpdatedToast": "Post updated! 🎉",
		"welcome.skip": "Explore the app — no sign up needed →",
		"following.tapToView": "Tap a photo to view their profile and posts",
		"profile.captionPlaceholder": "Say something about this meal...",
		"profile.noPostsYet": "No posts yet — try adding your first one!",
		"restaurant.pilotNote": "This shop is in the ChimChim system, serving students in our pilot area. If you visit and recognize it from ChimChim, feel free to tell the staff you came from the app 🦖",
		"shop.pageNamePlaceholder": "e.g. Aunt Noi's Chicken Rice",
		"shop.bioPlaceholder": "Briefly describe what makes your shop special",
		"shop.shopNamePlaceholder": "e.g. Aunt Noi's Chicken Rice Shop",
		"shop.dishPlaceholder": "e.g. Fried Chicken Rice",
		"shop.hoursPlaceholder": "e.g. 10:00 AM – 8:00 PM",
		"shop.promoPlaceholder": "e.g. 10% off when ordering through the app",
		"report.button": "Report",
		"report.title": "Report this content",
		"report.hint": "Why are you reporting this?",
		"report.reasonSpam": "Spam",
		"report.reasonInappropriate": "Inappropriate content",
		"report.reasonFake": "Fake or misleading",
		"report.reasonOther": "Other",
		"report.thanks": "Thanks for the report — we'll take a look 🙏",
		"report.alreadyReported": "You've already reported this",
		"analytics.title": "Usage Stats",
		"analytics.deviceNote": "This shows activity recorded on this device/browser only — not all ChimChim users. Real cross-device analytics needs the Supabase backend (not connected yet).",
		"analytics.totalEvents": "Total events logged",
		"analytics.noData": "No activity recorded yet — go use the app a bit, then come back here",
		"analytics.settingsLink": "Usage Stats (this device)",
		"analytics.eventAppOpen": "App/page opens",
		"analytics.eventDnaQuizCompleted": "Food DNA quizzes completed",
		"analytics.eventAiChatMessageSent": "AI chat messages sent",
		"analytics.eventShopLiked": "Shops liked",
		"analytics.eventShopFollowed": "Shops followed",
		"analytics.eventShopPosted": "Shops posted to community",
		"analytics.eventPostCreated": "Posts created",
		"analytics.eventReviewSubmitted": "Reviews submitted",
		"analytics.eventContentReported": "Content reports filed",
		"analytics.clearData": "Clear this device's stats",
		"analytics.clearedToast": "Cleared this device's usage stats",
		"optgroup.everyday": "🍽️ Everyday",
		"optgroup.spicy": "🌶️ Bold & Spicy",
		"optgroup.regional": "🗺️ Regional Thai",
		"optgroup.noodles": "🍜 Noodles",
		"optgroup.international": "🌏 International",
		"optgroup.dessertsDrinks": "🍰 Desserts & Drinks",
		"optgroup.dietary": "🥗 Dietary",
		"auth.checkEmailToConfirm": "Almost done! Check {email} and click the confirmation link, then log in.",
		"auth.genericError": "Something went wrong — please try again",
		"auth.emailAlreadyRegistered": "This email already has an account — try logging in instead",
		"auth.emailRateLimited": "Too many emails sent to this address just now — wait a bit and try again, or check your inbox for an earlier confirmation link",
		"auth.emailNotConfirmed": "Your email isn't confirmed yet — check your inbox (and spam folder) for the confirmation link from signup before logging in",
		"common.restaurantIcon": "Restaurant",
		"review.pageTitle": "Write a Review",
		"review.yourName": "Your name",
		"review.namePlaceholder": "Name shown on your review",
		"review.taste": "Taste",
		"review.atmosphere": "Atmosphere",
		"review.service": "Service",
		"review.tellExperience": "Tell us about your experience",
		"review.textPlaceholder": "How was the food? Anything you'd like to share...",
		"review.submit": "Submit Review",
		"review.rateAllThree": "Please rate all 3 categories first"
	},
	th: {
		"nav.trending": "เทรนด์",
		"nav.ai": "AI",
		"nav.following": "ติดตาม",
		"nav.profile": "โปรไฟล์",
		"ai.greetingTitle": "สวัสดี 👋",
		"ai.greetingSub": "คุยกับ ChimChim ได้เลย ถามอะไรก็ได้ ไม่ใช่แค่เรื่องกิน",
		"ai.inputPlaceholder": "พิมพ์อะไรก็ได้ เช่น อยากกินเผ็ด ๆ งบไม่เกิน 150 บาท",
		"ai.startBubble": "อยากกินอะไรวันนี้ บอก ChimChim ได้เลย หรือจะคุยเรื่องอื่นก็ได้นะ 🦖",
		"ai.genericFallback1": "ฮี่ ๆ จริงด้วยนะ! 😋 ว่าแต่วันนี้ชิมชิมอยากรู้จัง อยากกินอะไรดีอ่ะ",
		"ai.genericFallback2": "จริงด้วยเลยจ้า! 🦖 ว่าแต่ตอนนี้หิวรึยังน้า บอกชิมชิมหน่อยว่าอยากกินแนวไหน",
		"ai.genericFallback3": "เห็นด้วยเลยจ้า! 🍜 เดี๋ยวค่อยคุยกันต่อนะ ตอนนี้ขอถามหน่อยว่ามื้อนี้อยากกินอะไรอยู่",
		"ai.genericFallback4": "โอ้โห เข้าใจเลยจ้า! 😄 ว่าแต่...หิวยังน้า บอกชิมชิมมาสิว่าอยากกินอะไร",
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
		"shop.viewMyShop": "ดูร้านของฉัน",
		"profile.editShop": "แก้ไข",
		"home.searchPlaceholder": "ค้นหาร้าน เมนู คน หรือสถานที่...",
		"home.sellpoint": "Match % ทุกร้านคำนวณจาก Food DNA จริงของคุณ ไม่ใช่การเดา 🦖",
		"home.feedTitle": "📸 ฟีดชุมชน",
		"home.feedSub": "โพสต์จากร้านและเพื่อนนักชิมที่คุณติดตาม อัปเดตล่าสุดก่อนเสมอ",
		"home.feedEmpty": "ยังไม่มีโพสต์ในฟีด ลองเป็นคนแรกที่โพสต์สิ!",
		"home.feedEmptyCat": "ยังไม่มีโพสต์ในหมวดนี้",
		"home.feedLoadingMore": "กำลังโหลดโพสต์เพิ่ม...",
		"home.recNoResultsCat": "ยังไม่มีร้านในหมวดนี้ตอนนี้ ลองเลือกหมวดอื่นดูนะ",
		"home.catAll": "ทั้งหมด",
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
		"following.searchPlaceholder": "ค้นหาร้าน หรือชื่อคน...",
		"following.searchEmpty": "ไม่พบร้านหรือคนที่ค้นหา",
		"profile.notLoggedIn": "ยังไม่ได้เข้าสู่ระบบ",
		"profile.notLoggedInDesc": "สมัครสมาชิกหรือเข้าสู่ระบบ เพื่อดูโปรไฟล์ Food DNA ร้านที่ Follow ไว้ หรือจัดการร้านของคุณ",
		"profile.signup": "สมัครสมาชิก",
		"profile.foodDna": "Food DNA ของคุณ",
		"profile.noDnaDesc": "ยังไม่ได้ทำแบบทดสอบ Food DNA ทำแบบทดสอบสั้น ๆ เพื่อให้ ChimChim แนะนำร้านได้ตรงใจคุณมากขึ้น",
		"profile.takeTest": "ทำแบบทดสอบ Food DNA",
		"onboarding.stepOf": "ขั้นตอนที่ {n} จาก 5",
		"onboarding.step1Title": "สร้างโปรไฟล์การกินของคุณ",
		"onboarding.step1Hint": "คุณชอบกินอาหารประเภทไหนบ้าง? (เลือกได้หลายอย่าง)",
		"onboarding.step2Title": "ชาติอาหารที่คุณชอบ",
		"onboarding.step2Hint": "เลือกได้หลายอย่าง ยิ่งเลือกเยอะ ChimChim ยิ่งแนะนำได้กว้างขึ้น",
		"onboarding.step3Title": "รสชาติที่คุณชอบ",
		"onboarding.step3Hint": "เลือกได้หลายอย่าง",
		"onboarding.step4Title": "งบประมาณและระยะทาง",
		"onboarding.budgetHint": "งบประมาณต่อมื้อที่คุณใช้บ่อย",
		"onboarding.distanceHint": "ระยะทางที่คุณยอมเดินทางไปกิน",
		"onboarding.budget1": "฿0 – ฿80",
		"onboarding.budget2": "฿80 – ฿150",
		"onboarding.budget3": "฿150 ขึ้นไป",
		"onboarding.distance1": "ใกล้ ๆ (ไม่เกิน 500 ม.)",
		"onboarding.distance2": "ปานกลาง (500 ม. – 2 กม.)",
		"onboarding.distance3": "ไกลแค่ไหนก็ไป (2 กม.+)",
		"onboarding.next": "ถัดไป",
		"onboarding.doneTitle": "เสร็จแล้ว! 🎉",
		"onboarding.doneDesc": "ChimChim เริ่มรู้จักคุณแล้ว และจะแนะนำร้านให้ตรงใจคุณมากขึ้นเรื่อย ๆ",
		"onboarding.startExploring": "เริ่มสำรวจเลย!",
		"dna.category": "หมวดที่ชอบ",
		"dna.cuisine": "ชอบชาติอาหาร",
		"dna.flavor": "ชอบรส",
		"dna.budget": "งบเฉลี่ยที่ใช้บ่อย",
		"dna.distance": "ระยะที่ยอมไป",
		"profile.retakeTest": "ทำแบบทดสอบใหม่อีกครั้ง",
		"profile.dnaCardHintHas": "แตะเพื่อดูรายละเอียด Food DNA ของคุณทั้งหมด",
		"profile.dnaCardHintNone": "ยังไม่ได้ทำแบบทดสอบ — แตะเพื่อเริ่มทำ",
		"profile.followedShops": "ร้านที่ Follow ไว้",
		"profile.viewAll": "ดูร้านที่ Follow ทั้งหมด",
		"profile.likeHistory": "ประวัติการกดถูกใจ",
		"profile.likeHistoryEmpty": "ยังไม่ได้กดถูกใจเมนูไหนเลย",
		"profile.reviewHistory": "ประวัติการรีวิว",
		"profile.reviewHistoryEmpty": "ยังไม่ได้เขียนรีวิวไว้เลย",
		"profile.myPosts": "โพสต์ของฉัน",
		"profile.addPost": "เพิ่มโพสต์ใหม่",
		"profile.pickPhotos": "เลือกรูป (เพิ่มได้หลายรูปเหมือน IG)",
		"profile.captionLbl": "แคปชั่น",
		"profile.postBtn": "โพสต์",
		"profile.settings": "ตั้งค่า",
		"profile.logout": "ออกจากระบบ",
		"profile.statPosts": "โพสต์",
		"profile.statFollowing": "กำลังติดตาม",
		"profile.editProfile": "แก้ไขโปรไฟล์",
		"profile.shareProfile": "แชร์โปรไฟล์",
		"profile.linkCopied": "คัดลอกลิงก์โปรไฟล์แล้ว!",
		"settings.title": "ตั้งค่า",
		"settings.appearance": "ธีมการแสดงผล",
		"settings.light": "โหมดสว่าง",
		"settings.dark": "โหมดมืด",
		"settings.language": "ภาษา",
		"settings.english": "English",
		"settings.thai": "ไทย",
		"settings.myLocation": "ตำแหน่งของฉัน",
		"settings.locationHint": "ให้ ChimChim รู้ตำแหน่งจริงของคุณ เพื่อจัดร้านแถวคุณให้ขึ้นก่อน",
		"settings.useMyLocation": "ใช้ตำแหน่งปัจจุบันของฉัน",
		"settings.locationFound": "ใกล้คุณที่สุด: {uni} — ร้านแถวนั้นจะได้คะแนน Match โบนัสเพิ่ม",
		"settings.locationLoading": "กำลังขอตำแหน่ง...",
		"settings.locationSuccess": "รับตำแหน่งแล้ว! จะจัดร้านแถวคุณให้ก่อนเลย 📍",
		"settings.locationError": "ขอตำแหน่งไม่สำเร็จ ลองเช็กสิทธิ์การเข้าถึงตำแหน่งของเบราว์เซอร์ดูนะ",
		"settings.myPage": "เพจร้านอาหารของฉัน",
		"settings.pageLoginHint": "เข้าสู่ระบบก่อนเพื่อสร้างเพจร้านของคุณ",
		"settings.pageName": "ชื่อเพจ",
		"settings.pageAvatar": "รูปเพจ",
		"settings.pageSave": "บันทึกเพจ",
		"settings.shopLoginHint": "เข้าสู่ระบบก่อนเพื่อโพสต์ร้านของคุณเข้าชุมชน",
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
		"roulette.recommendTitle": "ร้านแนะนำสำหรับคุณ",
		"roulette.recommendSub": "เรียงจาก Match % ที่ตรงกับ Food DNA ของคุณมากที่สุด",
		"roulette.recommendEmpty": "ยังไม่มีร้านที่ตรงเลย ลองทำแบบทดสอบ Food DNA ก่อนนะ",
		"restaurant.follow": "Follow ร้าน",
		"restaurant.following": "Following",
		"restaurant.hours": "เวลาเปิด-ปิด",
		"restaurant.promotions": "โปรโมชั่น & ข้อเสนอพิเศษ",
		"restaurant.near": "ใกล้",
		"restaurant.followedToast": "Follow ร้านนี้แล้ว 🎉",
		"restaurant.unfollowedToast": "เลิก Follow ร้านนี้แล้ว",
		"restaurant.linkCopiedToast": "คัดลอกลิงก์ร้านนี้แล้ว! (โหมดสาธิต)",
		"restaurant.noReviewsYet": "ยังไม่มีรีวิว เป็นคนแรกที่รีวิวร้านนี้สิ!",
		"restaurant.avgScoreSuffix": "/5 คะแนนเฉลี่ย",
		"restaurant.noReviewText": "(ไม่ได้เขียนความเห็นเพิ่มเติม)",
		"restaurant.defaultDesc": "ร้านแนะนำจากทีม ChimChim พร้อมข้อมูล Match % ที่คำนวณจาก Food DNA ของคุณจริง ๆ",
		"restaurant.postedBy": "ร้านนี้โพสต์เข้าชุมชนโดย {vendor} 🏪",
		"roulette.miniGameLabel": "มินิเกมของ ChimChim",
		"roulette.heading1": "วงล้อ",
		"roulette.heading2": "สุ่มเมนู",
		"roulette.desc": "ตัดสินใจไม่ได้ว่าจะกินอะไรใช่ไหม? หมุนวงล้อแล้วให้ ChimChim สุ่มเมนูเด็ดให้เลย",
		"roulette.modeLike": "กินตามใจชอบ",
		"roulette.modeOpposite": "ลองสิ่งตรงข้าม",
		"roulette.modeMix": "สุ่มมั่ว ๆ",
		"roulette.modeDescLike": "หมุนแล้วมีโอกาสเจอเมนู/ร้านที่ตรงกับ Food DNA ของคุณมากที่สุด 🎯",
		"roulette.modeDescOpposite": "อยากลองอะไรใหม่ไหม? โหมดนี้จะสุ่มเมนูที่ตรงข้ามกับที่คุณชอบเป็นพิเศษ 🙃",
		"roulette.modeDescMix": "ผสมกันไปทั้งเมนูที่ชอบและไม่ชอบ ได้ผลลัพธ์สนุก ๆ คาดเดาไม่ได้ 🎲",
		"roulette.spinBtn": "หมุน!",
		"roulette.initialTag": "🎲 พร้อมสุ่มหรือยัง?",
		"roulette.initialTitle": "กดหมุนวงล้อได้เลย",
		"roulette.initialDesc": "ChimChim จะช่วยเลือกเมนูให้ 1 อย่างจากฐานข้อมูลกว่า 60 เมนู เผื่อวันไหนคิดไม่ออกว่าจะกินอะไรดี",
		"roulette.spinAgain": "หมุนอีกครั้ง",
		"roulette.viewRecommended": "ดูร้านแนะนำ",
		"roulette.similarShops": "🍽️ ร้านที่คล้ายกัน",
		"roulette.resultDescLike": "ChimChim เลือกเมนูนี้ให้เพราะตรงกับ Food DNA ของคุณมาก ๆ ลองเลยไม่ผิดหวังแน่ 🦖",
		"roulette.resultDescOpposite": "ลองกินสิ่งที่ปกติคุณอาจไม่เลือกดูสักครั้ง เผื่อจะเจอเมนูโปรดใหม่! 🙃",
		"roulette.resultDescMix": "สุ่มมาแบบไม่มีสูตรตายตัว ผสมทั้งของที่ชอบและของใหม่ ลุ้นกันไปเลย 🎲",
		"roulette.noRealShopYet": "ยังไม่มีร้านหมวดนี้ในระบบตอนนี้ ลองหมุนใหม่ดูร้านหมวดอื่นที่มีอยู่จริงได้เลย 🦖",
		"common.shopNotFound": "ไม่พบร้านนี้ในระบบ อาจถูกลบไปแล้ว",
		"common.backToHome": "กลับหน้าแรก",
		"common.profileNotFound": "ไม่พบโปรไฟล์นี้",
		"common.anonymousFoodie": "นักชิมไม่ระบุตัวตน",
		"common.chimchimFoodie": "นักชิม ChimChim",
		"common.follow": "Follow",
		"common.following": "Following",
		"common.member": "สมาชิก",
		"common.photoCount": "{n} รูป",
		"publicprofile.buShopLevel": "🏪 ร้านอาหารใกล้ ม.กรุงเทพ",
		"publicprofile.pageLevel": "🏪 เพจร้านอาหาร",
		"publicprofile.mapBtn": "แผนที่",
		"publicprofile.reviewsSuffix": " รีวิว",
		"publicprofile.foodExplorerLevel": "🦖 Food Explorer Lv.",
		"publicprofile.chimchimUser": "ผู้ใช้ ChimChim",
		"publicprofile.defaultBio": "สมาชิก ChimChim แชร์เมนูและร้านโปรดผ่านโพสต์ด้านล่าง",
		"publicprofile.recentPosts": "โพสต์ล่าสุด",
		"publicprofile.noPosts": "ยังไม่มีโพสต์",
		"community.commentPlaceholder": "แสดงความคิดเห็น...",
		"community.noCommentsYet": "ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์สิ!",
		"auth.fillAllFields": "กรอกข้อมูลให้ครบ และรหัสผ่านอย่างน้อย 4 ตัวอักษร",
		"auth.emailExists": "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทนนะ",
		"auth.invalidCredentials": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
		"auth.welcomeBack": "ยินดีต้อนรับกลับมา {name}! 🦖",
		"home.recNoResultsAll": "ยังไม่มีร้านที่ Match 70% ขึ้นไปตอนนี้ ลองทำแบบทดสอบ Food DNA เพื่อผลลัพธ์ที่แม่นขึ้น",
		"home.shopPostedToast": "ร้านของคุณโพสต์เข้าชุมชนเรียบร้อยแล้ว! 🎉",
		"home.reviewThanksToast": "ขอบคุณสำหรับรีวิว! 🎉",
		"shop.pageFillRequired": "กรอกชื่อเพจและเลือกรูปก่อนนะ",
		"shop.pageSavedToast": "บันทึกเพจ “{name}” เรียบร้อยแล้ว! 🎉",
		"shop.fillRequired": "กรอกชื่อร้าน เมนูเด่น รูป และราคาให้ครบก่อนนะ",
		"shop.priceOrderError": "ราคาต่ำต้องน้อยกว่าหรือเท่ากับราคาสูง",
		"shop.postedToast": "โพสต์ร้าน “{name}” เข้าชุมชนเรียบร้อยแล้ว! 🎉",
		"profile.logoutToast": "ออกจากระบบแล้ว แล้วเจอกันใหม่นะ 👋",
		"profile.memberRole": "🧑‍🎓 สมาชิก ChimChim",
		"common.removePhoto": "ลบรูป",
		"profile.selectPhotoAndCaption": "เลือกรูปอย่างน้อย 1 รูปและใส่แคปชั่นก่อนนะ",
		"profile.postedAsToast": "โพสต์ในนาม “{name}” เรียบร้อยแล้ว! 🎉",
		"profile.postedToast": "โพสต์เรียบร้อยแล้ว! 🎉",
		"common.deletePost": "ลบโพสต์",
		"common.editPost": "แก้ไขโพสต์",
		"profile.saveChangesPost": "บันทึกการแก้ไข",
		"profile.postUpdatedToast": "แก้ไขโพสต์เรียบร้อยแล้ว! 🎉",
		"welcome.skip": "ดูแอปเลย ไม่ต้องสมัครก่อนก็ได้ →",
		"following.tapToView": "กดรูปเพื่อดูโปรไฟล์และดูโพสต์ของแต่ละคนได้เลย",
		"profile.captionPlaceholder": "เล่าอะไรสั้น ๆ เกี่ยวกับมื้อนี้...",
		"profile.noPostsYet": "ยังไม่มีโพสต์ ลองเพิ่มโพสต์แรกของคุณดูสิ!",
		"restaurant.pilotNote": "ร้านนี้อยู่ในระบบ ChimChim พร้อมให้บริการนักศึกษาในพื้นที่นำร่อง หากไปถึงแล้วจำได้ว่าเจอร้านนี้จาก ChimChim บอกพนักงานได้เลยว่ามาจากแอป 🦖",
		"shop.pageNamePlaceholder": "เช่น ป้าหน่อย ข้าวมันไก่",
		"shop.bioPlaceholder": "บอกจุดเด่นร้านคุณสั้น ๆ",
		"shop.shopNamePlaceholder": "เช่น ร้านป้าหน่อย ข้าวมันไก่",
		"shop.dishPlaceholder": "เช่น ข้าวมันไก่ทอด",
		"shop.hoursPlaceholder": "เช่น 10:00 – 20:00 น.",
		"shop.promoPlaceholder": "เช่น ลด 10% เมื่อสั่งผ่านแอป",
		"report.button": "รายงาน",
		"report.title": "รายงานเนื้อหานี้",
		"report.hint": "รายงานเรื่องอะไร",
		"report.reasonSpam": "สแปม",
		"report.reasonInappropriate": "เนื้อหาไม่เหมาะสม",
		"report.reasonFake": "ข้อมูลเท็จ/หลอกลวง",
		"report.reasonOther": "อื่น ๆ",
		"report.thanks": "ได้รับรายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน 🙏",
		"report.alreadyReported": "คุณรายงานอันนี้ไปแล้ว",
		"analytics.title": "สถิติการใช้งาน",
		"analytics.deviceNote": "ตัวเลขนี้นับเฉพาะกิจกรรมบนอุปกรณ์/เบราว์เซอร์นี้เท่านั้น ไม่ใช่ผู้ใช้ ChimChim ทั้งหมด ถ้าอยากได้สถิติรวมข้ามเครื่องจริง ๆ ต้องเชื่อมกับ Supabase ก่อน (ยังไม่ได้เชื่อม)",
		"analytics.totalEvents": "จำนวน event ทั้งหมดที่บันทึกไว้",
		"analytics.noData": "ยังไม่มีข้อมูลกิจกรรมเลย ลองใช้แอปดูสักหน่อยแล้วกลับมาดูใหม่",
		"analytics.settingsLink": "สถิติการใช้งาน (อุปกรณ์นี้)",
		"analytics.eventAppOpen": "เปิดแอป/หน้าเว็บ",
		"analytics.eventDnaQuizCompleted": "ทำแบบทดสอบ Food DNA เสร็จ",
		"analytics.eventAiChatMessageSent": "ส่งข้อความคุยกับ AI",
		"analytics.eventShopLiked": "กดถูกใจร้าน",
		"analytics.eventShopFollowed": "กด Follow ร้าน",
		"analytics.eventShopPosted": "โพสต์ร้านเข้าชุมชน",
		"analytics.eventPostCreated": "สร้างโพสต์",
		"analytics.eventReviewSubmitted": "ส่งรีวิว",
		"analytics.eventContentReported": "รายงานเนื้อหา",
		"analytics.clearData": "ล้างสถิติของอุปกรณ์นี้",
		"analytics.clearedToast": "ล้างสถิติการใช้งานของอุปกรณ์นี้แล้ว",
		"optgroup.everyday": "🍽️ ทั่วไป",
		"optgroup.spicy": "🌶️ รสจัดจ้าน",
		"optgroup.regional": "🗺️ ตามภาค",
		"optgroup.noodles": "🍜 เส้น/ก๋วยเตี๋ยว",
		"optgroup.international": "🌏 นานาชาติ",
		"optgroup.dessertsDrinks": "🍰 ของหวาน/เครื่องดื่ม",
		"optgroup.dietary": "🥗 เฉพาะทาง",
		"auth.checkEmailToConfirm": "เกือบเสร็จแล้ว! เช็คอีเมล {email} แล้วกดลิงก์ยืนยัน จากนั้นค่อยเข้าสู่ระบบ",
		"auth.genericError": "มีบางอย่างผิดพลาด ลองใหม่อีกครั้งนะ",
		"auth.emailAlreadyRegistered": "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทนนะ",
		"auth.emailRateLimited": "เพิ่งส่งอีเมลไปที่นี่ถี่เกินไป รอสักครู่แล้วลองใหม่ หรือเช็คอีเมลดูว่ามีลิงก์ยืนยันจากรอบก่อนหน้าไหม",
		"auth.emailNotConfirmed": "อีเมลนี้ยังไม่ได้ยืนยันตัวตน เช็คกล่องจดหมาย (และ spam) หาลิงก์ยืนยันจากตอนสมัคร แล้วกดยืนยันก่อนถึงจะเข้าสู่ระบบได้นะ",
		"common.restaurantIcon": "ร้านอาหาร",
		"review.pageTitle": "เขียนรีวิว",
		"review.yourName": "ชื่อของคุณ",
		"review.namePlaceholder": "ชื่อที่จะแสดงในรีวิว",
		"review.taste": "รสชาติ",
		"review.atmosphere": "บรรยากาศร้าน",
		"review.service": "การบริการ",
		"review.tellExperience": "เล่าประสบการณ์ของคุณ",
		"review.textPlaceholder": "อาหารเป็นยังไงบ้าง อยากบอกอะไรคนอื่นไหม...",
		"review.submit": "ส่งรีวิว",
		"review.rateAllThree": "ให้คะแนนทั้ง 3 หัวข้อก่อนนะ"
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
	en: {
		"ข้าว": "Rice", "เส้น": "Noodles", "ซุป": "Soup", "Fast Food": "Fast Food", "ญี่ปุ่น": "Japanese", "ของหวาน": "Dessert", "เผ็ด": "Spicy",
		"อาหารเจ": "Jay (Vegetarian)", "อาหารฮาลาล": "Halal", "มังสวิรัติ": "Vegetarian", "วีแกน": "Vegan", "อาหารตามสั่ง": "Made-to-order",
		"ส้มตำ": "Papaya Salad", "ยำ": "Spicy Salad", "หม่าล่า": "Mala", "ของทอด": "Fried", "ผลไม้": "Fruit", "ของหวาน/เบเกอรี่": "Dessert/Bakery",
		"ปิ้งย่าง": "Grilled/BBQ", "อาหารญี่ปุ่น": "Japanese", "อาหารจีน": "Chinese", "อาหารเกาหลี": "Korean", "เครื่องดื่ม": "Drinks",
		"สเต็ก": "Steak", "เบอร์เกอร์": "Burger", "เมนูเส้น": "Noodle Dishes", "ก๋วยเตี๋ยว": "Noodle Soup", "อาหารอินเดีย": "Indian",
		"อาหารเวียดนาม": "Vietnamese", "พิซซ่า": "Pizza", "อาหารใต้": "Southern Thai", "อีสาน": "Isaan", "เหนือ": "Northern Thai", "กลาง": "Central Thai",
		"อาหารป่า": "Wild/Jungle Food", "ข้าวแกง": "Rice & Curry",
		"อื่น ๆ": "Other", "ไทย": "Thai", "เกาหลี": "Korean", "จีน": "Chinese", "ฝรั่ง": "Western",
		"หวาน": "Sweet", "เค็ม": "Salty", "เปรี้ยว": "Sour", "กลมกล่อม": "Balanced",
		"ฟาสต์ฟู้ด": "Fast Food", "อิตาเลียน": "Italian", "มื้อเช้า": "Breakfast", "ของว่าง": "Snacks",
		"ซุป/แกง": "Soup/Curry", "ส้มตำ/ยำ": "Papaya Salad/Yum"
	},
	th: {
		"ข้าว": "ข้าว", "เส้น": "เส้น", "ซุป": "ซุป", "Fast Food": "Fast Food", "ญี่ปุ่น": "ญี่ปุ่น", "ของหวาน": "ของหวาน", "เผ็ด": "เผ็ด",
		"อาหารเจ": "อาหารเจ", "อาหารฮาลาล": "อาหารฮาลาล", "มังสวิรัติ": "มังสวิรัติ", "วีแกน": "วีแกน", "อาหารตามสั่ง": "อาหารตามสั่ง",
		"ส้มตำ": "ส้มตำ", "ยำ": "ยำ", "หม่าล่า": "หม่าล่า", "ของทอด": "ของทอด", "ผลไม้": "ผลไม้", "ของหวาน/เบเกอรี่": "ของหวาน/เบเกอรี่",
		"ปิ้งย่าง": "ปิ้งย่าง", "อาหารญี่ปุ่น": "อาหารญี่ปุ่น", "อาหารจีน": "อาหารจีน", "อาหารเกาหลี": "อาหารเกาหลี", "เครื่องดื่ม": "เครื่องดื่ม",
		"สเต็ก": "สเต็ก", "เบอร์เกอร์": "เบอร์เกอร์", "เมนูเส้น": "เมนูเส้น", "ก๋วยเตี๋ยว": "ก๋วยเตี๋ยว", "อาหารอินเดีย": "อาหารอินเดีย",
		"อาหารเวียดนาม": "อาหารเวียดนาม", "พิซซ่า": "พิซซ่า", "อาหารใต้": "อาหารใต้", "อีสาน": "อีสาน", "เหนือ": "เหนือ", "กลาง": "กลาง",
		"อาหารป่า": "อาหารป่า", "ข้าวแกง": "ข้าวแกง",
		"อื่น ๆ": "อื่น ๆ", "ไทย": "ไทย", "เกาหลี": "เกาหลี", "จีน": "จีน", "ฝรั่ง": "ฝรั่ง",
		"หวาน": "หวาน", "เค็ม": "เค็ม", "เปรี้ยว": "เปรี้ยว", "กลมกล่อม": "กลมกล่อม",
		"ฟาสต์ฟู้ด": "ฟาสต์ฟู้ด", "อิตาเลียน": "อิตาเลียน", "มื้อเช้า": "มื้อเช้า", "ของว่าง": "ของว่าง",
		"ซุป/แกง": "ซุป/แกง", "ส้มตำ/ยำ": "ส้มตำ/ยำ"
	}
};
function catLabel(cat) {
	var lang = getLang();
	var map = CHIMCHIM_CAT_LABEL[lang] || CHIMCHIM_CAT_LABEL.en;
	return map[cat] || cat;
}

// ป้ายชื่อกลุ่มหมวดหมู่ใหญ่ (7 กลุ่ม) ใช้กับแถบหมวดหมู่หน้าเทรนด์
var CHIMCHIM_CAT_GROUP_LABEL = {
	en: {
		"อาหารตามสั่ง": "Made-to-order",
		"เมนูเส้น": "Noodles",
		"นานาชาติ": "International",
		"ของหวาน": "Dessert",
		"เครื่องดื่ม": "Drinks",
		"สุขภาพ": "Health"
	},
	th: {
		"อาหารตามสั่ง": "อาหารตามสั่ง",
		"เมนูเส้น": "เมนูเส้น",
		"นานาชาติ": "นานาชาติ",
		"ของหวาน": "ของหวาน",
		"เครื่องดื่ม": "เครื่องดื่ม",
		"สุขภาพ": "สุขภาพ"
	}
};
function catGroupLabel(groupKey) {
	var lang = getLang();
	var map = CHIMCHIM_CAT_GROUP_LABEL[lang] || CHIMCHIM_CAT_GROUP_LABEL.en;
	return map[groupKey] || groupKey;
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
	// ตัวเลือกแบบทดสอบ Food DNA (obopt) — data-val เป็นคำไทยตรงกับ CHIMCHIM_CAT_LABEL อยู่แล้ว
	// (หมวดอาหาร/ชาติอาหาร/รสชาติ) เลยแปลผ่าน catLabel() ได้เลยโดยไม่ต้องมี data-i18n แยกทีละอัน
	document.querySelectorAll(".obopt[data-val] .oblbl").forEach(function(el) {
		var opt = el.closest(".obopt");
		if (opt) el.textContent = catLabel(opt.getAttribute("data-val"));
	});
	// ช่องวงล้อสุ่มเมนู (roulette.html) — เหมือน obopt ด้านบน ใช้ data-val แปลผ่าน catLabel() ได้เลย
	document.querySelectorAll(".wslice[data-val] .wslbl").forEach(function(el) {
		var slice = el.closest(".wslice");
		if (slice) el.textContent = catLabel(slice.getAttribute("data-val"));
	});
	// dropdown หมวดอาหารตอนโพสต์ร้าน/สร้างเพจ (settings.html) — value ของแต่ละ option เป็นคำไทยตรงกับ
	// CHIMCHIM_CAT_LABEL อยู่แล้ว เลยแปลผ่าน catLabel() ได้เหมือนกัน โดยคง emoji เดิมไว้ข้างหน้า
	document.querySelectorAll("#pageCat option[value], #shopCat option[value]").forEach(function(opt) {
		if (!opt.value) return;
		opt.textContent = catEmojiSafe(opt.value) + " " + catLabel(opt.value);
	});
	document.querySelectorAll("optgroup[data-group-key]").forEach(function(og) {
		og.label = t(og.getAttribute("data-group-key"));
	});
	// รีเฟรชป้าย Match % ทุกอันในหน้าให้ตรงภาษาปัจจุบัน (กันข้อความค้างภาษาเดิมตอนสลับ)
	document.querySelectorAll("[data-match-score]").forEach(function(el) {
		var score = parseInt(el.getAttribute("data-match-score"), 10);
		if (!isNaN(score)) el.textContent = matchBadgeText(score);
	});
	// รีเฟรชการ์ดร้าน + Match Hero บนหน้าแรก (ถ้ามีอยู่บนหน้านั้น) ให้ตรงภาษาที่เพิ่งสลับ
	if (typeof แสดงMatchในการ์ดทั้งหมด === "function") แสดงMatchในการ์ดทั้งหมด();
	if (typeof renderMatchHero === "function") renderMatchHero();
	if (typeof updateRouletteModeDesc === "function") updateRouletteModeDesc();
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
