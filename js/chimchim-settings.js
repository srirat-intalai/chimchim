// chimchim-settings.js
// หน้าตั้งค่า (settings.html): สลับ Light/Dark และ EN/TH — เก็บค่าไว้ผ่าน chimchim-i18n.js

function refreshSettingsUI() {
	var theme = getTheme();
	document.querySelectorAll("#themeToggle .settopt").forEach(function(btn) {
		btn.classList.toggle("active", btn.getAttribute("data-theme-choice") === theme);
	});
	var lang = getLang();
	document.querySelectorAll("#langToggle .settopt").forEach(function(btn) {
		btn.classList.toggle("active", btn.getAttribute("data-lang-choice") === lang);
	});
}

document.querySelectorAll("#themeToggle .settopt").forEach(function(btn) {
	btn.addEventListener("click", function() {
		setTheme(this.getAttribute("data-theme-choice"));
		refreshSettingsUI();
	});
});

document.querySelectorAll("#langToggle .settopt").forEach(function(btn) {
	btn.addEventListener("click", function() {
		setLang(this.getAttribute("data-lang-choice"));
		refreshSettingsUI();
		if (typeof showToast === "function") {
			showToast(getLang() === "th" ? "เปลี่ยนเป็นภาษาไทยแล้ว 🇹🇭" : "Switched to English 🇬🇧");
		}
	});
});

refreshSettingsUI();

/* --- ตำแหน่งของฉัน — ขอ GPS จริง หามหาลัยที่ใกล้สุด เก็บไว้ใช้ให้คะแนนโบนัสร้านแถวนั้นทุกหน้า --- */
(function setupLocationButton() {
	var btn = document.getElementById("requestLocationBtn");
	var hint = document.getElementById("locationHint");
	if (!btn) return;

	function refreshLocationHint() {
		var loc = getUserLocation();
		if (loc && loc.nearestUni) {
			hint.textContent = t("settings.locationFound").replace("{uni}", loc.nearestUni);
		} else {
			hint.textContent = t("settings.locationHint");
		}
	}
	refreshLocationHint();

	btn.addEventListener("click", function() {
		btn.disabled = true;
		var originalHtml = btn.innerHTML;
		btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i><span>' + t("settings.locationLoading") + "</span>";
		ขอตำแหน่งผู้ใช้().then(function() {
			refreshLocationHint();
			showToast(t("settings.locationSuccess"));
		}).catch(function() {
			showToast(t("settings.locationError"));
		}).finally(function() {
			btn.disabled = false;
			btn.innerHTML = originalHtml;
		});
	});
})();

/* --- ประวัติการกดถูกใจ/รีวิว (ย้ายมาจากหน้าโปรไฟล์) — โชว์เต็มลิสต์ตรงนี้เลย ไม่ต้องมี popup ดูเพิ่ม เพราะหน้าตั้งค่ามีที่พอ --- */
(function renderAccountHistory() {
	var session = getSession();
	if (!session) return;

	var likesCard = document.getElementById("likesHistoryCard");
	if (likesCard) {
		likesCard.hidden = false;
		var likeList = document.getElementById("settingsLikesList");
		var likeEmpty = document.getElementById("settingsLikesEmpty");
		var likedShops = getLikedShops().map(function(id) { return หาร้านจากId(id); }).filter(function(r) { return r; });
		if (likedShops.length === 0) {
			likeEmpty.hidden = false;
		} else {
			likeEmpty.hidden = true;
			likedShops.forEach(function(ร้าน) { likeList.appendChild(buildLikeRow(ร้าน)); });
		}
	}

	var followsCard = document.getElementById("followsHistoryCard");
	if (followsCard) {
		followsCard.hidden = false;
		var followList = document.getElementById("settingsFollowsList");
		var followEmpty = document.getElementById("settingsFollowsEmpty");
		var followedShops = getFollowedShops().map(function(id) { return หาร้านจากId(id); }).filter(function(r) { return r; });
		if (followedShops.length === 0) {
			followEmpty.hidden = false;
		} else {
			followEmpty.hidden = true;
			followedShops.forEach(function(ร้าน) { followList.appendChild(buildLikeRow(ร้าน)); });
		}
	}
})();
