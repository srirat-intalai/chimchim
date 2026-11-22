// chimchim-publicprofile.js
// หน้าโปรไฟล์สาธารณะ (public-profile.html) — อ่าน ?u= จาก URL
// รองรับร้านตั้งต้น (bu-…), เพจร้านของผู้ใช้ (page-…) และสมาชิกที่สมัครจริง

var ppParams = new URLSearchParams(window.location.search);
var ppUid = ppParams.get("u");
var ppIsPage = ppUid && ppUid.indexOf("page-") === 0;
var ppIsBuShop = ppUid && ppUid.indexOf("bu-") === 0;
var ppSession = getSession();

(function ppNavFromReferrer() {
	var from = "";
	try { var r = new URL(document.referrer); if (r.origin === location.origin) from = r.pathname.split("/").pop(); } catch (e) {}
	var map = { "home.html": "home.html", "roulette.html": "roulette.html" };
	var target = map[from];
	if (!target) return; // มาจากหน้าติดตาม/ลิงก์ภายนอก — คงไฮไลต์ "ติดตาม" ตามเดิม
	document.querySelectorAll(".appnav .anitem").forEach(function(a) {
		a.classList.toggle("active", a.getAttribute("href") === target);
	});
})();

var ppReviewerAvatars = {}; // userId → url รูปโปรไฟล์ (ดึงจาก profiles ของ Supabase / ผู้ใช้ในเครื่อง)
function ppFormatDate(iso) {
	var d = new Date(iso);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleDateString(getLang() === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* =====================================================================
   โปรไฟล์นักชิม (#ppUser): หัวโปรไฟล์ · ตัวเลขจริง · แท็บ ไดอารี่ / ร้านโปรด / เกี่ยวกับ
   ไดอารี่ส่วนตัว ฐานข้อมูลไม่ส่งแถวมาเลย (RLS) — หน้านี้แค่บอกตรง ๆ ว่าดูไม่ได้
   "ร้านโปรด" นับจากไดอารี่สาธารณะเท่านั้น ร้านที่ผู้ใช้กดบันทึกไว้เป็นข้อมูลส่วนตัว ไม่ดึงมาแสดง
   ===================================================================== */
var PPU_DIARY_MAX = 12;
function ppuText(id, value) {
	document.getElementById(id).textContent = value === null || value === undefined ? "–" : formatLikeCount(value);
}
function ppuShowTab(tab, focus) {
	document.querySelectorAll(".ppu-tab").forEach(function(b) {
		var on = b.getAttribute("data-tab") === tab;
		b.classList.toggle("active", on);
		b.setAttribute("aria-selected", on ? "true" : "false");
		b.tabIndex = on ? 0 : -1;
		document.getElementById(b.getAttribute("aria-controls")).hidden = !on;
		if (on && focus) b.focus();
	});
}
function ppuSetupTabs() {
	var tabs = Array.prototype.slice.call(document.querySelectorAll(".ppu-tab"));
	tabs.forEach(function(b, i) {
		b.addEventListener("click", function() { ppuShowTab(b.getAttribute("data-tab")); });
		b.addEventListener("keydown", function(e) {
			var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
			if (j === null) return;
			e.preventDefault();
			ppuShowTab(tabs[(j + tabs.length) % tabs.length].getAttribute("data-tab"), true);
		});
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
	document.getElementById("ppDnaNone").hidden = !!rows.length;
	document.getElementById("ppDnaMatch").hidden = true; // % อยู่ในหัวโปรไฟล์แล้ว ไม่ซ้ำในแท็บเกี่ยวกับ
	ppuRenderTaste(rows.length ? dna : null, isMe);
	if (!rows.length) return;
	document.getElementById("ppDnaRows").innerHTML = rows.join("");
}
// หัวโปรไฟล์: คำตอบของ "กินตามคนนี้ได้ไหม" เป็นประโยคใหญ่ — % ตรงกัน · ชอบอะไรเหมือนกัน · งบต่อมื้อ
// ข้อมูลจริงจาก Food DNA ของทั้งสองฝั่งเท่านั้น: ผู้ชมยังไม่มี DNA → ชวนทำแบบทดสอบ / ยังไม่ล็อกอิน → ชวนเข้าสู่ระบบ (ไม่เดา %)
function ppuSharedTastes(a, b) {
	var out = [];
	["ชอบหมวด", "ชอบรส", "ชอบชาติอาหาร"].forEach(function(k) {
		var mine = Array.isArray(a[k]) ? a[k] : [];
		(Array.isArray(b[k]) ? b[k] : []).forEach(function(v) {
			if (v && mine.indexOf(v) !== -1 && out.length < 3) out.push(catLabel(v));
		});
	});
	return out;
}
function ppuRenderTaste(dna, isMe) {
	var el = document.getElementById("ppuTaste");
	el.innerHTML = "";
	el.className = "ppu-taste";
	if (!dna || isMe) { el.hidden = true; return; }
	var name = document.getElementById("ppuName").textContent;
	var budget = Number(dna.งบเฉลี่ยที่ใช้บ่อย);
	var budgetText = budget > 0 ? t("publicprofile.budgetPill").replace("{n}", Math.round(budget)) : "";
	var meUser = typeof getMe === "function" ? getMe() : null;
	function line(cls, text) {
		var p = document.createElement("p");
		p.className = cls;
		p.textContent = text;
		el.appendChild(p);
		return p;
	}
	if (meUser && meUser.foodDNA && typeof คำนวณความชอบคล้ายกัน === "function") {
		var pct = คำนวณความชอบคล้ายกัน(meUser.foodDNA, dna);
		var head = document.createElement("p");
		head.className = "ppu-taste-head";
		head.innerHTML = '<b class="ppu-taste-pct"></b><span></span>';
		head.querySelector("b").textContent = pct + "%";
		head.querySelector("span").textContent = t("publicprofile.tasteMatchLabel");
		el.appendChild(head);
		var shared = ppuSharedTastes(meUser.foodDNA, dna);
		line("ppu-taste-shared", shared.length
			? t("publicprofile.tasteShared").replace("{name}", name).replace("{list}", shared.join(", "))
			: t("publicprofile.tasteNoShared").replace("{name}", name));
		// งบ · ที่มาของ % — แต่ละท่อนไม่ตัดกลางคำ ถ้ายาวเกินจะขึ้นบรรทัดใหม่ทั้งท่อน
		var foot = line("ppu-taste-foot", "");
		[budgetText, t("publicprofile.tasteHow")].filter(Boolean).forEach(function(txt, i) {
			if (i) foot.appendChild(document.createTextNode(" · "));
			var seg = document.createElement("span");
			seg.className = "ppu-taste-seg";
			seg.textContent = txt;
			foot.appendChild(seg);
		});
	} else {
		el.classList.add("is-invite");
		line("ppu-taste-shared", t("publicprofile.tasteInvite").replace("{name}", name));
		if (budgetText) line("ppu-taste-foot", budgetText);
		var cta;
		if (meUser) {
			cta = document.createElement("a");
			cta.href = "profile-setup.html";
			cta.innerHTML = '<i class="fas fa-flask" aria-hidden="true"></i><span></span>';
			cta.querySelector("span").textContent = t("publicprofile.tasteTakeTest");
		} else {
			cta = document.createElement("button");
			cta.type = "button";
			cta.innerHTML = '<i class="fas fa-right-to-bracket" aria-hidden="true"></i><span></span>';
			cta.querySelector("span").textContent = t("publicprofile.tasteLogin");
			cta.addEventListener("click", function() { if (typeof openAuthPop === "function") openAuthPop("register"); });
		}
		cta.className = "jbtn jbtn-quiet ppu-taste-cta";
		el.appendChild(cta);
	}
	el.hidden = false;
}
// ดึง Food DNA + วันที่สมัครล่าสุดจาก Supabase (คนที่ไม่เคยเห็นในเครื่องนี้ หรืออัปเดตจากเครื่องอื่น)
function ppLoadFoodDna(userId, localDna) {
	var isMe = !!(ppSession && ppSession.id === userId);
	ppRenderFoodDna(localDna || null, isMe);
	if (typeof sbClient === "undefined" || !sbClient || !/^[0-9a-f-]{36}$/i.test(userId)) return;
	Promise.resolve(sbClient.from("profiles").select("food_dna, created_at").eq("id", userId).single()).then(function(res) {
		if (res.error || !res.data || ppUid !== userId) return;
		if (res.data.food_dna) ppRenderFoodDna(res.data.food_dna, isMe);
		var joined = res.data.created_at ? new Date(res.data.created_at) : null;
		if (joined && !isNaN(joined.getTime())) {
			var el = document.getElementById("ppuJoined");
			el.textContent = t("publicprofile.joined").replace("{d}", joined.toLocaleDateString(getLang() === "th" ? "th-TH" : "en-GB", { month: "long", year: "numeric" }));
			el.hidden = false;
		}
	}).catch(function() {});
}

/* --- @ชื่อผู้ใช้ และเลเวล — เลเวลคนอื่นนับจากกิจกรรมจริงบนเซิร์ฟเวอร์ (SQL Phase 24) เท่านั้น
   ถ้าถามไม่ได้ (ยังไม่รัน SQL / บัญชีทดลองในเครื่อง) คงป้าย "นักชิม ChimChim" ไว้ ไม่เดาเลเวล --- */
function ppuSetHandle(username) {
	var el = document.getElementById("ppuHandle");
	el.textContent = username ? "@" + username : "";
	el.hidden = !username;
}
function ppuLoadLevel(userId) {
	if (typeof sbFetchPublicXp !== "function" || typeof เลเวลจากXP !== "function") return;
	sbFetchPublicXp(userId).then(function(counts) {
		if (!counts || ppUid !== userId) return;
		var lv = เลเวลจากXP(xpจากจำนวน(counts));
		// ฉายาที่เจ้าของเลือก (SQL Phase 29) — ไม่เลือก = ชื่อเลเวลปัจจุบัน
		var tl = counts.titleLevel;
		var title = tl && tl <= lv.level && CHIMCHIM_LEVELS[tl - 1] ? t(CHIMCHIM_LEVELS[tl - 1].name) : lv.name;
		var role = document.getElementById("ppuRole");
		role.innerHTML = '<i class="fas fa-medal" aria-hidden="true"></i><span></span>';
		role.querySelector("span").textContent = t("publicprofile.levelPill").replace("{n}", lv.level).replace("{name}", title);
		role.title = t("publicprofile.levelHow").replace("{n}", lv.level);
		var note = document.getElementById("ppuLevelNote");
		if (note) {
			note.textContent = t("publicprofile.levelHow").replace("{n}", lv.level);
			note.hidden = false;
		}
	});
}

/* --- หัวโปรไฟล์แบบโชว์เคส: ปกจากรูปไดอารี่ล่าสุด · ชิปหมวดที่ชอบ (Food DNA) · มหาวิทยาลัย
   ทุกอย่างมาจากข้อมูลจริงที่ผู้ชมมีสิทธิ์เห็น — ไม่มีรูปก็ใช้ปกสีพื้น ไม่มีข้อมูลก็ซ่อนส่วนนั้น --- */
function ppuRenderCover(entries) {
	var cover = document.getElementById("ppuCover");
	var pics = (entries || []).filter(function(e) { return e.img; }).slice(0, 3);
	cover.innerHTML = "";
	cover.classList.toggle("has-photos", pics.length > 0);
	cover.setAttribute("data-count", String(pics.length));
	if (!pics.length) {
		var dino = document.createElement("img");
		dino.className = "ppu-cover-dino";
		dino.src = "img/Dino/7.png";
		dino.alt = "";
		dino.decoding = "async";
		cover.appendChild(dino);
	}
	pics.forEach(function(e) {
		var img = document.createElement("img");
		img.alt = "";
		img.loading = "lazy";
		img.decoding = "async";
		img.src = safeImgSrc(e.img);
		cover.appendChild(img);
	});
}
function ppuSetLocation(text) {
	var el = document.getElementById("ppuLoc");
	el.querySelector("span").textContent = text || "";
	el.hidden = !text;
}
// มหาวิทยาลัย (SQL Phase 6) — แยก query เผื่อยังไม่รัน SQL จะได้ไม่ทำให้ส่วนอื่นพัง
function ppuLoadLocation(user) {
	ppuSetLocation(user.university || "");
	if (typeof sbClient === "undefined" || !sbClient || !/^[0-9a-f-]{36}$/i.test(user.id)) return;
	Promise.resolve(sbClient.from("profiles").select("university").eq("id", user.id).single()).then(function(res) {
		if (!res.error && res.data && res.data.university && ppUid === user.id) ppuSetLocation(res.data.university);
	}).catch(function() {});
}

/* --- แท็บรีวิว: รีวิวร้านที่คนนี้เขียนจริง (ตาราง reviews อ่านได้สาธารณะ + ที่มีในเครื่อง) พร้อมคะแนนเฉลี่ยแยกด้าน --- */
function ppuReviewStars(avg) {
	var full = Math.round(avg);
	var out = "";
	for (var i = 1; i <= 5; i++) out += '<i class="fa' + (i <= full ? "s" : "r") + ' fa-star"></i>';
	return out;
}
function ppuRenderReviews(list, byReviewer) {
	var box = document.getElementById("ppuRevList");
	var sum = document.getElementById("ppuRevSummary");
	box.innerHTML = "";
	ppuText("ppuStatReviews", list.length);
	if (!list.length) {
		sum.hidden = true;
		document.getElementById("ppuRevEmpty").hidden = false;
		document.getElementById("ppuStatRating").textContent = "–";
		return;
	}
	document.getElementById("ppuRevEmpty").hidden = true;
	function avgOf(key) { return list.reduce(function(a, r) { return a + (Number(r[key]) || 0); }, 0) / list.length; }
	var cats = [["taste", "review.taste"], ["atmosphere", "review.atmosphere"], ["service", "review.service"]];
	var overall = (avgOf("taste") + avgOf("atmosphere") + avgOf("service")) / 3;
	var fmt = function(n) { return (Math.round(n * 10) / 10).toFixed(1); };
	document.getElementById("ppuStatRating").textContent = "★" + fmt(overall);
	document.getElementById("ppuRevAvg").textContent = fmt(overall);
	document.getElementById("ppuRevStars").innerHTML = ppuReviewStars(overall);
	document.getElementById("ppuRevCount").textContent = t("publicprofile.reviewsCount").replace("{n}", list.length);
	var dl = document.getElementById("ppuRevCats");
	dl.innerHTML = "";
	cats.forEach(function(c) {
		var row = document.createElement("div");
		row.innerHTML = "<dt></dt><dd></dd>";
		row.querySelector("dt").textContent = t(c[1]);
		row.querySelector("dd").textContent = fmt(avgOf(c[0]));
		dl.appendChild(row);
	});
	sum.hidden = false;
	list.slice().sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); }).forEach(function(r) {
		var shop = !byReviewer && typeof หาร้านจากId === "function" ? หาร้านจากId(Number(r.shopId)) : null;
		var avg = (Number(r.taste) + Number(r.atmosphere) + Number(r.service)) / 3;
		var card = document.createElement("article");
		card.className = "ppu-review";
		card.innerHTML =
			'<header><span class="ppu-review-score"><i class="fas fa-star" aria-hidden="true"></i> <b></b></span><time></time></header>' +
			(byReviewer ? (r.userId ? '<a class="ppu-review-who">' : '<span class="ppu-review-who">') + '<span class="ppu-review-avt" aria-hidden="true"></span><b class="ppu-review-name"></b>' + (r.userId ? "</a>" : "</span>")
				: shop ? '<a class="ppu-review-shop"></a>' : '<span class="ppu-review-shop"></span>') +
			(r.text ? '<p class="ppu-review-text"></p>' : "") +
			(r.images && r.images.length ? '<div class="ppu-review-imgs"></div>' : "");
		card.querySelector("b").textContent = fmt(avg);
		card.querySelector("time").textContent = ppFormatDate(r.date);
		if (r.date) card.querySelector("time").setAttribute("datetime", r.date);
		if (byReviewer) {
			// รีวิวของร้าน: บอกว่าใครรีวิว (มีบัญชีจริงกดไปโปรไฟล์ได้ / รีวิวแบบไม่ล็อกอินเป็นชื่อเฉย ๆ)
			var who = card.querySelector(".ppu-review-who");
			var name = r.author || t("common.anonymousFoodie");
			var avt = who.querySelector(".ppu-review-avt");
			var avatarUrl = r.userId && ppReviewerAvatars[r.userId];
			if (avatarUrl) avt.style.backgroundImage = "url('" + cssUrl(avatarUrl) + "')";
			else avt.textContent = name.trim().charAt(0).toUpperCase();
			who.querySelector(".ppu-review-name").textContent = name;
			if (r.userId) who.href = "public-profile.html?u=" + encodeURIComponent(r.userId);
		} else {
			var shopEl = card.querySelector(".ppu-review-shop");
			shopEl.textContent = shop ? shop.ร้าน : t("publicprofile.unknownShop");
			if (shop) shopEl.href = "restaurant.html?id=" + encodeURIComponent(shop.id);
		}
		if (r.text) card.querySelector(".ppu-review-text").textContent = r.text;
		if (r.images && r.images.length) {
			var imgs = card.querySelector(".ppu-review-imgs");
			r.images.slice(0, 4).forEach(function(src, i) {
				var b = document.createElement("button");
				b.type = "button";
				b.setAttribute("aria-label", t("photos.openN").replace("{i}", i + 1).replace("{n}", r.images.length));
				b.innerHTML = '<img alt="" loading="lazy" decoding="async"/>';
				b.querySelector("img").src = safeImgSrc(src);
				b.addEventListener("click", function() { openPhotoViewer(r.images, i); });
				imgs.appendChild(b);
			});
		}
		box.appendChild(card);
	});
}

/* --- แท็บไดอารี่: การ์ดรูปอาหาร (ล่าสุด 12 รายการ) กดแล้วเปิดรายละเอียดในหน้าไดอารี่เดิม --- */
function ppuEntryCard(user, e) {
	var li = document.createElement("li");
	li.innerHTML =
		'<a class="ppu-entry">' +
			(e.img ? '<img class="ppu-entry-img" alt="" loading="lazy" decoding="async"/>' : '<span class="ppu-entry-noimg" aria-hidden="true"></span>') +
			'<span class="ppu-entry-body">' +
				'<b class="ppu-entry-dish"></b>' +
				'<span class="ppu-entry-meta"></span>' +
				(e.note ? '<p class="ppu-entry-note"></p>' : "") +
			"</span>" +
		"</a>";
	var a = li.querySelector("a");
	a.href = "diary.html?u=" + encodeURIComponent(user.id) + "&entry=" + encodeURIComponent(e.id) + "&date=" + encodeURIComponent(e.date);
	if (e.img) li.querySelector("img").src = safeImgSrc(e.img);
	else {
		// ไอคอนหมวดจากร้านที่ผูกไว้ (ถ้ามี) — catEmoji คืน <i> ที่ระบบสร้างเอง ไม่มีข้อความจากผู้ใช้
		var shopRef = e.shopId && typeof หาร้านจากId === "function" ? หาร้านจากId(Number(e.shopId)) : null;
		li.querySelector(".ppu-entry-noimg").innerHTML = shopRef && typeof catEmoji === "function" ? catEmoji(shopRef.หมวด) : '<i class="fas fa-utensils"></i>';
	}
	li.querySelector("b").textContent = e.dish;
	var meta = li.querySelector(".ppu-entry-meta");
	function metaItem(icon, text) {
		if (!text) return;
		var s = document.createElement("span");
		s.innerHTML = '<i class="fas fa-' + icon + '" aria-hidden="true"></i>';
		s.appendChild(document.createTextNode(text));
		meta.appendChild(s);
	}
	metaItem("store", e.shop);
	metaItem("calendar", diaryFormatDate(e.date));
	if (e.rating && typeof diaryFeelingLabel === "function") metaItem("face-smile", diaryFeelingLabel(e.rating));
	if (e.note) li.querySelector(".ppu-entry-note").textContent = e.note;
	a.setAttribute("aria-label", [e.dish, e.shop, diaryFormatDate(e.date), e.rating && typeof diaryFeelingLabel === "function" ? diaryFeelingLabel(e.rating) : "", e.note].filter(Boolean).join(", "));
	return li;
}
// สถานะของแท็บไดอารี่ไม่เป็นทางตัน: ส่วนตัว → บอกตรง ๆ ว่าติดตามแล้วก็ไม่เห็น + พาไปดูรสนิยม / โหลดไม่ได้ → ลองใหม่
function ppuDiaryMessage(msgKey, opts) {
	opts = opts || {};
	document.getElementById("ppDiaryList").hidden = true;
	document.getElementById("ppDiaryAll").hidden = true;
	document.getElementById("ppDiaryState").hidden = false;
	document.getElementById("ppDiaryMsg").textContent = opts.text || t(msgKey);
	var hint = document.getElementById("ppDiaryHint");
	hint.textContent = opts.hint || "";
	hint.hidden = !opts.hint;
	document.getElementById("ppDiaryIcon").className = "fas " + (opts.locked ? "fa-lock" : "fa-book-open");
	document.getElementById("ppDiaryLogin").hidden = !opts.login;
	document.getElementById("ppDiaryRetry").hidden = !opts.retry;
	document.getElementById("ppDiaryTaste").hidden = !opts.taste;
	document.getElementById("ppDiaryAdd").hidden = !opts.add;
}
// จำนวนมื้อ/ร้านอยู่ในแท็บ ("ไดอารี่ 6" / "ร้านโปรด 3") — บรรทัดใต้ชื่อเหลือแค่ผู้ติดตาม จึงไม่ตกบรรทัดเมื่อเลขยาวขึ้น
// ตัวเลขจริง / แม่กุญแจ + คำว่า "ส่วนตัว" (อ่านได้ทั้งตาและ screen reader) / ซ่อนเมื่อไม่รู้ ไม่โชว์ "–"
function ppuSetCount(numId, value) {
	var num = document.getElementById(numId);
	if (value === "locked") {
		num.innerHTML = '<i class="fas fa-lock" aria-hidden="true"></i><span class="jvisually-hidden"></span>';
		num.querySelector("span").textContent = t("publicprofile.statLocked");
		num.hidden = false;
	} else if (value === null || value === undefined) {
		num.hidden = true;
	} else {
		num.textContent = formatLikeCount(value);
		num.hidden = false;
	}
}
function ppuSetDiaryCounts(diary, shops) {
	ppuSetCount("ppuStatDiary", diary);
	ppuSetCount("ppuStatShops", shops);
}
function ppRenderDiary(user) {
	var loading = document.getElementById("ppDiaryLoading");
	loading.hidden = false;
	document.getElementById("ppDiaryState").hidden = true;
	document.getElementById("ppDiaryLogin").onclick = function() { if (typeof openAuthPop === "function") openAuthPop("login"); };
	document.getElementById("ppDiaryRetry").onclick = function() { ppRenderDiary(user); };
	document.getElementById("ppDiaryTaste").onclick = function() { ppuShowTab("about", true); };
	if (typeof diaryLoadFor !== "function") {
		loading.hidden = true;
		ppuDiaryMessage("publicprofile.diaryFailed", { retry: true });
		ppRenderFavShops(null, "publicprofile.diaryFailed");
		return;
	}
	diaryLoadFor(user.id).then(function(res) {
		loading.hidden = true;
		var blocked = res.visibility === "private" && !res.own;
		if (res.error === "auth" || blocked || (res.error && !res.entries.length)) {
			if (res.error === "auth") {
				ppuDiaryMessage("publicprofile.diaryLoginOnce", { login: true });
				ppRenderFavShops(null, "publicprofile.diaryLoginOnce");
				ppuSetDiaryCounts(null, null);
			} else if (blocked) {
				ppuDiaryMessage(null, {
					text: t("publicprofile.diaryPrivateName").replace("{name}", user.name || ""),
					hint: t("publicprofile.diaryPrivateHint"),
					locked: true,
					taste: true
				});
				ppRenderFavShops(null, "publicprofile.shopsPrivate", true);
				ppuSetDiaryCounts("locked", "locked");
			} else {
				ppuDiaryMessage("publicprofile.diaryFailed", { retry: true });
				ppRenderFavShops(null, "publicprofile.diaryFailed");
				ppuSetDiaryCounts(null, null);
			}
			return;
		}
		var entries = res.entries || [];
		ppuRenderCover(entries);
		ppuSetDiaryCounts(entries.length, typeof diaryShopCount === "function" ? diaryShopCount(entries) : null);
		ppRenderFavShops(entries, null);
		if (!entries.length) {
			ppuDiaryMessage("publicprofile.diaryEmpty", { add: !!res.own });
			return;
		}
		var list = document.getElementById("ppDiaryList");
		list.innerHTML = "";
		entries.slice(0, PPU_DIARY_MAX).forEach(function(e) { list.appendChild(ppuEntryCard(user, e)); });
		list.hidden = false;
		document.getElementById("ppDiaryState").hidden = true;
		var all = document.getElementById("ppDiaryAll");
		all.href = "diary.html?u=" + encodeURIComponent(user.id);
		all.querySelector("span").textContent = t("publicprofile.diaryAllN").replace("{n}", formatLikeCount(entries.length));
		all.hidden = entries.length <= PPU_DIARY_MAX;
	});
}

/* --- แท็บร้านโปรด: รวมร้านจากไดอารี่ที่ผู้ชมมีสิทธิ์เห็น เรียงตามจำนวนมื้อ --- */
function ppRenderFavShops(entries, msgKey, locked) {
	var list = document.getElementById("ppShopsList");
	var state = document.getElementById("ppShopsState");
	var note = document.getElementById("ppShopsNote");
	function message(key) {
		list.hidden = true;
		note.hidden = true;
		state.hidden = false;
		document.getElementById("ppShopsMsg").textContent = t(key);
		document.getElementById("ppShopsIcon").className = "fas " + (locked ? "fa-lock" : "fa-store");
	}
	if (msgKey) { message(msgKey); return; }
	var groups = {};
	entries.forEach(function(e) {
		var name = (e.shop || "").trim();
		if (!name) return;
		var key = name.toLowerCase();
		var g = groups[key] || (groups[key] = { name: name, shopId: null, n: 0, last: "" });
		g.n++;
		if (!g.shopId && e.shopId) g.shopId = e.shopId;
		if (e.date > g.last) g.last = e.date;
	});
	var rows = Object.keys(groups).map(function(k) { return groups[k]; }).sort(function(a, b) {
		return b.n - a.n || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0);
	}).slice(0, 10);
	if (!rows.length) { message("publicprofile.shopsEmpty"); return; }
	list.innerHTML = "";
	rows.forEach(function(g, i) {
		var shop = g.shopId && typeof หาร้านจากId === "function" ? หาร้านจากId(Number(g.shopId)) : null;
		var li = document.createElement("li");
		li.innerHTML =
			(shop ? '<a class="ppu-shop">' : '<div class="ppu-shop">') +
				'<span class="ppu-shop-rank">' + (i + 1) + "</span>" +
				'<span class="ppu-shop-text"><b></b><small></small></span>' +
				(shop ? '<i class="fas fa-chevron-right" aria-hidden="true"></i></a>' : "</div>");
		if (shop) li.querySelector("a").href = "restaurant.html?id=" + encodeURIComponent(shop.id);
		li.querySelector("b").textContent = g.name;
		li.querySelector("small").textContent = t("publicprofile.visits").replace("{n}", g.n) + " · " + t("publicprofile.lastVisit").replace("{d}", diaryFormatDate(g.last));
		list.appendChild(li);
	});
	list.hidden = false;
	note.hidden = false;
	state.hidden = true;
}

/* --- ปุ่มติดตาม + ตัวเลขผู้ติดตาม/กำลังติดตาม (นับจริงจากตาราง follows) --- */
function ppuSetupFollow(user, isMe) {
	var btn = document.getElementById("ppuFollow");
	var followers = null;
	function paint() {
		var on = isUserFollowed(user.id);
		btn.classList.toggle("is-on", on);
		btn.setAttribute("aria-pressed", on ? "true" : "false");
		btn.innerHTML = on
			? '<i class="fas fa-check" aria-hidden="true"></i><span>' + escapeHtml(t("publicprofile.followingBtn")) + "</span>"
			: '<i class="fas fa-user-plus" aria-hidden="true"></i><span>' + escapeHtml(t("publicprofile.followBtn")) + "</span>";
	}
	// ปุ่มติดตามท้ายไดอารี่ — ซ่อนเมื่อเป็นตัวเอง/ติดตามแล้ว/เป็นโปรไฟล์ร้าน (ไม่มีชื่อส่งมา)
	var end = document.getElementById("ppuEnd");
	var endBtn = document.getElementById("ppuFollowEnd");
	if (!isMe && user.name) {
		document.getElementById("ppuEndMsg").textContent = t("publicprofile.endAsk").replace("{name}", user.name);
		endBtn.querySelector("span").textContent = t("publicprofile.endFollow").replace("{name}", user.name);
		endBtn.addEventListener("click", function() { btn.click(); });
	}
	var basePaint = paint;
	paint = function() {
		basePaint();
		end.hidden = isMe || !user.name || isUserFollowed(user.id);
	};
	if (!isMe) {
		btn.hidden = false;
		paint();
		btn.addEventListener("click", function() {
			var now = toggleFollowUser(user.id);
			if (now === null) return; // ยังไม่ล็อกอิน — เปิดหน้าต่างเข้าสู่ระบบแล้ว
			if (followers !== null) { followers = Math.max(0, followers + (now ? 1 : -1)); ppuText("ppuStatFollowers", followers); }
			paint();
		});
		if (typeof syncLikesAndFollowsWithSupabase === "function") syncLikesAndFollowsWithSupabase(paint);
	}
	if (typeof sbCountRows !== "function") return;
	sbCountRows("follows", { target_type: "profile", target_id: String(user.id) }).then(function(n) {
		if (n === null) return;
		followers = typeof ยอดรวมที่ค้างส่ง === "function" ? ยอดรวมที่ค้างส่ง("follow:profile", user.id, n) : n;
		ppuText("ppuStatFollowers", followers);
	});
	if (/^[0-9a-f-]{36}$/i.test(user.id)) {
		sbCountRows("follows", { follower_id: user.id }).then(function(n) {
			if (n !== null) ppuText("ppuStatFollowing", n);
		});
	}
}

/* --- รายชื่อผู้ติดตาม / กำลังติดตามของคนนี้ (แผ่นเลื่อนขึ้นจากล่าง ใช้หน้าตาเดียวกับหน้าโปรไฟล์ตัวเอง) --- */
function ppuSetupFollowSheet(user) {
	var sheet = document.getElementById("followSheet");
	var list = document.getElementById("fsheetList");
	var currentTab = "followers";
	var lastFocus = null;
	var profiles = {};
	var isUuid = function(id) { return /^[0-9a-f-]{36}$/i.test(String(id)); };
	function message(key) {
		list.innerHTML = '<p class="fsheet-empty"></p>';
		list.querySelector("p").textContent = t(key);
	}
	function rowEl(r) {
		var el = document.createElement("div");
		el.className = "fsrow";
		el.innerHTML = '<a class="fsrow-main">' +
			(r.avatar ? '<span class="fsrow-avatar" style="background-image:url(\'' + cssUrl(r.avatar) + '\')"></span>'
				: '<span class="fsrow-avatar fsrow-letter">' + escapeHtml((r.name || "?").trim().charAt(0).toUpperCase()) + "</span>") +
			'<span class="fsrow-text"><b></b><small></small></span></a>';
		el.querySelector("a").href = r.link;
		el.querySelector("b").textContent = r.name;
		el.querySelector("small").textContent = r.sub;
		return el;
	}
	function fetchProfiles(ids) {
		var need = ids.filter(function(id) { return isUuid(id) && !profiles[id]; });
		if (!need.length) return Promise.resolve();
		return Promise.resolve(sbClient.from("profiles").select("id, name, avatar_url").in("id", need)).then(function(res) {
			(res && res.data || []).forEach(function(p) { profiles[p.id] = { name: p.name, avatar: p.avatar_url || null }; });
		});
	}
	function resolve(type, id) {
		if (type === "shop") {
			var shop = หาร้านจากId(Number(id));
			return shop ? { name: shop.ร้าน, avatar: shop.รูป, sub: catLabel(shop.หมวด), link: "restaurant.html?id=" + shop.id } : null;
		}
		if (/^bu-/.test(id)) {
			var bu = หาเพจร้านBUจากId(id.slice(3));
			return bu ? { name: bu.name, avatar: bu.avatar, sub: t("following.restaurants"), link: "public-profile.html?u=" + encodeURIComponent(id) } : null;
		}
		if (type === "page") {
			var page = typeof getPageById === "function" ? getPageById(id) : null;
			return page ? { name: page.name, avatar: page.avatar, sub: t("following.restaurants"), link: "public-profile.html?u=page-" + encodeURIComponent(id) } : null;
		}
		var p = profiles[id];
		return p && p.name ? { name: p.name, avatar: p.avatar, sub: t("following.foodie"), link: "public-profile.html?u=" + encodeURIComponent(id) } : null;
	}
	function showTab(tab) {
		currentTab = tab;
		sheet.querySelectorAll(".fsheet-tab").forEach(function(b) {
			var on = b.getAttribute("data-tab") === tab;
			b.classList.toggle("active", on);
			b.setAttribute("aria-selected", on ? "true" : "false");
			b.tabIndex = on ? 0 : -1;
		});
		document.getElementById("fsTitle").textContent = t(tab === "followers" ? "publicprofile.sheetFollowers" : "publicprofile.sheetFollowing").replace("{name}", user.name || "");
		if (typeof sbClient === "undefined" || !sbClient || (tab === "following" && !isUuid(user.id))) { message("publicprofile.listFailed"); return; }
		list.innerHTML = '<p class="fsheet-empty"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i></p>';
		var q = tab === "followers"
			? sbClient.from("follows").select("follower_id, created_at").eq("target_type", "profile").eq("target_id", String(user.id))
			: sbClient.from("follows").select("target_type, target_id, created_at").eq("follower_id", user.id);
		Promise.resolve(q.order("created_at", { ascending: false })).then(function(res) {
			if (res.error) throw res.error;
			var items = (res.data || []).map(function(r) {
				return tab === "followers" ? { type: "profile", id: r.follower_id } : { type: r.target_type, id: r.target_id };
			});
			document.getElementById(tab === "followers" ? "fsCountFollowers" : "fsCountFollowing").textContent = items.length;
			return fetchProfiles(items.filter(function(x) { return x.type === "profile"; }).map(function(x) { return x.id; })).then(function() { return items; });
		}).then(function(items) {
			if (currentTab !== tab) return;
			var rows = items.map(function(x) { return resolve(x.type, x.id); }).filter(Boolean);
			if (!rows.length) { message(tab === "followers" ? "publicprofile.followersNone" : "publicprofile.followingNone"); return; }
			list.innerHTML = "";
			rows.forEach(function(r) { list.appendChild(rowEl(r)); });
		}).catch(function() { if (currentTab === tab) message("publicprofile.listFailed"); });
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
	document.getElementById("fsTitle").textContent = t("publicprofile.sheetFollowers").replace("{name}", user.name || "");
	document.getElementById("ppuFollowersBtn").addEventListener("click", function() { open("followers"); });
	document.getElementById("ppuFollowingBtn").addEventListener("click", function() { open("following"); });
	sheet.querySelectorAll(".fsheet-tab").forEach(function(b) {
		b.addEventListener("click", function() { showTab(b.getAttribute("data-tab")); });
	});
	document.getElementById("fsheetClose").addEventListener("click", close);
	sheet.addEventListener("click", function(e) { if (e.target === sheet) close(); });
	document.addEventListener("keydown", function(e) {
		if (sheet.hidden) return;
		if (e.key === "Escape") { close(); return; }
		if (e.key !== "Tab") return;
		// วนโฟกัสอยู่ในแผ่นรายชื่อ ไม่หลุดไปหน้าข้างหลัง
		var items = Array.prototype.filter.call(sheet.querySelectorAll("button, a[href]"), function(el) { return !el.disabled && el.tabIndex >= 0 && el.getClientRects().length; });
		if (!items.length) return;
		var first = items[0], last = items[items.length - 1];
		var inside = sheet.contains(document.activeElement);
		if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
		else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
	});
}

/* =====================================================================
   โปรไฟล์ร้านแบบโชว์เคส (อิงหน้าโปรไฟล์ Fastwork) — ใช้การ์ดเดียวกับโปรไฟล์นักชิม (#ppUser) เปลี่ยนเนื้อหาเป็นของร้าน
   ปกจากรูปโพสต์ร้าน · สถิติ โพสต์/รีวิว/คะแนน/ราคา · แท็บ โพสต์ (masonry) / เมนู / รีวิว / เกี่ยวกับ
   ข้อมูลจริงทั้งหมด: เพจร้าน (โพสต์/bio) + รายการเมนูของร้าน + รีวิวจริงของร้านนี้ (ผูกด้วย shopId)
   ===================================================================== */
function ppuSetText(el, key) {
	el.removeAttribute("data-i18n");
	el.textContent = t(key);
}
// การ์ดโพสต์ร้านแบบกริดโปรไฟล์ TikTok: รูปแนวตั้ง 3:4 เต็มช่อง ไม่มีข้อความใต้รูป
// มุมล่างซ้าย = ยอดถูกใจจริงของโพสต์ (ดึงจาก Supabase ทีละชุด) / มุมขวาบน = มีหลายรูป / โพสต์ข้อความล้วนแสดงข้อความในช่อง
function ppuPostCard(p, poster) {
	var images = typeof getPostImages === "function" ? getPostImages(p) : (p.images && p.images.length ? p.images : [p.img]);
	images = (images || []).filter(Boolean);
	var li = document.createElement("li");
	li.innerHTML =
		'<button type="button" class="ppu-post' + (images.length ? "" : " is-text") + '">' +
			(images.length ? '<img alt="" loading="lazy" decoding="async"/>' : '<span class="ppu-post-text"></span>') +
			(images.length > 1 ? '<span class="ppu-post-multi" aria-hidden="true"><i class="fas fa-clone"></i></span>' : "") +
			'<span class="ppu-post-likes" aria-hidden="true"><i class="far fa-heart"></i><b></b></span>' +
		"</button>";
	var btn = li.querySelector("button");
	if (images.length) li.querySelector("img").src = safeImgSrc(images[0]);
	else li.querySelector(".ppu-post-text").textContent = p.caption || "";
	var likesEl = li.querySelector(".ppu-post-likes b");
	likesEl.textContent = formatLikeCount(getPostLikeCount(p.id));
	if (typeof queuePostLikeCountFetch === "function") queuePostLikeCountFetch(p.id, likesEl);
	btn.setAttribute("aria-label", (p.caption || poster.name) + (images.length > 1 ? " · " + t("common.photoCount").replace("{n}", images.length) : ""));
	btn.addEventListener("click", function() {
		openPostView({ id: p.id, images: images, caption: p.caption, posterName: poster.name, posterColor: poster.color, posterId: p.userId || null });
	});
	return li;
}
function ppuLoadShopReviews(shopId) {
	if (!shopId) { ppuRenderReviews([], true); return; }
	var local = getReviews(shopId).map(function(r) { return Object.assign({ shopId: shopId }, r); });
	ppuRenderReviews(local, true);
	if (typeof sbClient === "undefined" || !sbClient) return;
	document.getElementById("ppuRevLoading").hidden = false;
	Promise.resolve(sbClient.from("reviews").select("*").eq("shop_id", shopId).order("created_at", { ascending: false })).then(function(res) {
		if (res.error || !res.data) return null;
		if (res.data.length) mergeRemoteReviewsIntoLocal(shopId, res.data.map(sbReviewRowToLocal));
		var ids = res.data.map(function(row) { return row.user_id; }).filter(function(id, i, a) { return id && a.indexOf(id) === i; });
		if (!ids.length) return null;
		return Promise.resolve(sbClient.from("profiles").select("id, avatar_url").in("id", ids)).then(function(p) {
			(p && p.data || []).forEach(function(x) { if (x.avatar_url) ppReviewerAvatars[x.id] = x.avatar_url; });
		});
	}).catch(function() {}).then(function() {
		document.getElementById("ppuRevLoading").hidden = true;
		ppuRenderReviews(getReviews(shopId).map(function(r) { return Object.assign({ shopId: shopId }, r); }), true);
	});
}
function ppRenderShopShowcase(o) {
	document.title = o.name + " - ChimChim";
	document.getElementById("ppContent").hidden = true;
	document.getElementById("ppUser").hidden = false;
	document.getElementById("ppUser").classList.add("is-shop");
	var menu = o.shopId ? หาร้านจากId(Number(o.shopId)) : null;
	var isOwner = !!(o.ownerId && ppSession && ppSession.id === o.ownerId);

	// หัวโปรไฟล์
	var avatar = document.getElementById("ppuAvatar");
	if (o.avatar) avatar.style.backgroundImage = "url('" + cssUrl(o.avatar) + "')";
	else avatar.textContent = o.name.trim().charAt(0).toUpperCase();
	document.getElementById("ppuName").textContent = o.name;
	document.getElementById("ppuRole").innerHTML = '<i class="fas fa-store" aria-hidden="true"></i><span></span>';
	document.getElementById("ppuRole").querySelector("span").textContent = t(o.levelKey);
	var handle = document.getElementById("ppuHandle");
	handle.innerHTML = catEmoji(o.cat) + " " + escapeHtml(catLabel(o.cat)); // catEmoji คืนไอคอน HTML ที่ระบบสร้างเอง
	handle.hidden = false;
	document.getElementById("ppuFollowingBtn").hidden = true; // ร้านไม่ได้ติดตามใคร
	var bio = (o.bio || "").trim();
	var bioEl = document.getElementById("ppuBio");
	bioEl.textContent = bio;
	bioEl.hidden = !bio;
	if (menu && menu.มหาลัย) ppuSetLocation(menu.มหาลัย + (menu.ระยะทาง ? " · " + distanceText(menu.ระยะทาง) : ""));
	var chipBox = document.getElementById("ppuChips");
	(menu && menu.แท็ก || []).slice(0, 3).forEach(function(tag) {
		var chip = document.createElement("span");
		chip.className = "ppu-chip";
		chip.textContent = tag;
		chipBox.appendChild(chip);
	});
	chipBox.hidden = !chipBox.children.length;

	// ปกร้าน: ใช้เฉพาะรูปปกที่ร้านอัปโหลดเอง (o.cover) — ไม่ดึงรูปจากโพสต์มาทำปกแล้ว
	// ยังไม่มีรูปปก = ปกสีพื้นพร้อมน้องไดโน (แบบเดียวกับโปรไฟล์ที่ยังไม่มีรูป)
	ppuRenderCover(o.cover ? [{ img: o.cover }] : []);

	// สถิติ: โพสต์ · รีวิว · คะแนน · ราคา
	var stats = document.querySelector("#ppUser .ppu-stats");
	stats.innerHTML =
		"<li><b>" + formatLikeCount(o.posts.length) + "</b><span></span></li>" +
		'<li><b id="ppuStatReviews">–</b><span></span></li>' +
		'<li><b id="ppuStatRating">–</b><span></span></li>' +
		"<li><b>" + (menu ? "฿" + menu.ราคาต่ำ + "–" + menu.ราคาสูง : "–") + "</b><span></span></li>";
	var labels = ["publicprofile.statPosts", "publicprofile.statReviews", "publicprofile.statRatingShort", "publicprofile.statPrice"];
	stats.querySelectorAll("span").forEach(function(sp, i) { sp.textContent = t(labels[i]); });

	// แท็บ: โพสต์ / เมนู / รีวิว / เกี่ยวกับ
	ppuSetText(document.getElementById("ppuTabDiary"), "publicprofile.tabPosts");
	ppuSetText(document.getElementById("ppuTabShops"), "publicprofile.tabMenu");

	// แท็บโพสต์ — masonry ใหม่สุดก่อน (id โพสต์ผูกกับลำดับเดิม ไลก์/คอมเมนต์อ้าง id นี้)
	document.getElementById("ppDiaryLoading").hidden = true;
	var posts = o.posts.map(function(p, idx) {
		return Object.assign({}, p, { id: p.id || (ppUid + "-post" + idx), _order: idx });
	}).sort(function(a, b) {
		var ta = a.date ? new Date(a.date).getTime() : (typeof a.daysAgo === "number" ? -a.daysAgo : null);
		var tb = b.date ? new Date(b.date).getTime() : (typeof b.daysAgo === "number" ? -b.daysAgo : null);
		if (ta === null || tb === null || ta === tb) return a._order - b._order;
		return tb - ta;
	});
	var grid = document.getElementById("ppDiaryList");
	posts.forEach(function(p) { grid.appendChild(ppuPostCard(p, { name: o.name, color: o.posterColor })); });
	grid.hidden = !posts.length;
	if (!posts.length) {
		document.getElementById("ppDiaryState").hidden = false;
		document.getElementById("ppDiaryMsg").textContent = t("publicprofile.noPosts");
	}

	// แท็บเมนู — เมนูจริงของร้านจากระบบ (แบบการ์ดบริการของ Fastwork) กดไปหน้ารายละเอียดร้าน
	var menuList = document.getElementById("ppShopsList");
	if (menu) {
		var li = document.createElement("li");
		li.innerHTML =
			'<a class="ppu-menu">' +
				'<img class="ppu-menu-img" alt="" loading="lazy" decoding="async"/>' +
				'<span class="ppu-menu-text"><b></b><span class="ppu-menu-price"></span><small></small></span>' +
				'<i class="fas fa-chevron-right" aria-hidden="true"></i>' +
			"</a>";
		li.querySelector("a").href = "restaurant.html?id=" + encodeURIComponent(menu.id);
		li.querySelector("img").src = safeImgSrc(menu.รูป);
		li.querySelector("b").textContent = menu.เมนู;
		li.querySelector(".ppu-menu-price").textContent = "฿" + menu.ราคาต่ำ + "–" + menu.ราคาสูง;
		li.querySelector("small").textContent = [catLabel(menu.หมวด), (menu.รส || []).join(" · ")].filter(Boolean).join(" · ");
		menuList.appendChild(li);
		menuList.hidden = false;
		document.getElementById("ppShopsState").hidden = true;
	} else {
		document.getElementById("ppShopsState").hidden = false;
		document.getElementById("ppShopsMsg").textContent = t("publicprofile.menuEmpty");
	}

	// แท็บเกี่ยวกับ — bio + ข้อมูลร้านที่มีจริง + ปุ่มแผนที่ (ไม่มี Food DNA สำหรับร้าน)
	var about = document.getElementById("ppuAboutBio");
	about.textContent = bio || t("publicprofile.noBio");
	about.classList.toggle("is-empty", !bio);
	document.getElementById("ppDna").hidden = true;
	document.getElementById("ppDnaNone").hidden = true;
	if (menu) {
		var facts = [
			["publicprofile.factCuisine", menu.ชาติอาหาร],
			["publicprofile.factTaste", (menu.รส || []).join(", ")],
			["publicprofile.factMeals", (menu.มื้อที่เหมาะ || []).join(", ")],
			["publicprofile.statPrice", "฿" + menu.ราคาต่ำ + "–" + menu.ราคาสูง]
		].filter(function(f) { return f[1]; });
		var dl = document.createElement("dl");
		dl.className = "ppu-facts";
		facts.forEach(function(f) {
			var row = document.createElement("div");
			row.innerHTML = "<dt></dt><dd></dd>";
			row.querySelector("dt").textContent = t(f[0]);
			row.querySelector("dd").textContent = f[1];
			dl.appendChild(row);
		});
		document.querySelector("#ppuPaneAbout .ppu-about").appendChild(dl);
	}
	var map = document.createElement("a");
	map.className = "jbtn jbtn-quiet ppu-map";
	map.target = "_blank";
	map.rel = "noopener";
	map.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(o.name + (menu && menu.มหาลัย ? " ใกล้ " + menu.มหาลัย : ""));
	map.innerHTML = '<i class="fas fa-location-dot" aria-hidden="true"></i><span></span>';
	map.querySelector("span").textContent = t("publicprofile.mapBtn");
	document.querySelector("#ppuPaneAbout .ppu-about").appendChild(map);

	// ปุ่ม: เจ้าของเพจเห็นปุ่มตั้งค่าแทนติดตาม
	document.getElementById("ppuShare").addEventListener("click", function() {
		shareLink(location.origin + location.pathname + "?u=" + encodeURIComponent(ppUid), o.name + " - ChimChim");
	});
	ppuSetupFollow({ id: o.followId }, isOwner);
	if (isOwner) {
		var settings = document.createElement("a");
		settings.className = "jbtn jbtn-quiet";
		settings.href = "settings.html";
		settings.innerHTML = '<i class="fas fa-gear" aria-hidden="true"></i><span></span>';
		settings.querySelector("span").textContent = t("settings.title");
		document.getElementById("ppuShare").insertAdjacentElement("beforebegin", settings);
	}
	ppuSetupFollowSheet({ id: o.followId, name: o.name });
	ppuSetupTabs();
	ppuSetText(document.querySelector("#ppuRevEmpty p"), "publicprofile.noReviews");
	ppuLoadShopReviews(o.shopId);
}

if (ppIsBuShop) {
	var buId = ppUid.slice("bu-".length);
	var buShop = หาเพจร้านBUจากId(buId);
	if (!buShop) {
		document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
	} else {
		ppRenderShopShowcase({ followId: ppUid, name: buShop.name, avatar: buShop.avatar, cover: buShop.cover || null, cat: buShop.cat, bio: buShop.bio, posts: buShop.posts, shopId: buShop.menuId, levelKey: "publicprofile.buShopLevel", posterColor: "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))" });
	}
} else if (ppIsPage) {
	var pageId = ppUid.slice("page-".length);
	var page = getPageById(pageId);
	if (!page) {
		document.getElementById("ppContent").innerHTML = '<p style="text-align:center;padding:60px 20px;color:#999;">' + t("common.profileNotFound") + '</p>';
	} else {
		ppRenderShopShowcase({ followId: page.id, name: page.name, avatar: page.avatar, cover: page.cover || null, cat: page.cat, bio: page.bio, posts: getPostsByPage(page.id), shopId: page.numId || null, ownerId: page.ownerId, levelKey: "publicprofile.pageLevel", posterColor: "var(--cream2)" });
	}
} else {
	var users = getUsers();
	var user = users.filter(function(u) { return u.id === ppUid; })[0];
	function renderRealUserProfile(user) {
		var isMe = !!(ppSession && ppSession.id === user.id);
		document.title = user.name + " - ChimChim";
		document.getElementById("ppContent").hidden = true;
		document.getElementById("ppUser").hidden = false;
		var avatar = document.getElementById("ppuAvatar");
		if (user.avatar) {
			avatar.style.backgroundImage = "url('" + cssUrl(user.avatar) + "')";
			avatar.textContent = "";
		} else {
			avatar.textContent = (user.name || "?").trim().charAt(0).toUpperCase();
		}
		document.getElementById("ppuName").textContent = user.name;
		ppuSetHandle(user.username || "");
		if (typeof sbFetchUsername === "function") sbFetchUsername(user.id).then(function(u) { if (u !== null) ppuSetHandle(u); });
		ppuLoadLevel(user.id);
		var bio = (user.bio || "").trim();
		var bioEl = document.getElementById("ppuBio");
		bioEl.textContent = bio;
		bioEl.hidden = !bio;
		// bio แสดงในหัวโปรไฟล์แล้ว แท็บเกี่ยวกับไม่ต้องซ้ำ — เหลือวันที่เข้าร่วม · ที่มาของ Lv · Food DNA
		var aboutBox = document.querySelector("#ppuPaneAbout .ppu-about");
		aboutBox.querySelector("h3").remove();
		document.getElementById("ppuAboutBio").remove();

		document.getElementById("ppuShare").addEventListener("click", function() {
			shareLink(location.origin + location.pathname + "?u=" + encodeURIComponent(user.id), user.name + " - ChimChim");
		});
		ppuSetupFollow(user, isMe);
		ppuSetupFollowSheet(user);
		// โปรไฟล์นักชิมไม่มีส่วนรีวิว (แท็บ + ช่องสถิติ) — รีวิวยังอยู่ที่หน้าร้านแต่ละร้าน
		["ppuTabReviews", "ppuPaneReviews"].forEach(function(id) { var el = document.getElementById(id); if (el) el.remove(); });
		// ตัวเลขบันทึก/ร้านย้ายไปอยู่บรรทัดเดียวกับผู้ติดตาม — กล่องสถิติใหญ่ใช้เฉพาะโปรไฟล์ร้าน
		document.querySelector("#ppUser .ppu-stats").remove();
		ppuRenderCover([]);
		ppuSetupTabs();
		ppLoadFoodDna(user.id, user.foodDNA || null);
		ppRenderDiary(user);
		ppuLoadLocation(user);
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
