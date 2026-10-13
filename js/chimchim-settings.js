// chimchim-settings.js
// หน้าตั้งค่า (settings.html): สลับ Light/Dark และ EN/TH — เก็บค่าไว้ผ่าน chimchim-i18n.js

/* --- แก้ไขโปรไฟล์: ชื่อ/bio/รูปโปรไฟล์ — บันทึก local ก่อนทันที แล้วค่อยผลักขึ้น Supabase จริงตามหลัง
   (ดึงของจริงจาก Supabase มาเติมฟอร์มก่อนด้วย เผื่อเพิ่งแก้จากเครื่องอื่นมา ฟอร์มจะได้ไม่เก่ากว่าของจริง) --- */
(function setupEditProfile() {
	var card = document.getElementById("editProfileCard");
	if (!card) return;
	var me = getMe();
	if (!me) return;
	card.hidden = false;

	document.getElementById("editProfileName").value = me.name || "";
	document.getElementById("editProfileBio").value = me.bio || "";
	wireImageUpload("avatarFile", "avatarUrl", "avatarPreviewImg", "avatarUploadBox", me.avatar || null);

	var uniSelect = document.getElementById("editProfileUni");
	if (uniSelect && typeof มหาวิทยาลัยทั้งหมด !== "undefined") {
		มหาวิทยาลัยทั้งหมด.forEach(function(u) {
			var opt = document.createElement("option");
			opt.value = u;
			opt.textContent = u;
			uniSelect.appendChild(opt);
		});
		uniSelect.value = me.university || "";
	}

	if (typeof syncMyProfileWithSupabase === "function") {
		syncMyProfileWithSupabase(function() {
			var fresh = getMe();
			document.getElementById("editProfileName").value = fresh.name || "";
			document.getElementById("editProfileBio").value = fresh.bio || "";
			if (fresh.avatar) {
				document.getElementById("avatarUrl").value = fresh.avatar;
				var img = document.getElementById("avatarPreviewImg");
				img.src = fresh.avatar;
				img.hidden = false;
				document.getElementById("avatarUploadBox").classList.add("haspreview");
			}
		});
	}
	// มหาวิทยาลัยแยก sync ต่างหากจากข้อมูลโปรไฟล์หลัก (ชื่อ/bio/avatar) โดยตั้งใจ — เผื่อยังไม่ได้รัน
	// SQL Phase 6 (เพิ่มคอลัมน์ university ใน profiles) จะได้ไม่ทำให้ sync ชื่อ/bio/avatar พังไปด้วย
	if (typeof syncMyUniversityWithSupabase === "function") {
		syncMyUniversityWithSupabase(function() {
			if (uniSelect) uniSelect.value = getMe().university || "";
		});
	}

	document.getElementById("editProfileForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("editProfileErr");
		errBox.classList.remove("show");
		var name = document.getElementById("editProfileName").value.trim();
		if (!name) {
			errBox.textContent = t("shop.fillRequired");
			errBox.classList.add("show");
			return;
		}
		var patch = { name: name, bio: document.getElementById("editProfileBio").value.trim() };
		var avatar = document.getElementById("avatarUrl").value;
		if (avatar) patch.avatar = avatar;
		var university = uniSelect ? uniSelect.value : "";
		if (uniSelect) patch.university = university;
		if (!updateMe(patch)) {
			errBox.textContent = t("shop.storageFullError");
			errBox.classList.add("show");
			return;
		}
		setSession(getMe());
		if (typeof sbSaveMyProfile === "function") sbSaveMyProfile(patch);
		if (typeof sbSaveMyUniversity === "function" && uniSelect) sbSaveMyUniversity(university);
		if (typeof refreshAuthUI === "function") refreshAuthUI();
		if (typeof showToast === "function") showToast(t("settings.profileSavedToast"));
	});
})();

function refreshSettingsUI() {
	var theme = getThemeChoice();
	document.querySelectorAll("#themeToggle .settopt").forEach(function(btn) {
		btn.classList.toggle("active", btn.getAttribute("data-theme-choice") === theme);
	});
	var lang = getLang();
	document.querySelectorAll("#langToggle .settopt").forEach(function(btn) {
		btn.classList.toggle("active", btn.getAttribute("data-lang-choice") === lang);
	});
}

document.querySelectorAll("#themeToggle .settopt").forEach(function(btn) {
	btn.addEventListener("click", function() {
		setTheme(this.getAttribute("data-theme-choice"));
		refreshSettingsUI();
	});
});

document.querySelectorAll("#langToggle .settopt").forEach(function(btn) {
	btn.addEventListener("click", function() {
		setLang(this.getAttribute("data-lang-choice"));
		refreshSettingsUI();
		if (typeof showToast === "function") {
			showToast(getLang() === "th" ? "เปลี่ยนเป็นภาษาไทยแล้ว 🇹🇭" : "Switched to English 🇬🇧");
		}
	});
});

refreshSettingsUI();

