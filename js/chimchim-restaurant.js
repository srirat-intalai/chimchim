// chimchim-restaurant.js
// หน้ารายละเอียดร้าน (restaurant.html) — อ่าน ?id= จาก URL แล้วแสดงข้อมูลร้าน
// ร้านมาจาก รายการร้าน (ข้อมูลตัวอย่าง + ร้านที่ชุมชนโพสต์ ผสานไว้แล้วโดย chimchim-core.js)

var params = new URLSearchParams(window.location.search);
var shopId = parseInt(params.get("id"), 10);
var ร้านปัจจุบัน = หาร้านจากId(shopId);

function renderShopNotFound() {
	document.getElementById("rdBody").hidden = false;
	document.getElementById("rdBody").innerHTML =
		'<div style="text-align:center;padding:60px 10px;">' +
		'<p style="color:#999;font-size:.9rem;margin-bottom:16px;">' + t("common.shopNotFound") + '</p>' +
		'<a href="home.html" class="btn-red"><i class="fas fa-house"></i><span>' + t("common.backToHome") + '</span></a>' +
		"</div>";
}

if (!ร้านปัจจุบัน) {
	// ร้านนี้อาจโพสต์จากเครื่องอื่น ยังไม่เคย sync มาที่เครื่องนี้ — โชว์โครง skeleton รอไว้ก่อน (เนื้อหาจริงข้างใต้
	// #rdBody ยังไม่ถูกแตะเลย) แล้วลอง sync ครั้งเดียว ถ้าเจอก็ render ต่อในหน้าเดิมได้เลยไม่ต้องรีโหลดหน้า
	document.getElementById("rdBody").hidden = true;
	document.getElementById("rdSkeleton").hidden = false;
	if (typeof syncShopsWithSupabase === "function") {
		syncShopsWithSupabase(function() {
			ร้านปัจจุบัน = หาร้านจากId(shopId);
			document.getElementById("rdSkeleton").hidden = true;
			if (ร้านปัจจุบัน) {
				document.getElementById("rdBody").hidden = false;
				renderShopDetail();
			} else {
				renderShopNotFound();
			}
		});
	} else {
		document.getElementById("rdSkeleton").hidden = true;
		renderShopNotFound();
	}
} else {
	renderShopDetail();
}

