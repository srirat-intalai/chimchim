// chimchim-profile.js
// หน้าโปรไฟล์ (profile.html) — โชว์ข้อมูลบัญชี, Food DNA, ร้านที่ Follow, ร้านของฉัน (บัญชีร้านค้า)

var session = getSession();
// โปรไฟล์ที่หน้านี้กำลังแสดง (ตรวจสิทธิ์แล้ว) — ตัวกำหนดว่าโพสต์ใหม่จะโพสต์ในนามใคร
// key: "self" หรือ numId ร้าน (รูปแบบเดียวกับ getActivePersona) / ตั้งครั้งเดียวต่อการโหลดหน้า ไม่เปลี่ยนกลางทาง
var profPage = { type: "self", shop: null, key: "self" };
var profBootSeq = 0;
// ?created=1 = เพิ่งสร้างโปรไฟล์ร้านสำเร็จ (อ่านเก็บไว้ก่อน — bootProfile แก้ URL ให้ตรงกับโปรไฟล์ที่แสดง)
var profJustCreated = new URLSearchParams(window.location.search).get("created") === "1";

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
	// มาจาก "+ เพิ่มโปรไฟล์ → บัญชีส่วนตัว" (ออกจากบัญชีเดิมแล้ว) — เปิดหน้าสมัครให้เลย
	if (new URLSearchParams(window.location.search).get("auth") === "register") openAuthPop("register");
} else {
	bootProfile();
}
// เพิ่งสร้างโปรไฟล์ร้านค้า → แจ้งเมื่อหน้าโปรไฟล์ร้านเปิดได้จริงแล้วเท่านั้น (ตรวจสิทธิ์+โหลดจากฐานข้อมูลผ่านแล้ว)
function toastIfJustCreated() {
	if (!profJustCreated) return;
	profJustCreated = false;
	if (profPage.type === "shop") showToast(t("shop.createdToast").replace("{name}", profPage.shop.name));
}

/* =====================================================================
   เริ่มหน้าโปรไฟล์ตามโปรไฟล์ที่ใช้งานอยู่ (สลับโปรไฟล์แบบ IG)
   ?as=self | ?as=shop:<id> = เปิดโปรไฟล์นั้นตรง ๆ (ลิงก์/เมนูสลับโปรไฟล์) ไม่ส่ง = ใช้โปรไฟล์ที่จำไว้ล่าสุด
   โปรไฟล์ร้าน: ตรวจสิทธิ์กับเซิร์ฟเวอร์ก่อนแสดงทุกครั้ง ระหว่างรอ/ตรวจไม่ผ่าน ไม่แสดงข้อมูลโปรไฟล์ใดเลย
   ===================================================================== */
function bootProfile() {
	var asParam = new URLSearchParams(window.location.search).get("as") || "";
	var requested = asParam === "self" ? "self" : (/^shop:\d+$/.test(asParam) ? asParam.slice(5) : null);
	// โปรไฟล์ส่วนตัวใช้ได้เสมอ ไม่ต้องรอตรวจสิทธิ์ร้าน
	if (requested === "self" || (!requested && getActivePersona() === "self")) {
		setActivePersona("self");
		profPage = { type: "self", shop: null, key: "self" };
		renderPersonalProfile();
		watchActiveProfile();
		toastIfJustCreated();
		return;
	}
	showProfState("loading");
	var seq = ++profBootSeq;
	resolveActiveProfile(requested).then(function(res) {
		if (seq !== profBootSeq) return;
		if (res.error) {
			showProfState("error");
			return;
		}
		hideProfState();
		var p = res.profile;
		profPage = p.type === "shop" ? { type: "shop", shop: p.shop, key: String(p.shop.numId) } : { type: "self", shop: null, key: "self" };
		// URL ให้ตรงกับโปรไฟล์ที่แสดงจริง (ไม่ค้าง id ร้านที่ไม่มีสิทธิ์ไว้ในแถบที่อยู่)
		if (window.history && history.replaceState) {
			history.replaceState(null, "", "profile.html?as=" + (profPage.type === "self" ? "self" : "shop:" + profPage.key));
		}
		if (profPage.type === "shop") renderShopProfile(profPage.shop);
		else renderPersonalProfile();
		if (res.notice) showToast(t(res.notice === "shop_forbidden" ? "switcher.forbidden" : "switcher.unavailable"));
		watchActiveProfile();
		toastIfJustCreated();
	});
}
function showProfState(kind) {
	document.getElementById("profContent").hidden = true;
	var box = document.getElementById("profStateBox");
	box.hidden = false;
	var msg = document.getElementById("profStateMsg");
	msg.innerHTML = kind === "loading" ? '<i class="fas fa-spinner fa-spin"></i> ' : "";
	msg.appendChild(document.createTextNode(t(kind === "loading" ? "profile.loadingProfile" : "profile.profileLoadFailed")));
	document.getElementById("profStateBtns").hidden = kind === "loading";
}
function hideProfState() {
	document.getElementById("profStateBox").hidden = true;
}
(function() {
	var retry = document.getElementById("profStateRetry");
	if (retry) retry.addEventListener("click", bootProfile);
	var useSelf = document.getElementById("profStateSelf");
	if (useSelf) useSelf.addEventListener("click", function() {
		setActivePersona("self");
		window.location.href = "profile.html?as=self";
	});
})();
// มีหน้าต่าง/แท็บอื่นสลับโปรไฟล์ → หน้านี้ยังแสดงโปรไฟล์เดิม แจ้งให้โหลดใหม่ และฟอร์มโพสต์จะไม่ยอมส่ง (ดู submit)
var profWatching = false;
function watchActiveProfile() {
	if (profWatching) return;
	profWatching = true;
	window.addEventListener("storage", function(e) {
		if (e.key !== CHIMCHIM_ACTIVE_PERSONA_KEY || getActivePersona() === profPage.key) return;
		if (document.getElementById("profStaleBar")) return;
		var bar = document.createElement("div");
		bar.className = "profstalebar";
		bar.id = "profStaleBar";
		bar.setAttribute("role", "alert");
		bar.innerHTML = '<i class="fas fa-triangle-exclamation"></i><span></span><button type="button"></button>';
		bar.querySelector("span").textContent = t("profile.profileChangedElsewhere");
		bar.querySelector("button").textContent = t("profile.reload");
		bar.querySelector("button").addEventListener("click", function() { window.location.href = "profile.html"; });
		var wrap = document.getElementById("profContent");
		wrap.insertBefore(bar, wrap.firstChild);
	});
}
// เปิดเมนูสลับโปรไฟล์ — ถ้ามีโพสต์ที่กำลังเขียนค้างอยู่ ถามก่อนทิ้ง (กันโพสต์ไปผิดบัญชีหลังสลับ)
function openProfileSwitcherFromProfile(extra) {
	openProfileSwitcher({
		highlight: extra && extra.highlight,
		beforeSwitch: function() {
			if (!hasPostDraft()) return Promise.resolve(true);
			return showConfirmDialog({ title: t("switcher.discardTitle"), message: t("switcher.discardMsg"), confirmText: t("switcher.discardBtn") });
		}
	});
}
function hasPostDraft() {
	var form = document.getElementById("postForm");
	if (!form || form.style.display === "none") return false;
	return !!(document.getElementById("postCaption").value.trim() || document.querySelectorAll("#postImgList .postimgthumb").length);
}
function wireSwitcherButtons() {
	["profSwitchBtn", "profAvatar", "postingAsRow"].forEach(function(id) {
		var el = document.getElementById(id);
		if (el && !el.__switchWired) {
			el.__switchWired = true;
			el.addEventListener("click", openProfileSwitcherFromProfile);
		}
	});
}

