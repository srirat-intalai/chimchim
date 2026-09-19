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
		showToast("ออกจากระบบแล้ว แล้วเจอกันใหม่นะ 👋");
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
	document.getElementById("profAvatar").textContent = session.name.charAt(0).toUpperCase();
	document.getElementById("profName").textContent = session.name;
	document.getElementById("profEmail").textContent = session.email;
	document.getElementById("profRole").textContent = "🧑‍🎓 สมาชิกชิมชิม";

	/* --- Food DNA (ทุกบัญชี) — กดปุ่มเพื่อดูรายละเอียดเป็น popup --- */
	var dnaCardBtn = document.getElementById("dnaCardBtn");
	var dnaCardHint = document.getElementById("dnaCardHint");
	if (me.foodDNA) {
		dnaCardHint.textContent = t("profile.dnaCardHintHas");
		var dna = me.foodDNA;
		var maxBudget = 300;
		var maxDist = 3000;
		var rows = [];
		if (dna.ชอบหมวด && dna.ชอบหมวด.length) {
			rows.push({ label: "หมวดที่ชอบ", value: dna.ชอบหมวด.join(", "), pct: 100 });
		}
		rows.push({ label: "ชอบชาติอาหาร", value: dna.ชอบชาติอาหาร.join(", "), pct: 100 });
		rows.push({ label: "ชอบรส", value: dna.ชอบรส.join(", "), pct: 100 });
		rows.push({ label: "งบเฉลี่ยที่ใช้บ่อย", value: "฿" + dna.งบเฉลี่ยที่ใช้บ่อย, pct: Math.min(100, Math.round((dna.งบเฉลี่ยที่ใช้บ่อย / maxBudget) * 100)) });
		rows.push({ label: "ระยะที่ยอมไป", value: dna.ระยะที่ยอมไป + " ม.", pct: Math.min(100, Math.round((dna.ระยะที่ยอมไป / maxDist) * 100)) });
		var dnaHtml = "";
		rows.forEach(function(r) {
			dnaHtml +=
				'<div class="obdnarow">' +
					'<div class="obdnalbl"><span>' + r.label + '</span><span>' + escapeHtml(r.value) + '</span></div>' +
					'<div class="obdnabar"><span style="width:' + r.pct + '%;"></span></div>' +
				"</div>";
		});
		dnaHtml += '<a href="profile-setup.html" class="rdghost" style="width:100%;margin-top:12px;"><i class="fas fa-rotate me-1"></i><span>' + t("profile.retakeTest") + "</span></a>";
		dnaCardBtn.addEventListener("click", function() {
			openProfDetailPop('<i class="fas fa-dna me-2"></i>' + t("profile.foodDna"), dnaHtml);
		});
	} else {
		dnaCardHint.textContent = t("profile.dnaCardHintNone");
		var noDnaHtml =
			'<p style="font-size:.82rem;color:#999;margin-bottom:14px;">' + t("profile.noDnaDesc") + "</p>" +
			'<a href="profile-setup.html" class="btn-red profbtn"><i class="fas fa-flask"></i><span>' + t("profile.takeTest") + "</span></a>";
		dnaCardBtn.addEventListener("click", function() {
			openProfDetailPop('<i class="fas fa-dna me-2"></i>' + t("profile.foodDna"), noDnaHtml);
		});
	}

	document.getElementById("igStatFollowing").textContent = getFollowedUsers().length;

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
	var imgSelect = document.getElementById("postImg");
	var listBox = document.getElementById("postImgList");
	var chosenImages = [];

	// เติมตัวเลือกรูปจากคลังรูปเดียวกับวงล้อสุ่มเมนู
	วงล้อหมวดอาหาร.forEach(function(cat) {
		var og = document.createElement("optgroup");
		og.label = cat.emoji + " " + cat.label;
		cat.pool.forEach(function(item) {
			var opt = document.createElement("option");
			opt.value = item.img;
			opt.textContent = item.name;
			og.appendChild(opt);
		});
		imgSelect.appendChild(og);
	});

	function renderChosenImages() {
		listBox.innerHTML = "";
		chosenImages.forEach(function(src, idx) {
			var thumb = document.createElement("div");
			thumb.className = "postimgthumb";
			thumb.innerHTML = '<img src="' + src + '" alt=""/><button type="button" title="ลบรูป"><i class="fas fa-times"></i></button>';
			thumb.querySelector("button").addEventListener("click", function() {
				chosenImages.splice(idx, 1);
				renderChosenImages();
			});
			listBox.appendChild(thumb);
		});
	}

	document.getElementById("postImgAddBtn").addEventListener("click", function() {
		if (chosenImages.length >= 10) return;
		chosenImages.push(imgSelect.value);
		renderChosenImages();
	});

	toggle.addEventListener("click", function() {
		form.style.display = form.style.display === "none" ? "block" : "none";
	});

	form.addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("postErr");
		errBox.classList.remove("show");
		var caption = document.getElementById("postCaption").value.trim();
		if (chosenImages.length === 0) chosenImages.push(imgSelect.value);
		if (chosenImages.length === 0 || !caption) {
			errBox.textContent = "เลือกรูปอย่างน้อย 1 รูปและใส่แคปชั่นก่อนนะ";
			errBox.classList.add("show");
			return;
		}
		var activePage = getActivePostingPage();
		addPost(session.id, chosenImages, caption, activePage ? activePage.id : null);
		this.reset();
		chosenImages = [];
		renderChosenImages();
		form.style.display = "none";
		showToast(activePage ? ("โพสต์ในนาม “" + activePage.name + "” เรียบร้อยแล้ว! 🎉") : "โพสต์เรียบร้อยแล้ว! 🎉");
		renderMyPosts();
	});

	renderMyPosts();
}

// เพจที่กำลังใช้โพสต์อยู่ตอนนี้ (ถ้าเลือก "โพสต์ในนามเพจ" ไว้ใน Settings) — คืนค่า null ถ้าโพสต์ในนามตัวเอง
function getActivePostingPage() {
	var persona = getActivePersona();
	if (persona === "self") return null;
	var page = getPageById(persona);
	return (page && page.ownerId === session.id) ? page : null;
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
			document.getElementById("postingAsAvatar").src = activePage.avatar;
			document.getElementById("postingAsLabel").textContent = t("settings.postingAsPrefix") + ": " + activePage.name;
		} else {
			row.hidden = true;
		}
	}

	grid.innerHTML = "";
	var posts = activePage ? getPostsByPage(activePage.id) : getPostsByUser(session.id);
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
		el.className = "ppost";
		el.innerHTML =
			'<img src="' + images[0] + '" alt=""/>' +
			(images.length > 1 ? '<i class="fas fa-clone ppostmulti" title="' + images.length + ' รูป"></i>' : "") +
			'<div class="ppostcap">' + escapeHtml(p.caption) + '</div>' +
			'<button class="ppostdel" data-id="' + p.id + '" title="ลบโพสต์"><i class="fas fa-times"></i></button>';
		el.addEventListener("click", function() {
			openPostView({ id: p.id, images: images, caption: p.caption, posterName: posterName, posterColor: posterColor });
		});
		el.querySelector(".ppostdel").addEventListener("click", function(e) {
			e.stopPropagation();
			deletePost(this.getAttribute("data-id"));
			renderMyPosts();
		});
		grid.appendChild(el);
	});
}
