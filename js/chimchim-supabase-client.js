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
		promo: row.promo
	};
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

/* =====================================================================
   รีวิวร้าน — ผลักขึ้นทันทีตอนส่ง + ดึงของคนอื่นมาผสานตอนเปิดดูร้าน (ดู mergeRemoteReviewsIntoLocal ใน core.js)
   ===================================================================== */
function sbReviewRowToLocal(row) {
	return { remoteId: row.id, taste: row.taste, atmosphere: row.atmosphere, service: row.service, text: row.text || "", author: row.author_name, userId: row.user_id, date: row.created_at };
}
function sbSubmitReview(shopId, review) {
	if (!sbClient) return Promise.resolve(null);
	return sbClient.from("reviews").insert({
		shop_id: shopId,
		user_id: review.userId || null,
		author_name: review.author,
		taste: review.taste,
		atmosphere: review.atmosphere,
		service: review.service,
		text: review.text || ""
	}).select().single().then(function(res) {
		if (res.error) {
			console.error("[chimchim] sbSubmitReview error:", res.error.message);
			return null;
		}
		return sbReviewRowToLocal(res.data);
	}).catch(function() { return null; });
}
// แก้ไข/ลบรีวิวที่เคย sync ขึ้น Supabase แล้วเท่านั้น (ต้องมี remoteId จริง) ต้องรัน migration "Phase 4"
// (reviews_update_own / reviews_delete_own policy) ก่อน ไม่งั้นจะถูก RLS บล็อกเงียบ ๆ เหมือนที่เจอกับ posts มาก่อน
function sbUpdateReview(remoteId, patch) {
	if (!sbClient) return Promise.resolve(null);
	var row = {};
	if (typeof patch.taste === "number") row.taste = patch.taste;
	if (typeof patch.atmosphere === "number") row.atmosphere = patch.atmosphere;
	if (typeof patch.service === "number") row.service = patch.service;
	if (typeof patch.text === "string") row.text = patch.text;
	return sbClient.from("reviews").update(row).eq("id", remoteId).then(function(res) {
		if (res.error) console.error("[chimchim] sbUpdateReview error:", res.error.message);
	}).catch(function() {});
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
function sbSetShopLike(shopId, liked) {
	var me = getMe();
	if (!me || !sbClient) return Promise.resolve();
	var query = liked
		? sbClient.from("likes_shops").insert({ user_id: me.id, shop_id: shopId })
		: sbClient.from("likes_shops").delete().eq("user_id", me.id).eq("shop_id", shopId);
	return Promise.resolve(query).catch(function() {});
}
function sbSetPostLike(postId, liked) {
	var me = getMe();
	var numericId = parseInt(postId, 10);
	if (!me || !sbClient || isNaN(numericId)) return Promise.resolve();
	var query = liked
		? sbClient.from("likes_posts").insert({ user_id: me.id, post_id: numericId })
		: sbClient.from("likes_posts").delete().eq("user_id", me.id).eq("post_id", numericId);
	return Promise.resolve(query).catch(function() {});
}
function sbSetFollow(targetType, targetId, following) {
	var me = getMe();
	if (!me || !sbClient) return Promise.resolve();
	var query = following
		? sbClient.from("follows").insert({ follower_id: me.id, target_type: targetType, target_id: String(targetId) })
		: sbClient.from("follows").delete().eq("follower_id", me.id).eq("target_type", targetType).eq("target_id", String(targetId));
	return Promise.resolve(query).catch(function() {});
}
// ครั้งแรกที่เคย sync ในเครื่องนี้เท่านั้น (ยังไม่เคย backfill): เอาไลก์/ติดตามเดิมที่ทำไว้ก่อนมีระบบ sync
// (ยุค localStorage ล้วน ๆ) ผลักขึ้น Supabase ให้ครบก่อน แล้ว union เข้ากับของจริง — ครั้งต่อ ๆ ไปหลังจากนั้น
// ให้ "แทนที่ทั้งชุด" ด้วยของจริงจาก Supabase ตรง ๆ เลย เพราะทุกครั้งที่กด/เลิกกดหลังจากนี้ push ขึ้นจริงทันทีอยู่แล้ว
// (ถ้ายัง union ตลอดไป การเลิกไลก์/เลิกติดตามจากเครื่องอื่นจะไม่มีวันหายไปจากเครื่องนี้ แถมจะถูกผลักกลับขึ้นไปซ้ำอีกด้วย)
var CHIMCHIM_LIKES_FOLLOWS_BACKFILLED_KEY = "chimchim_likes_follows_backfilled_v1";
function syncLikesAndFollowsWithSupabase(onUpdated) {
	var me = getMe();
	if (!me || !sbClient) return;
	var isFirstBackfill = !localStorage.getItem(CHIMCHIM_LIKES_FOLLOWS_BACKFILLED_KEY);

	var p1 = sbClient.from("likes_shops").select("shop_id").eq("user_id", me.id).then(function(res) {
		var remote = (res.data || []).map(function(r) { return r.shop_id; });
		if (!isFirstBackfill) {
			localStorage.setItem(CHIMCHIM_LIKES_KEY, JSON.stringify(remote));
			return;
		}
		var toPush = getLikedShops().filter(function(id) { return remote.indexOf(id) === -1; });
		return Promise.all(toPush.map(function(id) { return sbSetShopLike(id, true); })).then(function() {
			mergeLocalIdSet(CHIMCHIM_LIKES_KEY, remote);
		});
	}).catch(function() {});

	var p2 = sbClient.from("likes_posts").select("post_id").eq("user_id", me.id).then(function(res) {
		var remote = (res.data || []).map(function(r) { return String(r.post_id); });
		if (!isFirstBackfill) {
			localStorage.setItem(CHIMCHIM_POST_LIKES_KEY, JSON.stringify(remote));
			return;
		}
		var toPush = getLikedPosts().filter(function(id) { return remote.indexOf(id) === -1; });
		return Promise.all(toPush.map(function(id) { return sbSetPostLike(id, true); })).then(function() {
			mergeLocalIdSet(CHIMCHIM_POST_LIKES_KEY, remote);
		});
	}).catch(function() {});

	var p3 = sbClient.from("follows").select("target_type, target_id").eq("follower_id", me.id).then(function(res) {
		var rows = res.data || [];
		var remoteShops = rows.filter(function(r) { return r.target_type === "shop"; }).map(function(r) { return parseInt(r.target_id, 10); });
		var remoteUsers = rows.filter(function(r) { return r.target_type === "profile"; }).map(function(r) { return r.target_id; });
		if (!isFirstBackfill) {
			localStorage.setItem(CHIMCHIM_FOLLOWS_KEY, JSON.stringify(remoteShops));
			localStorage.setItem(CHIMCHIM_FOLLOWED_USERS_KEY, JSON.stringify(remoteUsers));
			return;
		}
		var toPushShops = getFollowedShops().filter(function(id) { return remoteShops.indexOf(id) === -1; });
		var toPushUsers = getFollowedUsers().filter(function(id) { return remoteUsers.indexOf(id) === -1; });
		return Promise.all(
			toPushShops.map(function(id) { return sbSetFollow("shop", id, true); })
				.concat(toPushUsers.map(function(id) { return sbSetFollow("profile", id, true); }))
		).then(function() {
			mergeLocalIdSet(CHIMCHIM_FOLLOWS_KEY, remoteShops);
			mergeLocalIdSet(CHIMCHIM_FOLLOWED_USERS_KEY, remoteUsers);
		});
	}).catch(function() {});

	Promise.all([p1, p2, p3]).then(function() {
		if (isFirstBackfill) localStorage.setItem(CHIMCHIM_LIKES_FOLLOWS_BACKFILLED_KEY, "1");
		if (typeof onUpdated === "function") onUpdated();
	});
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
	var numericIds = postIds.map(function(id) { return parseInt(id, 10); }).filter(function(n) { return !isNaN(n); });
	if (!sbClient || !numericIds.length) return Promise.resolve({});
	return sbClient.from("likes_posts").select("post_id").in("post_id", numericIds).then(function(res) {
		var counts = {};
		(res.data || []).forEach(function(r) { counts[r.post_id] = (counts[r.post_id] || 0) + 1; });
		return counts;
	}).catch(function() { return {}; });
}
function sbFetchCommentCounts(postIds) {
	var numericIds = postIds.map(function(id) { return parseInt(id, 10); }).filter(function(n) { return !isNaN(n); });
	if (!sbClient || !numericIds.length) return Promise.resolve({});
	return sbClient.from("comments").select("post_id").in("post_id", numericIds).then(function(res) {
		var counts = {};
		(res.data || []).forEach(function(r) { counts[r.post_id] = (counts[r.post_id] || 0) + 1; });
		return counts;
	}).catch(function() { return {}; });
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
function sbReportContent(targetType, targetId, reason) {
	var me = getMe();
	var numericId = parseInt(targetId, 10);
	if (!sbClient || !me || isNaN(numericId)) return Promise.resolve(null);
	return sbClient.from("moderation_reports").insert({
		target_type: targetType,
		target_id: numericId,
		reporter_id: me.id,
		reason: reason
	}).then(function(res) {
		if (res.error) console.error("[chimchim] sbReportContent error:", res.error.message);
	}).catch(function() {});
}

/* =====================================================================
   คอมเมนต์ — ใช้ได้จริงข้ามเครื่องเฉพาะโพสต์ที่ sync ขึ้น Supabase แล้ว (postId เป็นตัวเลขจริง)
   ===================================================================== */
function sbAddComment(postId, authorName, text) {
	var me = getMe();
	var numericPostId = parseInt(postId, 10);
	if (!sbClient || !me || isNaN(numericPostId)) return Promise.resolve(null);
	return sbClient.from("comments").insert({ post_id: numericPostId, author_id: me.id, text: text }).select().single().then(function(res) {
		if (res.error) {
			console.error("[chimchim] sbAddComment error:", res.error.message);
			return null;
		}
		return res.data;
	}).catch(function() { return null; });
}
// จุดเรียกหลัก — เรียกตอนเปิดโพสต์ดูคอมเมนต์ ดึงคอมเมนต์จริงของทุกคนมาแทนที่ของในเครื่องนี้ทั้งชุด
function syncCommentsWithSupabase(postId, onUpdated) {
	var numericPostId = parseInt(postId, 10);
	if (!sbClient || isNaN(numericPostId)) return;
	sbClient.from("comments").select("*, profiles!author_id(name)").eq("post_id", numericPostId).order("created_at", { ascending: true }).then(function(res) {
		if (res.error || !res.data) return;
		var comments = res.data.map(function(row) {
			return { id: "cmt" + row.id, author: (row.profiles && row.profiles.name) || t("common.chimchimFoodie"), text: row.text, date: row.created_at, userId: row.author_id };
		});
		replaceLocalComments(postId, comments);
		if (typeof onUpdated === "function") onUpdated();
	}).catch(function() {});
}
