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
	สุ่มQuickSuggestions(4).forEach(function(s) {
		var chip = document.createElement("button");
		chip.type = "button";
		chip.className = "chatchip";
		chip.textContent = s.text;
		chip.insertAdjacentHTML("beforeend", '<i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>');
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
function บันทึกสถานะแชท() {
	localStorage.setItem(CHIMCHIM_AI_CHAT_KEY, JSON.stringify({ history: ประวัติแชท, log: บทสนทนาที่บันทึกไว้, request: คำขอ, lastResultIds: ร้านที่เพิ่งแนะนำ, startedAt: แชทเริ่มเมื่อ }));
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
function เลื่อนแชทลงล่าง() {
	aiChatBody.scrollTop = aiChatBody.scrollHeight;
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
			'<img src="' + ร้าน.รูป + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
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
	{ re: /นานาชาติ|ต่างชาติ|ฝรั่ง|เกาหลี|จีน|international|korean|chinese/, th: "อาหารนานาชาติ", en: "International", cats: ["อาหารจีน", "อาหารเกาหลี", "อาหารอินเดีย", "อาหารเวียดนาม", "พิซซ่า", "เบอร์เกอร์", "สเต็ก", "Fast Food"] },
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
var AI_ANY_RE = /อะไรก็ได้|แล้วแต่|ไม่จำกัด|ไม่เกี่ยง|ได้หมด|anything|whatever|no limit|any/;
var AI_SKIP_RE = /แนะนำเลย|เลือกให้เลย|ข้ามคำถาม|ข้าม|สุ่มเลย|สุ่มให้|just recommend|skip/;
var AI_RESET_RE = /อย่างอื่น|เปลี่ยนใจ|เริ่มใหม่|หาใหม่|something else|start over/;
var AI_FOOD_RE = /กิน|หิว|ร้าน|เมนู|อาหาร|แนะนำ|มื้อ|ข้าว|eat|hungry|food|restaurant|meal|craving/;
var AI_SLOT_ORDER = ["cat", "taste", "people", "budget"];
var AI_SAME_RE = /แบบเดิม|เหมือนเดิม|เหมือนครั้งก่อน|same as last|same again/;

function lang() { return getLang() === "th" ? "th" : "en"; }
function newRequest() {
	return { cat: null, taste: null, people: null, budget: null, near: null, keyword: null, pending: null, stage: "idle" };
}
var _savedAi = getSavedChatState();
var คำขอ = _savedAi.request || newRequest();
var ร้านที่เพิ่งแนะนำ = _savedAi.lastResultIds || [];
var แชทเริ่มเมื่อ = _savedAi.startedAt || null;

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

/* --- แชทรีเซ็ตทุก 20 นาที (นับจากเริ่มคุย) — หน้าแชทเริ่มใหม่ให้โล่ง แต่ความจำด้านบนยังอยู่ครบ
   ถ้ากำลังถามคำถามค้างอยู่ จะรอให้จบก่อนค่อยรีเซ็ต ไม่ตัดกลางบทสนทนา --- */
var AI_CHAT_RESET_MS = 20 * 60 * 1000;
function แชทหมดอายุ() {
	return !!(แชทเริ่มเมื่อ && Date.now() - แชทเริ่มเมื่อ > AI_CHAT_RESET_MS);
}
function ล้างแชทเริ่มใหม่() {
	บทสนทนาที่บันทึกไว้ = [];
	ประวัติแชท = [];
	คำขอ = newRequest();
	ร้านที่เพิ่งแนะนำ = [];
	แชทเริ่มเมื่อ = null;
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
	var ppl = msg.match(/(\d+)\s*(คน|people|ppl|persons?)/);
	if (ppl) out.people = Math.max(1, Math.min(30, parseInt(ppl[1], 10)));
	else if (/คนเดียว|just me|alone|solo/.test(msg)) out.people = 1;
	else if (/กับแฟน|สองคน|two of us/.test(msg)) out.people = 2;

	var range = msg.match(/(\d+)\s*-\s*(\d+)\s*(บาท|฿|baht)/);
	var over = msg.match(/(\d+)\s*(บาท|฿|baht)\s*(ขึ้นไป|\+)|over\s*(\d+)/);
	var under = msg.match(/ไม่เกิน\s*(\d+)|under\s*(\d+)|(\d+)\s*(บาท|฿|baht)/);
	if (range) out.budget = { min: +range[1], max: +range[2] };
	else if (over) out.budget = { min: +(over[1] || over[4]), max: null };
	else if (under) out.budget = { min: null, max: +(under[1] || under[2] || under[3]) };
	else if (/ประหยัด|ถูก|งบน้อย|cheap/.test(msg)) out.budget = { min: null, max: 100 };
	else if (/จัดเต็ม|หรู|แพง|fancy/.test(msg)) out.budget = { min: 200, max: null };
	else if (/ไม่จำกัดงบ|งบไม่จำกัด|no budget/.test(msg)) out.budget = "any";

	if (/ไม่ไกล|not far/.test(msg)) out.near = 2000;
	else if (/ใกล้|near|nearby|close by/.test(msg)) out.near = 1000;
	return out;
}
/* --- ขอของเจาะจง ("อยากกินชาบู", "มีหมูกระทะไหม", "หาร้านปูม้า") → ดึงคำนั้นออกมา แล้วค้นในข้อมูลร้านจริง
   (ชื่อร้าน/เมนู/แท็ก/หมวด/ชาติอาหาร) — มีจริง = หาร้านที่มีของนั้น / ไม่มี = บอกตรง ๆ ว่ายังไม่มี + ถามว่าสนใจแนวอื่นไหม
   ไม่เอาร้านแนวใกล้เคียงมาแทนเอง (เช่น ขออาหารเกาหลี ไม่ยัดร้านสเต็กเพราะอยู่กลุ่ม "นานาชาติ" เดียวกัน) --- */
var AI_ASK_TRIGGER_RE = /(?:อยากกิน|อยากได้|อยากลอง|หาร้าน|หา|มีร้าน|มี|แนะนำร้าน|ขอร้าน|ร้าน)\s*(.+)$|(?:want|craving|looking for|find|have any|got any|any)\s+(.+)$/;
var AI_TERM_STOP_RE = /(ไหม|มั้ย|มั๊ย|มัย|หน่อย|ครับ|ค่ะ|คะ|จ้า|นะ|สิ|งบ|ใกล้|ไกล|\d|บาท|คน|กับ|ที่ไหน|ร้านไหน|อะไร|ดี|อร่อย|เผ็ด|หวาน|เค็ม|เปรี้ยว|แถว|ตอนนี้|วันนี้|เย็นนี้|พรุ่งนี้|เลย|บ้าง|แบบ|สัก|\?|!|,|\.|\s+(?:near|for|under|with|today|tonight|please))/;
// กลุ่มกว้าง ๆ ที่ใช้การจัดกลุ่มเดิมได้อยู่แล้ว (ไม่ถือเป็นของเจาะจง)
var AI_GENERIC_GROUP_RE = /^(อาหาร)?(นานาชาติ|ต่างชาติ|สุขภาพ|คลีน|ตามสั่ง|เมนูข้าว|เมนูเส้น|ของว่าง|international|healthy)$/;
function แยกสิ่งที่ขอเจาะจง(text) {
	var msg = text.trim().toLowerCase();
	var m = msg.match(AI_ASK_TRIGGER_RE);
	if (!m) return null;
	var term = (m[1] || m[2] || "");
	var cut = term.search(AI_TERM_STOP_RE);
	if (cut !== -1) term = term.slice(0, cut);
	term = term.replace(/^(ร้าน|เมนู|พวก|ประเภท|แนว|some|a|an|the)\s*/, "").trim();
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

function มีข้อมูลอาหาร(parsed) {
	return !!(parsed.cat || parsed.taste || parsed.people || parsed.budget || parsed.near);
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
	var q = t("ai.ask_" + slot);
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
	if (req.near) parts.push(t("ai.sumNear"));
	return parts.join(" · ");
}

/* --- ค้นร้านจริงตามคำขอ — ไม่เจอค่อยผ่อนเงื่อนไขทีละข้อ (รส → งบ → ระยะ) แต่ไม่ทิ้งแนวอาหารที่ขอเด็ดขาด
   ถ้าแนวที่ขอไม่มีร้านเลย คืนว่าง แล้วบอกผู้ใช้ตรง ๆ แทนที่จะยัดร้านอื่นมาให้ --- */
function ค้นร้านตามคำขอ(req) {
	var ร้านตามคำ = req.keyword ? ร้านที่มีคำนี้(req.keyword).map(function(r) { return r.id; }) : null;
	function ผ่าน(r, ข้าม) {
		if (ร้านตามคำ && ร้านตามคำ.indexOf(r.id) === -1) return false;
		if (req.cat && req.cat !== "any" && req.cat.cats.indexOf(r.หมวด) === -1) return false;
		if (!ข้าม.taste && req.taste && req.taste !== "any" && (r.รส || []).indexOf(req.taste) === -1) return false;
		if (!ข้าม.budget && req.budget && req.budget !== "any") {
			if (req.budget.max && r.ราคาต่ำ > req.budget.max) return false;
			if (req.budget.min && r.ราคาสูง < req.budget.min) return false;
		}
		if (!ข้าม.near && req.near && r.ระยะทาง > req.near) return false;
		return true;
	}
	var ลำดับผ่อน = [[], ["taste"], ["taste", "budget"], ["taste", "budget", "near"]];
	for (var i = 0; i < ลำดับผ่อน.length; i++) {
		var ข้าม = {};
		ลำดับผ่อน[i].forEach(function(k) { ข้าม[k] = true; });
		var เจอ = ร้านทั้งหมดที่ค้นได้().filter(function(r) { return ผ่าน(r, ข้าม); });
		if (เจอ.length) {
			var จัดอันดับ = เจอ.map(function(r) { return { ข้อมูล: r, คะแนน: คำนวณMatch(r, foodDNA) }; })
				.sort(function(a, b) { return b.คะแนน - a.คะแนน; })
				.slice(0, 5);
			// ข้อไหนที่ต้องผ่อนจริง ๆ (ผู้ใช้ระบุมา แต่ไม่มีร้านตรง) จะบอกผู้ใช้ตรง ๆ
			var ผ่อนจริง = ลำดับผ่อน[i].filter(function(k) { return req[k] && req[k] !== "any"; });
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
			// ราคารวมโดยประมาณตามจำนวนคน คำนวณจากราคาจริง (AI จะได้ไม่ต้องคิดเลขเองแล้วพลาด)
			groupTotal: people > 1 ? ("฿" + (r.ราคาต่ำ * people) + "–" + (r.ราคาสูง * people) + " / " + people + " คน") : null
		};
	});
	var context = {
		mode: mode,
		request: สรุปคำขอ(คำขอ) || null,
		people: คำขอ.people || null,
		relaxed: extra.relaxed || [],
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
	if (แชทหมดอายุ() && คำขอ.stage !== "asking") ล้างแชทเริ่มใหม่();
	if (!แชทเริ่มเมื่อ) แชทเริ่มเมื่อ = Date.now();
	if (typeof logEvent === "function") logEvent("ai_chat_message_sent", {});
	addUserBubble(text);
	aiChatInput.value = "";
	เก็บประวัติแชท("user", text);

	var msg = text.toLowerCase();

	// ถามต่อเรื่องร้านที่เพิ่งแนะนำ (ใกล้สุด/ถูกสุด/ตรงใจสุด) → ตอบจากข้อมูลจริงทันที
	// เช็คก่อนอ่านเงื่อนไข ไม่งั้นคำว่า "ใกล้"/"ถูก" ในคำถามจะถูกเข้าใจผิดเป็นคำขอหาร้านใหม่
	if (คำขอ.stage === "done") {
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

	var parsed = แยกคำขอจากข้อความ(text);
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
	var ขอเจาะจง = แยกสิ่งที่ขอเจาะจง(text);
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
				var ข้อความ = t("ai.notAvailable").replace("{what}", ขอเจาะจง);
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

	var เรื่องกิน = มีข้อมูลอาหาร(parsed) || AI_FOOD_RE.test(msg) || skip || รีเซ็ต;

	// แนวอาหารที่ขอไม่มีร้านในระบบเลย → บอกทันที แล้วให้เลือกแนวใหม่ (ไม่ถามต่อจนครบแล้วค่อยบอกว่าไม่มี)
	if (parsed.cat && parsed.cat !== "any" && !ร้านทั้งหมดที่ค้นได้().some(function(r) { return parsed.cat.cats.indexOf(r.หมวด) !== -1; })) {
		var ไม่มีแนว = parsed.cat[lang()];
		คำขอ.cat = null;
		if (คำขอ.stage === "done") คำขอ.stage = "asking";
		หน่วงแล้ว(function() {
			var ข้อความ = t("ai.noShopForCat").replace("{what}", ไม่มีแนว);
			addBotBubble(ข้อความ);
			เก็บประวัติแชท("model", ข้อความ);
			ถามข้อต่อไป("cat");
		});
		return;
	}

	// 1) ถามต่อเรื่องร้านที่เพิ่งแนะนำ (ไม่ได้ขอแนวใหม่) → ให้ AI ตอบจากข้อมูลร้านชุดเดิม
	if (คำขอ.stage === "done" && !มีข้อมูลอาหาร(parsed) && !skip && !รีเซ็ต) {
		var ร้านเดิม = ร้านที่เพิ่งแนะนำ.map(หาร้านจากId).filter(Boolean).map(function(r) { return { ข้อมูล: r, คะแนน: คำนวณMatch(r, foodDNA) }; });
		ให้AIตอบ(text, ร้านเดิม, "followup");
		return;
	}

	// 2) กำลังถามอยู่ แต่ผู้ใช้พิมพ์เรื่องอื่น/ถามคำถามกลับมา → ตอบคำถามนั้นให้ตรงก่อน แล้วค่อยกลับมาถามข้อเดิม
	if (คำขอ.stage === "asking" && !ตอบคำถามที่ถามอยู่ && !มีข้อมูลอาหาร(parsed) && !skip) {
		ให้AIตอบ(text, [], "chat", { thenAsk: คำขอ.pending });
		return;
	}

	// 3) คุยทั่วไปที่ไม่เกี่ยวกับการหาของกิน → ตอบเรื่องนั้นตรง ๆ
	if (คำขอ.stage === "idle" && !เรื่องกิน) {
		ให้AIตอบ(text, [], "chat");
		return;
	}

	// 4) เรื่องหาของกิน → ยังมีข้อที่ไม่รู้ ถามต่อ (ยกเว้นกด "แนะนำเลย") / รู้ครบแล้ว หาร้านจริงแล้วแนะนำ
	var ข้อต่อไป = skip ? null : ช่องที่ยังไม่รู้();
	if (ข้อต่อไป && คำขอ.stage !== "done") {
		หน่วงแล้ว(function() { ถามข้อต่อไป(ข้อต่อไป); });
		return;
	}
	แนะนำร้านตามคำขอ(text);
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
	Promise.all([ขอคำตอบจากชิมชิม(text, ร้าน, mode), รอคิด()]).then(function(v) {
		var reply = v[0];
		คิดเสร็จ();
		var ข้อความ = reply || สุ่มข้อความสำรองทั่วไป();
		addBotBubble(ข้อความ);
		เก็บประวัติแชท("model", ข้อความ);
		if (opts.thenAsk) {
			// ตอบเรื่องที่ถามแล้ว กลับมาถามข้อที่ค้างไว้ต่อ (ปุ่มคำตอบเดิมกลับมาให้แตะ)
			ถามข้อต่อไป(opts.thenAsk);
		} else {
			แสดงปุ่มตามสถานะ();
		}
	});
}

function แนะนำร้านตามคำขอ(text) {
	คำขอ.pending = null;
	คำขอ.stage = "done";
	var ผล = ค้นร้านตามคำขอ(คำขอ);
	ร้านที่เพิ่งแนะนำ = ผล.items.map(function(x) { return x.ข้อมูล.id; });
	บันทึกสถานะแชท();
	if (ผล.items.length) จำคำขอนี้(คำขอ, ผล.items);

	if (!ผล.items.length) {
		// แนวที่ขอไม่มีร้านในระบบเลย — บอกตรง ๆ แล้วให้เลือกแนวใหม่ ไม่ยัดร้านอื่นมาแทน
		var what = คำขอ.cat && คำขอ.cat !== "any" ? คำขอ.cat[lang()] : สรุปคำขอ(คำขอ);
		คำขอ.cat = null;
		หน่วงแล้ว(function() {
			addBotBubble(t("ai.noShopForCat").replace("{what}", what));
			เก็บประวัติแชท("model", t("ai.noShopForCat").replace("{what}", what));
			ถามข้อต่อไป("cat");
		});
		return;
	}

	เริ่มคิด();
	Promise.all([ขอคำตอบจากชิมชิม(text, ผล.items, "recommend", { relaxed: ผล.relaxed }), รอคิด()]).then(function(v) {
		var reply = v[0];
		คิดเสร็จ();
		var สรุป = สรุปคำขอ(คำขอ);
		var ข้อความ = reply || (สรุป
			? t("ai.recFound").replace("{summary}", สรุป).replace("{n}", ผล.items.length)
			: t("ai.recFoundNoSummary").replace("{n}", ผล.items.length));
		// ข้อไหนต้องผ่อน (ไม่มีร้านตรงเป๊ะ) บอกให้รู้ตรง ๆ ถ้า AI ไม่ได้พูดถึง
		if (!reply && ผล.relaxed.length) {
			ข้อความ += " " + t("ai.relaxedNote").replace("{what}", ผล.relaxed.map(function(k) { return t("ai.slotName_" + k); }).join(", "));
		}
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
if (บทสนทนาที่บันทึกไว้.length && (แชทหมดอายุ() || !แชทเริ่มเมื่อ) && คำขอ.stage !== "asking") {
	ล้างแชทเริ่มใหม่();
}
setInterval(function() {
	if (แชทหมดอายุ() && !กำลังคิด && คำขอ.stage !== "asking" && บทสนทนาที่บันทึกไว้.length) {
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
