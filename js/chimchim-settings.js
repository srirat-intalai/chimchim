// chimchim-settings.js
// หน้าตั้งค่า (settings.html): สลับ Light/Dark และ EN/TH — เก็บค่าไว้ผ่าน chimchim-i18n.js

/* --- แก้ไขโปรไฟล์: ชื่อ/bio/รูปโปรไฟล์ — บันทึก local ก่อนทันที แล้วค่อยผลักขึ้น Supabase จริงตามหลัง
   (ดึงของจริงจาก Supabase มาเติมฟอร์มก่อนด้วย เผื่อเพิ่งแก้จากเครื่องอื่นมา ฟอร์มจะได้ไม่เก่ากว่าของจริง) --- */
(function setupEditProfile() {
	var card = document.getElementById("editProfileCard");
	if (!card) return;
	var me = getMe();
	if (!me) return;
	card.hidden = false;

	document.getElementById("editProfileName").value = me.name || "";
	document.getElementById("editProfileBio").value = me.bio || "";
	var unameInput = document.getElementById("editProfileUsername");
	var unameHint = document.getElementById("editProfileUsernameHint");
	unameInput.value = me.username || "";
	// คำอธิบายใต้ช่อง ↔ ข้อความผิดพลาด (เอา data-i18n ออกตอนโชว์ error ไม่งั้นสลับภาษาแล้วโดนเขียนทับ)
	function setUnameHint(key, isError) {
		if (isError) unameHint.removeAttribute("data-i18n"); else unameHint.setAttribute("data-i18n", key);
		unameHint.textContent = t(key);
		unameHint.classList.toggle("is-error", !!isError);
		unameInput.classList.toggle("is-invalid", !!isError);
		if (isError) unameInput.setAttribute("aria-invalid", "true"); else unameInput.removeAttribute("aria-invalid");
	}
	unameInput.addEventListener("input", function() {
		var v = normalizeUsername(unameInput.value);
		if (v && v.length >= 3 && !CHIMCHIM_USERNAME_RE.test(v)) setUnameHint("settings.usernameFormat", true);
		else setUnameHint("settings.usernameHint", false);
	});
	if (typeof syncMyUsernameWithSupabase === "function") {
		syncMyUsernameWithSupabase(function() {
			if (document.activeElement !== unameInput) unameInput.value = getMe().username || "";
		});
	}
	wireImageUpload("avatarFile", "avatarUrl", "avatarPreviewImg", "avatarUploadBox", me.avatar || null);

	var uniSelect = document.getElementById("editProfileUni");
	if (uniSelect && typeof มหาวิทยาลัยทั้งหมด !== "undefined") {
		มหาวิทยาลัยทั้งหมด.forEach(function(u) {
			var opt = document.createElement("option");
			opt.value = u;
			opt.textContent = u;
			uniSelect.appendChild(opt);
		});
		uniSelect.value = me.university || "";
	}

	if (typeof syncMyProfileWithSupabase === "function") {
		syncMyProfileWithSupabase(function() {
			var fresh = getMe();
			document.getElementById("editProfileName").value = fresh.name || "";
			document.getElementById("editProfileBio").value = fresh.bio || "";
			if (fresh.avatar) {
				document.getElementById("avatarUrl").value = fresh.avatar;
				var img = document.getElementById("avatarPreviewImg");
				img.src = fresh.avatar;
				img.hidden = false;
				document.getElementById("avatarUploadBox").classList.add("haspreview");
			}
		});
	}
	// มหาวิทยาลัยแยก sync ต่างหากจากข้อมูลโปรไฟล์หลัก (ชื่อ/bio/avatar) โดยตั้งใจ — เผื่อยังไม่ได้รัน
	// SQL Phase 6 (เพิ่มคอลัมน์ university ใน profiles) จะได้ไม่ทำให้ sync ชื่อ/bio/avatar พังไปด้วย
	if (typeof syncMyUniversityWithSupabase === "function") {
		syncMyUniversityWithSupabase(function() {
			if (uniSelect) uniSelect.value = getMe().university || "";
		});
	}

	document.getElementById("editProfileForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("editProfileErr");
		errBox.classList.remove("show");
		var name = document.getElementById("editProfileName").value.trim();
		if (!name) {
			errBox.textContent = t("shop.fillRequired");
			errBox.classList.add("show");
			return;
		}
		// ชื่อผู้ใช้: ตรวจรูปแบบก่อน แล้วบัญชีจริงต้องให้เซิร์ฟเวอร์ยืนยันว่าไม่ซ้ำก่อนบันทึกอย่างอื่น
		var uname = normalizeUsername(unameInput.value);
		var unameChanged = uname !== (getMe().username || "");
		if (uname && !CHIMCHIM_USERNAME_RE.test(uname)) {
			setUnameHint("settings.usernameFormat", true);
			unameInput.focus();
			return;
		}
		if (!unameChanged) { saveProfile(); return; }
		if (typeof ต้องบันทึกขึ้นเซิร์ฟเวอร์ === "function" && ต้องบันทึกขึ้นเซิร์ฟเวอร์()) {
			var submitBtn = document.getElementById("editProfileSubmitBtn");
			submitBtn.disabled = true;
			sbSaveMyUsername(uname).then(function(res) {
				submitBtn.disabled = false;
				if (res.error) {
					setUnameHint(res.error === "taken" ? "settings.usernameTaken" : res.error === "format" ? "settings.usernameFormat" : res.error === "unavailable" ? "settings.usernameUnavailable" : "settings.usernameFailed", true);
					unameInput.focus();
					return;
				}
				saveProfile();
			});
			return;
		}
		// บัญชีทดลองในเครื่อง — ห้ามซ้ำกับบัญชีอื่นในเครื่องนี้
		var meId = getMe().id;
		if (uname && getUsers().some(function(u) { return u.id !== meId && (u.username || "") === uname; })) {
			setUnameHint("settings.usernameTaken", true);
			unameInput.focus();
			return;
		}
		saveProfile();
	});

	function saveProfile() {
		var errBox = document.getElementById("editProfileErr");
		var name = document.getElementById("editProfileName").value.trim();
		var patch = { name: name, bio: document.getElementById("editProfileBio").value.trim(), username: normalizeUsername(unameInput.value) };
		var avatar = document.getElementById("avatarUrl").value;
		if (avatar) patch.avatar = avatar;
		var university = uniSelect ? uniSelect.value : "";
		if (uniSelect) patch.university = university;
		if (!updateMe(patch)) {
			errBox.textContent = t("shop.storageFullError");
			errBox.classList.add("show");
			return;
		}
		setSession(getMe());
		if (typeof sbSaveMyProfile === "function") sbSaveMyProfile(patch);
		if (typeof sbSaveMyUniversity === "function" && uniSelect) sbSaveMyUniversity(university);
		if (typeof refreshAuthUI === "function") refreshAuthUI();
		unameInput.value = patch.username;
		setUnameHint("settings.usernameHint", false);
		if (typeof showToast === "function") showToast(t("settings.profileSavedToast"));
	}
})();

