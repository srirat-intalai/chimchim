// chimchim-coin.js
// รางวัลลุ้นดาว (SQL Phase 27): เหรียญ/หีบจากไดอารี่ และหีบสมบัติจากเช็กอิน — แตะลุ้นอัปดาวแบบเปิดหีบในเกม
// กติกา (ตัดสินที่ฐานข้อมูลทั้งหมด หน้านี้แค่เล่นแอนิเมชันตามผลที่ได้):
//   ลุ้นได้ 3 ครั้ง · อัปดาวเมื่อไหร่ได้ลุ้นต่ออีก 3 ครั้ง · สูงสุด 4 ดาว · หมดสิทธิ์/ครบ 4 ดาว = เปิด
//   เหรียญ (เริ่ม 1★): 1★=1 2★=2 3★=3 4★=5 · หีบ (ไดอารี่เริ่ม 2★ / เช็กอินการันตี 3★): 2★=4 3★=6 4★=10
// แอนิเมชัน: ไม่อัป = ค่อย ๆ ใหญ่ขึ้น · อัป = เหรียญหมุน / หีบกระโดดสั่น + ดาวเด้ง · เปิด = ระเบิดเป็นยอด Token
// เสียง: สังเคราะห์สดด้วย Web Audio (ไม่มีไฟล์เสียง) — ปิดได้ จำไว้ในเครื่อง

var CHIMCHIM_BOX_REWARDS = { coin: [0, 1, 2, 3, 5], chest: [0, 2, 4, 6, 10] };
var CHIMCHIM_BOX_ART = { coin: "img/prize/coin.svg", chest: "img/prize/chest.svg" };

/* ---------------- เสียง ---------------- */
var coinAudioCtx = null;
function coinSoundOn() {
	try { return localStorage.getItem("chimchim_sound") !== "0"; } catch (e) { return true; }
}
function coinAudio() {
	if (!coinSoundOn()) return null;
	var AC = window.AudioContext || window.webkitAudioContext;
	if (!AC) return null;
	if (!coinAudioCtx) coinAudioCtx = new AC();
	if (coinAudioCtx.state === "suspended") coinAudioCtx.resume();
	return coinAudioCtx;
}
// โน้ตเดียว: ความถี่เริ่ม → ปลาย (ไล่ขึ้น = "ชูวิง") ดังขึ้นเร็วแล้วจางแบบระฆังเล็ก
function coinTone(ctx, at, dur, from, to, type, vol) {
	var osc = ctx.createOscillator();
	var gain = ctx.createGain();
	var t0 = ctx.currentTime + at;
	osc.type = type || "sine";
	osc.frequency.setValueAtTime(from, t0);
	if (to && to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur * 0.8);
	gain.gain.setValueAtTime(0.0001, t0);
	gain.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.012);
	gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.start(t0);
	osc.stop(t0 + dur + 0.02);
}
function coinPlay(sound, kind) {
	var ctx = coinAudio();
	if (!ctx) return;
	var low = kind === "chest" ? 0.75 : 1; // หีบเสียงทุ้มกว่าเหรียญนิดหนึ่ง
	if (sound === "tap") {
		coinTone(ctx, 0, 0.09, 1175 * low, 1568 * low, "sine", 0.14);
		coinTone(ctx, 0.01, 0.06, 2349 * low, 2349 * low, "sine", 0.04);
	} else if (sound === "up") {
		// ชูวิ้ง — ไล่เสียงขึ้นแล้วมีประกายสองจังหวะ
		coinTone(ctx, 0, 0.3, 440 * low, 1760 * low, "triangle", 0.12);
		coinTone(ctx, 0.24, 0.14, 1568, 1568, "sine", 0.12);
		coinTone(ctx, 0.34, 0.22, 2093, 2093, "sine", 0.1);
	} else if (sound === "open") {
		// ชูวิง ชูวิง — อาร์เปจจิโอขึ้นสี่โน้ต + ประกายท้าย
		[1047, 1319, 1568, 2093].forEach(function(f, i) { coinTone(ctx, i * 0.08, 0.22, f, f * 1.01, "sine", 0.13); });
		coinTone(ctx, 0.34, 0.45, 3136, 3520, "sine", 0.05);
		if (kind === "chest") coinTone(ctx, 0.5, 0.5, 2637, 3136, "sine", 0.06);
	} else if (sound === "fail") {
		coinTone(ctx, 0, 0.16, 392, 330, "sine", 0.08);
	}
}

