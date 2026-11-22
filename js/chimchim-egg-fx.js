// chimchim-egg-fx.js
// เอฟเฟกต์ระเบิดสีประจำหมวดตอนแตะไข่ในหน้าสุ่มร้าน (roulette.html) — วาดบน canvas เต็มจอที่โปร่งทะลุ (ไม่บังการกด)
// ใช้: chimchimEggFx(theme, power, el)  theme = soup | japanese | thaiisan | noodle | fastfood (อื่น ๆ = ไม่มีเอฟเฟกต์)
//      power 0–1 (แตะ 1–2 = เบา ๆ, ไข่แตก = 1 เต็ม) · el = ปุ่มไข่ (ใช้หาจุดกึ่งกลาง)
// ไม่มีไฟล์ภาพ: ทุกอนุภาควาดด้วย canvas · ผู้ใช้ตั้งลดการเคลื่อนไหว = ไม่เล่น · หยุดวาดเองเมื่ออนุภาคหมด
(function() {
	var cv = null, ctx = null, parts = [], raf = 0, last = 0, dpr = 1;

	function reduced() {
		return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}
	function ensureCanvas() {
		if (!cv) {
			cv = document.createElement("canvas");
			cv.className = "eggfx";
			cv.setAttribute("aria-hidden", "true");
			document.body.appendChild(cv);
			ctx = cv.getContext("2d");
		}
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		var w = window.innerWidth, h = window.innerHeight;
		if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
			cv.width = Math.round(w * dpr);
			cv.height = Math.round(h * dpr);
		}
	}
	function rnd(a, b) { return a + Math.random() * (b - a); }
	function pick(list) { return list[(Math.random() * list.length) | 0]; }

	// อนุภาคพื้นฐาน: x,y ตำแหน่ง · vx,vy ความเร็ว (px/วิ) · g แรงโน้มถ่วง · drag หน่วง · life อายุ (วิ)
	function add(p) {
		p.t = 0;
		p.vx = p.vx || 0; p.vy = p.vy || 0; p.g = p.g || 0; p.drag = p.drag == null ? 1.6 : p.drag;
		p.rot = p.rot || 0; p.vr = p.vr || 0; p.alpha = p.alpha == null ? 1 : p.alpha;
		parts.push(p);
	}
	// ยิงอนุภาคออกเป็นวงรอบจุดกลาง
	function spray(cx, cy, n, opt) {
		for (var i = 0; i < n; i++) {
			var a = opt.angle != null ? opt.angle + rnd(-opt.spread, opt.spread) : rnd(0, Math.PI * 2);
			var sp = rnd(opt.speed[0], opt.speed[1]);
			var p = Object.assign({}, opt.base || {}, {
				x: cx + Math.cos(a) * (opt.r0 || 0), y: cy + Math.sin(a) * (opt.r0 || 0),
				vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
				size: rnd(opt.size[0], opt.size[1]), life: rnd(opt.life[0], opt.life[1]),
				color: pick(opt.colors), vr: rnd(-6, 6), rot: rnd(0, Math.PI * 2)
			});
			add(p);
		}
	}

	/* ---------- รูปทรง ---------- */
	function star(c, r, spikes, inner) {
		c.beginPath();
		for (var i = 0; i < spikes * 2; i++) {
			var rr = i % 2 ? r * inner : r, a = (i * Math.PI) / spikes - Math.PI / 2;
			c[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
		}
		c.closePath();
	}
	function draw(p, k) {
		var c = ctx, s = p.size;
		c.save();
		c.globalAlpha = Math.max(0, p.alpha * k);
		c.translate(p.x, p.y);
		switch (p.kind) {
			case "dot":
				c.fillStyle = p.color; c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.fill(); break;
			case "bubble": // ฟองกลมขอบใส + จุดเงา
				c.strokeStyle = p.color; c.lineWidth = Math.max(1.2, s * 0.18);
				c.fillStyle = p.fill || "rgba(255,255,255,0.25)";
				c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.fill(); c.stroke();
				c.fillStyle = "rgba(255,255,255,0.85)"; c.beginPath(); c.arc(-s * 0.35, -s * 0.35, s * 0.22, 0, Math.PI * 2); c.fill(); break;
			case "ring": // วงแหวนขยาย (sx/sy = ยืดแนวนอน/ตั้ง)
				var rr = p.r0 + (p.r1 - p.r0) * easeOut(p.t / p.life);
				c.scale(p.sx || 1, p.sy || 1);
				c.strokeStyle = p.color; c.lineWidth = p.width * (1 - p.t / p.life) + 0.5;
				c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2); c.stroke(); break;
			case "sparkle": // ประกาย 4 แฉก
				c.rotate(p.rot); c.fillStyle = p.color; star(c, s, 4, 0.28); c.fill(); break;
			case "star": // ดาว 5 แฉก
				c.rotate(p.rot); c.fillStyle = p.color; star(c, s, 5, 0.48); c.fill();
				c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 1; c.stroke(); break;
			case "flame": // เปลวไฟหยดน้ำ หันตามทิศที่พุ่ง
				c.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
				var fs = s * (1 - 0.5 * (p.t / p.life));
				c.fillStyle = p.color;
				c.beginPath(); c.moveTo(0, -fs * 1.9);
				c.bezierCurveTo(fs * 0.9, -fs * 0.6, fs, fs * 0.5, 0, fs);
				c.bezierCurveTo(-fs, fs * 0.5, -fs * 0.9, -fs * 0.6, 0, -fs * 1.9); c.fill();
				c.fillStyle = "rgba(255,226,120,0.9)"; c.beginPath(); c.arc(0, fs * 0.25, fs * 0.42, 0, Math.PI * 2); c.fill(); break;
			case "streak": // ประกายไฟเป็นเส้นสั้นตามทิศความเร็ว
				var L = Math.min(18, Math.hypot(p.vx, p.vy) * 0.035) + 2;
				c.rotate(Math.atan2(p.vy, p.vx));
				c.strokeStyle = p.color; c.lineWidth = s; c.lineCap = "round";
				c.beginPath(); c.moveTo(-L, 0); c.lineTo(0, 0); c.stroke(); break;
			case "crumb": // เกล็ดขนมเหลี่ยม ๆ หมุน
				c.rotate(p.rot); c.fillStyle = p.color;
				c.beginPath(); c.moveTo(-s, -s * 0.4); c.lineTo(s * 0.2, -s); c.lineTo(s, -s * 0.1); c.lineTo(s * 0.4, s * 0.9); c.lineTo(-s * 0.7, s * 0.6); c.closePath(); c.fill(); break;
			case "blossom": // ดอกซากุระ 5 กลีบ (กลีบปลายเว้า) + เกสรกลาง
				c.rotate(p.rot);
				for (var b = 0; b < 5; b++) {
					c.save();
					c.rotate((b * Math.PI * 2) / 5);
					c.fillStyle = p.color;
					c.beginPath();
					c.moveTo(0, 0);
					c.bezierCurveTo(-s * 0.55, -s * 0.35, -s * 0.5, -s * 0.95, -s * 0.16, -s * 1.02);
					c.lineTo(0, -s * 0.84);
					c.lineTo(s * 0.16, -s * 1.02);
					c.bezierCurveTo(s * 0.5, -s * 0.95, s * 0.55, -s * 0.35, 0, 0);
					c.fill();
					c.restore();
				}
				c.fillStyle = "#fff4f7"; c.beginPath(); c.arc(0, 0, s * 0.22, 0, Math.PI * 2); c.fill();
				c.fillStyle = "#e7849f"; c.beginPath(); c.arc(0, 0, s * 0.1, 0, Math.PI * 2); c.fill();
				break;
			case "petal": // กลีบซากุระเดี่ยวปลิวลง พลิกไปมา (ย่อแกนตาม sin ให้เหมือนหมุนกลางอากาศ)
				c.rotate(p.rot);
				c.scale(1, 0.45 + 0.55 * Math.abs(Math.sin(p.t * p.flip + p.seed)));
				c.fillStyle = p.color;
				c.beginPath();
				c.moveTo(0, s);
				c.bezierCurveTo(-s * 0.9, s * 0.2, -s * 0.6, -s * 0.9, -s * 0.15, -s);
				c.lineTo(0, -s * 0.78);
				c.lineTo(s * 0.15, -s);
				c.bezierCurveTo(s * 0.6, -s * 0.9, s * 0.9, s * 0.2, 0, s);
				c.fill();
				break;
			case "shard": // เศษเปลือกไข่สามเหลี่ยมขาวอมม่วง หมุนกระเด็นแล้วตก
				c.rotate(p.rot); c.fillStyle = p.color;
				c.beginPath(); c.moveTo(-s, -s * 0.6); c.lineTo(s * 0.9, -s * 0.3); c.lineTo(-s * 0.2, s); c.closePath(); c.fill();
				c.strokeStyle = "rgba(120,90,180,0.35)"; c.lineWidth = 1; c.stroke(); break;
			case "steam": // ไอน้ำ: ก้อนขาวฟุ้งจาง ๆ ลอยขึ้นแล้วขยาย
				var sr = s * (1 + 1.4 * (p.t / p.life));
				var gr = c.createRadialGradient(0, 0, 0, 0, 0, sr);
				gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
				c.fillStyle = gr; c.beginPath(); c.arc(0, 0, sr, 0, Math.PI * 2); c.fill(); break;
			case "swirl": // เส้นหมุนวนออกจากไข่ (วาดเป็นหางยาวตามตำแหน่งย้อนหลัง)
				c.restore(); c.save();
				c.globalAlpha = Math.max(0, p.alpha * k);
				c.strokeStyle = p.color; c.lineWidth = p.size; c.lineCap = "round"; c.lineJoin = "round";
				c.beginPath();
				for (var j = 0; j <= 14; j++) {
					var tt = Math.max(0, p.t - j * 0.018), prog = easeOut(Math.min(1, tt / p.life));
					var ang = p.a0 + p.dir * prog * 4.2, rad = p.rMin + prog * p.rMax;
					var px = p.cx + Math.cos(ang) * rad, py = p.cy + Math.sin(ang) * rad * 0.82;
					c[j ? "lineTo" : "moveTo"](px, py);
				}
				c.stroke(); break;
		}
		c.restore();
	}
	function easeOut(x) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3); }

	function frame(now) {
		var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
		last = now;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, cv.width, cv.height);
		// อนุภาคเก็บพิกัดเทียบทั้งหน้า (ไม่ใช่จอ) — หน้าเลื่อน (เช่น ตอนการ์ดผลเลื่อนขึ้นมา) เอฟเฟกต์ก็ไปกับไข่
		ctx.setTransform(dpr, 0, 0, dpr, -window.scrollX * dpr, -window.scrollY * dpr);
		for (var i = parts.length - 1; i >= 0; i--) {
			var p = parts[i];
			if (p.delay > 0) { p.delay -= dt; continue; }
			p.t += dt;
			if (p.t >= p.life) { parts.splice(i, 1); continue; }
			var damp = Math.exp(-p.drag * dt);
			p.vx *= damp; p.vy = p.vy * damp + p.g * dt;
			if (p.wobble) p.vx += Math.sin(p.t * p.wobble + p.seed) * 40 * dt;
			p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
			// ค่อย ๆ จาง: เต็มช่วงแรก แล้วจางลงช่วงท้าย
			var k = p.t < 0.08 ? p.t / 0.08 : 1 - Math.pow(p.t / p.life, 2.2);
			draw(p, k);
		}
		if (parts.length) raf = requestAnimationFrame(frame);
		else { raf = 0; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); cv.classList.remove("is-on"); }
	}

	// ระลอกใหญ่สำหรับไข่ออกสกิน — tier 1–3 กำหนดจำนวนระลอก/อนุภาค
	function jackpot(cx, cy, R, colors, tier) {
		for (var w = 0; w < tier + 1; w++) {
			var d = w * 0.28;
			spray(cx, cy, 26 + tier * 10, { r0: R * 0.3, speed: [220, 620 + tier * 60], size: [5, 10], life: [0.9, 1.6], colors: colors, base: { kind: "star", g: 300, drag: 1.1, delay: d } });
			spray(cx, cy, 24 + tier * 8, { r0: R * 0.3, speed: [140, 420], size: [4, 8], life: [0.8, 1.4], colors: colors, base: { kind: "sparkle", drag: 2, delay: d } });
			add({ kind: "ring", x: cx, y: cy, r0: R * 0.3, r1: R * (2.2 + w * 0.5), width: 7 - w, color: colors[w % colors.length], alpha: 0.8, life: 1, delay: d });
		}
		spray(cx, cy, 30 + tier * 14, { r0: R * 0.2, speed: [260, 700], size: [3, 6], life: [1.2, 2], colors: colors, base: { kind: "crumb", g: 420, drag: 0.9 } });
		if (tier === 3) {
			// ฝนประกายตกจากบนจอทั้งความกว้าง
			var w0 = window.innerWidth, top = window.scrollY - 20;
			for (var i = 0; i < 70; i++) add({ kind: i % 3 ? "sparkle" : "star", x: window.scrollX + Math.random() * w0, y: top - Math.random() * 200, vx: rnd(-30, 30), vy: rnd(80, 200), g: 120, drag: 0.4, size: rnd(4, 8), life: rnd(2, 3.2), color: pick(colors), rot: rnd(0, 6), vr: rnd(-3, 3), delay: rnd(0, 0.9) });
		}
	}

	/* ---------- สูตรเอฟเฟกต์ประจำหมวด ---------- */
	var THEMES = {
		// ไข่ออกสกิน (jackpot) — ใหญ่กว่าปกติ ยิ่งหายากยิ่งอลังการ: หลายระลอก + วงแหวนหลายชั้น + ดาว/คอนเฟตติ
		//   ตำนาน = ทอง + สายรุ้ง + ฝนประกายตกจากบนจอ
		"jackpot-common": function(cx, cy, P, R) { jackpot(cx, cy, R, ["#c9b8ff", "#a173f2", "#ffffff", "#ffd447"], 1); },
		"jackpot-rare": function(cx, cy, P, R) { jackpot(cx, cy, R, ["#7fb2ff", "#b48cff", "#ffffff", "#5ad1ff", "#ffd447"], 2); },
		"jackpot-legendary": function(cx, cy, P, R) { jackpot(cx, cy, R, ["#ffd447", "#ffb627", "#ff6fa8", "#7fd0ff", "#a173f2", "#7be495", "#ffffff"], 3); },
		// ไข่ม่วงปกติ (ไม่มีไข่พิเศษ/สกินไม่มี fx) — ประกายม่วง + ดาวเล็กสีแบรนด์ + เศษเปลือกกระเด็น
		plain: function(cx, cy, P, R) {
			spray(cx, cy, Math.round(16 * P) + 2, { r0: R * 0.35, speed: [120, 340], size: [4, 8], life: [0.7, 1.2], colors: ["#b48cff", "#d7c4ff", "#ffffff", "#8656e0"], base: { kind: "sparkle", drag: 2.2 } });
			spray(cx, cy, Math.round(10 * P) + 1, { r0: R * 0.35, speed: [200, 420], size: [5, 8], life: [0.8, 1.2], colors: ["#a173f2", "#c9b8ff", "#ffd447"], base: { kind: "star", g: 360, drag: 1.2 } });
			if (P > 0.6) spray(cx, cy - R * 0.1, 14, { r0: R * 0.2, speed: [180, 380], angle: -Math.PI / 2, spread: 1.3, size: [5, 9], life: [0.8, 1.2], colors: ["#f7f3fb", "#ece6f6", "#ffffff"], base: { kind: "shard", g: 700, drag: 0.9 } });
			add({ kind: "ring", x: cx, y: cy, r0: R * 0.3, r1: R * 1.8, width: 5, color: "rgba(161,115,242,0.55)", life: 0.85 });
		},
		// ซุป — ละอองเหลืองทอง + ฟองลอยขึ้น + คลื่นเหลืองอ่อนแผ่ด้านข้าง · อบอุ่น นุ่มนวล
		soup: function(cx, cy, P, R) {
			spray(cx, cy, Math.round(34 * P), { r0: R * 0.35, speed: [120, 420], size: [2, 4.5], life: [0.7, 1.3], colors: ["#f7c948", "#f2b632", "#ffe08a", "#e9a31f"], base: { kind: "dot", g: 60 } });
			for (var i = 0; i < Math.round(12 * P); i++) add({ kind: "bubble", x: cx + rnd(-R * 0.7, R * 0.7), y: cy + rnd(-R * 0.2, R * 0.5), vx: rnd(-30, 30), vy: rnd(-170, -80), g: -40, drag: 0.6, size: rnd(5, 12), life: rnd(1.1, 1.8), color: "rgba(233,163,31,0.85)", fill: "rgba(255,224,138,0.35)", wobble: rnd(4, 7), seed: rnd(0, 6), delay: rnd(0, 0.25) });
			for (var w = 0; w < (P > 0.6 ? 3 : 1); w++) add({ kind: "ring", x: cx, y: cy + R * 0.25, r0: R * 0.5, r1: R * 2.4, sx: 1.6, sy: 0.45, width: 7, color: "rgba(255,214,102,0.6)", life: 1.1, delay: w * 0.16 });
		},
		// ญี่ปุ่น — ซากุระ: ดอกซากุระบานกระจายออกจากไข่ + กลีบปลิวร่วงลงช้า ๆ ส่ายไปมา + ประกายขาว + วงแหวนชมพูจาง ๆ
		japanese: function(cx, cy, P, R) {
			var pinks = ["#ffc4d6", "#ffb3c9", "#f9a3bd", "#ffd9e4", "#ffffff"];
			spray(cx, cy, Math.round(12 * P) + 2, { r0: R * 0.3, speed: [160, 380], size: [7, 12], life: [1.1, 1.6], colors: pinks.slice(0, 4), base: { kind: "blossom", g: 70, drag: 2.2 } });
			// กลีบร่วง: ออกจากไข่แล้วลอยลงช้า ๆ (แรงโน้มถ่วงต่ำ ส่ายซ้ายขวา พลิกกลีบ)
			for (var i = 0; i < Math.round(26 * P) + 4; i++) {
				var a = rnd(0, Math.PI * 2), sp = rnd(80, 280);
				add({ kind: "petal", x: cx + Math.cos(a) * R * 0.3, y: cy + Math.sin(a) * R * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
					g: 55, drag: 1.8, size: rnd(4, 7), life: rnd(1.4, 2.2), color: pick(pinks), rot: rnd(0, 6.3), vr: rnd(-3, 3),
					wobble: rnd(2.5, 4.5), seed: rnd(0, 6), flip: rnd(3, 6), delay: rnd(0, 0.18) });
			}
			spray(cx, cy, Math.round(10 * P), { r0: R * 0.4, speed: [60, 220], size: [3.5, 6], life: [0.6, 1.1], colors: ["#ffffff"], base: { kind: "sparkle", drag: 2.4 } });
			add({ kind: "ring", x: cx, y: cy, r0: R * 0.3, r1: R * 2, width: 5, color: "rgba(249,163,189,0.6)", life: 1 });
		},
		// เผ็ด — อนุภาคแดงส้มระเบิด + เปลวไฟเล็กพุ่งด้านข้าง + ประกายไฟเหลืองส้ม · ร้อนแรง
		thaiisan: function(cx, cy, P, R) {
			spray(cx, cy, Math.round(40 * P), { r0: R * 0.3, speed: [220, 600], size: [2.5, 5], life: [0.5, 1], colors: ["#e8442c", "#f26b2a", "#ff8c2b", "#d92e1f"], base: { kind: "dot", g: 220, drag: 1.8 } });
			[-1, 1].forEach(function(side) {
				spray(cx + side * R * 0.45, cy + R * 0.1, Math.round(7 * P) + 1, { angle: side > 0 ? -0.25 : Math.PI + 0.25, spread: 0.55, speed: [180, 380], size: [6, 11], life: [0.5, 0.85], colors: ["#ef4b25", "#f7701f", "#e5341f"], base: { kind: "flame", g: -260, drag: 2.2 } });
			});
			spray(cx, cy, Math.round(26 * P), { r0: R * 0.25, speed: [300, 700], size: [1.6, 2.6], life: [0.35, 0.7], colors: ["#ffd23f", "#ffb02e", "#fff1a8"], base: { kind: "streak", g: 300, drag: 1.4 } });
		},
		// ก๋วยเตี๋ยว — เส้นทอง/น้ำตาลหมุนวนออก + ละอองทอง + ไอน้ำบาง ๆ · อบอุ่น น่ากิน
		noodle: function(cx, cy, P, R) {
			var n = P > 0.6 ? 7 : 3;
			for (var i = 0; i < n; i++) add({ kind: "swirl", x: cx, y: cy, cx: cx, cy: cy, a0: (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), dir: i % 2 ? 1 : -1, rMin: R * 0.25, rMax: R * rnd(1.4, 2.1), size: rnd(3, 5), life: rnd(0.9, 1.25), color: pick(["#d9a441", "#b9804b", "#e8bf5c", "#a8703f"]) });
			spray(cx, cy, Math.round(26 * P), { r0: R * 0.35, speed: [90, 320], size: [1.6, 3.4], life: [0.8, 1.4], colors: ["#e8bf5c", "#f3d27a", "#d9a441"], base: { kind: "dot", g: 30 } });
			for (var s = 0; s < Math.round(6 * P) + 2; s++) add({ kind: "steam", x: cx + rnd(-R * 0.5, R * 0.5), y: cy - R * rnd(0.3, 0.7), vx: rnd(-15, 15), vy: rnd(-90, -50), g: -10, drag: 0.4, size: rnd(14, 24), life: rnd(1.2, 1.9), alpha: 0.7, wobble: rnd(2, 4), seed: rnd(0, 6), delay: rnd(0, 0.3) });
		},
		// Fast Food — อนุภาคส้มเหลืองระเบิด + ดาวเล็กกระเด็น + เศษเกล็ดขนม · สนุก สดใส
		fastfood: function(cx, cy, P, R) {
			spray(cx, cy, Math.round(32 * P), { r0: R * 0.3, speed: [200, 520], size: [2.5, 5], life: [0.6, 1.1], colors: ["#f2861f", "#ffb627", "#ffd447", "#f06a1d"], base: { kind: "dot", g: 260, drag: 1.4 } });
			spray(cx, cy, Math.round(12 * P) + 2, { r0: R * 0.35, speed: [220, 460], size: [6, 10], life: [0.8, 1.3], colors: ["#ffd447", "#ffb627", "#ffffff"], base: { kind: "star", g: 380, drag: 1.1 } });
			spray(cx, cy, Math.round(18 * P), { r0: R * 0.3, speed: [160, 420], size: [2.5, 4.5], life: [0.7, 1.2], colors: ["#e9a23b", "#f5c76a", "#c9822e"], base: { kind: "crumb", g: 420, drag: 1 } });
		}
	};

	/* ---------- เสียงไข่ (สังเคราะห์สดด้วย Web Audio ไม่มีไฟล์เสียง) ----------
	   ใช้สวิตช์เสียงเดียวกับหน้าต่างเปิดเหรียญ (localStorage chimchim_sound = "0" = ปิด)
	   wiggle = ไข่ดุ๊กดิ๊ก (เบามาก และดังเฉพาะหลังผู้ใช้แตะหน้านี้แล้ว — เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้โต้ตอบ)
	   tap = แตะไข่ (ก๊อกเปลือก + กรอบแกรบ) · crack = ไข่แตก (เปลือกแตก + ชูวิ้งขึ้น) */
	var actx = null, noiseBuf = null;
	function soundOn() {
		try { return localStorage.getItem("chimchim_sound") !== "0"; } catch (e) { return true; }
	}
	function audio(create) {
		if (!soundOn()) return null;
		var AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		if (!actx) { if (!create) return null; actx = new AC(); }
		if (actx.state === "suspended") { if (!create) return null; actx.resume(); }
		return actx;
	}
	function tone(c, at, dur, from, to, type, vol) {
		var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + at;
		o.type = type || "sine";
		o.frequency.setValueAtTime(from, t0);
		if (to && to !== from) o.frequency.exponentialRampToValueAtTime(to, t0 + dur * 0.85);
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		o.connect(g); g.connect(c.destination);
		o.start(t0); o.stop(t0 + dur + 0.02);
	}
	// เสียงกรอบแกรบของเปลือก = noise สั้น ๆ ผ่าน bandpass
	function crackle(c, at, dur, freq, vol) {
		if (!noiseBuf) {
			noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
			var d = noiseBuf.getChannelData(0);
			for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		}
		var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + at;
		src.buffer = noiseBuf;
		bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.4;
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		src.connect(bp); bp.connect(g); g.connect(c.destination);
		src.start(t0, Math.random() * 0.3, dur + 0.05);
	}
	window.chimchimEggSound = function(kind, step) {
		var c = audio(kind !== "wiggle");
		if (!c) return;
		if (kind === "wiggle") {
			// ดุ๊กดิ๊ก: โบ๋ง-โบ๋งเบา ๆ สองที (ตามจังหวะโยก)
			tone(c, 0, 0.12, 330, 392, "sine", 0.05);
			tone(c, 0.16, 0.12, 392, 330, "sine", 0.045);
			tone(c, 0.32, 0.1, 349, 349, "sine", 0.03);
		} else if (kind === "tap") {
			// แตะ: ก๊อกเปลือก (ต่ำ) + กรอบแกรบ · ครั้งที่ 2 ร้าวมากขึ้น เสียงสูงขึ้นนิด
			var up = step === 2 ? 1.18 : 1;
			tone(c, 0, 0.09, 520 * up, 300 * up, "triangle", 0.12);
			crackle(c, 0.01, 0.06, 2600 * up, 0.18);
			if (step === 2) crackle(c, 0.08, 0.07, 3200, 0.14);
		} else if (kind === "jackpot") {
			// แฟนแฟร์: อาร์เปจจิโอขึ้นยาวตามระดับ (ธรรมดา 1 รอบ · หายาก 2 · ตำนาน 3 + คอร์ดค้าง) + ประกายพรมท้าย
			var tier = step || 1;
			var notes = [523, 659, 784, 1047, 1319, 1568, 2093];
			for (var r = 0; r < tier; r++) {
				notes.slice(0, 4 + r).forEach(function(f, i) { tone(c, 0.35 + r * 0.42 + i * 0.07, 0.28, f, f * 1.005, "triangle", 0.08); });
			}
			var end = 0.35 + tier * 0.42;
			[1047, 1319, 1568].forEach(function(f) { tone(c, end, 0.9, f, f, "sine", 0.06); });
			for (var k = 0; k < 6 + tier * 3; k++) tone(c, end + 0.1 + k * 0.06, 0.12, 2400 + Math.random() * 1600, 0, "sine", 0.03);
		} else if (kind === "crack") {
			// แตก: เปลือกแตกหลายจังหวะ + ชูวิ้งไล่ขึ้น + ประกายท้าย
			crackle(c, 0, 0.08, 2200, 0.24);
			crackle(c, 0.05, 0.1, 3400, 0.18);
			crackle(c, 0.12, 0.12, 1600, 0.16);
			tone(c, 0.1, 0.35, 440, 1760, "triangle", 0.1);
			[1047, 1319, 1568, 2093].forEach(function(f, i) { tone(c, 0.28 + i * 0.07, 0.22, f, f * 1.01, "sine", 0.09); });
		}
	};

	window.chimchimEggFx = function(theme, power, el) {
		var fn = THEMES[theme];
		if (!fn || !el || reduced()) return;
		ensureCanvas();
		var r = el.getBoundingClientRect();
		// ตัวไข่จริงอยู่กลางกรอบ ค่อนล่างเล็กน้อย กินราวครึ่งหนึ่งของกรอบ
		var cx = r.left + r.width / 2 + window.scrollX, cy = r.top + r.height * 0.56 + window.scrollY, R = r.width * 0.26;
		fn(cx, cy, Math.max(0.2, Math.min(1, power || 1)), R);
		cv.classList.add("is-on");
		if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
	};
})();