function renderShopDetail() {
	var คะแนน = คำนวณMatch(ร้านปัจจุบัน, foodDNA);
	var เหตุผล = สร้างเหตุผลmatch(ร้านปัจจุบัน, foodDNA);

	document.getElementById("rdImg").src = ร้านปัจจุบัน.รูป;
	document.getElementById("rdImg").alt = ร้านปัจจุบัน.เมนู;
	document.title = ร้านปัจจุบัน.เมนู + " - ChimChim";
	document.getElementById("rdCat").innerHTML = catEmoji(ร้านปัจจุบัน.หมวด) + " " + escapeHtml(catLabel(ร้านปัจจุบัน.หมวด));
	document.getElementById("rdTitle").textContent = ร้านปัจจุบัน.เมนู;
	document.getElementById("rdRestaurant").innerHTML = '<i class="fas fa-store"></i> ' + escapeHtml(ร้านปัจจุบัน.ร้าน);
	document.getElementById("rdPrice").textContent = "฿" + ร้านปัจจุบัน.ราคาต่ำ + "–" + ร้านปัจจุบัน.ราคาสูง;
	document.getElementById("rdDistance").textContent = distanceText(ร้านปัจจุบัน.ระยะทาง);
	document.getElementById("rdUni").textContent = t("restaurant.near") + ร้านปัจจุบัน.มหาลัย;
	document.getElementById("rdMatchPct").setAttribute("data-match-score", คะแนน);
	document.getElementById("rdMatchPct").innerHTML = matchBadgeText(คะแนน);
	document.getElementById("rdMatchReason").textContent = เหตุผล;
	document.getElementById("rdDesc").textContent = ร้านปัจจุบัน.community ?
		(ร้านปัจจุบัน.คำโปรยกำหนดเอง || t("restaurant.postedBy").replace("{vendor}", ร้านปัจจุบัน.vendorName)) :
		t("restaurant.defaultDesc");

	var tagsHtml = "";
	ร้านปัจจุบัน.แท็ก.forEach(function(tag) {
		tagsHtml += '<span class="mtagit">' + escapeHtml(tag) + "</span>";
	});
	document.getElementById("rdTags").innerHTML = tagsHtml;

	/* --- เวลาเปิด-ปิด + โปรโมชั่น — แสดงเฉพาะที่เจ้าของร้านกรอกเองเท่านั้น
	   (เดิมร้านที่ไม่ได้กรอกจะได้เวลา/โปรโมชั่นตัวอย่างจาก getShopExtra ซึ่งดูเหมือนข้อมูลจริงของร้าน ทำให้ผู้ใช้เข้าใจผิด) --- */
	document.getElementById("rdHours").textContent = ร้านปัจจุบัน.เวลาเปิดกำหนดเอง || t("restaurant.hoursUnknown");
	var promoText = ร้านปัจจุบัน.โปรโมชั่นกำหนดเอง || "";
	document.getElementById("rdPromoBox").hidden = !promoText;
	if (promoText) {
		document.getElementById("rdPromoItem").innerHTML =
			'<span class="rdpromoicon">🎉</span><span>' + escapeHtml(promoText) + "</span>";
	}

	/* --- ปุ่มถูกใจ (หัวใจบน hero) — บันทึกจริงเหมือนฟีดโซเชียล พร้อมยอดไลก์ --- */
	var saveBtn = document.getElementById("rdSaveBtn");
	var likeCountEl = document.getElementById("rdLikeCount");
	function refreshLikeBtn() {
		var liked = isShopLiked(ร้านปัจจุบัน.id);
		saveBtn.classList.toggle("saved", liked);
		var ico = saveBtn.querySelector("i");
		ico.classList.toggle("far", !liked);
		ico.classList.toggle("fas", liked);
		likeCountEl.textContent = formatLikeCount(getLikeCount(ร้านปัจจุบัน.id));
	}
	refreshLikeBtn();
	saveBtn.addEventListener("click", function() {
		toggleLikeShop(ร้านปัจจุบัน.id);
		refreshLikeBtn();
	});

	/* --- ปุ่มบันทึกไว้ดูทีหลัง (ไอคอน bookmark) — แยกจากปุ่มถูกใจด้านบนจริง ๆ --- */
	var bookmarkBtn = document.getElementById("rdBookmarkBtn");
	function refreshBookmarkBtn() {
		var saved = isShopSaved(ร้านปัจจุบัน.id);
		bookmarkBtn.classList.toggle("saved", saved);
		var ico = bookmarkBtn.querySelector("i");
		ico.classList.toggle("far", !saved);
		ico.classList.toggle("fas", saved);
		bookmarkBtn.setAttribute("aria-label", t(saved ? "shop.savedForLater" : "shop.saveForLater"));
	}
	refreshBookmarkBtn();
	bookmarkBtn.addEventListener("click", function() {
		toggleSaveShop(ร้านปัจจุบัน.id);
		refreshBookmarkBtn();
	});
	if (typeof syncSavedShopsWithSupabase === "function") syncSavedShopsWithSupabase(refreshBookmarkBtn);

	/* --- ปุ่ม Follow ร้าน — รวมเป็นระบบเดียวกับ Follow คน/เพจร้าน (toggleFollowUser)
	   ถ้าร้านนี้มีเพจร้าน BU ของตัวเอง ให้ Follow ผ่าน id ของเพจนั้นเลย จะได้เป็นสถานะเดียวกัน
	   ไม่ว่าจะกด Follow จากหน้าร้าน หรือจากหน้าโปรไฟล์เพจก็ตาม --- */
	var followBtn = document.getElementById("rdFollowBtn");
	var buShopของร้านนี้ = (typeof เพจร้านBU !== "undefined") ? เพจร้านBU.filter(function(s) { return s.menuId === ร้านปัจจุบัน.id; })[0] : null;
	var followId = buShopของร้านนี้ ? ("bu-" + buShopของร้านนี้.id) : ร้านปัจจุบัน.id;

	/* --- ชื่อร้าน กดเข้าไปดูเพจร้าน (โปรไฟล์ร้าน + โพสต์อื่น ๆ ของร้านนั้น) ได้เลย ถ้าร้านนี้มีเพจร้าน BU ของตัวเอง
	   (ร้านตัวอย่างที่ยังไม่มีเพจ จะโชว์แค่ชื่อเฉย ๆ เหมือนเดิม ไม่มีอะไรให้กดเข้าไปดูต่อ) --- */
	var rdRestaurantLink = document.getElementById("rdRestaurant");
	if (buShopของร้านนี้) {
		rdRestaurantLink.href = "public-profile.html?u=bu-" + buShopของร้านนี้.id;
		rdRestaurantLink.classList.add("rdshoplink");
		rdRestaurantLink.innerHTML += ' <i class="fas fa-chevron-right rdshopchevron"></i>';
	}
	function refreshFollowBtn() {
		var followed = buShopของร้านนี้ ? isUserFollowed(followId) : isShopFollowed(followId);
		followBtn.classList.toggle("following", followed);
		followBtn.innerHTML = followed ?
			'<i class="fas fa-check me-1"></i>' + t("restaurant.following") :
			'<i class="fas fa-user-plus me-1"></i>' + t("restaurant.follow");
	}
	refreshFollowBtn();
	followBtn.addEventListener("click", function() {
		var nowFollowing = buShopของร้านนี้ ? toggleFollowUser(followId) : toggleFollowShop(followId);
		if (nowFollowing === null) return; // ยังไม่ล็อกอิน — เด้ง popup ให้แล้วจาก toggleFollowUser/toggleFollowShop เอง
		refreshFollowBtn();
		showToast(nowFollowing ? t("restaurant.followedToast") : t("restaurant.unfollowedToast"));
	});
	if (typeof syncLikesAndFollowsWithSupabase === "function") {
		syncLikesAndFollowsWithSupabase(refreshFollowBtn);
	}

	/* --- ปุ่มแชร์ --- */
	document.getElementById("rdShareBtn").addEventListener("click", function() {
		showToast(t("restaurant.linkCopiedToast"));
	});

	/* --- ปุ่มรายงาน — เฉพาะร้านที่ชุมชนโพสต์เอง (ร้านตั้งต้นของทีม ChimChim รายงานไม่ได้) --- */
	var rdReportBtn = document.getElementById("rdReportBtn");
	if (ร้านปัจจุบัน.community) {
		rdReportBtn.hidden = false;
		rdReportBtn.addEventListener("click", function() {
			openReportPopup("shop", ร้านปัจจุบัน.id, function() {
				window.location.href = "home.html";
			});
		});
	}

	/* --- ปุ่มนำทาง — เปิด Google Maps ค้นหาตำแหน่งร้านจริงจากชื่อร้าน + มหาวิทยาลัยใกล้เคียง --- */
	document.getElementById("rdNavBtn").addEventListener("click", function() {
		var q = ร้านปัจจุบัน.ร้าน + (ร้านปัจจุบัน.มหาลัย ? " ใกล้ " + ร้านปัจจุบัน.มหาลัย : "");
		window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q), "_blank");
	});

	/* --- ปุ่มเขียนรีวิว — ต้องล็อกอินก่อน (ไม่ล็อกอินกดแล้วเปิดหน้าต่างเข้าสู่ระบบแทน) --- */
	var rdReviewBtn = document.getElementById("rdReviewBtn");
	rdReviewBtn.href = "review.html?id=" + ร้านปัจจุบัน.id;
	rdReviewBtn.addEventListener("click", function(e) {
		if (ต้องล็อกอินก่อนไหม()) e.preventDefault();
	});
	// เปิดหน้าเขียนรีวิวตรง ๆ โดยยังไม่ล็อกอิน → review.html ส่งกลับมาที่นี่พร้อม ?login=review ให้เด้งหน้าต่างเข้าสู่ระบบ
	if (new URLSearchParams(window.location.search).get("login") === "review") ต้องล็อกอินก่อนไหม();

	/* --- แท็บภาพรวม / รีวิว --- */
	var RD_TAB_PANE_MAP = { overview: "rdPaneOverview", reviews: "rdPaneReviews", posts: "rdPanePosts" };
	document.querySelectorAll(".rdtab").forEach(function(tab) {
		tab.addEventListener("click", function() {
			document.querySelectorAll(".rdtab").forEach(function(t) { t.classList.remove("active"); });
			document.querySelectorAll(".rdpane").forEach(function(p) { p.classList.remove("active"); });
			this.classList.add("active");
			var target = RD_TAB_PANE_MAP[this.getAttribute("data-tab")];
			document.getElementById(target).classList.add("active");
		});
	});

	/* --- รายการรีวิว --- */
	function renderReviews() {
		var reviews = getReviews(ร้านปัจจุบัน.id);
		document.getElementById("rdReviewCount").textContent = reviews.length;
		var listBox = document.getElementById("rdReviewList");
		if (reviews.length === 0) {
			listBox.innerHTML = '<p class="rdempty">' + t("restaurant.noReviewsYet") + '</p>';
			return;
		}
		listBox.innerHTML = "";
		var me = getMe();
		reviews.forEach(function(r) {
			var avgScore = Math.round((r.taste + r.atmosphere + r.service) / 3 * 10) / 10;
			// ลบได้ทุกรีวิวของตัวเอง (แม้ยังไม่ sync) แต่แก้ไขได้เฉพาะที่ sync ขึ้น Supabase แล้ว (มี remoteId จริง)
			var isMine = !!(me && r.userId && r.userId === me.id);
			var canEdit = isMine && !!r.remoteId;
			var row = document.createElement("div");
			row.className = "rdreviewrow";
			// รูปแนบทุกรูป (สูงสุด 10) เลื่อนดูได้ในแถว กดรูปไหนเปิดแกลเลอรีเต็มจอที่รูปนั้น
			// รีวิวเก่าที่ไม่มีรูป/เก็บเป็นค่าเดี่ยวก็แสดงได้ถูกต้อง
			var reviewImages = Array.isArray(r.images) ? r.images.filter(Boolean) : (r.images ? [r.images] : []);
			var reviewImgsHtml = reviewImages.length
				? '<div class="rdreviewimgs" role="list">' + reviewImages.map(function(src, i) {
					return '<button type="button" class="rdreviewimg" role="listitem" data-idx="' + i + '" aria-label="' + escapeHtml(t("photos.openN").replace("{i}", i + 1).replace("{n}", reviewImages.length)) + '"><img src="' + safeImgSrc(src) + '" alt="" loading="lazy"/></button>';
				}).join("") + '</div>' +
				(reviewImages.length > 1 ? '<div class="rdreviewimgn"><i class="fas fa-images"></i> ' + escapeHtml(t("common.photoCount").replace("{n}", reviewImages.length)) + '</div>' : "")
				: "";
			row.innerHTML =
				'<div class="rdreviewavt">' + escapeHtml(r.author.charAt(0).toUpperCase()) + "</div>" +
				'<div style="flex:1;min-width:0;">' +
					'<div class="rdreviewnm">' + escapeHtml(r.author) + "</div>" +
					'<div class="rdreviewscore"><i class="fas fa-bullseye"></i> ' + avgScore + t("restaurant.avgScoreSuffix") + "</div>" +
					'<div class="rdreviewtxt">' + escapeHtml(r.text || t("restaurant.noReviewText")) + "</div>" +
					reviewImgsHtml +
				"</div>" +
				(isMine ?
					'<div class="rdreviewactions">' +
						(canEdit ? '<button type="button" class="rdreviewedit" aria-label="' + t("review.edit") + '"><i class="fas fa-pen"></i><span>' + t("review.edit") + '</span></button>' : "") +
						'<button type="button" class="rdreviewdel" aria-label="' + t("review.delete") + '"><i class="fas fa-trash-can"></i><span>' + t("review.delete") + '</span></button>' +
					"</div>" : "");
			row.querySelectorAll(".rdreviewimg").forEach(function(btn) {
				btn.addEventListener("click", function() {
					openPhotoViewer(reviewImages, parseInt(btn.getAttribute("data-idx"), 10));
				});
			});
			if (canEdit) {
				row.querySelector(".rdreviewedit").addEventListener("click", function() {
					window.location.href = "review.html?id=" + ร้านปัจจุบัน.id + "&editRemoteId=" + encodeURIComponent(r.remoteId);
				});
			}
			if (isMine) {
				row.querySelector(".rdreviewdel").addEventListener("click", function() {
					showConfirmDialog({
						title: t("review.deleteTitle"),
						message: t("review.confirmDelete"),
						confirmText: t("review.deleteBtn")
					}).then(function(yes) {
						if (!yes) return;
						deleteReview(ร้านปัจจุบัน.id, r);
						renderReviews();
						if (typeof showToast === "function") showToast(t("review.deletedToast"));
					});
				});
			}
			listBox.appendChild(row);
		});
	}
	renderReviews();
	// ดึงรีวิวจริงของทุกคนจาก Supabase มาผสาน (ไม่ใช่แค่รีวิวที่เขียนจากเครื่องนี้) แล้ว re-render
	if (typeof syncReviewsWithSupabase === "function") {
		syncReviewsWithSupabase(ร้านปัจจุบัน.id, renderReviews);
	}
	// นับไลก์ร้านจริงจาก Supabase สำหรับปุ่มถูกใจบน hero (ปุ่มนี้ไม่ได้ผ่าน initLikeUI เหมือนการ์ดร้านทั่วไป)
	if (typeof queueShopLikeCountFetch === "function") {
		queueShopLikeCountFetch(ร้านปัจจุบัน.id, likeCountEl);
	}

	/* --- แท็บโพสต์ — ทุกร้าน: ร้านตั้งต้นในระบบใช้โพสต์จากเพจร้าน (ชุดเดียวกับหน้าโปรไฟล์ร้าน/ฟีด id "bu-<ร้าน>-post<ลำดับ>"
	   ไลก์/คอมเมนต์เลยเป็นชุดเดียวกันทุกหน้า) + ร้านที่ผู้ใช้โพสต์เข้าชุมชนเองใช้โพสต์จริงของเพจนั้น --- */
	function renderShopPosts() {
		var shopPosts = [];
		if (buShopของร้านนี้ && Array.isArray(buShopของร้านนี้.posts)) {
			shopPosts = buShopของร้านนี้.posts.map(function(p, idx) {
				return { id: "bu-" + buShopของร้านนี้.id + "-post" + idx, images: p.images, img: (p.images || [])[0], caption: p.caption, userId: null };
			});
		}
		if (ร้านปัจจุบัน.community && ร้านปัจจุบัน.vendorId) {
			shopPosts = shopPosts.concat(getPostsByPage(ร้านปัจจุบัน.id));
		}
		if (!shopPosts.length) return;
		var postsTab = document.getElementById("rdPostsTab");
		postsTab.hidden = false;
		var countEl = document.getElementById("rdPostCount");
		if (countEl) countEl.textContent = shopPosts.length;
		var postGrid = document.getElementById("rdPostGrid");
		var postEmpty = document.getElementById("rdPostEmpty");
		postGrid.innerHTML = "";
		postEmpty.hidden = true;
		shopPosts.forEach(function(p) {
			var images = getPostImages(p);
			var el = document.createElement("div");
			el.className = "ppost card-enter";
			el.innerHTML =
				postCoverHtml(images, p.caption) +
				(images.length > 1 ? '<i class="fas fa-clone ppostmulti" title="' + t("common.photoCount").replace("{n}", images.length) + '"></i>' : "") +
				(images.length ? '<div class="ppostcap">' + escapeHtml(p.caption || "") + '</div>' : "");
			el.addEventListener("click", function() {
				openPostView({ id: p.id, images: images, caption: p.caption, posterName: ร้านปัจจุบัน.ร้าน, posterColor: "var(--cream2)", posterAvatarUrl: buShopของร้านนี้ ? buShopของร้านนี้.avatar : null, posterId: p.userId || null });
			});
			postGrid.appendChild(el);
		});
	}
	renderShopPosts();
	// ดึงโพสต์ของทุกคนจาก Supabase มาผสาน เผื่อร้านนี้มีโพสต์ที่ทำจากเครื่องอื่นที่ยังไม่เคยเห็นในเครื่องนี้
	if (typeof syncPostsWithSupabase === "function") {
		syncPostsWithSupabase(renderShopPosts);
	}
}
