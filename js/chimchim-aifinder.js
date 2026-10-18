// chimchim-aifinder.js
// หน้า AI Food Finder แบบแชท ให้ความรู้สึกเหมือนคุยกับเพื่อนผ่าน LINE/IG DM
// ผู้ใช้เลือกได้ 2 ทาง: กดตัวเลือกด่วนที่สุ่มขึ้นมาเรื่อย ๆ หรือพิมพ์เองตามธรรมชาติ

var aiChatBody = document.getElementById("aiChatBody");
var aiSuggestRow = document.getElementById("aiSuggestRow");
var aiChatForm = document.getElementById("aiChatForm");
var aiChatInput = document.getElementById("aiChatInput");
var aiChatWrap = document.getElementById("aiChatWrap");

// ยังไม่มีข้อความจากผู้ใช้เลย = โชว์หน้าแรกแบบ "Ask anything" (ลูกแก้ว + คำถามแนะนำกลางจอ) แทนห้องแชท
function อัปเดตสถานะแชทว่าง() {
	if (!aiChatWrap) return;
	aiChatWrap.classList.toggle("is-empty", !aiChatBody.querySelector(".chatbubble.user"));
}

/* --- เลย์เอาต์เต็มจอพอดีหน้าจอ: เลื่อนเฉพาะรายการข้อความ แท่นพิมพ์อยู่ล่างเสมอ
   วัดความสูงหัวแอปจริง + ใช้ความสูง visualViewport (มือถือ: คีย์บอร์ดเปิดแล้วพื้นที่หดตาม ไม่บังช่องพิมพ์) --- */
function ปรับความสูงหน้าแชท() {
	var top = document.querySelector(".apptop");
	var root = document.documentElement.style;
	root.setProperty("--ai-top", (top ? top.offsetHeight : 64) + "px");
	if (window.visualViewport) root.setProperty("--ai-vh", window.visualViewport.height + "px");
}
ปรับความสูงหน้าแชท();
window.addEventListener("resize", ปรับความสูงหน้าแชท);
if (window.visualViewport) {
	window.visualViewport.addEventListener("resize", function() {
		ปรับความสูงหน้าแชท();
		if (aiChatBody) aiChatBody.scrollTop = aiChatBody.scrollHeight;
	});
}

/* --- ช่องพิมพ์หลายบรรทัด: สูงขึ้นตามข้อความ (ไม่เกิน ~5 บรรทัด) / Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่ --- */
function ปรับความสูงช่องพิมพ์() {
	if (!aiChatInput || aiChatInput.tagName !== "TEXTAREA") return;
	aiChatInput.style.height = "auto";
	aiChatInput.style.height = Math.min(aiChatInput.scrollHeight, 120) + "px";
}
if (aiChatInput) {
	aiChatInput.addEventListener("input", ปรับความสูงช่องพิมพ์);
	aiChatInput.addEventListener("keydown", function(e) {
		if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			if (typeof aiChatForm.requestSubmit === "function") aiChatForm.requestSubmit();
			else aiChatForm.dispatchEvent(new Event("submit", { cancelable: true }));
		}
	});
}

/* -----------------------------------------------------
   คลังคำแนะนำเริ่มบทสนทนา (Quick Suggestions) — สุ่มใหม่ทุกครั้ง ไม่ตายตัว
   แบ่งเป็นหมวด: รสชาติ / ราคา / สถานที่-ระยะทาง / ประเภทอาหาร / Random
----------------------------------------------------- */
var คลังQuickSuggest = [
	{ cat: "รสชาติ", text: "เผ็ด ๆ" },
	{ cat: "รสชาติ", text: "หวาน ๆ" },
	{ cat: "รสชาติ", text: "เค็ม ๆ" },
	{ cat: "รสชาติ", text: "เปรี้ยว ๆ" },
	{ cat: "ราคา", text: "ประหยัด" },
	{ cat: "ราคา", text: "งบไม่เกิน 100 บาท" },
	{ cat: "ราคา", text: "จัดเต็มไปเลย" },
	{ cat: "สถานที่", text: "ใกล้ ๆ" },
	{ cat: "สถานที่", text: "ไม่ไกลมาก" },
	{ cat: "สถานที่", text: "ไปไกลก็ได้" },
	{ cat: "ประเภท", text: "เมนูข้าว" },
	{ cat: "ประเภท", text: "เมนูเส้น" },
	{ cat: "ประเภท", text: "ของหวาน" },
	{ cat: "ประเภท", text: "Fast Food" },
	{ cat: "ประเภท", text: "อาหารญี่ปุ่น" },
	{ cat: "Random", text: "สุ่มให้หน่อย" },
	{ cat: "Random", text: "อยากลองอะไรใหม่" },
	{ cat: "Random", text: "ไปกินกับเพื่อน" },
	{ cat: "Random", text: "ไม่รู้จะกินอะไรดี" }
];

function สุ่มQuickSuggestions(n) {
	// ไม่โชว์ปุ่มแนวอาหารที่ยังไม่มีร้านในระบบ (เช่น ของหวาน) กดแล้วจะได้ไม่เจอ "ไม่มีร้าน"
	var เลือกได้ = คลังQuickSuggest.filter(function(item) {
		var p = แยกคำขอจากข้อความ(item.text);
		return !p.cat || ร้านทั้งหมดที่ค้นได้().some(function(r) { return p.cat.cats.indexOf(r.หมวด) !== -1; });
	});
	var i, j, temp;
	for (i = เลือกได้.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		temp = เลือกได้[i];
		เลือกได้[i] = เลือกได้[j];
		เลือกได้[j] = temp;
	}
	return เลือกได้.slice(0, n);
}

/* --- ชิปเริ่มต้นหน้าแรก (Smart Suggestion Chips) — ชุดคงที่ 6 อัน แสดงไม่เกิน 6 รวมปุ่ม "แบบเดิมเลย"
   ชิปแนวอาหารที่ยังไม่มีร้านในพื้นที่จะไม่แสดง (กดแล้วจะไม่เจอ "ไม่มีร้าน") แตะแล้วส่งข้อความเข้าระบบเดิมผ่าน ส่งข้อความ() --- */
var AI_STARTER_CHIPS = [
	{ key: "ai.chipRandom", icon: "fa-shuffle" },
	{ key: "ai.chipJapanese", icon: "fa-fish" },
	{ key: "ai.chipNearMe", icon: "fa-location-dot" },
	{ key: "ai.chipNoodles", icon: "fa-bowl-rice" },
	{ key: "ai.chipFriends", icon: "fa-user-group" },
	{ key: "ai.chipBudget150", icon: "fa-wallet" }
];
var AI_STARTER_MAX = 6;
function ชิปเริ่มต้นที่ใช้ได้() {
	return AI_STARTER_CHIPS.filter(function(c) {
		var p = แยกคำขอจากข้อความ(t(c.key).toLowerCase());
		return !p.cat || ร้านทั้งหมดที่ค้นได้().some(function(r) { return p.cat.cats.indexOf(r.หมวด) !== -1; });
	});
}

function renderQuickSuggestions() {
	aiSuggestRow.innerHTML = "";
	var mem = โหลดความจำ();
	var memEl = document.getElementById("aiHeroMemory");
	var lastSummary = mem.lastRequest ? สรุปคำขอ(Object.assign(newRequest(), mem.lastRequest)) : "";
	if (memEl) {
		memEl.hidden = !mem.sessions.length;
		if (mem.sessions.length) {
			memEl.textContent = lastSummary
				? t("ai.welcomeBack").replace("{summary}", lastSummary)
				: t("ai.welcomeBackNoSummary");
		}
	}
	if (mem.lastRequest) {
		var same = document.createElement("button");
		same.type = "button";
		same.className = "chatchip chatchip-same";
		same.textContent = t("ai.sameAsLast");
		same.insertAdjacentHTML("afterbegin", '<i class="fas fa-rotate-right" aria-hidden="true"></i>');
		same.addEventListener("click", function() { ส่งข้อความ(t("ai.sameAsLast")); });
		aiSuggestRow.appendChild(same);
	}
	// หน้าแรก (ยังไม่เริ่มคุย) ใช้ชิปชุดคงที่ / ระหว่างคุยแล้วกลับมาสถานะว่าง ใช้คำแนะนำสุ่มจากคลังเดิม
	var starter = aiChatWrap && aiChatWrap.classList.contains("is-empty");
	var room = AI_STARTER_MAX - (mem.lastRequest ? 1 : 0);
	var list = starter
		? ชิปเริ่มต้นที่ใช้ได้().slice(0, room).map(function(c) { return { text: t(c.key), icon: c.icon }; })
		: สุ่มQuickSuggestions(Math.min(4, room)).map(function(s) { return { text: s.text, icon: "fa-wand-magic-sparkles" }; });
	list.forEach(function(s) {
		var chip = document.createElement("button");
		chip.type = "button";
		chip.className = "chatchip";
		chip.innerHTML = '<i class="fas ' + s.icon + '" aria-hidden="true"></i>';
		chip.appendChild(document.createTextNode(s.text));
		chip.addEventListener("click", function() {
			ส่งข้อความ(s.text);
		});
		aiSuggestRow.appendChild(chip);
	});
}

/* -----------------------------------------------------
   บันทึกบทสนทนาไว้ใน localStorage ระหว่างยังไม่ออกจากระบบ (clearSession() ใน core.js จะลบทิ้งให้อัตโนมัติ
   ตอนกดออกจากระบบ) เพื่อให้สลับหน้าไปมาหรือรีเฟรชแล้วยังเห็นบทสนทนาเดิมต่อได้ ไม่ใช่เจอแชทว่างเปล่าใหม่ทุกครั้ง
   เก็บแค่ "สิ่งที่ต้องวาดใหม่" (ข้อความ/id ร้านในการ์ด) ไม่เก็บข้อมูลร้านทั้งก้อนซ้ำ เผื่อร้านมีอัปเดตทีหลัง
----------------------------------------------------- */
var AI_CHAT_LOG_MAX = 60;
var isRestoringChat = false;
function getSavedChatState() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_AI_CHAT_KEY)) || { history: [], log: [] };
	} catch (e) {
		return { history: [], log: [] };
	}
}
var บทสนทนาที่บันทึกไว้ = getSavedChatState().log;
// ร้านทั้งหมดที่เคยแนะนำในแชทรอบนี้ — ใช้จัดให้ร้านที่ยังไม่เคยเสนอขึ้นก่อน ไม่วนแนะนำร้านเดิมซ้ำ ๆ (ล้างเมื่อแชทรีเซ็ต)
var แนะนำไปแล้วในแชทนี้ = getSavedChatState().seenIds || [];
function บันทึกสถานะแชท() {
	localStorage.setItem(CHIMCHIM_AI_CHAT_KEY, JSON.stringify({ history: ประวัติแชท, log: บทสนทนาที่บันทึกไว้, request: คำขอ, lastResultIds: ร้านที่เพิ่งแนะนำ, lastUserAt: แชทเริ่มเมื่อ, seenIds: แนะนำไปแล้วในแชทนี้ }));
}
function จดบันทึกลงแชท(entry) {
	if (isRestoringChat) return;
	บทสนทนาที่บันทึกไว้.push(entry);
	if (บทสนทนาที่บันทึกไว้.length > AI_CHAT_LOG_MAX) {
		บทสนทนาที่บันทึกไว้ = บทสนทนาที่บันทึกไว้.slice(-AI_CHAT_LOG_MAX);
	}
	บันทึกสถานะแชท();
}

/* -----------------------------------------------------
   วาดข้อความ/การ์ดผลลัพธ์ในแชท
----------------------------------------------------- */
var เลื่อนเองล่าสุด = 0;
function เลื่อนแชทลงล่าง() {
	เลื่อนเองล่าสุด = Date.now();
	aiChatBody.scrollTop = aiChatBody.scrollHeight;
}
// พื้นที่ข้อความหด/ขยาย (ปุ่มคำตอบโผล่, ช่องพิมพ์สูงขึ้น, คีย์บอร์ดเปิด) → ถ้าดูข้อความล่าสุดอยู่ ให้ติดล่างต่อไป
// ไม่งั้นข้อความล่าสุดโดนแท่นพิมพ์ดันจนตกขอบ ถ้าผู้ใช้เลื่อนขึ้นไปอ่านของเก่าอยู่ จะไม่ดึงลงให้
var แชทติดล่าง = true;
aiChatBody.addEventListener("scroll", function() {
	// อีเวนต์ scroll ที่เกิดจากโค้ดเลื่อนเอง (มาช้ากว่าหนึ่งเฟรม ตอนนั้นแท่นพิมพ์อาจดันพื้นที่แล้ว) ไม่นับเป็นผู้ใช้เลื่อนขึ้น
	if (Date.now() - เลื่อนเองล่าสุด < 300) return;
	แชทติดล่าง = aiChatBody.scrollHeight - aiChatBody.scrollTop - aiChatBody.clientHeight < 60;
});
if ("ResizeObserver" in window) {
	new ResizeObserver(function() {
		if (แชทติดล่าง) เลื่อนแชทลงล่าง();
	}).observe(aiChatBody);
}
function addUserBubble(text) {
	var el = document.createElement("div");
	el.className = "chatbubble user";
	el.textContent = text;
	aiChatBody.appendChild(el);
	อัปเดตสถานะแชทว่าง();
	เลื่อนแชทลงล่าง();
	จดบันทึกลงแชท({ type: "user", text: text });
}
function addBotBubble(text) {
	var el = document.createElement("div");
	el.className = "chatbubble bot";
	el.textContent = text;
	aiChatBody.appendChild(el);
	เลื่อนแชทลงล่าง();
	จดบันทึกลงแชท({ type: "bot", text: text });
}
function addTyping() {
	var el = document.createElement("div");
	el.className = "chattyping";
	el.id = "aiTypingNow";
	el.innerHTML = "<span></span><span></span><span></span>";
	aiChatBody.appendChild(el);
	เลื่อนแชทลงล่าง();
}
function removeTyping() {
	var el = document.getElementById("aiTypingNow");
	if (el) el.remove();
}
function addResultCards(ร้านพร้อมคะแนน) {
	var row = document.createElement("div");
	row.className = "chatcardrow";
	ร้านพร้อมคะแนน.forEach(function(item) {
		var ร้าน = item.ข้อมูล;
		var card = document.createElement("div");
		card.className = "chatcard";
		card.innerHTML =
			'<img src="' + safeImgSrc(ร้าน.รูป) + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
			'<div class="chatcard-body">' +
				'<span class="chatcard-match" data-match-score="' + item.คะแนน + '">' + matchBadgeText(item.คะแนน) + '</span>' +
				'<div class="chatcard-title">' + escapeHtml(ร้าน.เมนู) + '</div>' +
				'<div class="chatcard-meta">' + escapeHtml(ร้าน.ร้าน) + ' • ฿' + ร้าน.ราคาต่ำ + '–' + ร้าน.ราคาสูง + '</div>' +
			'</div>';
		card.addEventListener("click", function() {
			// กดดูร้านที่ AI แนะนำจริง ๆ ถือเป็นสัญญาณว่าคำแนะนำครั้งนี้ตรงใจ เอาไปเรียนรู้ต่อยอด Food DNA
			if (typeof recordAiClickedShop === "function") recordAiClickedShop(ร้าน.id);
			window.location.href = "restaurant.html?id=" + ร้าน.id;
		});
		row.appendChild(card);
	});
	aiChatBody.appendChild(row);
	เลื่อนแชทลงล่าง();
	จดบันทึกลงแชท({
		type: "cards",
		items: ร้านพร้อมคะแนน.map(function(item) { return { id: item.ข้อมูล.id, คะแนน: item.คะแนน }; })
	});
}

