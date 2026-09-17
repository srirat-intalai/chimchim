// chimchim-community.js
// UI: ป็อปอัพเข้าสู่ระบบ/สมัครสมาชิก, ปุ่มบัญชีบน apptop, โพสต์ร้านเข้าชุมชน, toast แจ้งเตือน
// ต้องโหลดหลัง js/chimchim-core.js (ใช้ getSession/getUsers/getShops ฯลฯ จากที่นั่น)
// โหลดในทุกหน้า เพราะแถบบนสุด (apptop) กับป็อปอัพเข้าสู่ระบบใช้ร่วมกันทุกหน้า

/* =====================================================================
   TOAST แจ้งเตือนแบบลอยด้านล่าง (แทนมาสคอตลอยมุมจอเดิม)
   ===================================================================== */
function showToast(msg) {
	var toast = document.getElementById("appToast");
	if (!toast) return;
	toast.textContent = msg;
	toast.classList.add("show");
	clearTimeout(toast.__hideTimer);
	toast.__hideTimer = setTimeout(function() {
		toast.classList.remove("show");
	}, 2800);
}

/* =====================================================================
   แถบบนสุด (apptop) — ปุ่มเข้าสู่ระบบ / ไอคอนโปรไฟล์
   ===================================================================== */
function refreshAuthUI() {
	var session = getSession();
	var loginBtn = document.getElementById("loginBtn");
	var avatarLink = document.getElementById("userAvatarLink");
	var avatarIco = document.getElementById("userAvatarIco");
	if (session) {
		if (loginBtn) loginBtn.hidden = true;
		if (avatarLink) {
			avatarLink.hidden = false;
			if (avatarIco) avatarIco.textContent = session.name.charAt(0).toUpperCase();
		}
	} else {
		if (loginBtn) loginBtn.hidden = false;
		if (avatarLink) avatarLink.hidden = true;
	}
}

/* --- เปิด/ปิด popup เข้าสู่ระบบ (เฉพาะหน้าที่มี #authPop อยู่จริง) --- */
var authPop = document.getElementById("authPop");
function openAuthPop(tab) {
	if (!authPop) return;
	switchAuthTab(tab || "login");
	document.getElementById("loginErr").classList.remove("show");
	document.getElementById("registerErr").classList.remove("show");
	authPop.classList.add("open");
	document.body.style.overflow = "hidden";
}
function closeAuthPop() {
	if (!authPop) return;
	authPop.classList.remove("open");
	document.body.style.overflow = "";
}
function switchAuthTab(tab) {
	var isLogin = tab === "login";
	document.getElementById("apTabLogin").classList.toggle("active", isLogin);
	document.getElementById("apTabRegister").classList.toggle("active", !isLogin);
	document.getElementById("loginForm").style.display = isLogin ? "block" : "none";
	document.getElementById("registerForm").style.display = isLogin ? "none" : "block";
}
var loginBtnEl = document.getElementById("loginBtn");
if (loginBtnEl) {
	loginBtnEl.addEventListener("click", function() {
		openAuthPop("login");
	});
}

if (authPop) {
	document.getElementById("apClose").addEventListener("click", closeAuthPop);
	authPop.addEventListener("click", function(e) {
		if (e.target === authPop) closeAuthPop();
	});
	document.getElementById("apTabLogin").addEventListener("click", function() {
		switchAuthTab("login");
	});
	document.getElementById("apTabRegister").addEventListener("click", function() {
		switchAuthTab("register");
	});
	document.querySelectorAll("[data-switch]").forEach(function(a) {
		a.addEventListener("click", function(e) {
			e.preventDefault();
			switchAuthTab(this.getAttribute("data-switch"));
		});
	});

	/* --- สมัครสมาชิก --- */
	document.getElementById("registerForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("registerErr");
		errBox.classList.remove("show");

		var name = document.getElementById("registerName").value.trim();
		var email = document.getElementById("registerEmail").value.trim().toLowerCase();
		var password = document.getElementById("registerPassword").value;

		if (!name || !email || password.length < 4) {
			errBox.textContent = "กรอกข้อมูลให้ครบ และรหัสผ่านอย่างน้อย 4 ตัวอักษร";
			errBox.classList.add("show");
			return;
		}

		var users = getUsers();
		var exists = users.some(function(u) {
			return u.email === email;
		});
		if (exists) {
			errBox.textContent = "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทนนะ";
			errBox.classList.add("show");
			return;
		}

		var newUser = { id: "u" + Date.now(), name: name, email: email, password: password };
		users.push(newUser);
		saveUsers(users);
		setSession(newUser);
		closeAuthPop();
		refreshAuthUI();
		this.reset();

		// ทุกบัญชีเป็นแบบเดียวกันหมด -> พาไปทำแบบสอบถาม Food DNA ต่อเสมอ
		window.location.href = "profile-setup.html";
	});

	/* --- เข้าสู่ระบบ --- */
	document.getElementById("loginForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("loginErr");
		errBox.classList.remove("show");

		var email = document.getElementById("loginEmail").value.trim().toLowerCase();
		var password = document.getElementById("loginPassword").value;

		var users = getUsers();
		var found = users.filter(function(u) {
			return u.email === email && u.password === password;
		})[0];

		if (!found) {
			errBox.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
			errBox.classList.add("show");
			return;
		}

		setSession(found);
		closeAuthPop();
		refreshAuthUI();
		this.reset();
		showToast("ยินดีต้อนรับกลับมา " + found.name + "! 🦖");
		// รีเฟรชหน้าปัจจุบันเพื่อให้ Food DNA ส่วนตัว + สถานะล็อกอินอัปเดตทุกจุด
		setTimeout(function() {
			window.location.reload();
		}, 600);
	});
}

