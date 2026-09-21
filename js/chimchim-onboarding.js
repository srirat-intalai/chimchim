// chimchim-onboarding.js
// แบบสอบถามสร้าง Food DNA ส่วนตัว 5 ขั้นตอน (profile-setup.html)
// ผลลัพธ์จะถูกบันทึกลงบัญชีผู้ใช้ (localStorage) แล้วใช้แทนค่า Food DNA เริ่มต้นทั่วทั้งแอป

var obAnswers = {
	foodType: [],
	cuisine: [],
	flavor: [],
	budget: null,
	distance: null
};
var obCurrentStep = 1;
var OB_TOTAL_STEPS = 4; // ขั้นตอนกรอกข้อมูล 4 หน้า (หน้าที่ 5 คือหน้าสรุปผล Done)

function obGoToStep(n) {
	obCurrentStep = n;
	document.getElementById("obStep1").hidden = n !== 1;
	document.getElementById("obStep2").hidden = n !== 2;
	document.getElementById("obStep3").hidden = n !== 3;
	document.getElementById("obStep4").hidden = n !== 4;
	document.getElementById("obStepLbl").textContent = t("onboarding.stepOf").replace("{n}", n);

	var dots = [document.getElementById("obp1"), document.getElementById("obp2"), document.getElementById("obp3"), document.getElementById("obp4"), document.getElementById("obp5")];
	dots.forEach(function(d, i) {
		d.classList.toggle("done", i < n);
	});

	document.getElementById("obBackBtn").style.visibility = n === 1 ? "hidden" : "visible";
	obUpdateNextBtnState();
}

function obUpdateNextBtnState() {
	var nextBtn = document.getElementById("obNextBtn");
	var valid = false;
	if (obCurrentStep === 1) valid = obAnswers.foodType.length > 0;
	else if (obCurrentStep === 2) valid = obAnswers.cuisine.length > 0;
	else if (obCurrentStep === 3) valid = obAnswers.flavor.length > 0;
	else if (obCurrentStep === 4) valid = obAnswers.budget !== null && obAnswers.distance !== null;
	nextBtn.disabled = !valid;
}

/* --- ตัวเลือกแบบเลือกได้หลายอย่าง (obopt ในกริด) --- */
document.querySelectorAll(".obgrid .obopt").forEach(function(opt) {
	opt.addEventListener("click", function() {
		var grid = this.closest(".obgrid");
		var field = grid.getAttribute("data-field");
		var val = this.getAttribute("data-val");
		this.classList.toggle("picked");

		var idx = obAnswers[field].indexOf(val);
		if (this.classList.contains("picked") && idx === -1) {
			obAnswers[field].push(val);
		} else if (!this.classList.contains("picked") && idx !== -1) {
			obAnswers[field].splice(idx, 1);
		}
		obUpdateNextBtnState();
	});
});

/* --- ตัวเลือกแบบเลือกได้อย่างเดียว (obrangeopt) --- */
document.querySelectorAll(".obrange .obrangeopt").forEach(function(opt) {
	opt.addEventListener("click", function() {
		var group = this.closest(".obrange");
		var field = group.getAttribute("data-field");
		group.querySelectorAll(".obrangeopt").forEach(function(o) {
			o.classList.remove("picked");
			o.querySelector("i").style.opacity = 0;
		});
		this.classList.add("picked");
		this.querySelector("i").style.opacity = 1;
		obAnswers[field] = parseInt(this.getAttribute("data-val"), 10);
		obUpdateNextBtnState();
	});
});

/* --- ปุ่มถัดไป / เสร็จสิ้น --- */
document.getElementById("obNextBtn").addEventListener("click", function() {
	if (obCurrentStep < OB_TOTAL_STEPS) {
		obGoToStep(obCurrentStep + 1);
	} else {
		obFinish();
	}
});

/* --- ปุ่มย้อนกลับ --- */
document.getElementById("obBackBtn").addEventListener("click", function() {
	if (obCurrentStep > 1) {
		obGoToStep(obCurrentStep - 1);
	} else {
		history.back();
	}
});

var OB_BUDGET_MAP = { 80: 60, 150: 115, 250: 220 };

function obFinish() {
	var budgetAvg = OB_BUDGET_MAP[obAnswers.budget] || 100;
	var newDNA = {
		ชอบหมวด: obAnswers.foodType,
		ชอบชาติอาหาร: obAnswers.cuisine,
		ชอบรส: obAnswers.flavor,
		งบเฉลี่ยที่ใช้บ่อย: budgetAvg,
		ระยะที่ยอมไป: obAnswers.distance
	};

	updateMe({ foodDNA: newDNA });
	applyPersonalFoodDNA();

	// ซ่อนขั้นตอนกรอกข้อมูล โชว์หน้าสรุปผล
	document.querySelector(".obtopnav").hidden = true;
	document.querySelector(".obprogress").hidden = true;
	document.getElementById("obStep4").hidden = true;
	document.getElementById("obNextBtn").hidden = true;
	document.getElementById("obDone").hidden = false;

	var maxBudget = 300;
	var maxDist = 5000;
	var rows = [
		{ label: t("dna.cuisine"), value: newDNA.ชอบชาติอาหาร.map(catLabel).join(", ") || "-", pct: 100 },
		{ label: t("dna.flavor"), value: newDNA.ชอบรส.map(catLabel).join(", ") || "-", pct: 100 },
		{ label: t("dna.budget"), value: "฿" + newDNA.งบเฉลี่ยที่ใช้บ่อย, pct: Math.min(100, Math.round((newDNA.งบเฉลี่ยที่ใช้บ่อย / maxBudget) * 100)) },
		{ label: t("dna.distance"), value: distanceText(newDNA.ระยะที่ยอมไป), pct: Math.min(100, Math.round((newDNA.ระยะที่ยอมไป / maxDist) * 100)) }
	];
	var html = "";
	rows.forEach(function(r) {
		html +=
			'<div class="obdnarow">' +
				'<div class="obdnalbl"><span>' + r.label + "</span><span>" + escapeHtml(r.value) + "</span></div>" +
				'<div class="obdnabar"><span style="width:0%;" data-pct="' + r.pct + '"></span></div>' +
			"</div>";
	});
	document.getElementById("obDnaBody").innerHTML = html;

	// อนิเมชันหลอด DNA ค่อย ๆ วิ่งเข้าที่
	setTimeout(function() {
		document.querySelectorAll("#obDnaBody .obdnabar span").forEach(function(bar) {
			bar.style.width = bar.getAttribute("data-pct") + "%";
		});
	}, 150);
}

obGoToStep(1);
