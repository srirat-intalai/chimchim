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

		if (revExisting) {
			updateReview(revร้าน.id, revExisting.remoteId, {
				taste: scores.taste,
				atmosphere: scores.atmosphere,
				service: scores.service,
				text: document.getElementById("reviewText").value.trim()
			});
			window.location.href = "restaurant.html?id=" + revร้าน.id;
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
			date: new Date().toISOString()
		});

		window.location.href = "home.html?reviewed=1";
	});
}
