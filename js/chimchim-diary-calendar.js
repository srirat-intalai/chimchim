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
		var btn = document.createElement("button");
		btn.type = "button";
		btn.className = "jcal-cell" +
			(list.length ? " has-entry" : "") +
			(withPhoto ? " has-photo" : "") +
			(key === today ? " is-today" : "") +
			(key === selectedKey ? " is-selected" : "") +
			(key > today ? " is-future" : "");
		btn.setAttribute("role", "gridcell");
		btn.setAttribute("data-date", key);
		btn.setAttribute("aria-selected", key === selectedKey ? "true" : "false");
		btn.setAttribute("aria-label", diaryFormatDate(key, { weekday: "long", day: "numeric", month: "long" }) +
			(key === today ? " (" + t("diary.today") + ")" : "") +
			(list.length ? " — " + t("diary.entryCount").replace("{n}", list.length) : ""));
		if (key === selectedKey) btn.setAttribute("aria-current", "date");
		if (withPhoto) btn.style.backgroundImage = "url('" + cssUrl(withPhoto.img) + "')";
		btn.innerHTML = '<span class="jcal-num">' + day + "</span>" + (list.length > 1 ? '<span class="jcal-more">' + list.length + "</span>" : "");
		btn.addEventListener("click", function() { onSelect(key); });
		row.appendChild(btn);
	});
	if (els.summary) {
		els.summary.textContent = monthCount ? t("diary.monthSummary").replace("{n}", monthCount) : t("diary.monthEmpty");
	}
	return monthCount;
}
