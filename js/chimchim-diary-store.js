// chimchim-diary-store.js
// ข้อมูลไดอารี่อาหาร "ชุดเดียว" ที่ทั้งหน้า diary.html และส่วน "ไดอารี่ของฉัน" ในโปรไฟล์ใช้ร่วมกัน
// - บัญชี Supabase จริง: ตาราง diary_entries (SQL Phase 21) เป็นต้นฉบับ บันทึกต้องสำเร็จบนเซิร์ฟเวอร์ก่อนถึงนับว่าบันทึกแล้ว
//   เครื่องเก็บสำเนาไว้แสดงผลทันที/ตอนออฟไลน์ (ดึงจากเซิร์ฟเวอร์ใหม่ทุกครั้งที่เปิดหน้า)
// - บัญชีทดลองในเครื่อง (ไม่มี Supabase): เก็บใน localStorage ของเบราว์เซอร์นี้เท่านั้น และหน้าเว็บบอกผู้ใช้ตรง ๆ
// รูปแบบบันทึก: { id, date: "YYYY-MM-DD", time: "HH:MM" | null, dish, shop, shopId, rating: 1-5 | null, note, img, createdAt }

var DIARY_CACHE_PREFIX = "chimchim_diary_v1_";
var DIARY_DISH_MAX = 80;
var DIARY_SHOP_MAX = 80;
var DIARY_NOTE_MAX = 500;
var DIARY_RATINGS = [1, 2, 3, 4, 5];

