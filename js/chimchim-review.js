// chimchim-review.js
// หน้าเขียนรีวิว (review.html) — อ่าน ?id= จาก URL แล้วบันทึกรีวิวลง localStorage
// ถ้ามี ?editRemoteId= ด้วย = เปิดมาแก้ไขรีวิวเดิมของตัวเอง (ต้อง sync ขึ้น Supabase แล้วเท่านั้นถึงจะแก้ได้)

var revParams = new URLSearchParams(window.location.search);
var revShopId = parseInt(revParams.get("id"), 10);
var revEditRemoteId = revParams.get("editRemoteId");
var revร้าน = หาร้านจากId(revShopId);
var revExisting = revEditRemoteId ? getReviewByRemoteId(revShopId, revEditRemoteId) : null;

if (!revร้าน) {
	document.querySelector(".revwrap").innerHTML =
		'<div style="text-align:center;padding:60px 10px;">' +
		'<p style="color:#999;font-size:.9rem;margin-bottom:16px;">' + t("common.shopNotFound") + '</p>' +
		'<a href="home.html" class="btn-red"><i class="fas fa-house"></i><span>' + t("common.backToHome") + '</span></a>' +
		"</div>";
} else {
	document.getElementById("revShopImg").src = revร้าน.รูป;
	document.getElementById("revShopImg").alt = revร้าน.เมนู;
	document.getElementById("revShopName").textContent = revร้าน.ร้าน;
	document.getElementById("revShopDish").textContent = revร้าน.เมนู;

	var meSession = getSession();
	if (!meSession) {
		document.getElementById("revNameRow").hidden = false;
	}

	var scores = { taste: 0, atmosphere: 0, service: 0 };
	var chosenReviewImages = [];
	var reviewImgList = document.getElementById("reviewImgList");
	var reviewImgBox = document.getElementById("reviewImgUploadBox");
	var reviewImgCount = document.getElementById("reviewImgCount");
	var reviewImgInput = document.getElementById("reviewImgFile");
	// พรีวิวรูปที่เลือก: ตารางย่อ + ปุ่มลบทุกรูป + ช่อง "เพิ่มรูป" ต่อท้ายจนกว่าจะครบ 10 รูป
	function renderChosenReviewImages() {
		reviewImgList.innerHTML = "";
		chosenReviewImages.forEach(function(src, idx) {
			var thumb = document.createElement("div");
			thumb.className = "postimgthumb";
			thumb.innerHTML = '<img src="' + src + '" alt=""/><button type="button" title="' + t("common.removePhoto") + '" aria-label="' + t("common.removePhoto") + '"><i class="fas fa-times"></i></button>';
			thumb.querySelector("img").addEventListener("click", function() { openPhotoViewer(chosenReviewImages, idx); });
			thumb.querySelector("button").addEventListener("click", function() {
				chosenReviewImages.splice(idx, 1);
				renderChosenReviewImages();
			});
			reviewImgList.appendChild(thumb);
		});
		var full = chosenReviewImages.length >= CHIMCHIM_MAX_IMAGES;
		if (chosenReviewImages.length && !full) {
			var addTile = document.createElement("label");
			addTile.className = "postimgadd";
			addTile.setAttribute("for", "reviewImgFile");
			addTile.innerHTML = '<i class="fas fa-plus"></i><span>' + t("profile.addMorePhotos") + "</span>";
			reviewImgList.appendChild(addTile);
		}
		// ครบ 10 แล้ว ปิดช่องเลือกไฟล์ไปเลย (กันเปิดตัวเลือกไฟล์จากที่อื่นได้อีก)
		reviewImgInput.disabled = full;
		reviewImgBox.hidden = chosenReviewImages.length > 0;
		reviewImgCount.textContent = t("photos.count").replace("{n}", chosenReviewImages.length).replace("{max}", CHIMCHIM_MAX_IMAGES);
		reviewImgCount.classList.toggle("full", full);
	}
	wireMultiImageUpload("reviewImgFile", function(dataUrls) {
		dataUrls.forEach(function(dataUrl) {
			if (chosenReviewImages.length < CHIMCHIM_MAX_IMAGES) chosenReviewImages.push(dataUrl);
		});
		renderChosenReviewImages();
	}, {
		remaining: function() { return CHIMCHIM_MAX_IMAGES - chosenReviewImages.length; },
		onBusy: function(on) { document.getElementById("reviewImgBusy").hidden = !on; }
	});
	renderChosenReviewImages();

	function setDinoScore(field, val) {
		scores[field] = val;
		var row = document.querySelector('.revdinos[data-field="' + field + '"]');
		row.querySelectorAll(".revdino").forEach(function(d) {
			var dVal = parseInt(d.getAttribute("data-val"), 10);
			d.classList.toggle("on", dVal <= val);
		});
	}

	document.querySelectorAll(".revdinos").forEach(function(row) {
		var field = row.getAttribute("data-field");
		row.querySelectorAll(".revdino").forEach(function(dino) {
			dino.addEventListener("click", function() {
				setDinoScore(field, parseInt(this.getAttribute("data-val"), 10));
			});
		});
	});

	// โหมดแก้ไข — พรีฟิลคะแนน/ข้อความเดิม เปลี่ยนหัวข้อหน้า+ปุ่ม แล้วสลับ submit ไปเรียก updateReview แทน
	// ตั้ง data-i18n ใหม่ด้วย (ไม่ใช่แค่ตั้ง textContent เฉย ๆ) กัน applyI18n() ตอน DOMContentLoaded เขียนทับกลับ
	if (revExisting) {
		var titleEl = document.querySelector(".obstepnum");
		titleEl.setAttribute("data-i18n", "review.editPageTitle");
		titleEl.textContent = t("review.editPageTitle");
		var submitLabelEl = document.querySelector(".revsubmitbtn span");
		submitLabelEl.setAttribute("data-i18n", "review.saveChanges");
		submitLabelEl.textContent = t("review.saveChanges");
		setDinoScore("taste", revExisting.taste);
		setDinoScore("atmosphere", revExisting.atmosphere);
		setDinoScore("service", revExisting.service);
		document.getElementById("reviewText").value = revExisting.text || "";
		chosenReviewImages = (revExisting.images || []).slice();
		renderChosenReviewImages();
	}

	document.getElementById("reviewForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("reviewErr");
		errBox.classList.remove("show");

		if (!scores.taste || !scores.atmosphere || !scores.service) {
			errBox.textContent = t("review.rateAllThree");
			errBox.classList.add("show");
			return;
		}

		if (chosenReviewImages.length > CHIMCHIM_MAX_IMAGES) {
			errBox.textContent = t("photos.overLimitShort").replace("{n}", CHIMCHIM_MAX_IMAGES);
			errBox.classList.add("show");
			return;
		}
		if (!document.getElementById("reviewImgBusy").hidden) {
			errBox.textContent = t("photos.waitPreparing");
			errBox.classList.add("show");
			return;
		}

		var submitBtn = document.querySelector(".revsubmitbtn");
		if (submitBtn.disabled) return;
		submitBtn.disabled = true;
		var submitIcon = submitBtn.querySelector("i");
		submitIcon.className = "fas fa-spinner fa-spin";
		var images = chosenReviewImages.slice(0, CHIMCHIM_MAX_IMAGES);

		// รอผลบันทึกจริงก่อนเสมอ (ไม่ตัดเวลา) — ถ้าไม่สำเร็จ แจ้งเหตุ ไม่เปลี่ยนหน้า และเก็บข้อมูลในฟอร์มไว้ให้กดส่งใหม่
		function onSaved(result, nextUrl) {
			if (result && result.ok) {
				window.location.href = nextUrl;
				return;
			}
			var reason = (result && result.reason) || "server";
			errBox.textContent = t("review.saveFailed." + reason);
			errBox.classList.add("show");
			errBox.scrollIntoView({ behavior: "smooth", block: "center" });
			submitBtn.disabled = false;
			submitIcon.className = "fas fa-paper-plane";
		}

		if (revExisting) {
			updateReview(revร้าน.id, revExisting.remoteId, {
				taste: scores.taste,
				atmosphere: scores.atmosphere,
				service: scores.service,
				text: document.getElementById("reviewText").value.trim(),
				images: images
			}).then(function(result) { onSaved(result, "restaurant.html?id=" + revร้าน.id); });
			return;
		}

		var author = meSession ? meSession.name : (document.getElementById("reviewAuthor").value.trim() || t("common.anonymousFoodie"));

		addReview(revร้าน.id, {
			taste: scores.taste,
			atmosphere: scores.atmosphere,
			service: scores.service,
			text: document.getElementById("reviewText").value.trim(),
			author: author,
			userId: meSession ? meSession.id : null,
			date: new Date().toISOString(),
			images: images
		}).then(function(result) { onSaved(result, "home.html?reviewed=1"); });
	});
}