/* =====================================================================
   โปรไฟล์ร้าน — ข้อมูลจากแถวร้านที่ตรวจสิทธิ์แล้ว (เจ้าของจริงเท่านั้น), โพสต์ของร้าน, รีวิวจากลูกค้า
   ซ่อนส่วนของโปรไฟล์ส่วนตัวทั้งหมด (อีเมล เลเวล Food DNA ถูกใจ บันทึกไว้ รีวิวของฉัน กำลังติดตาม)
   ===================================================================== */
function renderShopProfile(shop) {
	var key = String(shop.numId);
	document.getElementById("profContent").hidden = false;
	document.body.classList.add("prof-shopmode");
	["profEmail", "profLevelCard", "dnaCardBtn", "selfBtnRow", "ptabLikes", "ptabReviews", "ptabSaves", "igFollowingBtn"].forEach(function(id) {
		var el = document.getElementById(id);
		if (el) el.hidden = true;
	});
	["shopBtnRow", "shopInfoCard", "ptabShopReviews"].forEach(function(id) { document.getElementById(id).hidden = false; });

	var avatarEl = document.getElementById("profAvatar");
	if (shop.img && cssUrl(shop.img)) {
		avatarEl.style.background = "var(--cream2) center/cover no-repeat url('" + cssUrl(shop.img) + "')";
		avatarEl.textContent = "";
	} else {
		avatarEl.style.background = "";
		avatarEl.textContent = (shop.name || "?").charAt(0).toUpperCase();
	}
	document.getElementById("profName").textContent = shop.name;
	document.getElementById("profRole").innerHTML = '<i class="fas fa-store"></i> ' + escapeHtml(t("profile.shopRole") + (shop.cat ? " · " + catLabel(shop.cat) : ""));
	var bioEl = document.getElementById("profBio");
	bioEl.textContent = shop.desc || "";
	bioEl.hidden = !shop.desc;
	document.getElementById("shopPageLink").href = "restaurant.html?id=" + encodeURIComponent(key);

	// ข้อมูลร้านที่มีอยู่จริงเท่านั้น (ช่องไหนว่างไม่แสดง ไม่เติมค่าสมมติ)
	var info = [
		[t("shop.featuredDish"), shop.dish],
		[t("shop.category"), shop.cat ? catLabel(shop.cat) : ""],
		[t("profile.shopPrice"), (shop.priceLow || shop.priceHigh) ? "฿" + (shop.priceLow || 0) + " – ฿" + (shop.priceHigh || 0) : ""],
		[t("shop.hours"), shop.hours],
		[t("shop.promo"), shop.promo],
		[t("shop.nearUni"), shop.uni]
	].filter(function(r) { return r[1]; });
	var dl = document.getElementById("shopInfoList");
	dl.innerHTML = "";
	info.forEach(function(r) {
		var dt = document.createElement("dt");
		dt.textContent = r[0];
		var dd = document.createElement("dd");
		dd.textContent = r[1];
		dl.appendChild(dt);
		dl.appendChild(dd);
	});
	document.getElementById("shopInfoCard").hidden = info.length === 0;

	// ผู้ติดตามร้าน = คนที่กดติดตามร้านนี้ (นับจริงจาก Supabase) — ปุ่มไม่เปิดรายชื่อ (รายชื่อมีเฉพาะโปรไฟล์บุคคล)
	var followersBtn = document.getElementById("igFollowersBtn");
	followersBtn.disabled = true;
	if (typeof sbCountRows === "function") {
		sbCountRows("follows", { target_type: "shop", target_id: key }).then(function(n) {
			if (n === null || profPage.key !== key) return;
			document.getElementById("igStatFollowers").textContent = formatLikeCount(n);
		});
	}

	var postsTitle = document.querySelector("#profPostsCard .profcardtit span");
	postsTitle.setAttribute("data-i18n", "profile.shopPosts");
	postsTitle.textContent = t("profile.shopPosts");
	// รูปมุมขวาบน = โปรไฟล์ที่ใช้งานอยู่ (แคชรายชื่อร้านเพิ่งได้จากการตรวจสิทธิ์ตอนเปิดหน้า)
	if (typeof refreshAuthUI === "function") refreshAuthUI();

	wireSwitcherButtons();
	initMyPosts();
	if (typeof syncPostsWithSupabase === "function") {
		syncPostsWithSupabase(function() { if (profPage.key === key) renderMyPosts(); });
	}
	setupShopTabs(shop);
}
function renderShopReviews(shop) {
	var reviews = getReviews(shop.numId);
	var grid = document.getElementById("profShopReviewsList");
	grid.innerHTML = "";
	reviews.forEach(function(r) {
		var avg = Math.round((r.taste + r.atmosphere + r.service) / 3 * 10) / 10;
		var imgs = r.images || [];
		var score = '<span class="profgtile-score"><i class="fas fa-star" aria-hidden="true"></i>' + avg + "</span>";
		grid.appendChild(profGridTile({
			label: (r.author || "") + " " + avg,
			extraClass: imgs.length ? "" : "is-text",
			html: imgs.length
				? '<img src="' + safeImgSrc(imgs[0]) + '" alt="" loading="lazy"/>' + score + '<span class="profgtile-cap">' + escapeHtml(r.author || "") + "</span>"
				: '<span class="profgtile-text"><b>' + escapeHtml(r.author || "") + '</b><span class="profgtile-quote">' + escapeHtml(r.text || t("restaurant.noReviewText")) + "</span></span>" + score,
			onOpen: function() { window.location.href = "restaurant.html?id=" + encodeURIComponent(shop.numId); }
		}));
	});
	document.getElementById("profShopReviewsEmpty").hidden = reviews.length > 0;
	document.getElementById("ptabCountShopReviews").textContent = reviews.length;
}
function setupShopTabs(shop) {
	var key = String(shop.numId);
	var bar = document.getElementById("profTabs");
	bar.hidden = false;
	bar.querySelectorAll(".proftab").forEach(function(b) {
		b.addEventListener("click", function() { showProfileTab(this.getAttribute("data-ptab")); });
	});
	var savedTab = null;
	try { savedTab = sessionStorage.getItem(profTabKey()); } catch (e) {}
	showProfileTab(savedTab || "posts");
	renderShopReviews(shop);
	if (typeof syncReviewsWithSupabase === "function") {
		syncReviewsWithSupabase(shop.numId, function() { if (profPage.key === key) renderShopReviews(shop); });
	}
}

