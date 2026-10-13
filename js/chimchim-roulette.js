// chimchim-roulette.js
// ไข่ปริศนาสุ่มร้าน (หน้า roulette.html — แทนวงล้อสุ่มเมนูเดิมในหน้าเดิม)
// แบ่งเป็น 2 ชั้นแยกกันชัดเจน:
//   1) ตรรกะเลือกร้าน (สุ่มตามโหมด 3 แบบเดิม — สูตรถ่วงน้ำหนักเดิมทุกตัวเลข)
//   2) ชั้นแสดงผล/แอนิเมชันไข่ (state machine) — ไม่ยุ่งกับการเลือกร้านเลย แค่ขอผลแล้วเอามาโชว์

/* =====================================================================
   1) ตรรกะเลือกร้าน
   ===================================================================== */

/* -----------------------------------------------------
   โหมดการสุ่ม 3 แบบ: กินตามใจชอบ / ลองสิ่งตรงข้าม / สุ่มมั่ว ๆ
   แต่ละโหมดถ่วงน้ำหนักโอกาสที่แต่ละหมวด (ช่องเดิมของวงล้อ) จะถูกเลือก
   ตามคะแนน Match ของหมวดนั้นกับ Food DNA ผู้ใช้ — สูตรเดิมของวงล้อทุกประการ
----------------------------------------------------- */
var currentRouletteMode = "like";
var rmodeDescKey = { like: "roulette.modeDescLike", opposite: "roulette.modeDescOpposite", mix: "roulette.modeDescMix" };
var rmodeLabelKey = { like: "roulette.modeLike", opposite: "roulette.modeOpposite", mix: "roulette.modeMix" };
function updateRouletteModeDesc() {
	var el = document.getElementById("rmodeDesc");
	if (el) el.textContent = t(rmodeDescKey[currentRouletteMode]);
}

// ช่องเดิมของวงล้อ (วงล้อหมวดอาหาร ใน chimchim-data.js) → หมวดจริงในข้อมูลร้าน
// เดิมช่องวงล้อผูกกับชื่อหมวดที่ไม่ตรงกับข้อมูลร้านจริง (เช่น "เส้น" vs "ก๋วยเตี๋ยว", "ญี่ปุ่น" vs "อาหารญี่ปุ่น")
// วงล้อเลยแทบไม่เคยได้ร้านจริง — ตารางนี้จับคู่ให้ตรง ช่องที่ยังไม่มีร้านจริงในหมวดเลยจะไม่ถูกสุ่ม (ไม่โชว์ผลปลอม)
var หมวดจริงของช่องวงล้อ = {
	"เส้น": ["ก๋วยเตี๋ยว", "เมนูเส้น"],
	"ข้าว": ["อาหารตามสั่ง", "ข้าวแกง"],
	"ซุปแกง": [],
	"ส้มตำยำ": ["ส้มตำ", "ยำ", "อีสาน"],
	"ญี่ปุ่น": ["อาหารญี่ปุ่น"],
	"fastfood": ["Fast Food", "เบอร์เกอร์", "พิซซ่า", "ของทอด"],
	"อิตาเลียน": ["พิซซ่า"],
	"ปิ้งย่าง": ["ปิ้งย่าง", "หม่าล่า"],
	"ของหวาน": ["ของหวาน/เบเกอรี่", "ผลไม้"],
	"มื้อเช้า": [],
	"นานาชาติ": ["สเต็ก", "อาหารจีน", "อาหารเกาหลี", "อาหารอินเดีย", "อาหารเวียดนาม"],
	"ของว่าง": ["ของทอด"]
};
function ร้านจริงในช่อง(cat) {
	var หมวด = หมวดจริงของช่องวงล้อ[cat.key] || [];
	// (ร้านชุมชนที่โดนรายงานจนถูกซ่อน ถูกกรองออกตั้งแต่ตอนรวมเข้า รายการร้าน ใน core.js แล้ว)
	// เฉพาะร้านในพื้นที่ที่เลือก (ปุ่มบนแถบบน) — พื้นที่ที่ยังไม่มีร้าน ได้ร้านใกล้สุดไม่กี่ร้าน
	return (typeof ร้านในพื้นที่ === "function" ? ร้านในพื้นที่() : (typeof รายการร้าน !== "undefined" ? รายการร้าน : [])).filter(function(r) {
		return หมวด.indexOf(r.หมวด) !== -1;
	});
}