/* =====================================================================
   ถามก่อนแนะนำ — เก็บสิ่งที่ผู้ใช้อยากได้ทีละข้อ (แนวอาหาร / รสชาติ / ไปกี่คน / งบต่อคน)
   สะสมข้ามข้อความ (ตอบ "3 คน" แล้วยังจำได้ว่าก่อนหน้านี้อยากกินญี่ปุ่น) ข้อไหนบอกมาแล้วไม่ถามซ้ำ
   ทุกคำถามมีปุ่มคำตอบให้แตะ + ปุ่ม "แนะนำเลย" ข้ามได้ตลอด ถามครบแล้วค่อยหาร้านจริงแล้วแนะนำ
   ===================================================================== */

// คำ → หมวดจริงในข้อมูลร้าน (ชื่อหมวดในข้อมูลคือ "อาหารญี่ปุ่น"/"ก๋วยเตี๋ยว" ฯลฯ ไม่ใช่ "ญี่ปุ่น"/"เส้น"
// เดิมเทียบชื่อตรง ๆ ไม่ตรงกัน เลยหาไม่เจอแล้วถอยไปแนะนำทุกร้าน = ตอบไม่ตรงที่ถาม) — ลำดับมีผล เจ้าแรกที่ตรงชนะ
var AI_CAT_RULES = [
	{ re: /ญี่ปุ่น|ซูชิ|ซาชิมิ|ราเมง|คัตสึ|japanese|sushi|ramen/, th: "อาหารญี่ปุ่น", en: "Japanese", cats: ["อาหารญี่ปุ่น"] },
	{ re: /ส้มตำ|ตำปู|ตำไทย|papaya/, th: "ส้มตำ", en: "Papaya salad", cats: ["ส้มตำ", "อีสาน"] },
	{ re: /อีสาน|ลาบ|น้ำตก|ไก่ย่าง|isaa?n/, th: "อีสาน", en: "Isan", cats: ["อีสาน", "ส้มตำ"] },
	{ re: /ยำ|\byum\b|spicy salad/, th: "ยำ", en: "Yum salad", cats: ["ยำ"] },
	{ re: /หม่าล่า|mala/, th: "หม่าล่า", en: "Mala", cats: ["หม่าล่า"] },
	{ re: /สเต็ก|steak/, th: "สเต็ก", en: "Steak", cats: ["สเต็ก"] },
	{ re: /ก๋วยเตี๋ยว|เส้น|บะหมี่|เย็นตาโฟ|noodle/, th: "ก๋วยเตี๋ยว / เส้น", en: "Noodles", cats: ["ก๋วยเตี๋ยว", "เมนูเส้น"] },
	{ re: /ตามสั่ง|กะเพรา|made.to.order|stir.?fry/, th: "อาหารตามสั่ง", en: "Made-to-order", cats: ["อาหารตามสั่ง"] },
	{ re: /ข้าวแกง|curry/, th: "ข้าวแกง", en: "Curry & rice", cats: ["ข้าวแกง"] },
	{ re: /ข้าว|\brice\b/, th: "เมนูข้าว", en: "Rice dishes", cats: ["อาหารตามสั่ง", "ข้าวแกง"] },
	{ re: /ของหวาน|ขนม|เค้ก|บิงซู|dessert|sweets/, th: "ของหวาน", en: "Dessert", cats: ["ของหวาน/เบเกอรี่", "ผลไม้"] },
	{ re: /ฟาสต์ฟู้ด|fast ?food|เบอร์เกอร์|burger|พิซซ่า|pizza|ไก่ทอด/, th: "Fast Food", en: "Fast food", cats: ["Fast Food", "เบอร์เกอร์", "พิซซ่า"] },
	// เกาหลี/จีน แยกเป็นแนวของตัวเอง — เดิมรวมในกลุ่มนานาชาติ ขอเกาหลีแล้วได้ร้านสเต็กมาแทน (ไม่ตรงความจริง)
	{ re: /เกาหลี|korean|ต็อกบกกี|บิบิมบับ|kimchi|กิมจิ/, th: "อาหารเกาหลี", en: "Korean", cats: ["อาหารเกาหลี"] },
	{ re: /อาหารจีน|chinese|ติ่มซำ|dim ?sum/, th: "อาหารจีน", en: "Chinese", cats: ["อาหารจีน"] },
	{ re: /นานาชาติ|ต่างชาติ|ฝรั่ง|international/, th: "อาหารนานาชาติ", en: "International", cats: ["อาหารจีน", "อาหารเกาหลี", "อาหารอินเดีย", "อาหารเวียดนาม", "พิซซ่า", "เบอร์เกอร์", "สเต็ก", "Fast Food"] },
	{ re: /เครื่องดื่ม|ชานม|กาแฟ|drink|coffee|tea/, th: "เครื่องดื่ม", en: "Drinks", cats: ["เครื่องดื่ม"] },
	{ re: /มังสวิรัติ|วีแกน|ฮาลาล|อาหารเจ|สุขภาพ|คลีน|healthy|vegan|vegetarian|halal/, th: "อาหารสุขภาพ", en: "Healthy", cats: ["อาหารเจ", "อาหารฮาลาล", "มังสวิรัติ", "วีแกน"] }
];
var AI_TASTE_RULES = [
	{ re: /เผ็ด|แซ่บ|spicy|hot/, th: "เผ็ด", en: "Spicy" },
	{ re: /กลมกล่อม|ไม่เผ็ด|จืด|mild|not spicy/, th: "กลมกล่อม", en: "Mild" },
	{ re: /เปรี้ยว|sour/, th: "เปรี้ยว", en: "Sour" },
	{ re: /เค็ม|salty/, th: "เค็ม", en: "Salty" },
	{ re: /เข้มข้น|rich/, th: "เข้มข้น", en: "Rich" },
	{ re: /หวาน|sweet/, th: "หวาน", en: "Sweet" }
];
/* --- ลักษณะอาหารจากภาษาพูด (เนื้อสัมผัส/สไตล์) — ใช้ได้หลายข้อพร้อมกัน เช่น "ทอดกรอบ ๆ เผ็ด ๆ"
   จับคู่กับข้อมูลจริงของร้านเท่านั้น: ชื่อร้าน เมนู หมวด รส แท็ก คำโปรย และแคปชันโพสต์ของร้าน (ไม่เดาเอง) --- */
var AI_FEATURE_RULES = [
	{ key: "fried", re: /ของทอด|ทอด|กรอบ|กรุบกรอบ|fried|crispy|crunchy/, shopRe: /ทอด|กรอบ|คัตสึ|คาราอาเกะ|เทมปุระ|tempura|fried|crispy|katsu/i },
	{ key: "spicy", re: /แซ่บ|จัดจ้าน|รสจัด|เผ็ดร้อน/, test: function(r, txt) { return (r.รส || []).indexOf("เผ็ด") !== -1 || /เผ็ด|แซ่บ|หม่าล่า/.test(txt); } },
	{ key: "soup", re: /ซดน้ำ|น้ำซุป|มีน้ำ|ร้อน ?ๆ|ซุป|น้ำข้น|น้ำใส|soup|broth/, shopRe: /ก๋วยเตี๋ยว|ซุป|ต้ม|ทั่ง|แกง|น้ำข้น|ซด|โจ๊ก|noodle soup/i },
	{ key: "hearty", re: /หนัก ?ๆ|อิ่ม ?ๆ|อิ่มท้อง|อิ่มนาน|จุก ?ๆ|hearty|filling/, cats: ["อาหารตามสั่ง", "ข้าวแกง", "สเต็ก", "อาหารญี่ปุ่น"] },
	{ key: "easy", re: /กินง่าย|ง่าย ?ๆ|ไม่ยุ่งยาก|เร็ว ?ๆ|quick|simple/, cats: ["อาหารตามสั่ง", "ก๋วยเตี๋ยว", "ข้าวแกง"] },
	{ key: "fresh", re: /ไม่เลี่ยน|ไม่มัน|สดชื่น|ไม่หนัก|not greasy|refreshing|light/, test: function(r, txt) {
		return ((r.รส || []).indexOf("เปรี้ยว") !== -1 || /ยำ|ส้มตำ|ตำ|สลัด|ลาบ/.test(txt)) && !/ทอด|คัตสึ|กรอบ/.test(txt);
	} },
	{ key: "seafood", re: /ทะเล|กุ้ง|ปูม้า|หมึก|seafood|shrimp|crab|squid/, shopRe: /ทะเล|กุ้ง|ปู|หมึก|seafood/i }
];
// ลักษณะที่ขัดกันเอง — ขอข้อใหม่แล้วข้อเดิมที่ขัดกันต้องหลุดไป (เช่น เดิมอยากได้ทอด แล้วบอก "ขอแบบไม่เลี่ยน")
var AI_FEATURE_CONFLICT = { fried: ["fresh"], fresh: ["fried", "hearty"], hearty: ["fresh"] };
// คำปฏิเสธนำหน้า ("ไม่กินเผ็ด", "ไม่อยากกินของทอด", "ไม่เอาแบบมัน ๆ") = สิ่งที่ต้องเลี่ยง ไม่ใช่สิ่งที่อยากได้
var AI_NEGATED_RE = /ไม่(อยาก)?(กิน|เอา|ชอบ|ทาน)?\s*(ของ|แบบ|อาหาร)?\s*(ทอด|กรอบ|เผ็ด|แซ่บ|ทะเล|ซุป)/g;
var AI_NEGATED_MAP = { "ทอด": "fried", "กรอบ": "fried", "เผ็ด": "spicy", "แซ่บ": "spicy", "มัน": "fried", "มัน ๆ": "fried", "มันๆ": "fried", "ทะเล": "seafood", "ซุป": "soup", "น้ำ": "soup" };
function แยกลักษณะอาหาร(msg) {
	var keys = [];
	var avoid = [];
	var cleaned = msg.replace(AI_NEGATED_RE, function(all, a, b, c, word) {
		var k = AI_NEGATED_MAP[word.replace(/\s/g, " ")] || AI_NEGATED_MAP[word];
		if (k && avoid.indexOf(k) === -1) avoid.push(k);
		return " ";
	});
	AI_FEATURE_RULES.forEach(function(rule) {
		if (rule.re.test(cleaned)) {
			keys.push(rule.key);
			cleaned = cleaned.replace(new RegExp(rule.re.source, "g"), " ");
		}
	});
	// "ทอดกรอบ" นับเป็นข้อเดียว — กันนับซ้ำ / ข้อที่ผู้ใช้ปฏิเสธไม่นับเป็นสิ่งที่อยากได้
	return {
		keys: keys.filter(function(k, i, a) { return a.indexOf(k) === i && avoid.indexOf(k) === -1; }),
		avoid: avoid,
		cleaned: cleaned.replace(/\s+/g, " ").trim()
	};
}
var ข้อความร้านแคช = {};
function ข้อความของร้าน(r) {
	if (ข้อความร้านแคช[r.id]) return ข้อความร้านแคช[r.id];
	var ส่วน = [r.ร้าน, r.เมนู, r.หมวด, r.ชาติอาหาร, r.คำโปรยกำหนดเอง || ""].concat(r.แท็ก || []).concat(r.รส || []);
	if (typeof เพจร้านBU !== "undefined") {
		เพจร้านBU.forEach(function(pg) {
			if (pg.menuId === r.id) (pg.posts || []).forEach(function(po) { ส่วน.push(po.caption || ""); });
		});
	}
	return (ข้อความร้านแคช[r.id] = ส่วน.join(" "));
}
function ร้านมีลักษณะ(r, key) {
	var rule = AI_FEATURE_RULES.filter(function(x) { return x.key === key; })[0];
	if (!rule) return true;
	var txt = ข้อความของร้าน(r);
	if (rule.test) return rule.test(r, txt);
	if (rule.cats) return rule.cats.indexOf(r.หมวด) !== -1;
	return rule.shopRe.test(txt);
}
function รวมลักษณะ(เดิม, ใหม่) {
	var out = (เดิม || []).filter(function(k) {
		return !ใหม่.some(function(n) { return (AI_FEATURE_CONFLICT[n] || []).indexOf(k) !== -1; });
	});
	ใหม่.forEach(function(k) { if (out.indexOf(k) === -1) out.push(k); });
	return out;
}

var AI_ANY_RE = /อะไรก็ได้|แล้วแต่|ไม่จำกัด|ไม่เกี่ยง|ได้หมด|anything|whatever|no limit|any/;
var AI_SKIP_RE = /แนะนำเลย|เลือกให้เลย|ข้ามคำถาม|ข้าม|สุ่มเลย|สุ่มให้|just recommend|surprise me|skip/;
// เริ่มใหม่ทั้งหมด (ล้างเงื่อนไข) — แยกจาก "ขอตัวเลือกอื่น" ด้านล่างที่ต้องเก็บเงื่อนไขเดิมไว้
var AI_RESET_RE = /เปลี่ยนใจ|เริ่มใหม่|เริ่มหาใหม่|start over/;
// ขอตัวเลือกอื่นจากที่เพิ่งแนะนำ (ภาษาพูด/คำย่อ) — คงแนวอาหาร งบ จำนวนคน ระยะเดิม แต่ไม่แนะนำร้านเดิมซ้ำ
var AI_ANOTHER_RE = /เบื่อ(อาหาร|เมนู)?เดิม|เบื่อแล้ว|ขออีกอัน|ขอเมนูอื่น|เมนูอื่น|เอาใหม่|ขอใหม่|อย่างอื่น|เปลี่ยนเมนู|เมนูใหม่|ไม่เอาอันนี้|ไม่เอาร้านนี้|ไม่เอาอันนี่|ร้านอื่น|ยังไม่โดน|ไม่โดนใจ|ไม่อยากกินอันนี้|ไม่อยากกินร้านนี้|อีกตัวเลือก|ตัวเลือกอื่น|อันอื่น|อีกอัน|อีกร้าน|อีกที่|เบื่อ(เมนู|ร้าน)?(นี้|นี่)|เปลี่ยนแนว|แนวอื่น|คนละแนว|หาใหม่|ถูกกว่านี้|ถูกกว่านั้น|ใกล้กว่านี้|ใกล้กว่านั้น|another|something else|other (option|place|shop|one)s?|next one|cheaper|closer/;
// ปฏิเสธ/ไม่ต้องการคำแนะนำตอนนี้ — ต้องเป็นทั้งข้อความ (กันชนกับ "ไม่เอาอันนี้" = ขอตัวเลือกอื่น, "ไม่กินเผ็ด" = เงื่อนไขรส)
var AI_DECLINE_RE = /^(ไม่เอา|ไม่กิน|ไม่หิว|ยังไม่หิว|อิ่มแล้ว|ไม่เป็นไร|ไม่ต้อง|ไม่ล่ะ|พอแล้ว|พอก่อน|ไว้ก่อน|ไว้ทีหลัง|ยังไม่อยากกิน|no|nope|no thanks?|not hungry|i'?m (full|good)|never ?mind|that'?s all)(\s*(แล้ว|ละ|ล่ะ|นะ|ครับ|ค่ะ|คะ|จ้า|จ้ะ|ดีกว่า|ก่อน|ขอบคุณ(ครับ|ค่ะ)?|thanks?|thank you))*\s*[.!~]*$/;
var ปฏิเสธติดกัน = 0;

/* --- ตัวเลขเปล่า ๆ ("500") ตีความตามบริบท ---
   บริบทชัด (เพิ่งถามงบ/จำนวนคน หรือเคยระบุงบไว้แล้ว) → ใช้เลย / กำกวม → ถามยืนยัน 1 ข้อ (ใช่/ไม่ใช่)
   ตอบ "ไม่ใช่" → ไม่เดาต่อเอง ถามสั้น ๆ ว่าหมายถึงอะไร พร้อมปุ่มความหมายที่เป็นไปได้ เข้าใจแล้วแนะนำต่อทันที */
