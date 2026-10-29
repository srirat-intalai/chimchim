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
   "ตามใจชอบ" กับ "ตรงข้าม" ถ่วงน้ำหนักด้วยคะแนน Match ของแต่ละร้านกับ Food DNA ผู้ใช้ (สูตรน้ำหนักเดิมของวงล้อ)
   ยังไม่มี Food DNA ของผู้ใช้จริง → ทุกโหมดสุ่มเท่า ๆ กัน (ถ่วงด้วยโปรไฟล์ตัวอย่างจะเป็นการ "จับคู่" ปลอม)
----------------------------------------------------- */
var currentRouletteMode = "like";
var rmodeDescKey = { like: "roulette.modeDescLike", opposite: "roulette.modeDescOpposite", mix: "roulette.modeDescMix" };
function updateRouletteModeDesc() {
	var el = document.getElementById("rmodeDesc");
	if (el) el.textContent = t(rmodeDescKey[currentRouletteMode]);
}
function setRouletteMode(mode) {
	currentRouletteMode = mode;
	document.querySelectorAll(".rmodebtn").forEach(function(b) {
		var on = b.getAttribute("data-mode") === mode;
		b.classList.toggle("active", on);
		b.setAttribute("aria-pressed", on ? "true" : "false");
	});
	updateRouletteModeDesc();
}
// โหมดที่ใช้สุ่มจริง — ไม่มี Food DNA ของผู้ใช้ ใช้ "mix" เสมอ
function โหมดที่ใช้จริง() {
	return foodDNAPersonal ? currentRouletteMode : "mix";
}

/* -----------------------------------------------------
   ตัวเลือกเพิ่มเติม (ไม่บังคับ): ประเภทอาหาร / งบต่อคน / ระยะทาง
   ค่าเริ่มต้นคือ "ไม่จำกัด" ทุกข้อ จำไว้ในเครื่องให้ครั้งหน้าไม่ต้องเลือกใหม่
----------------------------------------------------- */
var RF_KEY = "chimchim_roulette_filters_v1";
var RF_BUDGETS = [0, 50, 100, 150];      // 0 = ไม่จำกัด / อื่น ๆ = ราคาเริ่มต้นของร้านไม่เกินเท่านี้ (บาท)
var RF_DISTANCES = [0, 500, 1000, 2000]; // 0 = ไม่จำกัด / เมตร
var rFilters = { cat: "all", budget: 0, dist: 0 };
(function loadRouletteFilters() {
	try {
		var saved = JSON.parse(localStorage.getItem(RF_KEY));
		if (saved) {
			if (typeof saved.cat === "string") rFilters.cat = saved.cat;
			if (RF_BUDGETS.indexOf(saved.budget) !== -1) rFilters.budget = saved.budget;
			if (RF_DISTANCES.indexOf(saved.dist) !== -1) rFilters.dist = saved.dist;
		}
	} catch (e) {}
	// มาจากหน้าแรกพร้อมหมวดที่เลือกอยู่ (roulette.html?cat=…) → ใช้หมวดนั้น
	var fromUrl = new URLSearchParams(window.location.search).get("cat");
	if (fromUrl) rFilters.cat = fromUrl;
	if (rFilters.cat !== "all" && !กลุ่มหมวดหมู่.some(function(g) { return g.key === rFilters.cat; })) rFilters.cat = "all";
})();
function saveRouletteFilters() {
	try { localStorage.setItem(RF_KEY, JSON.stringify(rFilters)); } catch (e) {}
}
function filtersActive() {
	return rFilters.cat !== "all" || rFilters.budget > 0 || rFilters.dist > 0;
}
function ร้านทั้งหมดที่สุ่มได้() {
	return typeof ร้านในพื้นที่ === "function" ? ร้านในพื้นที่() : (typeof รายการร้าน !== "undefined" ? รายการร้าน : []);
}
function กลุ่มของหมวด(หมวด) {
	for (var i = 0; i < กลุ่มหมวดหมู่.length; i++) {
		if (หมวดย่อยในกลุ่ม(กลุ่มหมวดหมู่[i].key).indexOf(หมวด) !== -1) return กลุ่มหมวดหมู่[i].key;
	}
	return null;
}
function ผ่านเงื่อนไข(r, f) {
	if (f.cat !== "all" && หมวดย่อยในกลุ่ม(f.cat).indexOf(r.หมวด) === -1) return false;
	if (f.budget > 0 && !(typeof r.ราคาต่ำ === "number" && r.ราคาต่ำ <= f.budget)) return false;
	if (f.dist > 0 && ข้อมูลระยะทาง(r).meters > f.dist) return false;
	return true;
}
// เงื่อนไขจาก Prompt (AI แปลงคำพูดเป็นค่าในคำศัพท์จริงของแอป ดู /api/prompt-filters ใน server.js)
// ทุกข้อที่มีค่าต้องผ่านทั้งหมด / include ไม่ใช่ตัวกรอง แต่ใช้ถ่วงให้ร้านที่ตรงเมนูที่อยากกินมีโอกาสมากกว่า
var promptFilters = null;
function ข้อความค้นของร้าน(r) {
	return [r.เมนู, r.ร้าน, r.หมวด, catLabel(r.หมวด)].concat(r.แท็ก || []).join(" ").toLowerCase();
}
function ผ่านเงื่อนไขPrompt(r, pf) {
	if (!pf) return true;
	if (pf.groups.length && pf.groups.indexOf(กลุ่มของหมวด(r.หมวด)) === -1) return false;
	if (pf.cuisines.length && pf.cuisines.indexOf(r.ชาติอาหาร) === -1) return false;
	if (pf.flavors.length && !(r.รส || []).some(function(x) { return pf.flavors.indexOf(x) !== -1; })) return false;
	if (pf.budgetMax && !(typeof r.ราคาต่ำ === "number" && r.ราคาต่ำ <= pf.budgetMax)) return false;
	if (pf.distanceMax && ข้อมูลระยะทาง(r).meters > pf.distanceMax) return false;
	if (pf.exclude.length) {
		var text = ข้อความค้นของร้าน(r);
		if (pf.exclude.some(function(w) { return text.indexOf(w.toLowerCase()) !== -1; })) return false;
	}
	return true;
}
function ตรงเมนูที่อยากกิน(r, pf) {
	if (!pf || !pf.include.length) return false;
	var text = ข้อความค้นของร้าน(r);
	return pf.include.some(function(w) { return text.indexOf(w.toLowerCase()) !== -1; });
}
function ร้านที่ผ่านเงื่อนไข(f, pf) {
	if (pf === undefined) pf = promptFilters;
	return ร้านทั้งหมดที่สุ่มได้().filter(function(r) { return ผ่านเงื่อนไข(r, f) && ผ่านเงื่อนไขPrompt(r, pf); });
}
function budgetLabel(b) {
	return b ? t("roulette.budgetMax").replace("{n}", b) : t("roulette.noLimit");
}
function distLabel(d) {
	return d ? t("roulette.distMax").replace("{d}", distanceText(d)) : t("roulette.noLimit");
}
function filterSummaryText() {
	var parts = [];
	if (promptFilters) parts.push(promptFilters.summary || t("roulette.promptActive"));
	if (rFilters.cat !== "all") parts.push(catGroupLabel(rFilters.cat));
	if (rFilters.budget) parts.push(budgetLabel(rFilters.budget));
	if (rFilters.dist) parts.push(distLabel(rFilters.dist));
	return parts.join(" · ");
}