function refreshSettingsUI() {
	var theme = getThemeChoice();
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

/* กิจกรรมของฉัน (ถูกใจ / รีวิว / บันทึกไว้) ย้ายไปเป็นแท็บในหน้าโปรไฟล์แล้ว — ดู setupProfileTabs ใน chimchim-profile.js */

/* --- ออกจากระบบ (ย้ายมาจากหน้าโปรไฟล์) — ล้างเซสชันในเครื่อง + ออกจาก Supabase แล้วกลับไปหน้าโปรไฟล์
   (ซึ่งจะแสดงกล่องเข้าสู่ระบบ/สมัครสมาชิก) รอ sign out เสร็จก่อนเปลี่ยนหน้า ไม่ตัดคำขอกลางทาง --- */
(function setupLogout() {
	var btn = document.getElementById("logoutBtn");
	if (!btn || !getSession()) return;
	btn.hidden = false;
	btn.addEventListener("click", function() {
		btn.disabled = true;
		clearSession();
		showToast(t("profile.logoutToast"));
		var signOut = typeof sbSignOut === "function" ? Promise.resolve(sbSignOut()).catch(function() {}) : Promise.resolve();
		Promise.all([signOut, new Promise(function(r) { setTimeout(r, 400); })]).then(function() {
			window.location.href = "profile.html";
		});
	});
})();