var AI_BARE_NUMBER_RE = /^(\d{1,6})\s*(ครับ|ค่ะ|คะ|จ้า|นะ|ละ|ล่ะ)?\s*[.!]*$/;
var AI_YES_RE = /^(ใช่|ช่าย|ใช่แล้ว|ถูก|ถูกต้อง|ใช่ครับ|ใช่ค่ะ|ครับ|ค่ะ|โอเค|ok|okay|yes|yep|yeah|y)(\s*(ครับ|ค่ะ|คะ|จ้า|แล้ว|เลย))*\s*[.!]*$/;
var AI_NO_RE = /^(ไม่ใช่|ไม่ช่าย|ผิด|เปล่า|no|nope|not that)(\s*(ครับ|ค่ะ|คะ|จ้า|นะ))*\s*[.!]*$/;
// ความหมายที่เป็นไปได้ของตัวเลขนี้ เรียงจากที่น่าจะเป็นที่สุดตามขนาดตัวเลข
function ความหมายที่เป็นไปได้(n) {
	var out = [];
	if (n >= 20) out.push("budget");
	if (n <= 30) out.unshift("people");
	if (n >= 100) out.push("distance");
	if (n >= 5 && n <= 120) out.push("minutes");
	return out.filter(function(k, i, a) { return a.indexOf(k) === i; });
}
function ใช้ความหมายตัวเลข(kind, n) {
	if (kind === "budget") คำขอ.budget = { min: null, max: n };
	else if (kind === "people") คำขอ.people = Math.max(1, Math.min(30, n));
	else if (kind === "distance") คำขอ.near = n;
	else if (kind === "minutes") คำขอ.minutes = n;
}
function ข้อความความหมาย(kind, n) { return t("ai.num_opt_" + kind).replace("{n}", n); }
function ถามยืนยันตัวเลข(n, kind) {
	คำขอ.pendingNumber = { n: n, kind: kind, tried: (คำขอ.pendingNumber && คำขอ.pendingNumber.n === n ? คำขอ.pendingNumber.tried : []).concat([kind]) };
	บันทึกสถานะแชท();
	หน่วงแล้ว(function() {
		var q = t("ai.num_ask_" + kind).replace("{n}", n);
		addBotBubble(q);
		เก็บประวัติแชท("model", q);
		renderChoiceChips([t("ai.yes"), t("ai.no")]);
	});
}
// คืน true ถ้าจัดการข้อความนี้แล้ว (ตัวเลขเปล่า / ตอบยืนยันตัวเลข)
function จัดการตัวเลขตามบริบท(text) {
	var msg = text.trim().toLowerCase();
	var pn = คำขอ.pendingNumber;
	if (pn) {
		var เลือกจากปุ่ม = ความหมายที่เป็นไปได้(pn.n).filter(function(k) { return msg === ข้อความความหมาย(k, pn.n).toLowerCase(); })[0];
		var คำบอก = /งบ|บาท|ราคา|budget|baht|price/.test(msg) ? "budget" : /คน|people|person/.test(msg) ? "people"
			: /เมตร|ระยะ|ไกล|กม|distance|meter|km/.test(msg) ? "distance" : /นาที|เวลา|minute|time/.test(msg) ? "minutes" : null;
		var kind = AI_YES_RE.test(msg) && pn.kind ? pn.kind : (เลือกจากปุ่ม || (msg.length <= 24 ? คำบอก : null));
		if (kind) {
			คำขอ.pendingNumber = null;
			ใช้ความหมายตัวเลข(kind, pn.n);
			แนะนำร้านตามคำขอ(text, []);
			return true;
		}
		if (AI_NO_RE.test(msg)) {
			// ไม่ใช่ความหมายที่ถาม — ไม่สรุปเอง ถามว่าหมายถึงอะไร พร้อมปุ่มความหมายที่เหลือ
			var เหลือ = ความหมายที่เป็นไปได้(pn.n).filter(function(k) { return pn.tried.indexOf(k) === -1; });
			คำขอ.pendingNumber = { n: pn.n, kind: null, tried: pn.tried };
			บันทึกสถานะแชท();
			หน่วงแล้ว(function() {
				var q = t("ai.num_ask_open").replace("{n}", pn.n);
				addBotBubble(q);
				เก็บประวัติแชท("model", q);
				renderChoiceChips(เหลือ.map(function(k) { return ข้อความความหมาย(k, pn.n); }));
			});
			return true;
		}
		คำขอ.pendingNumber = null; // ผู้ใช้พิมพ์เรื่องอื่นแทน — เลิกรอคำตอบเรื่องตัวเลข แล้วประมวลผลข้อความใหม่ตามปกติ
	}
	var m = msg.match(AI_BARE_NUMBER_RE);
	if (!m) return false;
	var n = parseInt(m[1], 10);
	// บริบทชัด: แอปเพิ่งถามข้อนั้นอยู่ / เคยระบุงบไว้แล้วและตัวเลขดูเป็นราคา → ใช้เลยไม่ต้องถาม
	if (คำขอ.stage === "asking" && (คำขอ.pending === "budget" || คำขอ.pending === "people")) {
		ใช้ความหมายตัวเลข(คำขอ.pending, n);
		แนะนำร้านตามคำขอ(text, []);
		return true;
	}
	if (คำขอ.budget && คำขอ.budget !== "any" && n >= 20) {
		ใช้ความหมายตัวเลข("budget", n);
		แนะนำร้านตามคำขอ(text, []);
		return true;
	}
	var ตัวเลือก = ความหมายที่เป็นไปได้(n);
	if (!ตัวเลือก.length) return false;
	ถามยืนยันตัวเลข(n, ตัวเลือก[0]);
	return true;
}
// ขอเปลี่ยนไปแนวอาหารอื่น (ไม่ใช่แค่ร้านอื่นในแนวเดิม)
var AI_CHANGE_CAT_RE = /เปลี่ยนแนว|แนวอื่น|คนละแนว|เบื่อแนว|other (kind|type|cuisine)/;
// อยากลองของใหม่ ๆ (ยังไม่ระบุว่าแนวเดิมหรือแนวใหม่) → ถามสั้น ๆ ก่อน 1 ข้อ
var AI_NEW_THING_RE = /อะไรใหม่|ลองของใหม่|ไม่เคยกิน|ยังไม่เคยลอง|try something new/;
var AI_FOOD_RE = /กิน|หิว|ร้าน|เมนู|อาหาร|แนะนำ|มื้อ|ข้าว|eat|hungry|food|restaurant|meal|craving/;
var AI_SLOT_ORDER = ["cat", "taste", "people", "budget"];
var AI_SAME_RE = /แบบเดิม|เหมือนเดิม|เหมือนครั้งก่อน|same as last|same again/;

function lang() { return getLang() === "th" ? "th" : "en"; }
// rejected = id ร้านที่ผู้ใช้ปฏิเสธในคำขอนี้ (ห้ามแนะนำซ้ำ) / avoidCat = แนวที่ผู้ใช้ขอเปลี่ยนหนี (ไม่โชว์เป็นตัวเลือก)
function newRequest() {
	return { cat: null, taste: null, people: null, budget: null, near: null, minutes: null, keyword: null, pending: null, stage: "idle", rejected: [], avoidCat: null, features: [], avoidFeatures: [], pendingNumber: null };
}
var _savedAi = getSavedChatState();
var คำขอ = Object.assign(newRequest(), _savedAi.request || {});
var ร้านที่เพิ่งแนะนำ = _savedAi.lastResultIds || [];
// เวลาที่ได้รับข้อความล่าสุดจากผู้ใช้ (ใช้จับเวลาหมดเซสชัน) — ชื่อตัวแปรคงไว้ตามเดิมเพื่อไม่กระทบโค้ดส่วนอื่น
var แชทเริ่มเมื่อ = _savedAi.lastUserAt || _savedAi.startedAt || null;

/* =====================================================================
   ความจำของชิมชิม (ระยะยาว) — จำว่าผู้ใช้ชอบแนวไหน/รสไหน/ไปกี่คน/งบเท่าไหร่ + เคยแนะนำร้านอะไรไปแล้ว
   แยกตามผู้ใช้ (คนละบัญชีไม่เห็นความจำกัน) ไม่หายตอนแชทรีเซ็ตทุก 20 นาที และไม่หายตอนออกจากระบบ
   ใช้ 4 ที่: ทักทายตอนเริ่มแชทใหม่ / ปุ่ม "แบบเดิมเลย" / ดันตัวเลือกที่เคยเลือกบ่อยขึ้นก่อน (⭐) / ส่งให้ AI รู้บริบท
   ===================================================================== */
var AI_MEMORY_PREFIX = "chimchim_ai_memory_";
var AI_MEMORY_SESSIONS_MAX = 10;
function ai_memoryKey() {
	var s = getSession();
	return AI_MEMORY_PREFIX + (s ? s.id : "guest");
}
function ai_emptyMemory() {
	return { cats: {}, tastes: {}, people: {}, budgets: {}, lastRequest: null, sessions: [] };
}
function โหลดความจำ() {
	try {
		return Object.assign(ai_emptyMemory(), JSON.parse(localStorage.getItem(ai_memoryKey())) || {});
	} catch (e) {
		return ai_emptyMemory();
	}
}
function บันทึกความจำ(m) {
	try {
		localStorage.setItem(ai_memoryKey(), JSON.stringify(m));
	} catch (e) {}
}
// จัดกลุ่มจำนวนคน/งบให้ตรงกับปุ่มคำตอบ จะได้รู้ว่าปุ่มไหนคือ "ที่เลือกบ่อย"
function กลุ่มจำนวนคน(n) {
	if (!n || n === "any") return null;
	return n === 1 ? "1" : (n === 2 ? "2" : (n <= 4 ? "3-4" : "5+"));
}
function กลุ่มงบ(b) {
	if (!b) return null;
	if (b === "any") return "any";
	if (b.max && b.max <= 100 && !b.min) return "low";
	if (b.min && b.min >= 200 && !b.max) return "high";
	if (b.min === 100 && b.max === 200) return "mid";
	return null;
}
function นับเพิ่ม(obj, key) {
	if (!key) return;
	obj[key] = (obj[key] || 0) + 1;
}
function ที่เลือกบ่อยสุด(obj) {
	var best = null;
	Object.keys(obj || {}).forEach(function(k) {
		if (best === null || obj[k] > obj[best]) best = k;
	});
	return best;
}
// เรียกทุกครั้งที่แนะนำร้านสำเร็จ
function จำคำขอนี้(req, items) {
	var m = โหลดความจำ();
	if (req.cat && req.cat !== "any") นับเพิ่ม(m.cats, req.cat.th);
	if (req.taste && req.taste !== "any") นับเพิ่ม(m.tastes, req.taste);
	นับเพิ่ม(m.people, กลุ่มจำนวนคน(req.people));
	นับเพิ่ม(m.budgets, กลุ่มงบ(req.budget));
	m.lastRequest = { cat: req.cat, taste: req.taste, people: req.people, budget: req.budget, near: req.near };
	m.sessions.unshift({
		date: new Date().toISOString(),
		summary: สรุปคำขอ(req),
		shops: items.slice(0, 3).map(function(x) { return x.ข้อมูล.ร้าน; })
	});
	m.sessions = m.sessions.slice(0, AI_MEMORY_SESSIONS_MAX);
	บันทึกความจำ(m);
}
// สรุปความจำเป็นข้อความสั้น ๆ ส่งให้ AI ใช้ต่อยอดบทสนทนา (เฉพาะข้อเท็จจริงที่เคยเกิดขึ้นจริงในแอป)
function สรุปความจำสำหรับAI() {
	var m = โหลดความจำ();
	if (!m.sessions.length) return null;
	var parts = [];
	var cat = ที่เลือกบ่อยสุด(m.cats);
	var taste = ที่เลือกบ่อยสุด(m.tastes);
	var ppl = ที่เลือกบ่อยสุด(m.people);
	if (cat) parts.push("แนวที่ขอบ่อยสุด: " + cat + " (" + m.cats[cat] + " ครั้ง)");
	if (taste) parts.push("รสที่ชอบ: " + taste);
	if (ppl) parts.push("มักไปกิน: " + (ppl === "1" ? "คนเดียว" : ppl + " คน"));
	var recent = m.sessions.slice(0, 3).map(function(s) {
		var d = new Date(s.date);
		return (d.getDate() + "/" + (d.getMonth() + 1)) + " ขอ " + (s.summary || "อะไรก็ได้") + (s.shops.length ? " → แนะนำ " + s.shops.join(", ") : "");
	});
	if (recent.length) parts.push("ครั้งก่อน ๆ: " + recent.join(" | "));
	return parts.join("; ");
}

/* --- เซสชันแชทหมดอายุเมื่อผู้ใช้ไม่ส่งข้อความติดต่อกันครบ 10 นาที (นับจากข้อความล่าสุดของผู้ใช้เสมอ
   ส่งข้อความใหม่ก่อนครบ = เริ่มนับใหม่) — จับเวลาด้วยนาฬิการะบบ ไม่ให้ AI เดา
   หมดเซสชัน = ล้างบริบทชั่วคราว (ข้อความ ประวัติที่ส่งให้ AI เงื่อนไขที่คุยค้าง ร้านที่เคยเสนอ/ปฏิเสธ)
   แต่ไม่ลบความชอบถาวร (ความจำความชอบด้านบน + Food DNA ในโปรไฟล์) --- */
var AI_CHAT_RESET_MS = 10 * 60 * 1000;
function แชทหมดอายุ() {
	return !!(แชทเริ่มเมื่อ && Date.now() - แชทเริ่มเมื่อ > AI_CHAT_RESET_MS);
}
function ล้างแชทเริ่มใหม่() {
	บทสนทนาที่บันทึกไว้ = [];
	ประวัติแชท = [];
	คำขอ = newRequest();
	ร้านที่เพิ่งแนะนำ = [];
	แนะนำไปแล้วในแชทนี้ = [];
	แชทเริ่มเมื่อ = null;
	นอกเรื่องติดกัน = 0;
	ปฏิเสธติดกัน = 0;
	บันทึกสถานะแชท();
	if (aiChatBody) aiChatBody.innerHTML = "";
}

// ตัวเลือกที่มีร้านจริงรองรับเท่านั้น (ไม่โชว์ปุ่มที่กดแล้วไม่เจอร้านเลย)
// ชิมชิมค้นเฉพาะร้านในพื้นที่ที่เลือก (ปุ่มบนแถบบน)
function ร้านทั้งหมดที่ค้นได้() { return typeof ร้านในพื้นที่ === "function" ? ร้านในพื้นที่() : รายการร้าน; }
function หมวดที่มีร้านจริง() {
	var ร้าน = ร้านทั้งหมดที่ค้นได้();
	return AI_CAT_RULES.filter(function(rule) {
		return ร้าน.some(function(r) { return rule.cats.indexOf(r.หมวด) !== -1; });
	});
}
function รสที่มีร้านจริง() {
	var ร้าน = ร้านทั้งหมดที่ค้นได้();
	return AI_TASTE_RULES.filter(function(rule) {
		return ร้าน.some(function(r) { return (r.รส || []).indexOf(rule.th) !== -1; });
	});
}

