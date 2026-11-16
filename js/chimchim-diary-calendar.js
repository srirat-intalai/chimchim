// chimchim-diary-calendar.js
// ปฏิทินรายเดือนของไดอารี่อาหาร — ตัวเดียวใช้ทั้งหน้า diary.html และปฏิทินบนหน้าโปรไฟล์ (ไม่มีปฏิทินซ้ำสองชุด)
// ฟังก์ชันวาดอย่างเดียว ไม่เก็บ state เอง: หน้าที่เรียกถือเดือน/วันที่เลือก แล้วสั่งวาดใหม่เมื่อเปลี่ยน

// หัวคอลัมน์วันในสัปดาห์ (อาทิตย์ขึ้นก่อน ตามปฏิทินไทยทั่วไป) จาก locale ของเบราว์เซอร์ ไม่ต้องแปลเอง
function renderDiaryWeekdays(box) {
	box.innerHTML = "";
	for (var i = 0; i < 7; i++) {
		var d = new Date(2024, 0, 7 + i); // 7 ม.ค. 2024 = วันอาทิตย์
		var s = document.createElement("span");
		s.textContent = d.toLocaleDateString(diaryLocale(), { weekday: "narrow" });
		box.appendChild(s);
	}
}

// วาดตารางเดือน month (Date วันที่ 1) — วันที่มีบันทึกแสดงรูปอาหารจริงของวันนั้น (ไม่มีรูป = จุด)
// คืนจำนวนบันทึกในเดือนนั้น / onSelect(dateKey) เมื่อกดวัน
// els.boxes (ถ้ามี = ไดอารี่ของตัวเองบนบัญชีจริง, SQL Phase 27): { "YYYY-MM-DD": { id, kind, stars, tapsLeft, opened, reward } }
// els.chestDays: { "YYYY-MM-DD": true } วันหีบ (สัปดาห์ละ 2 วัน สุ่มที่ฐานข้อมูล)
//   วันนี้/วันข้างหน้า = เหรียญทอง หรือหีบ (วันหีบ) รอรับ · วันที่ผ่านไปแล้วไม่ได้อัป = เทาจาง
//   ได้รางวัลแล้ว: ยังไม่เปิด = ส่ายรอแตะ (แตะวัน = เปิดผ่าน els.onCoin) · เปิดแล้ว = +N
function diaryCoinState(boxes, chestDays, key, today) {
	var c = boxes[key];
	if (c) return { state: c.opened ? "opened" : "sealed", kind: c.kind === "chest" ? "chest" : "coin" };
	return { state: key >= today ? "earn" : "missed", kind: chestDays && chestDays[key] ? "chest" : "coin" };
}
function diaryPrizeArt(kind) {
	return '<img src="img/prize/' + (kind === "chest" ? "chest" : "coin") + '.svg" alt="" draggable="false"/>';
}
function renderDiaryCalendar(els, month, selectedKey, entries, onSelect) {
	els.label.textContent = month.toLocaleDateString(diaryLocale(), { month: "long", year: "numeric" });
	var grid = els.grid;
	grid.innerHTML = "";
	var byDate = {};
	entries.forEach(function(e) { (byDate[e.date] = byDate[e.date] || []).push(e); });
	var first = new Date(month.getFullYear(), month.getMonth(), 1);
	var daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); // ถูกต้องทั้ง 28/29/30/31 วัน
	var today = diaryToday();
	var monthCount = 0;
	var row = null;
	// ช่องว่างก่อนวันที่ 1 (ตามวันในสัปดาห์) แล้วต่อด้วยทุกวันในเดือน แบ่งแถวละ 7 ช่อง
	var cells = [];
	for (var b = 0; b < first.getDay(); b++) cells.push(null);
	for (var day = 1; day <= daysInMonth; day++) cells.push(day);
	while (cells.length % 7) cells.push(null);

	cells.forEach(function(day, i) {
		if (i % 7 === 0) {
			row = document.createElement("div");
			row.className = "jcal-row";
			row.setAttribute("role", "row");
			grid.appendChild(row);
		}
		if (day === null) {
			var blank = document.createElement("span");
			blank.className = "jcal-cell is-blank";
			blank.setAttribute("role", "gridcell");
			row.appendChild(blank);
			return;
		}
		var key = diaryDateKey(new Date(month.getFullYear(), month.getMonth(), day));
		var list = byDate[key] || [];
		monthCount += list.length;
		var withPhoto = list.filter(function(e) { return e.img; })[0];
		var prize = els.boxes ? diaryCoinState(els.boxes, els.chestDays, key, today) : null;
		var coinState = prize ? prize.state : null;
		var coin = prize ? els.boxes[key] : null;
		var btn = document.createElement("button");
		btn.type = "button";
		btn.className = "jcal-cell" +
			(list.length ? " has-entry" : "") +
			(withPhoto ? " has-photo" : "") +
			(key === today ? " is-today" : "") +
			(key === selectedKey ? " is-selected" : "") +
			(key > today ? " is-future" : "") +
			(!list.length && key < diaryOpenFrom() ? " is-closed" : "") +
			(coinState && !withPhoto ? " has-coin" : "") +
			(prize && prize.kind === "chest" && !withPhoto ? " is-chestday" : "");
		btn.setAttribute("role", "gridcell");
		btn.setAttribute("data-date", key);
		btn.setAttribute("aria-selected", key === selectedKey ? "true" : "false");
		btn.setAttribute("aria-label", diaryFormatDate(key, { weekday: "long", day: "numeric", month: "long" }) +
			(key === today ? " (" + t("diary.today") + ")" : "") +
			(list.length ? " — " + t("diary.entryCount").replace("{n}", list.length) : "") +
			(coinState === "sealed" ? " — " + t(prize.kind === "chest" ? "coin.cellSealedChest" : "coin.cellSealed")
				: coinState === "opened" ? " — " + t("coin.cellOpened").replace("{n}", coin.reward)
				: prize && prize.kind === "chest" ? " — " + t("coin.cellChestDay") : ""));
		if (key === selectedKey) btn.setAttribute("aria-current", "date");
		if (withPhoto) btn.style.backgroundImage = "url('" + cssUrl(withPhoto.img) + "')";
		var coinHtml = "";
		if (coinState && !withPhoto) {
			coinHtml = '<span class="jcal-coin is-' + coinState + " kind-" + prize.kind + '" aria-hidden="true">' + diaryPrizeArt(prize.kind) +
				(coinState === "opened" ? "<b>+" + coin.reward + "</b>" : "") + "</span>";
		} else if (withPhoto && (coinState === "sealed" || coinState === "opened")) {
			coinHtml = '<span class="jcal-coinbadge is-' + coinState + " kind-" + prize.kind + '" aria-hidden="true">' +
				(coinState === "opened" ? "+" + coin.reward : diaryPrizeArt(prize.kind)) + "</span>";
		}
		btn.innerHTML = '<span class="jcal-num">' + day + "</span>" + coinHtml + (list.length > 1 ? '<span class="jcal-more">' + list.length + "</span>" : "");
		btn.addEventListener("click", function() {
			onSelect(key);
			if (coinState === "sealed" && typeof els.onCoin === "function") els.onCoin(key);
		});
		// ปุ่มลูกศรเลื่อนวัน (←/→ ทีละวัน, ↑/↓ ทีละสัปดาห์) ตามแบบ grid — Tab เข้าได้ช่องเดียว (วันที่เลือก)
		btn.tabIndex = key === selectedKey ? 0 : -1;
		btn.addEventListener("keydown", function(ev) {
			var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
			if (!step) return;
			ev.preventDefault();
			var all = Array.prototype.slice.call(grid.querySelectorAll("button.jcal-cell"));
			var next = all[all.indexOf(btn) + step];
			if (next) {
				btn.tabIndex = -1;
				next.tabIndex = 0;
				next.focus();
			}
		});
		row.appendChild(btn);
	});
	// วันที่เลือกไม่อยู่ในเดือนนี้ → ให้วันแรกของเดือนรับ Tab แทน
	if (!grid.querySelector('button.jcal-cell[tabindex="0"]')) {
		var firstBtn = grid.querySelector("button.jcal-cell");
		if (firstBtn) firstBtn.tabIndex = 0;
	}
	if (els.summary) {
		els.summary.textContent = monthCount ? t("diary.monthSummary").replace("{n}", monthCount) : t("diary.monthEmpty");
	}
	return monthCount;
}
