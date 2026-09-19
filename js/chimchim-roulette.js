// chimchim-roulette.js
// วงล้อสุ่มเมนู (เฉพาะหน้า roulette.html)

var wheelDisc = document.getElementById("wheelDisc");
var spinBtn = document.getElementById("spinBtn");
var wheelSpinning = false;
var wheelRotation = 0;

/* -----------------------------------------------------
   โหมดการสุ่ม 3 แบบ: กินตามใจชอบ / ลองสิ่งตรงข้าม / Mix It Up
   แต่ละโหมดถ่วงน้ำหนักโอกาสที่แต่ละช่องของวงล้อจะถูกเลือก
   ตามคะแนน Match ของหมวดนั้นกับ Food DNA ผู้ใช้
----------------------------------------------------- */
var currentRouletteMode = "like";
var rmodeDescText = {
	like: "หมุนแล้วมีโอกาสเจอเมนู/ร้านที่ตรงกับ Food DNA ของคุณมากที่สุด 🎯",
	opposite: "อยากลองอะไรใหม่ไหม? โหมดนี้จะสุ่มเมนูที่ตรงข้ามกับที่คุณชอบเป็นพิเศษ 🙃",
	mix: "ผสมกันไปทั้งเมนูที่ชอบและไม่ชอบ ได้ผลลัพธ์สนุก ๆ คาดเดาไม่ได้ 🎲"
};
function updateRouletteModeDesc() {
	var el = document.getElementById("rmodeDesc");
	if (el) el.textContent = rmodeDescText[currentRouletteMode];
}
document.querySelectorAll(".rmodebtn").forEach(function(btn) {
	btn.addEventListener("click", function() {
		document.querySelectorAll(".rmodebtn").forEach(function(b) { b.classList.remove("active"); });
		this.classList.add("active");
		currentRouletteMode = this.getAttribute("data-mode");
		updateRouletteModeDesc();
	});
});
updateRouletteModeDesc();

// เลือกช่องวงล้อตามโหมดที่ผู้ใช้ตั้งไว้ คืนค่า index ของช่อง + คะแนน match ของหมวดนั้น
function เลือกช่องตามโหมด(mode) {
	var คะแนนทั้งหมด = วงล้อหมวดอาหาร.map(function(cat) {
		return คำนวณคะแนนหมวดวงล้อ(cat, foodDNA);
	});
	// น้ำหนักเดิมยกกำลัง 2 ทำให้หมวดคะแนนสูงสุดผูกขาดวงล้อเกือบทุกรอบ (ซ้ำซากเกินไป)
	// ลดเลขยกกำลังลงเหลือ 1.3 + บวกฐานคะแนนขั้นต่ำ ให้หมวดที่คะแนนต่ำกว่ายังมีโอกาสออกได้บ้าง
	// (จำลองเทียบแล้ว: หมวดอันดับ 1 จากเดิมออก ~27% ของรอบทั้งหมด เหลือ ~19% หลากหลายขึ้นชัดเจน แต่ยังให้น้ำหนักตามความชอบอยู่)
	var weights;
	if (mode === "opposite") {
		weights = คะแนนทั้งหมด.map(function(s) { return Math.pow(Math.max(100 - s, 1), 1.3) + 15; });
	} else if (mode === "mix") {
		weights = คะแนนทั้งหมด.map(function() { return 1; });
	} else {
		weights = คะแนนทั้งหมด.map(function(s) { return Math.pow(Math.max(s, 1), 1.3) + 15; });
	}
	var idx = สุ่มถ่วงน้ำหนัก(weights);
	return { idx: idx, score: คะแนนทั้งหมด[idx] };
}

// จัดตำแหน่งตัวหนังสือแต่ละช่องให้อยู่ "ข้างใน" วงล้อเสมอ ไม่ว่าวงล้อจะขนาดเท่าไหร่
// (คำนวณจากขนาดจริงของวงล้อ แทนที่จะ hardcode พิกเซลตายตัว)
function positionWheelLabels() {
	var radius = wheelDisc.offsetWidth / 2;
	var labelRadius = Math.max(radius * 0.6, 40);
	document.querySelectorAll(".wslice").forEach(function(el) {
		var angle = parseFloat(el.getAttribute("data-angle"));
		el.style.transform = "rotate(" + angle + "deg) translate(0,-" + labelRadius + "px) rotate(-" + angle + "deg)";
	});
}
positionWheelLabels();
window.addEventListener("resize", positionWheelLabels);

function spinWheel() {
	if (wheelSpinning) return;
	wheelSpinning = true;
	spinBtn.disabled = true;

	var sliceCount = วงล้อหมวดอาหาร.length;
	var sliceAngle = 360 / sliceCount;
	var เลือก = เลือกช่องตามโหมด(currentRouletteMode);
	var randomIndex = เลือก.idx;
	var sliceCenter = randomIndex * sliceAngle + sliceAngle / 2;

	var extraSpins = 5 + Math.floor(Math.random() * 3);
	var currentMod = wheelRotation % 360;
	var delta = (360 - sliceCenter) - currentMod;
	while (delta < 0) {
		delta += 360;
	}
	wheelRotation += extraSpins * 360 + delta;
	wheelDisc.style.transform = "rotate(" + wheelRotation + "deg)";

	setTimeout(function() {
		wheelSpinning = false;
		spinBtn.disabled = false;
		revealWheelResult(randomIndex, เลือก.score);
	}, 4300);
}