function renderRouletteFilters() {
	var all = ร้านทั้งหมดที่สุ่มได้();
	function chips(boxId, options, current, label, onPick) {
		var box = document.getElementById(boxId);
		if (!box) return;
		box.innerHTML = "";
		options.forEach(function(val) {
			var b = document.createElement("button");
			b.type = "button";
			b.className = "rfchip" + (val === current ? " active" : "");
			b.setAttribute("aria-pressed", val === current ? "true" : "false");
			b.textContent = label(val);
			b.addEventListener("click", function() { onPick(val); });
			box.appendChild(b);
		});
	}
	// โชว์เฉพาะหมวดที่มีร้านจริงในพื้นที่ตอนนี้ (หมวดที่ว่างกดไปก็ได้ "ไม่พบร้าน" อย่างเดียว)
	var catOptions = ["all"].concat(กลุ่มหมวดหมู่.filter(function(g) {
		return all.some(function(r) { return หมวดย่อยในกลุ่ม(g.key).indexOf(r.หมวด) !== -1; });
	}).map(function(g) { return g.key; }));
	if (catOptions.indexOf(rFilters.cat) === -1) catOptions.push(rFilters.cat);
	chips("rfCat", catOptions, rFilters.cat, function(v) { return v === "all" ? t("home.catAll") : catGroupLabel(v); }, function(v) { setRouletteFilter("cat", v); });
	chips("rfBudget", RF_BUDGETS, rFilters.budget, budgetLabel, function(v) { setRouletteFilter("budget", v); });
	chips("rfDist", RF_DISTANCES, rFilters.dist, distLabel, function(v) { setRouletteFilter("dist", v); });

	// บอกตามจริงว่าระยะวัดจากไหน — ยังไม่มีตำแหน่งผู้ใช้ = ระยะโดยประมาณจากมหาลัยของร้าน
	var note = document.getElementById("rfDistNote");
	if (note) note.textContent = getUserLocation() ? t("roulette.distFromYou") : t("roulette.distFromUni");

	var summary = document.getElementById("rFilterSummary");
	if (summary) summary.textContent = filterSummaryText();
	var clear = document.getElementById("rfClear");
	if (clear) clear.hidden = !filtersActive();
}
function setRouletteFilter(key, val) {
	rFilters[key] = val;
	saveRouletteFilters();
	renderRouletteFilters();
	// เงื่อนไขเปลี่ยนระหว่างแตะไข่ค้างอยู่/ขึ้น error → เริ่มไข่ใหม่ให้สุ่มตามเงื่อนไขใหม่ (ผลที่เปิดแล้วเก็บไว้ กด "สุ่มอีกครั้ง" ถึงใช้เงื่อนไขใหม่)
	if (typeof eggState !== "undefined" && (eggState === "firstTap" || eggState === "secondTap" || eggState === "error")) resetEgg();
}

