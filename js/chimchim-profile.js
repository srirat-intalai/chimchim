// chimchim-profile.js
// หน้าโปรไฟล์ (profile.html) — โชว์ข้อมูลบัญชี, Food DNA, ร้านที่ Follow, ร้านของฉัน (บัญชีร้านค้า)

var session = getSession();

/* --- Popup รายละเอียดใช้ร่วมกัน: Food DNA --- */
var profDetailPop = document.getElementById("profDetailPop");
function openProfDetailPop(titleHtml, bodyContent) {
	if (!profDetailPop) return;
	document.getElementById("pdTitle").innerHTML = titleHtml;
	var pdBody = document.getElementById("pdBody");
	pdBody.innerHTML = "";
	if (typeof bodyContent === "string") {
		pdBody.innerHTML = bodyContent;
	} else {
		pdBody.appendChild(bodyContent);
	}
	profDetailPop.classList.add("open");
	document.body.style.overflow = "hidden";
}
function closeProfDetailPop() {
	if (!profDetailPop) return;
	profDetailPop.classList.remove("open");
	document.body.style.overflow = "";
}
if (profDetailPop) {
	document.getElementById("pdClose").addEventListener("click", closeProfDetailPop);
	profDetailPop.addEventListener("click", function(e) {
		if (e.target === profDetailPop) closeProfDetailPop();
	});
	document.addEventListener("keydown", function(e) {
		if (e.key === "Escape") closeProfDetailPop();
	});
}

document.getElementById("profSignupBtn").addEventListener("click", function() {
	openAuthPop("register");
});

var logoutBtnEl = document.getElementById("logoutBtn");
if (logoutBtnEl) {
	logoutBtnEl.addEventListener("click", function() {
		clearSession();
		if (typeof sbSignOut === "function") sbSignOut();
		showToast(t("profile.logoutToast"));
		setTimeout(function() {
			window.location.reload();
		}, 400);
	});
}

if (!session) {
	document.getElementById("profGuestBox").hidden = false;
} else {
	document.getElementById("profContent").hidden = false;

	var me = getMe() || session;
	function refreshProfileHeader(u) {
		var avatarEl = document.getElementById("profAvatar");
		if (u.avatar) {
			avatarEl.style.background = "var(--cream2) center/cover no-repeat url('" + u.avatar + "')";
			avatarEl.textContent = "";
		} else {
			avatarEl.style.background = "";
			avatarEl.textContent = u.name.charAt(0).toUpperCase();
		}
		document.getElementById("profName").textContent = u.name;
		var bioEl = document.getElementById("profBio");
		if (bioEl) {
			if (u.bio) {
				bioEl.textContent = u.bio;
				bioEl.hidden = false;
			} else {
				bioEl.hidden = true;
			}
		}
	}
	refreshProfileHeader(me);
	document.getElementById("profEmail").textContent = session.email;
	document.getElementById("profRole").textContent = t("profile.memberRole");

	/* --- Food DNA (ทุกบัญชี) — กดปุ่มเพื่อดูรายละเอียดเป็น popup --- */
	var dnaCardBtn = document.getElementById("dnaCardBtn");
	var dnaCardHint = document.getElementById("dnaCardHint");
	function refreshDnaCard(u) {
		dnaCardBtn.onclick = null;
		if (u.foodDNA) {
			dnaCardHint.textContent = t("profile.dnaCardHintHas");
			var dna = u.foodDNA;
			var maxBudget = 300;
			var maxDist = 3000;
			var rows = [];
			if (dna.ชอบหมวด && dna.ชอบหมวด.length) {
				rows.push({ label: t("dna.category"), value: dna.ชอบหมวด.map(catLabel).join(", "), pct: 100 });
			}
			rows.push({ label: t("dna.cuisine"), value: dna.ชอบชาติอาหาร.map(catLabel).join(", "), pct: 100 });
			rows.push({ label: t("dna.flavor"), value: dna.ชอบรส.map(catLabel).join(", "), pct: 100 });
			rows.push({ label: t("dna.budget"), value: "฿" + dna.งบเฉลี่ยที่ใช้บ่อย, pct: Math.min(100, Math.round((dna.งบเฉลี่ยที่ใช้บ่อย / maxBudget) * 100)) });
			rows.push({ label: t("dna.distance"), value: distanceText(dna.ระยะที่ยอมไป), pct: Math.min(100, Math.round((dna.ระยะที่ยอมไป / maxDist) * 100)) });
			var dnaHtml = "";
			rows.forEach(function(r) {
				dnaHtml +=
					'<div class="obdnarow">' +
						'<div class="obdnalbl"><span>' + r.label + '</span><span>' + escapeHtml(r.value) + '</span></div>' +
						'<div class="obdnabar"><span style="width:' + r.pct + '%;"></span></div>' +
					"</div>";
			});
			dnaHtml += '<a href="profile-setup.html" class="rdghost" style="width:100%;margin-top:12px;"><i class="fas fa-rotate me-1"></i><span>' + t("profile.retakeTest") + "</span></a>";
			dnaCardBtn.onclick = function() {
				openProfDetailPop('<i class="fas fa-dna me-2"></i>' + t("profile.foodDna"), dnaHtml);
			};
		} else {
			dnaCardHint.textContent = t("profile.dnaCardHintNone");
			var noDnaHtml =
				'<p style="font-size:.82rem;color:#999;margin-bottom:14px;">' + t("profile.noDnaDesc") + "</p>" +
				'<a href="profile-setup.html" class="btn-red profbtn"><i class="fas fa-flask"></i><span>' + t("profile.takeTest") + "</span></a>";
			dnaCardBtn.onclick = function() {
				openProfDetailPop('<i class="fas fa-dna me-2"></i>' + t("profile.foodDna"), noDnaHtml);
			};
		}
	}
	refreshDnaCard(me);

	document.getElementById("igStatFollowing").textContent = getFollowedUsers().length;

	// ดึงโปรไฟล์ (ชื่อ/bio/รูป/Food DNA)/โพสต์/ไลก์/ติดตามจริงจาก Supabase มาผสาน เผื่อทำไว้จากเครื่องอื่น (progressive enhancement)
	if (typeof syncMyProfileWithSupabase === "function") {
		syncMyProfileWithSupabase(function() {
			refreshProfileHeader(getMe());
			refreshDnaCard(getMe());
		});
	}
	if (typeof syncLikesAndFollowsWithSupabase === "function") {
		syncLikesAndFollowsWithSupabase(function() {
			document.getElementById("igStatFollowing").textContent = getFollowedUsers().length;
		});
	}
	if (typeof syncPostsWithSupabase === "function") {
		syncPostsWithSupabase(function() { renderMyPosts(); });
	}

	/* --- ปุ่มแชร์โปรไฟล์ (สไตล์ IG) — คัดลอกลิงก์โปรไฟล์สาธารณะไปคลิปบอร์ด --- */
	var igShareBtn = document.getElementById("igShareBtn");
	if (igShareBtn) {
		igShareBtn.addEventListener("click", function() {
			var link = window.location.origin + window.location.pathname.replace(/profile\.html$/, "") + "public-profile.html?u=" + encodeURIComponent(session.id);
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(link).then(function() {
					showToast(t("profile.linkCopied"));
				}).catch(function() {});
			}
		});
	}

	/* --- โพสต์ของฉัน (ทุกบัญชี) --- */
	document.getElementById("profPostsCard").hidden = false;
	initMyPosts();
}

