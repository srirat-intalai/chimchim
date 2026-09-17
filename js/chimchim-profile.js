// chimchim-profile.js
// หน้าโปรไฟล์ (profile.html) — โชว์ข้อมูลบัญชี, Food DNA, ร้านที่ Follow, ร้านของฉัน (บัญชีร้านค้า)

var session = getSession();

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

	/* --- Level / XP: คำนวณจากกิจกรรมจริงของบัญชีนี้ --- */
	(function renderXP() {
		var xp = calcUserXP(me);
		var lv = calcUserLevel(xp);
		var xpIntoLevel = xp - (lv - 1) * 50;
		document.getElementById("profLvVal").textContent = lv;
		document.getElementById("profXpVal").textContent = xpIntoLevel + " / 50 XP";
		document.getElementById("profXpBarFill").style.width = Math.round((xpIntoLevel / 50) * 100) + "%";
		document.getElementById("profXpHint").textContent = t("profile.xpHint");
	})();

	/* --- Food DNA (ทุกบัญชี) --- */
	if (me.foodDNA) {
		document.getElementById("profDnaCard").hidden = false;
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
		var html = "";
		rows.forEach(function(r) {
			html +=
				'<div class="obdnarow">' +
					'<div class="obdnalbl"><span>' + r.label + '</span><span>' + escapeHtml(r.value) + '</span></div>' +
					'<div class="obdnabar"><span style="width:' + r.pct + '%;"></span></div>' +
				"</div>";
		});
		document.getElementById("profDnaBody").innerHTML = html;
	} else {
		document.getElementById("profNoDnaCard").hidden = false;
	}

	/* --- ร้านและคนที่ Follow (รวมเป็นระบบเดียว ทั้งร้านและคน ผ่าน getFollowedUsers) --- */
	var followPeopleCount = getFollowedUsers().length;
	document.getElementById("profFollowPeopleCount").textContent =
		followPeopleCount > 0 ? ("ติดตามอยู่ทั้งหมด " + followPeopleCount + " ร้าน/คน") : "ยังไม่ได้ติดตามใครเลย";

	/* --- ประวัติการกดถูกใจ --- */
	renderLikeHistory();

	/* --- ประวัติการรีวิว --- */
	renderReviewHistory();

	/* --- ร้านของฉัน (ทุกบัญชีโพสต์ร้านได้เหมือนกันหมด) --- */
	document.getElementById("profShopsCard").hidden = false;
	renderMyShops();

	/* --- เพจร้านของฉัน (สไตล์ Facebook Page) --- */
	renderMyPage();

	/* --- โพสต์ของฉัน (ทุกบัญชี) --- */
	document.getElementById("profPostsCard").hidden = false;
	initMyPosts();
}

function renderMyShops() {
	var listBox = document.getElementById("profShopsList");
	if (!listBox) return;
	var myShops = getShops().filter(function(s) {
		return s.vendorId === session.id;
	});
	if (myShops.length === 0) {
		listBox.innerHTML = '<p style="font-size:.82rem;color:#999;">ยังไม่มีร้านที่โพสต์ กด "โพสต์ร้านใหม่" ด้านล่างได้เลย</p>';
		return;
	}
	listBox.innerHTML = "";
	myShops.forEach(function(shop) {
		var row = document.createElement("div");
		row.className = "profshoprow";
		row.innerHTML =
			'<img src="' + shop.img + '" alt="' + escapeHtml(shop.dish) + '"/>' +
			'<div style="flex:1;min-width:0;">' +
				'<div class="profshopnm">' + escapeHtml(shop.name) + "</div>" +
				'<div class="profshopmeta">' + escapeHtml(shop.dish) + " · ฿" + shop.priceLow + "–" + shop.priceHigh + "</div>" +
			"</div>" +
			'<button type="button" class="profshopeditbtn" title="' + t("profile.editShop") + '"><i class="fas fa-pen"></i></button>';
		row.querySelector(".profshopeditbtn").addEventListener("click", function() {
			if (typeof openShopPopForEdit === "function") openShopPopForEdit(shop);
		});
		listBox.appendChild(row);
	});
}