// อ่านข้อความหนึ่งข้อความ → ข้อมูลที่บอกมา (ช่องไหนไม่ได้พูดถึงจะไม่มีใน object)
function แยกคำขอจากข้อความ(text) {
	var msg = text.toLowerCase();
	var out = {};
	var i;
	for (i = 0; i < AI_CAT_RULES.length; i++) {
		if (AI_CAT_RULES[i].re.test(msg)) { out.cat = { th: AI_CAT_RULES[i].th, en: AI_CAT_RULES[i].en, cats: AI_CAT_RULES[i].cats }; break; }
	}
	// ตัดคำว่า "ของหวาน" ออกก่อนจับรส ไม่งั้นพิมพ์ "ของหวาน" (หมวด) แล้วโดนนับเป็นรส "หวาน" ไปด้วย
	var msgForTaste = msg.replace(/ของหวาน/g, "");
	for (i = 0; i < AI_TASTE_RULES.length; i++) {
		if (AI_TASTE_RULES[i].re.test(msgForTaste)) { out.taste = AI_TASTE_RULES[i].th; break; }
	}
	// ตัวเลขที่มีหน่วยชัดเจน — แยกก่อนอ่านงบ ไม่งั้น "ไม่เกิน 2 กม." ถูกอ่านเป็นงบ ฿2
	var km = msg.match(/(\d+(?:\.\d+)?)\s*(กม\.?|กิโลเมตร|กิโล|km)/);
	var meter = msg.match(/(\d+)\s*(เมตร|ม\.(?!ค|ก)|meters?|m\b)/);
	var minute = msg.match(/(\d+)\s*(นาที|mins?|minutes?)/);
	if (km) out.near = Math.round(parseFloat(km[1]) * 1000);
	else if (meter) out.near = parseInt(meter[1], 10);
	if (out.near) out.nearExact = true;
	if (minute) out.minutes = parseInt(minute[1], 10);
	msg = msg.replace(/(\d+(?:\.\d+)?)\s*(กม\.?|กิโลเมตร|กิโล|km|เมตร|ม\.(?!ค|ก)|meters?|m\b|นาที|mins?|minutes?)/g, " ");

	var ppl = msg.match(/(\d+)\s*(คน|people|ppl|persons?)/);
	if (ppl) out.people = Math.max(1, Math.min(30, parseInt(ppl[1], 10)));
	else if (/คนเดียว|just me|alone|solo/.test(msg)) out.people = 1;
	else if (/กับแฟน|สองคน|two of us/.test(msg)) out.people = 2;

	var range = msg.match(/(\d+)\s*-\s*(\d+)\s*(บาท|฿|baht)/);
	var over = msg.match(/(\d+)\s*(บาท|฿|baht)\s*(ขึ้นไป|\+)|over\s*(\d+)/);
	var under = msg.match(/ไม่เกิน\s*(\d+)|under\s*(\d+)|(\d+)\s*(บาท|฿|baht)|งบ\s*(\d+)|฿\s*(\d+)|budget\s*(\d+)/);
	if (range) out.budget = { min: +range[1], max: +range[2] };
	else if (over) out.budget = { min: +(over[1] || over[4]), max: null };
	else if (under) out.budget = { min: null, max: +(under[1] || under[2] || under[3] || under[5] || under[6] || under[7]) };
	// "ไม่แพง" ต้องเช็คก่อนคำว่า "แพง" (เดิมถูกอ่านเป็นงบสูง ฿200 ขึ้นไป — ตรงข้ามกับที่ผู้ใช้ต้องการ)
	else if (/ไม่แพง|ประหยัด|ถูก|งบน้อย|cheap|not expensive|affordable/.test(msg)) out.budget = { min: null, max: 100 };
	else if (/จัดเต็ม|หรู|แพง|fancy/.test(msg)) out.budget = { min: 200, max: null };
	else if (/ไม่จำกัดงบ|งบไม่จำกัด|no budget/.test(msg)) out.budget = "any";

	if (out.near) { /* ระบุระยะเป็นตัวเลขแล้ว */ }
	else if (/ไม่ไกล|not far/.test(msg)) { out.near = 2000; out.nearExact = false; }
	else if (/ใกล้|near|nearby|close by/.test(msg)) { out.near = 1000; out.nearExact = false; }
	return out;
}
/* --- ขอของเจาะจง ("อยากกินชาบู", "มีหมูกระทะไหม", "หาร้านปูม้า") → ดึงคำนั้นออกมา แล้วค้นในข้อมูลร้านจริง
   (ชื่อร้าน/เมนู/แท็ก/หมวด/ชาติอาหาร) — มีจริง = หาร้านที่มีของนั้น / ไม่มี = บอกตรง ๆ ว่ายังไม่มี + ถามว่าสนใจแนวอื่นไหม
   ไม่เอาร้านแนวใกล้เคียงมาแทนเอง (เช่น ขออาหารเกาหลี ไม่ยัดร้านสเต็กเพราะอยู่กลุ่ม "นานาชาติ" เดียวกัน) --- */
var AI_ASK_TRIGGER_RE = /(?:อยากกิน|อยากได้|อยากลอง|หาร้าน|หา|มีร้าน|มี|แนะนำร้าน|ขอร้าน|ร้าน)\s*(.+)$|(?:want|craving|looking for|find|have any|got any|any)\s+(.+)$/;
var AI_TERM_STOP_RE = /(ไม่เกิน|ภายใน|ราคา|ประมาณ|ระยะ|within|แนะนำ|ที่มี|และ|หรือเปล่า|ไหน|ไหม|มั้ย|มั๊ย|มัย|หน่อย|ครับ|ค่ะ|คะ|จ้า|นะ|สิ|งบ|ใกล้|ไกล|\d|บาท|คน|กับ|ที่ไหน|ร้านไหน|อะไร|ดี|อร่อย|เผ็ด|หวาน|เค็ม|เปรี้ยว|แถว|ตอนนี้|วันนี้|เย็นนี้|พรุ่งนี้|เลย|บ้าง|แบบ|สัก|\?|!|,|\.|\s+(?:near|for|under|with|today|tonight|please))/;
// กลุ่มกว้าง ๆ ที่ใช้การจัดกลุ่มเดิมได้อยู่แล้ว (ไม่ถือเป็นของเจาะจง)
var AI_GENERIC_GROUP_RE = /^(อาหาร)?(นานาชาติ|ต่างชาติ|สุขภาพ|คลีน|ตามสั่ง|เมนูข้าว|เมนูเส้น|ของว่าง|international|healthy)$/;
function แยกสิ่งที่ขอเจาะจง(text) {
	var msg = text.trim().toLowerCase();
	var m = msg.match(AI_ASK_TRIGGER_RE);
	if (!m) return null;
	var term = (m[1] || m[2] || "");
	var cut = term.search(AI_TERM_STOP_RE);
	if (cut !== -1) term = term.slice(0, cut);
	term = term.replace(/^(ร้าน|เมนู|พวก|ประเภท|แนว|some|a|an|the)\s*/, "").trim().replace(/\s*(ที่|แบบ)$/, "").trim();
	if (term.length < 2 || AI_ANY_RE.test(term) || /^(กิน|ข้าวกิน|อาหาร|ของกิน|food|something|place|restaurant)$/.test(term)) return null;
	return term;
}
function ร้านที่มีคำนี้(term) {
	var คำ = [term, term.replace(/^อาหาร/, "")].filter(function(x) { return x.length >= 2; });
	return ร้านทั้งหมดที่ค้นได้().filter(function(r) {
		var ข้อความร้าน = [r.ร้าน, r.เมนู, r.หมวด, r.ชาติอาหาร].concat(r.แท็ก || []).join(" ").toLowerCase();
		return คำ.some(function(k) { return ข้อความร้าน.indexOf(k) !== -1; });
	});
}

/* --- คำถามนอกขอบเขต (ไม่เกี่ยวกับอาหาร/ร้าน) — ตัดสินในเครื่องเฉพาะเคสที่ชัดเจนมาก ๆ เท่านั้น
   ตอบปฏิเสธสั้น ๆ ทันทีโดยไม่เรียก AI (ได้ผลเหมือนเดิมทุกครั้ง แม้ Gemini ล่ม/โควตาหมด และไม่เปลืองโควตา)
   เคสก้ำกึ่งปล่อยให้ AI ตัดสินตาม system prompt (ดู server.js ข้อ 2) — ถ้ามีคำเกี่ยวกับอาหารปนอยู่ จะไม่ถือว่านอกเรื่อง --- */
var AI_OFFTOPIC_RE = /ทำความสะอาด|ถูพื้น|กวาดบ้าน|ซักผ้า|รีดผ้า|ล้างห้องน้ำ|งานบ้าน|จัดบ้าน|การเมือง|เลือกตั้ง|นายกฯ?|รัฐบาล|พรรค|ฟุตบอล|ผลบอล|กีฬา|นักเตะ|พรีเมียร์ลีก|เขียนโค้ด|เขียนโปรแกรม|โปรแกรมมิ่ง|javascript|python|html|css|sql|บั๊ก|debug|หุ้น|ลงทุน|คริปโต|บิทคอยน์|กองทุน|ดอกเบี้ย|ภาษีเงินได้|การบ้าน|แก้สมการ|คณิต|ฟิสิกส์|แฟนทิ้ง|อกหัก|เลิกกับแฟน|ปรึกษาความรัก|ดูดวง|เขียนเรียงความ|แปลภาษา|clean(ing)? (the )?house|politic|election|football|soccer|stock market|invest|crypto|bitcoin|homework|write (a |some )?code|programming|debug/i;
var AI_FOOD_WORD_RE = /กิน|อาหาร|ร้าน|เมนู|หิว|อร่อย|ทำกับข้าว|สูตร|ข้าว|ก๋วยเตี๋ยว|เผ็ด|หวาน|เค็ม|เปรี้ยว|ขนม|เครื่องดื่ม|กาแฟ|ชานม|ชาไทย|ชาเย็น|มื้อ|ปรุง|วัตถุดิบ|eat|food|restaurant|menu|meal|dish|recipe|cook|hungry|snack|drink|coffee/i;
function เป็นคำถามนอกเรื่อง(text) {
	return AI_OFFTOPIC_RE.test(text) && !AI_FOOD_WORD_RE.test(text);
}

/* --- คุณสมบัติร้านที่ผู้ใช้ถามถึง แต่ฐานข้อมูลร้านของแอป "ไม่มีเก็บ" (หรือมีบางร้าน) — ตัดออกจากข้อความก่อนแยกคำขอ
   (เดิม "มีร้านไหนเปิดตอนนี้" ถูกอ่านเป็นของเจาะจงชื่อ "ไหนเปิด" แล้วตอบว่ายังไม่มี) และส่งให้ AI รู้ว่าต้องบอกว่าไม่มีข้อมูล --- */