/* --- ตำแหน่งของฉัน — ขอ GPS จริง หามหาลัยที่ใกล้สุด เก็บไว้ใช้ให้คะแนนโบนัสร้านแถวนั้นทุกหน้า --- */
(function setupLocationButton() {
	var btn = document.getElementById("requestLocationBtn");
	var hint = document.getElementById("locationHint");
	if (!btn) return;

	function refreshLocationHint() {
		var loc = getUserLocation();
		if (loc && loc.nearestUni) {
			hint.textContent = t("settings.locationFound").replace("{uni}", loc.nearestUni);
		} else {
			hint.textContent = t("settings.locationHint");
		}
	}
	refreshLocationHint();

	btn.addEventListener("click", function() {
		btn.disabled = true;
		var originalHtml = btn.innerHTML;
		btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i><span>' + t("settings.locationLoading") + "</span>";
		ขอตำแหน่งผู้ใช้().then(function() {
			refreshLocationHint();
			showToast(t("settings.locationSuccess"));
		}).catch(function() {
			showToast(t("settings.locationError"));
		}).finally(function() {
			btn.disabled = false;
			btn.innerHTML = originalHtml;
		});
	});
})();

/* --- กิจกรรมของฉัน: ถูกใจ (ร้าน + โพสต์) / บันทึกไว้ / รีวิว / ติดตาม (ร้าน + นักชิม) — การ์ดเดียว แท็บสลับดู --- */
var ACT_TAB_KEY = "chimchim_settings_activity_tab";
var actFollowNames = {}; // ชื่อ/รูปนักชิมที่ติดตาม ดึงจาก Supabase (เผื่อเครื่องนี้ไม่เคยเห็นคนนั้น)

function showActivityTab(tab) {
	document.querySelectorAll("#myActivityCard .acttab").forEach(function(b) {
		var on = b.getAttribute("data-act") === tab;
		b.classList.toggle("active", on);
		b.setAttribute("aria-selected", on ? "true" : "false");
	});
	document.querySelectorAll("#myActivityCard .actpane").forEach(function(p) {
		p.hidden = p.getAttribute("data-pane") !== tab;
	});
	try { sessionStorage.setItem(ACT_TAB_KEY, tab); } catch (e) {}
}
document.querySelectorAll("#myActivityCard .acttab").forEach(function(b) {
	b.addEventListener("click", function() { showActivityTab(this.getAttribute("data-act")); });
});

// โพสต์ที่ถูกใจ: หาข้อมูลจากฟีด (มีทั้งโพสต์จริงและโพสต์ตัวอย่างของร้าน id เดียวกับที่กดถูกใจ)
function โพสต์ที่ถูกใจ() {
	var byId = {};
	getFeedItems().forEach(function(item) { byId[String(item.id)] = item; });
	return getLikedPosts().map(function(id) { return byId[String(id)]; }).filter(Boolean);
}
function buildLikedPostTile(item) {
	var el = document.createElement("div");
	el.className = "ppost";
	el.innerHTML = '<img src="' + item.images[0] + '" alt=""/>' + '<div class="ppostcap">' + escapeHtml(item.caption || "") + "</div>";
	el.addEventListener("click", function() {
		openPostView({ id: item.id, images: item.images, caption: item.caption, posterName: item.posterName, posterColor: item.posterColor, posterAvatarUrl: item.posterAvatarUrl, posterId: item.userId });
	});
	return el;
}
// แถวนักชิม/เพจที่ติดตาม (ร้านในระบบที่ติดตามผ่านเพจร้าน "bu-…" แสดงเป็นแถวร้านแทน)
function buildFollowRow(uid) {
	if (/^bu-/.test(uid) && typeof หาเพจร้านBUจากId === "function") {
		var page = หาเพจร้านBUจากId(uid.slice(3));
		var ร้าน = page ? หาร้านจากId(page.menuId) : null;
		return ร้าน ? buildLikeRow(ร้าน) : null;
	}
	var local = getUsers().filter(function(u) { return u.id === uid; })[0];
	var info = actFollowNames[uid] || (local ? { name: local.name, avatar: local.avatar || null } : null);
	if (!info || !info.name) return null;
	var row = document.createElement("a");
	row.className = "profshoprow";
	row.href = "public-profile.html?u=" + encodeURIComponent(uid);
	row.style.textDecoration = "none";
	row.innerHTML =
		(info.avatar
			? '<img src="' + info.avatar + '" alt="" style="border-radius:50%;"/>'
			: '<span class="actavatar">' + escapeHtml(info.name.trim().charAt(0).toUpperCase()) + "</span>") +
		'<div style="flex:1;min-width:0;"><div class="profshopnm">' + escapeHtml(info.name) + '</div><div class="profshopmeta"><i class="fas fa-user"></i> ' + t("following.foodie") + "</div></div>";
	return row;
}