// ร้านที่เพิ่งเปิดได้รอบก่อน — กันสุ่มได้ร้านเดิมซ้ำติดกัน (เดิมวงล้อกันเมนูซ้ำในหมวดเดียวกันอยู่แล้ว)
var ร้านล่าสุดที่เปิดได้ = null;

// คืน { ร้าน, คะแนน, ช่อง } หรือ { error: "nodata" | "empty" }
function สุ่มร้านตามโหมด(mode) {
	if (typeof รายการร้าน === "undefined" || !Array.isArray(รายการร้าน) || typeof วงล้อหมวดอาหาร === "undefined") {
		return { error: "nodata" };
	}
	// เฉพาะช่องที่มีร้านจริงอยู่ — คะแนนหมวด = Match เฉลี่ยของร้านจริงในหมวด (สูตรเดียวกับ คำนวณคะแนนหมวดวงล้อ เดิม)
	var ช่องที่สุ่มได้ = วงล้อหมวดอาหาร
		.map(function(cat) { return { cat: cat, ร้าน: ร้านจริงในช่อง(cat) }; })
		.filter(function(x) { return x.ร้าน.length > 0; });
	if (!ช่องที่สุ่มได้.length) return { error: "empty" };

	var คะแนนทั้งหมด = ช่องที่สุ่มได้.map(function(x) {
		var รวม = 0;
		x.ร้าน.forEach(function(r) { รวม += คำนวณMatch(r, foodDNA); });
		return Math.round(รวม / x.ร้าน.length);
	});
	// น้ำหนักเดิมของวงล้อ: ยกกำลัง 1.3 + ฐาน 15 (ตามใจชอบ) / กลับด้าน 100 - คะแนน (ตรงข้าม) / เท่ากันหมด (สุ่มมั่ว ๆ)
	var weights;
	if (mode === "opposite") {
		weights = คะแนนทั้งหมด.map(function(s) { return Math.pow(Math.max(100 - s, 1), 1.3) + 15; });
	} else if (mode === "mix") {
		weights = คะแนนทั้งหมด.map(function() { return 1; });
	} else {
		weights = คะแนนทั้งหมด.map(function(s) { return Math.pow(Math.max(s, 1), 1.3) + 15; });
	}
	var เลือก = ช่องที่สุ่มได้[สุ่มถ่วงน้ำหนัก(weights)];

	// ในหมวดที่ได้ สุ่มร้านแบบเดียวกับที่วงล้อสุ่มเมนูเดิม (เท่า ๆ กัน) แต่ตัดร้านที่เพิ่งออกไปถ้ายังมีตัวเลือกอื่น
	var ตัวเลือก = เลือก.ร้าน.length > 1
		? เลือก.ร้าน.filter(function(r) { return r.id !== ร้านล่าสุดที่เปิดได้; })
		: เลือก.ร้าน;
	var ร้าน = ตัวเลือก[Math.floor(Math.random() * ตัวเลือก.length)];
	return { ร้าน: ร้าน, คะแนน: คำนวณMatch(ร้าน, foodDNA), ช่อง: เลือก.cat };
}

/* =====================================================================
   2) ไข่ปริศนา — state machine
   idle → firstTap → secondTap → opening → revealing → result
   (ลดการเคลื่อนไหว: idle → reducedMotionReveal → result ทันทีในแตะเดียว) / error เมื่อไม่มีร้าน
   ===================================================================== */
var EGG_OPEN_MS = 1200;   // แอนิเมชันไข่แตกออก
var EGG_REVEAL_MS = 450;  // การ์ดร้านเลื่อนขึ้นมา
var EGG_SHAKE_MS = 520;   // ช่วงสั่นแต่ละแตะ (กันแตะรัวจนแอนิเมชันซ้อน)

