// chimchim-aifinder.js
// หน้า AI Food Finder แบบแชท ให้ความรู้สึกเหมือนคุยกับเพื่อนผ่าน LINE/IG DM
// ผู้ใช้เลือกได้ 2 ทาง: กดตัวเลือกด่วนที่สุ่มขึ้นมาเรื่อย ๆ หรือพิมพ์เองตามธรรมชาติ

var aiChatBody = document.getElementById("aiChatBody");
var aiSuggestRow = document.getElementById("aiSuggestRow");
var aiChatForm = document.getElementById("aiChatForm");
var aiChatInput = document.getElementById("aiChatInput");

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
	var เลือกได้ = คลังQuickSuggest.slice();
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
	สุ่มQuickSuggestions(4).forEach(function(s) {
		var chip = document.createElement("button");
		chip.type = "button";
		chip.className = "chatchip";
		chip.textContent = s.text;
		chip.addEventListener("click", function() {
			ส่งข้อความ(s.text);
		});
		aiSuggestRow.appendChild(chip);
	});
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
	เลื่อนแชทลงล่าง();
}
function addBotBubble(text) {
	var el = document.createElement("div");
	el.className = "chatbubble bot";
	el.textContent = text;
	aiChatBody.appendChild(el);
	เลื่อนแชทลงล่าง();
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
}

/* -----------------------------------------------------
   แปลข้อความอิสระที่ผู้ใช้พิมพ์เอง ให้เป็นเงื่อนไขที่ หาร้านให้ฉัน() เข้าใจ
   (หมวด / งบ / ระยะ / รส) — จับจาก keyword ภาษาไทยที่พบบ่อย
----------------------------------------------------- */
function แปลข้อความเป็นเงื่อนไข(text) {
	var msg = text.toLowerCase();

	var หมวด = "ไม่รู้";
	if (/ญี่ปุ่น|ซูชิ|ซาชิมิ/.test(msg)) หมวด = "ญี่ปุ่น";
	else if (/ของหวาน|ขนม|เค้ก|บิงซู/.test(msg)) หมวด = "ของหวาน";
	else if (/เบอร์เกอร์|ฟาสต์ฟู้ด|fast food|ไก่ทอด/.test(msg)) หมวด = "Fast Food";
	else if (/ก๋วยเตี๋ยว|บะหมี่|ราเมง|เส้น|ผัดไทย/.test(msg)) หมวด = "เส้น";
	else if (/ซุป|แกง|ต้มยำ|ต้มข่า/.test(msg)) หมวด = "ซุป";
	else if (/ข้าว/.test(msg)) หมวด = "ข้าว";
	else if (/เผ็ด/.test(msg)) หมวด = "เผ็ด";

	var งบ = "";
	var budgetMatch = msg.match(/(\d+)\s*บาท/);
	if (budgetMatch) {
		var num = parseInt(budgetMatch[1], 10);
		if (num <= 100) งบ = "ประหยัด";
		else if (num <= 200) งบ = "กำลังดี";
		else งบ = "จัดเต็ม";
	} else if (/ประหยัด|ถูก|งบน้อย/.test(msg)) งบ = "ประหยัด";
	else if (/จัดเต็ม|แพง|หรู/.test(msg)) งบ = "จัดเต็ม";
	else if (/กำลังดี/.test(msg)) งบ = "กำลังดี";

	var ระยะ = "ทุกระยะ";
	if (/ไม่ไกลมาก/.test(msg)) ระยะ = "ไม่ไกลมาก";
	else if (/ใกล้/.test(msg)) ระยะ = "ใกล้ๆ";

	var รส = "ไม่รู้";
	if (/เผ็ด/.test(msg)) รส = "เผ็ด";
	else if (/หวาน/.test(msg)) รส = "หวาน";
	else if (/เค็ม/.test(msg)) รส = "เค็ม";
	else if (/เปรี้ยว/.test(msg)) รส = "เปรี้ยว";

	return { หมวด: หมวด, งบ: งบ, ระยะ: ระยะ, รส: รส };
}

function สร้างข้อความตอบกลับ(cond) {
	var ท่อน = [];
	if (cond.หมวด !== "ไม่รู้") ท่อน.push(cond.หมวด);
	if (cond.รส !== "ไม่รู้") ท่อน.push("รส" + cond.รส);
	if (cond.งบ) ท่อน.push("งบ" + cond.งบ);
	if (ท่อน.length === 0) {
		return "งั้นให้ ChimChim ลองเลือกจาก Food DNA ของคุณดูนะ น่าจะถูกใจอยู่ 🦖";
	}
	return "โอเค เข้าใจละ! อยากได้แนว" + ท่อน.join(" ") + " ใช่ไหม เดี๋ยว ChimChim หามาให้ดูนะ 🦖";
}

/* -----------------------------------------------------
   ข้อความสำรองตอน Gemini เรียกไม่ได้ + ข้อความไม่เกี่ยวกับอาหาร
   แทนที่จะบอกตรง ๆ ว่า "ตอบไม่ได้" ให้คุยเล่นรับคำแล้ววกเข้าเรื่องกินแบบเนียน ๆ เหมือนเพื่อนคุยกัน
   สุ่มหยิบมาสักประโยค กันดูเป็น pattern ซ้ำเดิมทุกครั้ง
----------------------------------------------------- */
function สุ่มข้อความสำรองทั่วไป() {
	var ตัวเลือก = [1, 2, 3, 4];
	var เลือก = ตัวเลือก[Math.floor(Math.random() * ตัวเลือก.length)];
	return t("ai.genericFallback" + เลือก);
}

