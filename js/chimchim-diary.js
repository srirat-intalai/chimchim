// chimchim-diary.js
// หน้าไดอารี่อาหาร (diary.html): ปฏิทินรายเดือน + บันทึกของวันที่เลือก + ฟอร์มเพิ่มบันทึก + รายละเอียด/ลบ
// ข้อมูลทั้งหมดมาจาก chimchim-diary-store.js (ชุดเดียวกับส่วน "ไดอารี่ของฉัน" ในโปรไฟล์)
// ลิงก์เข้าหน้าได้: ?date=YYYY-MM-DD (เปิดวันนั้น) · ?entry=<id> (เปิดรายละเอียด) · ?new=1 (เปิดฟอร์มเพิ่มทันที)

var diaryState = {
	entries: [],
	month: null,        // Date วันที่ 1 ของเดือนที่แสดง
	selected: diaryToday(),
	loaded: false
};
var params = new URLSearchParams(window.location.search);
// ?u=<id> ของคนอื่น = ดูอย่างเดียว (ไม่มีเพิ่ม/ลบ) — สิทธิ์อ่านตัดสินที่ฐานข้อมูล (SQL Phase 22) ไม่ใช่ที่หน้านี้
var viewUserId = params.get("u");
var viewerMode = !!(viewUserId && (!getSession() || getSession().id !== viewUserId));

function entriesOn(dateKey) {
	return diaryState.entries.filter(function(e) { return e.date === dateKey; });
}
function setMonthFromKey(key) {
	var d = diaryParseKey(key) || new Date();
	diaryState.month = new Date(d.getFullYear(), d.getMonth(), 1);
}

/* ---------------- ปฏิทิน (วาดด้วย chimchim-diary-calendar.js ตัวเดียวกับหน้าโปรไฟล์) ---------------- */
function renderWeekdays() {
	renderDiaryWeekdays(document.getElementById("calWeekdays"));
}
function renderCalendar() {
	renderDiaryCalendar({
		label: document.getElementById("calMonthLabel"),
		grid: document.getElementById("calGrid"),
		summary: document.getElementById("calSummary")
	}, diaryState.month, diaryState.selected, diaryState.entries, selectDate);
}

/* ---------------- รายการของวันที่เลือก ---------------- */
function entryCard(e) {
	var card = document.createElement("article");
	card.className = "jentry" + (e.img ? "" : " no-photo");
	var meta = [];
	if (e.time) meta.push(e.time + (getLang() === "th" ? " น." : ""));
	if (e.rating) meta.push(diaryFeelingLabel(e.rating));
	card.innerHTML =
		(e.img ? '<img class="jentry-img" alt="" loading="lazy"/>' : "") +
		'<div class="jentry-body">' +
			'<h3 class="jentry-dish"></h3>' +
			'<p class="jentry-shop"></p>' +
			'<p class="jentry-meta"></p>' +
			'<p class="jentry-note"></p>' +
			'<button type="button" class="jlinkbtn"><span></span><i class="fas fa-arrow-right" aria-hidden="true"></i></button>' +
		"</div>";
	if (e.img) card.querySelector(".jentry-img").src = safeImgSrc(e.img);
	card.querySelector(".jentry-dish").textContent = e.dish;
	var shopEl = card.querySelector(".jentry-shop");
	shopEl.textContent = e.shop;
	shopEl.hidden = !e.shop;
	var metaEl = card.querySelector(".jentry-meta");
	metaEl.textContent = meta.join(" · ");
	metaEl.hidden = !meta.length;
	var noteEl = card.querySelector(".jentry-note");
	noteEl.textContent = e.note;
	noteEl.hidden = !e.note;
	var more = card.querySelector(".jlinkbtn");
	more.querySelector("span").textContent = t("diary.viewDetail");
	more.setAttribute("aria-label", t("diary.viewDetail") + ": " + e.dish);
	more.addEventListener("click", function() { openDetail(e.id); });
	return card;
}