function diaryPad(n) {
	return (n < 10 ? "0" : "") + n;
}
// วันที่ตามเวลาเครื่องผู้ใช้ (ไม่ใช้ toISOString ที่เป็น UTC — ตีห้าที่ไทยจะกลายเป็นเมื่อวาน)
function diaryDateKey(d) {
	return d.getFullYear() + "-" + diaryPad(d.getMonth() + 1) + "-" + diaryPad(d.getDate());
}
function diaryToday() {
	return diaryDateKey(new Date());
}
function diaryParseKey(key) {
	var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
	return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function diaryLocale() {
	return getLang() === "th" ? "th-TH" : "en-GB";
}
function diaryFormatDate(key, opts) {
	var d = diaryParseKey(key);
	return d ? d.toLocaleDateString(diaryLocale(), opts || { day: "numeric", month: "short", year: "numeric" }) : "";
}
function diaryFeelingLabel(rating) {
	return rating ? t("diary.feel" + rating) : "";
}

function diaryUsesServer() {
	return typeof ต้องบันทึกขึ้นเซิร์ฟเวอร์ === "function" && ต้องบันทึกขึ้นเซิร์ฟเวอร์();
}
function diaryCacheKey() {
	var s = getSession();
	return s ? DIARY_CACHE_PREFIX + s.id : null;
}
function diaryReadCache() {
	var key = diaryCacheKey();
	if (!key) return [];
	try {
		var list = JSON.parse(localStorage.getItem(key));
		return Array.isArray(list) ? list : [];
	} catch (e) {
		return [];
	}
}
function diaryWriteCache(list) {
	var key = diaryCacheKey();
	if (!key) return false;
	try {
		localStorage.setItem(key, JSON.stringify(list));
		return true;
	} catch (e) {
		return false;
	}
}
// ใหม่สุดก่อน: วันที่ → เวลา (ไม่มีเวลาไว้ท้ายวัน) → เวลาที่สร้าง
function diarySort(list) {
	return list.slice().sort(function(a, b) {
		if (a.date !== b.date) return a.date < b.date ? 1 : -1;
		var ta = a.time || "", tb = b.time || "";
		if (ta !== tb) return ta < tb ? 1 : -1;
		return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1;
	});
}
function diaryRowToEntry(row) {
	return {
		id: row.id,
		date: row.eaten_on,
		time: row.eaten_at ? String(row.eaten_at).slice(0, 5) : null,
		dish: row.dish,
		shop: row.shop_name || "",
		shopId: row.shop_id || null,
		rating: row.rating || null,
		note: row.note || "",
		img: row.image_url || "",
		createdAt: row.created_at
	};
}
// ร้านที่พิมพ์ตรงกับร้านในแอปพอดี → ผูก id ไว้ (กดจากบันทึกไปหน้าร้านได้) ไม่ตรงก็เก็บแค่ชื่อ
function diaryMatchShopId(name) {
	var n = (name || "").trim().toLowerCase();
	if (!n || typeof รายการร้าน === "undefined") return null;
	var hit = รายการร้าน.filter(function(r) { return (r.ร้าน || "").trim().toLowerCase() === n; })[0];
	return hit ? hit.id : null;
}

// คืน { dish?, shop?, date?, note? } = ข้อความผิดพลาดของแต่ละช่อง (ว่าง = ผ่าน)
function diaryValidate(e) {
	var errs = {};
	var dish = (e.dish || "").trim();
	if (!dish) errs.dish = t("diary.errDish");
	else if (dish.length > DIARY_DISH_MAX) errs.dish = t("diary.errTooLong").replace("{n}", DIARY_DISH_MAX);
	if ((e.shop || "").trim().length > DIARY_SHOP_MAX) errs.shop = t("diary.errTooLong").replace("{n}", DIARY_SHOP_MAX);
	if (!diaryParseKey(e.date)) errs.date = t("diary.errDate");
	else if (e.date > diaryToday()) errs.date = t("diary.errFuture");
	if ((e.note || "").length > DIARY_NOTE_MAX) errs.note = t("diary.errTooLong").replace("{n}", DIARY_NOTE_MAX);
	return errs;
}

// คืน Promise<{ entries, source: "server" | "local" | "cache", error? }> — ไม่ throw
// source "cache" = ดึงจากเซิร์ฟเวอร์ไม่สำเร็จ กำลังแสดงสำเนาล่าสุดในเครื่อง (หน้าเว็บต้องบอกผู้ใช้)
function diaryLoad() {
	if (!getSession()) return Promise.resolve({ entries: [], source: "local", error: "auth" });
	var cached = diarySort(diaryReadCache());
	if (!diaryUsesServer()) return Promise.resolve({ entries: cached, source: "local" });
	// กรองเจ้าของเสมอ — RLS ให้อ่านไดอารี่สาธารณะของคนอื่นได้ด้วย ไม่กรองจะมีบันทึกคนอื่นปนเข้ามาในไดอารี่ของเรา
	return Promise.resolve(
		sbClient.from("diary_entries").select("*").eq("user_id", getSession().id).order("eaten_on", { ascending: false }).limit(2000)
	).then(function(res) {
		if (res.error) {
			console.error("[chimchim] diary load error:", res.error.message);
			return { entries: cached, source: "cache", error: sbErrorReason(res.error) };
		}
		var list = diarySort((res.data || []).map(diaryRowToEntry));
		diaryWriteCache(list);
		return { entries: list, source: "server" };
	}, function(e) {
		return { entries: cached, source: "cache", error: sbErrorReason(e) };
	});
}

// บันทึกรายการใหม่ — คืน Promise<{ entry } | { error }> (error: auth | upload | offline | network | permission | server | storage)
function diaryAdd(input, onProgress) {
	if (!getSession()) return Promise.resolve({ error: "auth" });
	var entry = {
		date: input.date,
		time: input.time || null,
		dish: (input.dish || "").trim(),
		shop: (input.shop || "").trim(),
		shopId: diaryMatchShopId(input.shop),
		rating: DIARY_RATINGS.indexOf(input.rating) !== -1 ? input.rating : null,
		note: (input.note || "").trim(),
		img: input.img || ""
	};
	if (!diaryUsesServer()) {
		entry.id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "local-" + Date.now().toString(36);
		entry.createdAt = new Date().toISOString();
		var list = diaryReadCache();
		list.push(entry);
		return Promise.resolve(diaryWriteCache(list) ? { entry: entry } : { error: "storage" });
	}
	var upload = entry.img && /^data:/.test(entry.img)
		? sbUploadImages([entry.img], "diary", onProgress)
		: Promise.resolve({ urls: [entry.img] });
	return upload.then(function(up) {
		if (up.error) return { error: up.error };
		var url = up.urls[0] || "";
		// ยังไม่มี bucket รูป (ยังไม่รัน SQL Phase 16) → อัปรูปไม่ได้ ไม่แอบเก็บรูปแบบ base64 ลงฐานข้อมูล
		if (url && !/^https:\/\//.test(url)) return { error: "upload" };
		return Promise.resolve(sbClient.from("diary_entries").insert({
			eaten_on: entry.date,
			eaten_at: entry.time,
			dish: entry.dish,
			shop_name: entry.shop || null,
			shop_id: entry.shopId,
			rating: entry.rating,
			note: entry.note || null,
			image_url: url || null
		}).select().single()).then(function(res) {
			if (res.error) {
				console.error("[chimchim] diary save error:", res.error.message);
				if (up.paths && up.paths.length) sbRemoveImages(up.paths);
				return { error: sbErrorReason(res.error) };
			}
			var saved = diaryRowToEntry(res.data);
			var list = diaryReadCache().filter(function(x) { return x.id !== saved.id; });
			list.push(saved);
			diaryWriteCache(list);
			return { entry: saved };
		}, function(e) {
			if (up.paths && up.paths.length) sbRemoveImages(up.paths);
			return { error: sbErrorReason(e) };
		});
	});
}

// ลบรายการ — คืน Promise<{ ok } | { error }>
function diaryRemove(id) {
	var entry = diaryReadCache().filter(function(x) { return x.id === id; })[0];
	function dropLocal() {
		diaryWriteCache(diaryReadCache().filter(function(x) { return x.id !== id; }));
		return { ok: true };
	}
	if (!diaryUsesServer()) return Promise.resolve(dropLocal());
	return Promise.resolve(sbClient.from("diary_entries").delete().eq("id", id)).then(function(res) {
		if (res.error) return { error: sbErrorReason(res.error) };
		// รูปของบันทึกนี้อยู่ในโฟลเดอร์ <uid>/diary/ ของผู้ใช้เอง ใช้ที่อื่นไม่ได้ ลบตามได้เลย
		var m = entry && entry.img ? /\/chimchim-images\/(.+)$/.exec(entry.img) : null;
		if (m) sbRemoveImages([decodeURIComponent(m[1])]);
		return dropLocal();
	}, function(e) {
		return { error: sbErrorReason(e) };
	});
}

// สถิติจากบันทึกจริงเท่านั้น — ร้านโปรด = ร้านที่บันทึกตั้งแต่ 2 ครั้งขึ้นไป (ครั้งเดียวยังไม่นับว่า "โปรด")
function diaryStats(list) {
	var monthKey = diaryToday().slice(0, 7);
	var days = {};
	var shops = {};
	var thisMonth = 0;
	list.forEach(function(e) {
		days[e.date] = true;
		if (e.date.slice(0, 7) === monthKey) thisMonth++;
		var name = (e.shop || "").trim();
		if (!name) return;
		var k = name.toLowerCase();
		if (!shops[k]) shops[k] = { name: name, shopId: e.shopId || null, count: 0 };
		shops[k].count++;
		if (e.shopId) shops[k].shopId = e.shopId;
	});
	var favShops = Object.keys(shops).map(function(k) { return shops[k]; })
		.filter(function(s) { return s.count >= 2; })
		.sort(function(a, b) { return b.count - a.count; })
		.slice(0, 3);
	return { total: list.length, thisMonth: thisMonth, days: Object.keys(days).length, favShops: favShops };
}

// ข้อความ error ที่บอกผู้ใช้ได้ตรง ๆ (ใช้ทั้งหน้าไดอารี่และโปรไฟล์)
function diaryErrorText(code) {
	var key = {
		auth: "diary.errAuth",
		upload: "diary.errUpload",
		bucket: "diary.errUpload",
		offline: "diary.errOffline",
		network: "diary.errNetwork",
		permission: "diary.errPermission",
		storage: "diary.errStorage"
	}[code] || "diary.errServer";
	return t(key);
}

/* =====================================================================
   ความเป็นส่วนตัวของไดอารี่ (SQL Phase 22) — profiles.diary_visibility: "private" | "public"
   ฐานข้อมูลบังคับเองด้วย RLS: ส่วนตัว = เจ้าของเท่านั้น / สาธารณะ = ผู้ใช้ที่ล็อกอินแล้วอ่านได้ (แก้/ลบได้เฉพาะเจ้าของเสมอ)
   ===================================================================== */
var DIARY_VIS_PREFIX = "chimchim_diary_visibility_";
function diaryCachedVisibility() {
	var s = getSession();
	if (!s) return "private";
	try { return localStorage.getItem(DIARY_VIS_PREFIX + s.id) === "public" ? "public" : "private"; } catch (e) { return "private"; }
}
// คืน Promise<{ visibility, error? }> — บัญชีทดลองในเครื่องเปิดสาธารณะไม่ได้ (ไม่มีเซิร์ฟเวอร์ให้คนอื่นเห็น) จึงเป็นส่วนตัวเสมอ
function diaryGetMyVisibility() {
	var s = getSession();
	if (!s || !diaryUsesServer()) return Promise.resolve({ visibility: "private", localOnly: true });
	return Promise.resolve(sbClient.from("profiles").select("diary_visibility").eq("id", s.id).single()).then(function(res) {
		if (res.error || !res.data || !res.data.diary_visibility) return { visibility: diaryCachedVisibility(), error: res.error ? sbErrorReason(res.error) : "server" };
		try { localStorage.setItem(DIARY_VIS_PREFIX + s.id, res.data.diary_visibility); } catch (e) {}
		return { visibility: res.data.diary_visibility };
	}, function(e) {
		return { visibility: diaryCachedVisibility(), error: sbErrorReason(e) };
	});
}
// คืน Promise<{ visibility } | { error }> — ค่าในเครื่องเปลี่ยนเฉพาะเมื่อฐานข้อมูลบันทึกสำเร็จ (ไม่แสดงว่าเป็นสาธารณะทั้งที่ยังไม่ใช่)
function diarySetMyVisibility(v) {
	var s = getSession();
	if (v !== "public" && v !== "private") return Promise.resolve({ error: "server" });
	if (!s || !diaryUsesServer()) return Promise.resolve({ error: "localOnly" });
	return Promise.resolve(sbClient.from("profiles").update({ diary_visibility: v }).eq("id", s.id).select("diary_visibility").single()).then(function(res) {
		if (res.error || !res.data) return { error: res.error ? sbErrorReason(res.error) : "server" };
		try { localStorage.setItem(DIARY_VIS_PREFIX + s.id, res.data.diary_visibility); } catch (e) {}
		return { visibility: res.data.diary_visibility };
	}, function(e) {
		return { error: sbErrorReason(e) };
	});
}
// ไดอารี่ของผู้ใช้คนอื่น — คืน Promise<{ entries, visibility: "public" | "private" | null, error? }>
// ผู้ชมต้องล็อกอิน (RLS ไม่ให้คนไม่ล็อกอินอ่าน) / ส่วนตัว = ไม่ดึงบันทึกเลย (ฐานข้อมูลก็ไม่ส่งให้อยู่แล้ว)
function diaryLoadFor(userId) {
	var s = getSession();
	if (s && s.id === userId) {
		return Promise.all([diaryLoad(), diaryGetMyVisibility()]).then(function(r) {
			return { entries: r[0].entries, visibility: r[1].visibility, own: true, error: r[0].error };
		});
	}
	if (typeof sbClient === "undefined" || !sbClient) return Promise.resolve({ entries: [], visibility: null, error: "server" });
	if (!s) return Promise.resolve({ entries: [], visibility: null, error: "auth" });
	return Promise.resolve(sbClient.from("profiles").select("name, diary_visibility").eq("id", userId).single()).then(function(res) {
		if (res.error || !res.data) return { entries: [], visibility: null, error: res.error ? sbErrorReason(res.error) : "server" };
		var vis = res.data.diary_visibility === "public" ? "public" : "private";
		if (vis !== "public") return { entries: [], visibility: "private", name: res.data.name };
		return Promise.resolve(
			sbClient.from("diary_entries").select("*").eq("user_id", userId).order("eaten_on", { ascending: false }).limit(2000)
		).then(function(r2) {
			if (r2.error) return { entries: [], visibility: vis, name: res.data.name, error: sbErrorReason(r2.error) };
			return { entries: diarySort((r2.data || []).map(diaryRowToEntry)), visibility: vis, name: res.data.name };
		});
	}, function(e) {
		return { entries: [], visibility: null, error: sbErrorReason(e) };
	});
}
// จำนวนร้านไม่ซ้ำที่เคยบันทึก (ใช้ในสถิติโปรไฟล์)
function diaryShopCount(list) {
	var seen = {};
	list.forEach(function(e) { var n = (e.shop || "").trim().toLowerCase(); if (n) seen[n] = true; });
	return Object.keys(seen).length;
}