function renderAccountHistory() {
	var session = getSession();
	var card = document.getElementById("myActivityCard");
	if (!session || !card) return;
	card.hidden = false;

	// --- ถูกใจ: ร้าน + โพสต์ ---
	var likedShops = getLikedShops().map(function(id) { return หาร้านจากId(id); }).filter(Boolean);
	var likedPosts = โพสต์ที่ถูกใจ();
	var likeList = document.getElementById("settingsLikesList");
	var postGrid = document.getElementById("settingsLikedPosts");
	likeList.innerHTML = "";
	postGrid.innerHTML = "";
	likedShops.forEach(function(ร้าน) { likeList.appendChild(buildLikeRow(ร้าน)); });
	likedPosts.forEach(function(item) { postGrid.appendChild(buildLikedPostTile(item)); });
	document.getElementById("actLikedShopsHead").hidden = !likedShops.length;
	document.getElementById("actLikedPostsHead").hidden = !likedPosts.length;
	document.getElementById("settingsLikesEmpty").hidden = likedShops.length + likedPosts.length > 0;
	document.getElementById("actCountLikes").textContent = likedShops.length + likedPosts.length;

	// --- บันทึกไว้ ---
	var savedShops = (typeof getSavedShops === "function" ? getSavedShops() : []).map(function(id) { return หาร้านจากId(id); }).filter(Boolean);
	var saveList = document.getElementById("settingsSavesList");
	saveList.innerHTML = "";
	savedShops.forEach(function(ร้าน) { saveList.appendChild(buildLikeRow(ร้าน)); });
	document.getElementById("settingsSavesEmpty").hidden = savedShops.length > 0;
	document.getElementById("actCountSaves").textContent = savedShops.length;

	// --- รีวิว (ใหม่สุดก่อน) กดแล้วไปหน้าร้านนั้น ---
	var reviews = getReviewsByUser(session.id);
	var reviewList = document.getElementById("settingsReviewsList");
	reviewList.innerHTML = "";
	var shownReviews = 0;
	reviews.forEach(function(r) {
		var item = buildReviewItem(r);
		if (!item) return;
		item.style.cursor = "pointer";
		item.addEventListener("click", function() { window.location.href = "restaurant.html?id=" + r.shopId; });
		reviewList.appendChild(item);
		shownReviews++;
	});
	document.getElementById("settingsReviewsEmpty").hidden = shownReviews > 0;
	document.getElementById("actCountReviews").textContent = shownReviews;

	// --- ติดตาม: ร้าน (ระบบเดิม) + ร้านในระบบ/นักชิมที่ติดตาม ---
	var followList = document.getElementById("settingsFollowsList");
	followList.innerHTML = "";
	var shownFollows = 0;
	var seenShop = {};
	getFollowedShops().map(function(id) { return หาร้านจากId(id); }).filter(Boolean).forEach(function(ร้าน) {
		seenShop[ร้าน.id] = true;
		followList.appendChild(buildLikeRow(ร้าน));
		shownFollows++;
	});
	getFollowedUsers().forEach(function(uid) {
		var row = buildFollowRow(uid);
		if (!row) return;
		followList.appendChild(row);
		shownFollows++;
	});
	document.getElementById("settingsFollowsEmpty").hidden = shownFollows > 0;
	document.getElementById("actCountFollows").textContent = shownFollows;

	var savedTab = null;
	try { savedTab = sessionStorage.getItem(ACT_TAB_KEY); } catch (e) {}
	showActivityTab(savedTab || "likes");
}

// ดึงรีวิวของฉันจาก Supabase (เผื่อเขียนจากเครื่องอื่น) + ชื่อ/รูปของนักชิมที่ติดตาม แล้ววาดใหม่
function syncMyActivityExtras() {
	var me = getMe();
	if (!me || typeof sbClient === "undefined" || !sbClient) return;
	Promise.resolve(sbClient.from("reviews").select("*").eq("user_id", me.id)).then(function(res) {
		if (res.error || !res.data || !res.data.length) return;
		var byShop = {};
		res.data.forEach(function(row) {
			(byShop[row.shop_id] = byShop[row.shop_id] || []).push(sbReviewRowToLocal(row));
		});
		Object.keys(byShop).forEach(function(shopId) { mergeRemoteReviewsIntoLocal(shopId, byShop[shopId]); });
		renderAccountHistory();
	}).catch(function() {});
	var uuids = getFollowedUsers().filter(function(id) { return /^[0-9a-f-]{36}$/i.test(id); });
	if (uuids.length) {
		Promise.resolve(sbClient.from("profiles").select("id, name, avatar_url").in("id", uuids)).then(function(res) {
			if (res.error) return Promise.resolve(sbClient.from("profiles").select("id, name").in("id", uuids));
			return res;
		}).then(function(res) {
			(res && res.data || []).forEach(function(r) { actFollowNames[r.id] = { name: r.name, avatar: r.avatar_url || null }; });
			renderAccountHistory();
		}).catch(function() {});
	}
}
renderAccountHistory();
if (getSession()) syncMyActivityExtras();
// ดึงไลก์/ติดตามจริงจาก Supabase (เผื่อทำไว้จากเครื่องอื่น) มาผสานแล้ว re-render ประวัติให้ตรงของจริง
if (typeof syncLikesAndFollowsWithSupabase === "function" && getSession()) {
	syncLikesAndFollowsWithSupabase(renderAccountHistory);
}
if (typeof syncSavedShopsWithSupabase === "function" && getSession()) {
	syncSavedShopsWithSupabase(renderAccountHistory);
}