/* -----------------------------------------------------
   กันร้านซ้ำ: จำร้านที่เปิดได้แล้วในรอบการใช้งานนี้ (sessionStorage) สุ่มรอบถัดไปจากร้านที่ยังไม่เคยออกก่อน
   ครบทุกร้านที่ตรงเงื่อนไขแล้วค่อยวนใหม่ (และบอกผู้ใช้ว่าวนครบแล้ว)
----------------------------------------------------- */
var RF_SEEN_KEY = "chimchim_roulette_seen";
function getSeenShops() {
	try { return JSON.parse(sessionStorage.getItem(RF_SEEN_KEY)) || []; } catch (e) { return []; }
}
function markShopSeen(id) {
	var seen = getSeenShops().filter(function(x) { return x !== id; });
	seen.push(id);
	try { sessionStorage.setItem(RF_SEEN_KEY, JSON.stringify(seen.slice(-200))); } catch (e) {}
}
var ร้านล่าสุดที่เปิดได้ = null;

// คืน { ร้าน, คะแนน (null ถ้าไม่มี Food DNA จริง), poolSize, wrapped } หรือ { error: "nodata" | "empty" | "filtered" }
function สุ่มร้านตามโหมด(mode) {
	if (typeof รายการร้าน === "undefined" || !Array.isArray(รายการร้าน)) return { error: "nodata" };
	var pool = ร้านที่ผ่านเงื่อนไข(rFilters);
	if (!pool.length) return { error: filtersActive() || promptFilters ? "filtered" : "empty" };

	var seen = getSeenShops();
	var fresh = pool.filter(function(r) { return seen.indexOf(r.id) === -1; });
	var wrapped = false;
	if (!fresh.length) {
		// เปิดครบทุกร้านแล้ว — เริ่มรอบใหม่ แต่ไม่ให้ได้ร้านเดิมติดกันถ้ายังมีร้านอื่น
		wrapped = true;
		fresh = pool.length > 1 ? pool.filter(function(r) { return r.id !== ร้านล่าสุดที่เปิดได้; }) : pool;
		try { sessionStorage.removeItem(RF_SEEN_KEY); } catch (e) {}
	}

	var คะแนน = fresh.map(function(r) { return คำนวณMatch(r, foodDNA); });
	var weights;
	if (mode === "opposite") {
		weights = คะแนน.map(function(s) { return Math.pow(Math.max(100 - s, 1), 1.3) + 15; });
	} else if (mode === "like") {
		weights = คะแนน.map(function(s) { return Math.pow(Math.max(s, 1), 1.3) + 15; });
	} else {
		weights = คะแนน.map(function() { return 1; });
	}
	// ร้านที่ตรงเมนู/วัตถุดิบที่ผู้ใช้พิมพ์ว่าอยากกิน มีโอกาสออกมากขึ้น 3 เท่า (ไม่ใช่บังคับ — คำเรียกเมนูไม่ตรงกันเป๊ะได้)
	weights = weights.map(function(w, i) { return ตรงเมนูที่อยากกิน(fresh[i], promptFilters) ? w * 3 : w; });
	var idx = สุ่มถ่วงน้ำหนัก(weights);
	return { ร้าน: fresh[idx], คะแนน: foodDNAPersonal ? คะแนน[idx] : null, poolSize: pool.length, wrapped: wrapped };
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
	eggResult.hidden = true;
	var similar = document.getElementById("wSimilarSection");
	if (similar) similar.hidden = true;
	setEggState("error");
	var text = kind === "nodata" ? t("roulette.errNoData")
		: kind === "filtered" ? t("roulette.errFiltered").replace("{filters}", filterSummaryText())
		: t("roulette.errEmpty");
	document.getElementById("eggErrorText").textContent = text;
	// ไม่มีร้านตรงเงื่อนไข: เสนอทางผ่อนทีละข้อให้ผู้ใช้กดเลือกเอง (ไม่แอบเปลี่ยนเงื่อนไขให้เงียบ ๆ)
	var relax = document.getElementById("eggRelax");
	relax.innerHTML = "";
	if (kind === "filtered") {
		relaxOptions().forEach(function(opt) {
			var b = document.createElement("button");
			b.type = "button";
			b.className = "rfchip";
			b.textContent = opt.label;
			b.addEventListener("click", function() {
				rFilters[opt.key] = opt.value;
				saveRouletteFilters();
				renderRouletteFilters();
				pickAndReveal(true);
			});
			relax.appendChild(b);
		});
	}
	if (kind === "filtered" && promptFilters && ร้านที่ผ่านเงื่อนไข(rFilters, null).length) {
		var pb = document.createElement("button");
		pb.type = "button";
		pb.className = "rfchip";
		pb.textContent = t("roulette.relaxPrompt") + " (" + t("roulette.shopCount").replace("{n}", ร้านที่ผ่านเงื่อนไข(rFilters, null).length) + ")";
		pb.addEventListener("click", function() {
			clearPromptFilters();
			pickAndReveal(true);
		});
		relax.appendChild(pb);
	}
	relax.hidden = kind !== "filtered" || !relax.children.length;
	document.getElementById("eggErrorRetry").hidden = kind === "filtered";
	eggError.hidden = false;
	eggHint.textContent = "";
	if (typeof logEvent === "function") logEvent("roulette_no_result", { reason: kind, filters: rFilters });
}
// ทางผ่อนเงื่อนไขที่ "ได้ร้านจริง" เท่านั้น — ไม่เสนอทางที่ผ่อนแล้วก็ยังไม่เจอร้าน
function relaxOptions() {
	var out = [];
	function tryOpt(key, value, label) {
		var f = { cat: rFilters.cat, budget: rFilters.budget, dist: rFilters.dist };
		f[key] = value;
		var n = ร้านที่ผ่านเงื่อนไข(f, promptFilters).length;
		if (n) out.push({ key: key, value: value, label: label + " (" + t("roulette.shopCount").replace("{n}", n) + ")" });
	}
	if (rFilters.budget) {
		var nextB = RF_BUDGETS.filter(function(b) { return b > rFilters.budget; })[0];
		if (nextB) tryOpt("budget", nextB, t("roulette.relaxBudget").replace("{n}", nextB));
		tryOpt("budget", 0, t("roulette.relaxBudgetAny"));
	}
	if (rFilters.dist) {
		var nextD = RF_DISTANCES.filter(function(d) { return d > rFilters.dist; })[0];
		if (nextD) tryOpt("dist", nextD, t("roulette.relaxDist").replace("{d}", distanceText(nextD)));
		tryOpt("dist", 0, t("roulette.relaxDistAny"));
	}
	if (rFilters.cat !== "all") tryOpt("cat", "all", t("roulette.relaxCat"));
	return out;
}

