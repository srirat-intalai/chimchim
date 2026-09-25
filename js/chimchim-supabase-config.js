// chimchim-supabase-config.js
// ค่าคอนฟิกเชื่อมต่อ Supabase — ใช้ได้แค่ publishable (anon) key เท่านั้น
// คีย์นี้ถูกออกแบบมาให้เปิดเผยในโค้ดฝั่ง frontend ได้ ความปลอดภัยจริงมาจาก
// Row Level Security (RLS) ที่ตั้งไว้ใน supabase/schema.sql ไม่ใช่การซ่อนคีย์นี้
//
// ห้ามใส่ secret key (sb_secret_... หรือ service_role) ไว้ที่นี่หรือไฟล์ใดก็ตามที่ส่งไปเบราว์เซอร์เด็ดขาด
// เพราะ key นั้นข้าม RLS ได้ทั้งหมด ถ้าหลุดไปอยู่ในโค้ดหน้าเว็บ ใครก็แก้/ลบข้อมูลทุกคนได้
var CHIMCHIM_SUPABASE_URL = "https://aesqbukxzelcedrgjehh.supabase.co";
var CHIMCHIM_SUPABASE_ANON_KEY = "sb_publishable_7YaPzxfYnsNrX2nuTHmKCA_gGJ66cvX";