function renderPersonalProfile() {
	document.getElementById("profContent").hidden = false;
	wireSwitcherButtons();

	var me = getMe() || session;
	function refreshProfileHeader(u) {
		var avatarEl = document.getElementById("profAvatar");
		if (u.avatar) {
			avatarEl.style.background = "var(--cream2) center/cover no-repeat url('" + cssUrl(u.avatar) + "')";
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
	refreshLevelCard();

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

	// กำลังติดตาม = นักชิม/เพจร้านที่ติดตาม + ร้านที่ติดตาม (เดิมนับแค่คน ร้านไม่ถูกนับ)
	function refreshFollowingStat() {
		var n = getFollowedUsers().length + getFollowedShops().length;
		document.getElementById("igStatFollowing").textContent = n;
		var c = document.getElementById("fsCountFollowing");
		if (c) c.textContent = n;
		refreshLevelCard(); // ติดตาม/เลิกติดตาม = XP เปลี่ยน
	}
	refreshFollowingStat();
	// ผู้ติดตาม = คนที่กดติดตามเรา นับจริงจาก Supabase (ไม่มีเน็ต/ยังไม่ต่อ Supabase → คง 0 ไว้)
	if (typeof sbCountRows === "function") {
		sbCountRows("follows", { target_type: "profile", target_id: me.id }).then(function(n) {
			if (n === null) return;
			document.getElementById("igStatFollowers").textContent = formatLikeCount(n);
			document.getElementById("fsCountFollowers").textContent = n;
		});
	}
	setupFollowSheet(me, refreshFollowingStat);

	// ดึงโปรไฟล์ (ชื่อ/bio/รูป/Food DNA)/โพสต์/ไลก์/ติดตามจริงจาก Supabase มาผสาน เผื่อทำไว้จากเครื่องอื่น (progressive enhancement)
	if (typeof syncMyProfileWithSupabase === "function") {
		syncMyProfileWithSupabase(function() {
			refreshProfileHeader(getMe());
			refreshDnaCard(getMe());
		});
	}
	if (typeof syncLikesAndFollowsWithSupabase === "function") {
		// ผลเดียวกันใช้ทั้งตัวเลขติดตาม และแท็บร้านที่ถูกใจ (ไม่ยิงซ้ำสองรอบ)
		syncLikesAndFollowsWithSupabase(function() { refreshFollowingStat(); renderProfileActivity(); });
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

	/* --- โพสต์ของฉัน (ทุกบัญชี) — เป็นแท็บแรกของแถบกิจกรรม --- */
	initMyPosts();
	setupProfileTabs(me);
}

/* --- โพสต์ของฉัน: ฟอร์มเพิ่มโพสต์ + แสดงกริดโพสต์ ---
   (เวอร์ชันย่อของฟีเจอร์คอมมูนิตี้ - ภาพ + แคปชั่นเท่านั้น ยังไม่รองรับสตอรี่/รีล/วิดีโอ) */
var POST_MAX_IMAGES = CHIMCHIM_MAX_IMAGES; // 10 รูปต่อโพสต์ (ค่ากลางใน core.js)
function initMyPosts() {
	var toggle = document.getElementById("addPostToggle");
	var form = document.getElementById("postForm");
	var listBox = document.getElementById("postImgList");
	var submitBtn = document.getElementById("postSubmitBtn");
	var chosenImages = [];
	var editingPostId = null; // null = กำลังสร้างโพสต์ใหม่, มีค่า = กำลังแก้ไขโพสต์เดิม

	var uploadBox = document.getElementById("postImgUploadBox");
	var countEl = document.getElementById("postImgCount");
	function renderChosenImages() {
		listBox.innerHTML = "";
		chosenImages.forEach(function(src, idx) {
			var thumb = document.createElement("div");
			thumb.className = "postimgthumb" + (idx === 0 ? " iscover" : "");
			thumb.innerHTML = '<img src="' + safeImgSrc(src) + '" alt=""/>' +
				(idx === 0 ? '<span class="postimgcover">' + t("profile.coverPhoto") + '</span>' : "") +
				'<button type="button" title="' + t("common.removePhoto") + '"><i class="fas fa-times"></i></button>';
			thumb.querySelector("button").addEventListener("click", function(e) {
				e.stopPropagation();
				chosenImages.splice(idx, 1);
				renderChosenImages();
			});
			// แตะรูปไหนก็ได้ = ตั้งเป็นรูปปก (ย้ายไปไว้รูปแรก ซึ่งเป็นรูปที่โชว์ในกริดโปรไฟล์/ฟีดก่อน)
			if (idx > 0) {
				thumb.title = t("profile.setAsCover");
				thumb.addEventListener("click", function() {
					chosenImages.unshift(chosenImages.splice(idx, 1)[0]);
					renderChosenImages();
				});
			}
			listBox.appendChild(thumb);
		});
		// ช่อง "+ เพิ่มรูป" ต่อท้ายตาราง แทนกล่องอัปโหลดใหญ่ (กล่องใหญ่โชว์เฉพาะตอนยังไม่มีรูปเลย)
		if (chosenImages.length && chosenImages.length < POST_MAX_IMAGES) {
			var addTile = document.createElement("label");
			addTile.className = "postimgadd";
			addTile.setAttribute("for", "postImgFile");
			addTile.innerHTML = '<i class="fas fa-plus"></i><span>' + t("profile.addMorePhotos") + "</span>";
			listBox.appendChild(addTile);
		}
		uploadBox.hidden = chosenImages.length > 0;
		countEl.hidden = chosenImages.length === 0;
		countEl.textContent = t("photos.count").replace("{n}", chosenImages.length).replace("{max}", POST_MAX_IMAGES);
		countEl.classList.toggle("full", chosenImages.length >= POST_MAX_IMAGES);
		document.getElementById("postImgFile").disabled = chosenImages.length >= POST_MAX_IMAGES;
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
			if (chosenImages.length < POST_MAX_IMAGES) chosenImages.push(dataUrl);
		});
		renderChosenImages();
		// บนมือถือ พอเลือกรูปแล้วฟอร์มจะยาวขึ้นเยอะ ปุ่มโพสต์อาจตกขอบจอไปโดยไม่รู้ตัวว่าต้องเลื่อนลงไปกด
		// เลื่อนจอให้เห็นปุ่มเองเลย กันปัญหา "กดปุ่มไม่ติด" ทั้งที่จริง ๆ แค่มองไม่เห็นปุ่ม
		setTimeout(function() {
			submitBtn.scrollIntoView({ behavior: "smooth", block: "end" });
		}, 100);
	}, {
		// เกิน 10 รูป: ไฟล์ส่วนเกินไม่ถูกอ่านเลย + แจ้งเตือนว่าตัดไปกี่รูป (ดู แจ้งปัญหาการเลือกรูป)
		remaining: function() { return POST_MAX_IMAGES - chosenImages.length; },
		onBusy: function(on) {
			postImgBusy = on;
			document.getElementById("postImgBusy").hidden = !on;
		}
	});
	var postImgBusy = false;

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
		// โพสต์ได้ทั้ง ข้อความล้วน / รูปล้วน / รูป+ข้อความ — แค่ต้องมีอย่างใดอย่างหนึ่ง
		if (chosenImages.length === 0 && !caption) {
			errBox.textContent = t("profile.needCaptionOrPhoto");
			errBox.classList.add("show");
			return;
		}

		if (postImgBusy) {
			errBox.textContent = t("photos.waitPreparing");
			errBox.classList.add("show");
			return;
		}
		// กันกดซ้ำ: ปุ่มถูกปิดตั้งแต่กดครั้งแรกจนได้ผลจริง (กด Enter ในช่องแคปชั่นซ้ำ ๆ ก็ไม่ส่งซ้ำ)
		if (submitBtn.disabled) return;
		// โปรไฟล์ที่ใช้งานถูกเปลี่ยน (จากหน้าต่างอื่น) หลังเปิดหน้านี้ → ไม่ส่ง กันโพสต์ผิดบัญชี
		if (getActivePersona() !== profPage.key) {
			errBox.textContent = t("profile.profileChangedElsewhere");
			errBox.classList.add("show");
			return;
		}
		var submitHtml = submitBtn.innerHTML;
		submitBtn.disabled = true;
		function showStatus(text) {
			submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>' + escapeHtml(text) + "</span>";
		}
		showStatus(chosenImages.length ? t("photos.uploading").replace("{n}", chosenImages.length) : t("photos.saving"));
		function onProgress(p) {
			if (p.stage === "uploading") showStatus(t("photos.uploadingProgress").replace("{done}", p.done).replace("{total}", p.total));
			else if (p.stage === "saving") showStatus(t("photos.saving"));
		}
		function finish(result, okToast) {
			submitBtn.disabled = false;
			if (!result.ok) {
				// ฟอร์มยังเก็บรูป/แคปชั่นไว้ครบ กดโพสต์ใหม่ได้ทันที (รูปที่อัปไปแล้วรอบก่อนถูกลบทิ้งแล้ว ไม่ซ้ำ)
				submitBtn.innerHTML = submitHtml;
				errBox.textContent = t("postSaveFailed." + (result.reason || "server"));
				errBox.classList.add("show");
				errBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
				return;
			}
			resetFormToCreateMode();
			form.style.display = "none";
			showToast(okToast);
			renderMyPosts();
		}

		if (editingPostId) {
			updatePost(editingPostId, { images: chosenImages, caption: caption }, onProgress).then(function(result) {
				finish(result, t("profile.postUpdatedToast"));
			});
			return;
		}

		var activePage = getActivePostingPage(); // ตรวจสิทธิ์แล้วตอนเปิดหน้า + addPost ถามเซิร์ฟเวอร์ซ้ำ + RLS บังคับอีกชั้น
		addPost(session.id, chosenImages, caption, activePage ? activePage.numId : null, onProgress).then(function(result) {
			finish(result, activePage ? t("profile.postedAsToast").replace("{name}", activePage.name) : t("profile.postedToast"));
		});
	});

	renderMyPosts();
}

