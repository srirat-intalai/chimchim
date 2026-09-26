# ChimChim

แอป AI + Food DNA ช่วยจับคู่ร้านอาหารให้ตรงรสนิยมคุณ — เว็บสถิตล้วน (HTML/CSS/JS ไม่มี build step) เก็บข้อมูลจริงผ่าน Supabase และมีเซิร์ฟเวอร์เล็ก ๆ (`server.js`) แยกไว้คุยกับ Gemini เพื่อไม่ให้ API key หลุดไปอยู่ในโค้ดฝั่งเบราว์เซอร์

## โครงสร้าง

- หน้าเว็บหลัก (`*.html`, `js/`, `css/`) — deploy ผ่าน GitHub Pages ได้เลย ไม่มี build step
- `server.js` — พร็อกซีเรียก Gemini สำหรับแชท AI Food Finder ต้อง deploy แยกต่างหาก (คนละที่จากตัวเว็บ) เพราะเก็บ API key ไว้
- `supabase/schema.sql` — schema ทั้งหมดของฐานข้อมูลจริง ดูวิธีตั้งค่าใน `supabase/SETUP.md`
- `scripts/admin-view-reports.js` — สคริปต์แอดมินดูรายงานเนื้อหา (รันในเครื่องเท่านั้น)

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
5. เปิดไฟล์ [js/chimchim-ai-config.js](js/chimchim-ai-config.js) เอา URL จริงที่ได้ (ต่อท้ายด้วย `/api/chat-reply`) ไปแทนที่ค่า placeholder ตรง `CHIMCHIM_AI_CHAT_URL` ในเงื่อนไข production แล้ว commit + push ขึ้น GitHub Pages ใหม่

หลังทำครบทุกข้อ แชท AI Food Finder บนเว็บจริงถึงจะคุยกับ Gemini ได้จริง — ก่อนหน้านี้ URL ฝังเป็น `localhost` ตรง ๆ เลยใช้งานไม่ได้เลยตอนเปิดจากเว็บจริง (เงียบ ๆ ไม่มี error ให้เห็น แค่ fallback ไปข้อความสำเร็จรูปแทน)

**หมายเหตุ:** แผนฟรีของ Render จะ sleep เซิร์ฟเวอร์เองหลังไม่มีคนเรียกสักพัก แล้วช้าตอนตื่นครั้งแรก (cold start ~30 วินาที) เป็นเรื่องปกติของแผนฟรี ไม่ใช่บั๊ก