/* -----------------------------------------------------
   เดาว่าข้อความนี้ "เกี่ยวกับการหาของกิน" ไหม — ใช้ตัดสินใจว่าควรโชว์การ์ดร้านต่อท้ายคำตอบหรือเปล่า
   เพื่อไม่ให้ทุกข้อความ (แม้แต่คำถามทั่วไปที่ไม่เกี่ยวกับอาหาร) โดนยัดการ์ดร้านใส่ให้เหมือนแพตเทิร์นตายตัว
----------------------------------------------------- */
function ดูเหมือนถามเรื่องอาหารไหม(text, cond) {
	if (cond.หมวด !== "ไม่รู้" || cond.งบ !== "" || cond.ระยะ !== "ทุกระยะ" || cond.รส !== "ไม่รู้") return true;
	return /กิน|หิว|แนะนำ|เมนู|ร้าน|สุ่ม|ลอง|อาหาร|ของหวาน/.test(text);
}

var AI_REQUEST_TIMEOUT_MS = 15000;

/* -----------------------------------------------------
   ประวัติแชทของเซสชันนี้ (อยู่แค่ในหน่วยความจำ ไม่เก็บลง localStorage เพื่อความเป็นส่วนตัว
   หายเมื่อรีเฟรชหน้า) — ส่งย้อนหลังไม่กี่เทิร์นไปให้ Gemini ทุกครั้ง เพื่อให้ "ชิมชิม" จำบริบท
   บทสนทนาก่อนหน้าได้ (เช่น คุยเรื่องเผ็ดไปแล้ว รอบถัดมาไม่ต้องถามซ้ำ)
----------------------------------------------------- */
var ประวัติแชท = [];
var AI_HISTORY_MAX_TURNS = 12; // 6 คู่ ผู้ใช้+ชิมชิม กันข้อความยาวเกินและกัน quota บาน

function เก็บประวัติแชท(role, text) {
	ประวัติแชท.push({ role: role, text: text });
	if (ประวัติแชท.length > AI_HISTORY_MAX_TURNS) {
		ประวัติแชท = ประวัติแชท.slice(-AI_HISTORY_MAX_TURNS);
	}
}

/* -----------------------------------------------------
   ขอให้ "ชิมชิม" (Gemini) พูดคำตอบจริง ๆ ออกมา แทนที่จะใช้ข้อความสำเร็จรูปเดิม
   ส่งเฉพาะผลลัพธ์ที่คำนวณจริงแล้วไปให้ (ชื่อร้าน/เมนู/Match %/ราคา) กันไม่ให้ AI มั่วร้านขึ้นมาเอง
   ถ้าเรียกไม่ได้ จะคืนค่า null แล้วผู้เรียกใช้ข้อความสำเร็จรูปเดิมแทน
----------------------------------------------------- */
var AI_CHAT_REPLY_URL = "http://localhost:8787/api/chat-reply";

function ขอคำตอบจากชิมชิม(text, ผลลัพธ์, เกี่ยวกับอาหาร) {
	var results = เกี่ยวกับอาหาร ? ผลลัพธ์.map(function(item) {
		return {
			name: item.ข้อมูล.เมนู,
			shop: item.ข้อมูล.ร้าน,
			match: item.คะแนน,
			priceLow: item.ข้อมูล.ราคาต่ำ,
			priceHigh: item.ข้อมูล.ราคาสูง
		};
	}) : [];
	var controller = ("AbortController" in window) ? new AbortController() : null;
	var timer = controller ? setTimeout(function() { controller.abort(); }, AI_REQUEST_TIMEOUT_MS) : null;

	return fetch(AI_CHAT_REPLY_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message: text, results: results, history: ประวัติแชท }),
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
function ส่งข้อความ(text) {
	text = text.trim();
	if (!text) return;
	if (typeof logEvent === "function") logEvent("ai_chat_message_sent", {});
	addUserBubble(text);
	aiChatInput.value = "";
	renderQuickSuggestions();
	addTyping();

	// ใช้ตัวจับ keyword ในเครื่อง (เร็ว ไม่กิน quota) สำหรับแยกเงื่อนไข แล้วเก็บ quota Gemini
	// ไว้ใช้กับส่วนที่สำคัญที่สุด คือให้ "ชิมชิม" พูดคำตอบจริง ๆ ออกมาแทน (เห็นผลชัดกว่ามาก)
	var cond = แปลข้อความเป็นเงื่อนไข(text);
	var เกี่ยวกับอาหาร = ดูเหมือนถามเรื่องอาหารไหม(text, cond);
	var ผลลัพธ์ = เกี่ยวกับอาหาร ? หาร้านให้ฉัน(cond.หมวด, cond.งบ, cond.ระยะ, cond.รส) : [];
	เก็บประวัติแชท("user", text);
	ขอคำตอบจากชิมชิม(text, ผลลัพธ์, เกี่ยวกับอาหาร).then(function(replyText) {
		removeTyping();
		var ข้อความบอท = replyText || (เกี่ยวกับอาหาร ? สร้างข้อความตอบกลับ(cond) : สุ่มข้อความสำรองทั่วไป());
		addBotBubble(ข้อความบอท);
		เก็บประวัติแชท("model", ข้อความบอท);
		if (เกี่ยวกับอาหาร && ผลลัพธ์.length) {
			setTimeout(function() {
				addResultCards(ผลลัพธ์);
			}, 250);
		}
	});
}

aiChatForm.addEventListener("submit", function(e) {
	e.preventDefault();
	ส่งข้อความ(aiChatInput.value);
});

/* -----------------------------------------------------
   เริ่มบทสนทนา
----------------------------------------------------- */
addBotBubble(t("ai.startBubble"));
renderQuickSuggestions();