function onEggTap() {
	if (eggBusy) return;
	if (eggState === "result" || eggState === "opening" || eggState === "revealing" || eggState === "reducedMotionReveal") return;

	if (eggState === "idle" || eggState === "error") {
		eggError.hidden = true;
		// สุ่มร้านตั้งแต่แตะแรก (ข้อมูลอยู่ในเครื่อง ได้ผลทันที) — พอไข่เปิดผลพร้อมเสมอ ไม่ต้องรอ
		eggPick = สุ่มร้านตามโหมด(โหมดที่ใช้จริง());
		if (typeof logEvent === "function") logEvent("roulette_started", { mode: โหมดที่ใช้จริง(), filters: rFilters });
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

function revealEggResult(restoring, reroll) {
	var pick = eggPick;
	var ร้าน = pick.ร้าน;
	ร้านล่าสุดที่เปิดได้ = ร้าน.id;
	if (!restoring) markShopSeen(ร้าน.id);

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
	// ชื่อเมนูเด่นก่อน (สิ่งที่จะได้กิน) แล้วค่อยชื่อร้าน — ไม่มีเมนูใช้ชื่อร้านเป็นหัวข้อแทน
	document.getElementById("eggResultName").textContent = ร้าน.เมนู || ร้าน.ร้าน || "";
	var menuEl = document.getElementById("eggResultMenu");
	menuEl.hidden = !(ร้าน.เมนู && ร้าน.ร้าน);
	menuEl.innerHTML = menuEl.hidden ? "" : '<i class="fas fa-store" aria-hidden="true"></i><span></span>';
	if (!menuEl.hidden) menuEl.querySelector("span").textContent = ร้าน.ร้าน;

	// แสดงเฉพาะข้อมูลที่มีจริง — ช่องไหนว่างไม่โชว์
	var meta = [];
	if (typeof ร้าน.ราคาต่ำ === "number" && typeof ร้าน.ราคาสูง === "number") meta.push('<span><i class="fas fa-tag"></i>฿' + ร้าน.ราคาต่ำ + "–" + ร้าน.ราคาสูง + "</span>");
	if (typeof ร้าน.ระยะทาง === "number") meta.push('<span><i class="fas fa-location-dot"></i>' + distanceText(ร้าน.ระยะทาง) + "</span>");
	if (ร้าน.มหาลัย) meta.push('<span><i class="fas fa-graduation-cap"></i>' + escapeHtml(ร้าน.มหาลัย) + "</span>");
	// ร้านที่ผู้ใช้เพิ่มเองยังไม่มีขั้นตอนให้ทีมตรวจสอบ — บอกตามจริง (ไม่ได้แปลว่าร้านไม่ดี)
	if (ร้าน.community) meta.push('<span class="eggresult-unverified"><i class="fas fa-user-pen"></i>' + escapeHtml(t("roulette.communityShop")) + "</span>");
	document.getElementById("eggResultMeta").innerHTML = meta.join("");

	// เหตุผลมาจากสิ่งที่ใช้สุ่มจริง: มี Food DNA → ข้อที่ตรงจริงจาก คำนวณMatch / ไม่มี → บอกว่าสุ่มเท่า ๆ กันจากร้านที่ตรงเงื่อนไข
	var why;
	var mode = โหมดที่ใช้จริง();
	if (!foodDNAPersonal) why = t("roulette.whyRandom");
	else if (mode === "like") why = สร้างเหตุผลmatch(ร้าน, foodDNA);
	else why = t(mode === "opposite" ? "roulette.resultDescOpposite" : "roulette.resultDescMix");
	document.getElementById("eggResultWhy").textContent = why;
	var poolEl = document.getElementById("eggResultPool");
	if (typeof pick.poolSize === "number") {
		var poolText = t("roulette.poolSize").replace("{n}", pick.poolSize);
		if (filtersActive() || promptFilters) poolText += " · " + filterSummaryText();
		if (pick.wrapped) poolText += " · " + t("roulette.wrapped");
		poolEl.textContent = poolText;
		poolEl.hidden = false;
	} else {
		poolEl.hidden = true;
	}

	var view = document.getElementById("eggViewBtn");
	view.href = "restaurant.html?id=" + encodeURIComponent(ร้าน.id) + "&from=roulette";
	view.setAttribute("data-id", ร้าน.id);

	eggResult.hidden = false;
	eggResult.classList.remove("is-in");
	void eggResult.offsetWidth;
	eggResult.classList.add("is-in");

	renderSimilarShops(ร้าน);
	if (eggState === "reducedMotionReveal") setEggState("result");
	if (restoring) return; // กลับมาดูผลเดิม — ไม่นับเป็นการเปิดไข่ใหม่ ไม่ต่อเวลา
	saveEggResult(pick);
	scheduleEggExpiry(Date.now());
	if (typeof logEvent === "function") logEvent("egg_opened", { mode: โหมดที่ใช้จริง(), shopId: ร้าน.id, reroll: !!reroll, poolSize: pick.poolSize, filters: rFilters });
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

// สุ่มร้านใหม่แล้วโชว์ผลทันที (ไข่เปิดอยู่แล้ว ไม่ต้องแตะใหม่ 3 ครั้ง) — ใช้ทั้งปุ่ม "สุ่มอีกครั้ง" และตอนผ่อนเงื่อนไข
function pickAndReveal(reroll) {
	clearEggTimers();
	eggBusy = false;
	eggError.hidden = true;
	eggPick = สุ่มร้านตามโหมด(โหมดที่ใช้จริง());
	if (eggPick.error) {
		showEggError(eggPick.error);
		return;
	}
	setEggState("result");
	revealEggResult(false, reroll);
	setEggState("result");
	var view = document.getElementById("eggViewBtn");
	if (view) view.focus({ preventScroll: true });
	eggResult.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });
}

eggBtn.addEventListener("click", onEggTap);
document.getElementById("eggAgainBtn").addEventListener("click", function() {
	pickAndReveal(true);
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
		var mode = this.getAttribute("data-mode");
		var note = document.getElementById("rmodeNote");
		if (!foodDNAPersonal && mode !== "mix") {
			// ยังไม่มี Food DNA — ไม่สลับไปโหมดที่ต้องใช้ DNA แต่บอกเหตุผลและทางไปทำ (สุ่มพื้นฐานยังใช้ได้ตามปกติ)
			note.hidden = false;
			return;
		}
		note.hidden = true;
		setRouletteMode(mode);
		if (eggState === "firstTap" || eggState === "secondTap" || eggState === "error") resetEgg();
	});
});
document.getElementById("rmodeDnaBtn").addEventListener("click", function() {
	if (!getSession() && typeof openAuthPop === "function") openAuthPop("register");
	else window.location.href = "profile-setup.html";
});
document.getElementById("rfClear").addEventListener("click", function() {
	rFilters = { cat: "all", budget: 0, dist: 0 };
	saveRouletteFilters();
	renderRouletteFilters();
	if (eggState === "firstTap" || eggState === "secondTap" || eggState === "error") resetEgg();
});
setRouletteMode(foodDNAPersonal ? currentRouletteMode : "mix");
renderRouletteFilters();
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
	if (saved.mode && rmodeDescKey[saved.mode] && (foodDNAPersonal || saved.mode === "mix")) setRouletteMode(saved.mode);
	ร้านล่าสุดที่เปิดได้ = ร้าน.id;
	eggPick = { ร้าน: ร้าน, คะแนน: foodDNAPersonal ? คำนวณMatch(ร้าน, foodDNA) : null };
	setEggState("result");
	revealEggResult(true);
	setEggState("result");
	scheduleEggExpiry(saved.at);
})();

