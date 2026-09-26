// scripts/admin-view-reports.js
// สคริปต์แอดมินสำหรับดูรายงานเนื้อหาจริงจาก Supabase
//
// ทำไมต้องมีสคริปต์แยก: ตาราง moderation_reports เป็น insert-only ตาม RLS (ใครก็รายงานได้ แต่ไม่มีใคร
// อ่านรายงานของคนอื่นผ่าน anon key ได้เลย แม้แต่เจ้าของแอปเอง) เพื่อความเป็นส่วนตัวของผู้รายงาน — ต้องใช้
// secret key (service role) เท่านั้นถึงจะอ่านได้จริง ซึ่ง secret key ห้ามใส่ในโค้ดฝั่ง frontend เด็ดขาด
// (bypass RLS ทั้งหมด ใครเอาไปก็เข้าถึง/แก้ไขข้อมูลทุกคนได้) เลยต้องรันเป็นสคริปต์ฝั่งนี้แทน ไม่ใช่หน้าในแอป
//
// วิธีใช้:
// 1. เปิดไฟล์ .env (ไฟล์เดียวกับที่มี GEMINI_API_KEY อยู่แล้ว) เพิ่ม 2 บรรทัดนี้:
//      SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
//      SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxx
//    (เอาจาก Supabase Dashboard → Settings → API Keys → "secret" key เท่านั้น ห้ามใช้ publishable key)
// 2. รัน: npm run admin:reports

import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SECRET_KEY) {
	console.error("[admin-view-reports] ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SECRET_KEY ใน .env ก่อน (ดูวิธีใช้ด้านบนของไฟล์นี้)");
	process.exit(1);
}

async function sbAdminGet(path) {
	const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
		headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` }
	});
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	return res.json();
}

const REASON_LABEL = { spam: "สแปม", inappropriate: "ไม่เหมาะสม", fake: "ข้อมูลเท็จ", other: "อื่น ๆ" };

async function main() {
	const reports = await sbAdminGet("moderation_reports?select=*&order=created_at.desc");
	if (!reports.length) {
		console.log("ยังไม่มีรายงานเข้ามาเลย");
		return;
	}

	var grouped = {};
	reports.forEach(function(r) {
		var key = r.target_type + ":" + r.target_id;
		if (!grouped[key]) grouped[key] = { targetType: r.target_type, targetId: r.target_id, reports: [] };
		grouped[key].reports.push(r);
	});

	var entries = Object.values(grouped).sort(function(a, b) { return b.reports.length - a.reports.length; });

	console.log("พบรายงานทั้งหมด " + reports.length + " รายการ ครอบคลุม " + entries.length + " ชิ้นเนื้อหา\n");

	for (const entry of entries) {
		var table = entry.targetType === "post" ? "posts" : "shops";
		var content = null;
		try {
			var rows = await sbAdminGet(table + "?id=eq." + entry.targetId + "&select=*");
			content = rows[0] || null;
		} catch (e) {
			// เนื้อหาอาจถูกลบไปแล้ว — ไม่เป็นไร แค่โชว์ id เฉย ๆ ต่อ
		}

		var hidden = content ? content.is_hidden : null;
		var label = entry.targetType === "post"
			? (content ? "โพสต์ #" + entry.targetId + " — \"" + (content.caption || "").slice(0, 40) + "\"" : "โพสต์ #" + entry.targetId + " (ถูกลบไปแล้ว)")
			: (content ? "ร้าน #" + entry.targetId + " — " + content.shop_name + " (" + content.menu_name + ")" : "ร้าน #" + entry.targetId + " (ถูกลบไปแล้ว)");

		console.log(label);
		console.log("  รายงานทั้งหมด: " + entry.reports.length + " ครั้ง" + (hidden === true ? " 🔒 ถูกซ่อนอัตโนมัติแล้ว (ถึงเกณฑ์ 3 รายงาน)" : hidden === false ? " 👁️ ยังไม่ถูกซ่อน" : ""));

		var reasonCounts = {};
		entry.reports.forEach(function(r) { reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1; });
		console.log("  เหตุผล: " + Object.keys(reasonCounts).map(function(reason) { return (REASON_LABEL[reason] || reason) + " x" + reasonCounts[reason]; }).join(", "));
		console.log("");
	}
}

main().catch(function(err) {
	console.error("เกิดข้อผิดพลาด:", err.message);
	process.exit(1);
});
