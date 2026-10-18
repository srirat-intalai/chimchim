// chimchim-supabase-client.js
// เชื่อมต่อ Supabase Auth จริงสำหรับสมัคร/เข้าสู่ระบบ แทนการเก็บรหัสผ่านแฮชไว้ใน localStorage เอง
// ต้องโหลดหลัง: supabase-js SDK (CDN) + chimchim-supabase-config.js + chimchim-core.js เสมอ
//
// สถาปัตยกรรมช่วงเปลี่ยนผ่าน (Bridge): Supabase Auth เป็นเจ้าของรหัสผ่าน/การยืนยันตัวตนจริงแล้ว
// ส่วนข้อมูลอื่น ๆ ของแอป (ร้าน/โพสต์/รีวิว/Food DNA) ยังอยู่ใน localStorage เหมือนเดิมไปก่อน
// (ย้ายเป็นเฟสถัดไป) เพื่อไม่ต้องแก้ทุกจุดที่เรียก getSession()/getMe() ทั่วแอปพร้อมกันในรอบเดียว
// พอ signIn/signUp สำเร็จ จะสร้าง/อัปเดต mirror ผู้ใช้ใน localStorage (getUsers()) ให้ id ตรงกับ
// Supabase user (uuid) เป๊ะ แล้ว setSession() ให้เลย เพื่อให้ getMe()/getSession() เดิมยังใช้งานได้ทุกหน้า

var sbClient = (typeof supabase !== "undefined" && typeof CHIMCHIM_SUPABASE_URL !== "undefined" && CHIMCHIM_SUPABASE_URL)
	? supabase.createClient(CHIMCHIM_SUPABASE_URL, CHIMCHIM_SUPABASE_ANON_KEY)
	: null;

// สร้าง/อัปเดต mirror ผู้ใช้ใน localStorage ให้ id ตรงกับ Supabase user แล้วตั้ง session ให้เลย
function sbSyncLocalSession(sbUser) {
	var users = getUsers();
	var existing = users.filter(function(u) { return u.id === sbUser.id; })[0];
	// ถ้ายังไม่เคยเจอ id ใหม่นี้มาก่อน เช็คว่ามีบัญชีเก่า (สมัยก่อนมี Supabase Auth, id แบบ "u"+timestamp)
	// ที่ใช้อีเมลเดียวกันไหม เอาชื่อจากบัญชีเก่ามาใช้ต่อ กันต้องขึ้นเป็นอีเมลดิบ ๆ แทนชื่อจริง
	var oldMatch = !existing ? users.filter(function(u) { return u.email === sbUser.email && u.id !== sbUser.id; })[0] : null;
	var name = (sbUser.user_metadata && sbUser.user_metadata.name) || (existing && existing.name) || (oldMatch && oldMatch.name) || sbUser.email;
	if (existing) {
		existing.name = name;
		existing.email = sbUser.email;
	} else {
		existing = { id: sbUser.id, name: name, email: sbUser.email };
		users.push(existing);
	}
	saveUsers(users);
	// ย้ายโพสต์/รีวิว/เพจ/ร้านที่เคยสร้างไว้ด้วยบัญชีเก่า (อีเมลเดียวกัน) มาอยู่ใต้ id ใหม่นี้ให้อัตโนมัติ
	if (typeof migrateOrphanedLocalData === "function") migrateOrphanedLocalData(sbUser.id, sbUser.email);
	setSession(existing);
	return existing;
}

// สมัครสมาชิกผ่าน Supabase Auth จริง — คืน Promise<{ ok, needsEmailConfirm, errorCode, error }>
function sbSignUp(name, email, password) {
	if (!sbClient) return Promise.resolve({ ok: false, error: "Supabase client not configured" });
	return sbClient.auth.signUp({
		email: email,
		password: password,
		options: { data: { name: name } }
	}).then(function(res) {
		if (res.error) return { ok: false, errorCode: res.error.code || res.error.status, error: res.error.message };
		// ไม่มี session กลับมา = ต้องกดยืนยันในอีเมลก่อนถึงจะล็อกอินได้ (ขึ้นกับตั้งค่า "Confirm email" ใน Supabase Dashboard)
		if (!res.data.session) {
			return { ok: true, needsEmailConfirm: true };
		}
		sbSyncLocalSession(res.data.user);
		return { ok: true, needsEmailConfirm: false };
	});
}

// เข้าสู่ระบบผ่าน Supabase Auth จริง — คืน Promise<{ ok, errorCode, error }>
function sbSignIn(email, password) {
	if (!sbClient) return Promise.resolve({ ok: false, error: "Supabase client not configured" });
	return sbClient.auth.signInWithPassword({ email: email, password: password }).then(function(res) {
		if (res.error) return { ok: false, errorCode: res.error.code || res.error.status, error: res.error.message };
		sbSyncLocalSession(res.data.user);
		return { ok: true };
	});
}

function sbSignOut() {
	if (!sbClient) return Promise.resolve();
	return sbClient.auth.signOut();
}

/* =====================================================================
   ร้านของฉัน (shops) — เฟส 2: sync จริงกับ Supabase ไม่ใช่แค่ localStorage แล้ว
   แนวทาง "progressive enhancement": โหลดหน้าแรกยังอ่านจาก localStorage เหมือนเดิมทันที (ไม่ค้างรอเน็ต)
   แล้วค่อยดึงร้านจริงจาก Supabase มาผสาน/อัปเดตทับเงียบ ๆ อีกที ผ่าน mergeRemoteShopsIntoรายการร้าน()
   เขียน (สร้าง/แก้ไขร้าน) จะเซฟ localStorage เหมือนเดิมก่อน (ใช้งานต่อได้ทันทีแม้เน็ตช้า/หลุด)
   แล้วค่อยส่งขึ้น Supabase จริงตามหลัง — ถ้า Supabase ให้ id ใหม่มา (สร้างครั้งแรก) จะย้าย
   id เดิมทุกจุด (รีวิว/ไลก์/follow/โพสต์) ให้ตรงกับ id ใหม่อัตโนมัติ เหมือนกับตอน merge auth
   ===================================================================== */
