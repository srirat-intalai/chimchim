// chimchim-data.js
// ไฟล์นี้เก็บข้อมูลจำลอง (mock data) ของแอปชิมชิมทั้งหมด
// มี Food DNA ของผู้ใช้ตัวอย่าง, รายการร้าน/เมนู, และฟังก์ชันคำนวณ Match %
// กติกาสำคัญ: ทุกที่ในเว็บที่จะโชว์ตัวเลข Match % ต้องเรียกฟังก์ชัน คำนวณMatch()
// จากไฟล์นี้เท่านั้น ห้ามพิมพ์ตัวเลขลอย ๆ เอาเอง

// -----------------------------------------------------
// 1. Food DNA ของผู้ใช้ตัวอย่าง (สมมติว่าระบบเก็บมาจากพฤติกรรมการกินที่ผ่านมา)
// -----------------------------------------------------
var foodDNA = {
	ชอบชาติอาหาร: ["ไทย", "ญี่ปุ่น", "ของหวาน"],
	ชอบรส: ["เผ็ด", "เค็ม"],
	ชอบหมวด: [], // เติมค่าจริงตอน applyPersonalFoodDNA() ทำงาน (จากแบบทดสอบ หรือเดาจากพฤติกรรม)
	งบเฉลี่ยที่ใช้บ่อย: 100, // หน่วยเป็นบาท
	ระยะที่ยอมไป: 2000 // หน่วยเป็นเมตร
};
// true เมื่อ foodDNA มาจากผู้ใช้จริง (ทำแบบทดสอบ หรือเดาจากพฤติกรรมได้) — ไม่งั้นค่าด้านบนเป็นแค่ตัวอย่าง
// จุดที่โชว์ "ตรงใจ N%" ต้องเช็คตัวนี้ก่อน กันโชว์ตัวเลขที่ไม่ได้คำนวณจากผู้ใช้คนนี้จริง
var foodDNAPersonal = false;

// -----------------------------------------------------
// รายชื่อมหาวิทยาลัยที่ชิมชิมนำร่องอยู่ (ใช้บอก user ว่าร้านนี้อยู่ใกล้มหาลัยไหน)
// -----------------------------------------------------
var มหาวิทยาลัยทั้งหมด = ["ธรรมศาสตร์ รังสิต", "มหาวิทยาลัยกรุงเทพ", "เกษตรศาสตร์"];

// พิกัดจริงของแต่ละมหาลัย (ตรวจสอบจากแหล่งข้อมูลสาธารณะ) — ใช้หา "มหาลัยที่ใกล้ผู้ใช้ที่สุด" จาก GPS จริง
// (ร้านแต่ละร้านไม่มีพิกัด GPS จริงเก็บไว้ มีแค่ระยะทางโดยประมาณจากมหาลัยที่กรอกไว้ตอนโพสต์ร้าน)
var มหาวิทยาลัยพิกัด = {
	"ธรรมศาสตร์ รังสิต": { lat: 14.0742, lng: 100.6022 },
	// วิทยาเขตรังสิต (ร้านทั้งหมดในแอปอยู่รอบวิทยาเขตนี้) — จาก OpenStreetMap "มหาวิทยาลัยกรุงเทพ" อ.คลองหลวง
	// เดิมเป็น 13.7068, 100.5758 ซึ่งคือวิทยาเขตกล้วยน้ำไท ห่างไป 37 กม. ทำให้ผู้ใช้หน้า ม.กรุงเทพ ถูกจับไปเป็นพื้นที่ มธ. รังสิต
	"มหาวิทยาลัยกรุงเทพ": { lat: 14.03919, lng: 100.60582 },
	"เกษตรศาสตร์": { lat: 13.8486, lng: 100.5681 }
};

// หมวดหมู่อาหารทั้งหมดของแอป — ใช้สร้างตัวเลือกตอนโพสต์ร้าน/สร้างเพจ (dropdown แบบละเอียด)
var หมวดหมู่ทั้งหมด = [
	"อาหารตามสั่ง", "ข้าวแกง", "ของทอด", "ปิ้งย่าง",
	"ส้มตำ", "ยำ", "หม่าล่า",
	"อีสาน", "เหนือ", "กลาง", "อาหารใต้", "อาหารป่า",
	"เมนูเส้น", "ก๋วยเตี๋ยว",
	"อาหารญี่ปุ่น", "อาหารจีน", "อาหารเกาหลี", "อาหารอินเดีย", "อาหารเวียดนาม", "พิซซ่า", "เบอร์เกอร์", "สเต็ก", "Fast Food",
	"ของหวาน/เบเกอรี่", "ผลไม้", "เครื่องดื่ม",
	"อาหารเจ", "อาหารฮาลาล", "มังสวิรัติ", "วีแกน"
];

// จัดกลุ่มหมวดหมู่ย่อย 30 อัน ให้เหลือ 6 กลุ่มใหญ่ — ใช้กับแถบหมวดหมู่หน้าเทรนด์แทนหมวดย่อยทั้งหมด
// (ลดความรก กดกลุ่มไหนก็กรองรวมทุกหมวดย่อยในกลุ่มนั้น)
var กลุ่มหมวดหมู่ = [
	{ key: "อาหารตามสั่ง", emoji: "🍳", cats: ["อาหารตามสั่ง", "ข้าวแกง", "ของทอด", "ปิ้งย่าง", "ส้มตำ", "ยำ", "หม่าล่า", "อีสาน", "เหนือ", "กลาง", "อาหารใต้", "อาหารป่า"] },
	{ key: "เมนูเส้น", emoji: "🍜", cats: ["เมนูเส้น", "ก๋วยเตี๋ยว"] },
	{ key: "นานาชาติ", emoji: "🌏", cats: ["อาหารญี่ปุ่น", "อาหารจีน", "อาหารเกาหลี", "อาหารอินเดีย", "อาหารเวียดนาม", "พิซซ่า", "เบอร์เกอร์", "สเต็ก", "Fast Food"] },
	{ key: "ของหวาน", emoji: "🍰", cats: ["ของหวาน/เบเกอรี่", "ผลไม้"] },
	{ key: "เครื่องดื่ม", emoji: "🥤", cats: ["เครื่องดื่ม"] },
	{ key: "สุขภาพ", emoji: "🥗", cats: ["อาหารเจ", "อาหารฮาลาล", "มังสวิรัติ", "วีแกน"] }
];
// คืนรายชื่อหมวดย่อยทั้งหมดในกลุ่มที่เลือก (ใช้กรองร้าน/โพสต์ตามกลุ่ม) — ไม่เจอกลุ่มให้คืน array ว่าง
function หมวดย่อยในกลุ่ม(groupKey) {
	var กลุ่ม = กลุ่มหมวดหมู่.filter(function(g) { return g.key === groupKey; })[0];
	return กลุ่ม ? กลุ่ม.cats : [];
}

