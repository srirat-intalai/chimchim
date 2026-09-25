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