// เพจที่กำลังใช้โพสต์อยู่ตอนนี้ (ถ้าเลือก "โพสต์ในนามเพจ" ไว้ใน Settings) — คืนค่า null ถ้าโพสต์ในนามตัวเอง
// = โปรไฟล์ร้านที่หน้านี้แสดงอยู่ (ตรวจสิทธิ์กับเซิร์ฟเวอร์แล้วตอนเปิดหน้า) ไม่ใช่ค่าใน localStorage ตรง ๆ
function getActivePostingPage() {
	if (profPage.type !== "shop") return null;
	var s = profPage.shop;
	return { numId: s.numId, name: s.name, img: s.img };
}

function closeAllPostMenus() {
	document.querySelectorAll("#myPostGrid .ppostmenu").forEach(function(m) { m.remove(); });
	document.querySelectorAll("#myPostGrid .ppost.menuopen").forEach(function(el) { el.classList.remove("menuopen"); });
}
// แตะที่อื่นนอกเมนู ⋯ ของโพสต์ = ปิดเมนู
document.addEventListener("click", function(e) {
	if (!e.target.closest || !e.target.closest(".ppost")) closeAllPostMenus();
});
function renderMyPosts() {
	refreshLevelCard(); // โพสต์ใหม่/ลบโพสต์/sync โพสต์เสร็จ = XP เปลี่ยน
	var grid = document.getElementById("myPostGrid");
	var emptyMsg = document.getElementById("myPostEmpty");
	var activePage = getActivePostingPage();

	/* --- แถบ "กำลังโพสต์ในนาม" เหนือปุ่มเพิ่มโพสต์ --- */
	var row = document.getElementById("postingAsRow");
	if (row) {
		var meNow = getMe() || session;
		var asName = activePage ? activePage.name : meNow.name;
		var asImg = activePage ? activePage.img : meNow.avatar;
		var av = document.getElementById("postingAsAvatar");
		av.style.backgroundImage = asImg && cssUrl(asImg) ? "url('" + cssUrl(asImg) + "')" : "";
		av.textContent = asImg && cssUrl(asImg) ? "" : (asName || "?").charAt(0).toUpperCase();
		document.getElementById("postingAsLabel").textContent = t("profile.postingAsName").replace("{name}", asName);
		row.hidden = false;
	}

	grid.innerHTML = "";
	var posts = activePage ? getPostsByPage(activePage.numId) : getPostsByUser(session.id);
	var igStatPosts = document.getElementById("igStatPosts");
	if (igStatPosts) igStatPosts.textContent = posts.length;
	var tabCountPosts = document.getElementById("ptabCountPosts");
	if (tabCountPosts) tabCountPosts.textContent = posts.length;
	if (posts.length === 0) {
		emptyMsg.textContent = t(activePage ? "profile.emptyShopPosts" : "profile.emptyPosts");
		emptyMsg.hidden = false;
		return;
	}
	emptyMsg.hidden = true;
	var posterName = activePage ? activePage.name : session.name;
	var posterColor = activePage ? "var(--cream2)" : "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))";
	posts.forEach(function(p) {
		var images = getPostImages(p);
		var el = document.createElement("div");
		el.className = "ppost card-enter";
		el.innerHTML =
			postCoverHtml(images, p.caption) +
			(images.length > 1 ? '<i class="fas fa-clone ppostmulti" title="' + t("common.photoCount").replace("{n}", images.length) + '"></i>' : "") +
			(images.length ? '<div class="ppostcap">' + escapeHtml(p.caption) + '</div>' : "") +
			// ปุ่ม ⋯ มุมขวาบนปุ่มเดียว รวม แก้ไข/ลบ ไว้ในเมนู (เดิมเป็นปุ่มดินสอ + ✕ แยกกัน และ ✕ ลบทันทีไม่ถามก่อน)
			'<button type="button" class="ppostmore" aria-label="' + t("profile.postOptions") + '"><i class="fas fa-ellipsis"></i></button>';
		el.addEventListener("click", function() {
			if (el.querySelector(".ppostmenu")) {
				closeAllPostMenus();
				return;
			}
			openPostView({ id: p.id, images: images, caption: p.caption, posterName: posterName, posterColor: posterColor, posterId: p.userId });
		});
		el.querySelector(".ppostmore").addEventListener("click", function(e) {
			e.stopPropagation();
			var open = el.querySelector(".ppostmenu");
			closeAllPostMenus();
			if (open) return;
			var menu = document.createElement("div");
			menu.className = "ppostmenu";
			menu.innerHTML =
				'<button type="button" data-act="edit"><i class="fas fa-pen"></i>' + t("common.editPost") + "</button>" +
				'<button type="button" data-act="delete" class="danger"><i class="fas fa-trash-can"></i>' + t("common.deletePost") + "</button>";
			menu.addEventListener("click", function(ev) {
				ev.stopPropagation();
				var btn = ev.target.closest("button");
				if (!btn) return;
				closeAllPostMenus();
				if (btn.getAttribute("data-act") === "edit") {
					startEditingPost(p);
				} else {
					// หน้าต่างยืนยันก่อนลบ — โชว์รูปปก + แคปชั่นของโพสต์นั้น ให้แน่ใจว่ากำลังลบโพสต์ที่ถูกอัน
					showConfirmDialog({
						title: t("profile.deletePostTitle"),
						message: (p.caption ? "“" + p.caption + "” — " : "") + t("profile.confirmDeletePost"),
						confirmText: t("common.deletePost"),
						image: images[0]
					}).then(function(yes) {
						if (!yes) return;
						deletePost(p.id);
						renderMyPosts();
						showToast(t("profile.postDeletedToast"));
					});
				}
			});
			el.appendChild(menu);
			el.classList.add("menuopen");
		});
		grid.appendChild(el);
	});
}