/* ---------------- หน้าต่างลุ้นดาว ---------------- */
var coinDlgState = null; // { box, onChange, busy, levelTaps, revealing }
function coinReducedMotion() {
	return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function coinBuildDialog() {
	var dlg = document.getElementById("coinDialog");
	if (dlg) return dlg;
	dlg = document.createElement("dialog");
	dlg.id = "coinDialog";
	dlg.className = "coindlg";
	dlg.setAttribute("aria-labelledby", "coinTitle");
	dlg.innerHTML =
		'<div class="cn-head">' +
			'<button type="button" class="cn-sound" aria-pressed="true"><i class="fas fa-volume-high" aria-hidden="true"></i></button>' +
			'<h2 id="coinTitle"></h2>' +
			'<button type="button" class="cn-close"><i class="fas fa-xmark" aria-hidden="true"></i></button>' +
		"</div>" +
		'<p class="cn-date"></p>' +
		'<ol class="cn-stars">' + '<li><i class="fas fa-star" aria-hidden="true"></i></li>'.repeat(4) + "</ol>" +
		'<p class="cn-table"></p>' +
		'<div class="cn-stage">' +
			'<span class="cn-aura" aria-hidden="true"></span>' +
			'<button type="button" class="cn-coin" aria-describedby="cnHint">' +
				'<img class="cn-art" alt="" draggable="false"/>' +
				'<span class="cn-burst" aria-hidden="true">' + "<i></i>".repeat(8) + "</span>" +
			"</button>" +
			'<p class="cn-result" hidden><b class="cn-amount"></b><span>Token</span></p>' +
		"</div>" +
		'<p class="cn-taps" aria-hidden="true"><i></i><i></i><i></i></p>' +
		'<p class="cn-hint" id="cnHint" aria-live="polite"></p>' +
		'<button type="button" class="btn-red cn-done" hidden></button>';
	document.body.appendChild(dlg);
	dlg.querySelector(".cn-close").addEventListener("click", function() { dlg.close(); });
	dlg.querySelector(".cn-done").addEventListener("click", function() { dlg.close(); });
	dlg.addEventListener("click", function(e) { if (e.target === dlg) dlg.close(); });
	dlg.querySelector(".cn-sound").addEventListener("click", function() {
		var on = !coinSoundOn();
		try { localStorage.setItem("chimchim_sound", on ? "1" : "0"); } catch (e) {}
		coinPaintSound(dlg);
		if (on) coinPlay("tap", coinDlgState && coinDlgState.box.kind);
	});
	dlg.querySelector(".cn-coin").addEventListener("click", coinTap);
	return dlg;
}
function coinPaintSound(dlg) {
	var on = coinSoundOn();
	var b = dlg.querySelector(".cn-sound");
	b.setAttribute("aria-pressed", on ? "true" : "false");
	b.setAttribute("aria-label", t(on ? "coin.soundOff" : "coin.soundOn"));
	b.querySelector("i").className = "fas " + (on ? "fa-volume-high" : "fa-volume-xmark");
}
// วาดสถานะปัจจุบัน (ดาว · สิทธิ์ที่เหลือ · ขนาด · ผลลัพธ์)
function coinPaint(dlg, hintKey, hintN) {
	var st = coinDlgState;
	var c = st.box;
	var done = c.opened && !st.revealing; // ระหว่างเล่นแอนิเมชันเปิด ยังโชว์ของอยู่
	dlg.querySelector(".cn-stars").setAttribute("aria-label", t("coin.starsOf").replace("{n}", c.stars));
	dlg.querySelectorAll(".cn-stars li").forEach(function(li, i) { li.classList.toggle("is-on", i < c.stars); });
	dlg.querySelectorAll(".cn-taps i").forEach(function(dot, i) { dot.classList.toggle("is-on", !c.opened && i < c.tapsLeft); });
	dlg.querySelector(".cn-taps").hidden = done;
	dlg.querySelector(".cn-stage").setAttribute("data-stars", c.stars);
	var coinBtn = dlg.querySelector(".cn-coin");
	coinBtn.hidden = done;
	dlg.querySelector(".cn-aura").hidden = done;
	coinBtn.disabled = c.opened || st.busy;
	coinBtn.setAttribute("aria-label", t(c.kind === "chest" ? "coin.tapChestLabel" : "coin.tapLabel").replace("{n}", c.tapsLeft));
	// ไม่อัปดาว: ยิ่งแตะในระดับเดียวกัน ยิ่งใหญ่ขึ้นทีละนิด (ลุ้นขึ้นเรื่อย ๆ)
	coinBtn.style.setProperty("--cn-grow", String(1 + 0.08 * Math.min(st.levelTaps, 6)));
	var result = dlg.querySelector(".cn-result");
	result.hidden = !done;
	if (done) dlg.querySelector(".cn-amount").textContent = "+" + c.reward;
	dlg.querySelector(".cn-done").hidden = !done;
	dlg.querySelector(".cn-hint").textContent = t(hintKey).replace("{n}", hintN);
}
function coinTap() {
	var st = coinDlgState;
	if (!st || st.busy || st.box.opened) return;
	var dlg = document.getElementById("coinDialog");
	var coinBtn = dlg.querySelector(".cn-coin");
	var kind = st.box.kind;
	st.busy = true;
	coinBtn.disabled = true;
	// ตอบสนองทันทีที่แตะ (เด้งเล็ก ๆ + ติ๊ง) ระหว่างรอฐานข้อมูลสุ่มผล
	coinPlay("tap", kind);
	coinBtn.classList.remove("is-bump");
	void coinBtn.offsetWidth;
	coinBtn.classList.add("is-bump");
	sbBoxTap(st.box.id).then(function(res) {
		st.busy = false;
		if (!res || res.status === "none" || res.status === "auth") {
			coinPlay("fail", kind);
			coinBtn.disabled = false;
			dlg.querySelector(".cn-hint").textContent = t(res && res.status === "none" ? "coin.none" : "coin.tapFailed");
			return;
		}
		st.box = Object.assign({}, st.box, { stars: res.stars, tapsLeft: res.tapsLeft, opened: res.status === "opened", reward: res.reward });
		var upClass = kind === "chest" ? "is-hop" : "is-spin";
		if (res.upgraded) {
			st.levelTaps = 0;
			coinPlay("up", kind);
			coinBtn.classList.remove("is-spin", "is-hop");
			void coinBtn.offsetWidth;
			coinBtn.classList.add(upClass);
			var star = dlg.querySelectorAll(".cn-stars li")[res.stars - 1];
			if (star) { star.classList.remove("is-pop"); void star.offsetWidth; star.classList.add("is-pop"); }
		} else {
			st.levelTaps++;
		}
		var hintKey = res.upgraded ? "coin.upgraded" : "coin.tapsLeft";
		var hintN = res.upgraded ? res.stars : res.tapsLeft;
		if (st.box.opened) {
			// เปิด: รอให้หมุน/กระโดดจบก่อน แล้วค่อยระเบิดเป็นยอด Token
			var wait = res.upgraded && !coinReducedMotion() ? 820 : 260;
			st.revealing = true;
			coinPaint(dlg, hintKey, hintN);
			coinBtn.disabled = true;
			setTimeout(function() {
				coinBtn.classList.add("is-open");
				coinPlay("open", kind);
				setTimeout(function() {
					coinBtn.classList.remove("is-open", "is-spin", "is-hop", "is-bump");
					st.revealing = false;
					coinPaint(dlg, "coin.opened", res.stars);
					dlg.querySelector(".cn-done").focus();
					if (typeof res.balance === "number" && typeof chimchimPaintTokenBalance === "function") chimchimPaintTokenBalance(res.balance);
				}, coinReducedMotion() ? 0 : 420);
			}, wait);
		} else {
			coinPaint(dlg, hintKey, hintN);
		}
		if (typeof st.onChange === "function") st.onChange(st.box);
	});
}
// เปิดหน้าต่างลุ้นดาว — box = { id, kind: coin|chest, source: diary|login, day, stars, tapsLeft, opened, reward }
// onChange(box) ทุกครั้งที่ผลเปลี่ยน (ให้หน้าที่เรียกวาดปฏิทิน/ยอดใหม่)
function openPrizeBox(box, onChange) {
	if (!box || !box.id || typeof sbBoxTap !== "function") return;
	var dlg = coinBuildDialog();
	var kind = box.kind === "chest" ? "chest" : "coin";
	coinDlgState = { box: Object.assign({}, box, { kind: kind }), onChange: onChange, busy: false, levelTaps: 3 - (box.tapsLeft || 0), revealing: false };
	dlg.setAttribute("data-kind", kind);
	dlg.querySelector("#coinTitle").textContent = t(kind === "coin" ? "coin.title" : box.source === "login" ? "coin.titleLoginChest" : "coin.titleChest");
	dlg.querySelector(".cn-close").setAttribute("aria-label", t("common.close"));
	dlg.querySelector(".cn-done").textContent = t("coin.done");
	dlg.querySelector(".cn-date").textContent = box.day && typeof diaryFormatDate === "function" ? diaryFormatDate(box.day, { day: "numeric", month: "long" }) : "";
	var art = dlg.querySelector(".cn-art");
	art.src = CHIMCHIM_BOX_ART[kind];
	// ตารางรางวัลตามดาว (บอกตรง ๆ ว่าลุ้นอะไรอยู่)
	var table = CHIMCHIM_BOX_REWARDS[kind];
	var minStars = kind === "coin" ? 1 : box.source === "login" ? 3 : 2; // หีบเช็กอินการันตี 3★ / หีบไดอารี่เริ่ม 2★
	dlg.querySelector(".cn-table").textContent = [1, 2, 3, 4].filter(function(s) { return s >= minStars; })
		.map(function(s) { return s + "★ " + table[s]; }).join(" · ") + " Token";
	coinPaintSound(dlg);
	coinPaint(dlg, box.opened ? "coin.opened" : "coin.tapsLeft", box.opened ? box.stars : box.tapsLeft);
	if (!dlg.open) dlg.showModal();
	(box.opened ? dlg.querySelector(".cn-done") : dlg.querySelector(".cn-coin")).focus();
}
window.openPrizeBox = openPrizeBox;
