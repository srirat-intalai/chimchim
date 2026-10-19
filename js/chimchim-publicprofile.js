// chimchim-publicprofile.js
// หน้าโปรไฟล์สาธารณะ (public-profile.html) — อ่าน ?u= จาก URL
// รองรับร้านตั้งต้น (bu-…), เพจร้านของผู้ใช้ (page-…) และสมาชิกที่สมัครจริง

var ppParams = new URLSearchParams(window.location.search);
var ppUid = ppParams.get("u");
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
	// id โพสต์ผูกกับลำดับเดิม (ไลก์/คอมเมนต์อ้าง id นี้) — ติด id ก่อน แล้วค่อยเรียงใหม่สุดขึ้นก่อน
	posts = posts.map(function(p, idx) {
		return Object.assign({}, p, { id: p.id || (ppUid + "-post" + idx), _order: idx });
	}).sort(function(a, b) {
		var ta = a.date ? new Date(a.date).getTime() : (typeof a.daysAgo === "number" ? -a.daysAgo : null);
		var tb = b.date ? new Date(b.date).getTime() : (typeof b.daysAgo === "number" ? -b.daysAgo : null);
		if (ta === null || tb === null || ta === tb) return a._order - b._order;
		return tb - ta;
	});
	posts.forEach(function(p, idx) {
		var images = (typeof getPostImages === "function") ? getPostImages(p) : (p.images && p.images.length ? p.images : [p.img]);
		var el = document.createElement("div");
		el.className = "ppost card-enter";
		el.innerHTML =
			postCoverHtml(images, p.caption) +
			(images.length > 1 ? '<i class="fas fa-clone ppostmulti" title="' + t("common.photoCount").replace("{n}", images.length) + '"></i>' : "") +
			(images.length ? '<div class="ppostcap">' + escapeHtml(p.caption || "") + "</div>" : "");
		el.addEventListener("click", function() {
			openPostView({ id: p.id, images: images, caption: p.caption, posterName: posterName, posterColor: posterColor, posterId: p.userId || null });
		});
		grid.appendChild(el);
	});
}

/* --- ตัวเลขแบบ IG ใต้หัวโปรไฟล์ — โพสต์ · ผู้ติดตาม · (กำลังติดตาม สำหรับนักชิม / รีวิว สำหรับร้าน)
   ผู้ติดตาม: นับจริงจาก Supabase (ตาราง follows) + รวมการกดติดตามของเราที่ยังค้างส่ง แล้วขยับทันทีเมื่อกดปุ่มติดตาม
   opts: { posts, followId, followerOf (uuid ของคนนี้ ถ้าเป็นนักชิมจริง), shopId (ถ้าเป็นร้าน) } --- */
