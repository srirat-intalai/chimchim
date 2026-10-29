// scripts/admin-review-shops.js
// สคริปต์แอดมินตรวจร้านที่ผู้ใช้เพิ่ม (SQL Phase 19) — ร้านที่ยังไม่ approved ไม่ขึ้นในคำแนะนำ/ไข่สุ่ม/AI
//
// "ตรวจ" = ข้อมูลร้านมีอยู่จริงและถูกต้อง (ชื่อ ที่ตั้ง/หมุด รูป หมวด) ไม่ใช่การให้คะแนนรสชาติ
// ต้องใช้ secret key (service role) เพราะผู้ใช้ทั่วไปเปลี่ยน review_status เองไม่ได้ (trigger ล็อกไว้)
// ห้ามเอาคีย์นี้ไปใส่ในโค้ดฝั่ง frontend เด็ดขาด
//
// วิธีใช้ (ตั้ง SUPABASE_URL + SUPABASE_SECRET_KEY ใน .env แบบเดียวกับ admin-view-reports.js):
//   npm run admin:shops                          ดูร้านที่รอตรวจ
//   npm run admin:shops -- approve 123           อนุมัติร้าน id 123
//   npm run admin:shops -- reject 123 "เหตุผล"   ไม่อนุมัติ พร้อมเหตุผลที่เจ้าของร้านจะเห็น

import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SECRET_KEY) {
	console.error("[admin-review-shops] ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SECRET_KEY ใน .env ก่อน (ดูวิธีใช้ด้านบนของไฟล์นี้)");
	process.exit(1);
}

async function sbAdmin(path, options = {}) {
	const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
		...options,
		headers: {
			apikey: SECRET_KEY,
			Authorization: `Bearer ${SECRET_KEY}`,
			"Content-Type": "application/json",
			Prefer: "return=representation",
			...(options.headers || {})
		}
	});
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	return res.json();
}

function mapLink(shop) {
	return typeof shop.lat === "number" && typeof shop.lng === "number"
		? `https://www.google.com/maps?q=${shop.lat},${shop.lng}`
		: "(ไม่มีหมุด — ตรวจที่ตั้งจากชื่อร้าน/มหาลัย)";
}

async function listPending() {
	const shops = await sbAdmin("shops?select=*,profiles!vendor_id(name)&review_status=eq.pending&order=created_at.asc");
	if (!shops.length) {
		console.log("ไม่มีร้านรอตรวจ");
		return;
	}
	console.log(`ร้านรอตรวจ ${shops.length} ร้าน (เก่าสุดก่อน)\n`);
	for (const s of shops) {
		console.log(`#${s.id}  ${s.shop_name} — ${s.menu_name}`);
		console.log(`  หมวด: ${s.category} · ราคา ฿${s.price_low}–${s.price_high} · ${s.university || "-"} · ${s.distance_m} ม.`);
		console.log(`  เจ้าของ: ${(s.profiles && s.profiles.name) || s.vendor_id} · เพิ่มเมื่อ ${new Date(s.created_at).toLocaleString("th-TH")}`);
		console.log(`  แผนที่: ${mapLink(s)}`);
		console.log(`  รูป: ${String(s.image_url || "").startsWith("data:") ? "(รูปแบบ base64 — เปิดดูในหน้าร้าน)" : s.image_url}`);
		if (s.is_hidden) console.log("  ⚠ ร้านนี้ถูกซ่อนจากการรายงานอยู่แล้ว");
		console.log("");
	}
	console.log('อนุมัติ: npm run admin:shops -- approve <id>   ไม่อนุมัติ: npm run admin:shops -- reject <id> "เหตุผล"');
}

async function setStatus(id, status, note) {
	if (!/^\d+$/.test(String(id))) throw new Error("id ร้านต้องเป็นตัวเลข");
	if (status === "rejected" && !note) throw new Error("ไม่อนุมัติต้องใส่เหตุผลด้วย เจ้าของร้านจะเห็นเหตุผลนี้เพื่อแก้ไข");
	const rows = await sbAdmin(`shops?id=eq.${id}&vendor_id=not.is.null`, {
		method: "PATCH",
		body: JSON.stringify({ review_status: status, review_note: status === "rejected" ? note : null, reviewed_at: new Date().toISOString() })
	});
	if (!rows.length) throw new Error(`ไม่พบร้านที่ผู้ใช้เพิ่ม id ${id}`);
	console.log(`#${id} ${rows[0].shop_name} → ${status === "approved" ? "อนุมัติแล้ว" : "ไม่อนุมัติ: " + note}`);
}

const [cmd, id, ...noteParts] = process.argv.slice(2);
try {
	if (!cmd) await listPending();
	else if (cmd === "approve") await setStatus(id, "approved");
	else if (cmd === "reject") await setStatus(id, "rejected", noteParts.join(" ").trim());
	else throw new Error(`ไม่รู้จักคำสั่ง "${cmd}" — ใช้ได้: (ว่าง) / approve <id> / reject <id> "เหตุผล"`);
} catch (e) {
	console.error("[admin-review-shops]", e.message);
	process.exit(1);
}