function renderDay() {
	var key = diaryState.selected;
	var isToday = key === diaryToday();
	document.getElementById("dayLabel").textContent = isToday
		? t("diary.today") + " · " + diaryFormatDate(key, { day: "numeric", month: "long" })
		: diaryFormatDate(key, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
	var list = entriesOn(key);
	var box = document.getElementById("dayList");
	box.innerHTML = "";
	box.setAttribute("aria-busy", diaryState.loaded ? "false" : "true");
	list.forEach(function(e) { box.appendChild(entryCard(e)); });
	document.getElementById("dayCount").textContent = list.length ? t("diary.entryCount").replace("{n}", list.length) : "";
	var empty = document.getElementById("dayEmpty");
	empty.hidden = !diaryState.loaded || list.length > 0;
	// เพิ่มได้เฉพาะวันที่ยังเปิดบันทึก (วันนี้/เมื่อวาน) — วันที่ผ่านกำหนดแล้วบอกว่าหมดเวลา ไม่มีปุ่มเพิ่ม
	var open = !viewerMode && diaryCanRecord(key);
	var closedPast = !viewerMode && key < diaryOpenFrom();
	// ข้อความนี้ไม่มี data-i18n (ตั้งตอนรันเท่านั้น) — ไม่งั้น applyI18n เขียนทับเป็น "วันนี้ยังไม่มี…" แม้เป็นวันในอดีต
	document.getElementById("dayEmptyText").textContent = viewerMode ? t("diary.emptyOtherDay")
		: isToday ? t("diary.emptyDay")
		: closedPast ? t("diary.emptyClosed")
		: t("diary.emptyOtherDay");
	document.getElementById("dayEmptyAdd").hidden = !open;
}

function selectDate(key) {
	diaryState.selected = key;
	var d = diaryParseKey(key);
	if (d.getMonth() !== diaryState.month.getMonth() || d.getFullYear() !== diaryState.month.getFullYear()) setMonthFromKey(key);
	renderCalendar();
	renderDay();
	var params2 = new URLSearchParams(window.location.search); // คง ?u= ไว้ (ดูไดอารี่คนอื่นต่อ)
	params2.set("date", key);
	params2.delete("entry");
	params2.delete("new");
	history.replaceState(null, "", "?" + params2.toString());
}

function shiftMonth(delta) {
	var m = diaryState.month;
	diaryState.month = new Date(m.getFullYear(), m.getMonth() + delta, 1);
	renderCalendar();
}

/* ---------------- รายละเอียด ---------------- */
var detailDialog = document.getElementById("diaryDetail");
var detailId = null;
function openDetail(id) {
	var e = diaryState.entries.filter(function(x) { return x.id === id; })[0];
	if (!e) return;
	detailId = id;
	document.getElementById("ddDate").textContent = diaryFormatDate(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
		(e.time ? " · " + e.time + (getLang() === "th" ? " น." : "") : "");
	var img = document.getElementById("ddImg");
	img.hidden = !e.img;
	if (e.img) {
		img.src = safeImgSrc(e.img);
		img.alt = e.dish;
	} else {
		img.removeAttribute("src");
	}
	document.getElementById("ddDish").textContent = e.dish;
	var shop = document.getElementById("ddShop");
	shop.hidden = !e.shop;
	shop.innerHTML = "";
	if (e.shop) {
		// ร้านที่ผูกกับร้านในแอปได้ กดไปหน้าร้านต่อได้
		var el = e.shopId ? document.createElement("a") : document.createElement("span");
		if (e.shopId) el.href = "restaurant.html?id=" + encodeURIComponent(e.shopId) + "&from=diary";
		el.textContent = e.shop;
		shop.innerHTML = '<i class="fas fa-store" aria-hidden="true"></i>';
		shop.appendChild(el);
	}
	var feel = document.getElementById("ddFeel");
	feel.hidden = !e.rating;
	feel.textContent = diaryFeelingLabel(e.rating);
	var note = document.getElementById("ddNote");
	note.hidden = !e.note;
	note.textContent = e.note;
	document.getElementById("ddDelete").hidden = viewerMode;
	// แก้ไขได้เฉพาะบันทึกของวันที่ยังเปิดบันทึก (วันนี้/เมื่อวาน) — บันทึกเก่าดูได้อย่างเดียว
	document.getElementById("ddEdit").hidden = viewerMode || !diaryCanRecord(e.date);
	if (!detailDialog.open) detailDialog.showModal();
}
document.getElementById("ddEdit").addEventListener("click", function() {
	var e = diaryState.entries.filter(function(x) { return x.id === detailId; })[0];
	if (!e) return;
	detailDialog.close();
	openForm(null, e);
});
document.getElementById("ddDelete").addEventListener("click", function() {
	if (!detailId) return;
	var btn = this;
	var e = diaryState.entries.filter(function(x) { return x.id === detailId; })[0];
	var confirmP = typeof showConfirmDialog === "function"
		? showConfirmDialog({ title: t("diary.deleteTitle"), message: (e ? "“" + e.dish + "” — " : "") + t("diary.deleteConfirm"), confirmText: t("diary.delete"), icon: "trash-can" })
		: Promise.resolve(window.confirm(t("diary.deleteConfirm")));
	confirmP.then(function(yes) {
		if (!yes) return;
		btn.disabled = true;
		diaryRemove(detailId).then(function(res) {
			btn.disabled = false;
			if (res.error) {
				showToast(diaryErrorText(res.error));
				return;
			}
			diaryState.entries = diaryState.entries.filter(function(x) { return x.id !== detailId; });
			detailDialog.close();
			renderCalendar();
			renderDay();
			showToast(t("diary.deleted"));
		});
	});
});

/* ---------------- ฟอร์มเพิ่มบันทึก ---------------- */
var formDialog = document.getElementById("diaryForm");
var formEl = document.getElementById("diaryFormEl");
var formPhoto = "";
var formRating = null;
var formBusy = false;

function setFieldError(id, msg) {
	var el = document.getElementById(id + "Err");
	var input = document.getElementById(id);
	el.textContent = msg || "";
	el.hidden = !msg;
	if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
	if (input && msg) input.setAttribute("aria-describedby", id + "Err");
	else if (input) input.removeAttribute("aria-describedby");
}
function setPhoto(dataUrl) {
	formPhoto = dataUrl || "";
	var prev = document.getElementById("dfPhotoPreview");
	prev.hidden = !formPhoto;
	if (formPhoto) prev.src = formPhoto;
	else prev.removeAttribute("src");
	document.getElementById("dfPhotoBox").classList.toggle("has-photo", !!formPhoto);
	document.getElementById("dfPhotoRemove").hidden = !formPhoto;
	document.getElementById("dfPhotoLabel").textContent = t(formPhoto ? "diary.changePhoto" : "diary.pickPhoto");
}
function renderFeelOptions() {
	var box = document.getElementById("dfFeel");
	box.innerHTML = "";
	DIARY_RATINGS.forEach(function(r) {
		var b = document.createElement("button");
		b.type = "button";
		b.className = "jchip" + (formRating === r ? " active" : "");
		b.setAttribute("aria-pressed", formRating === r ? "true" : "false");
		b.textContent = diaryFeelingLabel(r);
		b.addEventListener("click", function() {
			formRating = formRating === r ? null : r; // กดซ้ำ = ไม่เลือก
			renderFeelOptions();
		});
		box.appendChild(b);
	});
}
var formEditId = null; // แก้ไขบันทึกเดิม (null = เพิ่มใหม่)
// ปุ่มเลือกวัน: เฉพาะวันที่ยังเปิดบันทึก (วันนี้ / เมื่อวาน) — ค่าจริงเก็บใน #dfDate
function renderDayPick(selectedKey) {
	var box = document.getElementById("dfDayPick");
	box.innerHTML = "";
	var today = diaryToday();
	for (var k = today; k >= diaryOpenFrom(); k = diaryAddDays(k, -1)) {
		(function(key) {
			var label = document.createElement("label");
			label.className = "jseg-opt";
			label.innerHTML = '<input type="radio" name="dfDay"/><span></span>';
			var input = label.querySelector("input");
			input.value = key;
			input.checked = key === selectedKey;
			label.querySelector("span").textContent = key === today ? t("diary.today")
				: key === diaryAddDays(today, -1) ? t("diary.yesterday")
				: diaryFormatDate(key, { weekday: "short", day: "numeric", month: "short" });
			input.addEventListener("change", function() {
				document.getElementById("dfDate").value = key;
				setFieldError("dfDate", "");
				document.getElementById("dfDayNote").hidden = true;
			});
			box.appendChild(label);
		})(k);
	}
}
function openForm(dateKey, entry) {
	if (viewerMode) return;
	if (!getSession()) {
		if (typeof openAuthPop === "function") openAuthPop("login");
		return;
	}
	formEditId = entry ? entry.id : null;
	formEl.reset();
	setPhoto(entry && entry.img ? entry.img : "");
	formRating = entry ? entry.rating : null;
	renderFeelOptions();
	["dfDish", "dfShop", "dfDate", "dfNote"].forEach(function(id) { setFieldError(id, ""); });
	document.getElementById("dfFormErr").hidden = true;
	var title = document.getElementById("diaryFormTitle");
	title.setAttribute("data-i18n", entry ? "diary.editTitle" : "diary.formTitle");
	title.textContent = t(title.getAttribute("data-i18n"));
	if (entry) {
		document.getElementById("dfDish").value = entry.dish || "";
		document.getElementById("dfShop").value = entry.shop || "";
		document.getElementById("dfTime").value = entry.time || "";
		document.getElementById("dfNote").value = entry.note || "";
	}
	document.getElementById("dfMore").open = !!(entry && (entry.time || entry.note));
	var key = entry ? entry.date : (diaryCanRecord(dateKey) ? dateKey : diaryToday());
	document.getElementById("dfDate").value = key;
	renderDayPick(key);
	// เปิดฟอร์มจากวันที่หมดเวลาบันทึกแล้ว → บอกก่อนว่าจะบันทึกเป็นวันไหนแทน (ไม่สลับเงียบ ๆ)
	var dayNote = document.getElementById("dfDayNote");
	dayNote.hidden = !(!entry && dateKey && !diaryCanRecord(dateKey));
	dayNote.textContent = dayNote.hidden ? "" : t("diary.dayClosedNote").replace("{date}", diaryFormatDate(dateKey, { day: "numeric", month: "long" }));
	document.getElementById("dfNoteCount").textContent = document.getElementById("dfNote").value.length;
	// บัญชีทดลองในเครื่อง: บอกตรง ๆ ว่าบันทึกอยู่แค่ในเบราว์เซอร์นี้
	var note = document.getElementById("dfStorageNote");
	note.hidden = diaryUsesServer();
	note.textContent = note.hidden ? "" : t("diary.localOnly");
	formDialog.showModal();
	document.getElementById("dfDish").focus();
}
(function fillShopSuggestions() {
	var list = document.getElementById("dfShopList");
	var seen = {};
	(typeof รายการร้าน !== "undefined" ? รายการร้าน : []).forEach(function(r) {
		if (!r.ร้าน || seen[r.ร้าน]) return;
		seen[r.ร้าน] = true;
		var o = document.createElement("option");
		o.value = r.ร้าน;
		list.appendChild(o);
	});
})();
document.getElementById("dfPhoto").addEventListener("change", function() {
	var file = this.files && this.files[0];
	this.value = "";
	if (!file) return;
	if (typeof เป็นไฟล์รูป === "function" && !เป็นไฟล์รูป(file)) {
		showToast(t("photos.badType").replace("{x}", 1));
		return;
	}
	if (file.size > CHIMCHIM_IMG_MAX_FILE_MB * 1024 * 1024) {
		showToast(t("photos.tooLarge").replace("{mb}", CHIMCHIM_IMG_MAX_FILE_MB).replace("{x}", 1));
		return;
	}
	var label = document.getElementById("dfPhotoLabel");
	label.textContent = t("photos.preparing");
	var reader = new FileReader();
	reader.onload = function(ev) {
		บีบอัดรูปหลายรูป(ev.target.result).then(setPhoto, function() {
			setPhoto(formPhoto);
			showToast(t("photos.readFailed").replace("{x}", 1));
		});
	};
	reader.onerror = function() { setPhoto(formPhoto); };
	reader.readAsDataURL(file);
});
document.getElementById("dfPhotoRemove").addEventListener("click", function() { setPhoto(""); });
// แก้ช่องที่ขึ้น error แล้ว → ซ่อน error ของช่องนั้นทันที (ไม่ค้างข้อความผิดทั้งที่แก้แล้ว)
["dfDish", "dfShop", "dfDate", "dfNote"].forEach(function(id) {
	document.getElementById(id).addEventListener("input", function() { setFieldError(id, ""); });
});
document.getElementById("dfNote").addEventListener("input", function() {
	document.getElementById("dfNoteCount").textContent = this.value.length;
});
formEl.addEventListener("submit", function(ev) {
	ev.preventDefault();
	if (formBusy) return;
	var input = {
		dish: document.getElementById("dfDish").value,
		shop: document.getElementById("dfShop").value,
		date: document.getElementById("dfDate").value,
		time: document.getElementById("dfTime").value,
		rating: formRating,
		note: document.getElementById("dfNote").value,
		img: formPhoto
	};
	var errs = diaryValidate(input);
	setFieldError("dfDish", errs.dish);
	setFieldError("dfShop", errs.shop);
	setFieldError("dfDate", errs.date);
	setFieldError("dfNote", errs.note);
	var firstBad = ["dish", "shop", "date", "note"].filter(function(k) { return errs[k]; })[0];
	if (firstBad) {
		var badEl = firstBad === "date" ? document.querySelector('#dfDayPick input') : document.getElementById("df" + firstBad.charAt(0).toUpperCase() + firstBad.slice(1));
		if (firstBad === "note") document.getElementById("dfMore").open = true;
		if (badEl) badEl.focus();
		return;
	}
	formBusy = true;
	var save = document.getElementById("dfSave");
	var saveText = document.getElementById("dfSaveText");
	save.disabled = true;
	saveText.textContent = t("diary.saving");
	document.getElementById("dfFormErr").hidden = true;
	var editing = formEditId;
	var progress = function(p) {
		if (p && p.stage === "uploading") saveText.textContent = t("diary.uploading");
	};
	(editing ? diaryUpdate(editing, input, progress) : diaryAdd(input, progress)).then(function(res) {
		formBusy = false;
		save.disabled = false;
		saveText.textContent = t("diary.save");
		if (res.error) {
			// บันทึกไม่สำเร็จ: ฟอร์มยังเก็บข้อมูลไว้ครบ แจ้งสาเหตุจริง
			var err = document.getElementById("dfFormErr");
			err.textContent = diaryErrorText(res.error);
			err.hidden = false;
			return;
		}
		if (editing) {
			diaryState.entries = diarySort(diaryState.entries.map(function(x) { return x.id === editing ? res.entry : x; }));
			formEditId = null;
			formDialog.close();
			selectDate(res.entry.date);
			showToast(t("diary.updated"));
			return;
		}
		diaryState.entries = diarySort(diaryState.entries.concat([res.entry]));
		if (params.get("return") === "profile") {
			// เปิดฟอร์มมาจากปุ่มใต้ปฏิทินในโปรไฟล์ → กลับไปที่ปฏิทินนั้น พร้อมเปิดวันที่เพิ่งบันทึก
			window.location.href = "profile.html?as=self&diaryDate=" + encodeURIComponent(res.entry.date) + "&diarySaved=1";
			return;
		}
		formDialog.close();
		selectDate(res.entry.date);
		showToast(t("diary.saved"));
		if (typeof logEvent === "function") logEvent("diary_entry_created", { hasPhoto: !!res.entry.img, hasShop: !!res.entry.shopId });
	});
});

/* ---------------- dialog ทั่วไป ---------------- */
[formDialog, detailDialog].forEach(function(d) {
	d.querySelectorAll("[data-close]").forEach(function(b) {
		b.addEventListener("click", function() { d.close(); });
	});
	// แตะพื้นหลังนอกกล่อง = ปิด (เฉพาะตอนไม่ได้กำลังบันทึก)
	d.addEventListener("click", function(ev) {
		if (ev.target === d && !formBusy) d.close();
	});
	d.addEventListener("cancel", function(ev) {
		if (formBusy) ev.preventDefault();
	});
});
// มาจากปุ่มบันทึกในโปรไฟล์แล้วกดยกเลิก → กลับโปรไฟล์ (ไม่ทิ้งผู้ใช้ไว้บนหน้าไดอารี่ที่ไม่ได้ตั้งใจเปิด)
formDialog.addEventListener("close", function() {
	if (params.get("return") === "profile" && !formBusy) window.location.href = "profile.html?as=self";
});

/* ---------------- เริ่มหน้า ---------------- */
document.getElementById("calPrev").addEventListener("click", function() { shiftMonth(-1); });
document.getElementById("calNext").addEventListener("click", function() { shiftMonth(1); });
document.getElementById("diaryAddBtn").addEventListener("click", function() { openForm(diaryState.selected); });
document.getElementById("dayEmptyAdd").addEventListener("click", function() { openForm(diaryState.selected); });
document.getElementById("diaryLoginBtn").addEventListener("click", function() {
	if (typeof openAuthPop === "function") openAuthPop("login");
});

// ข้อความที่ตั้งตอนรันต้องถอด data-i18n ออก ไม่งั้น applyI18n (วิ่งทีหลัง/ตอนสลับภาษา) จะเขียนทับกลับเป็นข้อความเดิม
function setRuntimeText(el, text) {
	el.removeAttribute("data-i18n");
	el.textContent = text;
}
function showDiaryMessage(title, desc, withLogin) {
	var box = document.getElementById("diaryGuest");
	setRuntimeText(box.querySelector("h2"), title);
	setRuntimeText(box.querySelector("p"), desc || "");
	box.querySelector("p").hidden = !desc;
	document.getElementById("diaryLoginBtn").hidden = !withLogin;
	box.hidden = false;
	document.getElementById("diaryApp").hidden = true;
}
// ดูไดอารี่ของคนอื่น: ไม่มีปุ่มเพิ่ม หัวข้อเป็นชื่อเจ้าของ ปุ่มย้อนกลับไปโปรไฟล์ของเขา
function bootViewer() {
	document.getElementById("diaryAddBtn").hidden = true;
	var back = document.querySelector(".jback");
	back.href = "public-profile.html?u=" + encodeURIComponent(viewUserId);
	setRuntimeText(document.querySelector(".jhead-text p"), t("diary.subtitleOther"));
	if (!getSession()) {
		showDiaryMessage(t("diary.loginToView"), "", true);
		return;
	}
	var startKey = diaryParseKey(params.get("date")) ? params.get("date") : diaryToday();
	diaryState.selected = startKey;
	setMonthFromKey(startKey);
	diaryLoadFor(viewUserId).then(function(res) {
		if (res.name) {
			setRuntimeText(document.querySelector(".jhead-text h1"), t("diary.titleOf").replace("{name}", res.name));
			document.title = t("diary.titleOf").replace("{name}", res.name) + " - ChimChim";
		}
		if (res.visibility === "private") {
			showDiaryMessage(t("diary.privateOther"), "", false);
			return;
		}
		if (res.error) {
			showDiaryMessage(t("diary.loadOtherFailed"), "", false);
			return;
		}
		diaryState.entries = res.entries;
		diaryState.loaded = true;
		document.getElementById("diaryApp").hidden = false;
		renderWeekdays();
		var entryId = params.get("entry");
		var target = entryId ? res.entries.filter(function(e) { return e.id === entryId; })[0] : null;
		if (target) {
			diaryState.selected = target.date;
			setMonthFromKey(target.date);
		}
		renderCalendar();
		renderDay();
		if (target) openDetail(target.id);
	});
}

(function bootDiary() {
	if (viewerMode) {
		bootViewer();
		return;
	}
	if (!getSession()) {
		document.getElementById("diaryGuest").hidden = false;
		return;
	}
	var startKey = diaryParseKey(params.get("date")) ? params.get("date") : diaryToday();
	diaryState.selected = startKey;
	setMonthFromKey(startKey);
	document.getElementById("diaryApp").hidden = false;
	renderWeekdays();
	// สำเนาในเครื่องขึ้นก่อน (เร็ว) แล้วค่อยแทนด้วยข้อมูลจากเซิร์ฟเวอร์
	diaryState.entries = diarySort(diaryReadCache());
	renderCalendar();
	renderDay();
	diaryLoad().then(function(res) {
		diaryState.entries = res.entries;
		diaryState.loaded = true;
		var banner = document.getElementById("diaryBanner");
		banner.hidden = !(res.source === "cache" || res.source === "local");
		banner.textContent = res.source === "cache" ? t("diary.loadFailed") : res.source === "local" ? t("diary.localOnly") : "";
		banner.classList.toggle("is-warn", res.source === "cache");
		var entryId = params.get("entry");
		var target = entryId ? res.entries.filter(function(e) { return e.id === entryId; })[0] : null;
		if (target) {
			diaryState.selected = target.date;
			setMonthFromKey(target.date);
		}
		renderCalendar();
		renderDay();
		if (target) openDetail(target.id);
		if (params.get("new") === "1") openForm(diaryState.selected);
	});
})();