function ppSetStats(opts) {
	var postsEl = document.getElementById("ppStatPosts");
	var followersEl = document.getElementById("ppStatFollowers");
	var thirdEl = document.getElementById("ppStatThird");
	var thirdLbl = document.getElementById("ppStatThirdLbl");
	if (!postsEl) return;
	postsEl.textContent = formatLikeCount(opts.posts || 0);

	// ผู้ติดตาม
	var followers = isUserFollowed(opts.followId) ? 1 : 0; // ยังไม่ได้ยอดจริง อย่างน้อยนับเราเอง
	function showFollowers() { followersEl.textContent = formatLikeCount(Math.max(0, followers)); }
	showFollowers();
	if (typeof sbCountRows === "function") {
		sbCountRows("follows", { target_type: "profile", target_id: String(opts.followId) }).then(function(n) {
			if (n === null) return;
			followers = typeof ยอดรวมที่ค้างส่ง === "function" ? ยอดรวมที่ค้างส่ง("follow:profile", opts.followId, n) : n;
			showFollowers();
		});
	}
	// กดติดตาม/เลิกติดตาม → ขยับเลขทันที (ปุ่มนี้ตั้ง handler ของมันเองไว้ก่อนแล้ว อันนี้รันต่อจากนั้น)
	var lastFollowed = isUserFollowed(opts.followId);
	var followBtn = document.getElementById("ppFollowBtn");
	if (followBtn) {
		followBtn.addEventListener("click", function() {
			var now = isUserFollowed(opts.followId);
			if (now === lastFollowed) return; // ไม่ได้ติดตามจริง (เช่น ยังไม่ล็อกอิน / ปุ่มไปหน้าตั้งค่า)
			followers += now ? 1 : -1;
			lastFollowed = now;
			showFollowers();
		});
	}

	// ช่องที่ 3: ร้าน = จำนวนรีวิว / นักชิม = กำลังติดตาม
	if (opts.shopId) {
		thirdLbl.setAttribute("data-i18n", "profile.statReviews");
		thirdLbl.textContent = t("profile.statReviews");
		var localReviews = getReviews(opts.shopId).length;
		thirdEl.textContent = formatLikeCount(localReviews);
		if (typeof sbCountRows === "function") {
			sbCountRows("reviews", { shop_id: opts.shopId }).then(function(n) {
				if (n !== null) thirdEl.textContent = formatLikeCount(Math.max(n, localReviews));
			});
		}
	} else {
		thirdEl.textContent = "0";
		if (opts.followerOf && typeof sbCountRows === "function") {
			sbCountRows("follows", { follower_id: opts.followerOf }).then(function(n) {
				if (n !== null) thirdEl.textContent = formatLikeCount(n);
			});
		}
	}
}

/* =====================================================================
   โปรไฟล์ร้านค้า: แท็บ โพสต์ (ตารางเดิม) / รีวิว (รีวิวจริงของร้านนี้เท่านั้น ผูกด้วย shopId)
   ใช้รีวิวในเครื่อง + ดึงของจริงจาก Supabase มารวม (กันซ้ำด้วย mergeRemoteReviewsIntoLocal ของเดิม)
   สลับแท็บแค่ซ่อน/แสดง ไม่โหลดใหม่ ทุกการวาดผูกกับ shopId ของหน้านี้ จึงไม่มีทางได้ข้อมูลร้านอื่น
   ===================================================================== */
