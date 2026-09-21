// chimchim-review.js
// หน้าเขียนรีวิว (review.html) — อ่าน ?id= จาก URL แล้วบันทึกรีวิวลง localStorage

var revParams = new URLSearchParams(window.location.search);
var revShopId = parseInt(revParams.get("id"), 10);
var revร้าน = หาร้านจากId(revShopId);

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

	document.querySelectorAll(".revdinos").forEach(function(row) {
		var field = row.getAttribute("data-field");
		row.querySelectorAll(".revdino").forEach(function(dino) {
			dino.addEventListener("click", function() {
				var val = parseInt(this.getAttribute("data-val"), 10);
				scores[field] = val;
				row.querySelectorAll(".revdino").forEach(function(d) {
					var dVal = parseInt(d.getAttribute("data-val"), 10);
					d.classList.toggle("on", dVal <= val);
				});
			});
		});
	});

	document.getElementById("reviewForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("reviewErr");
		errBox.classList.remove("show");

		if (!scores.taste || !scores.atmosphere || !scores.service) {
			errBox.textContent = t("review.rateAllThree");
			errBox.classList.add("show");
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