/* =====================================================================
   รายชื่อผู้ติดตาม / กำลังติดตาม (แผ่นเลื่อนขึ้นจากล่าง) — กดเลขบนหัวโปรไฟล์แล้วดูได้ในหน้านี้เลย
   กำลังติดตาม: นักชิม + ร้าน (มีปุ่มเลิกติดตามในแถว) / ผู้ติดตาม: ดึงจาก Supabase (มีปุ่ม "ติดตามกลับ")
   ===================================================================== */
function setupFollowSheet(me, onFollowChanged) {
	var sheet = document.getElementById("followSheet");
	var list = document.getElementById("fsheetList");
	if (!sheet || !list) return;
	var currentTab = "following";
	var profileCache = {}; // uuid → { name, avatar } จาก Supabase
	var lastFocus = null;

	function isUuid(id) { return /^[0-9a-f-]{36}$/i.test(String(id)); }
	function avatarHtml(row) {
		return row.avatar
			? '<span class="fsrow-avatar" style="background-image:url(\'' + cssUrl(row.avatar) + '\')"></span>'
			: '<span class="fsrow-avatar fsrow-letter">' + escapeHtml((row.name || "?").trim().charAt(0).toUpperCase()) + "</span>";
	}
	// แปลง id ที่ติดตามอยู่ → ข้อมูลแถว (ชื่อ รูป ลิงก์) — หาไม่เจอคืน null
	function resolveUser(id) {
		if (/^bu-/.test(id)) {
			var bu = หาเพจร้านBUจากId(id.slice(3));
			return bu ? { key: id, kind: "user", name: bu.name, avatar: bu.avatar, sub: t("following.restaurants"), link: "public-profile.html?u=" + encodeURIComponent(id) } : null;
		}
		if (typeof getPageById === "function") {
			var page = getPageById(id);
			if (page) return { key: id, kind: "user", name: page.name, avatar: page.avatar, sub: t("following.restaurants"), link: "public-profile.html?u=page-" + encodeURIComponent(id) };
		}
		var local = getUsers().filter(function(u) { return u.id === id; })[0];
		var info = profileCache[id] || (local ? { name: local.name, avatar: local.avatar || null } : null);
		if (!info || !info.name) return null;
		return { key: id, kind: "user", name: info.name, avatar: info.avatar, sub: t("following.foodie"), link: "public-profile.html?u=" + encodeURIComponent(id) };
	}
	function followingRows() {
		var rows = [];
		getFollowedUsers().forEach(function(id) {
			var r = resolveUser(id);
			if (r) rows.push(r);
		});
		getFollowedShops().forEach(function(shopId) {
			var shop = หาร้านจากId(shopId);
			if (shop) rows.push({ key: shopId, kind: "shop", name: shop.ร้าน, avatar: shop.รูป, sub: catLabel(shop.หมวด), link: "restaurant.html?id=" + shopId });
		});
		return rows;
	}
	function isFollowing(row) {
		return row.kind === "shop" ? isShopFollowed(row.key) : isUserFollowed(row.key);
	}
	function buildRow(row) {
		var el = document.createElement("div");
		el.className = "fsrow";
		el.innerHTML =
			'<a class="fsrow-main" href="' + row.link + '">' + avatarHtml(row) +
				'<span class="fsrow-text"><b></b><small></small></span></a>' +
			'<button type="button" class="fsrow-btn"></button>';
		el.querySelector("b").textContent = row.name;
		el.querySelector("small").textContent = row.sub || "";
		var btn = el.querySelector(".fsrow-btn");
		function paint() {
			var on = isFollowing(row);
			btn.classList.toggle("is-on", on);
			btn.textContent = on ? t("common.following") : (currentTab === "followers" ? t("profile.followBack") : t("common.follow"));
		}
		paint();
		btn.addEventListener("click", function() {
			var r = row.kind === "shop" ? toggleFollowShop(row.key) : toggleFollowUser(row.key);
			if (r === null) return; // ยังไม่ล็อกอิน
			paint();
			if (typeof onFollowChanged === "function") onFollowChanged();
		});
		return el;
	}
	function renderList(rows, emptyKey) {
		list.innerHTML = "";
		if (!rows.length) {
			list.innerHTML = '<p class="fsheet-empty"></p>';
			list.querySelector("p").textContent = t(emptyKey);
			return;
		}
		rows.forEach(function(r) { list.appendChild(buildRow(r)); });
	}
	function fetchProfiles(ids) {
		var need = ids.filter(function(id) { return isUuid(id) && !profileCache[id]; });
		if (!need.length || typeof sbClient === "undefined" || !sbClient) return Promise.resolve();
		return Promise.resolve(sbClient.from("profiles").select("id, name, avatar_url").in("id", need)).then(function(res) {
			if (res.error) return Promise.resolve(sbClient.from("profiles").select("id, name").in("id", need));
			return res;
		}).then(function(res) {
			((res && res.data) || []).forEach(function(p) { profileCache[p.id] = { name: p.name, avatar: p.avatar_url || null }; });
		}).catch(function() {});
	}
	function showTab(tab) {
		currentTab = tab;
		sheet.querySelectorAll(".fsheet-tab").forEach(function(b) {
			var on = b.getAttribute("data-tab") === tab;
			b.classList.toggle("active", on);
			b.setAttribute("aria-selected", on ? "true" : "false");
		});
		if (tab === "following") {
			renderList(followingRows(), "profile.followingEmpty");
			// ชื่อนักชิมที่เครื่องนี้ไม่เคยเห็น → ถาม Supabase แล้ววาดใหม่
			fetchProfiles(getFollowedUsers()).then(function() {
				if (currentTab === "following") renderList(followingRows(), "profile.followingEmpty");
			});
			return;
		}
		list.innerHTML = '<p class="fsheet-empty"><i class="fas fa-spinner fa-spin"></i></p>';
		if (typeof sbClient === "undefined" || !sbClient) {
			renderList([], "profile.followersEmpty");
			return;
		}
		Promise.resolve(sbClient.from("follows").select("follower_id, created_at").eq("target_type", "profile").eq("target_id", me.id).order("created_at", { ascending: false })).then(function(res) {
			var ids = res.error ? [] : (res.data || []).map(function(r) { return r.follower_id; });
			document.getElementById("fsCountFollowers").textContent = ids.length;
			return fetchProfiles(ids).then(function() { return ids; });
		}).then(function(ids) {
			if (currentTab !== "followers") return;
			var rows = ids.map(function(id) {
				var info = profileCache[id];
				return info ? { key: id, kind: "user", name: info.name, avatar: info.avatar, sub: t("following.foodie"), link: "public-profile.html?u=" + encodeURIComponent(id) } : null;
			}).filter(Boolean);
			renderList(rows, "profile.followersEmpty");
		}).catch(function() { renderList([], "profile.followersEmpty"); });
	}
	function open(tab) {
		lastFocus = document.activeElement;
		sheet.hidden = false;
		document.body.style.overflow = "hidden";
		requestAnimationFrame(function() { sheet.classList.add("open"); });
		showTab(tab);
		var active = sheet.querySelector(".fsheet-tab.active");
		if (active) active.focus();
	}
	function close() {
		sheet.classList.remove("open");
		document.body.style.overflow = "";
		setTimeout(function() { sheet.hidden = true; }, 200);
		if (lastFocus && lastFocus.focus) lastFocus.focus();
	}
	document.getElementById("igFollowersBtn").addEventListener("click", function() { open("followers"); });
	document.getElementById("igFollowingBtn").addEventListener("click", function() { open("following"); });
	sheet.querySelectorAll(".fsheet-tab").forEach(function(b) {
		b.addEventListener("click", function() { showTab(this.getAttribute("data-tab")); });
	});
	document.getElementById("fsheetClose").addEventListener("click", close);
	sheet.addEventListener("click", function(e) { if (e.target === sheet) close(); });
	document.addEventListener("keydown", function(e) {
		if (e.key === "Escape" && !sheet.hidden) close();
	});
}