// -----------------------------------------------------
// 2. รายการร้าน/เมนูตัวอย่างทั้งหมด (ข้อมูลนี้แต่งขึ้นมาเพื่อทำ prototype เฉย ๆ)
// เพิ่มฟิลด์ มหาลัย (มหาวิทยาลัยที่อยู่ใกล้ร้าน), เทรนด์ (กำลังเป็นกระแสไหม),
// และ มื้อที่เหมาะ (ช่วงเวลาไหนของวันที่เหมาะจะกินเมนูนี้)
// -----------------------------------------------------
var รายการร้าน = [
	// ----- ร้านจริงใกล้ ม.กรุงเทพ รังสิต (11 ร้าน) -----
	{
		id: 101,
		เมนู: "ยำมะม่วงปูม้า",
		ร้าน: "ร้านยำมะม่วงปูม้า ป้าใจดี",
		หมวด: "ยำ",
		ชาติอาหาร: "ไทย",
		รส: ["เผ็ด", "เปรี้ยว"],
		ราคาต่ำ: 80,
		ราคาสูง: 150,
		ระยะทาง: 970, // คำนวณจากพิกัดวิทยาเขตถึงหมุดร้านจริงด้านล่าง
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		// หมุดร้านจริงจาก Google Maps ของร้าน ("ป้าใจดียำมะม่วงปูม้า ซ.รังสิตภิรมย์") — ผู้ใช้ที่แชร์ตำแหน่งจะเห็นระยะจริงจากตัวเอง
		พิกัด: { lat: 14.0409189, lng: 100.6146675 },
		เทรนด์: true,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/yammamuang/yammamuang-yum-mango-01.jpg",
		บัคเก็ต: ["foryou", "popular"],
		แท็ก: ["เผ็ด", "ยำ", "ทะเล"]
	},
	{
		id: 102,
		เมนู: "หมูทอดคัตสึซอสสไตล์ญี่ปุ่น",
		ร้าน: "MOM KITCHEN",
		หมวด: "อาหารญี่ปุ่น",
		ชาติอาหาร: "ญี่ปุ่น",
		รส: ["กลมกล่อม", "เค็ม"],
		ราคาต่ำ: 150,
		ราคาสูง: 350,
		ระยะทาง: 300,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: true,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/momkitchen/momkitchen-katsu-set-01.jpg",
		บัคเก็ต: ["foryou", "new"],
		แท็ก: ["ญี่ปุ่น", "คัตสึ", "สเต็ก"]
	},
	{
		id: 103,
		เมนู: "ก๋วยเตี๋ยวหมูน้ำตก",
		ร้าน: "กินเตี๋ยวบ้านแม่",
		หมวด: "ก๋วยเตี๋ยว",
		ชาติอาหาร: "ไทย",
		รส: ["เผ็ด", "กลมกล่อม"],
		ราคาต่ำ: 40,
		ราคาสูง: 65,
		ระยะทาง: 600,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: false,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/kinteaw-banmae/kinteaw-banmae-noodle-soup-01.webp",
		บัคเก็ต: ["foryou", "hidden"],
		แท็ก: ["เส้น", "ก๋วยเตี๋ยว", "งบน้อย"]
	},
	{
		id: 104,
		เมนู: "ก๋วยเตี๋ยวเรือ",
		ร้าน: "ก๋วยเตี๋ยวเรือยกซดมอกรุงเทพ",
		หมวด: "ก๋วยเตี๋ยว",
		ชาติอาหาร: "ไทย",
		รส: ["เผ็ด", "เข้มข้น"],
		ราคาต่ำ: 50,
		ราคาสูง: 90,
		ระยะทาง: 700,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: true,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/boat-noodle/boat-noodle-boat-noodle-01.jpg",
		บัคเก็ต: ["popular", "new"],
		แท็ก: ["เส้น", "ก๋วยเตี๋ยวเรือ", "น้ำข้น"]
	},
	{
		id: 105,
		เมนู: "ข้าวมันไก่",
		ร้าน: "ข้าวมันไก่ลุงนวย",
		หมวด: "ข้าวแกง",
		ชาติอาหาร: "ไทย",
		รส: ["กลมกล่อม", "เค็ม"],
		ราคาต่ำ: 45,
		ราคาสูง: 70,
		ระยะทาง: 350,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: false,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-pork-rice-01.jpg",
		บัคเก็ต: ["foryou", "popular"],
		แท็ก: ["ข้าว", "ข้าวมันไก่", "งบน้อย"]
	},
	{
		id: 106,
		เมนู: "อาหารตามสั่งครัวใบมิ้นท์",
		ร้าน: "ครัวใบมิ้นท์",
		หมวด: "อาหารตามสั่ง",
		ชาติอาหาร: "ไทย",
		รส: ["กลมกล่อม", "เผ็ด"],
		ราคาต่ำ: 50,
		ราคาสูง: 120,
		ระยะทาง: 500,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: false,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น", "ดึก"],
		รูป: "img/bu/krua-baimint/krua-baimint-crispy-pork-basil.jpg",
		บัคเก็ต: ["foryou", "hidden"],
		แท็ก: ["ข้าว", "ตามสั่ง", "เมนูเยอะ"]
	},
	{
		id: 107,
		เมนู: "หม่าล่าทั่ง",
		ร้าน: "ฉงเมาไท่ หม่าล่าทั่ง",
		หมวด: "หม่าล่า",
		ชาติอาหาร: "จีน",
		รส: ["เผ็ด"],
		ราคาต่ำ: 100,
		ราคาสูง: 250,
		ระยะทาง: 900,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: true,
		มื้อที่เหมาะ: ["เย็น", "ดึก"],
		รูป: "img/bu/chongmaotai-mala/chongmaotai-mala-mala-bowl-01.jpg",
		บัคเก็ต: ["popular", "new"],
		แท็ก: ["เผ็ดมาก", "จีน", "หม่าล่า"]
	},
	{
		id: 108,
		เมนู: "ตำยำยั่ว",
		ร้าน: "ตำยำยั่ว By โบตั๋น",
		หมวด: "ส้มตำ",
		ชาติอาหาร: "ไทย",
		รส: ["เผ็ด", "เปรี้ยว"],
		ราคาต่ำ: 40,
		ราคาสูง: 90,
		ระยะทาง: 400,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: false,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/tamyamyua-botan/tamyamyua-botan-yum-somtum.webp",
		บัคเก็ต: ["foryou", "popular"],
		แท็ก: ["เผ็ด", "ส้มตำ", "อีสาน"]
	},
	{
		id: 109,
		เมนู: "ส้มตำแซ่บ",
		ร้าน: "ร้านแอบแซ่บ",
		หมวด: "อีสาน",
		ชาติอาหาร: "ไทย",
		รส: ["เผ็ด", "เปรี้ยว"],
		ราคาต่ำ: 35,
		ราคาสูง: 85,
		ระยะทาง: 550,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: false,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/aab-saep/aab-saep-somtum-seafood.jpg",
		บัคเก็ต: ["foryou", "hidden"],
		แท็ก: ["เผ็ด", "อีสาน", "งบน้อย"]
	},
	{
		id: 110,
		เมนู: "สเต็กเนื้อซอสพริกไทยดำ",
		ร้าน: "แซมสเต็ก",
		หมวด: "สเต็ก",
		ชาติอาหาร: "ฝรั่ง",
		รส: ["เค็ม", "กลมกล่อม"],
		ราคาต่ำ: 79,
		ราคาสูง: 159,
		ระยะทาง: 650,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: false,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น"],
		รูป: "img/bu/sam-steak/sam-steak-steak-gravy.jpg",
		บัคเก็ต: ["popular", "new"],
		แท็ก: ["สเต็ก", "งบน้อย", "จานเดียว"]
	},
	{
		id: 111,
		เมนู: "ลาบหมูไข่ดาว",
		ร้าน: "ไก่และไข่ขายข้าว",
		หมวด: "อีสาน",
		ชาติอาหาร: "ไทย",
		รส: ["เผ็ด", "เค็ม"],
		ราคาต่ำ: 40,
		ราคาสูง: 69,
		ระยะทาง: 300,
		มหาลัย: "มหาวิทยาลัยกรุงเทพ",
		เทรนด์: false,
		มื้อที่เหมาะ: ["เที่ยง", "เย็น", "ดึก"],
		รูป: "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-pad-thai-01.webp",
		บัคเก็ต: ["foryou", "popular"],
		แท็ก: ["เผ็ด", "ลาบ", "งบน้อย"]
	}
];