/* =====================================================================
   ช่อง Prompt (ใช้ Token) — พิมพ์ความต้องการ → เซิร์ฟเวอร์หัก 1 Token แล้วให้ AI แปลงเป็นเงื่อนไข
   → แอปกรอง/สุ่มจากร้านจริงตามเงื่อนไขนั้น (AI ไม่ได้เลือกร้านเอง) สุ่มพื้นฐานไม่ต้องใช้ Token เสมอ
   กันหักซ้ำ 2 ชั้น: ปุ่มล็อกระหว่างรอ + requestId เดิมสำหรับข้อความเดิม (เซิร์ฟเวอร์ไม่หักซ้ำ ตอบผลเดิม)
   ===================================================================== */
var PROMPT_EXAMPLE_KEYS = ["roulette.promptEx1", "roulette.promptEx2", "roulette.promptEx3"];
var promptTokens = null;   // { left, daily } จากฐานข้อมูล / null = ยังไม่รู้
var promptBusy = false;
var promptReq = null;      // { text, id } — ข้อความเดิมส่งซ้ำ (เช่น เน็ตหลุดกลางทาง) ใช้ id เดิม
var rPromptForm = document.getElementById("rPrompt");
var rPromptInput = document.getElementById("rPromptInput");
var rPromptBtn = document.getElementById("rPromptBtn");
var rPromptMsg = document.getElementById("rPromptMsg");