document.addEventListener("keydown", function(e) {
	if (e.key === "Escape") {
		closeAuthPop();
		if (typeof closeShopPop === "function") closeShopPop();
	}
});

/* =====================================================================
   โพสต์ร้านเข้าชุมชน (เฉพาะหน้า profile.html ที่มีฟอร์มนี้อยู่จริง)
   ===================================================================== */
var shopPop = document.getElementById("shopPop");
if (shopPop) {
	var openShopPop = function() {
		shopPop.classList.add("open");
		document.body.style.overflow = "hidden";
	};
	var closeShopPop = function() {
		shopPop.classList.remove("open");
		document.body.style.overflow = "";
	};
	document.getElementById("spClose").addEventListener("click", closeShopPop);
	shopPop.addEventListener("click", function(e) {
		if (e.target === shopPop) closeShopPop();
	});

	/* --- อัปโหลดรูปเมนูเด่นเอง (แทนดรอปดาวน์เลือกรูปสต็อกเดิม) --- */
	wireImageUpload("shopImgFile", "shopImg", "shopImgPreviewImg", "shopImgUploadBox");

	document.getElementById("postShopBtn").addEventListener("click", function() {
		resetShopFormToCreateMode();
		openShopPop();
	});

	/* --- รีเซ็ตฟอร์มกลับเป็นโหมด "โพสต์ร้านใหม่" (ล้าง id ที่กำลังแก้ไขทิ้ง) --- */
	function resetShopFormToCreateMode() {
		document.getElementById("shopForm").reset();
		document.getElementById("shopEditId").value = "";
		document.getElementById("shopImgPreviewImg").hidden = true;
		document.getElementById("shopImgUploadBox").classList.remove("haspreview");
		document.getElementById("shopPopTitle").innerHTML = '<i class="fas fa-store me-2"></i><span data-i18n="shop.postMyShop">' + t("shop.postMyShop") + "</span>";
		document.getElementById("shopSubmitBtn").innerHTML = '<i class="fas fa-paper-plane"></i><span data-i18n="shop.submit">' + t("shop.submit") + "</span>";
	}

	/* --- เปิดฟอร์มพร้อมข้อมูลเดิม เพื่อแก้ไขร้านที่โพสต์ไปแล้ว (เรียกจากหน้าโปรไฟล์) --- */
	window.openShopPopForEdit = function(shop) {
		document.getElementById("shopEditId").value = shop.id;
		document.getElementById("shopName").value = shop.name;
		document.getElementById("shopCat").value = shop.cat;
		document.getElementById("shopImg").value = shop.img;
		document.getElementById("shopImgPreviewImg").src = shop.img;
		document.getElementById("shopImgPreviewImg").hidden = false;
		document.getElementById("shopImgUploadBox").classList.add("haspreview");
		document.getElementById("shopDish").value = shop.dish;
		document.getElementById("shopPriceLow").value = shop.priceLow;
		document.getElementById("shopPriceHigh").value = shop.priceHigh;
		document.getElementById("shopDistance").value = shop.distance;
		document.getElementById("shopUni").value = shop.uni;
		document.getElementById("shopDesc").value = shop.desc;
		document.getElementById("shopHours").value = shop.hours || "";
		document.getElementById("shopPromo").value = shop.promo || "";
		document.getElementById("shopPopTitle").innerHTML = '<i class="fas fa-store me-2"></i><span>' + t("shop.editMyShop") + "</span>";
		document.getElementById("shopSubmitBtn").innerHTML = '<i class="fas fa-check"></i><span>' + t("shop.saveChanges") + "</span>";
		openShopPop();
	};

	document.getElementById("shopForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var session = getSession();
		if (!session) return;

		var errBox = document.getElementById("shopErr");
		errBox.classList.remove("show");

		var editId = document.getElementById("shopEditId").value;
		var name = document.getElementById("shopName").value.trim();
		var cat = document.getElementById("shopCat").value;
		var img = document.getElementById("shopImg").value;
		var dish = document.getElementById("shopDish").value.trim();
		var priceLow = parseInt(document.getElementById("shopPriceLow").value, 10);
		var priceHigh = parseInt(document.getElementById("shopPriceHigh").value, 10);
		var distance = parseInt(document.getElementById("shopDistance").value, 10);
		var uni = document.getElementById("shopUni").value;
		var desc = document.getElementById("shopDesc").value.trim();
		var hours = document.getElementById("shopHours").value.trim();
		var promo = document.getElementById("shopPromo").value.trim();

		if (!name || !dish || !desc || isNaN(priceLow) || isNaN(priceHigh) || isNaN(distance)) {
			errBox.textContent = "กรอกข้อมูลให้ครบทุกช่องนะ";
			errBox.classList.add("show");
			return;
		}
		if (priceHigh < priceLow) {
			errBox.textContent = "ราคาสูงต้องมากกว่าหรือเท่ากับราคาต่ำ";
			errBox.classList.add("show");
			return;
		}

		var shops = getShops();

		if (editId) {
			/* --- โหมดแก้ไข: อัปเดตร้านเดิมในอาร์เรย์ตาม id --- */
			var i;
			for (i = 0; i < shops.length; i++) {
				if (shops[i].id === editId) {
					shops[i].name = name;
					shops[i].cat = cat;
					shops[i].img = img;
					shops[i].dish = dish;
					shops[i].priceLow = priceLow;
					shops[i].priceHigh = priceHigh;
					shops[i].distance = distance;
					shops[i].uni = uni;
					shops[i].desc = desc;
					shops[i].hours = hours;
					shops[i].promo = promo;
					break;
				}
			}
			saveShops(shops);
			closeShopPop();
			showToast("บันทึกการแก้ไขร้าน “" + name + "” แล้ว! ✅");
		} else {
			/* --- โหมดโพสต์ใหม่ --- */
			var shop = {
				id: "shop" + Date.now(),
				numId: 9000000 + (Date.now() % 1000000),
				vendorId: session.id,
				vendorName: session.name,
				name: name,
				cat: cat,
				img: img,
				dish: dish,
				priceLow: priceLow,
				priceHigh: priceHigh,
				distance: distance,
				uni: uni,
				desc: desc,
				hours: hours,
				promo: promo
			};
			shops.unshift(shop);
			saveShops(shops);
			closeShopPop();
			showToast("โพสต์ร้าน “" + name + "” เข้าชุมชนเรียบร้อยแล้ว! 🎉");
		}

		resetShopFormToCreateMode();
		if (typeof renderMyShops === "function") renderMyShops();
	});
}