// -----------------------------------------------------
// 3. ฟังก์ชันคำนวณ Match % แบบง่าย ๆ (ห้ามที่อื่น hardcode ตัวเลขเอง ต้องเรียกอันนี้)
// (ใช้ ช่วงเวลาปัจจุบัน() ที่ประกาศไว้ด้านล่างของไฟล์นี้ — function hoisting ทำให้เรียกจากตรงนี้ได้)
// -----------------------------------------------------
// ความชอบคล้ายกันระหว่างนักชิม 2 คน (0-100) — ใช้คัด "นักชิมที่ชอบคล้ายคุณ" ในหน้าติดตาม
// เทียบสัดส่วนที่ซ้ำกัน (Jaccard) ของชาติอาหาร 30 / รส 25 / หมวด 30 + งบที่ใช้บ่อยใกล้กัน 15
// ข้อไหนฝั่งใดฝั่งหนึ่งไม่มีข้อมูล ข้ามข้อนั้นแล้วเฉลี่ยจากข้อที่เหลือ (ไม่ลงโทษคนที่กรอกไม่ครบ)
function คำนวณความชอบคล้ายกัน(dnaA, dnaB) {
	if (!dnaA || !dnaB) return 0;
	function ซ้ำกัน(x, y) {
		x = x || [];
		y = y || [];
		if (!x.length || !y.length) return null;
		var ร่วม = x.filter(function(v) { return y.indexOf(v) !== -1; }).length;
		return ร่วม / (x.length + y.length - ร่วม);
	}
	var งบA = dnaA.งบเฉลี่ยที่ใช้บ่อย;
	var งบB = dnaB.งบเฉลี่ยที่ใช้บ่อย;
	var ส่วน = [
		[ซ้ำกัน(dnaA.ชอบชาติอาหาร, dnaB.ชอบชาติอาหาร), 30],
		[ซ้ำกัน(dnaA.ชอบรส, dnaB.ชอบรส), 25],
		[ซ้ำกัน(dnaA.ชอบหมวด, dnaB.ชอบหมวด), 30],
		[(งบA > 0 && งบB > 0) ? 1 - Math.abs(งบA - งบB) / Math.max(งบA, งบB) : null, 15]
	];
	var รวม = 0;
	var น้ำหนัก = 0;
	ส่วน.forEach(function(p) {
		if (p[0] === null) return;
		รวม += p[0] * p[1];
		น้ำหนัก += p[1];
	});
	return น้ำหนัก ? Math.round((รวม / น้ำหนัก) * 100) : 0;
}

function คำนวณMatch(ร้าน, dna) {
	var คะแนน = 0;

	// เช็คว่าชาติอาหารของร้านนี้ตรงกับที่ผู้ใช้ชอบไหม
	var i;
	for (i = 0; i < dna.ชอบชาติอาหาร.length; i++) {
		if (dna.ชอบชาติอาหาร[i] == ร้าน.ชาติอาหาร) {
			คะแนน = คะแนน + 35;
			break;
		}
	}

	// เช็ครสชาติ ตรงกี่รสก็บวกคะแนนไปเรื่อย ๆ
	var j, k;
	for (j = 0; j < ร้าน.รส.length; j++) {
		for (k = 0; k < dna.ชอบรส.length; k++) {
			if (ร้าน.รส[j] == dna.ชอบรส[k]) {
				คะแนน = คะแนน + 13;
			}
		}
	}

	// เช็คเรื่องงบ เอาราคาเฉลี่ยของร้านมาเทียบกับงบที่ใช้บ่อย
	var ราคาเฉลี่ย = (ร้าน.ราคาต่ำ + ร้าน.ราคาสูง) / 2;
	if (ราคาเฉลี่ย <= dna.งบเฉลี่ยที่ใช้บ่อย + 50) {
		คะแนน = คะแนน + 20;
	} else if (ราคาเฉลี่ย <= dna.งบเฉลี่ยที่ใช้บ่อย + 120) {
		คะแนน = คะแนน + 8;
	}

	// เช็คระยะทาง ถ้าอยู่ในระยะที่ผู้ใช้ยอมไปได้ ให้คะแนนเพิ่ม
	if (ร้าน.ระยะทาง <= dna.ระยะที่ยอมไป) {
		คะแนน = คะแนน + 10;
	}

	// เช็คหมวดหมู่ที่ชอบ (เก็บไว้ตอนทำแบบทดสอบ หรือเรียนรู้จากพฤติกรรม เช่น กดถูกใจ/Follow/รีวิวดี ๆ)
	if ((dna.ชอบหมวด || []).indexOf(ร้าน.หมวด) !== -1) {
		คะแนน = คะแนน + 12;
	}

	// โบนัสตำแหน่งจริง — ถ้าผู้ใช้เคยกดขอตำแหน่งไว้ และร้านนี้อยู่แถวมหาลัยที่ใกล้ผู้ใช้ที่สุดจริง ๆ
	if (typeof getUserLocation === "function") {
		var ตำแหน่งผู้ใช้ = getUserLocation();
		if (ตำแหน่งผู้ใช้ && ตำแหน่งผู้ใช้.nearestUni && ร้าน.มหาลัย === ตำแหน่งผู้ใช้.nearestUni) {
			คะแนน = คะแนน + 8;
		}
	}

	// โบนัสช่วงเวลา — ร้าน/เมนูที่เหมาะกับมื้อตอนนี้ (เช้า/เที่ยง/บ่าย/เย็น/ดึก) ได้คะแนนเสริมเล็กน้อย
	// ตั้งใจให้เบากว่าโบนัสอื่น ๆ เพราะเป็นแค่ signal เสริม ไม่ใช่ตัวชี้วัดหลักว่าตรงรสนิยมไหม
	if ((ร้าน.มื้อที่เหมาะ || []).indexOf(ช่วงเวลาปัจจุบัน()) !== -1) {
		คะแนน = คะแนน + 6;
	}

	// กันไว้ไม่ให้ขึ้น 100% เป๊ะ (เดี๋ยวดูปลอม) แล้วก็กันไม่ให้ต่ำไปจนดูไม่น่าเชื่อถือ
	if (คะแนน > 97) {
		คะแนน = 97;
	}
	if (คะแนน < 45) {
		คะแนน = 45;
	}

	return คะแนน;
}

