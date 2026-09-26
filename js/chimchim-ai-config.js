// chimchim-ai-config.js
// URL ของเซิร์ฟเวอร์ AI proxy (server.js) ที่คุยกับ Gemini จริง
// ตอนพัฒนาในเครื่อง (เปิดผ่าน localhost/127.0.0.1) จะเรียก server.js ที่รันอยู่ในเครื่องเดียวกันอัตโนมัติ
// บนเว็บจริง deploy ไว้ที่ Render แล้ว (ดูวิธีทำใน README.md หัวข้อ "Deploy เซิร์ฟเวอร์ AI")
var CHIMCHIM_AI_CHAT_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
	? "http://localhost:8787/api/chat-reply"
	: "https://chimchim.onrender.com/api/chat-reply";
