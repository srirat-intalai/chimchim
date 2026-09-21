// chimchim-publicprofile.js
// หน้าโปรไฟล์สาธารณะ (public-profile.html) — อ่าน ?u= จาก URL
// รองรับทั้งนักรีวิวเด่นตัวอย่าง (id ขึ้นต้นด้วย seed-) และสมาชิกที่สมัครจริง

var ppParams = new URLSearchParams(window.location.search);
var ppUid = ppParams.get("u");
var ppIsSeed = ppUid && ppUid.indexOf("seed-") === 0;
var ppIsPage = ppUid && ppUid.indexOf("page-") === 0;
var ppIsBuShop = ppUid && ppUid.indexOf("bu-") === 0;
var ppSession = getSession();

function ppRenderPosts(posts, posterName, posterColor) {
	var grid = document.getElementById("ppPostGrid");
	var emptyMsg = document.getElementById("ppEmpty");
	if (posts.length === 0) {
		emptyMsg.hidden = false;
		return;
	}
	emptyMsg.hidden = true;
	posts.forEach(function(p, idx) {
		var images = (typeof getPostImages === "function") ? getPostImages(p) : (p.images && p.images.length ? p.images : [p.img]);
		var el = document.createElement("div");
		el.className = "ppost";
		el.innerHTML =
			'<img src="' + images[0] + '" alt=""/>' +
			(images.length > 1 ? '<i class="fas fa-clone ppostmulti" title="' + t("common.photoCount").replace("{n}", images.length) + '"></i>' : "") +
			'<div class="ppostcap">' + escapeHtml(p.caption || "") + "</div>";
		el.addEventListener("click", function() {
			openPostView({ id: p.id || (ppUid + "-post" + idx), images: images, caption: p.caption, posterName: posterName, posterColor: posterColor });
		});
		grid.appendChild(el);
	});
}