/* =====================================================================
   Post Viewer Modal — กดดูโพสต์แบบเต็มจอเหมือนอินสตาแกรม
   ใช้ร่วมกันได้ทุกหน้า (โปรไฟล์ตัวเอง + โปรไฟล์คนอื่น) โดยสร้าง DOM ของโมดัลขึ้นเองที่นี่
   เรียกใช้ผ่าน window.openPostView({ img, caption, posterName, posterColor })
   ===================================================================== */
(function setupPostViewerModal() {
	var modal = document.createElement("div");
	modal.id = "postViewModal";
	modal.innerHTML =
		'<div class="pvbox">' +
			'<button class="pvclose" id="pvClose"><i class="fas fa-times"></i></button>' +
			'<div class="pvimgs">' +
				'<div class="pvimgstrip" id="pvImgStrip"></div>' +
				'<div class="pvdots" id="pvDots" hidden></div>' +
			"</div>" +
			'<div class="pvinfo">' +
				'<div class="pvhead">' +
					'<div class="pvavatar" id="pvAvatar"></div>' +
					'<div class="pvname" id="pvName"></div>' +
				"</div>" +
				'<div class="pvcap" id="pvCap"></div>' +
				'<div class="pvactions">' +
					'<button class="pvlikebtn" id="pvLikeBtn" type="button"><i class="far fa-heart"></i><span id="pvLikeCount"></span></button>' +
				"</div>" +
				'<div class="pvcomments" id="pvComments"></div>' +
				'<form class="pvcommentform" id="pvCommentForm">' +
					'<input type="text" id="pvCommentInput" placeholder="แสดงความคิดเห็น..." autocomplete="off"/>' +
					'<button type="submit"><i class="fas fa-paper-plane"></i></button>' +
				"</form>" +
			"</div>" +
		"</div>";
	document.body.appendChild(modal);

	var currentPostId = null;

	function refreshPvLike() {
		if (!currentPostId) return;
		var liked = isPostLiked(currentPostId);
		var btn = document.getElementById("pvLikeBtn");
		var ico = btn.querySelector("i");
		ico.classList.toggle("far", !liked);
		ico.classList.toggle("fas", liked);
		btn.classList.toggle("liked", liked);
		document.getElementById("pvLikeCount").textContent = formatLikeCount(getPostLikeCount(currentPostId));
	}
	document.getElementById("pvLikeBtn").addEventListener("click", function() {
		if (!currentPostId) return;
		togglePostLike(currentPostId);
		refreshPvLike();
	});

	function renderPvComments() {
		var list = document.getElementById("pvComments");
		if (!currentPostId) {
			list.innerHTML = "";
			return;
		}
		var comments = getComments(currentPostId);
		if (comments.length === 0) {
			list.innerHTML = '<p class="pvcommentsempty">ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์สิ!</p>';
			return;
		}
		list.innerHTML = comments.map(function(c) {
			return '<div class="pvcommentrow"><b>' + escapeHtml(c.author) + "</b> " + escapeHtml(c.text) + "</div>";
		}).join("");
		list.scrollTop = list.scrollHeight;
	}

	function closePostView() {
		modal.classList.remove("open");
		document.body.style.overflow = "";
	}
	modal.addEventListener("click", function(e) {
		if (e.target === modal) closePostView();
	});
	document.getElementById("pvClose").addEventListener("click", closePostView);
	document.addEventListener("keydown", function(e) {
		if (e.key === "Escape") closePostView();
	});
	document.getElementById("pvCommentForm").addEventListener("submit", function(e) {
		e.preventDefault();
		if (!currentPostId) return;
		var input = document.getElementById("pvCommentInput");
		var text = input.value.trim();
		if (!text) return;
		var me = getSession();
		addComment(currentPostId, me ? me.name : "นักชิมไม่ระบุตัวตน", text);
		input.value = "";
		renderPvComments();
	});

	window.openPostView = function(post) {
		var images = post.images && post.images.length ? post.images : [post.img];
		var strip = document.getElementById("pvImgStrip");
		var dots = document.getElementById("pvDots");
		strip.innerHTML = images.map(function(src) {
			return '<img src="' + src + '" alt=""/>';
		}).join("");
		if (images.length > 1) {
			dots.hidden = false;
			dots.innerHTML = images.map(function(_, i) {
				return '<span class="' + (i === 0 ? "active" : "") + '"></span>';
			}).join("");
			var dotEls = dots.querySelectorAll("span");
			strip.onscroll = function() {
				var idx = Math.round(strip.scrollLeft / strip.clientWidth);
				dotEls.forEach(function(d, i) { d.classList.toggle("active", i === idx); });
			};
		} else {
			dots.hidden = true;
			strip.onscroll = null;
		}
		strip.scrollLeft = 0;
		document.getElementById("pvCap").textContent = post.caption || "";
		var avatarEl = document.getElementById("pvAvatar");
		if (post.posterAvatarUrl) {
			avatarEl.style.background = "var(--cream2) center/cover no-repeat url('" + post.posterAvatarUrl + "')";
			avatarEl.textContent = "";
		} else {
			avatarEl.style.background = post.posterColor || "linear-gradient(135deg, var(--dark), #7d6fb0)";
			avatarEl.textContent = (post.posterName || "?").trim().charAt(0).toUpperCase();
		}
		document.getElementById("pvName").textContent = post.posterName || "";
		currentPostId = post.id || null;
		renderPvComments();
		refreshPvLike();
		modal.classList.add("open");
		document.body.style.overflow = "hidden";
	};
})();