var ppReviewerAvatars = {}; // userId → url รูปโปรไฟล์ (ดึงจาก profiles ของ Supabase / ผู้ใช้ในเครื่อง)
function ppShowShopTab(tab) {
	var isReviews = tab === "reviews";
	document.getElementById("ppPostsCard").hidden = isReviews;
	document.getElementById("ppReviewsPane").hidden = !isReviews;
	document.querySelectorAll("#ppShopTabs .proftab").forEach(function(b) {
		var on = b.getAttribute("data-pptab") === tab;
		b.classList.toggle("active", on);
		b.setAttribute("aria-selected", on ? "true" : "false");
		b.tabIndex = on ? 0 : -1;
	});
}
function ppFormatDate(iso) {
	var d = new Date(iso);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleDateString(getLang() === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function ppBuildReviewRow(r) {
	var row = document.createElement("article");
	row.className = "ppreview";
	var avg = Math.round((r.taste + r.atmosphere + r.service) / 3 * 10) / 10;
	var name = r.author || t("common.anonymousFoodie");
	var local = r.userId ? getUsers().filter(function(u) { return u.id === r.userId; })[0] : null;
	var avatarUrl = ppReviewerAvatars[r.userId] || (local && local.avatar) || null;
	var images = Array.isArray(r.images) ? r.images.filter(Boolean) : [];
	// ผู้รีวิวที่มีบัญชีจริง กดชื่อ/รูปไปหน้าโปรไฟล์ของเขาได้ (รีวิวแบบไม่ล็อกอินไม่มีหน้าโปรไฟล์)
	var href = r.userId ? "public-profile.html?u=" + encodeURIComponent(r.userId) : null;
	var avatarHtml = '<span class="ppreview-avt"' + (avatarUrl ? ' style="background-image:url(\'' + cssUrl(avatarUrl) + '\')"' : "") + ">" + (avatarUrl ? "" : escapeHtml(name.charAt(0).toUpperCase())) + "</span>";
	row.innerHTML =
		'<header class="ppreview-head">' +
			(href ? '<a class="ppreview-who" href="' + href + '">' : '<span class="ppreview-who">') +
				avatarHtml +
				'<span class="ppreview-meta"><b>' + escapeHtml(name) + "</b><time datetime=\"" + escapeHtml(r.date || "") + "\">" + escapeHtml(ppFormatDate(r.date)) + "</time></span>" +
			(href ? "</a>" : "</span>") +
			'<span class="ppreview-score" title="' + escapeHtml(t("restaurant.avgScoreSuffix").replace(/^\//, "")) + '"><i class="fas fa-star"></i> ' + avg + "</span>" +
		"</header>" +
		'<div class="ppreview-sub">' +
			"<span>" + escapeHtml(t("review.taste")) + " " + r.taste + "</span>" +
			"<span>" + escapeHtml(t("review.atmosphere")) + " " + r.atmosphere + "</span>" +
			"<span>" + escapeHtml(t("review.service")) + " " + r.service + "</span>" +
		"</div>" +
		(r.text ? '<p class="ppreview-txt">' + escapeHtml(r.text) + "</p>" : "") +
		(images.length ? '<div class="rdreviewimgs">' + images.map(function(src, i) {
			return '<button type="button" class="rdreviewimg" data-idx="' + i + '" aria-label="' + escapeHtml(t("photos.openN").replace("{i}", i + 1).replace("{n}", images.length)) + '"><img src="' + safeImgSrc(src) + '" alt="" loading="lazy"/></button>';
		}).join("") + "</div>" : "");
	row.querySelectorAll(".rdreviewimg").forEach(function(btn) {
		btn.addEventListener("click", function() { openPhotoViewer(images, parseInt(btn.getAttribute("data-idx"), 10)); });
	});
	return row;
}
function ppRenderShopReviews(shopId, loading) {
	var list = document.getElementById("ppReviewList");
	var reviews = getReviews(shopId).slice().sort(function(a, b) {
		return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
	});
	list.innerHTML = "";
	reviews.forEach(function(r) { list.appendChild(ppBuildReviewRow(r)); });
	document.getElementById("ppReviewsLoading").hidden = !(loading && !reviews.length);
	document.getElementById("ppReviewsEmpty").hidden = !!(reviews.length || loading);
	return reviews;
}
function ppSetupShopTabs(shopId) {
	var bar = document.getElementById("ppShopTabs");
	if (!bar) return;
	bar.hidden = false;
	document.getElementById("ppPostsTit").hidden = true; // ไอคอนแท็บบอกแล้วว่าเป็นโพสต์
	var tabs = Array.prototype.slice.call(bar.querySelectorAll(".proftab"));
	tabs.forEach(function(b, i) {
		b.addEventListener("click", function() { ppShowShopTab(b.getAttribute("data-pptab")); });
		b.addEventListener("keydown", function(e) {
			if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
			e.preventDefault();
			var next = tabs[(i + 1) % tabs.length];
			next.focus();
			ppShowShopTab(next.getAttribute("data-pptab"));
		});
	});
	if (!shopId) { // เพจร้านที่ยังไม่ผูกกับร้านในระบบ — ยังไม่มีรีวิวที่ผูกได้
		ppRenderShopReviews(null, false);
		return;
	}
	var hasRemote = typeof sbClient !== "undefined" && !!sbClient;
	ppRenderShopReviews(shopId, hasRemote);
	if (!hasRemote) return;
	Promise.resolve(sbClient.from("reviews").select("*").eq("shop_id", shopId).order("created_at", { ascending: false })).then(function(res) {
		if (res.error || !res.data) return;
		if (res.data.length) mergeRemoteReviewsIntoLocal(shopId, res.data.map(sbReviewRowToLocal));
		var ids = res.data.map(function(row) { return row.user_id; }).filter(function(id, i, a) { return id && a.indexOf(id) === i; });
		if (!ids.length) return;
		return Promise.resolve(sbClient.from("profiles").select("id, avatar_url").in("id", ids)).then(function(p) {
			(p && p.data || []).forEach(function(x) { if (x.avatar_url) ppReviewerAvatars[x.id] = x.avatar_url; });
		});
	}).catch(function() {}).then(function() {
		ppRenderShopReviews(shopId, false);
	});
}

/* --- Food DNA ของผู้ใช้ (สาธารณะ — ทุกคนเห็นได้) ใช้รูปแบบข้อมูลเดียวกับ profiles.food_dna / user.foodDNA
   ถ้าผู้ชมมี Food DNA ของตัวเองด้วย โชว์ว่ารสนิยมตรงกันกี่ % (สูตรเดียวกับหน้าติดตาม) --- */
function ppRenderFoodDna(dna, isMe) {
	var box = document.getElementById("ppDna");
	if (!box) return;
	var list = function(v) { return Array.isArray(v) ? v.filter(Boolean) : []; };
	var rows = [];
	function chips(label, values) {
		if (!values.length) return;
		rows.push('<div class="ppdna-row"><span class="ppdna-lbl">' + escapeHtml(label) + '</span><span class="ppdna-chips">' +
			values.slice(0, 8).map(function(v) { return '<span class="ppdna-chip">' + escapeHtml(catLabel(v)) + "</span>"; }).join("") + "</span></div>");
	}
	if (dna) {
		chips(t("dna.category"), list(dna.ชอบหมวด));
		chips(t("dna.cuisine"), list(dna.ชอบชาติอาหาร));
		chips(t("dna.flavor"), list(dna.ชอบรส));
		var budget = Number(dna.งบเฉลี่ยที่ใช้บ่อย);
		var dist = Number(dna.ระยะที่ยอมไป);
		var stats = [];
		if (budget > 0) stats.push('<span><i class="fas fa-wallet"></i> ' + escapeHtml(t("dna.budget")) + " <b>฿" + Math.round(budget) + "</b></span>");
		if (dist > 0) stats.push('<span><i class="fas fa-location-dot"></i> ' + escapeHtml(t("dna.distance")) + " <b>" + escapeHtml(distanceText(Math.round(dist))) + "</b></span>");
		if (stats.length) rows.push('<div class="ppdna-stats">' + stats.join("") + "</div>");
	}
	box.hidden = !rows.length;
	if (!rows.length) return;
	document.getElementById("ppDnaRows").innerHTML = rows.join("");
	var matchEl = document.getElementById("ppDnaMatch");
	var meUser = typeof getMe === "function" ? getMe() : null;
	if (!isMe && meUser && meUser.foodDNA && typeof คำนวณความชอบคล้ายกัน === "function") {
		matchEl.textContent = t("publicprofile.dnaMatch").replace("{n}", คำนวณความชอบคล้ายกัน(meUser.foodDNA, dna));
		matchEl.hidden = false;
	} else {
		matchEl.hidden = true;
	}
}
// ดึง Food DNA ล่าสุดจาก Supabase (คนที่ไม่เคยเห็นในเครื่องนี้ หรืออัปเดตจากเครื่องอื่น)
function ppLoadFoodDna(userId, localDna) {
	var isMe = !!(ppSession && ppSession.id === userId);
	ppRenderFoodDna(localDna || null, isMe);
	if (typeof sbClient === "undefined" || !sbClient || !/^[0-9a-f-]{36}$/i.test(userId)) return;
	Promise.resolve(sbClient.from("profiles").select("food_dna").eq("id", userId).single()).then(function(res) {
		if (!res.error && res.data && res.data.food_dna && ppUid === userId) ppRenderFoodDna(res.data.food_dna, isMe);
	}).catch(function() {});
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
		ppAvatarBu.style.background = "var(--cream2) center/cover no-repeat url('" + cssUrl(buShop.avatar) + "')";
		document.getElementById("ppName").textContent = buShop.name;
		document.getElementById("ppSub").innerHTML = catEmoji(buShop.cat) + " " + escapeHtml(catLabel(buShop.cat));
		document.getElementById("ppLevel").innerHTML = '<i class="fas fa-store"></i> ' + escapeHtml(t("publicprofile.buShopLevel"));
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

		ppRenderPosts(buShop.posts, buShop.name, "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))");
		ppSetStats({ posts: buShop.posts.length, followId: ppUid, shopId: buShop.menuId });
		ppSetupShopTabs(buShop.menuId);
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
		ppAvatarEl.style.background = "var(--cream2) center/cover no-repeat url('" + cssUrl(page.avatar) + "')";
		document.getElementById("ppName").textContent = page.name;
		document.getElementById("ppSub").innerHTML = catEmoji(page.cat) + " " + escapeHtml(catLabel(page.cat));
		document.getElementById("ppLevel").innerHTML = '<i class="fas fa-store"></i> ' + escapeHtml(t("publicprofile.pageLevel"));
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
		ppSetStats({ posts: getPostsByPage(page.id).length, followId: page.id, shopId: page.numId || null });
		ppSetupShopTabs(page.numId || null);
	}
} else {
	var users = getUsers();
	var user = users.filter(function(u) { return u.id === ppUid; })[0];
	function renderRealUserProfile(user) {
		document.title = user.name + " - ChimChim";
		var ppAvatarReal = document.getElementById("ppAvatar");
		if (user.avatar) {
			ppAvatarReal.style.background = "var(--cream2) center/cover no-repeat url('" + cssUrl(user.avatar) + "')";
			ppAvatarReal.textContent = "";
		} else {
			ppAvatarReal.textContent = user.name.charAt(0).toUpperCase();
		}
		document.getElementById("ppName").textContent = user.name;
		document.getElementById("ppSub").textContent = t("publicprofile.chimchimUser");
		document.getElementById("ppLevel").innerHTML = '<i class="fas fa-graduation-cap"></i> ' + escapeHtml(t("common.chimchimFoodie"));
		document.getElementById("ppBio").textContent = user.bio || t("publicprofile.defaultBio");

		var followBtn2 = document.getElementById("ppFollowBtn");
		if (ppSession && ppSession.id === user.id) {
			followBtn2.hidden = true;
		} else {
			followBtn2.hidden = false;
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
				if (typeof syncLikesAndFollowsWithSupabase === "function") syncLikesAndFollowsWithSupabase(refreshFollow2);
			})();
		}

		ppLoadFoodDna(user.id, user.foodDNA || null);
		ppRenderPosts(getPostsByUser(user.id), user.name, "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))");
		ppSetStats({ posts: getPostsByUser(user.id).length, followId: user.id, followerOf: /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null });
	}
	if (user) {
		renderRealUserProfile(user);
	} else if (sbClient) {
		// ยังไม่เคยเห็นผู้ใช้นี้ในเครื่องนี้เลย (เช่น เปิดลิงก์โปรไฟล์คนอื่นข้ามอุปกรณ์ครั้งแรก) — โชว์โครง skeleton
		// รอไว้ก่อนแทนที่จะให้เห็นการ์ดว่าง ๆ แวบหนึ่ง แล้วลองถาม Supabase จริง
		document.getElementById("ppContent").hidden = true;
		document.getElementById("ppSkeleton").hidden = false;
		sbClient.from("profiles").select("id, name, bio, avatar_url").eq("id", ppUid).single().then(function(res) {
			document.getElementById("ppSkeleton").hidden = true;
			document.getElementById("ppContent").hidden = false;
			if (res.error || !res.data) {
				document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
				return;
			}
			renderRealUserProfile({ id: res.data.id, name: res.data.name, bio: res.data.bio, avatar: res.data.avatar_url });
		}).catch(function() {
			document.getElementById("ppSkeleton").hidden = true;
			document.getElementById("ppContent").hidden = false;
			document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
		});
	} else {
		document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
	}
}