function newRequestId() {
	if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
	return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function(c) {
		return (c ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16);
	});
}
// คำศัพท์จริงจากร้านที่สุ่มได้ตอนนี้ — AI ต้องเลือกจากชุดนี้เท่านั้น (เซิร์ฟเวอร์ตัดค่าที่ไม่อยู่ในชุดทิ้ง)
function promptVocab() {
	var shops = ร้านทั้งหมดที่สุ่มได้();
	var uniq = function(list) { return list.filter(function(v, i) { return v && list.indexOf(v) === i; }); };
	return {
		groups: กลุ่มหมวดหมู่.map(function(g) { return g.key; }).filter(function(key) {
			return shops.some(function(r) { return หมวดย่อยในกลุ่ม(key).indexOf(r.หมวด) !== -1; });
		}),
		cuisines: uniq(shops.map(function(r) { return r.ชาติอาหาร; })),
		flavors: uniq([].concat.apply([], shops.map(function(r) { return r.รส || []; })))
	};
}
function showPromptMsg(text, isError) {
	rPromptMsg.textContent = text || "";
	rPromptMsg.hidden = !text;
	rPromptMsg.classList.toggle("is-error", !!isError);
}
function renderPromptCost() {
	var cost = document.getElementById("rPromptCost");
	var btnText = document.getElementById("rPromptBtnText");
	if (!getSession()) {
		cost.textContent = t("roulette.promptGuestCost");
		btnText.textContent = t("roulette.promptLogin");
		return;
	}
	btnText.textContent = t("roulette.promptSubmit");
	cost.textContent = promptTokens
		? t("roulette.promptCostLeft").replace("{left}", promptTokens.left).replace("{daily}", promptTokens.daily)
		: t("roulette.promptCost");
}
function refreshPromptTokens() {
	if (typeof sbPromptTokensLeft !== "function") return;
	sbPromptTokensLeft().then(function(data) {
		promptTokens = data;
		renderPromptCost();
	});
}
function renderPromptActive() {
	var box = document.getElementById("rPromptActive");
	box.hidden = !promptFilters;
	if (!promptFilters) return;
	document.getElementById("rPromptSummary").textContent = promptFilters.summary || "";
	var un = document.getElementById("rPromptUnsupported");
	un.hidden = !promptFilters.unsupported.length;
	un.textContent = un.hidden ? "" : t("roulette.promptUnsupported").replace("{items}", promptFilters.unsupported.join(", "));
}
function clearPromptFilters() {
	promptFilters = null;
	renderPromptActive();
	if (eggState === "firstTap" || eggState === "secondTap" || eggState === "error") resetEgg();
}
// ได้เงื่อนไขแล้ว → ไข่ยังไม่เปิด: ฟักให้เลย (แอนิเมชันเปิดไข่ตามปกติ) / เปิดอยู่แล้ว: สุ่มร้านใหม่ตามเงื่อนไขทันที
function hatchWithPrompt() {
	if (eggState === "result") {
		pickAndReveal(true);
		return;
	}
	clearEggTimers();
	eggBusy = false;
	eggError.hidden = true;
	eggPick = สุ่มร้านตามโหมด(โหมดที่ใช้จริง());
	if (eggPick.error) {
		showEggError(eggPick.error);
		return;
	}
	if (typeof logEvent === "function") logEvent("roulette_started", { mode: โหมดที่ใช้จริง(), filters: rFilters, prompt: true });
	if (prefersReducedMotion()) {
		setEggState("reducedMotionReveal");
		revealEggResult();
		return;
	}
	eggHatch.scrollIntoView({ behavior: "smooth", block: "center" });
	openEgg();
}

