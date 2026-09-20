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
		var form = this;
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

		var salt = generateSalt();
		hashPassword(password, salt).then(function(passwordHash) {
			var newUser = { id: "u" + Date.now(), name: name, email: email, salt: salt, passwordHash: passwordHash };
			users.push(newUser);
			saveUsers(users);
			setSession(newUser);
			closeAuthPop();
			refreshAuthUI();
			form.reset();

			// ทุกบัญชีเป็นแบบเดียวกันหมด -> พาไปทำแบบสอบถาม Food DNA ต่อเสมอ
			window.location.href = "profile-setup.html";
		});
	});

	/* --- เข้าสู่ระบบ --- */
	document.getElementById("loginForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var form = this;
		var errBox = document.getElementById("loginErr");
		errBox.classList.remove("show");

		var email = document.getElementById("loginEmail").value.trim().toLowerCase();
		var password = document.getElementById("loginPassword").value;

		var users = getUsers();
		var candidate = users.filter(function(u) {
			return u.email === email;
		})[0];

		if (!candidate) {
			errBox.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
			errBox.classList.add("show");
			return;
		}

		hashPassword(password, candidate.salt).then(function(passwordHash) {
			if (passwordHash !== candidate.passwordHash) {
				errBox.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
				errBox.classList.add("show");
				return;
			}

			setSession(candidate);
			closeAuthPop();
			refreshAuthUI();
			form.reset();
			showToast("ยินดีต้อนรับกลับมา " + candidate.name + "! 🦖");
			// รีเฟรชหน้าปัจจุบันเพื่อให้ Food DNA ส่วนตัว + สถานะล็อกอินอัปเดตทุกจุด
			setTimeout(function() {
				window.location.reload();
			}, 600);
		});
	});
}

document.addEventListener("keydown", function(e) {
	if (e.key === "Escape") {
		closeAuthPop();
	}
});

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

/* --- ฟีดชุมชน: โชว์ 6 โพสต์แรก พอเลื่อนถึงล่างสุดค่อยเพิ่มทีละ 5 (ต่อท้ายในหน้าเดิม ไม่รีเฟรชหน้า) --- */
var FEED_INITIAL_SIZE = 5;
var FEED_PAGE_STEP = 5;
var feedState = { items: [], shown: 0, container: null };

function renderCommunityFeed(container, catFilter) {
	if (window.__chimchimFeedSentinelObserver) {
		window.__chimchimFeedSentinelObserver.disconnect();
		window.__chimchimFeedSentinelObserver = null;
	}
	var emptyMsg = document.getElementById("communityFeedEmpty");
	var items = getFeedItems();
	if (catFilter && catFilter !== "all") {
		items = items.filter(function(item) { return item.cat === catFilter; });
	}
	container.innerHTML = "";
	feedState.items = items;
	feedState.shown = 0;
	feedState.container = container;

	var loadingMore = document.getElementById("communityFeedLoadingMore");
	if (loadingMore) loadingMore.hidden = true;

	if (items.length === 0) {
		if (emptyMsg) {
			emptyMsg.textContent = (catFilter && catFilter !== "all") ? (t("home.feedEmptyCat") || "ยังไม่มีโพสต์ในหมวดนี้") : t("home.feedEmpty");
			emptyMsg.hidden = false;
		}
		return;
	}
	if (emptyMsg) emptyMsg.hidden = true;

	appendNextFeedBatch(FEED_INITIAL_SIZE);
	wireFeedLoadMoreSentinel();
}

function buildFeedItemEl(item) {
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

	return el;
}

function appendNextFeedBatch(count) {
	var next = feedState.items.slice(feedState.shown, feedState.shown + count);
	next.forEach(function(item) {
		feedState.container.appendChild(buildFeedItemEl(item));
	});
	feedState.shown += next.length;
}

/* --- sentinel ท้ายฟีด: เลื่อนถึงแล้วโชว์ตัวหมุนโหลดก่อน (เนื้อหาเดิมยังอยู่ครบ ไม่หาย) จากนั้นค่อยเพิ่มโพสต์ชุดถัดไปต่อท้าย
   ทำซ้ำแบบนี้ไปเรื่อย ๆ ทุกครั้งที่เลื่อนถึงท้ายฟีด จนกว่าโพสต์จะหมด (ไม่รีเฟรชหน้าเลย)
   ข้าม callback แรกสุด (ที่ยิงทันทีตอน observe() เพื่อรายงานสถานะปัจจุบัน ไม่ใช่การเลื่อนจริงของผู้ใช้) --- */
function wireFeedLoadMoreSentinel() {
	var sentinel = document.getElementById("communityFeedSentinel");
	var loadingMore = document.getElementById("communityFeedLoadingMore");
	if (!sentinel || !("IntersectionObserver" in window)) return;
	if (feedState.shown >= feedState.items.length) return;

	var isFirstCallback = true;
	var isLoading = false;
	var observer = new IntersectionObserver(function(entries) {
		if (isFirstCallback) {
			isFirstCallback = false;
			return;
		}
		if (!entries[0].isIntersecting || isLoading) return;
		isLoading = true;
		if (loadingMore) loadingMore.hidden = false;
		setTimeout(function() {
			appendNextFeedBatch(FEED_PAGE_STEP);
			isLoading = false;
			if (loadingMore) loadingMore.hidden = true;
			if (feedState.shown >= feedState.items.length) {
				observer.disconnect();
				window.__chimchimFeedSentinelObserver = null;
			}
		}, 600);
	}, { threshold: 0.1 });
	observer.observe(sentinel);
	window.__chimchimFeedSentinelObserver = observer;
}

/* =====================================================================
   เริ่มต้น UI ตอนโหลดหน้า
   ===================================================================== */
refreshAuthUI();
(function initCommunityFeedIfPresent() {
	var feed = document.getElementById("communityFeed");
	if (feed) renderCommunityFeed(feed, typeof currentTrendCat !== "undefined" ? currentTrendCat : "all");
})();