if (ppIsBuShop) {
	var buId = ppUid.slice("bu-".length);
	var buShop = หาเพจร้านBUจากId(buId);
	if (!buShop) {
		document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
	} else {
		document.title = buShop.name + " - ChimChim";
		var ppAvatarBu = document.getElementById("ppAvatar");
		ppAvatarBu.textContent = "";
		ppAvatarBu.style.background = "var(--cream2) center/cover no-repeat url('" + buShop.avatar + "')";
		document.getElementById("ppName").textContent = buShop.name;
		document.getElementById("ppSub").textContent = catEmoji(buShop.cat) + " " + catLabel(buShop.cat);
		document.getElementById("ppLevel").textContent = t("publicprofile.buShopLevel");
		document.getElementById("ppBio").textContent = buShop.bio || "";

		var followBtnBu = document.getElementById("ppFollowBtn");
		function refreshFollowBu() {
			var followed = isUserFollowed(ppUid);
			followBtnBu.innerHTML = followed ? '<i class="fas fa-check"></i><span>' + t("common.following") + '</span>' : '<i class="fas fa-user-plus"></i><span>' + t("common.follow") + '</span>';
		}
		refreshFollowBu();
		followBtnBu.addEventListener("click", function() {
			toggleFollowUser(ppUid);
			refreshFollowBu();
		});

		var mapBtn = document.createElement("a");
		var mapQuery = buShop.name + " ใกล้ มหาวิทยาลัยกรุงเทพ";
		mapBtn.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery);
		mapBtn.target = "_blank";
		mapBtn.rel = "noopener";
		mapBtn.className = "rdghost";
		mapBtn.style.cssText = "width:100%;margin-top:8px;";
		mapBtn.innerHTML = '<i class="fas fa-location-dot me-1"></i><span>' + t("publicprofile.mapBtn") + '</span>';
		followBtnBu.insertAdjacentElement("afterend", mapBtn);

		ppRenderPosts(buShop.posts, buShop.name, "linear-gradient(135deg, var(--primary), var(--secondary))");
	}
} else if (ppIsPage) {
	var pageId = ppUid.slice("page-".length);
	var page = getPageById(pageId);
	if (!page) {
		document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
	} else {
		document.title = page.name + " - ChimChim";
		var ppAvatarEl = document.getElementById("ppAvatar");
		ppAvatarEl.textContent = "";
		ppAvatarEl.style.background = "var(--cream2) center/cover no-repeat url('" + page.avatar + "')";
		document.getElementById("ppName").textContent = page.name;
		document.getElementById("ppSub").textContent = catEmoji(page.cat) + " " + catLabel(page.cat);
		document.getElementById("ppLevel").textContent = t("publicprofile.pageLevel");
		document.getElementById("ppBio").textContent = page.bio || "";

		var followBtnPage = document.getElementById("ppFollowBtn");
		if (ppSession && ppSession.id === page.ownerId) {
			followBtnPage.innerHTML = '<i class="fas fa-gear"></i><span>' + t("settings.title") + "</span>";
			followBtnPage.onclick = function() { window.location.href = "settings.html"; };
		} else {
			(function() {
				function refreshFollowPage() {
					var followed = isUserFollowed(page.id);
					followBtnPage.innerHTML = followed ? '<i class="fas fa-check"></i><span>' + t("common.following") + '</span>' : '<i class="fas fa-user-plus"></i><span>' + t("common.follow") + '</span>';
				}
				refreshFollowPage();
				followBtnPage.addEventListener("click", function() {
					toggleFollowUser(page.id);
					refreshFollowPage();
				});
			})();
		}

		ppRenderPosts(getPostsByPage(page.id), page.name, "var(--cream2)");
	}
} else if (ppIsSeed) {
	var creator = หานักรีวิวจากId(ppUid);
	if (!creator) {
		document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
	} else {
		document.title = creator.ชื่อ + " - ChimChim";
		document.getElementById("ppAvatar").style.background = creator.สี;
		document.getElementById("ppAvatar").textContent = creator.ชื่อ.charAt(0).toUpperCase();
		document.getElementById("ppName").textContent = creator.ชื่อ;
		document.getElementById("ppSub").textContent = creator.รีวิว + t("publicprofile.reviewsSuffix");
		document.getElementById("ppLevel").textContent = t("publicprofile.foodExplorerLevel") + creator.ระดับ;
		document.getElementById("ppBio").textContent = creator.bio;

		var followBtn = document.getElementById("ppFollowBtn");
		function refreshFollow() {
			var followed = isUserFollowed(ppUid);
			followBtn.innerHTML = followed ? '<i class="fas fa-check"></i><span>' + t("common.following") + '</span>' : '<i class="fas fa-user-plus"></i><span>' + t("common.follow") + '</span>';
		}
		refreshFollow();
		followBtn.addEventListener("click", function() {
			toggleFollowUser(ppUid);
			refreshFollow();
		});

		ppRenderPosts(creator.โพสต์.map(function(p) { return { img: p.รูป, caption: p.แคปชั่น }; }), creator.ชื่อ, creator.สี);
	}
} else {
	var users = getUsers();
	var user = users.filter(function(u) { return u.id === ppUid; })[0];
	if (!user) {
		document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
	} else {
		document.title = user.name + " - ChimChim";
		document.getElementById("ppAvatar").textContent = user.name.charAt(0).toUpperCase();
		document.getElementById("ppName").textContent = user.name;
		document.getElementById("ppSub").textContent = t("publicprofile.chimchimUser");
		document.getElementById("ppLevel").textContent = "🧑‍🎓 " + t("common.chimchimFoodie");
		document.getElementById("ppBio").textContent = t("publicprofile.defaultBio");

		var followBtn2 = document.getElementById("ppFollowBtn");
		if (ppSession && ppSession.id === user.id) {
			followBtn2.hidden = true;
		} else {
			(function() {
				function refreshFollow2() {
					var followed = isUserFollowed(user.id);
					followBtn2.innerHTML = followed ? '<i class="fas fa-check"></i><span>' + t("common.following") + '</span>' : '<i class="fas fa-user-plus"></i><span>' + t("common.follow") + '</span>';
				}
				refreshFollow2();
				followBtn2.addEventListener("click", function() {
					toggleFollowUser(user.id);
					refreshFollow2();
				});
			})();
		}

		ppRenderPosts(getPostsByUser(user.id), user.name, "linear-gradient(135deg, var(--dark), #7d6fb0)");
	}
}