/* =====================================================================
   เลเวลนักชิมบนหน้าโปรไฟล์ — ป้าย "Lv.N ชื่อระดับ" ใต้ชื่อ + การ์ด XP/แถบความคืบหน้า
   กดการ์ดแล้วเห็นรายละเอียดว่าได้ XP จากกิจกรรมไหนบ้าง และต้องทำอะไรต่อเพื่อเลื่อนระดับ
   ===================================================================== */
function refreshLevelCard() {
	var session = getSession();
	var card = document.getElementById("profLevelCard");
	if (!session || !card || profPage.type === "shop") return; // โปรไฟล์ร้านไม่มีเลเวลนักชิม
	var info = คำนวณXP(session.id);
	var lv = เลเวลจากXP(info.xp);
	document.getElementById("profRole").innerHTML = '<i class="fas fa-medal"></i> Lv.' + lv.level + " " + escapeHtml(lv.name);
	document.getElementById("profLevelBadge").textContent = "Lv." + lv.level;
	document.getElementById("profLevelName").textContent = lv.name;
	document.getElementById("profLevelXp").textContent = lv.next ? (info.xp + " / " + lv.next + " XP") : (info.xp + " XP");
	document.getElementById("profLevelBar").style.width = Math.round(lv.progress * 100) + "%";
	document.getElementById("profLevelNext").textContent = lv.next
		? t("level.toNext").replace("{n}", lv.next - info.xp).replace("{name}", lv.nextName)
		: t("level.maxed");
	card.setAttribute("aria-label", "Lv." + lv.level + " " + lv.name + ", " + info.xp + " XP");
	card.onclick = function() {
		var rows = CHIMCHIM_XP_RULES.map(function(r) {
			var n = info.counts[r.key] || 0;
			return '<div class="lvlrow"><i class="fas fa-' + r.icon + '"></i><span>' + escapeHtml(t(r.label)) +
				'<small>' + escapeHtml(t("level.perEach").replace("{xp}", r.xp)) + "</small></span><b>" + n + " × " + r.xp + " = " + (n * r.xp) + " XP</b></div>";
		}).join("");
		var ladder = CHIMCHIM_LEVELS.map(function(l, i) {
			var reached = info.xp >= l.min;
			return '<li class="' + (i + 1 === lv.level ? "cur" : (reached ? "done" : "")) + '"><span>Lv.' + (i + 1) + " " + escapeHtml(t(l.name)) + "</span><b>" + l.min + " XP</b></li>";
		}).join("");
		openProfDetailPop('<i class="fas fa-medal me-2"></i>' + escapeHtml(t("level.title")),
			'<p class="lvlsum">' + escapeHtml(t("level.youAre").replace("{lv}", lv.level).replace("{name}", lv.name).replace("{xp}", info.xp)) + "</p>" +
			'<div class="lvlrows">' + rows + "</div>" +
			'<div class="lvlladdertit">' + escapeHtml(t("level.allLevels")) + "</div>" +
			'<ol class="lvlladder">' + ladder + "</ol>");
	};
}