// ฟังก์ชันช่วยแต่งประโยคเหตุผลว่าทำไมร้านนี้ถึง match กับผู้ใช้
// ใช้ตอนกดที่ป้าย Match % แล้วอยากโชว์คำอธิบาย
function สร้างเหตุผลmatch(ร้าน, dna) {
	// บอกเฉพาะข้อที่ได้คะแนนจริงใน คำนวณMatch — เดิมขึ้นต้น "เพราะคุณชอบอาหาร…" ทุกร้านแม้ชาติอาหารไม่ตรง
	// และบอกว่า "ใกล้คุณ" ทั้งที่ ระยะทาง เป็นระยะจากมหาลัยของร้าน ไม่ใช่จากตัวผู้ใช้
	var ข้อ = [];
	if (dna.ชอบชาติอาหาร.indexOf(ร้าน.ชาติอาหาร) !== -1) {
		ข้อ.push("เป็นอาหาร" + ร้าน.ชาติอาหาร + "ที่คุณชอบ");
	}
	if ((dna.ชอบหมวด || []).indexOf(ร้าน.หมวด) !== -1) {
		ข้อ.push("อยู่ในหมวด" + ร้าน.หมวด + "ที่คุณชอบ");
	}

	var รสที่ตรงกัน = [];
	var i, j;
	for (i = 0; i < ร้าน.รส.length; i++) {
		for (j = 0; j < dna.ชอบรส.length; j++) {
			if (ร้าน.รส[i] == dna.ชอบรส[j]) {
				รสที่ตรงกัน.push(ร้าน.รส[i]);
			}
		}
	}
	if (รสที่ตรงกัน.length > 0) {
		ข้อ.push("รส" + รสที่ตรงกัน.join(" ") + "ตรงกับที่คุณชอบ");
	}

	var ราคาเฉลี่ย = (ร้าน.ราคาต่ำ + ร้าน.ราคาสูง) / 2;
	if (ราคาเฉลี่ย <= dna.งบเฉลี่ยที่ใช้บ่อย + 50) {
		ข้อ.push("ราคาอยู่ในงบที่คุณใช้บ่อย (ประมาณ ฿" + dna.งบเฉลี่ยที่ใช้บ่อย + ")");
	}
	if (ร้าน.ระยะทาง <= dna.ระยะที่ยอมไป) {
		ข้อ.push("อยู่ในระยะที่คุณยอมไป");
	}

	if (!ข้อ.length) return "ร้านนี้ยังไม่ตรงกับ Food DNA ของคุณข้อไหนชัด ๆ ลองดูเผื่อเจอของใหม่";
	return "แนะนำเพราะ" + ข้อ.join(" · ");
}

// -----------------------------------------------------
// 4. ฟังก์ชันสำหรับ mini AI Food Finder (หน้า reservation เดิม)
// รับค่าที่ผู้ใช้กดเลือกมา 4 ขั้นตอน แล้วกรองหาร้านที่เข้าเกณฑ์ + คำนวณ match ให้
// -----------------------------------------------------
function หาร้านให้ฉัน(หมวดที่เลือก, งบที่เลือก, ระยะที่เลือก, รสที่เลือก) {
	var ผลลัพธ์ = [];
	var i;

	for (i = 0; i < รายการร้าน.length; i++) {
		var ร้าน = รายการร้าน[i];
		var ผ่านหมวด = true;
		var ผ่านงบ = true;
		var ผ่านระยะ = true;
		var ผ่านรส = true;

		if (หมวดที่เลือก != "ไม่รู้") {
			if (ร้าน.หมวด != หมวดที่เลือก) {
				ผ่านหมวด = false;
			}
		}

		var ราคาเฉลี่ย = (ร้าน.ราคาต่ำ + ร้าน.ราคาสูง) / 2;
		if (งบที่เลือก == "ประหยัด") {
			if (ราคาเฉลี่ย > 100) {
				ผ่านงบ = false;
			}
		} else if (งบที่เลือก == "กำลังดี") {
			if (ราคาเฉลี่ย <= 100 || ราคาเฉลี่ย > 200) {
				ผ่านงบ = false;
			}
		} else if (งบที่เลือก == "จัดเต็ม") {
			if (ราคาเฉลี่ย <= 200) {
				ผ่านงบ = false;
			}
		}

		if (ระยะที่เลือก == "ใกล้ๆ") {
			if (ร้าน.ระยะทาง > 500) {
				ผ่านระยะ = false;
			}
		} else if (ระยะที่เลือก == "ไม่ไกลมาก") {
			if (ร้าน.ระยะทาง > 2000) {
				ผ่านระยะ = false;
			}
		}
		// ถ้าเลือก "ทุกระยะ" ไม่ต้องกรองอะไร

		if (รสที่เลือก != "ไม่รู้") {
			var เจอรส = false;
			var j;
			for (j = 0; j < ร้าน.รส.length; j++) {
				if (ร้าน.รส[j] == รสที่เลือก) {
					เจอรส = true;
				}
			}
			if (!เจอรส) {
				ผ่านรส = false;
			}
		}

		if (ผ่านหมวด && ผ่านงบ && ผ่านระยะ && ผ่านรส) {
			ผลลัพธ์.push(ร้าน);
		}
	}

	// ถ้ากรองแล้วไม่เจอเลย ให้ผ่อนเกณฑ์โดยเอาแค่ตามหมวด+รสก่อน (กันหน้าผลลัพธ์ว่างเปล่า)
	if (ผลลัพธ์.length == 0) {
		for (i = 0; i < รายการร้าน.length; i++) {
			var ร้าน2 = รายการร้าน[i];
			if (หมวดที่เลือก == "ไม่รู้" || ร้าน2.หมวด == หมวดที่เลือก) {
				ผลลัพธ์.push(ร้าน2);
			}
		}
	}
	// ถ้ายังไม่เจออีก เอาทุกร้านเลย จะได้มีอะไรให้แนะนำเสมอ
	if (ผลลัพธ์.length == 0) {
		ผลลัพธ์ = รายการร้าน.slice(0);
	}

	// คำนวณ match ของแต่ละร้านที่เหลือ แล้วเก็บไว้ในตัวแปรใหม่เพื่อเอาไปเรียง
	var ร้านพร้อมคะแนน = [];
	for (i = 0; i < ผลลัพธ์.length; i++) {
		var คะแนนร้านนี้ = คำนวณMatch(ผลลัพธ์[i], foodDNA);
		ร้านพร้อมคะแนน.push({ ข้อมูล: ผลลัพธ์[i], คะแนน: คะแนนร้านนี้ });
	}

	// เรียงจากคะแนนมากไปน้อยแบบง่าย ๆ (bubble sort พอ ข้อมูลมีไม่เยอะ)
	var a, b, temp;
	for (a = 0; a < ร้านพร้อมคะแนน.length; a++) {
		for (b = 0; b < ร้านพร้อมคะแนน.length - 1 - a; b++) {
			if (ร้านพร้อมคะแนน[b].คะแนน < ร้านพร้อมคะแนน[b + 1].คะแนน) {
				temp = ร้านพร้อมคะแนน[b];
				ร้านพร้อมคะแนน[b] = ร้านพร้อมคะแนน[b + 1];
				ร้านพร้อมคะแนน[b + 1] = temp;
			}
		}
	}

	// เอาแค่ 3 อันดับแรกพอ
	var สามอันดับแรก = [];
	for (i = 0; i < ร้านพร้อมคะแนน.length && i < 3; i++) {
		สามอันดับแรก.push(ร้านพร้อมคะแนน[i]);
	}

	return สามอันดับแรก;
}

// หาร้าน sponsored ไว้โชว์ใน section "ร้าน Sponsored" (ร้านนี้จ่ายเงินโปรโมท แต่ Match % ก็ยังคำนวณจากข้อมูลจริงเหมือนร้านอื่นนะ ไม่ได้ปั้นตัวเลข)
function หาร้านSponsor() {
	var i;
	for (i = 0; i < รายการร้าน.length; i++) {
		if (รายการร้าน[i].id == 13) {
			return รายการร้าน[i];
		}
	}
	return รายการร้าน[0];
}