var PROMPT_ERROR_KEY = {
	insufficient: "roulette.promptErrNoTokens",
	ai_failed: "roulette.promptErrAi",
	in_progress: "roulette.promptErrBusy",
	auth: "roulette.promptErrAuth",
	too_many_requests: "roulette.promptErrRate",
	not_configured: "roulette.promptErrUnavailable",
	token_unavailable: "roulette.promptErrUnavailable",
	network: "roulette.promptErrNetwork"
};
rPromptForm.addEventListener("submit", function(e) {
	e.preventDefault();
	if (promptBusy) return;
	var text = rPromptInput.value.trim();
	if (!getSession()) {
		if (typeof openAuthPop === "function") openAuthPop("login");
		return;
	}
	if (!text) {
		showPromptMsg(t("roulette.promptErrEmpty"), true);
		rPromptInput.focus();
		return;
	}
	if (promptTokens && promptTokens.left <= 0) {
		showPromptMsg(t("roulette.promptErrNoTokens"), true);
		return;
	}
	if (!promptReq || promptReq.text !== text) promptReq = { text: text, id: newRequestId() };
	promptBusy = true;
	rPromptBtn.disabled = true;
	rPromptBtn.setAttribute("aria-busy", "true");
	var btnText = document.getElementById("rPromptBtnText");
	btnText.textContent = t("roulette.promptReading");
	showPromptMsg("");
	sbPromptFilters(text, promptReq.id, promptVocab()).then(function(res) {
		promptBusy = false;
		rPromptBtn.disabled = false;
		rPromptBtn.removeAttribute("aria-busy");
		if (typeof res.left === "number" && promptTokens) promptTokens.left = res.left;
		renderPromptCost();
		if (res.error) {
			// เน็ตหลุด/เซิร์ฟเวอร์ไม่ตอบ → เก็บ requestId ไว้ กดอีกครั้งด้วยข้อความเดิมจะได้ผลเดิมโดยไม่หักซ้ำ
			if (res.error !== "network" && res.error !== "in_progress") promptReq = null;
			showPromptMsg(t(PROMPT_ERROR_KEY[res.error] || "roulette.promptErrUnavailable"), true);
			if (typeof logEvent === "function") logEvent("roulette_prompt_failed", { reason: res.error });
			return;
		}
		promptReq = null;
		if (res.empty) {
			showPromptMsg(t("roulette.promptErrNoFood"), true);
			return;
		}
		promptFilters = res.filters;
		renderPromptActive();
		showPromptMsg(t("roulette.promptUsed").replace("{left}", typeof res.left === "number" ? res.left : "?"));
		if (typeof logEvent === "function") logEvent("roulette_prompt_used", { replay: !!res.replay });
		hatchWithPrompt();
	});
});
// ช่องพิมพ์สูงตามข้อความ (เริ่ม 1 บรรทัด สูงสุดราว 4 บรรทัด) — ไม่ดันไข่ลงไปใต้จอตั้งแต่ยังไม่พิมพ์
function fitPromptInput() {
	rPromptInput.style.height = "auto";
	rPromptInput.style.height = Math.min(rPromptInput.scrollHeight + 2, 120) + "px";
}
rPromptInput.addEventListener("input", fitPromptInput);
rPromptInput.addEventListener("keydown", function(e) {
	// Enter = ส่ง / Shift+Enter = ขึ้นบรรทัดใหม่ (ระหว่างพิมพ์ภาษาไทยด้วย IME ไม่ส่ง)
	if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
		e.preventDefault();
		rPromptForm.requestSubmit ? rPromptForm.requestSubmit() : rPromptBtn.click();
	}
});
document.getElementById("rPromptClear").addEventListener("click", function() {
	clearPromptFilters();
	showPromptMsg("");
	rPromptInput.focus();
});
(function renderPromptExamples() {
	var box = document.getElementById("rPromptExamples");
	PROMPT_EXAMPLE_KEYS.forEach(function(key) {
		var b = document.createElement("button");
		b.type = "button";
		b.className = "rfchip";
		b.textContent = t(key);
		// ตัวอย่างแค่เติมข้อความให้แก้ต่อได้ ไม่ส่งเอง (กดยืนยันเองทุกครั้ง ไม่หัก Token โดยไม่ตั้งใจ)
		b.addEventListener("click", function() {
			rPromptInput.value = t(key);
			fitPromptInput();
			rPromptInput.focus();
		});
		box.appendChild(b);
	});
})();
var eggHatch = document.getElementById("eggHatch");
renderPromptCost();
refreshPromptTokens();