function sbShopRowToLocal(row) {
	return {
		numId: row.id,
		vendorId: row.vendor_id,
		vendorName: (row.profiles && row.profiles.name) || "",
		name: row.shop_name,
		dish: row.menu_name,
		cat: row.category,
		img: row.image_url,
		priceLow: row.price_low,
		priceHigh: row.price_high,
		distance: row.distance_m,
		uni: row.university,
		desc: row.description,
		hours: row.hours,
		promo: row.promo,
		lat: typeof row.lat === "number" ? row.lat : null,
		lng: typeof row.lng === "number" ? row.lng : null
	};
}
// พิกัดจริงของร้าน — แยก query ต่างหากจาก sbSaveMyShop (เหตุผลเดียวกับ sbSaveMyUniversity/sbSetShopSave
// เพราะคอลัมน์ shops.lat/lng เป็นของใหม่ SQL Phase 6 กันไม่ให้การบันทึกร้านหลักพังถ้ายังไม่ได้รัน SQL)
function sbSaveMyShopLocation(shopNumId, lat, lng) {
	if (!sbClient || typeof lat !== "number" || typeof lng !== "number") return Promise.resolve(null);
	return Promise.resolve(sbClient.from("shops").update({ lat: lat, lng: lng }).eq("id", shopNumId)).catch(function() {});
}
function sbShopToRow(shop, vendorId) {
	return {
		vendor_id: vendorId,
		shop_name: shop.name,
		menu_name: shop.dish,
		category: shop.cat,
		image_url: shop.img,
		price_low: shop.priceLow,
		price_high: shop.priceHigh,
		distance_m: shop.distance,
		university: shop.uni,
		description: shop.desc || "",
		hours: shop.hours || "",
		promo: shop.promo || ""
	};
}
// ดึงร้านที่ผู้ใช้ทุกคนโพสต์เข้าชุมชนจาก Supabase จริง (ไม่ใช่แค่ในเบราว์เซอร์นี้) — คืน Promise<Array>
// ล้มเหลว/ยังไม่ได้เชื่อมต่อ ก็แค่คืน [] เงียบ ๆ ไม่ทำให้หน้าเว็บพังเพราะจุดนี้เป็นแค่ส่วนเสริม
function sbFetchCommunityShops() {
	if (!sbClient) return Promise.resolve([]);
	return sbClient.from("shops").select("*, profiles!vendor_id(name)").eq("is_hidden", false).not("vendor_id", "is", null)
		.then(function(res) {
			if (res.error) {
				console.error("[chimchim] sbFetchCommunityShops error:", res.error.message);
				return [];
			}
			return res.data.map(sbShopRowToLocal);
		}).catch(function() { return []; });
}
// จุดเรียกหลัก — เรียกจากแต่ละหน้าที่โชว์รายชื่อร้าน (home.html, ai-finder.html, roulette.html, restaurant.html)
// หลัง initial render เดิมเสร็จแล้ว: (1) sync ร้านของฉันขึ้น Supabase ถ้ายังไม่เคย sync มาก่อน
// (2) ดึงร้านของทุกคนจาก Supabase มาผสานกับ รายการร้าน แล้วเรียก onUpdated() ให้หน้านั้น re-render
// ทำแบบ "เสริมเงียบ ๆ" ไม่บล็อกการโหลดหน้าแรก และล้มเหลวได้โดยไม่ทำหน้าเว็บพัง (แค่ไม่มีข้อมูลข้ามเครื่อง)
function syncShopsWithSupabase(onUpdated) {
	if (!sbClient) return;
	var me = getMe();
	var pushMyShop = Promise.resolve();

	if (me) {
		var myShop = getMyShop();
		if (myShop) {
			pushMyShop = sbSaveMyShop(myShop).then(function(saved) {
				if (saved && saved.numId !== myShop.numId) {
					reconcileShopNumId(myShop.numId, saved.numId);
				}
			});
		}
	}

	pushMyShop.then(function() {
		return sbFetchCommunityShops();
	}).then(function(remoteShops) {
		if (!remoteShops.length) return;
		mergeRemoteShopsIntoรายการร้าน(remoteShops);
		if (typeof onUpdated === "function") onUpdated();
	});
}

// บันทึกร้านของฉันขึ้น Supabase จริง (insert ถ้ายังไม่เคยมี, update ถ้ามีแล้ว) — คืน Promise<localShop|null>
function sbSaveMyShop(shop) {
	var me = getMe();
	if (!me || !sbClient) return Promise.resolve(null);
	return sbClient.from("shops").select("id").eq("vendor_id", me.id).then(function(existingRes) {
		var existingId = existingRes.data && existingRes.data[0] && existingRes.data[0].id;
		var row = sbShopToRow(shop, me.id);
		var query = existingId
			? sbClient.from("shops").update(row).eq("id", existingId)
			: sbClient.from("shops").insert(row);
		return query.select("*, profiles!vendor_id(name)").single();
	}).then(function(res) {
		if (res.error) {
			console.error("[chimchim] sbSaveMyShop error:", res.error.message);
			return null;
		}
		return sbShopRowToLocal(res.data);
	}).catch(function() { return null; });
}

/* =====================================================================
   โปรไฟล์ (ชื่อ/bio/รูปโปรไฟล์/Food DNA) — sync จริงกับ Supabase ข้ามอุปกรณ์
   ต้องรัน migration "Phase 3" ท้าย supabase/schema.sql ก่อน (เพิ่มคอลัมน์ bio/avatar_url ที่ profiles)
   ไม่งั้น update จะ error เงียบ ๆ (ไม่ทำหน้าเว็บพัง แค่ bio/รูปยังไม่ข้ามเครื่อง จนกว่าจะรัน migration)
   ===================================================================== */