// คำนวณคะแนน "ความถูกใจ" ของหมวดวงล้อหนึ่งช่อง เทียบกับ Food DNA ของผู้ใช้
// ถ้าหมวดนี้กรองตรงกับ หมวด ในรายการร้าน ใช้ค่าเฉลี่ย Match % ของร้านจริงในหมวดนั้นเลย
// ถ้าไม่มี (เช่น อิตาเลียน/ปิ้งย่าง/มื้อเช้า/นานาชาติ/ของว่าง) ใช้สูตรอย่างง่ายจากชาติอาหาร/รสอ้างอิงแทน
function คำนวณคะแนนหมวดวงล้อ(cat, dna) {
	if (cat.กรองได้) {
		var ร้านในหมวด = รายการร้าน.filter(function(r) { return r.หมวด === cat.กรองได้; });
		if (ร้านในหมวด.length > 0) {
			var รวม = 0;
			ร้านในหมวด.forEach(function(r) { รวม += คำนวณMatch(r, dna); });
			return Math.round(รวม / ร้านในหมวด.length);
		}
	}
	var คะแนน = 30;
	if (dna.ชอบชาติอาหาร.indexOf(cat.ชาติอาหารอ้างอิง) !== -1) {
		คะแนน += 40;
	}
	var i;
	for (i = 0; i < (cat.รสอ้างอิง || []).length; i++) {
		if (dna.ชอบรส.indexOf(cat.รสอ้างอิง[i]) !== -1) {
			คะแนน += 15;
		}
	}
	if (คะแนน > 95) คะแนน = 95;
	if (คะแนน < 10) คะแนน = 10;
	return คะแนน;
}

// สุ่มเลือก index จาก array ของ "น้ำหนัก" (ยิ่งน้ำหนักเยอะ ยิ่งมีโอกาสถูกเลือกมากกว่า)
// ใช้กับวงล้อสุ่มเมนู 3 โหมด (Eat What I Like / Try My Opposite / Mix It Up)
function สุ่มถ่วงน้ำหนัก(weights) {
	var รวม = weights.reduce(function(a, b) { return a + b; }, 0);
	var r = Math.random() * รวม;
	var สะสม = 0;
	var i;
	for (i = 0; i < weights.length; i++) {
		สะสม += weights[i];
		if (r <= สะสม) return i;
	}
	return weights.length - 1;
}

// บอกว่าตอนนี้เป็นมื้อไหนของวัน (ใช้แนะนำเมนูให้เข้ากับช่วงเวลาที่ใช้งานจริง)
function ช่วงเวลาปัจจุบัน() {
	var ชม = new Date().getHours();
	if (ชม >= 5 && ชม < 10) return "เช้า";
	if (ชม >= 10 && ชม < 14) return "เที่ยง";
	if (ชม >= 14 && ชม < 17) return "บ่าย";
	if (ชม >= 17 && ชม < 21) return "เย็น";
	return "ดึก";
}
var ชื่อมื้อไทย = { "เช้า": "มื้อเช้า", "เที่ยง": "มื้อเที่ยง", "บ่าย": "ของว่างยามบ่าย", "เย็น": "มื้อเย็น", "ดึก": "มื้อดึก" };

// หาร้านจาก id ตัวเลข (ใช้ทั้งหน้า Discovery Feed, หน้ารายละเอียดร้าน ฯลฯ)
function หาร้านจากId(id) {
	var i;
	for (i = 0; i < รายการร้าน.length; i++) {
		if (รายการร้าน[i].id === id) {
			return รายการร้าน[i];
		}
	}
	return null;
}

// -----------------------------------------------------
// 6. ข้อมูลวงล้อสุ่มเมนู (Food Roulette mini-game)
// วงล้อมี 12 ช่อง แต่ละช่องคือหมวดอาหาร พอหมุนไปหยุดที่ช่องไหน
// จะสุ่มเมนูตัวอย่าง 1 อย่างจาก pool ของหมวดนั้นมาโชว์
// -----------------------------------------------------
var วงล้อหมวดอาหาร = [
	{
		key: "เส้น",
		emoji: "🍜",
		label: "เส้น",
		สีช่อง: "#ff999d",
		กรองได้: "เส้น"
	},
	{
		key: "ข้าว",
		emoji: "🍚",
		label: "ข้าว",
		สีช่อง: "#ffc2a8",
		กรองได้: "ข้าว"
	},
	{
		key: "ซุปแกง",
		emoji: "🥣",
		label: "ซุป/แกง",
		สีช่อง: "#8f82b8",
		กรองได้: "ซุป"
	},
	{
		key: "ส้มตำยำ",
		emoji: "🌶️",
		label: "ส้มตำ/ยำ",
		สีช่อง: "#46b087",
		กรองได้: "เผ็ด"
	},
	{
		key: "ญี่ปุ่น",
		emoji: "🍣",
		label: "ญี่ปุ่น",
		สีช่อง: "#ffb3b8",
		กรองได้: "ญี่ปุ่น"
	},
	{
		key: "fastfood",
		emoji: "🍔",
		label: "Fast Food",
		สีช่อง: "#ffd9bd",
		กรองได้: "Fast Food"
	},
	{
		key: "อิตาเลียน",
		emoji: "🍕",
		label: "อิตาเลียน",
		สีช่อง: "#a99bd1",
		กรองได้: null,
		ชาติอาหารอ้างอิง: "อิตาเลียน",
		รสอ้างอิง: ["กลมกล่อม"]
	},
	{
		key: "ปิ้งย่าง",
		emoji: "🍖",
		label: "ปิ้งย่าง",
		สีช่อง: "#c9f2e0",
		กรองได้: null,
		ชาติอาหารอ้างอิง: "ไทย",
		รสอ้างอิง: ["เค็ม", "กลมกล่อม"]
	},
	{
		key: "ของหวาน",
		emoji: "🍰",
		label: "ของหวาน",
		สีช่อง: "#fff3b0",
		กรองได้: "ของหวาน"
	},
	{
		key: "มื้อเช้า",
		emoji: "🍳",
		label: "มื้อเช้า",
		สีช่อง: "#5fcf9e",
		กรองได้: null,
		ชาติอาหารอ้างอิง: "ไทย",
		รสอ้างอิง: ["กลมกล่อม"]
	},
	{
		key: "นานาชาติ",
		emoji: "🌏",
		label: "นานาชาติ",
		สีช่อง: "#ffe0e6",
		กรองได้: null,
		ชาติอาหารอ้างอิง: "นานาชาติ",
		รสอ้างอิง: ["เผ็ด"]
	},
	{
		key: "ของว่าง",
		emoji: "🍡",
		label: "ของว่าง",
		สีช่อง: "#d8f3ff",
		กรองได้: null,
		ชาติอาหารอ้างอิง: "ไทย",
		รสอ้างอิง: ["หวาน", "เค็ม"]
	}
];