/* --- โพสต์ของฉัน: ฟอร์มเพิ่มโพสต์ + แสดงกริดโพสต์ ---
   (เวอร์ชันย่อของฟีเจอร์คอมมูนิตี้ - ภาพ + แคปชั่นเท่านั้น ยังไม่รองรับสตอรี่/รีล/วิดีโอ) */
function initMyPosts() {
	var toggle = document.getElementById("addPostToggle");
	var form = document.getElementById("postForm");
	var listBox = document.getElementById("postImgList");
	var submitBtn = document.getElementById("postSubmitBtn");
	var chosenImages = [];
	var editingPostId = null; // null = กำลังสร้างโพสต์ใหม่, มีค่า = กำลังแก้ไขโพสต์เดิม

	function renderChosenImages() {
		listBox.innerHTML = "";
		chosenImages.forEach(function(src, idx) {
			var thumb = document.createElement("div");
			thumb.className = "postimgthumb";
			thumb.innerHTML = '<img src="' + src + '" alt=""/><button type="button" title="' + t("common.removePhoto") + '"><i class="fas fa-times"></i></button>';
			thumb.querySelector("button").addEventListener("click", function() {
				chosenImages.splice(idx, 1);
				renderChosenImages();
			});
			listBox.appendChild(thumb);
		});
	}

	function resetFormToCreateMode() {
		editingPostId = null;
		form.reset();
		chosenImages = [];
		renderChosenImages();
		submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>' + t("profile.postBtn") + "</span>";
	}

	// อัปโหลดรูปจริงจากเครื่องผู้ใช้เอง (แทนดรอปดาวน์เลือกรูปสต็อกเดิม) เลือกได้หลายรูปพร้อมกัน สูงสุด 10 รูปต่อโพสต์
	wireMultiImageUpload("postImgFile", function(dataUrls) {
		dataUrls.forEach(function(dataUrl) {
			if (chosenImages.length >= 10) return;
			chosenImages.push(dataUrl);
		});
		renderChosenImages();
	});

	toggle.addEventListener("click", function() {
		if (form.style.display === "none") {
			resetFormToCreateMode();
			form.style.display = "block";
		} else {
			form.style.display = "none";
		}
	});

	// เปิดฟอร์มเดิมมาแก้ไข พรีฟิลรูป+แคปชั่นของโพสต์นั้น สลับปุ่มเป็นโหมดแก้ไข
	window.startEditingPost = function(post) {
		editingPostId = post.id;
		chosenImages = getPostImages(post).slice();
		renderChosenImages();
		document.getElementById("postCaption").value = post.caption || "";
		submitBtn.innerHTML = '<i class="fas fa-floppy-disk"></i><span>' + t("profile.saveChangesPost") + "</span>";
		form.style.display = "block";
		form.scrollIntoView({ behavior: "smooth", block: "nearest" });
	};

	form.addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("postErr");
		errBox.classList.remove("show");
		var caption = document.getElementById("postCaption").value.trim();
		if (chosenImages.length === 0 || !caption) {
			errBox.textContent = t("profile.selectPhotoAndCaption");
			errBox.classList.add("show");
			return;
		}

		if (editingPostId) {
			updatePost(editingPostId, { images: chosenImages, caption: caption });
			resetFormToCreateMode();
			form.style.display = "none";
			showToast(t("profile.postUpdatedToast"));
			renderMyPosts();
			return;
		}

		var activePage = getActivePostingPage();
		addPost(session.id, chosenImages, caption, activePage ? activePage.numId : null);
		resetFormToCreateMode();
		form.style.display = "none";
		showToast(activePage ? t("profile.postedAsToast").replace("{name}", activePage.name) : t("profile.postedToast"));
		renderMyPosts();
	});

	renderMyPosts();
}

