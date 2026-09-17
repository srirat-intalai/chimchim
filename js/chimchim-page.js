// chimchim-page.js
// หน้า Settings: สร้าง/แก้ไข "เพจร้านอาหาร" (เหมือนเพจ Facebook) + สลับโพสต์ในนามตัวเอง/เพจ
// ใครก็สร้างได้จากตรงนี้เลย ไม่ต้องสมัครบัญชีร้านค้าแยกต่างหาก

(function() {
	var guestCard = document.getElementById("pageGuestCard");
	var formCard = document.getElementById("pageFormCard");
	var personaCard = document.getElementById("personaCard");
	if (!guestCard || !formCard) return;

	var session = getSession();
	if (!session) {
		guestCard.hidden = false;
		return;
	}
	formCard.hidden = false;

	var myPage = getMyPage();

	/* --- อัปโหลดรูปเพจเอง (แทนดรอปดาวน์เลือกรูปสต็อกเดิม) --- */
	wireImageUpload("pageAvatarFile", "pageAvatar", "pageAvatarPreviewImg", "pageAvatarUploadBox", myPage ? myPage.avatar : null);

	function refreshPreview(page) {
		var previewBox = document.getElementById("pagePreview");
		if (!page) {
			previewBox.hidden = true;
			return;
		}
		previewBox.hidden = false;
		document.getElementById("pagePreviewAvatar").src = page.avatar;
		document.getElementById("pagePreviewName").textContent = page.name;
		document.getElementById("pagePreviewCat").textContent = catEmoji(page.cat) + " " + catLabel(page.cat);
		var viewLink = document.getElementById("pageViewLink");
		viewLink.hidden = false;
		viewLink.href = "public-profile.html?u=page-" + encodeURIComponent(page.id);
	}

	function refreshPersonaUI(page) {
		if (!page) {
			personaCard.hidden = true;
			return;
		}
		personaCard.hidden = false;
		document.getElementById("personaPageLabel").textContent = page.name;
		var active = getActivePersona();
		document.querySelectorAll("#personaToggle .settopt").forEach(function(btn) {
			var isPage = btn.getAttribute("data-persona") === "page";
			btn.classList.toggle("active", isPage ? active === page.id : active === "self");
		});
	}

	if (myPage) {
		document.getElementById("pageName").value = myPage.name;
		document.getElementById("pageCat").value = myPage.cat;
		document.getElementById("pageBio").value = myPage.bio || "";
		document.getElementById("pageSubmitBtn").innerHTML = '<i class="fas fa-floppy-disk"></i><span>' + t("shop.saveChanges") + "</span>";
	}
	refreshPreview(myPage);
	refreshPersonaUI(myPage);

	document.getElementById("pageForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("pageErr");
		errBox.classList.remove("show");

		var name = document.getElementById("pageName").value.trim();
		var cat = document.getElementById("pageCat").value;
		var avatar = document.getElementById("pageAvatar").value;
		var bio = document.getElementById("pageBio").value.trim();

		if (!name || !avatar) {
			errBox.textContent = "กรอกชื่อเพจและเลือกรูปก่อนนะ";
			errBox.classList.add("show");
			return;
		}

		var page = createOrUpdateMyPage({ name: name, cat: cat, avatar: avatar, bio: bio });
		document.getElementById("pageSubmitBtn").innerHTML = '<i class="fas fa-floppy-disk"></i><span>' + t("shop.saveChanges") + "</span>";
		refreshPreview(page);
		refreshPersonaUI(page);
		if (typeof showToast === "function") showToast("บันทึกเพจ “" + name + "” เรียบร้อยแล้ว! 🎉");
	});

	document.querySelectorAll("#personaToggle .settopt").forEach(function(btn) {
		btn.addEventListener("click", function() {
			var page = getMyPage();
			if (!page) return;
			var choice = this.getAttribute("data-persona") === "page" ? page.id : "self";
			setActivePersona(choice);
			refreshPersonaUI(page);
		});
	});
})();
