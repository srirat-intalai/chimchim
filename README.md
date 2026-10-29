# ChimChim

แอป AI + Food DNA ช่วยจับคู่ร้านอาหารให้ตรงรสนิยมคุณ — เว็บสถิตล้วน (HTML/CSS/JS ไม่มี build step) เก็บข้อมูลจริงผ่าน Supabase และมีเซิร์ฟเวอร์เล็ก ๆ (`server.js`) แยกไว้คุยกับ Gemini เพื่อไม่ให้ API key หลุดไปอยู่ในโค้ดฝั่งเบราว์เซอร์

## โครงสร้าง

- หน้าเว็บหลัก (`*.html`, `js/`, `css/`) — deploy ผ่าน GitHub Pages ได้เลย ไม่มี build step
- `server.js` — เซิร์ฟเวอร์ให้ Gemini ตรวจคอมเมนต์ที่ถูกรายงาน และแปลง Prompt บนหน้าสุ่มร้านเป็นเงื่อนไข (ใช้ Token) ต้อง deploy แยกต่างหาก (คนละที่จากตัวเว็บ) เพราะเก็บ API key ไว้
- `supabase/schema.sql` — schema ทั้งหมดของฐานข้อมูลจริง ดูวิธีตั้งค่าใน `supabase/SETUP.md`
- `scripts/admin-view-reports.js` — สคริปต์แอดมินดูรายงานเนื้อหา (รันในเครื่องเท่านั้น)
- `scripts/admin-review-shops.js` — สคริปต์แอดมินตรวจร้านที่ผู้ใช้เพิ่ม (รันในเครื่องเท่านั้น ดูหัวข้อด้านล่าง)

## Deploy เซิร์ฟเวอร์ AI (server.js)

เว็บหลักอยู่บน GitHub Pages ได้ แต่ `server.js` ต้อง deploy แยกไปที่รันโค้ด Node.js ได้จริง (GitHub Pages เสิร์ฟได้แค่ไฟล์สถิต รันเซิร์ฟเวอร์ไม่ได้) แนะนำ [Render](https://render.com) เพราะมีแผนฟรีและตั้งค่าไม่ยาก:

1. ล็อกอิน Render ด้วยบัญชี GitHub แล้วกด **New** → **Web Service** → เลือก repo นี้
2. ตั้งค่า:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
3. ไปที่ **Environment** เพิ่มตัวแปรเหล่านี้:
   - `GEMINI_API_KEY` — API key จริงจาก Google AI Studio
   - `ALLOWED_ORIGINS` — ใส่ `https://srirat-intalai.github.io` (origin จริงที่เว็บหลักถูก serve อยู่ — ไม่ใส่ path ต่อท้าย ใส่แค่ domain)
   - (ไม่บังคับ) `GEMINI_MODEL` — ถ้าไม่ตั้งจะใช้ `gemini-3.6-flash`
4. กด Deploy รอสักครู่ จะได้ URL แบบ `https://ชื่อที่ตั้งไว้.onrender.com`
5. ถ้า URL ที่ได้ไม่ใช่ `https://chimchim.onrender.com` ให้แก้ `CHIMCHIM_AI_SERVER` ใน [js/chimchim-supabase-client.js](js/chimchim-supabase-client.js) ให้ตรง แล้ว commit + push ขึ้น GitHub Pages ใหม่
6. ตั้ง `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` ใน Environment ด้วย (ใช้ซ่อนคอมเมนต์ที่ AI ตัดสินว่าผิดจริง และหัก Token ของช่อง Prompt)
7. รัน SQL **Phase 20** ใน `supabase/schema.sql` (ระบบ Token ของช่อง Prompt บนหน้าสุ่มร้าน: ฟรีวันละ 5 Token ใช้ครั้งละ 1)

**หมายเหตุ:** แผนฟรีของ Render จะ sleep เซิร์ฟเวอร์เองหลังไม่มีคนเรียกสักพัก แล้วช้าตอนตื่นครั้งแรก (cold start ~30 วินาที) เป็นเรื่องปกติของแผนฟรี ไม่ใช่บั๊ก

## ตรวจร้านที่ผู้ใช้เพิ่ม

ร้านที่ผู้ใช้เพิ่มเข้ามาจะอยู่สถานะ **รอตรวจ** และยังไม่ขึ้นในคำแนะนำ ไข่สุ่ม หรือ AI Finder จนกว่าทีมจะอนุมัติ (ระหว่างรอยังเปิดหน้าร้านและค้นหาเจอได้ตามปกติ) การตรวจคือดูว่าข้อมูลร้านมีอยู่จริงและถูกต้อง เช่น ชื่อ ที่ตั้ง รูป หมวด ไม่ใช่การให้คะแนนรสชาติ

1. รัน SQL **Phase 19** ใน `supabase/schema.sql` บน Supabase (SQL Editor) ครั้งเดียว — ร้านของผู้ใช้ที่มีอยู่แล้วทั้งหมดจะเป็น "รอตรวจ" ส่วนร้านตั้งต้นของทีมเป็น "ผ่านแล้ว"
2. ตั้ง `SUPABASE_URL` และ `SUPABASE_SECRET_KEY` ใน `.env` (แบบเดียวกับ `admin:reports`)
3. ดูร้านที่รอตรวจ: `npm run admin:shops`
4. อนุมัติ: `npm run admin:shops -- approve <id>` / ไม่อนุมัติ: `npm run admin:shops -- reject <id> "เหตุผล"` (เจ้าของร้านจะเห็นเหตุผลในโปรไฟล์ร้าน)

เจ้าของร้านเปลี่ยนสถานะเองไม่ได้ และถ้าแก้ชื่อร้าน เมนู หมวด รูป หมุด หรือมหาวิทยาลัยหลังผ่านแล้ว ร้านจะกลับไปรอตรวจใหม่ (แก้คำอธิบาย/เวลาเปิด/โปรโมชั่นไม่ต้องตรวจใหม่)