var AI_ATTR_RULES = [
	{ key: "aircon", re: /ห้องแอร์|มีแอร์|ติดแอร์|แอร์|air ?-?con(ditioning)?|a\/c/i },
	{ key: "seats", re: /ที่นั่ง(เยอะ|เยอะๆ|เยอะ ๆ|เพียงพอ|กว้าง)?|นั่งได้(กี่คน|เยอะ)|ร้านกว้าง|กว้างขวาง|seats?|seating|spacious/i },
	{ key: "openNow", re: /เปิด(อยู่)?ตอนนี้|ตอนนี้เปิด|เปิดอยู่ไหม|เปิดกี่โมง|ปิดกี่โมง|เวลาเปิด|เปิดดึก|open now|opening hours|hours|open late/i },
	{ key: "crowd", re: /คนเยอะไหม|แออัด|คิวยาว|ต้องรอคิว|คนไม่เยอะ|crowded|busy|queue/i },
	{ key: "noise", re: /ไม่เสียงดัง|เสียงดัง|เงียบ ?ๆ?|นั่งคุย|quiet|noisy/i },
	{ key: "atmosphere", re: /บรรยากาศ|ตกแต่ง|นั่งชิล|ร้านสวย|ถ่ายรูปสวย|cozy|atmosphere|vibe|decor/i },
	{ key: "outdoor", re: /กลางแจ้ง|outdoor|ริมน้ำ|ลานกว้าง/i },
	{ key: "parking", re: /ที่จอดรถ|จอดรถ|parking/i }
];
function แยกคุณสมบัติร้าน(text) {
	var asked = [];
	var cleaned = text;
	AI_ATTR_RULES.forEach(function(rule) {
		if (rule.re.test(cleaned)) {
			asked.push(rule.key);
			cleaned = cleaned.replace(new RegExp(rule.re.source, "gi"), " ");
		}
	});
	cleaned = cleaned.replace(/\s*(ที่มี|มี|และ|กับ)\s*(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
	return { asked: asked, cleaned: cleaned };
}
function ชื่อคุณสมบัติ(keys) {
	return keys.map(function(k) { return t("ai.attr_" + k); }).join(", ");
}
// ร้านที่มีเวลาเปิดจริง (เจ้าของร้านกรอกเอง) — เวลาเปิดของร้านตั้งต้นในแอปเป็นข้อมูลตัวอย่าง ห้ามส่งให้ AI ใช้ตอบ
function เวลาเปิดจริง(r) { return r.เวลาเปิดกำหนดเอง || null; }

/* --- ความชอบของผู้ใช้ที่ระบบมีจริง (ส่งให้ AI ใช้ประกอบคำแนะนำ) — ส่งเฉพาะที่มีจริง ไม่ส่งค่าตั้งต้นของระบบ --- */
function ความชอบสำหรับAI() {
	var parts = [];
	var me = typeof getMe === "function" ? getMe() : null;
	if (me && me.foodDNA) {
		var d = me.foodDNA;
		if (d.ชอบชาติอาหาร && d.ชอบชาติอาหาร.length) parts.push("ชอบอาหาร " + d.ชอบชาติอาหาร.join("/"));
		if (d.ชอบหมวด && d.ชอบหมวด.length) parts.push("หมวดที่ชอบ " + d.ชอบหมวด.join("/"));
		if (d.ชอบรส && d.ชอบรส.length) parts.push("รสที่ชอบ " + d.ชอบรส.join("/"));
		if (d.งบเฉลี่ยที่ใช้บ่อย) parts.push("งบปกติราว ฿" + d.งบเฉลี่ยที่ใช้บ่อย + "/มื้อ");
		if (d.ระยะที่ยอมไป) parts.push("ยอมไปได้ไกลราว " + distanceText(d.ระยะที่ยอมไป));
	}
	var liked = (typeof getLikedShops === "function" ? getLikedShops() : []).map(หาร้านจากId).filter(Boolean).slice(0, 5);
	if (liked.length) parts.push("ร้านที่กดถูกใจ: " + liked.map(function(r) { return r.ร้าน; }).join(", "));
	var saved = (typeof getSavedShops === "function" ? getSavedShops() : []).map(หาร้านจากId).filter(Boolean).slice(0, 5);
	if (saved.length) parts.push("ร้านที่บันทึกไว้: " + saved.map(function(r) { return r.ร้าน; }).join(", "));
	return parts.length ? parts.join("; ") : null;
}

// ข้อมูลพอจะแนะนำได้แล้วไหม — ถามเพิ่มเฉพาะตอนจำเป็น (รู้แนวอาหารแล้ว + รู้อย่างอื่นอีกอย่าง หรือผู้ใช้ขอให้แนะนำตรง ๆ)
var AI_DIRECT_ASK_RE = /แนะนำ|หาร้าน|มีร้าน.*(ไหม|มั้ย|บ้าง)|ร้านไหน|ขอร้าน|recommend|suggest|any good|find (a |me )?(place|restaurant)/;
function ข้อมูลพอแล้ว(msg) {
	var รู้แนว = !!(คำขอ.keyword || (คำขอ.cat && คำขอ.cat !== null));
	if (!รู้แนว) return false;
	var อื่น = ["taste", "people", "budget"].filter(function(k) { return คำขอ[k] !== null; }).length + (คำขอ.near ? 1 : 0);
	return อื่น >= 1 || AI_DIRECT_ASK_RE.test(msg);
}

function มีข้อมูลอาหาร(parsed) {
	return !!(parsed.cat || parsed.taste || parsed.people || parsed.budget || parsed.near || parsed.minutes);
}

/* --- คำถามแต่ละข้อ + ปุ่มคำตอบ --- */
function ตัวเลือกของคำถาม(slot) {
	var L = lang();
	var m = โหลดความจำ();
	var opts = [];
	var fav = null;
	if (slot === "cat") {
		var favCat = ที่เลือกบ่อยสุด(m.cats);
		หมวดที่มีร้านจริง().forEach(function(r) {
			if (คำขอ.avoidCat && r.th === คำขอ.avoidCat) return; // แนวที่ผู้ใช้เพิ่งขอเปลี่ยนหนี ไม่เสนอซ้ำ
			if (แนวนี้ถูกปฏิเสธหมดแล้ว(r)) return; // ทุกร้านในแนวนี้ผู้ใช้ปฏิเสธไปแล้ว — กดไปก็ไม่เจออะไรใหม่
			opts.push(r[L]);
			if (r.th === favCat) fav = r[L];
		});
		opts.push(t("ai.optAnything"));
	} else if (slot === "taste") {
		var favTaste = ที่เลือกบ่อยสุด(m.tastes);
		รสที่มีร้านจริง().forEach(function(r) {
			opts.push(r[L]);
			if (r.th === favTaste) fav = r[L];
		});
		opts.push(t("ai.optAnything"));
	} else if (slot === "people") {
		var pMap = { "1": t("ai.optSolo"), "2": t("ai.optTwo"), "3-4": t("ai.optSmallGroup"), "5+": t("ai.optBigGroup") };
		opts = [pMap["1"], pMap["2"], pMap["3-4"], pMap["5+"]];
		fav = pMap[ที่เลือกบ่อยสุด(m.people)] || null;
	} else if (slot === "budget") {
		var bMap = { low: t("ai.optBudgetLow"), mid: t("ai.optBudgetMid"), high: t("ai.optBudgetHigh"), any: t("ai.optBudgetAny") };
		opts = [bMap.low, bMap.mid, bMap.high, bMap.any];
		fav = bMap[ที่เลือกบ่อยสุด(m.budgets)] || null;
	}
	// ตัวเลือกที่เคยเลือกบ่อยสุด ย้ายขึ้นก่อนพร้อม ⭐ (ข้อความยังมีคำเดิมอยู่ ระบบเลยอ่านคำตอบได้ตามปกติ)
	if (fav && opts.indexOf(fav) !== -1) {
		opts.splice(opts.indexOf(fav), 1);
		opts.unshift("⭐ " + fav);
	}
	return opts;
}
function แนวนี้ถูกปฏิเสธหมดแล้ว(rule) {
	var ปฏิเสธ = (คำขอ.rejected || []).map(หาร้านจากId).filter(Boolean);
	if (!ปฏิเสธ.length) return false;
	var ชื่อ = ปฏิเสธ.map(function(r) { return r.ร้าน; });
	var ในแนว = ร้านทั้งหมดที่ค้นได้().filter(function(r) { return rule.cats.indexOf(r.หมวด) !== -1; });
	return ในแนว.length > 0 && ในแนว.every(function(r) { return (คำขอ.rejected || []).indexOf(r.id) !== -1 || ชื่อ.indexOf(r.ร้าน) !== -1; });
}
function ช่องที่ยังไม่รู้() {
	for (var i = 0; i < AI_SLOT_ORDER.length; i++) {
		if (คำขอ[AI_SLOT_ORDER[i]] === null) return AI_SLOT_ORDER[i];
	}
	return null;
}
function renderAnswerChips(slot) {
	aiSuggestRow.innerHTML = "";
	aiSuggestRow.classList.add("is-answers");
	ตัวเลือกของคำถาม(slot).forEach(function(label) {
		var chip = document.createElement("button");
		chip.type = "button";
		chip.className = "chatchip chatchip-answer";
		chip.textContent = label;
		chip.addEventListener("click", function() { ส่งข้อความ(label); });
		aiSuggestRow.appendChild(chip);
	});
	var skip = document.createElement("button");
	skip.type = "button";
	skip.className = "chatchip chatchip-skip";
	skip.textContent = t("ai.optRecommendNow");
	skip.insertAdjacentHTML("beforeend", '<i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>');
	skip.addEventListener("click", function() { ส่งข้อความ(t("ai.optRecommendNow")); });
	aiSuggestRow.appendChild(skip);
}
function แสดงปุ่มตามสถานะ() {
	if (คำขอ.stage === "asking" && คำขอ.pending) {
		renderAnswerChips(คำขอ.pending);
	} else if (คำขอ.stage === "done" && ร้านที่เพิ่งแนะนำ.length) {
		// หลังแนะนำแล้ว ตอบคำถามต่อเนื่องเสร็จ ปุ่มถามต่อ (ใกล้สุด/ถูกสุด/ตรงใจสุด/เริ่มใหม่) ยังอยู่ให้กดต่อได้
		แสดงปุ่มหลังแนะนำ();
	} else {
		aiSuggestRow.classList.remove("is-answers");
		renderQuickSuggestions();
	}
}
function ถามข้อต่อไป(slot) {
	คำขอ.pending = slot;
	คำขอ.stage = "asking";
	var q = (slot === "cat" && คำขอ.people >= 6) ? t("ai.ask_cat_group").replace("{n}", คำขอ.people) : t(slot === "cat" ? "ai.askVague" : "ai.ask_" + slot);
	// ทวนสิ่งที่รู้แล้วสั้น ๆ ข้อแรกที่ถาม ให้รู้ว่าชิมชิมจำได้ (เช่น "ญี่ปุ่น เผ็ด จดไว้แล้วนะ!")
	addBotBubble(q);
	เก็บประวัติแชท("model", q);
	บันทึกสถานะแชท();
	renderAnswerChips(slot);
}

/* --- สรุปคำขอเป็นข้อความ (ใช้ทั้งข้อความตอบกลับในเครื่องและส่งให้ AI เป็นบริบท) --- */
function สรุปคำขอ(req) {
	var L = lang();
	var parts = [];
	if (req.keyword) parts.push("“" + req.keyword + "”");
	if (req.cat && req.cat !== "any") parts.push(req.cat[L]);
	if (req.taste && req.taste !== "any") {
		var tr = AI_TASTE_RULES.filter(function(r) { return r.th === req.taste; })[0];
		parts.push(L === "th" ? "รส" + req.taste : (tr ? tr.en.toLowerCase() : req.taste));
	}
	if (req.people) parts.push(req.people === 1 ? t("ai.sumSolo") : t("ai.sumPeople").replace("{n}", req.people));
	if (req.budget && req.budget !== "any") {
		var b = req.budget;
		if (b.min && b.max) parts.push(t("ai.sumBudgetRange").replace("{min}", b.min).replace("{max}", b.max));
		else if (b.max) parts.push(t("ai.sumBudgetMax").replace("{n}", b.max));
		else if (b.min) parts.push(t("ai.sumBudgetMin").replace("{n}", b.min));
	}
	if (req.near) parts.push(req.nearExact ? t("ai.sumWithin").replace("{d}", distanceText(req.near)) : t("ai.sumNear"));
	if (req.minutes) parts.push(t("ai.sumMinutes").replace("{n}", req.minutes));
	(req.features || []).forEach(function(k) { parts.push(t("ai.feat_" + k)); });
	(req.avoidFeatures || []).forEach(function(k) { parts.push(t("ai.avoid_" + k)); });
	return parts.join(" · ");
}

/* --- ค้นร้านจริงตามคำขอ — ไม่เจอค่อยผ่อนเงื่อนไขทีละข้อ (รส → งบ → ระยะ) แต่ไม่ทิ้งแนวอาหารที่ขอเด็ดขาด
   ถ้าแนวที่ขอไม่มีร้านเลย คืนว่าง แล้วบอกผู้ใช้ตรง ๆ แทนที่จะยัดร้านอื่นมาให้ --- */
function ค้นร้านตามคำขอ(req, opts) {
	opts = opts || {};
	var ร้านตามคำ = req.keyword ? ร้านที่มีคำนี้(req.keyword).map(function(r) { return r.id; }) : null;
	// ร้านที่ผู้ใช้ปฏิเสธไปแล้ว — ตัดทิ้งทั้ง id และชื่อร้าน (ขอ "ร้านอื่น" ต้องไม่ได้ร้านเดิมที่เป็นเมนูอื่น)
	var ปฏิเสธ = (req.rejected || []).map(หาร้านจากId).filter(Boolean);
	var ชื่อร้านที่ปฏิเสธ = ปฏิเสธ.map(function(r) { return r.ร้าน; });
	var แนวที่เลี่ยง = req.avoidCat ? AI_CAT_RULES.filter(function(rule) { return rule.th === req.avoidCat; })[0] : null;
	function ผ่าน(r, ข้าม) {
		if ((req.rejected || []).indexOf(r.id) !== -1 || ชื่อร้านที่ปฏิเสธ.indexOf(r.ร้าน) !== -1) return false;
		if (แนวที่เลี่ยง && แนวที่เลี่ยง.cats.indexOf(r.หมวด) !== -1) return false; // ผู้ใช้ขอเปลี่ยนแนวหนีแนวนี้
		if (ร้านตามคำ && ร้านตามคำ.indexOf(r.id) === -1) return false;
		if (req.cat && req.cat !== "any" && req.cat.cats.indexOf(r.หมวด) === -1) return false;
		if (!ข้าม.taste && req.taste && req.taste !== "any" && (r.รส || []).indexOf(req.taste) === -1) return false;
		if (!ข้าม.budget && req.budget && req.budget !== "any") {
			if (req.budget.max && r.ราคาต่ำ > req.budget.max) return false;
			if (req.budget.min && r.ราคาสูง < req.budget.min) return false;
		}
		if (!ข้าม.near && req.near && r.ระยะทาง > req.near) return false;
		if (!ข้าม.features && (req.features || []).length && !req.features.every(function(k) { return ร้านมีลักษณะ(r, k); })) return false;
		// สิ่งที่ผู้ใช้บอกว่าไม่เอา ("ไม่กินเผ็ด") — ไม่ผ่อนให้ เพราะเป็นข้อห้ามของผู้ใช้
		if ((req.avoidFeatures || []).some(function(k) { return ร้านมีลักษณะ(r, k); })) return false;
		return true;
	}
	// ผ่อนทีละข้อจนเจอ (บอกผู้ใช้ตรง ๆ ว่าผ่อนข้อไหน) — งบผ่อนเป็นลำดับท้ายสุด เพราะผู้ใช้มักตั้งใจระบุ
	var ลำดับผ่อน = [[], ["taste"], ["features"], ["taste", "features"], ["taste", "features", "near"], ["taste", "features", "near", "budget"]];
	for (var i = 0; i < ลำดับผ่อน.length; i++) {
		var ข้าม = {};
		ลำดับผ่อน[i].forEach(function(k) { ข้าม[k] = true; });
		var เจอ = ร้านทั้งหมดที่ค้นได้().filter(function(r) { return ผ่าน(r, ข้าม); });
		if (เจอ.length) {
			// ร้านที่ยังไม่เคยเสนอในแชทนี้ขึ้นก่อน แล้วค่อยเรียงตาม Match (สุ่มให้ = สลับลำดับในกลุ่มเดียวกันแทน Match)
			var จัดอันดับ = เจอ.map(function(r) { return { ข้อมูล: r, คะแนน: คำนวณMatch(r, foodDNA), สุ่ม: Math.random() }; })
				.sort(function(a, b) {
					var เคยเห็น = (แนะนำไปแล้วในแชทนี้.indexOf(a.ข้อมูล.id) !== -1 ? 1 : 0) - (แนะนำไปแล้วในแชทนี้.indexOf(b.ข้อมูล.id) !== -1 ? 1 : 0);
					if (เคยเห็น) return เคยเห็น;
					if (req.near || req.minutes) return a.ข้อมูล.ระยะทาง - b.ข้อมูล.ระยะทาง; // ขอใกล้/จำกัดเวลาเดินทาง = เรียงใกล้สุดก่อน
					return opts.random ? a.สุ่ม - b.สุ่ม : b.คะแนน - a.คะแนน;
				})
				.slice(0, 5);
			// ข้อไหนที่ต้องผ่อนจริง ๆ (ผู้ใช้ระบุมา แต่ไม่มีร้านตรง) จะบอกผู้ใช้ตรง ๆ
			var ผ่อนจริง = ลำดับผ่อน[i].filter(function(k) { return k === "features" ? (req.features || []).length > 0 : (req[k] && req[k] !== "any"); });
			return { items: จัดอันดับ, relaxed: ผ่อนจริง };
		}
	}
	return { items: [], relaxed: [] };
}

/* --- ตอบคำถามต่อเนื่องเกี่ยวกับร้านที่เพิ่งแนะนำ แบบแม่นยำจากข้อมูลจริง (ไม่ต้องรอ/พึ่ง AI) --- */
function ตอบคำถามเรื่องร้านที่แนะนำ(text) {
	var ร้าน = ร้านที่เพิ่งแนะนำ.map(หาร้านจากId).filter(Boolean);
	if (!ร้าน.length) return null;
	var msg = text.toLowerCase();
	var pick = null;
	var key = null;
	if (/ใกล้สุด|ใกล้ที่สุด|ร้านไหนใกล้|closest|nearest/.test(msg)) {
		pick = ร้าน.slice().sort(function(a, b) { return a.ระยะทาง - b.ระยะทาง; })[0];
		key = "ai.answerClosest";
	} else if (/ถูกสุด|ถูกที่สุด|ประหยัดสุด|ร้านไหนถูก|cheapest/.test(msg)) {
		pick = ร้าน.slice().sort(function(a, b) { return a.ราคาต่ำ - b.ราคาต่ำ; })[0];
		key = "ai.answerCheapest";
	} else if (/ตรงใจสุด|ดีสุด|อร่อยสุด|ร้านไหนดี|แนะนำร้านไหน|best|top pick/.test(msg)) {
		pick = ร้าน.slice().sort(function(a, b) { return คำนวณMatch(b, foodDNA) - คำนวณMatch(a, foodDNA); })[0];
		key = "ai.answerBest";
	}
	if (!pick) return null;
	return t(key)
		.replace("{shop}", pick.ร้าน)
		.replace("{menu}", pick.เมนู)
		.replace("{dist}", distanceText(pick.ระยะทาง))
		.replace("{low}", pick.ราคาต่ำ)
		.replace("{high}", pick.ราคาสูง)
		.replace("{match}", คำนวณMatch(pick, foodDNA));
}

/* -----------------------------------------------------
   ข้อความสำรองตอน AI เรียกไม่ได้ — บอกตรง ๆ ว่าตอบไม่ได้ตอนนี้ ไม่เบี่ยงไปชวนคุยเรื่องกินแทน
   (เดิมสุ่มประโยค "ว่าแต่หิวยัง" ซึ่งทำให้ดูเหมือนไม่ตอบคำถามที่ผู้ใช้ถามจริง ๆ)
----------------------------------------------------- */
function สุ่มข้อความสำรองทั่วไป() {
	return t("ai.cantAnswerNow");
}

var AI_REQUEST_TIMEOUT_MS = 15000;

/* -----------------------------------------------------
   ประวัติแชทที่ส่งย้อนหลังไม่กี่เทิร์นไปให้ Gemini ทุกครั้ง เพื่อให้ "ชิมชิม" จำบริบทบทสนทนาก่อนหน้าได้
   (เช่น คุยเรื่องเผ็ดไปแล้ว รอบถัดมาไม่ต้องถามซ้ำ) เก็บไว้ใน localStorage คู่กับ บทสนทนาที่บันทึกไว้ ด้านบน
   ระหว่างยังไม่ออกจากระบบ (ดู getSavedChatState/บันทึกสถานะแชท) หายเมื่อกดออกจากระบบเท่านั้น
----------------------------------------------------- */
var ประวัติแชท = getSavedChatState().history;
var AI_HISTORY_MAX_TURNS = 12; // 6 คู่ ผู้ใช้+ชิมชิม กันข้อความยาวเกินและกัน quota บาน

function เก็บประวัติแชท(role, text) {
	ประวัติแชท.push({ role: role, text: text });
	if (ประวัติแชท.length > AI_HISTORY_MAX_TURNS) {
		ประวัติแชท = ประวัติแชท.slice(-AI_HISTORY_MAX_TURNS);
	}
	บันทึกสถานะแชท();
}

/* -----------------------------------------------------
   ขอให้ "ชิมชิม" (Gemini) พูดคำตอบจริง ๆ ออกมา แทนที่จะใช้ข้อความสำเร็จรูปเดิม
   ส่งเฉพาะผลลัพธ์ที่คำนวณจริงแล้วไปให้ (ชื่อร้าน/เมนู/Match %/ราคา) กันไม่ให้ AI มั่วร้านขึ้นมาเอง
   ถ้าเรียกไม่ได้ จะคืนค่า null แล้วผู้เรียกใช้ข้อความสำเร็จรูปเดิมแทน
----------------------------------------------------- */
// URL จริงกำหนดไว้ใน chimchim-ai-config.js (สลับ localhost/production อัตโนมัติ) — ต้องโหลดไฟล์นั้นก่อนไฟล์นี้เสมอ
var AI_CHAT_REPLY_URL = (typeof CHIMCHIM_AI_CHAT_URL !== "undefined") ? CHIMCHIM_AI_CHAT_URL : "http://localhost:8787/api/chat-reply";

// mode: "recommend" = เพิ่งหาร้านตามคำขอเสร็จ / "followup" = ถามต่อเรื่องร้านที่แนะนำไปแล้ว / "chat" = คุยทั่วไป
function ขอคำตอบจากชิมชิม(text, ผลลัพธ์, mode, extra) {
	extra = extra || {};
	var people = คำขอ.people || 1;
	var results = (ผลลัพธ์ || []).map(function(item) {
		var r = item.ข้อมูล;
		return {
			name: r.เมนู,
			shop: r.ร้าน,
			match: item.คะแนน,
			priceLow: r.ราคาต่ำ,
			priceHigh: r.ราคาสูง,
			category: r.หมวด,
			tastes: r.รส || [],
			distance: distanceText(r.ระยะทาง),
			cuisine: r.ชาติอาหาร || null,
			area: r.มหาลัย || null,
			meals: r.มื้อที่เหมาะ || [],
			hours: เวลาเปิดจริง(r),
			desc: r.คำโปรยกำหนดเอง || null,
			// ราคารวมโดยประมาณตามจำนวนคน คำนวณจากราคาจริง (AI จะได้ไม่ต้องคิดเลขเองแล้วพลาด)
			groupTotal: people > 1 ? ("฿" + (r.ราคาต่ำ * people) + "–" + (r.ราคาสูง * people) + " / " + people + " คน") : null
		};
	});
	var context = {
		mode: mode,
		request: สรุปคำขอ(คำขอ) || null,
		people: คำขอ.people || null,
		relaxed: extra.relaxed || [],
		asked: (extra.asked || []).map(function(k) { return t("ai.attr_" + k); }),
		another: !!extra.another,
		rejected: extra.rejected || [],
		missing: extra.missing || null,
		broadenedFrom: extra.broadenedFrom || null,
		area: (typeof getSelectedArea === "function" && getSelectedArea()) || null,
		prefs: ความชอบสำหรับAI(),
		memory: สรุปความจำสำหรับAI(),
		lang: lang()
	};
	var controller = ("AbortController" in window) ? new AbortController() : null;
	var timer = controller ? setTimeout(function() { controller.abort(); }, AI_REQUEST_TIMEOUT_MS) : null;

	return fetch(AI_CHAT_REPLY_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message: text, results: results, history: ประวัติแชท, context: context }),
		signal: controller ? controller.signal : undefined
	}).then(function(res) {
		if (timer) clearTimeout(timer);
		if (!res.ok) throw new Error("bad status " + res.status);
		return res.json();
	}).then(function(data) {
		return data && data.reply ? data.reply : null;
	}).catch(function() {
		return null;
	});
}