/* =====================================================================
   ร้านที่คล้ายกัน + popup รายละเอียด (ของเดิม ใช้ต่อใต้การ์ดผลลัพธ์)
   ===================================================================== */
// ร้านจริงอื่นในกลุ่มอาหารเดียวกับร้านที่เปิดได้ (ไม่รวมร้านนั้นเอง) เรียงตาม Match ถ้ามี Food DNA ไม่งั้นใกล้สุดก่อน
function renderSimilarShops(ร้านหลัก) {
	var section = document.getElementById("wSimilarSection");
	var row = document.getElementById("wSimilarRow");
	if (!section || !row) return;
	var group = กลุ่มของหมวด(ร้านหลัก.หมวด);
	var ranked = (group ? ร้านทั้งหมดที่สุ่มได้().filter(function(r) { return หมวดย่อยในกลุ่ม(group).indexOf(r.หมวด) !== -1; }) : [])
		.filter(function(r) { return r.id !== ร้านหลัก.id; })
		.map(function(r) { return { r: r, m: foodDNAPersonal ? คำนวณMatch(r, foodDNA) : -ข้อมูลระยะทาง(r).meters }; })
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
	document.getElementById("sdMatchPct").hidden = !foodDNAPersonal;
	document.getElementById("sdMeta").textContent = "฿" + ร้าน.ราคาต่ำ + "–" + ร้าน.ราคาสูง + " · " + distanceText(ร้าน.ระยะทาง) + " · " + t("restaurant.near") + ร้าน.มหาลัย;
	document.getElementById("sdDesc").textContent = foodDNAPersonal ? สร้างเหตุผลmatch(ร้าน, foodDNA) : "";
	document.getElementById("sdFullLink").href = "restaurant.html?id=" + ร้าน.id + "&from=roulette";
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
	// ไม่มี Food DNA ของผู้ใช้จริง → เรียงตามระยะ (ใกล้สุดก่อน) แทน Match ที่คิดจากโปรไฟล์ตัวอย่าง
	var sub = document.getElementById("recommendPopSub");
	if (sub) sub.textContent = t(foodDNAPersonal ? "roulette.recommendSub" : "roulette.recommendSubGuest");
	var แนะนำ = ร้านทั้งหมดที่สุ่มได้()
		.map(function(r) { return { r: r, m: foodDNAPersonal ? คำนวณMatch(r, foodDNA) : -ข้อมูลระยะทาง(r).meters }; })
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
// (เสร็จแล้ววาดตัวเลือกหมวดใหม่ เผื่อมีหมวดที่เพิ่งมีร้านจากชุมชน)
if (typeof syncShopsWithSupabase === "function") syncShopsWithSupabase(renderRouletteFilters);
// ดึงไลก์/ติดตามของตัวเองมาผสาน กันหัวใจ/ปุ่มติดตามในการ์ดร้านไม่ตรงกับที่เคยกดไว้จากเครื่องอื่น
if (typeof syncLikesAndFollowsWithSupabase === "function") syncLikesAndFollowsWithSupabase();