function sbSaveMyProfile(patch) {
	var me = getMe();
	if (!me || !sbClient) return Promise.resolve(null);
	var row = {};
	if (typeof patch.name === "string") row.name = patch.name;
	if (typeof patch.bio === "string") row.bio = patch.bio;
	if (typeof patch.avatar === "string") row.avatar_url = patch.avatar;
	if (patch.foodDNA) row.food_dna = patch.foodDNA;
	if (!Object.keys(row).length) return Promise.resolve(null);
	// เปลี่ยนชื่อ ต้องอัปเดตทั้ง auth user_metadata (ใช้ตอน signup/สร้าง profile ใหม่) และตาราง profiles จริง
	var authUpdate = row.name ? sbClient.auth.updateUser({ data: { name: row.name } }) : Promise.resolve();
	return authUpdate.then(function() {
		return sbClient.from("profiles").update(row).eq("id", me.id);
	}).then(function(res) {
		if (res.error) {
			console.error("[chimchim] sbSaveMyProfile error:", res.error.message);
			return null;
		}
		return true;
	}).catch(function() { return null; });
}
// ดึงโปรไฟล์ (bio/รูป/Food DNA) จาก Supabase มาผสานกับเครื่องนี้ตอนล็อกอิน/เข้าแอป แล้ว re-render ผ่าน onUpdated
function syncMyProfileWithSupabase(onUpdated) {
	var me = getMe();
	if (!me || !sbClient) return;
	sbClient.from("profiles").select("name, bio, avatar_url, food_dna").eq("id", me.id).single().then(function(res) {
		if (res.error || !res.data) return;
		var patch = {};
		if (res.data.name) patch.name = res.data.name;
		if (res.data.bio) patch.bio = res.data.bio;
		if (res.data.avatar_url) patch.avatar = res.data.avatar_url;
		if (res.data.food_dna) patch.foodDNA = res.data.food_dna;
		if (!Object.keys(patch).length) return;
		updateMe(patch);
		if (patch.name) setSession(getMe());
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}

/* --- มหาวิทยาลัยของผู้ใช้ทั่วไป — แยก query ต่างหากจาก sbSaveMyProfile/syncMyProfileWithSupabase โดยตั้งใจ
   เพราะคอลัมน์ profiles.university เป็นของใหม่ (SQL Phase 6) ถ้าใครยังไม่ได้รัน SQL อันนั้น query นี้จะ
   error เฉย ๆ (จับด้วย catch) โดยไม่ทำให้การ sync ชื่อ/bio/avatar/food_dna ที่ทำงานอยู่แล้วพังไปด้วย --- */
function sbSaveMyUniversity(university) {
	var me = getMe();
	if (!me || !sbClient || typeof university !== "string") return Promise.resolve(null);
	return sbClient.from("profiles").update({ university: university || null }).eq("id", me.id).then(function(res) {
		return res.error ? null : true;
	}).catch(function() { return null; });
}
function syncMyUniversityWithSupabase(onUpdated) {
	var me = getMe();
	if (!me || !sbClient) return;
	sbClient.from("profiles").select("university").eq("id", me.id).single().then(function(res) {
		if (res.error || !res.data || !res.data.university) return;
		updateMe({ university: res.data.university });
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}

/* =====================================================================
   รีวิวร้าน — ผลักขึ้นทันทีตอนส่ง + ดึงของคนอื่นมาผสานตอนเปิดดูร้าน (ดู mergeRemoteReviewsIntoLocal ใน core.js)
   ===================================================================== */
function sbReviewRowToLocal(row) {
	return { remoteId: row.id, taste: row.taste, atmosphere: row.atmosphere, service: row.service, text: row.text || "", author: row.author_name, userId: row.user_id, date: row.created_at, images: row.images || [] };
}
// คืน { saved } เมื่อสำเร็จ หรือ { error } — "images_column" = ยังไม่ได้รัน SQL Phase 6 (คอลัมน์ reviews.images)
// "images_limit" = เกิน CHECK ฝั่งฐานข้อมูล (Phase 11: ไม่เกิน 10 รูป) / "server" = อื่น ๆ (เน็ต, RLS ฯลฯ)
function sbReviewError(err) {
	var msg = (err && (err.message || err.details)) || "";
	console.error("[chimchim] review save error:", msg);
	if (/reviews_images_(limit|size)|check constraint/i.test(msg)) return "images_limit";
	if (/images/i.test(msg) && /column|schema cache/i.test(msg)) return "images_column";
	return "server";
}
function sbSubmitReview(shopId, review) {
	if (!sbClient) return Promise.resolve(null);
	var row = {
		shop_id: shopId,
		user_id: review.userId || null,
		author_name: review.author,
		taste: review.taste,
		atmosphere: review.atmosphere,
		service: review.service,
		text: review.text || ""
	};
	// ใส่รูปไปในแถวเดียวกับรีวิวเลย (insert ครั้งเดียว ได้ทั้งหมดหรือไม่ได้เลย) — เดิมแยก update ทีหลัง
	// ซึ่งพังเงียบ ๆ ได้ (เช่น รีวิวแบบไม่ล็อกอินไม่มีสิทธิ์ update) ทำให้รีวิวขึ้นแต่รูปหาย
	// รีวิวไม่มีรูปไม่ส่งช่อง images เลย จึงยังใช้ได้แม้ยังไม่ได้รัน SQL Phase 6
	if (review.images && review.images.length) row.images = review.images.slice(0, CHIMCHIM_MAX_IMAGES);
	return Promise.resolve(sbClient.from("reviews").insert(row).select().single()).then(function(res) {
		if (res.error) return { error: sbReviewError(res.error) };
		var saved = sbReviewRowToLocal(res.data);
		// ตรวจซ้ำว่าเซิร์ฟเวอร์เก็บรูปครบทุกรูปจริง
		if (row.images && (saved.images || []).length !== row.images.length) return { error: "server" };
		return { saved: saved };
	}).catch(function(e) { return { error: sbReviewError(e) }; });
}
// แก้ไขรีวิวที่เคย sync ขึ้น Supabase แล้วเท่านั้น (ต้องมี remoteId จริง) ต้องรัน migration "Phase 4"
// (reviews_update_own policy) ก่อน — คืน { ok } หรือ { error }
// RLS ที่ไม่ให้แก้จะไม่ error แต่แก้ได้ 0 แถว → เช็คจากแถวที่ได้กลับมาด้วย
function sbUpdateReview(remoteId, patch) {
	if (!sbClient) return Promise.resolve(null);
	var row = {};
	if (typeof patch.taste === "number") row.taste = patch.taste;
	if (typeof patch.atmosphere === "number") row.atmosphere = patch.atmosphere;
	if (typeof patch.service === "number") row.service = patch.service;
	if (typeof patch.text === "string") row.text = patch.text;
	if (Array.isArray(patch.images)) row.images = patch.images.slice(0, CHIMCHIM_MAX_IMAGES);
	if (!Object.keys(row).length) return Promise.resolve({ ok: true });
	return Promise.resolve(sbClient.from("reviews").update(row).eq("id", remoteId).select()).then(function(res) {
		if (res.error) return { error: sbReviewError(res.error) };
		if (!res.data || !res.data.length) return { error: "server" };
		return { ok: true };
	}).catch(function(e) { return { error: sbReviewError(e) }; });
}
function sbDeleteReview(remoteId) {
	if (!sbClient) return Promise.resolve(null);
	return Promise.resolve(sbClient.from("reviews").delete().eq("id", remoteId)).catch(function() {});
}
function sbDeleteMyShop(numId) {
	if (!sbClient) return Promise.resolve(null);
	return Promise.resolve(sbClient.from("shops").delete().eq("id", numId)).catch(function() {});
}
// จุดเรียกหลัก — เรียกตอนเปิดหน้าร้าน (restaurant.html) เพื่อดึงรีวิวจริงของทุกคนมาผสานกับในเครื่องนี้
function syncReviewsWithSupabase(shopId, onUpdated) {
	if (!sbClient) return;
	sbClient.from("reviews").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).then(function(res) {
		if (res.error || !res.data || !res.data.length) return;
		mergeRemoteReviewsIntoLocal(shopId, res.data.map(sbReviewRowToLocal));
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}

/* =====================================================================
   ไลก์ร้าน/โพสต์ + ติดตามร้าน/คน — ผลักทันทีตอนกด (insert/delete จริง ไม่ใช่ mockup)
   แล้วดึงของตัวเองจาก Supabase มา union กับเครื่องนี้ตอนล็อกอิน/เข้าแอป กันหายตอนเปลี่ยนเครื่อง
   พร้อม "ย้อนผลัก" ของที่มีอยู่แล้วแค่ในเครื่องนี้ (ทำไว้ก่อนมี sync/ทำตอนออฟไลน์) ขึ้น Supabase ให้ครบ
   ===================================================================== */
/* =====================================================================
   คิวรอส่ง (ไลก์/ติดตาม) — กดแล้ว "ติดจริง" เสมอ
   เดิม: กดแล้วส่งขึ้น Supabase แบบไม่สนผล ถ้าส่งไม่ผ่าน (ร้านยังไม่มีในตาราง shops / ไม่ได้ล็อกอิน Supabase / เน็ตหลุด)
   พอเปิดหน้าใหม่ sync จะเอาของจากเซิร์ฟเวอร์ (ที่ไม่มีรายการนั้น) มาเขียนทับในเครื่อง → ที่เพิ่งกดหายไปเฉย ๆ
   ตอนนี้: ทุกการกดจดลงคิวก่อน ส่งสำเร็จค่อยลบออก ไม่สำเร็จเก็บไว้ส่งซ้ำตอน sync รอบถัดไป
   และตอนรวมกับของจากเซิร์ฟเวอร์ "สิ่งที่ค้างในคิวชนะเสมอ" — ผู้ใช้ไม่มีทางเห็นสิ่งที่ตัวเองกดหายไป
   kind: "likeShop" | "likePost" | "follow:shop" | "follow:profile"
   ===================================================================== */
var CHIMCHIM_PENDING_SOCIAL_KEY = "chimchim_pending_social_v1";
function sbPendingList() {
	try {
		return JSON.parse(localStorage.getItem(CHIMCHIM_PENDING_SOCIAL_KEY)) || [];
	} catch (e) {
		return [];
	}
}
function sbPendingSave(list) {
	localStorage.setItem(CHIMCHIM_PENDING_SOCIAL_KEY, JSON.stringify(list));
}
function sbSameItem(x, kind, id) {
	return x.kind === kind && String(x.id) === String(id);
}
function sbMarkPending(kind, id, on) {
	var list = sbPendingList().filter(function(x) { return !sbSameItem(x, kind, id); });
	list.push({ kind: kind, id: id, on: !!on });
	sbPendingSave(list);
}
function sbClearPending(kind, id, on) {
	sbPendingSave(sbPendingList().filter(function(x) { return !(sbSameItem(x, kind, id) && x.on === !!on); }));
}
// true = กดไว้แต่ยังส่งไม่ขึ้น / false = เลิกกดไว้แต่ยังส่งไม่ขึ้น / undefined = ไม่มีค้าง
function sbPendingState(kind, id) {
	var hit = sbPendingList().filter(function(x) { return sbSameItem(x, kind, id); })[0];
	return hit ? hit.on : undefined;
}
// ส่งจริง + จัดการคิว: สำเร็จ (หรือมีอยู่แล้ว 23505) → ลบออกจากคิว / ไม่สำเร็จ → ค้างไว้ส่งซ้ำ คืน Promise<boolean>
function sbRunSocialWrite(kind, id, on, makeQuery) {
	sbMarkPending(kind, id, on);
	var me = getMe();
	if (!me || !sbClient) return Promise.resolve(false);
	return Promise.resolve(makeQuery(me)).then(function(res) {
		var ok = !res.error || res.error.code === "23505";
		if (ok) sbClearPending(kind, id, on);
		else console.warn("[chimchim] ส่ง " + kind + " ไม่สำเร็จ จะลองใหม่ภายหลัง:", res.error.message);
		return ok;
	}).catch(function() { return false; });
}
function sbSetShopLike(shopId, liked) {
	return sbRunSocialWrite("likeShop", shopId, liked, function(me) {
		return liked
			? sbClient.from("likes_shops").insert({ user_id: me.id, shop_id: shopId })
			: sbClient.from("likes_shops").delete().eq("user_id", me.id).eq("shop_id", shopId);
	});
}
// บันทึกร้านไว้ดูทีหลัง — ตาราง saved_shops เป็นของใหม่ (SQL Phase 6) .catch() กันพังถ้ายังไม่ได้รัน SQL
function sbSetShopSave(shopId, saved) {
	var me = getMe();
	if (!me || !sbClient) return Promise.resolve();
	var query = saved
		? sbClient.from("saved_shops").insert({ user_id: me.id, shop_id: shopId })
		: sbClient.from("saved_shops").delete().eq("user_id", me.id).eq("shop_id", shopId);
	return Promise.resolve(query).catch(function() {});
}
// ดึงร้านที่บันทึกไว้จาก Supabase มาผสานกับของเครื่องนี้ (รวมกัน ไม่ใช่แทนที่ กันของที่เพิ่งกดไว้ offline หาย)
function syncSavedShopsWithSupabase(onUpdated) {
	var me = getMe();
	if (!me || !sbClient) return;
	sbClient.from("saved_shops").select("shop_id").eq("user_id", me.id).then(function(res) {
		if (res.error || !res.data) return;
		var remote = res.data.map(function(r) { return r.shop_id; });
		var local = getSavedShops();
		var merged = local.slice();
		remote.forEach(function(id) { if (merged.indexOf(id) === -1) merged.push(id); });
		localStorage.setItem(CHIMCHIM_SAVES_KEY, JSON.stringify(merged));
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}
// บันทึกโพสต์ — ตาราง saved_posts เก็บด้วย post_key (id โพสต์จริงเป็นข้อความ หรือ "bu-…-postN") ต้องรัน SQL Phase 12
function sbSetPostSave(postId, saved) {
	var me = getMe();
	var key = String(postId);
	if (!me || !sbClient || !(/^\d+$/.test(key) || sbIsSeedPostId(key))) return Promise.resolve();
	var query = saved
		? sbClient.from("saved_posts").insert({ user_id: me.id, post_key: key })
		: sbClient.from("saved_posts").delete().eq("user_id", me.id).eq("post_key", key);
	return Promise.resolve(query).catch(function() {});
}
// ผสานโพสต์ที่บันทึกไว้จาก Supabase (บันทึกจากเครื่องอื่น) แบบรวมกัน ไม่แทนที่ — เหมือน syncSavedShopsWithSupabase
function syncSavedPostsWithSupabase(onUpdated) {
	var me = getMe();
	if (!me || !sbClient) return;
	Promise.resolve(sbClient.from("saved_posts").select("post_key").eq("user_id", me.id)).then(function(res) {
		if (res.error || !res.data) return;
		var merged = getSavedPosts();
		res.data.forEach(function(r) { if (merged.indexOf(String(r.post_key)) === -1) merged.push(String(r.post_key)); });
		localStorage.setItem(CHIMCHIM_SAVED_POSTS_KEY, JSON.stringify(merged));
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}
/* --- โพสต์มี 2 แบบ: โพสต์จริงในตาราง posts (id ตัวเลข) กับโพสต์ตัวอย่างของร้านตั้งต้นในระบบ ที่ฝังอยู่ในโค้ด
   (id แบบ "bu-yammamuang-post0" ไม่มีแถวในตาราง posts) — เดิมไลก์/คอมเมนต์ของโพสต์แบบหลังไม่เคยขึ้น Supabase เลย
   คนอื่นเลยไม่เห็น ตอนนี้แบบหลังเก็บด้วย post_key (ต้องรัน SQL Phase 9 ใน schema.sql ก่อน) --- */
function sbIsSeedPostId(id) {
	// id ร้านตั้งต้นเป็นตัวอักษร เช่น "bu-yammamuang-post0" / "bu-kinteaw-banmae-post1"
	return /^bu-[a-z0-9-]+-post\d+$/.test(String(id));
}
function sbSplitPostIds(ids) {
	var numeric = [];
	var keys = [];
	ids.forEach(function(id) {
		var s = String(id);
		if (/^\d+$/.test(s)) numeric.push(parseInt(s, 10));
		else if (sbIsSeedPostId(s)) keys.push(s);
	});
	return { numeric: numeric, keys: keys };
}
function sbSetPostLike(postId, liked) {
	// โพสต์ใหม่ที่ยังไม่ได้ id จริง ("post123…") ยังไม่มีแถวให้ผูก — เก็บไว้ในเครื่องก่อน
	if (!sbIsSeedPostId(postId) && !/^\d+$/.test(String(postId))) return Promise.resolve(false);
	return sbRunSocialWrite("likePost", String(postId), liked, function(me) {
		if (sbIsSeedPostId(postId)) {
			return liked
				? sbClient.from("likes_seed_posts").insert({ user_id: me.id, post_key: String(postId) })
				: sbClient.from("likes_seed_posts").delete().eq("user_id", me.id).eq("post_key", String(postId));
		}
		var numericId = parseInt(postId, 10);
		return liked
			? sbClient.from("likes_posts").insert({ user_id: me.id, post_id: numericId })
			: sbClient.from("likes_posts").delete().eq("user_id", me.id).eq("post_id", numericId);
	});
}
function sbSetFollow(targetType, targetId, following) {
	return sbRunSocialWrite("follow:" + targetType, targetId, following, function(me) {
		return following
			? sbClient.from("follows").insert({ follower_id: me.id, target_type: targetType, target_id: String(targetId) })
			: sbClient.from("follows").delete().eq("follower_id", me.id).eq("target_type", targetType).eq("target_id", String(targetId));
	});
}
// นับแถวแบบไม่ดึงข้อมูลจริง (head + count exact) — ใช้นับผู้ติดตาม/กำลังติดตาม/รีวิว คืน Promise<number|null>
function sbCountRows(table, eqs) {
	if (!sbClient) return Promise.resolve(null);
	var q = sbClient.from(table).select("*", { count: "exact", head: true });
	Object.keys(eqs).forEach(function(k) { q = q.eq(k, eqs[k]); });
	return Promise.resolve(q).then(function(res) {
		return res.error ? null : (res.count || 0);
	}).catch(function() { return null; });
}
// ส่งของที่ค้างในคิวซ้ำทั้งหมด (เรียกก่อนดึงของจริงจากเซิร์ฟเวอร์ทุกครั้ง)
function sbFlushPendingSocial() {
	return Promise.all(sbPendingList().map(function(x) {
		if (x.kind === "likeShop") return sbSetShopLike(x.id, x.on);
		if (x.kind === "likePost") return sbSetPostLike(x.id, x.on);
		if (x.kind.indexOf("follow:") === 0) return sbSetFollow(x.kind.slice(7), x.id, x.on);
		return null;
	}));
}
// รวมของจากเซิร์ฟเวอร์กับคิวที่ยังค้าง: ค้างว่า "กด" → ต้องมี / ค้างว่า "เลิกกด" → ต้องไม่มี (คิวชนะเสมอ)
function sbApplyPending(kind, remoteIds, normalize) {
	var set = [];
	remoteIds.forEach(function(id) {
		var v = normalize(id);
		if (set.indexOf(v) === -1) set.push(v);
	});
	sbPendingList().forEach(function(x) {
		if (x.kind !== kind) return;
		var v = normalize(x.id);
		var i = set.indexOf(v);
		if (x.on && i === -1) set.push(v);
		if (!x.on && i !== -1) set.splice(i, 1);
	});
	return set;
}
// ครั้งแรกที่เคย sync ในเครื่องนี้เท่านั้น (ยังไม่เคย backfill): เอาไลก์/ติดตามเดิมที่ทำไว้ก่อนมีระบบ sync
// (ยุค localStorage ล้วน ๆ) ผลักขึ้น Supabase ให้ครบก่อน แล้ว union เข้ากับของจริง — ครั้งต่อ ๆ ไปหลังจากนั้น
// ให้ "แทนที่ทั้งชุด" ด้วยของจริงจาก Supabase ตรง ๆ เลย เพราะทุกครั้งที่กด/เลิกกดหลังจากนี้ push ขึ้นจริงทันทีอยู่แล้ว
// (ถ้ายัง union ตลอดไป การเลิกไลก์/เลิกติดตามจากเครื่องอื่นจะไม่มีวันหายไปจากเครื่องนี้ แถมจะถูกผลักกลับขึ้นไปซ้ำอีกด้วย)
var CHIMCHIM_LIKES_FOLLOWS_BACKFILLED_KEY = "chimchim_likes_follows_backfilled_v1";
var CHIMCHIM_SEED_LIKES_BACKFILLED_KEY = "chimchim_seed_post_likes_backfilled_v1";
function syncLikesAndFollowsWithSupabase(onUpdated) {
	var me = getMe();
	if (!me || !sbClient) return;
	var isFirstBackfill = !localStorage.getItem(CHIMCHIM_LIKES_FOLLOWS_BACKFILLED_KEY);
	var asInt = function(v) { return parseInt(v, 10); };
	var asStr = function(v) { return String(v); };

	// ครั้งแรกของเครื่องนี้: ของที่เคยกดไว้ก่อนมีระบบ sync ใส่คิวให้หมด (ซ้ำกับที่มีอยู่แล้วไม่เป็นไร นับว่าสำเร็จ)
	if (isFirstBackfill) {
		getLikedShops().forEach(function(id) { if (sbPendingState("likeShop", id) === undefined) sbMarkPending("likeShop", id, true); });
		getLikedPosts().forEach(function(id) { if (sbPendingState("likePost", id) === undefined) sbMarkPending("likePost", id, true); });
		getFollowedShops().forEach(function(id) { if (sbPendingState("follow:shop", id) === undefined) sbMarkPending("follow:shop", id, true); });
		getFollowedUsers().forEach(function(id) { if (sbPendingState("follow:profile", id) === undefined) sbMarkPending("follow:profile", id, true); });
	}
	// ไลก์โพสต์ตัวอย่างของร้านที่กดไว้ตอนตาราง likes_seed_posts ยังไม่มี (ก่อนรัน SQL Phase 9) → ใส่คิวครั้งเดียว
	if (!localStorage.getItem(CHIMCHIM_SEED_LIKES_BACKFILLED_KEY)) {
		getLikedPosts().filter(sbIsSeedPostId).forEach(function(id) {
			if (sbPendingState("likePost", id) === undefined) sbMarkPending("likePost", id, true);
		});
		localStorage.setItem(CHIMCHIM_SEED_LIKES_BACKFILLED_KEY, "1");
	}

	sbFlushPendingSocial().then(function() {
		return Promise.all([
			Promise.resolve(sbClient.from("likes_shops").select("shop_id").eq("user_id", me.id)).catch(function(e) { return { error: e }; }),
			Promise.resolve(sbClient.from("likes_posts").select("post_id").eq("user_id", me.id)).catch(function(e) { return { error: e }; }),
			Promise.resolve(sbClient.from("likes_seed_posts").select("post_key").eq("user_id", me.id)).catch(function(e) { return { error: e }; }),
			Promise.resolve(sbClient.from("follows").select("target_type, target_id").eq("follower_id", me.id)).catch(function(e) { return { error: e }; })
		]);
	}).then(function(r) {
		var shopRes = r[0], postRes = r[1], seedRes = r[2], followRes = r[3];
		// อ่านจากเซิร์ฟเวอร์ไม่ได้ → ไม่แตะของในเครื่องเลย (เดิมเขียนทับด้วยค่าว่าง = ล้างทุกอย่างที่เคยกด)
		if (!shopRes.error) {
			localStorage.setItem(CHIMCHIM_LIKES_KEY, JSON.stringify(
				sbApplyPending("likeShop", (shopRes.data || []).map(function(x) { return x.shop_id; }), asInt)));
		}
		var local = getLikedPosts().map(asStr);
		var numericPart = !postRes.error
			? sbApplyPending("likePost", (postRes.data || []).map(function(x) { return x.post_id; }), asStr).filter(function(id) { return !sbIsSeedPostId(id); })
			: local.filter(function(id) { return !sbIsSeedPostId(id); });
		var seedPart = !seedRes.error
			? sbApplyPending("likePost", (seedRes.data || []).map(function(x) { return x.post_key; }), asStr).filter(sbIsSeedPostId)
			: local.filter(sbIsSeedPostId);
		// ไลก์โพสต์ใหม่ที่ยังไม่ได้ id จริง ("post123…") ไม่อยู่บนเซิร์ฟเวอร์แน่ ๆ — เก็บไว้ตามเดิม
		var tempPart = local.filter(function(id) { return !sbIsSeedPostId(id) && !/^\d+$/.test(id); });
		localStorage.setItem(CHIMCHIM_POST_LIKES_KEY, JSON.stringify(numericPart.concat(seedPart).concat(tempPart)));
		if (!followRes.error) {
			var rows = followRes.data || [];
			localStorage.setItem(CHIMCHIM_FOLLOWS_KEY, JSON.stringify(sbApplyPending("follow:shop",
				rows.filter(function(x) { return x.target_type === "shop"; }).map(function(x) { return x.target_id; }), asInt)));
			localStorage.setItem(CHIMCHIM_FOLLOWED_USERS_KEY, JSON.stringify(sbApplyPending("follow:profile",
				rows.filter(function(x) { return x.target_type === "profile"; }).map(function(x) { return x.target_id; }), asStr)));
		}
		if (isFirstBackfill) localStorage.setItem(CHIMCHIM_LIKES_FOLLOWS_BACKFILLED_KEY, "1");
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}
// นับไลก์จริงของร้าน/โพสต์หลายรายการพร้อมกันในคำขอเดียว (ใช้ตอน render การ์ดหลายใบพร้อมกัน) คืน Promise<{id: count}>
function sbFetchShopLikeCounts(shopIds) {
	if (!sbClient || !shopIds.length) return Promise.resolve({});
	return sbClient.from("likes_shops").select("shop_id").in("shop_id", shopIds).then(function(res) {
		var counts = {};
		(res.data || []).forEach(function(r) { counts[r.shop_id] = (counts[r.shop_id] || 0) + 1; });
		return counts;
	}).catch(function() { return {}; });
}
function sbFetchPostLikeCounts(postIds) {
	var split = sbSplitPostIds(postIds);
	if (!sbClient || (!split.numeric.length && !split.keys.length)) return Promise.resolve({});
	var counts = {};
	var jobs = [];
	if (split.numeric.length) {
		jobs.push(Promise.resolve(sbClient.from("likes_posts").select("post_id").in("post_id", split.numeric)).then(function(res) {
			(res.data || []).forEach(function(r) { counts[r.post_id] = (counts[r.post_id] || 0) + 1; });
		}).catch(function() {}));
	}
	if (split.keys.length) {
		jobs.push(Promise.resolve(sbClient.from("likes_seed_posts").select("post_key").in("post_key", split.keys)).then(function(res) {
			if (res.error) return;
			// ดึงสำเร็จ → โพสต์ที่ไม่มีแถวเลย = 0 ไลก์จริง (ถ้าตารางยังไม่มี จะไม่ใส่ค่า ใช้ยอดในเครื่องต่อ)
			split.keys.forEach(function(k) { counts[k] = 0; });
			(res.data || []).forEach(function(r) { counts[r.post_key] = (counts[r.post_key] || 0) + 1; });
		}).catch(function() {}));
	}
	return Promise.all(jobs).then(function() { return counts; });
}
// สรุปคอมเมนต์หลายโพสต์พร้อมกัน: จำนวน + 2 คอมเมนต์ล่าสุด (โชว์ใต้โพสต์ในฟีดให้เห็นเลยโดยไม่ต้องกดเปิด)
// คืน Promise<{ postId: { count, latest: [{ author, text }] } }> — โพสต์ที่ดึงไม่ได้จะไม่มีใน object
function sbFetchCommentSummaries(postIds) {
	var split = sbSplitPostIds(postIds);
	if (!sbClient || (!split.numeric.length && !split.keys.length)) return Promise.resolve({});
	var out = {};
	function collect(rows, keyOf, ids) {
		ids.forEach(function(id) { out[String(id)] = { count: 0, latest: [] }; });
		rows.forEach(function(r) {
			var k = String(keyOf(r));
			if (!out[k]) out[k] = { count: 0, latest: [] };
			out[k].count++;
			if (out[k].latest.length < 2) {
				out[k].latest.push({ author: (r.profiles && r.profiles.name) || t("common.chimchimFoodie"), text: r.text });
			}
		});
	}
	// "*" = ได้ is_hidden มาด้วยถ้ามีคอลัมน์ (SQL Phase 10) — ถ้ายังไม่มีก็ไม่ error แค่ไม่มีฟิลด์นั้น
	var cols = "*, profiles!author_id(name)";
	var jobs = [];
	if (split.numeric.length) {
		jobs.push(Promise.resolve(sbClient.from("comments").select(cols).in("post_id", split.numeric).order("created_at", { ascending: false }).limit(500)).then(function(res) {
			if (!res.error) collect((res.data || []).filter(function(r) { return r.is_hidden !== true; }), function(r) { return r.post_id; }, split.numeric);
		}).catch(function() {}));
	}
	if (split.keys.length) {
		jobs.push(Promise.resolve(sbClient.from("comments").select(cols).in("post_key", split.keys).order("created_at", { ascending: false }).limit(500)).then(function(res) {
			if (!res.error) collect((res.data || []).filter(function(r) { return r.is_hidden !== true; }), function(r) { return r.post_key; }, split.keys);
		}).catch(function() {}));
	}
	return Promise.all(jobs).then(function() { return out; });
}
/* --- ส่งคอมเมนต์ที่เพิ่งรายงานให้ AI ตรวจ (server.js /api/moderate-comment) ผิดจริง → เซิร์ฟเวอร์ซ่อนให้ทุกเครื่อง
   คืน Promise<{ checked, hidden, explanation } | null> (null = เรียกไม่ได้ / เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า) --- */
var CHIMCHIM_AI_MODERATE_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
	? "http://localhost:8787/api/moderate-comment"
	: "https://chimchim.onrender.com/api/moderate-comment";
function sbRequestCommentModeration(remoteCommentId) {
	if (!remoteCommentId) return Promise.resolve(null);
	return fetch(CHIMCHIM_AI_MODERATE_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ commentId: remoteCommentId })
	}).then(function(res) {
		return res.json().catch(function() { return null; });
	}).catch(function() { return null; });
}
function sbFetchCommentCounts(postIds) {
	return sbFetchCommentSummaries(postIds).then(function(sum) {
		var counts = {};
		Object.keys(sum).forEach(function(k) { counts[k] = sum[k].count; });
		return counts;
	});
}

/* =====================================================================
   โพสต์ — sync จริงกับ Supabase (เหมือนร้าน: local-first แล้วผลักขึ้น + reconcile id ถ้าเป็นโพสต์ใหม่)
   ===================================================================== */
function sbPostRowToLocal(row) {
	return {
		id: String(row.id),
		userId: row.user_id,
		userName: row.profiles ? row.profiles.name : null,
		userAvatar: row.profiles ? row.profiles.avatar_url : null,
		pageId: row.page_id,
		images: row.images,
		caption: row.caption || "",
		date: row.created_at
	};
}
function sbPostToRow(post) {
	return { user_id: post.userId, page_id: post.pageId || null, images: post.images, caption: post.caption || "" };
}
// ผลักโพสต์ขึ้น Supabase จริง (insert ถ้ายังไม่เคย sync — เช็คจาก remoteId ที่แปะไว้ตอน sync ครั้งก่อน, update ถ้าเคยแล้ว)
function sbSavePost(post) {
	if (!sbClient) return Promise.resolve(null);
	var row = sbPostToRow(post);
	var query = post.remoteId
		? sbClient.from("posts").update(row).eq("id", post.remoteId)
		: sbClient.from("posts").insert(row);
	return query.select().single().then(function(res) {
		if (res.error) {
			console.error("[chimchim] sbSavePost error:", res.error.message);
			return null;
		}
		return res.data;
	}).catch(function() { return null; });
}
function sbDeletePost(remoteId) {
	if (!sbClient || !remoteId) return Promise.resolve();
	return Promise.resolve(sbClient.from("posts").delete().eq("id", remoteId)).catch(function() {});
}
// ดึงโพสต์ของทุกคนจาก Supabase จริง (ไม่ใช่แค่ที่เคยเห็นในเครื่องนี้) — ซ่อนอันที่โดนรายงานถึงเกณฑ์ไปแล้วออกเลย
function sbFetchAllPosts() {
	if (!sbClient) return Promise.resolve([]);
	return sbClient.from("posts").select("*, profiles!user_id(name, avatar_url)").eq("is_hidden", false).order("created_at", { ascending: false }).then(function(res) {
		if (res.error) {
			console.error("[chimchim] sbFetchAllPosts error:", res.error.message);
			return [];
		}
		return res.data.map(sbPostRowToLocal);
	}).catch(function() { return []; });
}
// จุดเรียกหลัก — เรียกตอนเปิดหน้าแรก/โปรไฟล์: push โพสต์ของฉันที่ยังไม่เคย sync ขึ้นก่อน แล้วดึงโพสต์ทุกคนมาผสาน
function syncPostsWithSupabase(onUpdated) {
	if (!sbClient) return;
	var me = getMe();
	var myUnsyncedPosts = me ? getAllPosts().filter(function(p) { return p.userId === me.id && !p.remoteId; }) : [];

	var pushAll = myUnsyncedPosts.reduce(function(chain, post) {
		return chain.then(function() {
			return sbSavePost(post).then(function(saved) {
				if (saved) reconcilePostId(post.id, String(saved.id));
			});
		});
	}, Promise.resolve());

	pushAll.then(function() {
		return sbFetchAllPosts();
	}).then(function(remotePosts) {
		// เรียก merge เสมอแม้ remote จะว่าง (ต้องเช็ค "โพสต์ที่เคย sync แต่หายไปแล้วจริง ๆ" ด้วย ไม่ใช่แค่เพิ่มของใหม่)
		mergeRemotePostsIntoLocal(remotePosts);
		if (typeof onUpdated === "function") onUpdated();
	});
}

/* =====================================================================
   Analytics — ผลัก event ขึ้น Supabase จริงด้วย (insert-only ตาม RLS เหมือนรายงาน)
   ===================================================================== */
function sbLogEvent(eventType, userId, metadata) {
	if (!sbClient) return Promise.resolve(null);
	return sbClient.from("analytics_events").insert({
		user_id: userId || null,
		event_type: eventType,
		metadata: metadata || {}
	}).then(function(res) {
		if (res.error) console.error("[chimchim] sbLogEvent error:", res.error.message);
	}).catch(function() {});
}

/* =====================================================================
   รายงานเนื้อหา — ผลักขึ้น Supabase จริง (moderation_reports เป็น insert-only อ่านกลับไม่ได้ตาม RLS
   ผลลัพธ์ที่เห็นได้คือ is_hidden ที่ trigger ฝั่ง Supabase เซ็ตให้เองเมื่อถึงเกณฑ์ 3 รายงาน)
   ใช้ได้เฉพาะร้าน/โพสต์ที่ sync ขึ้น Supabase แล้วเท่านั้น (id เป็นตัวเลขจริง ไม่ใช่ "post"+timestamp ชั่วคราว)
   ===================================================================== */
// เหตุผลเดิมที่ตาราง moderation_reports รองรับตั้งแต่แรก (check constraint) — เหตุผลใหม่/รายงานคอมเมนต์
// ต้องรัน SQL Phase 8 ก่อน ถ้ายังไม่รัน insert จะโดน constraint ปัด (code 23514) เลยส่งซ้ำเป็น "other"
// แล้วแปะเหตุผลจริงไว้หน้ารายละเอียด รายงานจะได้ไม่หายไปเฉย ๆ
var SB_LEGACY_REPORT_REASONS = ["spam", "inappropriate", "fake", "other"];
function sbReportContent(targetType, targetId, reason, note) {
	var me = getMe();
	var numericId = parseInt(String(targetId).replace(/^cmt/, ""), 10);
	if (!sbClient || !me || isNaN(numericId)) return Promise.resolve(null);
	function insert(row) {
		return sbClient.from("moderation_reports").insert(row);
	}
	var row = { target_type: targetType, target_id: numericId, reporter_id: me.id, reason: reason, note: note || "" };
	return insert(row).then(function(res) {
		if (!res.error) return true;
		var legacyOk = SB_LEGACY_REPORT_REASONS.indexOf(reason) !== -1;
		if (res.error.code === "23514" && !legacyOk && targetType !== "comment") {
			return insert({ target_type: targetType, target_id: numericId, reporter_id: me.id, reason: "other", note: "[" + reason + "] " + (note || "") }).then(function(res2) {
				if (res2.error) console.error("[chimchim] sbReportContent error:", res2.error.message);
				return !res2.error;
			});
		}
		console.error("[chimchim] sbReportContent error:", res.error.message);
		return false;
	}).catch(function() { return false; });
}

/* =====================================================================
   คอมเมนต์ — ใช้ได้จริงข้ามเครื่องเฉพาะโพสต์ที่ sync ขึ้น Supabase แล้ว (postId เป็นตัวเลขจริง)
   ===================================================================== */
function sbAddComment(postId, authorName, text) {
	var me = getMe();
	if (!sbClient || !me) return Promise.resolve(null);
	var row = { author_id: me.id, text: text };
	if (sbIsSeedPostId(postId)) row.post_key = String(postId);
	else if (/^\d+$/.test(String(postId))) row.post_id = parseInt(postId, 10);
	else return Promise.resolve(null); // โพสต์ใหม่ที่ยังไม่ได้ id จริง — sync ทีหลัง
	return sbClient.from("comments").insert(row).select().single().then(function(res) {
		if (res.error) {
			console.error("[chimchim] sbAddComment error:", res.error.message);
			return null;
		}
		return res.data;
	}).catch(function() { return null; });
}
// แก้/ลบคอมเมนต์ของตัวเอง — ขอแถวที่โดนแก้/ลบกลับมาด้วย (.select()) เพราะถ้าโดน RLS บล็อก Supabase จะไม่ error
// แต่คืน 0 แถวเฉย ๆ ต้องเช็คจำนวนแถวถึงจะรู้ว่าสำเร็จจริง — คืน Promise<boolean>
// (แก้ไขต้องรัน policy "comments_update_own" ใน schema.sql Phase 7 ก่อน ส่วนลบมี comments_delete_own อยู่แล้ว)
function sbUpdateComment(remoteId, text) {
	if (!sbClient) return Promise.resolve(false);
	return Promise.resolve(sbClient.from("comments").update({ text: text }).eq("id", remoteId).select()).then(function(res) {
		if (res.error) console.error("[chimchim] sbUpdateComment error:", res.error.message);
		return !res.error && !!res.data && res.data.length > 0;
	}).catch(function() { return false; });
}
function sbDeleteComment(remoteId) {
	if (!sbClient) return Promise.resolve(false);
	return Promise.resolve(sbClient.from("comments").delete().eq("id", remoteId).select()).then(function(res) {
		if (res.error) console.error("[chimchim] sbDeleteComment error:", res.error.message);
		return !res.error && !!res.data && res.data.length > 0;
	}).catch(function() { return false; });
}
// จุดเรียกหลัก — เรียกตอนเปิดโพสต์ดูคอมเมนต์ ดึงคอมเมนต์จริงของทุกคนมาแทนที่ของในเครื่องนี้ทั้งชุด
function syncCommentsWithSupabase(postId, onUpdated, _alreadyPushed) {
	if (!sbClient) return;
	// คอมเมนต์ของเราที่ยังอยู่แค่ในเครื่อง (เช่น เคยคอมเมนต์โพสต์ตัวอย่างตอนยังส่งขึ้นไม่ได้) → ผลักขึ้นก่อน 1 รอบ
	// ไม่งั้นพอดึงชุดจริงมาแทนที่ คอมเมนต์เก่าพวกนี้จะหายไปเฉย ๆ — ถ้าผลักไม่สำเร็จ เก็บของในเครื่องไว้ ไม่แทนที่
	var me = getMe();
	if (!_alreadyPushed && me) {
		var orphans = getComments(postId).filter(function(c) {
			// pending ที่ค้างเกิน 1 นาที = เคยส่งไม่ขึ้น (ไม่ใช่กำลังส่งอยู่) ส่งซ้ำได้
			var stuck = !c.pending || Date.now() - new Date(c.date).getTime() > 60 * 1000;
			return !c.remoteId && stuck && (c.userId === me.id || (!c.userId && c.author === me.name));
		});
		if (orphans.length) {
			Promise.all(orphans.map(function(c) { return sbAddComment(postId, c.author, c.text); })).then(function(rows) {
				if (rows.some(function(r) { return !r; })) return; // ส่งไม่ขึ้น (เช่น ยังไม่รัน SQL) — ไม่แตะของในเครื่อง
				syncCommentsWithSupabase(postId, onUpdated, true);
			});
			return;
		}
	}
	var q = sbClient.from("comments").select("*, profiles!author_id(name)");
	if (sbIsSeedPostId(postId)) q = q.eq("post_key", String(postId));
	else if (/^\d+$/.test(String(postId))) q = q.eq("post_id", parseInt(postId, 10));
	else return;
	q.order("created_at", { ascending: true }).then(function(res) {
		if (res.error || !res.data) return;
		// คอมเมนต์ที่ AI ตรวจแล้วว่าผิดจริง (is_hidden) ไม่แสดงให้ใครเห็นอีก
		var comments = res.data.filter(function(row) { return row.is_hidden !== true; }).map(function(row) {
			return { id: "cmt" + row.id, remoteId: row.id, author: (row.profiles && row.profiles.name) || t("common.chimchimFoodie"), text: row.text, date: row.created_at, userId: row.author_id };
		});
		replaceLocalComments(postId, comments);
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}
