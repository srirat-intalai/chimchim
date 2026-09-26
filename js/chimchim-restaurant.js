// chimchim-restaurant.js
// หน้ารายละเอียดร้าน (restaurant.html) — อ่าน ?id= จาก URL แล้วแสดงข้อมูลร้าน
// ร้านมาจาก รายการร้าน (ข้อมูลตัวอย่าง + ร้านที่ชุมชนโพสต์ ผสานไว้แล้วโดย chimchim-core.js)

var params = new URLSearchParams(window.location.search);
var shopId = parseInt(params.get("id"), 10);
var ร้านปัจจุบัน = หาร้านจากId(shopId);

if (!ร้านปัจจุบัน) {
	document.querySelector(".rdbody").innerHTML =
		'<div style="text-align:center;padding:60px 10px;">' +
		'<p style="color:#999;font-size:.9rem;margin-bottom:16px;">' + t("common.shopNotFound") + '</p>' +
		'<a href="home.html" class="btn-red"><i class="fas fa-house"></i><span>' + t("common.backToHome") + '</span></a>' +
		"</div>";
	// ร้านนี้อาจโพสต์จากเครื่องอื่น ยังไม่เคย sync มาที่เครื่องนี้ — ลอง sync แล้วโหลดหน้าใหม่ครั้งเดียวถ้าเจอ
	var retryFlag = "chimchim_shop_sync_retry_" + shopId;
	if (typeof syncShopsWithSupabase === "function" && !sessionStorage.getItem(retryFlag)) {
		sessionStorage.setItem(retryFlag, "1");
		syncShopsWithSupabase(function() {
			if (หาร้านจากId(shopId)) location.reload();
		});
	}
} else {
	var คะแนน = คำนวณMatch(ร้านปัจจุบัน, foodDNA);
	var เหตุผล = สร้างเหตุผลmatch(ร้านปัจจุบัน, foodDNA);

	document.getElementById("rdImg").src = ร้านปัจจุบัน.รูป;
	document.getElementById("rdImg").alt = ร้านปัจจุบัน.เมนู;
	document.title = ร้านปัจจุบัน.เมนู + " - ChimChim";
	document.getElementById("rdCat").textContent = catEmoji(ร้านปัจจุบัน.หมวด) + " " + catLabel(ร้านปัจจุบัน.หมวด);
	document.getElementById("rdTitle").textContent = ร้านปัจจุบัน.เมนู;
	document.getElementById("rdRestaurant").innerHTML = '<i class="fas fa-store"></i> ' + escapeHtml(ร้านปัจจุบัน.ร้าน);
	document.getElementById("rdPrice").textContent = "฿" + ร้านปัจจุบัน.ราคาต่ำ + "–" + ร้านปัจจุบัน.ราคาสูง;
	document.getElementById("rdDistance").textContent = distanceText(ร้านปัจจุบัน.ระยะทาง);
	document.getElementById("rdUni").textContent = t("restaurant.near") + ร้านปัจจุบัน.มหาลัย;
	document.getElementById("rdMatchPct").setAttribute("data-match-score", คะแนน);
	document.getElementById("rdMatchPct").textContent = matchBadgeText(คะแนน);
	document.getElementById("rdMatchReason").textContent = เหตุผล;
	document.getElementById("rdDesc").textContent = ร้านปัจจุบัน.community ?
		(ร้านปัจจุบัน.คำโปรยกำหนดเอง || t("restaurant.postedBy").replace("{vendor}", ร้านปัจจุบัน.vendorName)) :
		t("restaurant.defaultDesc");

	var tagsHtml = "";
	ร้านปัจจุบัน.แท็ก.forEach(function(tag) {
		tagsHtml += '<span class="mtagit">' + escapeHtml(tag) + "</span>";
	});
	document.getElementById("rdTags").innerHTML = tagsHtml;

	/* --- เวลาเปิด-ปิด + โปรโมชั่น (ใช้ค่าที่เจ้าของร้านกรอกเองถ้ามี ไม่งั้นใช้ค่าเสริมอัตโนมัติ) --- */
	var เสริม = getShopExtra(ร้านปัจจุบัน.id);
	document.getElementById("rdHours").textContent = ร้านปัจจุบัน.เวลาเปิดกำหนดเอง || เสริม.hours;
	var promoText = ร้านปัจจุบัน.โปรโมชั่นกำหนดเอง || เสริม.promo.text;
	var promoIcon = ร้านปัจจุบัน.โปรโมชั่นกำหนดเอง ? "🎉" : เสริม.promo.icon;
	document.getElementById("rdPromoItem").innerHTML =
		'<span class="rdpromoicon">' + promoIcon + "</span><span>" + escapeHtml(promoText) + "</span>";

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

	/* --- ปุ่มเขียนรีวิว --- */
	document.getElementById("rdReviewBtn").href = "review.html?id=" + ร้านปัจจุบัน.id;

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
			// แก้ไข/ลบได้เฉพาะรีวิวของตัวเองที่ sync ขึ้น Supabase แล้วเท่านั้น (มี remoteId จริง)
			var isMine = me && r.userId === me.id && r.remoteId;
			var row = document.createElement("div");
			row.className = "rdreviewrow";
			row.innerHTML =
				'<div class="rdreviewavt">' + escapeHtml(r.author.charAt(0).toUpperCase()) + "</div>" +
				'<div style="flex:1;min-width:0;">' +
					'<div class="rdreviewnm">' + escapeHtml(r.author) + "</div>" +
					'<div class="rdreviewscore">🎯 ' + avgScore + t("restaurant.avgScoreSuffix") + "</div>" +
					'<div class="rdreviewtxt">' + escapeHtml(r.text || t("restaurant.noReviewText")) + "</div>" +
				"</div>" +
				(isMine ?
					'<div class="rdreviewactions">' +
						'<button type="button" class="rdreviewedit" title="' + t("common.editPost") + '"><i class="fas fa-pen"></i></button>' +
						'<button type="button" class="rdreviewdel" title="' + t("common.deletePost") + '"><i class="fas fa-times"></i></button>' +
					"</div>" : "");
			if (isMine) {
				row.querySelector(".rdreviewedit").addEventListener("click", function() {
					window.location.href = "review.html?id=" + ร้านปัจจุบัน.id + "&editRemoteId=" + encodeURIComponent(r.remoteId);
				});
				row.querySelector(".rdreviewdel").addEventListener("click", function() {
					if (!confirm(t("review.confirmDelete"))) return;
					deleteReview(ร้านปัจจุบัน.id, r.remoteId);
					renderReviews();
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

	/* --- แท็บโพสต์ — โชว์เฉพาะร้านที่ผู้ใช้โพสต์เข้าชุมชนเอง (มี vendorId) ร้านทีม ChimChim ไม่มีโพสต์ให้โชว์ --- */
	function renderShopPosts() {
		if (!(ร้านปัจจุบัน.community && ร้านปัจจุบัน.vendorId)) return;
		var shopPosts = getPostsByPage(ร้านปัจจุบัน.id);
		if (!shopPosts.length) return;
		document.getElementById("rdPostsTab").hidden = false;
		var postGrid = document.getElementById("rdPostGrid");
		var postEmpty = document.getElementById("rdPostEmpty");
		postGrid.innerHTML = "";
		postEmpty.hidden = true;
		shopPosts.forEach(function(p) {
			var images = getPostImages(p);
			var el = document.createElement("div");
			el.className = "ppost";
			el.innerHTML =
				'<img src="' + images[0] + '" alt=""/>' +
				(images.length > 1 ? '<i class="fas fa-clone ppostmulti" title="' + t("common.photoCount").replace("{n}", images.length) + '"></i>' : "") +
				'<div class="ppostcap">' + escapeHtml(p.caption) + '</div>';
			el.addEventListener("click", function() {
				openPostView({ id: p.id, images: images, caption: p.caption, posterName: ร้านปัจจุบัน.ร้าน, posterColor: "var(--cream2)" });
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