/* -----------------------------------------------------
   ส่งข้อความ (ทั้งจากพิมพ์เองและกดปุ่มแนะนำ) แล้วให้ "ชิมชิม" ตอบกลับพร้อมการ์ดร้าน
----------------------------------------------------- */
/* --- ชิมชิม "คิด" 1-2 วิ ก่อนตอบทุกครั้ง (โชว์ ••• กำลังพิมพ์) ให้รู้สึกว่าตั้งใจหาร้านที่ตรงที่สุดจริง ๆ
   ไม่ใช่เด้งคำตอบทันทีแบบบอท — ระหว่างนี้กดส่งซ้ำไม่ได้ กันข้อความซ้อนกันจนคำถาม/คำตอบสลับลำดับ --- */
var AI_THINK_MIN_MS = 1000;
var AI_THINK_MAX_MS = 2000;
var กำลังคิด = false;
function รอคิด() {
	var ms = AI_THINK_MIN_MS + Math.random() * (AI_THINK_MAX_MS - AI_THINK_MIN_MS);
	return new Promise(function(resolve) { setTimeout(resolve, ms); });
}
function เริ่มคิด() {
	กำลังคิด = true;
	aiChatWrap && aiChatWrap.classList.add("is-thinking");
	aiSuggestRow.innerHTML = "";
	addTyping();
}
function คิดเสร็จ() {
	removeTyping();
	กำลังคิด = false;
	aiChatWrap && aiChatWrap.classList.remove("is-thinking");
}
// ตอบแบบไม่ต้องเรียก AI (ถามข้อต่อไป / ตอบจากข้อมูลจริงในเครื่อง) ก็ยังรอคิดก่อนเหมือนกัน
function หน่วงแล้ว(fn) {
	เริ่มคิด();
	รอคิด().then(function() {
		คิดเสร็จ();
		fn();
	});
}

function ส่งข้อความ(text) {
	if (กำลังคิด) return;
	text = text.trim();
	if (!text) return;
	// แชทเกิน 20 นาทีแล้ว (และไม่ได้กำลังถามค้าง) → เริ่มแชทใหม่ก่อน แต่ความจำความชอบยังอยู่
	// เงียบไปครบ 10 นาทีแล้ว → ข้อความนี้เริ่มเซสชันใหม่ ไม่ใช้บริบทเก่าตีความ / ยังไม่ครบ → เริ่มนับ 10 นาทีใหม่จากข้อความนี้
	if (แชทหมดอายุ()) ล้างแชทเริ่มใหม่();
	แชทเริ่มเมื่อ = Date.now();
	if (typeof logEvent === "function") logEvent("ai_chat_message_sent", {});
	addUserBubble(text);
	aiChatInput.value = "";
	ปรับความสูงช่องพิมพ์();
	เก็บประวัติแชท("user", text);

	// นอกขอบเขตชัดเจน → ปฏิเสธสั้น ๆ (ครั้งถัดไปติดกันใช้ประโยคสั้นลง) ไม่ล้างสิ่งที่คุยเรื่องอาหารค้างไว้
	if (เป็นคำถามนอกเรื่อง(text)) {
		var ซ้ำ = นอกเรื่องติดกัน > 0;
		นอกเรื่องติดกัน++;
		หน่วงแล้ว(function() {
			var ข้อความ = t(ซ้ำ ? "ai.offTopicAgain" : "ai.offTopic");
			addBotBubble(ข้อความ);
			เก็บประวัติแชท("model", ข้อความ);
			// ขอโทษแล้วจบ — ไม่ขึ้นปุ่มชวนคุย (คงปุ่มไว้เฉพาะตอนมีคำถามค้างที่ผู้ใช้ยังต้องตอบ)
			if (คำขอ.stage === "asking" && คำขอ.pending) แสดงปุ่มตามสถานะ(); else aiSuggestRow.innerHTML = "";
		});
		return;
	}
	นอกเรื่องติดกัน = 0;

	// ตัวเลขสั้น ๆ / ตอบยืนยันความหมายตัวเลข — ตีความจากบริบทก่อนข้อความอื่น
	if (จัดการตัวเลขตามบริบท(text)) return;

	// ผู้ใช้ไม่ต้องการคำแนะนำตอนนี้ → ตอบรับสั้น ๆ แล้วจบ (ไม่แนะนำเพิ่ม ไม่ถามต่อ ไม่โชว์ปุ่มชวนคุย) ปฏิเสธซ้ำ = "เข้าใจแล้วครับ"
	if (AI_DECLINE_RE.test(text.trim().toLowerCase())) {
		var ปฏิเสธซ้ำ = ปฏิเสธติดกัน > 0;
		ปฏิเสธติดกัน++;
		คำขอ = newRequest();
		ร้านที่เพิ่งแนะนำ = [];
		หน่วงแล้ว(function() {
			var ข้อความ = t(ปฏิเสธซ้ำ ? "ai.declineAgain" : "ai.declineAck");
			addBotBubble(ข้อความ);
			เก็บประวัติแชท("model", ข้อความ);
			บันทึกสถานะแชท();
			aiSuggestRow.innerHTML = "";
		});
		return;
	}
	ปฏิเสธติดกัน = 0;

	// ถามคุณสมบัติร้านที่ระบบไม่มีข้อมูล (แอร์/ที่นั่ง/เปิดตอนนี้ ฯลฯ) → ตัดออกก่อนอ่านคำขอ แล้วให้ AI บอกตรง ๆ ว่าไม่มีข้อมูลข้อไหน
	var คุณสมบัติ = แยกคุณสมบัติร้าน(text);
	var ถามคุณสมบัติ = คุณสมบัติ.asked;
	var msg = คุณสมบัติ.cleaned.toLowerCase();
	// ลักษณะอาหารจากภาษาพูด (ทอด/กรอบ แซ่บ ซดน้ำ หนัก ๆ กินง่าย ไม่เลี่ยน ทะเล) + สิ่งที่ผู้ใช้บอกว่าไม่เอา
	var ลักษณะ = แยกลักษณะอาหาร(msg);
	// "อยากกิน…/หา…/ขอ…กิน" = บอกความอยากใหม่ทั้งชุด → ล้างแนว/รส/ลักษณะเดิม (คงงบ ระยะ จำนวนคนไว้)
	// "มีแบบ…ไหม" "ขอแบบ…" "ไม่เกิน 150" "ขอร้านใกล้ ๆ" = ต่อยอดจากคำขอเดิม
	var ความอยากใหม่ = /^(วันนี้|ตอนนี้|เย็นนี้|พรุ่งนี้)?\s*(อยากกิน|อยากได้|หิว|หา(ร้าน|อะไร)?กิน|i want|i'?m craving|craving)/.test(msg) && !/^(มีแบบ|ขอแบบ|เอาแบบ)/.test(msg);
	if (ความอยากใหม่ && คำขอ.stage === "done") {
		คำขอ.cat = null; คำขอ.keyword = null; คำขอ.taste = null; คำขอ.features = []; คำขอ.avoidCat = null; คำขอ.avoidFeatures = [];
	}

	// เริ่มหาใหม่ทั้งหมด (ปุ่ม "เริ่มหาใหม่" / เปลี่ยนใจ) → ล้างเงื่อนไขแล้วถามใหม่ (จัดการต่อด้านล่างเหมือนเดิม)
	var รีเซ็ตทั้งหมด = AI_RESET_RE.test(msg);

	// "อยากลองอะไรใหม่ ๆ" → ถามสั้น ๆ 1 ข้อ: แนวเดิมแต่ร้านที่ยังไม่เคยลอง หรือเปลี่ยนไปคนละแนว
	if (!รีเซ็ตทั้งหมด && AI_NEW_THING_RE.test(msg) && !มีข้อมูลอาหาร(แยกคำขอจากข้อความ(msg))) {
		หน่วงแล้ว(function() {
			var q = t("ai.askNewThing");
			addBotBubble(q);
			เก็บประวัติแชท("model", q);
			renderChoiceChips([t("ai.newSameCat"), t("ai.newOtherCat")]);
		});
		return;
	}
	// ตอบจากปุ่มข้างบน: แนวเดิม (แนวที่ขอบ่อยสุดจากความจำ) แต่ไม่เอาร้านที่เคยแนะนำไปแล้ว
	if (msg === t("ai.newSameCat").toLowerCase()) {
		var จำ = โหลดความจำ();
		var แนวโปรด = ที่เลือกบ่อยสุด(จำ.cats);
		var กฎแนว = AI_CAT_RULES.filter(function(r) { return r.th === แนวโปรด; })[0];
		คำขอ = newRequest();
		var เคยแนะนำ = [];
		จำ.sessions.forEach(function(ss) { (ss.shops || []).forEach(function(name) { เคยแนะนำ.push(name); }); });
		คำขอ.rejected = ร้านทั้งหมดที่ค้นได้().filter(function(r) { return เคยแนะนำ.indexOf(r.ร้าน) !== -1; }).map(function(r) { return r.id; });
		if (!กฎแนว) { // ยังไม่เคยขอแนวไหนเลย → ไม่มี "แนวเดิม" ให้อ้าง ถามแนวแทน
			หน่วงแล้ว(function() { ถามข้อต่อไป("cat"); });
			return;
		}
		คำขอ.cat = { th: กฎแนว.th, en: กฎแนว.en, cats: กฎแนว.cats };
		แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ, { another: true });
		return;
	}

	// ขอตัวเลือกอื่น ("เอาใหม่", "มีร้านอื่นไหม", "ถูกกว่านี้", "เปลี่ยนแนว" …) — ตีความจากบริบทก่อนหน้า ไม่เริ่มบทสนทนาใหม่
	if (!รีเซ็ตทั้งหมด && AI_ANOTHER_RE.test(msg)) {
		ขอตัวเลือกอื่น(text, msg, ถามคุณสมบัติ);
		return;
	}

	// "อะไรก็ได้" / "สุ่มเลย" ตอนยังไม่ได้ถามอะไรค้างอยู่ → เลือกจากร้านจริงให้เลย (เคารพเงื่อนไขที่เคยบอกไว้)
	if (!คำขอ.pending && msg.length <= 24 && (AI_ANY_RE.test(msg) || /สุ่ม|random/.test(msg)) && !มีข้อมูลอาหาร(แยกคำขอจากข้อความ(msg))) {
		if (!คำขอ.cat) คำขอ.cat = "any";
		แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ, { random: true });
		return;
	}

	// ถามต่อเรื่องร้านที่เพิ่งแนะนำ (ใกล้สุด/ถูกสุด/ตรงใจสุด) → ตอบจากข้อมูลจริงทันที
	// เช็คก่อนอ่านเงื่อนไข ไม่งั้นคำว่า "ใกล้"/"ถูก" ในคำถามจะถูกเข้าใจผิดเป็นคำขอหาร้านใหม่
	if (คำขอ.stage === "done" && !ถามคุณสมบัติ.length) {
		var ตอบเอง = ตอบคำถามเรื่องร้านที่แนะนำ(text);
		if (ตอบเอง) {
			หน่วงแล้ว(function() { ตอบเป็นข้อความ(ตอบเอง); });
			return;
		}
	}

	// "แบบเดิมเลย" → ใช้คำขอครั้งล่าสุดจากความจำ แล้วแนะนำทันทีไม่ต้องถามใหม่
	var ความจำ = โหลดความจำ();
	if (AI_SAME_RE.test(msg) && ความจำ.lastRequest) {
		คำขอ = Object.assign(newRequest(), ความจำ.lastRequest);
		แนะนำร้านตามคำขอ(text);
		return;
	}

	var parsed = แยกคำขอจากข้อความ(msg);
	// "ไม่กินเผ็ด" — คำว่าเผ็ดในประโยคปฏิเสธ ไม่ใช่รสที่อยากได้ (เดิมถูกอ่านเป็นรสเผ็ด)
	if (ลักษณะ.avoid.indexOf("spicy") !== -1 && parsed.taste === "เผ็ด") delete parsed.taste;
	if (ลักษณะ.avoid.length) {
		คำขอ.avoidFeatures = รวมลักษณะ(คำขอ.avoidFeatures, ลักษณะ.avoid);
		คำขอ.features = (คำขอ.features || []).filter(function(k) { return ลักษณะ.avoid.indexOf(k) === -1; });
		if (ลักษณะ.avoid.indexOf("spicy") !== -1 && คำขอ.taste === "เผ็ด") คำขอ.taste = null;
	}
	var skip = AI_SKIP_RE.test(msg);
	var รีเซ็ต = AI_RESET_RE.test(msg);

	// อยากกินอย่างอื่น/เริ่มใหม่ → ล้างคำขอเดิม แล้วถามใหม่ตั้งแต่ต้น (เก็บเฉพาะที่เพิ่งบอกมาในข้อความนี้)
	if (รีเซ็ต) {
		คำขอ = newRequest();
		ร้านที่เพิ่งแนะนำ = [];
	}
	// กำลังถามข้อไหนอยู่ แล้วผู้ใช้ตอบ "อะไรก็ได้" → ข้อนั้นไม่เกี่ยง
	if (คำขอ.stage === "asking" && คำขอ.pending && parsed[คำขอ.pending] === undefined && AI_ANY_RE.test(msg)) {
		parsed[คำขอ.pending] = "any";
	}
	// "เริ่มหาใหม่" ไม่ใช่การขอของเจาะจงชื่อ "ใหม่" (เดิมตอบว่า "ยังไม่มี ใหม่")
	var ขอเจาะจง = รีเซ็ต ? null : แยกสิ่งที่ขอเจาะจง(msg);
	// ของที่ขอมีลักษณะอาหารปนอยู่ (เช่น "ของทอดกรอบ", "ไก่ทอด"): ถ้าไม่มีร้านตรงคำนั้นจริง ไม่ตอบแค่ "ยังไม่มี"
	// แต่แนะนำร้านที่มีลักษณะนั้นแทน (บอกตรง ๆ ว่าเมนูเจาะจงนั้นยังไม่มี ถ้าคำนั้นเจาะจงจริง ไม่ใช่คำกว้าง ๆ)
	var ไม่มีเมนูนี้ = null;
	if (ขอเจาะจง && ลักษณะ.keys.length && !ร้านที่มีคำนี้(ขอเจาะจง).length) {
		var เหลือ = แยกลักษณะอาหาร(ขอเจาะจง).cleaned.replace(/ของ|อะไร|แบบ|อาหาร|เมนู|ๆ|\s/g, "");
		if (เหลือ.length >= 2) ไม่มีเมนูนี้ = ขอเจาะจง;
		ขอเจาะจง = null;
	}
	// คำที่ดึงออกมาตรงกับแนวอาหารที่มีร้านอยู่แล้ว (เช่น "ก๋วยเตี๋ยว") → ใช้แนวอาหารนั้นค้นแทน ไม่ต้องตอบว่ายังไม่มี
	var แนวนี้มีร้าน = parsed.cat && ร้านทั้งหมดที่ค้นได้().some(function(r) { return parsed.cat.cats.indexOf(r.หมวด) !== -1; });
	if (ขอเจาะจง && แนวนี้มีร้าน && !ร้านที่มีคำนี้(ขอเจาะจง).length) ขอเจาะจง = null;
	// แนวที่ขอ (เช่น อาหารเกาหลี) ไม่มีร้านเลย → ให้ข้อความ "ยังไม่มีร้านแนวนี้" ด้านล่างตอบด้วยชื่อแนวที่สะอาด
	if (ขอเจาะจง && parsed.cat && !แนวนี้มีร้าน && !ร้านที่มีคำนี้(ขอเจาะจง).length) ขอเจาะจง = null;
	if (ขอเจาะจง) {
		if (ร้านที่มีคำนี้(ขอเจาะจง).length) {
			// มีของนี้จริง → ค้นด้วยคำนั้นตรง ๆ (ไม่ต้องถามแนวอาหารซ้ำ)
			คำขอ.keyword = ขอเจาะจง;
			parsed.cat = "any";
		} else if (!(parsed.cat && AI_GENERIC_GROUP_RE.test(ขอเจาะจง))) {
			// ไม่มีในระบบ → บอกตรง ๆ แล้วถามว่าสนใจแนวอื่นไหม (เก็บข้อมูลอื่นที่บอกมาไว้ เช่น จำนวนคน/งบ)
			delete parsed.cat;
			Object.keys(parsed).forEach(function(k) { คำขอ[k] = parsed[k]; });
			คำขอ.keyword = null;
			คำขอ.cat = null;
			คำขอ.pending = "cat";
			คำขอ.stage = "asking";
			หน่วงแล้ว(function() {
				var ข้อความ = t("ai.notAvailable").replace("{what}", ขอเจาะจง) + หมายเหตุคุณสมบัติ(ถามคุณสมบัติ);
				addBotBubble(ข้อความ);
				เก็บประวัติแชท("model", ข้อความ);
				บันทึกสถานะแชท();
				renderAnswerChips("cat");
			});
			return;
		}
	} else if (parsed.cat) {
		คำขอ.keyword = null;
	}
	var ตอบคำถามที่ถามอยู่ = คำขอ.stage === "asking" && คำขอ.pending && parsed[คำขอ.pending] !== undefined;
	Object.keys(parsed).forEach(function(k) { คำขอ[k] = parsed[k]; });
	if (parsed.cat) คำขอ.avoidCat = null; // เลือกแนวใหม่แล้ว เลิกซ่อนแนวที่เคยขอเปลี่ยนหนี
	// ลักษณะอาหาร: ต่อยอดจากเดิม (เช่น "ไก่ทอด" → "มีแบบเผ็ดไหม") / เปลี่ยนแนวใหม่โดยไม่บอกลักษณะ = ล้างลักษณะเดิม
	if (ลักษณะ.keys.length) {
		คำขอ.features = (คำขอ.stage === "done" && !parsed.cat && !ขอเจาะจง) ? รวมลักษณะ(คำขอ.features, ลักษณะ.keys) : ลักษณะ.keys.slice();
	} else if ((parsed.cat && parsed.cat !== "any") || ขอเจาะจง) {
		คำขอ.features = [];
	}

	var เรื่องกิน = มีข้อมูลอาหาร(parsed) || ลักษณะ.keys.length > 0 || ลักษณะ.avoid.length > 0 || ถามคุณสมบัติ.length > 0 || AI_FOOD_RE.test(msg) || skip || รีเซ็ต;

	// แนวอาหารที่ขอไม่มีร้านในระบบเลย → บอกทันที แล้วให้เลือกแนวใหม่ (ไม่ถามต่อจนครบแล้วค่อยบอกว่าไม่มี)
	if (parsed.cat && parsed.cat !== "any" && !ร้านทั้งหมดที่ค้นได้().some(function(r) { return parsed.cat.cats.indexOf(r.หมวด) !== -1; })) {
		var ไม่มีแนว = parsed.cat[lang()];
		คำขอ.cat = null;
		// ยังมีความต้องการอื่นที่ใช้หาร้านได้ (เช่น "ไก่ทอด" = ของทอด) → บอกว่าแนวนั้นยังไม่มี แล้วแนะนำทางเลือกที่มีจริงเลย ไม่ถามกลับ
		if (พอแนะนำได้(ถามคุณสมบัติ)) {
			แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ, { missing: ไม่มีเมนูนี้ || ไม่มีแนว });
			return;
		}
		if (คำขอ.stage === "done") คำขอ.stage = "asking";
		หน่วงแล้ว(function() {
			var ข้อความ = t("ai.noShopForCat").replace("{what}", ไม่มีแนว) + หมายเหตุคุณสมบัติ(ถามคุณสมบัติ);
			addBotBubble(ข้อความ);
			เก็บประวัติแชท("model", ข้อความ);
			ถามข้อต่อไป("cat");
		});
		return;
	}

	// 1) ถามต่อเรื่องร้านที่เพิ่งแนะนำ (ไม่ได้ขอแนวใหม่) → ให้ AI ตอบจากข้อมูลร้านชุดเดิม
	if (คำขอ.stage === "done" && !มีข้อมูลอาหาร(parsed) && !ลักษณะ.keys.length && !ลักษณะ.avoid.length && !skip && !รีเซ็ต && !ขอเจาะจง && !ไม่มีเมนูนี้) {
		var ร้านเดิม = ร้านที่เพิ่งแนะนำ.map(หาร้านจากId).filter(Boolean).map(function(r) { return { ข้อมูล: r, คะแนน: คำนวณMatch(r, foodDNA) }; });
		ให้AIตอบ(text, ร้านเดิม, ถามคุณสมบัติ.length ? "attributes" : "followup", {
			asked: ถามคุณสมบัติ,
			fallback: ถามคุณสมบัติ.length ? หมายเหตุคุณสมบัติจากร้าน(ถามคุณสมบัติ, ร้านเดิม).trim().replace(/^ส่วน/, "") : null
		});
		return;
	}

	// 2) กำลังถามอยู่ แต่ผู้ใช้พิมพ์เรื่องอื่น/ถามคำถามกลับมา → ตอบคำถามนั้นให้ตรงก่อน แล้วค่อยกลับมาถามข้อเดิม
	if (คำขอ.stage === "asking" && !ตอบคำถามที่ถามอยู่ && !มีข้อมูลอาหาร(parsed) && !ลักษณะ.keys.length && !ลักษณะ.avoid.length && !ถามคุณสมบัติ.length && !skip) {
		ให้AIตอบ(text, [], "chat", { thenAsk: คำขอ.pending });
		return;
	}

	// 3) คุยทั่วไปที่ไม่เกี่ยวกับการหาของกิน → ตอบเรื่องนั้นตรง ๆ
	if (คำขอ.stage === "idle" && !เรื่องกิน) {
		ให้AIตอบ(text, [], "chat");
		return;
	}

	// 4) เรื่องหาของกิน → มีสัญญาณพอแนะนำได้ (แนว/รส/ลักษณะ/งบ/ระยะ/จำนวนคน/คุณสมบัติร้าน) แนะนำทันทีแล้วจบ
	//    คลุมเครือจริง ๆ (เช่น "อยากกินอะไรสักอย่าง") ถึงถามสั้น ๆ 1 ข้อ — ถามไปแล้วจะรอคำตอบ ไม่ถามซ้ำเอง
	if (!skip && !พอแนะนำได้(ถามคุณสมบัติ) && คำขอ.stage !== "done") {
		if (คำขอ.stage === "asking" && คำขอ.pending) { แสดงปุ่มตามสถานะ(); return; }
		หน่วงแล้ว(function() { ถามข้อต่อไป("cat"); });
		return;
	}
	if (skip && !คำขอ.cat) คำขอ.cat = "any";
	แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ, { missing: ไม่มีเมนูนี้, random: skip && !(คำขอ.cat && คำขอ.cat !== "any") });
}

