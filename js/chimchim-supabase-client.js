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