/* =====================================================================
   กิจกรรมของฉัน (แถบแท็บไอคอนแบบ IG ใต้ข้อมูลโปรไฟล์) — ย้ายมาจากหน้าตั้งค่า
   โพสต์ (ตารางรูปเดิม) / ร้านที่ถูกใจ / รีวิวของฉัน / บันทึกไว้ — ข้อมูลจริงของผู้ที่ล็อกอินอยู่เท่านั้น
   สลับแท็บแล้วเปลี่ยนแค่เนื้อหาด้านล่าง ไม่โหลดหน้าใหม่ จำแท็บล่าสุดไว้ระหว่างเปิดแอป
   ===================================================================== */
// หมายเหตุ: setupProfileTabs ถูกเรียกจากโค้ดตั้งต้นด้านบนไฟล์ ก่อนบรรทัดนี้จะทำงาน
// จึงใช้ฟังก์ชัน (hoist ทั้งตัว) แทนตัวแปรที่มีค่าเริ่มต้น และไม่กำหนดค่าเริ่มให้ profReviewsLoading (ไม่งั้นจะทับค่า true)
function profTabKey() { return profPage.type === "shop" ? "chimchim_profile_tab_shop" : "chimchim_profile_tab"; }
function profPanes() {
	return profPage.type === "shop"
		? { posts: "profPostsCard", shopreviews: "ppaneShopReviews" }
		: { posts: "profPostsCard", likes: "ppaneLikes", reviews: "ppaneReviews", saves: "ppaneSaves" };
}
var profReviewsLoading;

// id ร้าน → ข้อมูลร้านจริง (ตัดร้านที่ถูกลบไปแล้ว และ id ซ้ำ ไม่ให้นับเกิน)
function ร้านจากรายการId(ids) {
	var seen = {};
	return ids.filter(function(id) {
		if (seen[id]) return false;
		seen[id] = true;
		return true;
	}).map(function(id) { return หาร้านจากId(id); }).filter(Boolean);
}

function showProfileTab(tab) {
	var panes = profPanes();
	if (!panes[tab]) tab = "posts";
	document.querySelectorAll("#profTabs .proftab").forEach(function(b) {
		var on = b.getAttribute("data-ptab") === tab;
		b.classList.toggle("active", on);
		b.setAttribute("aria-selected", on ? "true" : "false");
		b.tabIndex = on ? 0 : -1;
	});
	["profPostsCard", "ppaneLikes", "ppaneReviews", "ppaneSaves", "ppaneShopReviews"].forEach(function(id) {
		document.getElementById(id).hidden = panes[tab] !== id;
	});
	try { sessionStorage.setItem(profTabKey(), tab); } catch (e) {}
}