// มีข้อมูลพอให้แนะนำได้เลยไหม (ไม่บังคับครบทุกช่องแบบเดิม — ข้อใดข้อหนึ่งก็พอ)
function พอแนะนำได้(ถามคุณสมบัติ) {
	return !!(คำขอ.cat || คำขอ.keyword || (คำขอ.taste && คำขอ.taste !== "any") || (คำขอ.features || []).length ||
		(คำขอ.budget && คำขอ.budget !== "any") || คำขอ.near || คำขอ.minutes || คำขอ.people || (คำขอ.avoidFeatures || []).length || (ถามคุณสมบัติ && ถามคุณสมบัติ.length));
}

var นอกเรื่องติดกัน = 0;

/* --- คำตอบแนะนำแบบไม่พึ่ง AI (ใช้ตอน AI ใช้ไม่ได้/โควตาหมด) — ตอบตรงความต้องการด้วยร้าน/เมนูจริง 2–3 รายการแล้วจบ
   ไม่ปิดท้ายด้วยคำถาม บอกตามจริงเมื่อเมนูที่ขอไม่มี / ต้องผ่อนเงื่อนไข / ไม่มีข้อมูลคุณสมบัติร้านที่ถาม --- */
// "ร้านยำ…" ไม่ต้องเติม "ร้าน" ซ้ำ / ชื่อภาษาอังกฤษเว้นวรรค ("ร้าน MOM KITCHEN")
function ชื่อร้านอ่านง่าย(name) {
	if (lang() !== "th") return name;
	if (/^ร้าน/.test(name)) return name;
	return "ร้าน" + (/^[A-Za-z0-9]/.test(name) ? " " : "") + name;
}
function สร้างคำตอบแนะนำ(ผล, สรุป, o) {
	o = o || {};
	var รายการ = ผล.items.slice(0, 3).map(function(x) {
		var r = x.ข้อมูล;
		return t("ai.recItem").replace("{menu}", r.เมนู).replace("{shop}", ชื่อร้านอ่านง่าย(r.ร้าน)).replace("{low}", r.ราคาต่ำ).replace("{high}", r.ราคาสูง);
	}).join(", ");
	var ส่วน = [];
	if (o.missing) ส่วน.push(t("ai.missingMenu").replace("{what}", o.missing));
	if (o.broadenedFrom) ส่วน.push(t("ai.anotherBroadened").replace("{what}", o.broadenedFrom));
	if (o.another && !o.broadenedFrom) ส่วน.push(t("ai.recAnother").replace("{list}", รายการ));
	else ส่วน.push((สรุป ? t("ai.recFor").replace("{summary}", สรุป) : t("ai.recPlain")).replace("{list}", รายการ));
	if (ผล.relaxed.length) ส่วน.push(t("ai.relaxedNote").replace("{what}", ผล.relaxed.map(function(k) { return t("ai.slotName_" + k); }).join(", ")));
	var ข้อความ = ส่วน.join(" ");
	return ข้อความ + หมายเหตุคุณสมบัติจากร้าน(o.asked, ผล.items);
}

/* --- ขอตัวเลือกอื่นตามบริบท ---
   มีร้านที่เพิ่งแนะนำ → ปฏิเสธชุดนั้น (ไม่แนะนำซ้ำ) แล้วค้นใหม่ด้วยเงื่อนไขเดิม + เงื่อนไขใหม่ที่พิมพ์มาพร้อมกัน
   "ถูกกว่านี้" / "ใกล้กว่านี้" = ปรับงบ/ระยะจากชุดที่เพิ่งเห็นจริง / "เปลี่ยนแนว" = ถามแนวใหม่ (ไม่เสนอแนวเดิม)
   ยังไม่มีบริบทเลย → ถามแนวอาหารสั้น ๆ 1 ข้อ พร้อมปุ่มให้แตะ (รวมปุ่มสุ่มให้) */