var eggStage = document.getElementById("eggStage");
var eggBtn = document.getElementById("eggBtn");
var eggHint = document.getElementById("eggHint");
var eggError = document.getElementById("eggError");
var eggResult = document.getElementById("eggResult");

var eggState = "idle";
var eggBusy = false;        // ระหว่างสั่น/เปิด กดซ้ำไม่ได้
var eggPick = null;         // ผลที่สุ่มไว้แล้ว (สุ่มตั้งแต่แตะแรก ให้พร้อมตอนไข่เปิด)
var eggTimers = [];

function prefersReducedMotion() {
	return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
function eggLater(fn, ms) {
	var id = setTimeout(function() {
		eggTimers = eggTimers.filter(function(x) { return x !== id; });
		fn();
	}, ms);
	eggTimers.push(id);
}
function clearEggTimers() {
	eggTimers.forEach(clearTimeout);
	eggTimers = [];
}

var EGG_HINT_KEY = {
	idle: "roulette.eggHintIdle",
	firstTap: "roulette.eggHintFirst",
	secondTap: "roulette.eggHintSecond",
	opening: "roulette.eggHintOpening",
	revealing: "roulette.eggHintOpening",
	reducedMotionReveal: "roulette.eggHintOpening"
};
var EGG_STEP = { idle: 0, firstTap: 1, secondTap: 2, opening: 3, revealing: 3, result: 3, reducedMotionReveal: 3, error: 0 };

function setEggState(state) {
	eggState = state;
	eggStage.setAttribute("data-state", state);
	// ความคืบหน้าบอกเป็นข้อความด้วย ไม่ใช่แค่สี/แอนิเมชัน (จุด 3 จุดเป็นแค่ตัวช่วยเสริม)
	var steps = eggStage.querySelectorAll(".eggsteps span");
	steps.forEach(function(s, i) { s.classList.toggle("on", i < EGG_STEP[state]); });
	if (state === "result" && eggPick && eggPick.ร้าน) {
		eggHint.textContent = t("roulette.eggHintResult").replace("{name}", eggPick.ร้าน.ร้าน);
	} else if (EGG_HINT_KEY[state]) {
		eggHint.textContent = t(EGG_HINT_KEY[state]);
	}
	var label = t("roulette.eggLabel") + " — " + t("roulette.eggStepOf").replace("{n}", EGG_STEP[state]).replace("{total}", 3);
	eggBtn.setAttribute("aria-label", label);
	eggBtn.setAttribute("aria-disabled", (state === "opening" || state === "revealing" || state === "result" || state === "reducedMotionReveal") ? "true" : "false");
}

function showEggError(kind) {
	eggPick = null;
	setEggState("error");
	var text = kind === "nodata"
		? t("roulette.errNoData")
		: t("roulette.errEmptyMode").replace("{mode}", t(rmodeLabelKey[currentRouletteMode]));
	document.getElementById("eggErrorText").textContent = text;
	eggError.hidden = false;
	eggHint.textContent = "";
}

function onEggTap() {
	if (eggBusy) return;
	if (eggState === "result" || eggState === "opening" || eggState === "revealing" || eggState === "reducedMotionReveal") return;

	if (eggState === "idle" || eggState === "error") {
		eggError.hidden = true;
		// สุ่มร้านตั้งแต่แตะแรก (ข้อมูลอยู่ในเครื่อง ได้ผลทันที) — พอไข่เปิดผลพร้อมเสมอ ไม่ต้องรอ
		eggPick = สุ่มร้านตามโหมด(currentRouletteMode);
		if (eggPick.error) {
			showEggError(eggPick.error);
			return;
		}
		if (prefersReducedMotion()) {
			// ผู้ใช้ขอลดการเคลื่อนไหว: ไม่ต้องแตะ 3 ครั้ง ไม่มีสั่น/แตก เผยร้านทันที
			setEggState("reducedMotionReveal");
			revealEggResult();
			return;
		}
		shakeEgg("firstTap");
		return;
	}
	if (eggState === "firstTap") {
		shakeEgg("secondTap");
		return;
	}
	if (eggState === "secondTap") {
		openEgg();
	}
}

function shakeEgg(nextState) {
	eggBusy = true;
	setEggState(nextState);
	// เริ่มคลาส shake ใหม่ทุกครั้ง (ลบแล้ว reflow แล้วใส่กลับ) ให้แอนิเมชันเล่นซ้ำได้
	eggStage.classList.remove("is-shaking");
	void eggStage.offsetWidth;
	eggStage.classList.add("is-shaking");
	eggLater(function() {
		eggStage.classList.remove("is-shaking");
		eggBusy = false;
	}, EGG_SHAKE_MS);
}

function openEgg() {
	eggBusy = true;
	setEggState("opening");
	eggLater(function() {
		setEggState("revealing");
		revealEggResult();
		eggLater(function() {
			eggBusy = false;
			setEggState("result");
			// ย้ายโฟกัสไปที่ปุ่มดูร้าน ผู้ใช้คีย์บอร์ด/โปรแกรมอ่านหน้าจอจะได้ไปต่อได้เลย
			var view = document.getElementById("eggViewBtn");
			if (view && document.activeElement === eggBtn) view.focus({ preventScroll: true });
		}, EGG_REVEAL_MS);
	}, EGG_OPEN_MS);
}

/* --- ผลที่เปิดได้ค้างไว้ 20 นาที (ออกจากหน้า/รีเฟรชแล้วกลับมายังเห็นร้านเดิม) หรือจนกว่าจะกด "สุ่มอีกครั้ง" --- */
var EGG_KEEP_MS = 20 * 60 * 1000;
var EGG_RESULT_KEY = "chimchim_egg_result_v1";
var eggExpiryTimer = null;
function saveEggResult(pick) {
	try {
		localStorage.setItem(EGG_RESULT_KEY, JSON.stringify({
			shopId: pick.ร้าน.id,
			mode: currentRouletteMode,
			catKey: pick.ช่อง ? pick.ช่อง.key : null,
			at: Date.now()
		}));
	} catch (e) {}
}
function loadEggResult() {
	try {
		var saved = JSON.parse(localStorage.getItem(EGG_RESULT_KEY));
		if (!saved || !saved.at || Date.now() - saved.at >= EGG_KEEP_MS) return null;
		return saved;
	} catch (e) {
		return null;
	}
}
function clearEggResult() {
	clearTimeout(eggExpiryTimer);
	eggExpiryTimer = null;
	try { localStorage.removeItem(EGG_RESULT_KEY); } catch (e) {}
}
// ครบเวลาแล้วไข่กลับมาใบใหม่เอง (ถ้ายังเปิดหน้าค้างไว้) + บอกในการ์ดว่าผลนี้อยู่ถึงกี่โมง
function scheduleEggExpiry(savedAt) {
	clearTimeout(eggExpiryTimer);
	var until = savedAt + EGG_KEEP_MS;
	eggExpiryTimer = setTimeout(function() { resetEgg(); }, Math.max(0, until - Date.now()));
	var note = document.getElementById("eggKeepNote");
	if (note) {
		var d = new Date(until);
		var hhmm = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
		note.textContent = t("roulette.keepNote").replace("{time}", hhmm);
	}
}

function revealEggResult(restoring) {
	var pick = eggPick;
	var ร้าน = pick.ร้าน;
	ร้านล่าสุดที่เปิดได้ = ร้าน.id;

	var img = document.getElementById("eggResultImg");
	var noImg = document.getElementById("eggResultNoImg");
	if (ร้าน.รูป) {
		img.hidden = false;
		noImg.hidden = true;
		img.alt = ร้าน.เมนู || ร้าน.ร้าน;
		img.onerror = function() {
			// รูปโหลดไม่ได้ → โชว์ไอคอนแทน ไม่ปล่อยกรอบรูปแตก
			img.hidden = true;
			noImg.hidden = false;
		};
		img.src = ร้าน.รูป;
	} else {
		img.hidden = true;
		noImg.hidden = false;
	}
	var matchEl = document.getElementById("eggResultMatch");
	matchEl.hidden = typeof pick.คะแนน !== "number";
	if (!matchEl.hidden) matchEl.innerHTML = matchBadgeText(pick.คะแนน);

	document.getElementById("eggResultCat").innerHTML = ร้าน.หมวด ? (catEmoji(ร้าน.หมวด) + " " + escapeHtml(catLabel(ร้าน.หมวด))) : "";
	document.getElementById("eggResultName").textContent = ร้าน.ร้าน || "";
	var menuEl = document.getElementById("eggResultMenu");
	menuEl.hidden = !ร้าน.เมนู;
	menuEl.textContent = ร้าน.เมนู ? (t("roulette.resultMenu") + ": " + ร้าน.เมนู) : "";

	// แสดงเฉพาะข้อมูลที่มีจริง — ช่องไหนว่างไม่โชว์
	var meta = [];
	if (typeof ร้าน.ราคาต่ำ === "number" && typeof ร้าน.ราคาสูง === "number") meta.push('<span><i class="fas fa-tag"></i>฿' + ร้าน.ราคาต่ำ + "–" + ร้าน.ราคาสูง + "</span>");
	if (typeof ร้าน.ระยะทาง === "number") meta.push('<span><i class="fas fa-location-dot"></i>' + distanceText(ร้าน.ระยะทาง) + "</span>");
	if (ร้าน.มหาลัย) meta.push('<span><i class="fas fa-graduation-cap"></i>' + escapeHtml(ร้าน.มหาลัย) + "</span>");
	document.getElementById("eggResultMeta").innerHTML = meta.join("");

	document.getElementById("eggResultWhy").textContent = t("roulette.resultDesc" + { like: "Like", opposite: "Opposite", mix: "Mix" }[currentRouletteMode]);

	var view = document.getElementById("eggViewBtn");
	view.href = "restaurant.html?id=" + encodeURIComponent(ร้าน.id);
	view.setAttribute("data-id", ร้าน.id);

	eggResult.hidden = false;
	eggResult.classList.remove("is-in");
	void eggResult.offsetWidth;
	eggResult.classList.add("is-in");

	renderSimilarShops(pick.ช่อง, ร้าน.id);
	if (eggState === "reducedMotionReveal") setEggState("result");
	if (restoring) return; // กลับมาดูผลเดิม — ไม่นับเป็นการเปิดไข่ใหม่ ไม่ต่อเวลา
	saveEggResult(pick);
	scheduleEggExpiry(Date.now());
	if (typeof logEvent === "function") logEvent("egg_opened", { mode: currentRouletteMode, shopId: ร้าน.id });
}

// เริ่มใหม่: ไข่กลับมาสมบูรณ์ ล้างรอยร้าว/ผลเดิม คงโหมดที่เลือกไว้
function resetEgg() {
	clearEggTimers();
	clearEggResult();
	eggBusy = false;
	eggPick = null;
	eggStage.classList.remove("is-shaking");
	eggError.hidden = true;
	eggResult.hidden = true;
	eggResult.classList.remove("is-in");
	var similar = document.getElementById("wSimilarSection");
	if (similar) similar.hidden = true;
	setEggState("idle");
}

eggBtn.addEventListener("click", onEggTap);
document.getElementById("eggAgainBtn").addEventListener("click", function() {
	resetEgg();
	eggBtn.focus({ preventScroll: true });
	eggStage.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
});
document.getElementById("eggErrorRetry").addEventListener("click", function() {
	resetEgg();
	onEggTap();
});
document.getElementById("eggViewBtn").addEventListener("click", function(e) {
	// ไม่มี id ร้าน (ไม่ควรเกิด) → ไม่พาไปหน้าร้านพัง ๆ แจ้งผู้ใช้แทน
	if (!this.getAttribute("data-id")) {
		e.preventDefault();
		if (typeof showToast === "function") showToast(t("roulette.detailError"));
	}
});
// ออกจากหน้า/สลับแท็บกลับมา ไม่ให้ timer ค้างกลางแอนิเมชัน
window.addEventListener("pagehide", clearEggTimers);

/* --- เปลี่ยนโหมด: ระหว่างแตะค้างอยู่ (ยังไม่เปิด) เริ่มไข่ใหม่ให้สุ่มตามโหมดใหม่ / เปิดแล้วเก็บผลไว้ รอบหน้าใช้โหมดใหม่ --- */
document.querySelectorAll(".rmodebtn").forEach(function(btn) {
	btn.addEventListener("click", function() {
		if (eggState === "opening" || eggState === "revealing") return;
		document.querySelectorAll(".rmodebtn").forEach(function(b) {
			b.classList.remove("active");
			b.setAttribute("aria-pressed", "false");
		});
		this.classList.add("active");
		this.setAttribute("aria-pressed", "true");
		currentRouletteMode = this.getAttribute("data-mode");
		updateRouletteModeDesc();
		if (eggState === "firstTap" || eggState === "secondTap" || eggState === "error") resetEgg();
	});
});
document.querySelectorAll(".rmodebtn").forEach(function(b) {
	b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false");
});
updateRouletteModeDesc();
setEggState("idle");

// เปิดหน้ากลับมาภายใน 20 นาที → โชว์ผลเดิมทันที (ไข่เปิดอยู่แล้ว โหมดเดิมถูกเลือกไว้)
(function restoreEggResult() {
	var saved = loadEggResult();
	if (!saved) {
		clearEggResult();
		return;
	}
	var ร้าน = typeof หาร้านจากId === "function" ? หาร้านจากId(saved.shopId) : null;
	if (!ร้าน) return; // ร้านหาย/ยังไม่ sync มา — ปล่อยเป็นไข่ใบใหม่
	if (saved.mode && rmodeDescKey[saved.mode]) {
		currentRouletteMode = saved.mode;
		document.querySelectorAll(".rmodebtn").forEach(function(b) {
			var on = b.getAttribute("data-mode") === saved.mode;
			b.classList.toggle("active", on);
			b.setAttribute("aria-pressed", on ? "true" : "false");
		});
		updateRouletteModeDesc();
	}
	var ช่อง = saved.catKey ? วงล้อหมวดอาหาร.filter(function(c) { return c.key === saved.catKey; })[0] : null;
	eggPick = { ร้าน: ร้าน, คะแนน: คำนวณMatch(ร้าน, foodDNA), ช่อง: ช่อง || null };
	setEggState("result");
	revealEggResult(true);
	setEggState("result");
	scheduleEggExpiry(saved.at);
})();

/* =====================================================================
   ร้านที่คล้ายกัน + popup รายละเอียด (ของเดิม ใช้ต่อใต้การ์ดผลลัพธ์)
   ===================================================================== */
// ร้านจริงอื่นในหมวดเดียวกับร้านที่เปิดได้ (ไม่รวมร้านนั้นเอง) เรียงตาม Match
function renderSimilarShops(cat, excludeId) {
	var section = document.getElementById("wSimilarSection");
	var row = document.getElementById("wSimilarRow");
	if (!section || !row) return;
	var ranked = (cat ? ร้านจริงในช่อง(cat) : [])
		.filter(function(r) { return r.id !== excludeId; })
		.map(function(r) { return { r: r, m: คำนวณMatch(r, foodDNA) }; })
		.sort(function(a, b) { return b.m - a.m; })
		.slice(0, 3);
	row.innerHTML = "";
	if (!ranked.length) {
		section.hidden = true;
		return;
	}
	ranked.forEach(function(item) {
		row.appendChild(buildMiniCard(item.r, openShopDetailPopup));
	});
	section.hidden = false;
}

/* --- กดร้านที่คล้ายกันแล้วเด้ง popup ดูรายละเอียดตรงนี้เลย ไม่ต้องออกจากหน้านี้ --- */
var shopDetailPop = document.getElementById("shopDetailPop");
function openShopDetailPopup(ร้าน) {
	if (!shopDetailPop) return;
	var คะแนน = คำนวณMatch(ร้าน, foodDNA);
	document.getElementById("sdImg").src = ร้าน.รูป;
	document.getElementById("sdImg").alt = ร้าน.เมนู;
	document.getElementById("sdCat").innerHTML = catEmoji(ร้าน.หมวด) + " " + escapeHtml(catLabel(ร้าน.หมวด));
	document.getElementById("sdTitle").textContent = ร้าน.เมนู;
	document.getElementById("sdRestaurant").innerHTML = '<i class="fas fa-store"></i> ' + escapeHtml(ร้าน.ร้าน);
	document.getElementById("sdMatchPct").innerHTML = matchBadgeText(คะแนน);
	document.getElementById("sdMeta").textContent = "฿" + ร้าน.ราคาต่ำ + "–" + ร้าน.ราคาสูง + " · " + distanceText(ร้าน.ระยะทาง) + " · " + t("restaurant.near") + ร้าน.มหาลัย;
	document.getElementById("sdDesc").textContent = สร้างเหตุผลmatch(ร้าน, foodDNA);
	document.getElementById("sdFullLink").href = "restaurant.html?id=" + ร้าน.id;
	shopDetailPop.classList.add("open");
	document.body.style.overflow = "hidden";
}
function closeShopDetailPopup() {
	if (!shopDetailPop) return;
	shopDetailPop.classList.remove("open");
	document.body.style.overflow = "";
}
if (shopDetailPop) {
	document.getElementById("sdClose").addEventListener("click", closeShopDetailPopup);
	shopDetailPop.addEventListener("click", function(e) {
		if (e.target === shopDetailPop) closeShopDetailPopup();
	});
	document.addEventListener("keydown", function(e) {
		if (e.key === "Escape") closeShopDetailPopup();
	});
}

/* --- ปุ่ม "ดูร้านแนะนำ" (ใต้การ์ดร้านที่เปิดได้) — เด้ง popup ร้าน Match สูงสุดจาก Food DNA ตรงนี้เลย ไม่ต้องออกจากหน้า --- */
var recommendPop = document.getElementById("recommendPop");
function openRecommendPop() {
	if (!recommendPop) return;
	var list = document.getElementById("recommendPopList");
	list.innerHTML = "";
	var แนะนำ = รายการร้าน
		.map(function(r) { return { r: r, m: คำนวณMatch(r, foodDNA) }; })
		.sort(function(a, b) { return b.m - a.m; })
		.slice(0, 2);
	if (!แนะนำ.length) {
		list.innerHTML = '<p style="text-align:center;color:#bbb;font-size:.85rem;padding:20px 0;">' + t("roulette.recommendEmpty") + "</p>";
	} else {
		แนะนำ.forEach(function(item) {
			list.appendChild(buildMiniCard(item.r, function(ร้าน) {
				closeRecommendPop();
				openShopDetailPopup(ร้าน);
			}));
		});
	}
	recommendPop.classList.add("open");
	document.body.style.overflow = "hidden";
}
function closeRecommendPop() {
	if (!recommendPop) return;
	recommendPop.classList.remove("open");
	document.body.style.overflow = "";
}
if (recommendPop) {
	document.getElementById("wfeedBtn").addEventListener("click", openRecommendPop);
	document.getElementById("rpClose").addEventListener("click", closeRecommendPop);
	recommendPop.addEventListener("click", function(e) {
		if (e.target === recommendPop) closeRecommendPop();
	});
	document.addEventListener("keydown", function(e) {
		if (e.key === "Escape") closeRecommendPop();
	});
}

// ดึงร้านที่คนอื่นโพสต์ไว้ใน Supabase จริงมาผสานกับ รายการร้าน เงียบ ๆ ไข่จะได้สุ่มจากร้านครบทุกเครื่อง
if (typeof syncShopsWithSupabase === "function") syncShopsWithSupabase();
// ดึงไลก์/ติดตามของตัวเองมาผสาน กันหัวใจ/ปุ่มติดตามในการ์ดร้านไม่ตรงกับที่เคยกดไว้จากเครื่องอื่น
if (typeof syncLikesAndFollowsWithSupabase === "function") syncLikesAndFollowsWithSupabase();