/* =====================================================================
   ฟีดชุมชนหน้าแรก (Instagram/Facebook/Lemon8 style) — ใช้ getFeedItems() จาก core.js
   โพสต์เดียวโชว์ได้หลายรูปแบบปัดซ้าย-ขวา กดรูปเปิดโมดัลดูเต็มจอ + คอมเมนต์ได้เหมือนอินสตาแกรม
   ===================================================================== */
function formatFeedTime(dateStr) {
	var diffMs = Date.now() - new Date(dateStr).getTime();
	var mins = Math.floor(diffMs / 60000);
	if (mins < 1) return t("feed.justNow");
	if (mins < 60) return mins + t("feed.minsAgo");
	var hrs = Math.floor(mins / 60);
	if (hrs < 24) return hrs + t("feed.hoursAgo");
	var days = Math.floor(hrs / 24);
	return days + t("feed.daysAgo");
}

function renderCommunityFeed(container) {
	var emptyMsg = document.getElementById("communityFeedEmpty");
	var items = getFeedItems();
	container.innerHTML = "";
	if (items.length === 0) {
		if (emptyMsg) emptyMsg.hidden = false;
		return;
	}
	if (emptyMsg) emptyMsg.hidden = true;

	items.forEach(function(item) {
		var el = document.createElement("div");
		el.className = "feeditem";

		var avatarHtml = item.posterAvatarUrl
			? '<div class="feedavatar" style="background:var(--cream2) center/cover no-repeat url(\'' + item.posterAvatarUrl + '\')"></div>'
			: '<div class="feedavatar" style="background:' + item.posterColor + '">' + escapeHtml((item.posterName || "?").trim().charAt(0).toUpperCase()) + '</div>';

		var imgsHtml = item.images.map(function(src) {
			return '<img src="' + src + '" alt=""/>';
		}).join("");
		var dotsHtml = item.images.length > 1
			? '<div class="feeddots">' + item.images.map(function(_, i) { return '<span class="' + (i === 0 ? "active" : "") + '"></span>'; }).join("") + '</div>'
			: "";

		el.innerHTML =
			'<div class="feedhead">' +
				avatarHtml +
				'<div class="feednm">' +
					'<div class="feedname">' + escapeHtml(item.posterName) + (item.kind === "mockup" ? ' <i class="fas fa-store feedstoreico" title="ร้านอาหาร"></i>' : "") + "</div>" +
					'<div class="feedtime">' + formatFeedTime(item.date) + "</div>" +
				"</div>" +
			"</div>" +
			'<div class="feedimgs"><div class="feedimgstrip">' + imgsHtml + "</div>" + dotsHtml + "</div>" +
			'<div class="feedactions">' +
				'<button class="feedlikebtn" type="button"><i class="far fa-heart"></i><span></span></button>' +
				'<button class="feedcommentbtn" type="button"><i class="far fa-comment"></i><span></span></button>' +
			"</div>" +
			'<div class="feedcap"><b>' + escapeHtml(item.posterName) + "</b> " + escapeHtml(item.caption) + "</div>";

		if (item.posterLink) {
			var headEl = el.querySelector(".feedhead");
			headEl.style.cursor = "pointer";
			headEl.addEventListener("click", function() {
				window.location.href = item.posterLink;
			});
		}

		var strip = el.querySelector(".feedimgstrip");
		var dotsBox = el.querySelector(".feeddots");
		if (dotsBox) {
			var dotEls = dotsBox.querySelectorAll("span");
			strip.addEventListener("scroll", function() {
				var idx = Math.round(strip.scrollLeft / strip.clientWidth);
				dotEls.forEach(function(d, i) { d.classList.toggle("active", i === idx); });
			});
		}
		strip.addEventListener("click", function() {
			openPostView({ id: item.id, images: item.images, caption: item.caption, posterName: item.posterName, posterColor: item.posterColor, posterAvatarUrl: item.posterAvatarUrl });
		});

		var likeBtn = el.querySelector(".feedlikebtn");
		function refreshFeedLike() {
			var liked = isPostLiked(item.id);
			var ico = likeBtn.querySelector("i");
			ico.classList.toggle("far", !liked);
			ico.classList.toggle("fas", liked);
			likeBtn.classList.toggle("liked", liked);
			likeBtn.querySelector("span").textContent = formatLikeCount(getPostLikeCount(item.id));
		}
		likeBtn.addEventListener("click", function() {
			togglePostLike(item.id);
			refreshFeedLike();
		});
		refreshFeedLike();

		var commentBtn = el.querySelector(".feedcommentbtn");
		commentBtn.querySelector("span").textContent = getComments(item.id).length;
		commentBtn.addEventListener("click", function() {
			openPostView({ id: item.id, images: item.images, caption: item.caption, posterName: item.posterName, posterColor: item.posterColor, posterAvatarUrl: item.posterAvatarUrl });
		});

		container.appendChild(el);
	});
}

/* =====================================================================
   เริ่มต้น UI ตอนโหลดหน้า
   ===================================================================== */
refreshAuthUI();
(function initCommunityFeedIfPresent() {
	var feed = document.getElementById("communityFeed");
	if (feed) renderCommunityFeed(feed);
})();