/* --- เพจร้านของฉัน (สไตล์ Facebook Page) — ถ้ายังไม่มีให้ชวนสร้างที่ Settings, ถ้ามีแล้วโชว์การ์ดพร้อมลิงก์ดู/จัดการ --- */
function renderMyPage() {
	var body = document.getElementById("profPageBody");
	if (!body) return;
	var myPage = getMyPage();
	if (!myPage) {
		body.innerHTML =
			'<p style="font-size:.82rem;color:#999;margin-bottom:12px;">' + t("profile.noPageDesc") + "</p>" +
			'<a href="settings.html" class="btn-red profbtn"><i class="fas fa-plus"></i><span>' + t("profile.createPage") + "</span></a>";
		return;
	}
	body.innerHTML =
		'<div class="pagepreview">' +
			'<img class="pagepreviewavatar" src="' + myPage.avatar + '" alt=""/>' +
			"<div>" +
				'<div class="pagepreviewname">' + escapeHtml(myPage.name) + "</div>" +
				'<div class="pagepreviewcat">' + catEmoji(myPage.cat) + " " + catLabel(myPage.cat) + "</div>" +
			"</div>" +
		"</div>" +
		'<div class="d-flex" style="gap:8px;margin-top:12px;">' +
			'<a href="public-profile.html?u=page-' + myPage.id + '" class="rdghost" style="flex:1;"><i class="fas fa-eye me-1"></i><span>' + t("profile.viewPage") + "</span></a>" +
			'<a href="settings.html" class="rdghost" style="flex:1;"><i class="fas fa-pen me-1"></i><span>' + t("profile.managePage") + "</span></a>" +
		"</div>";
}

/* --- ประวัติการกดถูกใจ: ร้าน/เมนูที่เคยกดหัวใจไว้ทั้งหมด --- */
function renderLikeHistory() {
	var listBox = document.getElementById("profLikesList");
	var emptyMsg = document.getElementById("profLikesEmpty");
	if (!listBox) return;
	var likedIds = getLikedShops();
	var likedShops = likedIds.map(function(id) { return หาร้านจากId(id); }).filter(function(r) { return r; });
	listBox.innerHTML = "";
	if (likedShops.length === 0) {
		emptyMsg.hidden = false;
		return;
	}
	emptyMsg.hidden = true;
	likedShops.forEach(function(ร้าน) {
		var row = document.createElement("div");
		row.className = "profshoprow";
		row.style.cursor = "pointer";
		row.innerHTML =
			'<img src="' + ร้าน.รูป + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
			'<div style="flex:1;min-width:0;">' +
				'<div class="profshopnm">' + escapeHtml(ร้าน.เมนู) + "</div>" +
				'<div class="profshopmeta">' + escapeHtml(ร้าน.ร้าน) + " · " + catEmoji(ร้าน.หมวด) + " " + escapeHtml(catLabel(ร้าน.หมวด)) + "</div>" +
			"</div>";
		row.addEventListener("click", function() {
			window.location.href = "restaurant.html?id=" + ร้าน.id;
		});
		listBox.appendChild(row);
	});
}

/* --- ประวัติการรีวิว: รีวิวทั้งหมดที่เคยเขียนไว้ เรียงใหม่สุดก่อน --- */
function renderReviewHistory() {
	var listBox = document.getElementById("profReviewsList");
	var emptyMsg = document.getElementById("profReviewsEmpty");
	if (!listBox) return;
	var reviews = getReviewsByUser(session.id);
	listBox.innerHTML = "";
	if (reviews.length === 0) {
		emptyMsg.hidden = false;
		return;
	}
	emptyMsg.hidden = true;
	reviews.forEach(function(r) {
		var ร้าน = หาร้านจากId(r.shopId);
		if (!ร้าน) return;
		var avgScore = Math.round((r.taste + r.atmosphere + r.service) / 3 * 10) / 10;
		var item = document.createElement("div");
		item.className = "profreviewitem";
		item.innerHTML =
			'<div class="profreviewrow">' +
				'<img src="' + ร้าน.รูป + '" alt="' + escapeHtml(ร้าน.เมนู) + '"/>' +
				'<div style="flex:1;min-width:0;">' +
					'<div class="profshopnm">' + escapeHtml(ร้าน.ร้าน) + "</div>" +
					'<div class="profshopmeta">🎯 ' + avgScore + "/5 คะแนนเฉลี่ย</div>" +
				"</div>" +
			"</div>" +
			(r.text ? '<p class="profreviewtxt">' + escapeHtml(r.text) + "</p>" : "");
		item.querySelector(".profreviewrow").addEventListener("click", function() {
			window.location.href = "restaurant.html?id=" + ร้าน.id;
		});
		listBox.appendChild(item);
	});
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
