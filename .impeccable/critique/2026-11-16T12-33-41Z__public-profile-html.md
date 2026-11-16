---
target: public-profile.html
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/yok/Downloads/chimchim-web/public-profile.html"
target_fingerprint: "sha256:b48fbb39c22f0ea74625a3af0ef6015d0b28e961b549bffb3fb7db16f440721d"
target_path: /Users/yok/Downloads/chimchim-web/public-profile.html
timestamp: 2026-11-16T12-33-41Z
slug: public-profile-html
---
# Critique: public-profile.html (รอบ 4)
Method: dual-agent (A: design review · B: detector + browser)

## คะแนน 29/40 (Good) — 26 → 27 → 28 → 29
| # | Heuristic | คะแนน | ปัญหาหลัก |
|---|---|---|---|
| 1 | สถานะของระบบ | 3 | sheet ขึ้น "ยังไม่มีผู้ติดตาม" ขณะแท็บบอก 2 เมื่อโหลดโปรไฟล์ในรายชื่อไม่ได้ |
| 2 | ตรงกับโลกจริง | 3 | "Food DNA" ไม่มีคำอธิบายสำหรับ guest |
| 3 | การควบคุม | 3 | ปุ่มย้อนกลับ history.back() เงียบเมื่อเปิดจากลิงก์แชร์ |
| 4 | ความสม่ำเสมอ | 3 | ปุ่มติดตามเปลี่ยนทั้งข้อความและ aria-pressed |
| 5 | ป้องกันผิดพลาด | 3 | เสี่ยงต่ำ |
| 6 | จำได้ดีกว่านึก | 3 | Lv อธิบายในแท็บที่สามเท่านั้น |
| 7 | ความยืดหยุ่น | 2 | ไดอารี่ 12 มื้อ ไม่มีตัวกรอง; โปรไฟล์ตัวเองไม่มีทางลัดแก้ไข |
| 8 | สวยและเรียบ | 3 | หัวโปรไฟล์ถึง y=553 (~65% จอแรก) |
| 9 | กู้จาก error | 3 | sheet บอก "ไม่มี" แทน "โหลดไม่ได้" |
| 10 | ความช่วยเหลือ | 3 | Food DNA ไม่มีคำอธิบายสั้น ณ จุดที่ guest เห็น |

## ความเฉพาะตัว
เนื้อหาเฉพาะตัว (กล่องรสนิยม, ปกรูปไดอารี่/Dino, "มื้อ") แต่โครงยังเป็นเทมเพลตโปรไฟล์โซเชียล; ไดอารี่ไม่มีรูปเป็นผนังการ์ดเบจไอคอนเดียวกัน
CLI 9 จุด: FP 7, น่าจะ FP 1 (dark-glow), จริงเล็กน้อย 1 (.ppu-role padding 2px)
Browser overlay: "No anti-patterns found" ทั้ง 9 สถานะ; tap target <44 ไม่มี; contrast ผ่านหมด; ไม่มีหัวข้อว่าง; overflow 0; error 0

## Priority issues
1. [P1] ปุ่มย้อนกลับใช้ไม่ได้เมื่อเปิดจากลิงก์แชร์ → fallback ไป home.html เมื่อไม่มีประวัติ/referrer ต่าง origin — /impeccable harden
2. [P2] ช่องไดอารี่ของ guest มีข้อความชวนแต่ไม่มีปุ่ม (ปุ่มอยู่ในกล่อง taste สูงขึ้นไป) → ข้อความชี้ "สมัครด้านบน" หรือคืนปุ่ม — /impeccable clarify
3. [P2] หัวโปรไฟล์ 65% ของจอแรก แคปชันการ์ดแรกโดนแถบล่างบัง → ปก ~72px, bio+ที่ตั้งบรรทัดเดียว, กล่อง taste 2 บรรทัด — /impeccable layout
4. [P2] โปรไฟล์ตัวเองไม่มี "แก้โปรไฟล์"/บอกว่าเป็นมุมมองคนอื่น/ชวนเติม bio — /impeccable onboard
5. [P3] การ์ดไม่มีรูปว่างกลาง ~110px ไอคอนซ้ำทุกใบ — /impeccable layout

## Persona
- Casey: ปุ่มติดตามบนสุด, ปุ่มซ้ำท้ายอยู่ y=1553, แคปชันแถวแรกโดนแถบล่าง
- Sam: แท็บอ่าน "ไดอารี่6" ติดกัน, ปุ่มติดตามสถานะซ้อน (label + pressed)
- Jordan: Food DNA / Lv ไม่มีคำอธิบายในจุดที่เห็น, ย้อนกลับจากลิงก์แชร์ไม่ได้

## Minor
จุดคั่น "·" ค้างท้ายบรรทัด; คำอธิบาย Lv ดูเป็น disclaimer; ร้านโปรดไม่มี shopId ดูเหมือนกดได้; EN "Noodle Soup, Spicy" อ่านแปลก; เข้าจาก profile/diary แถบล่างกลับไป "ติดตาม"; sheet นับไม่ตรงกับรายชื่อ

## Questions
- ปุ่มเด่นสุดควรเป็น "ติดตาม" หรือมื้อ/ร้านอันดับหนึ่งของเขา?
- โหมด "โชว์ร้านโปรดแต่ซ่อนมื้อ" สำหรับไดอารี่ส่วนตัว?
- ถ้าตัดปกรูปแล้วให้กริดมื้อเป็นปกเอง จะเป็น ChimChim มากขึ้นไหม?