// เพจที่กำลังใช้โพสต์อยู่ตอนนี้ (ถ้าเลือก "โพสต์ในนามเพจ" ไว้ใน Settings) — คืนค่า null ถ้าโพสต์ในนามตัวเอง
function getActivePostingPage() {
	var persona = getActivePersona();
	if (persona === "self") return null;
	// "เพจ"/"ร้าน" รวมเป็นเอนทิตีเดียวกันแล้ว (ดู migratePageIntoShop ใน core.js) — ผู้ใช้มีได้แค่ร้านเดียว
	// เลยไม่ต้องเช็คว่า persona ตรงกับ id ไหน แค่คืนร้านของตัวเองไปเลยถ้าไม่ได้ตั้งเป็น "self"
	return getMyShop();
}

function renderMyPosts() {
	var grid = document.getElementById("myPostGrid");
	var emptyMsg = document.getElementById("myPostEmpty");
	var activePage = getActivePostingPage();

	/* --- แถบ "กำลังโพสต์ในนาม" เหนือปุ่มเพิ่มโพสต์ --- */
	var row = document.getElementById("postingAsRow");
	if (row) {
		if (activePage) {
			row.hidden = false;
			document.getElementById("postingAsAvatar").src = activePage.img;
			document.getElementById("postingAsLabel").textContent = t("settings.postingAsPrefix") + ": " + activePage.name;
		} else {
			row.hidden = true;
		}
	}

	grid.innerHTML = "";
	var posts = activePage ? getPostsByPage(activePage.numId) : getPostsByUser(session.id);
	var igStatPosts = document.getElementById("igStatPosts");
	if (igStatPosts) igStatPosts.textContent = posts.length;
	if (posts.length === 0) {
		emptyMsg.hidden = false;
		return;
	}
	emptyMsg.hidden = true;
	var posterName = activePage ? activePage.name : session.name;
	var posterColor = activePage ? "var(--cream2)" : "linear-gradient(135deg, var(--primary), var(--secondary))";
	posts.forEach(function(p) {
		var images = getPostImages(p);
		var el = document.createElement("div");
		el.className = "ppost card-enter";
		el.innerHTML =
			'<img src="' + images[0] + '" alt=""/>' +
			(images.length > 1 ? '<i class="fas fa-clone ppostmulti" title="' + t("common.photoCount").replace("{n}", images.length) + '"></i>' : "") +
			'<div class="ppostcap">' + escapeHtml(p.caption) + '</div>' +
			'<button class="ppostedit" data-id="' + p.id + '" title="' + t("common.editPost") + '"><i class="fas fa-pen"></i></button>' +
			'<button class="ppostdel" data-id="' + p.id + '" title="' + t("common.deletePost") + '"><i class="fas fa-times"></i></button>';
		el.addEventListener("click", function() {
			openPostView({ id: p.id, images: images, caption: p.caption, posterName: posterName, posterColor: posterColor });
		});
		el.querySelector(".ppostedit").addEventListener("click", function(e) {
			e.stopPropagation();
			startEditingPost(p);
		});
		el.querySelector(".ppostdel").addEventListener("click", function(e) {
			e.stopPropagation();
			deletePost(this.getAttribute("data-id"));
			renderMyPosts();
		});
		grid.appendChild(el);
	});
}