// -----------------------------------------------------
// 6.5 เพจร้าน 11 ร้านจริงใกล้ ม.กรุงเทพ รังสิต — แต่ละร้านมีโปรไฟล์ + โพสต์รูปหลายรูปเหมือน IG/Facebook/Lemon8
// ผูกกับร้านจริงใน รายการร้าน (menuId) กดจากฟีด/โปรไฟล์ไปหน้า restaurant.html ของร้านนั้นได้
// ดูโปรไฟล์เต็มได้ที่ public-profile.html?u=bu-<id> ส่วนที่เหลือในฟีดเป็นโพสต์จริงจากผู้ใช้ (getAllPosts)
// ทุกคนโพสต์เพิ่มเองได้ ไม่ต้องเป็นร้านในลิสต์นี้เท่านั้น — นี่แค่ตัวตั้งต้นให้ฟีดไม่ว่างเปล่าตอนเปิดแอปครั้งแรก
// -----------------------------------------------------
var เพจร้านBU = [
	{
		id: "yammamuang",
		name: "ร้านยำมะม่วงปูม้า ป้าใจดี",
		avatar: "img/bu/yammamuang/yammamuang-yum-mango-01.jpg",
		cat: "ยำ",
		bio: "ยำมะม่วง+ยำทะเลรสแซ่บ ซอยรังสิตภิรมย์ เผ็ดจี๊ดถึงใจคนรักยำ",
		menuId: 101,
		posts: [
			{ images: ["img/bu/yammamuang/yammamuang-crab-dong.jpg", "img/bu/yammamuang/yammamuang-storefront.jpg", "img/bu/yammamuang/yammamuang-sushi-roll.jpg", "img/bu/yammamuang/yammamuang-yum-crab.jpg"], caption: "ยำทะเลรวมจานเด็ดร้านเรา เปรี้ยวเผ็ดแซ่บจนต้องกลับมาสั่งซ้ำ 🦑🌶️", daysAgo: 0 },
			{ images: ["img/bu/yammamuang/yammamuang-yum-mango-02.jpg", "img/bu/yammamuang/yammamuang-yum-mixed.jpg", "img/bu/yammamuang/yammamuang-yum-seafood.jpg"], caption: "วันนี้ทะเลสดมาใหม่ทั้งร้าน แวะมายำกันได้ตั้งแต่เที่ยงเลยจ้า", daysAgo: 1 },
		]
	},
	{
		id: "momkitchen",
		name: "MOM KITCHEN",
		avatar: "img/bu/momkitchen/momkitchen-katsu-set-01.jpg",
		cat: "อาหารญี่ปุ่น",
		bio: "ร้านอาหารสไตล์ญี่ปุ่น-ตะวันตก ใกล้ ม.กรุงเทพ รังสิต มีทั้งคัตสึ สเต็ก ปลาแซลมอน เสิร์ฟพร้อมซุปมิโซะ",
		menuId: 102,
		posts: [
			{ images: ["img/bu/momkitchen/momkitchen-chicken-set.jpg", "img/bu/momkitchen/momkitchen-fish-rice-set.jpg", "img/bu/momkitchen/momkitchen-grilled-fish.jpg", "img/bu/momkitchen/momkitchen-katsu-set-02.webp"], caption: "หมูทอดคัตสึกรอบนอกนุ่มใน เสิร์ฟพร้อมซุปมิโซะร้อน ๆ จานโปรดของลูกค้าประจำ 🍱", daysAgo: 0 },
			{ images: ["img/bu/momkitchen/momkitchen-katsu-set-03.jpg", "img/bu/momkitchen/momkitchen-katsu-set-04.jpg", "img/bu/momkitchen/momkitchen-katsu-waffle.jpg", "img/bu/momkitchen/momkitchen-menu-board.jpg"], caption: "สเต็กย่างสไตล์ร้านเรา เนื้อนุ่มซอสเข้มข้น เสิร์ฟพร้อมเฟรนช์ฟรายส์ อร่อยจนต้องกลับมาอีก", daysAgo: 1 },
			{ images: ["img/bu/momkitchen/momkitchen-pasta-bacon-egg.webp", "img/bu/momkitchen/momkitchen-porkchop-set.jpg", "img/bu/momkitchen/momkitchen-ribs-set.jpg", "img/bu/momkitchen/momkitchen-salmon-salad.webp"], caption: "อีกมุมของร้านวันนี้ บรรยากาศดีสุด ๆ 📸", daysAgo: 2 },
			{ images: ["img/bu/momkitchen/momkitchen-salmon-set.jpg", "img/bu/momkitchen/momkitchen-seafood-pasta-01.jpg", "img/bu/momkitchen/momkitchen-seafood-pasta-02.webp", "img/bu/momkitchen/momkitchen-seafood-salad.jpg"], caption: "เมนูเด็ดอีกจานที่อยากให้ลอง รับรองไม่ผิดหวัง 😋", daysAgo: 3 },
			{ images: ["img/bu/momkitchen/momkitchen-shrimp-set.jpg", "img/bu/momkitchen/momkitchen-steak-set-01.jpg", "img/bu/momkitchen/momkitchen-steak-set-02.jpg", "img/bu/momkitchen/momkitchen-steak-set-03.jpg"], caption: "ลูกค้าประจำสั่งซ้ำทุกครั้งที่มา ลองแล้วจะรู้ว่าทำไม", daysAgo: 4 },
			{ images: ["img/bu/momkitchen/momkitchen-storefront.webp"], caption: "วันนี้วัตถุดิบสดใหม่เข้าร้านทุกเช้า การันตีความอร่อย", daysAgo: 5 },
		]
	},
	{
		id: "kinteaw-banmae",
		name: "กินเตี๋ยวบ้านแม่",
		avatar: "img/bu/kinteaw-banmae/kinteaw-banmae-profile.jpeg",
		cat: "ก๋วยเตี๋ยว",
		bio: "ก๋วยเตี๋ยวสูตรบ้านแม่ รังสิตภิรมย์ น้ำซุปต้มเองสดใหม่ทุกวัน",
		menuId: 103,
		posts: [
			{ images: ["img/bu/kinteaw-banmae/kinteaw-banmae-noodle-soup-01.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-chicken-rice.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-hotpot-set.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-logo.jpeg"], caption: "ก๋วยเตี๋ยวหมูน้ำตกชามเด็ด น้ำซุปเข้มข้นสูตรบ้านแม่แท้ ๆ 🍜", daysAgo: 0 },
			{ images: ["img/bu/kinteaw-banmae/kinteaw-banmae-menu-board.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-minced-pork-rice.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-noodle-soup-02.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-noodle-soup-03.webp"], caption: "อากาศแบบนี้ต้องก๋วยเตี๋ยวร้อน ๆ สักชาม แวะมาชิมกันได้เลยจ้า", daysAgo: 1 },
			{ images: ["img/bu/kinteaw-banmae/kinteaw-banmae-noodle-soup-04.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-noodle-soup-05.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-pork-rice-01.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-pork-rice-02.webp"], caption: "อีกมุมของร้านวันนี้ บรรยากาศดีสุด ๆ 📸", daysAgo: 2 },
			{ images: ["img/bu/kinteaw-banmae/kinteaw-banmae-pork-rice-03.webp", "img/bu/kinteaw-banmae/kinteaw-banmae-storefront.webp"], caption: "เมนูเด็ดอีกจานที่อยากให้ลอง รับรองไม่ผิดหวัง 😋", daysAgo: 3 },
		]
	},
	{
		id: "boat-noodle",
		name: "ก๋วยเตี๋ยวเรือยกซดมอกรุงเทพ",
		avatar: "img/bu/boat-noodle/boat-noodle-profile.jpg",
		cat: "ก๋วยเตี๋ยว",
		bio: "ก๋วยเตี๋ยวเรือรสจัดจ้าน น้ำซุปข้นเข้มข้น สั่งกี่ชามก็ไม่เบื่อ",
		menuId: 104,
		posts: [
			{ images: ["img/bu/boat-noodle/boat-noodle-boat-noodle-01.jpg", "img/bu/boat-noodle/boat-noodle-boat-noodle-02.jpg", "img/bu/boat-noodle/boat-noodle-boat-noodle-03.jpg", "img/bu/boat-noodle/boat-noodle-boat-noodle-egg.jpg"], caption: "ก๋วยเตี๋ยวเรือน้ำข้นสูตรเข้มข้น ยกซดกันแบบไม่ยั้งเลยวันนี้ 🍲", daysAgo: 0 },
			{ images: ["img/bu/boat-noodle/boat-noodle-boat-noodle-tray-01.jpg", "img/bu/boat-noodle/boat-noodle-boat-noodle-tray-02.jpg", "img/bu/boat-noodle/boat-noodle-logo.jpg"], caption: "สั่ง 10 ชามยังไม่พอ รสชาติเข้มข้นจัดจ้านแบบนี้ต้องมาลอง", daysAgo: 1 },
		]
	},
	{
		id: "khaomankai-luangnuay",
		name: "ข้าวมันไก่ลุงนวย",
		avatar: "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-profile.jpg",
		cat: "ข้าวแกง",
		bio: "ข้าวมันไก่+หมูแดงรังสิตภิรมย์ เลือกท็อปปิ้งได้ตามใจ หมูแดงหวานมัน ไข่ดาวกรอบขอบ ราคาย่อมเยา",
		menuId: 105,
		posts: [
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-pork-rice-01.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-boiled-pork.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-crispy-fried.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-01.jpg"], caption: "เซตข้าวหน้าต่าง ๆ จากร้านเรา หมูแดงหวานมัน ไข่ดาวกรอบขอบ เลือกได้ตามใจชอบ 🍳", daysAgo: 0 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-02.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-03.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-04.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-05.jpg"], caption: "สั่งเดลิเวอรีก็ได้นะ รสชาติเข้มข้นเหมือนเดิมทุกจาน", daysAgo: 1 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-06.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-07.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-08.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-09.jpg"], caption: "อีกมุมของร้านวันนี้ บรรยากาศดีสุด ๆ 📸", daysAgo: 2 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-10.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-11.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-12.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-13.jpg"], caption: "เมนูเด็ดอีกจานที่อยากให้ลอง รับรองไม่ผิดหวัง 😋", daysAgo: 3 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-14.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-15.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-16.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-17.jpg"], caption: "ลูกค้าประจำสั่งซ้ำทุกครั้งที่มา ลองแล้วจะรู้ว่าทำไม", daysAgo: 4 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-18.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-19.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-fried-egg-stirfry-20.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-logo.jpg"], caption: "วันนี้วัตถุดิบสดใหม่เข้าร้านทุกเช้า การันตีความอร่อย", daysAgo: 5 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-rice-porridge.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-platter-01.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-platter-02.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-platter-03.jpg"], caption: "ใครยังไม่เคยลอง วันนี้แวะมาได้เลยนะ", daysAgo: 6 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-pork-rice-02.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-pork-rice-03.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-shrimp-soup.jpg", "img/bu/khaomankai-luangnuay/khaomankai-luangnuay-sliced-pork-soup.jpg"], caption: "จัดเต็มทุกจานแบบไม่กั๊ก แวะมาอุดหนุนกันเยอะ ๆ 🙏", daysAgo: 7 },
			{ images: ["img/bu/khaomankai-luangnuay/khaomankai-luangnuay-soup-pork.jpg"], caption: "อีกมุมของร้านวันนี้ บรรยากาศดีสุด ๆ 📸", daysAgo: 8 },
		]
	},
	{
		id: "krua-baimint",
		name: "ครัวใบมิ้นท์",
		avatar: "img/bu/krua-baimint/krua-baimint-profile.jpg",
		cat: "อาหารตามสั่ง",
		bio: "อาหารตามสั่งเมนูเยอะ ใกล้ ม.กรุงเทพ เปิดยันดึก ตอบโจทย์สายกินมื้อดึก",
		menuId: 106,
		posts: [
			{ images: ["img/bu/krua-baimint/krua-baimint-crispy-pork-basil.jpg", "img/bu/krua-baimint/krua-baimint-bacon-chili-salt.jpg", "img/bu/krua-baimint/krua-baimint-beef-basil-fried-egg.jpg", "img/bu/krua-baimint/krua-baimint-chicken-cashew.jpg"], caption: "เมนูตามสั่งครบเครื่อง สั่งอะไรก็ทำได้ อร่อยทุกจานจริง ๆ", daysAgo: 0 },
			{ images: ["img/bu/krua-baimint/krua-baimint-chicken-curry-paste.jpg", "img/bu/krua-baimint/krua-baimint-dried-seafood-hotpot.jpg", "img/bu/krua-baimint/krua-baimint-fried-rice-sausage-ham.jpg", "img/bu/krua-baimint/krua-baimint-larb-moo.jpg"], caption: "หิวดึกก็แวะมาได้ เปิดยาวจนดึก อิ่มท้องก่อนกลับหอ 🌙", daysAgo: 1 },
			{ images: ["img/bu/krua-baimint/krua-baimint-logo.jpg", "img/bu/krua-baimint/krua-baimint-panang-curry-pork.jpg", "img/bu/krua-baimint/krua-baimint-pork-basil-pepper.jpg", "img/bu/krua-baimint/krua-baimint-pork-black-pepper.jpg"], caption: "อีกมุมของร้านวันนี้ บรรยากาศดีสุด ๆ 📸", daysAgo: 2 },
			{ images: ["img/bu/krua-baimint/krua-baimint-pork-egg-soup.jpg", "img/bu/krua-baimint/krua-baimint-pork-mushroom-sauce.jpg", "img/bu/krua-baimint/krua-baimint-salted-egg-spicy-salad.jpg", "img/bu/krua-baimint/krua-baimint-seafood-crispy-noodles-gravy.jpg"], caption: "เมนูเด็ดอีกจานที่อยากให้ลอง รับรองไม่ผิดหวัง 😋", daysAgo: 3 },
			{ images: ["img/bu/krua-baimint/krua-baimint-seafood-rice-soup.jpg", "img/bu/krua-baimint/krua-baimint-shrimp-spicy-sauce.jpg", "img/bu/krua-baimint/krua-baimint-stirfried-noodles-basil.jpg", "img/bu/krua-baimint/krua-baimint-stirfried-squid-egg.jpg"], caption: "ลูกค้าประจำสั่งซ้ำทุกครั้งที่มา ลองแล้วจะรู้ว่าทำไม", daysAgo: 4 },
		]
	},
	{
		id: "chongmaotai-mala",
		name: "ฉงเมาไท่ หม่าล่าทั่ง",
		avatar: "img/bu/chongmaotai-mala/chongmaotai-mala-mala-bowl-01.jpg",
		cat: "หม่าล่า",
		bio: "หม่าล่าทั่งสาขา ม.กรุงเทพ เลือกวัตถุดิบเองได้ เผ็ดชาแบบต้นตำรับจีน",
		menuId: 107,
		posts: [
			{ images: ["img/bu/chongmaotai-mala/chongmaotai-mala-condiments.jpg", "img/bu/chongmaotai-mala/chongmaotai-mala-ingredient-bar.jpg", "img/bu/chongmaotai-mala/chongmaotai-mala-mala-bowl-02.jpg", "img/bu/chongmaotai-mala/chongmaotai-mala-mala-bowl-03.jpg"], caption: "หม่าล่าทั่งร้อน ๆ เผ็ดชาแบบต้นตำรับ เลือกวัตถุดิบเองได้ตามใจชอบ 🌶️", daysAgo: 0 },
			{ images: ["img/bu/chongmaotai-mala/chongmaotai-mala-mala-bowl-04.jpg", "img/bu/chongmaotai-mala/chongmaotai-mala-menu-board-01.jpg", "img/bu/chongmaotai-mala/chongmaotai-mala-menu-board-02.jpg"], caption: "วันนี้วัตถุดิบสดใหม่มาเต็มร้าน แวะมาเผ็ดชากันได้ยันดึก", daysAgo: 1 },
		]
	},
	{
		id: "tamyamyua-botan",
		name: "ตำยำยั่ว By โบตั๋น",
		avatar: "img/bu/tamyamyua-botan/tamyamyua-botan-yum-somtum.webp",
		cat: "ส้มตำ",
		bio: "ส้มตำยำอีสานรสแซ่บ ม.กรุงเทพ-รังสิต ตำสดใหม่ทุกจาน เผ็ดได้ตามสั่ง",
		menuId: 108,
		posts: [
			{ images: ["img/bu/tamyamyua-botan/tamyamyua-botan-somtum.jpg", "img/bu/tamyamyua-botan/tamyamyua-botan-storefront.webp", "img/bu/tamyamyua-botan/tamyamyua-botan-table-spread-01.webp", "img/bu/tamyamyua-botan/tamyamyua-botan-table-spread-02.webp"], caption: "ตำใหม่ทุกจาน เผ็ดตามสั่งได้ วันนี้รสจัดจ้านเป็นพิเศษ ลองแล้วจะติดใจ 🌶️", daysAgo: 0 },
			{ images: ["img/bu/tamyamyua-botan/tamyamyua-botan-yum-chicken-01.jpg", "img/bu/tamyamyua-botan/tamyamyua-botan-yum-chicken-02.jpg", "img/bu/tamyamyua-botan/tamyamyua-botan-yum-corn-seafood.webp", "img/bu/tamyamyua-botan/tamyamyua-botan-yum-mixed-01.webp"], caption: "เซ็ตยำแซ่บครบเครื่อง สั่งคู่ข้าวเหนียวอร่อยจนลืมอิ่ม", daysAgo: 1 },
			{ images: ["img/bu/tamyamyua-botan/tamyamyua-botan-yum-mixed-02.jpg", "img/bu/tamyamyua-botan/tamyamyua-botan-yum-salmon-01.webp", "img/bu/tamyamyua-botan/tamyamyua-botan-yum-salmon-02.jpg", "img/bu/tamyamyua-botan/tamyamyua-botan-yum-seafood-raw.jpg"], caption: "อีกมุมของร้านวันนี้ บรรยากาศดีสุด ๆ 📸", daysAgo: 2 },
			{ images: ["img/bu/tamyamyua-botan/tamyamyua-botan-yum-squid-01.jpg", "img/bu/tamyamyua-botan/tamyamyua-botan-yum-squid-02.jpg"], caption: "เมนูเด็ดอีกจานที่อยากให้ลอง รับรองไม่ผิดหวัง 😋", daysAgo: 3 },
		]
	},
	{
		id: "aab-saep",
		name: "ร้านแอบแซ่บ",
		avatar: "img/bu/aab-saep/aab-saep-somtum-seafood.jpg",
		cat: "อีสาน",
		bio: "อาหารอีสานรสแซ่บ รังสิตภิรมย์ ราคาน่ารัก งบน้อยก็อิ่มได้",
		menuId: 109,
		posts: [
			{ images: ["img/bu/aab-saep/aab-saep-crispy-rice-larb.jpg", "img/bu/aab-saep/aab-saep-grilled-fish.jpg", "img/bu/aab-saep/aab-saep-grilled-shrimp.jpg", "img/bu/aab-saep/aab-saep-larb-namtok.jpg"], caption: "ส้มตำแซ่บถึงเครื่อง ราคาน่ารัก งบน้อยก็อิ่มอร่อยได้ที่ร้านเรา 🥗", daysAgo: 0 },
			{ images: ["img/bu/aab-saep/aab-saep-somtum.jpg"], caption: "เมนูอีสานจัดเต็มวันนี้ แวะมาแอบแซ่บกันได้เลยจ้า", daysAgo: 1 },
		]
	},
	{
		id: "sam-steak",
		name: "แซมสเต็ก",
		avatar: "img/bu/sam-steak/sam-steak-steak-gravy.jpg",
		cat: "สเต็ก",
		bio: "สเต็กราคานักศึกษา ใกล้ ม.กรุงเทพ เนื้อนุ่มซอสเข้มข้น คุ้มทุกจาน",
		menuId: 110,
		posts: [
			{ images: ["img/bu/sam-steak/sam-steak-porkchop-spaghetti.jpg", "img/bu/sam-steak/sam-steak-salad.jpg", "img/bu/sam-steak/sam-steak-spaghetti.jpg"], caption: "สเต็กจานเด็ดของร้าน เนื้อนุ่มซอสเข้มข้น ราคานักศึกษาคุ้มสุด ๆ 🥩", daysAgo: 0 },
		]
	},
	{
		id: "kai-lae-khai-khaikhao",
		name: "ไก่และไข่ขายข้าว",
		avatar: "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-profile.webp",
		cat: "อีสาน",
		bio: "ร้านอาหารตามสั่งเมนูเยอะใกล้ ม.กรุงเทพ มีทั้งผัดไทย ลาบ แกง อาหารทะเล เครื่องดื่ม ครบจบในร้านเดียว",
		menuId: 111,
		posts: [
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-pad-thai-01.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-drinks-platter.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-drinks.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-fried-rice-egg.webp"], caption: "เมนูเด็ดจากร้านเรา ผัดไทย ลาบไข่ดาว แซ่บครบเครื่อง ลองแล้วจะติดใจ 🍳", daysAgo: 0 },
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-fruit-platter.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-logo.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-menu-board-01.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-menu-board-02.webp"], caption: "หิวเมื่อไหร่แวะมาได้เลย เมนูเยอะเลือกได้ตามใจ ราคาเป็นมิตรกับกระเป๋านักศึกษา", daysAgo: 1 },
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-menu-board-03.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-pad-thai-02.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-pad-thai-03.jpg", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-pad-thai-04.webp"], caption: "อีกมุมของร้านวันนี้ บรรยากาศดีสุด ๆ 📸", daysAgo: 2 },
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-pad-thai-crab.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-01.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-02.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-03.webp"], caption: "เมนูเด็ดอีกจานที่อยากให้ลอง รับรองไม่ผิดหวัง 😋", daysAgo: 3 },
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-04.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-05.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-06.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-07.webp"], caption: "ลูกค้าประจำสั่งซ้ำทุกครั้งที่มา ลองแล้วจะรู้ว่าทำไม", daysAgo: 4 },
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-platter-mixed-08.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-rice-egg-set.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-rice-set.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-roast-duck.webp"], caption: "วันนี้วัตถุดิบสดใหม่เข้าร้านทุกเช้า การันตีความอร่อย", daysAgo: 5 },
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-seafood-shrimp-set.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-soup-egg-set.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-soup-tom.webp", "img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-storefront-01.webp"], caption: "ใครยังไม่เคยลอง วันนี้แวะมาได้เลยนะ", daysAgo: 6 },
			{ images: ["img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-storefront-02.webp"], caption: "จัดเต็มทุกจานแบบไม่กั๊ก แวะมาอุดหนุนกันเยอะ ๆ 🙏", daysAgo: 7 },
		]
	},
];
function หาเพจร้านBUจากId(id) {
	var i;
	for (i = 0; i < เพจร้านBU.length; i++) {
		if (เพจร้านBU[i].id === id) return เพจร้านBU[i];
	}
	return null;
}