function ขอตัวเลือกอื่น(text, msg, ถามคุณสมบัติ) {
	var ล่าสุด = ร้านที่เพิ่งแนะนำ.map(หาร้านจากId).filter(Boolean);
	var parsed = แยกคำขอจากข้อความ(msg.replace(/ถูกกว่านี้|ถูกกว่านั้น|ใกล้กว่านี้|ใกล้กว่านั้น/g, " "));
	Object.keys(parsed).forEach(function(k) { คำขอ[k] = parsed[k]; });
	var ลักษณะใหม่ = แยกลักษณะอาหาร(msg).keys;
	if (ลักษณะใหม่.length) คำขอ.features = รวมลักษณะ(คำขอ.features, ลักษณะใหม่);
	// "ถูกกว่านี้/ใกล้กว่านี้" = ปรับเงื่อนไขจากชุดที่เพิ่งเห็น (ไม่ใช่ปฏิเสธร้าน) / ตัวเลขที่ผู้ใช้พิมพ์มาเองชนะค่าที่คำนวณ
	var แค่ปรับเงื่อนไข = /ถูกกว่า|ใกล้กว่า|cheaper|closer/.test(msg) && !/เอาใหม่|ขอใหม่|อย่างอื่น|ร้านอื่น|อันอื่น|อีกอัน|อีกร้าน|ไม่เอา|เมนูอื่น|ตัวเลือกอื่น|another|other/.test(msg);
	if (ล่าสุด.length && /ถูกกว่า|cheaper/.test(msg) && !parsed.budget) {
		คำขอ.budget = { min: null, max: Math.max(1, Math.min.apply(null, ล่าสุด.map(function(r) { return r.ราคาต่ำ; })) - 1) };
	}
	if (ล่าสุด.length && /ใกล้กว่า|closer/.test(msg) && !parsed.near) {
		คำขอ.near = Math.max(50, Math.min.apply(null, ล่าสุด.map(function(r) { return r.ระยะทาง; })) - 1);
		คำขอ.nearExact = true;
	}
	if (แค่ปรับเงื่อนไข) {
		แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ);
		return;
	}
	var อยากเปลี่ยนแนว = AI_CHANGE_CAT_RE.test(msg) && !parsed.cat;
	var มีบริบท = ล่าสุด.length > 0 || !!(คำขอ.cat && คำขอ.cat !== "any") || !!คำขอ.keyword || (คำขอ.features || []).length > 0;

	// เปลี่ยนแนว: ไม่ถามกลับ — ตัดแนวเดิมออกแล้วเสนอแนวอื่นที่ยังตรงงบ/ระยะ/ลักษณะเดิมให้เลย
	if (อยากเปลี่ยนแนว && มีบริบท) {
		var แนวเดิม = (คำขอ.cat && คำขอ.cat !== "any") ? คำขอ.cat
			: (ล่าสุด.length ? AI_CAT_RULES.filter(function(rule) { return rule.cats.indexOf(ล่าสุด[0].หมวด) !== -1; })[0] : null);
		คำขอ.avoidCat = แนวเดิม ? แนวเดิม.th : null;
		คำขอ.rejected = (คำขอ.rejected || []).concat(ร้านที่เพิ่งแนะนำ).filter(function(id, i, a) { return a.indexOf(id) === i; });
		คำขอ.cat = "any";
		คำขอ.keyword = null;
		แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ, { another: true });
		return;
	}
	// ยังไม่มีร้านให้เทียบ แต่ข้อความนี้บอกเงื่อนไขมาแล้ว (เช่น "ขอใกล้กว่านั้น 500 เมตร") → แนะนำตามเงื่อนไขนั้นเลย ไม่ถามกลับ
	if (!มีบริบท && พอแนะนำได้(ถามคุณสมบัติ)) {
		แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ);
		return;
	}
	if (!มีบริบท) {
		คำขอ.avoidCat = (อยากเปลี่ยนแนว && คำขอ.cat && คำขอ.cat !== "any") ? คำขอ.cat.th : null;
		if (ล่าสุด.length) คำขอ.rejected = (คำขอ.rejected || []).concat(ร้านที่เพิ่งแนะนำ);
		คำขอ.cat = null;
		คำขอ.keyword = null;
		คำขอ.pending = "cat";
		คำขอ.stage = "asking";
		หน่วงแล้ว(function() {
			var q = t(อยากเปลี่ยนแนว ? "ai.askOtherCat" : "ai.askAnotherNoCtx");
			addBotBubble(q);
			เก็บประวัติแชท("model", q);
			บันทึกสถานะแชท();
			renderAnswerChips("cat");
		});
		return;
	}
	if (ล่าสุด.length) {
		คำขอ.rejected = (คำขอ.rejected || []).concat(ร้านที่เพิ่งแนะนำ).filter(function(id, i, a) { return a.indexOf(id) === i; });
	}
	แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ, { another: true });
}
// ปุ่มตัวเลือกสั้น ๆ (ไม่ผูกกับช่องคำถาม) — แตะแล้วส่งข้อความนั้นเข้าระบบเดิม
function renderChoiceChips(labels) {
	aiSuggestRow.innerHTML = "";
	aiSuggestRow.classList.add("is-answers");
	labels.forEach(function(label) {
		var chip = document.createElement("button");
		chip.type = "button";
		chip.className = "chatchip chatchip-answer";
		chip.textContent = label;
		chip.addEventListener("click", function() { ส่งข้อความ(label); });
		aiSuggestRow.appendChild(chip);
	});
}
// ถามคุณสมบัติที่ระบบไม่มีข้อมูล แนบท้ายข้อความตอบสำเร็จรูป (ตอนไม่ได้ให้ AI พูด)
function หมายเหตุคุณสมบัติ(keys) {
	return keys && keys.length ? " " + t("ai.attrNoData").replace("{what}", ชื่อคุณสมบัติ(keys)) : "";
}
// หมายเหตุท้ายคำแนะนำเรื่องคุณสมบัติร้านที่ผู้ใช้ถาม — เวลาเปิดบอกได้เฉพาะที่เจ้าของร้านกรอกจริง ข้ออื่นแจ้งว่ายังไม่มีข้อมูล
function หมายเหตุคุณสมบัติจากร้าน(keys, items) {
	if (!keys || !keys.length) return "";
	var ส่วน = [];
	if (keys.indexOf("openNow") !== -1) {
		var มีเวลา = items.filter(function(x) { return เวลาเปิดจริง(x.ข้อมูล); });
		ส่วน.push(มีเวลา.length
			? t("ai.hoursKnown").replace("{list}", มีเวลา.slice(0, 3).map(function(x) { return x.ข้อมูล.ร้าน + " (" + เวลาเปิดจริง(x.ข้อมูล) + ")"; }).join(", "))
			: t("ai.hoursUnknown"));
	}
	var ไม่มีข้อมูล = keys.filter(function(k) { return k !== "openNow"; });
	if (ไม่มีข้อมูล.length) ส่วน.push(t("ai.attrNoData").replace("{what}", ชื่อคุณสมบัติ(ไม่มีข้อมูล)));
	return " " + ส่วน.join(" ");
}

function ตอบเป็นข้อความ(ข้อความ) {
	addBotBubble(ข้อความ);
	เก็บประวัติแชท("model", ข้อความ);
	แสดงปุ่มตามสถานะ();
}

function ให้AIตอบ(text, ร้าน, mode, opts) {
	opts = opts || {};
	เริ่มคิด();
	// รอทั้งคำตอบจาก AI และเวลาคิดขั้นต่ำ (AI ตอบไวก็ยังรอให้ครบ 1-2 วิ)
	Promise.all([ขอคำตอบจากชิมชิม(text, ร้าน, mode, { asked: opts.asked }), รอคิด()]).then(function(v) {
		var reply = v[0];
		คิดเสร็จ();
		var ข้อความ = reply || opts.fallback || สุ่มข้อความสำรองทั่วไป();
		var ตอบไม่ได้ = !reply && !opts.fallback;
		addBotBubble(ข้อความ);
		เก็บประวัติแชท("model", ข้อความ);
		if (opts.thenAsk) {
			// ตอบเรื่องที่ถามแล้ว — ไม่ส่งคำถามเดิมซ้ำ แค่คงปุ่มคำตอบไว้ให้แตะต่อได้
			คำขอ.pending = opts.thenAsk;
			คำขอ.stage = "asking";
			renderAnswerChips(opts.thenAsk);
		} else if (ตอบไม่ได้ || mode === "chat") {
			// ตอบไม่ได้ = ขอโทษแล้วจบ / คุยเรื่องอาหารทั่วไป = ตอบจบในตัว — ไม่ขึ้นปุ่มชวนคุยต่อ
			// (หลังแนะนำร้านไปแล้ว ปุ่มถามต่อเรื่องร้านชุดเดิมยังคงอยู่ให้ใช้)
			if (คำขอ.stage === "done" && ร้านที่เพิ่งแนะนำ.length) แสดงปุ่มหลังแนะนำ(); else aiSuggestRow.innerHTML = "";
		} else {
			แสดงปุ่มตามสถานะ();
		}
	});
}

function แนะนำร้านตามคำขอ(text, ถามคุณสมบัติ, opts) {
	opts = opts || {};
	ถามคุณสมบัติ = (ถามคุณสมบัติ || []).slice();
	// จำกัดเวลาเดินทาง ("20 นาที") — ระบบไม่มีเวลาเดินทางจริง จึงเรียงร้านใกล้สุดก่อนและบอกตรง ๆ
	if (คำขอ.minutes && ถามคุณสมบัติ.indexOf("travelTime") === -1) ถามคุณสมบัติ.push("travelTime");
	// ไปกันกลุ่มใหญ่ → ให้ AI รู้ว่าผู้ใช้สนใจเรื่องที่นั่ง (ระบบไม่มีข้อมูลนี้ จึงต้องบอกตรง ๆ แทนการเดา)
	if (คำขอ.people >= 6 && ถามคุณสมบัติ.indexOf("seats") === -1) ถามคุณสมบัติ.push("seats");
	คำขอ.pending = null;
	คำขอ.stage = "done";
	var ผล = ค้นร้านตามคำขอ(คำขอ, { random: opts.random });
	// ขอตัวเลือกอื่น แต่แนวเดิมหมดแล้ว → ขยายไปแนวอื่นที่ยังตรงงบ/ระยะ/ลักษณะเดิมให้เลย (ไม่ถามกลับ)
	var ขยายแนวจาก = null;
	if (!ผล.items.length && opts.another && ((คำขอ.cat && คำขอ.cat !== "any") || คำขอ.keyword)) {
		ขยายแนวจาก = (คำขอ.cat && คำขอ.cat !== "any") ? คำขอ.cat[lang()] : คำขอ.keyword;
		คำขอ.cat = "any";
		คำขอ.keyword = null;
		ผล = ค้นร้านตามคำขอ(คำขอ, { random: opts.random });
	}
	ร้านที่เพิ่งแนะนำ = ผล.items.map(function(x) { return x.ข้อมูล.id; });
	ร้านที่เพิ่งแนะนำ.forEach(function(id) { if (แนะนำไปแล้วในแชทนี้.indexOf(id) === -1) แนะนำไปแล้วในแชทนี้.push(id); });
	บันทึกสถานะแชท();
	if (ผล.items.length) จำคำขอนี้(คำขอ, ผล.items);

	if (!ผล.items.length) {
		// แนวที่ขอไม่มีร้านในระบบเลย — บอกตรง ๆ แล้วให้เลือกแนวใหม่ ไม่ยัดร้านอื่นมาแทน
		var what = คำขอ.cat && คำขอ.cat !== "any" ? คำขอ.cat[lang()] : สรุปคำขอ(คำขอ);
		if (opts.another) {
			// ร้านที่ตรงเงื่อนไขเสนอไปครบทุกแนวแล้วจริง ๆ → บอกตามจริง (ไม่วนกลับไปร้านเดิม) พร้อมปุ่มแนวที่ยังเหลือ
			คำขอ.avoidCat = คำขอ.cat && คำขอ.cat !== "any" ? คำขอ.cat.th : null;
			คำขอ.cat = null;
			คำขอ.keyword = null;
			หน่วงแล้ว(function() {
				var ข้อความหมด = t("ai.anotherExhausted").replace("{what}", what || t("ai.thisCondition"));
				addBotBubble(ข้อความหมด);
				เก็บประวัติแชท("model", ข้อความหมด);
				คำขอ.pending = "cat";
				คำขอ.stage = "asking";
				บันทึกสถานะแชท();
				renderAnswerChips("cat");
			});
			return;
		}
		คำขอ.cat = null;
		คำขอ.keyword = null;
		คำขอ.pending = "cat";
		คำขอ.stage = "asking";
		หน่วงแล้ว(function() {
			// บอกตามจริงว่าไม่มีร้านที่ตรงเงื่อนไขชุดนี้ แล้วให้ปรับเงื่อนไขจากปุ่ม (ไม่ถามซ้ำเป็นข้อความ)
			var ข้อความไม่มี = t("ai.noMatch").replace("{what}", what || t("ai.thisCondition")) + หมายเหตุคุณสมบัติ(ถามคุณสมบัติ);
			addBotBubble(ข้อความไม่มี);
			เก็บประวัติแชท("model", ข้อความไม่มี);
			บันทึกสถานะแชท();
			renderAnswerChips("cat");
		});
		return;
	}

	เริ่มคิด();
	Promise.all([ขอคำตอบจากชิมชิม(text, ผล.items, "recommend", { relaxed: ผล.relaxed, asked: ถามคุณสมบัติ, another: !!opts.another, missing: opts.missing || null, broadenedFrom: ขยายแนวจาก, rejected: (คำขอ.rejected || []).map(หาร้านจากId).filter(Boolean).map(function(r) { return r.ร้าน; }) }), รอคิด()]).then(function(v) {
		var reply = v[0];
		คิดเสร็จ();
		var สรุป = สรุปคำขอ(คำขอ);
		var ข้อความ = reply || สร้างคำตอบแนะนำ(ผล, สรุป, { another: opts.another, missing: opts.missing, broadenedFrom: ขยายแนวจาก, asked: ถามคุณสมบัติ });
		addBotBubble(ข้อความ);
		เก็บประวัติแชท("model", ข้อความ);
		setTimeout(function() {
			addResultCards(ผล.items);
			แสดงปุ่มหลังแนะนำ();
		}, 250);
	});
}

// หลังแนะนำ: ปุ่มถามต่อที่ตอบได้แม่นจากข้อมูลจริง + เริ่มหาใหม่
function แสดงปุ่มหลังแนะนำ() {
	aiSuggestRow.innerHTML = "";
	aiSuggestRow.classList.add("is-answers");
	[t("ai.followClosest"), t("ai.followCheapest"), t("ai.followBest"), t("ai.followRestart")].forEach(function(label, idx) {
		var chip = document.createElement("button");
		chip.type = "button";
		chip.className = "chatchip " + (idx === 3 ? "chatchip-skip" : "chatchip-answer");
		chip.textContent = label;
		chip.addEventListener("click", function() { ส่งข้อความ(label); });
		aiSuggestRow.appendChild(chip);
	});
}

aiChatForm.addEventListener("submit", function(e) {
	e.preventDefault();
	if (กำลังคิด) return; // ยังคิดอยู่ — เก็บข้อความในช่องไว้ ให้กดส่งอีกทีหลังชิมชิมตอบ
	ส่งข้อความ(aiChatInput.value);
});

/* -----------------------------------------------------
   เริ่มบทสนทนา — ถ้ามีบทสนทนาเดิมที่ยังไม่ถูกลบ (ยังไม่ออกจากระบบ) เล่นซ้ำให้ดูต่อจากเดิมได้เลย
   ไม่งั้นค่อยเริ่มทักทายใหม่ตามปกติ
----------------------------------------------------- */
if (บทสนทนาที่บันทึกไว้.length && (แชทหมดอายุ() || !แชทเริ่มเมื่อ)) {
	ล้างแชทเริ่มใหม่();
}
setInterval(function() {
	if (แชทหมดอายุ() && !กำลังคิด && บทสนทนาที่บันทึกไว้.length) {
		ล้างแชทเริ่มใหม่();
		addBotBubble(t("ai.startBubble"));
		อัปเดตสถานะแชทว่าง();
		แสดงปุ่มตามสถานะ();
	}
}, 60 * 1000);
if (บทสนทนาที่บันทึกไว้.length) {
	isRestoringChat = true;
	บทสนทนาที่บันทึกไว้.forEach(function(entry) {
		if (entry.type === "user") {
			addUserBubble(entry.text);
		} else if (entry.type === "bot") {
			addBotBubble(entry.text);
		} else if (entry.type === "cards") {
			var restored = entry.items.map(function(it) {
				var ร้าน = หาร้านจากId(it.id);
				return ร้าน ? { ข้อมูล: ร้าน, คะแนน: it.คะแนน } : null;
			}).filter(function(x) { return x; });
			if (restored.length) addResultCards(restored);
		}
	});
	isRestoringChat = false;
} else {
	addBotBubble(t("ai.startBubble"));
}
อัปเดตสถานะแชทว่าง();
if (คำขอ.stage === "done" && ร้านที่เพิ่งแนะนำ.length) {
	แสดงปุ่มหลังแนะนำ();
} else {
	แสดงปุ่มตามสถานะ();
}

// ดึงร้านที่คนอื่นโพสต์ไว้ใน Supabase จริงมาผสานกับ รายการร้าน เงียบ ๆ กันชิมชิมแนะนำร้านไม่ครบ
if (typeof syncShopsWithSupabase === "function") syncShopsWithSupabase();
// ดึงไลก์/ติดตามของตัวเองมาผสาน กันหัวใจ/ปุ่มติดตามในการ์ดร้านไม่ตรงกับที่เคยกดไว้จากเครื่องอื่น
if (typeof syncLikesAndFollowsWithSupabase === "function") syncLikesAndFollowsWithSupabase();
