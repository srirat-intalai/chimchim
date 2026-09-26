// chimchim-ai-config.js
// URL ของเซิร์ฟเวอร์ AI proxy (server.js) ที่คุยกับ Gemini จริง
// ตอนพัฒนาในเครื่อง (เปิดผ่าน localhost/127.0.0.1) จะเรียก server.js ที่รันอยู่ในเครื่องเดียวกันอัตโนมัติ
// พอ deploy เว็บขึ้นจริงแล้ว (เช่น GitHub Pages) ต้อง deploy server.js แยกไปที่อื่นด้วย (เช่น Render — ดูวิธีทำ
// ใน README.md หัวข้อ "Deploy เซิร์ฟเวอร์ AI") แล้วเอา URL จริงที่ได้มาแทนที่บรรทัดด้านล่างนี้ ไม่งั้นแชท AI
// บนเว็บจริงจะเงียบ ๆ ใช้ไม่ได้ (fallback ไปข้อความสำเร็จรูปแทนตลอด ไม่ error ให้เห็นชัด)
// หมายเหตุ: ค่า placeholder ด้านล่างต้องเป็น URL ที่ถูกต้องตามรูปแบบเสมอ (ห้ามมีช่องว่าง/ภาษาไทยปน)
// เพราะ fetch() จะ throw error ทันทีถ้า URL ผิดรูปแบบ (ไม่ fallback แบบ network error ปกติ)
var CHIMCHIM_AI_CHAT_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
	? "http://localhost:8787/api/chat-reply"
	: "https://your-server-name-here.onrender.com/api/chat-reply"; // แก้เป็น URL จริงหลัง deploy server.js แล้ว