// แท็บ ร้านที่ถูกใจ / รีวิว / บันทึกไว้ + ตัวเลขบนแท็บ (โพสต์นับใน renderMyPosts)
/* --- ช่องในตาราง (แบบ IG/TikTok): โพสต์ / ร้าน / รีวิว — ทุกช่องสี่เหลี่ยมจัตุรัสเท่ากัน รูปเต็มช่อง (object-fit: cover) --- */
function profGridTile(opts) {
	var tile = document.createElement("button");
	tile.type = "button";
	tile.className = "profgtile" + (opts.extraClass ? " " + opts.extraClass : "");
	tile.setAttribute("aria-label", opts.label || "");
	tile.innerHTML = opts.html;
	tile.addEventListener("click", opts.onOpen);
	return tile;
}
function profPostTile(item) {
	return profGridTile({
		label: item.caption || item.posterName || "",
		extraClass: item.images.length ? "" : "is-text",
		html: item.images.length
			? '<img src="' + safeImgSrc(item.images[0]) + '" alt="" loading="lazy"/>' +
				(item.images.length > 1 ? '<i class="fas fa-clone profgtile-ico" aria-hidden="true"></i>' : "")
			: '<span class="profgtile-text"><b>' + escapeHtml(item.posterName || "") + '</b><span class="profgtile-quote">' + escapeHtml(item.caption || "") + "</span></span>",
		onOpen: function() {
			openPostView({ id: item.id, images: item.images, caption: item.caption, posterName: item.posterName, posterColor: item.posterColor, posterAvatarUrl: item.posterAvatarUrl, posterId: item.userId });
		}
	});
}
function profShopTile(ร้าน) {
	return profGridTile({
		label: ร้าน.ร้าน,
		html: '<img src="' + safeImgSrc(ร้าน.รูป) + '" alt="" loading="lazy"/>' +
			'<i class="fas fa-store profgtile-ico" aria-hidden="true"></i>' +
			'<span class="profgtile-cap">' + escapeHtml(ร้าน.ร้าน) + "</span>",
		onOpen: function() { window.location.href = "restaurant.html?id=" + ร้าน.id; }
	});
}
// รีวิว: ใช้รูปที่แนบในรีวิวเป็นภาพหลัก ไม่มีรูป = การ์ดข้อความ (ไม่ใช้รูปร้านแทน ไม่สร้างรูปปลอม)
function profReviewTile(r, ร้าน) {
	var avg = Math.round((r.taste + r.atmosphere + r.service) / 3 * 10) / 10;
	var score = '<span class="profgtile-score"><i class="fas fa-star" aria-hidden="true"></i>' + avg + "</span>";
	var html = r.images.length
		? '<img src="' + safeImgSrc(r.images[0]) + '" alt="" loading="lazy"/>' + score +
			(r.images.length > 1 ? '<i class="fas fa-clone profgtile-ico" aria-hidden="true"></i>' : "") +
			'<span class="profgtile-cap">' + escapeHtml(ร้าน.ร้าน) + "</span>"
		: '<span class="profgtile-text">' +
				'<b>' + escapeHtml(ร้าน.ร้าน) + "</b>" +
				'<span class="profgtile-quote">' + escapeHtml(r.text || t("restaurant.noReviewText")) + "</span>" +
			"</span>" + score;
	return profGridTile({
		label: ร้าน.ร้าน + " " + avg,
		extraClass: r.images.length ? "" : "is-text",
		html: html,
		onOpen: function() { openMyReviewDetail(r, ร้าน); }
	});
}
// รายละเอียดรีวิว (ป๊อปอัปเดิมของหน้าโปรไฟล์): ร้าน คะแนน 3 ด้าน ข้อความ รูป (กดดูใหญ่ได้) + ไปหน้าร้าน
function openMyReviewDetail(r, ร้าน) {
	var avg = Math.round((r.taste + r.atmosphere + r.service) / 3 * 10) / 10;
	var box = document.createElement("div");
	box.className = "profrevdetail";
	box.innerHTML =
		'<div class="profrevdetail-shop"><img src="' + safeImgSrc(ร้าน.รูป) + '" alt=""/><div><b>' + escapeHtml(ร้าน.ร้าน) + "</b><span>" +
			escapeHtml(new Date(r.date).toLocaleDateString(getLang() === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" })) + "</span></div>" +
			'<span class="profgtile-score is-static"><i class="fas fa-star" aria-hidden="true"></i>' + avg + "</span></div>" +
		'<div class="profrevdetail-sub"><span>' + escapeHtml(t("review.taste")) + " " + r.taste + "</span><span>" + escapeHtml(t("review.atmosphere")) + " " + r.atmosphere + "</span><span>" + escapeHtml(t("review.service")) + " " + r.service + "</span></div>" +
		'<p class="profrevdetail-txt">' + escapeHtml(r.text || t("restaurant.noReviewText")) + "</p>" +
		(r.images.length ? '<div class="rdreviewimgs">' + r.images.map(function(src, i) {
			return '<button type="button" class="rdreviewimg" data-idx="' + i + '"><img src="' + safeImgSrc(src) + '" alt=""/></button>';
		}).join("") + "</div>" : "") +
		'<a class="rdghost" style="width:100%;margin-top:14px;" href="restaurant.html?id=' + ร้าน.id + '"><i class="fas fa-store me-1"></i><span>' + escapeHtml(t("profile.openShop")) + "</span></a>";
	box.querySelectorAll(".rdreviewimg").forEach(function(btn) {
		btn.addEventListener("click", function() { openPhotoViewer(r.images, parseInt(btn.getAttribute("data-idx"), 10)); });
	});
	openProfDetailPop('<i class="fas fa-pen me-2"></i>' + escapeHtml(t("profile.tabReviews")), box);
}

// แท็บ ถูกใจ / รีวิว / บันทึกไว้ + ตัวเลขบนแท็บ (โพสต์นับใน renderMyPosts) — ข้อมูลจริงของผู้ที่ล็อกอินอยู่เท่านั้น
function renderProfileActivity() {
	var session = getSession();
	if (!session || !document.getElementById("profTabs")) return;

	// ถูกใจ = โพสต์ที่กดถูกใจ + ร้านที่กดถูกใจ
	var likedPosts = typeof โพสต์ที่ถูกใจ === "function" ? โพสต์ที่ถูกใจ() : [];
	var likedShops = ร้านจากรายการId(getLikedShops());
	var likeGrid = document.getElementById("profLikesList");
	likeGrid.innerHTML = "";
	likedPosts.forEach(function(item) { likeGrid.appendChild(profPostTile(item)); });
	likedShops.forEach(function(ร้าน) { likeGrid.appendChild(profShopTile(ร้าน)); });
	var likeCount = likedPosts.length + likedShops.length;
	document.getElementById("profLikesEmpty").hidden = likeCount > 0;
	document.getElementById("ptabCountLikes").textContent = likeCount;

	var reviewGrid = document.getElementById("profReviewsList");
	reviewGrid.innerHTML = "";
	var shownReviews = 0;
	getReviewsByUser(session.id).forEach(function(r) {
		var ร้าน = หาร้านจากId(r.shopId);
		if (!ร้าน) return; // ร้านของรีวิวนี้หาไม่เจอแล้ว (ถูกลบ) — ไม่นับ
		reviewGrid.appendChild(profReviewTile(r, ร้าน));
		shownReviews++;
	});
	var reviewEmpty = document.getElementById("profReviewsEmpty");
	reviewEmpty.hidden = shownReviews > 0;
	// ยังไม่มีรีวิวในเครื่อง + กำลังดึงจาก Supabase → แสดงว่ากำลังโหลด แทนการบอกว่าไม่มี
	if (!shownReviews && profReviewsLoading) {
		reviewEmpty.hidden = true;
		reviewGrid.innerHTML = '<p class="profpane-empty profgrid-full"><i class="fas fa-spinner fa-spin"></i></p>';
	}
	document.getElementById("ptabCountReviews").textContent = shownReviews;

	// บันทึกไว้ = โพสต์ที่บันทึก + ร้านที่บันทึก ในตารางเดียว
	var savedPosts = typeof โพสต์ที่บันทึกไว้ === "function" ? โพสต์ที่บันทึกไว้() : [];
	var savedShops = ร้านจากรายการId(getSavedShops());
	var saveGrid = document.getElementById("profSavesList");
	saveGrid.innerHTML = "";
	savedPosts.forEach(function(item) { saveGrid.appendChild(profPostTile(item)); });
	savedShops.forEach(function(ร้าน) { saveGrid.appendChild(profShopTile(ร้าน)); });
	var saveCount = savedPosts.length + savedShops.length;
	document.getElementById("profSavesEmpty").hidden = saveCount > 0;
	document.getElementById("ptabCountSaves").textContent = saveCount;
}

function setupProfileTabs(me) {
	var bar = document.getElementById("profTabs");
	if (!bar) return;
	bar.hidden = false;
	var tabs = Array.prototype.slice.call(bar.querySelectorAll(".proftab")).filter(function(b) { return !b.hidden; });
	tabs.forEach(function(b, i) {
		b.addEventListener("click", function() { showProfileTab(this.getAttribute("data-ptab")); });
		// ลูกศรซ้าย/ขวาสลับแท็บได้ (รูปแบบ tablist มาตรฐาน)
		b.addEventListener("keydown", function(e) {
			var dir = e.key === "ArrowRight" ? 1 : (e.key === "ArrowLeft" ? -1 : 0);
			if (!dir) return;
			e.preventDefault();
			var next = tabs[(i + dir + tabs.length) % tabs.length];
			next.focus();
			showProfileTab(next.getAttribute("data-ptab"));
		});
	});
	var savedTab = null;
	try { savedTab = sessionStorage.getItem(profTabKey()); } catch (e) {}
	showProfileTab(savedTab || "posts");
	renderProfileActivity();

	// รีวิวของฉันจาก Supabase (เผื่อเขียนจากเครื่องอื่น) — รวมเข้ากับในเครื่องแบบไม่ซ้ำ (mergeRemoteReviewsIntoLocal)
	if (typeof sbClient !== "undefined" && sbClient && me && /^[0-9a-f-]{36}$/i.test(me.id)) {
		profReviewsLoading = true;
		renderProfileActivity();
		Promise.resolve(sbClient.from("reviews").select("*").eq("user_id", me.id)).then(function(res) {
			if (res.error || !res.data) return;
			var byShop = {};
			res.data.forEach(function(row) {
				(byShop[row.shop_id] = byShop[row.shop_id] || []).push(sbReviewRowToLocal(row));
			});
			Object.keys(byShop).forEach(function(shopId) { mergeRemoteReviewsIntoLocal(shopId, byShop[shopId]); });
		}).catch(function() {}).then(function() {
			profReviewsLoading = false;
			renderProfileActivity();
			refreshLevelCard();
		});
	}
	// ร้านที่บันทึกไว้จริงจาก Supabase (กดจากเครื่องอื่น) → วาดแท็บใหม่ (ถูกใจ sync พร้อมตัวเลขติดตามด้านบนแล้ว)
	if (typeof syncSavedShopsWithSupabase === "function") syncSavedShopsWithSupabase(renderProfileActivity);
	if (typeof syncSavedPostsWithSupabase === "function") syncSavedPostsWithSupabase(renderProfileActivity);
}