var rresultDescByMode = {
	like: "ชิมชิมเลือกเมนูนี้ให้เพราะตรงกับ Food DNA ของคุณมาก ๆ ลองเลยไม่ผิดหวังแน่ 🦖",
	opposite: "ลองกินสิ่งที่ปกติคุณอาจไม่เลือกดูสักครั้ง เผื่อจะเจอเมนูโปรดใหม่! 🙃",
	mix: "สุ่มมาแบบไม่มีสูตรตายตัว ผสมทั้งของที่ชอบและของใหม่ ลุ้นกันไปเลย 🎲"
};
function revealWheelResult(idx, baseScore) {
	var cat = วงล้อหมวดอาหาร[idx];
	var item = cat.pool[Math.floor(Math.random() * cat.pool.length)];

	var จิตเตอร์ = Math.floor(Math.random() * 11) - 5;
	var matchScore = baseScore + จิตเตอร์;
	if (matchScore > 98) matchScore = 98;
	if (matchScore < 5) matchScore = 5;

	// หมวดนี้มีร้านจริงในระบบไหม (ผูกกับ รายการร้าน จริงหรือเปล่า) — ถ้าไม่มี ห้ามโชว์รูปมั่ว ๆ แทนของจริง โชว์แค่ชื่อพอ
	var มีร้านจริง = cat.กรองได้ && รายการร้าน.some(function(r) { return r.หมวด === cat.กรองได้; });
	var imgEl = document.getElementById("wresultImg");
	imgEl.hidden = !มีร้านจริง;
	if (มีร้านจริง) {
		imgEl.src = item.img;
		imgEl.alt = item.name;
	}
	document.getElementById("wresultTag").textContent = cat.emoji + " " + cat.label + " • 🎯 " + matchScore + "% Match";
	document.getElementById("wresultTitle").textContent = item.name;
	document.getElementById("wresultDesc").textContent = มีร้านจริง
		? (rresultDescByMode[currentRouletteMode] || rresultDescByMode.mix)
		: "ยังไม่มีร้านหมวดนี้ในระบบตอนนี้ ลองหมุนใหม่ดูร้านหมวดอื่นที่มีอยู่จริงได้เลย 🦖";
	document.getElementById("wresultBtns").hidden = false;

	renderSimilarShops(cat);
}

// ร้านที่คล้ายกับผลที่สุ่มได้ — โชว์ 2-3 ร้านจริงในหมวดเดียวกันตรงนี้เลย ไม่ต้องกลับไปหน้าแรก
// ถ้าหมวดนั้นไม่ได้ผูกกับ หมวด ในรายการร้านโดยตรง (เช่น อิตาเลียน/ปิ้งย่าง) ใช้ร้าน Match สูงสุดโดยรวมแทน
function renderSimilarShops(cat) {
	var section = document.getElementById("wSimilarSection");
	var row = document.getElementById("wSimilarRow");
	if (!section || !row) return;

	var pool = cat.กรองได้ ? รายการร้าน.filter(function(r) { return r.หมวด === cat.กรองได้; }) : รายการร้าน;
	var ranked = pool
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

/* --- กดร้านที่คล้ายกันแล้วเด้ง popup ดูรายละเอียดตรงนี้เลย ไม่ต้องออกจากหน้าวงล้อ --- */
var shopDetailPop = document.getElementById("shopDetailPop");
function openShopDetailPopup(ร้าน) {
	if (!shopDetailPop) return;
	var คะแนน = คำนวณMatch(ร้าน, foodDNA);
	document.getElementById("sdImg").src = ร้าน.รูป;
	document.getElementById("sdImg").alt = ร้าน.เมนู;
	document.getElementById("sdCat").textContent = catEmoji(ร้าน.หมวด) + " " + catLabel(ร้าน.หมวด);
	document.getElementById("sdTitle").textContent = ร้าน.เมนู;
	document.getElementById("sdRestaurant").innerHTML = '<i class="fas fa-store"></i> ' + escapeHtml(ร้าน.ร้าน);
	document.getElementById("sdMatchPct").textContent = matchBadgeText(คะแนน);
	document.getElementById("sdMeta").textContent = "฿" + ร้าน.ราคาต่ำ + "–" + ร้าน.ราคาสูง + " · " + distanceText(ร้าน.ระยะทาง) + " · ใกล้" + ร้าน.มหาลัย;
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

/* --- ปุ่ม "ดูร้านแนะนำ" — เด้ง popup รายชื่อร้านแนะนำจาก Food DNA ตรงนี้เลย ไม่ต้องออกจากหน้าวงล้อ --- */
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

spinBtn.addEventListener("click", spinWheel);
document.getElementById("wagainBtn").addEventListener("click", spinWheel);
