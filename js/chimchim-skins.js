// chimchim-skins.js
// ร้านสกินไข่ในหน้าสุ่มร้าน (SQL Phase 28) — ซื้อด้วย Token · บางทีได้จากหีบสมบัติ · ใส่ได้ทีละสกิน (ชนะไข่ตามหมวด)
// ราคา/ความเป็นเจ้าของ/การหักเงินตัดสินในฐานข้อมูลทั้งหมด หน้านี้แค่แสดงผลและส่งคำขอ
// สกินที่ใส่อยู่จำไว้ในเครื่องต่อบัญชี (แสดงไข่ได้ทันทีตอนเปิดหน้า) แล้วยืนยันกับเซิร์ฟเวอร์อีกที
// โหลดก่อน chimchim-roulette.js: ตั้ง window.chimchimEggSkin ให้ paintEggTheme() ใช้ตั้งแต่วาดไข่ครั้งแรก

var CHIMCHIM_SKIN_CACHE_KEY = "chimchim_egg_skin";
var CHIMCHIM_SKIN_RARITY = ["common", "rare", "legendary"];

(function() {
	var session = typeof getSession === "function" ? getSession() : null;
	// บัญชีจริงเท่านั้น (id แบบ uuid ของ Supabase) — บัญชีทดลองในเครื่องไม่มีระบบ Token
	var realAccount = !!(session && /^[0-9a-f-]{36}$/i.test(session.id || ""));
	var state = null; // { skins, equipped, balance }
	var dlg = null, busy = false;

	function cacheKey() { return CHIMCHIM_SKIN_CACHE_KEY + ":" + (session ? session.id : ""); }
	function readCache() {
		try { return JSON.parse(localStorage.getItem(cacheKey())); } catch (e) { return null; }
	}
	function writeCache(skin) {
		try {
			if (skin) localStorage.setItem(cacheKey(), JSON.stringify({ id: skin.id, image: skin.image, fx: skin.fx || null }));
			else localStorage.removeItem(cacheKey());
		} catch (e) {}
	}
	function applySkin(skin) {
		window.chimchimEggSkin = skin ? { id: skin.id, image: skin.image, fx: skin.fx || null } : null;
		writeCache(window.chimchimEggSkin);
		if (typeof paintEggTheme === "function") paintEggTheme();
	}
	function skinName(s) { return (getLang && getLang() === "en" ? s.nameEn : s.nameTh) || s.nameTh || s.id; }
	function equippedSkin() {
		return state && state.equipped ? state.skins.filter(function(s) { return s.id === state.equipped; })[0] || null : null;
	}

	window.chimchimEggSkin = realAccount ? readCache() : null;
	if (!realAccount) return;

	var btn = document.getElementById("eggShopBtn");
	if (btn) {
		btn.hidden = false;
		btn.addEventListener("click", openShop);
	}
	refresh();

	function refresh() {
		if (typeof sbSkinState !== "function") return Promise.resolve(null);
		return sbSkinState().then(function(st) {
			if (!st || !Array.isArray(st.skins)) return null;
			state = st;
			var eq = equippedSkin();
			var cur = window.chimchimEggSkin;
			if ((eq ? eq.id + eq.image : "") !== (cur ? cur.id + cur.image : "")) applySkin(eq);
			if (dlg && dlg.open) render();
			return st;
		});
	}

	/* ---------------- หน้าต่างร้าน ---------------- */
	function build() {
		if (dlg) return dlg;
		dlg = document.createElement("dialog");
		dlg.className = "skindlg";
		dlg.setAttribute("aria-labelledby", "skinTitle");
		dlg.innerHTML =
			'<div class="sk-head">' +
				'<h2 id="skinTitle"></h2>' +
				'<span class="sk-balance"><img src="img/prize/coin.svg" alt=""/><b></b><small>Token</small></span>' +
				'<button type="button" class="sk-close"><i class="fas fa-xmark" aria-hidden="true"></i></button>' +
			"</div>" +
			'<p class="sk-sub"></p>' +
			'<div class="sk-body"></div>' +
			'<p class="sk-msg" role="status" aria-live="polite"></p>';
		document.body.appendChild(dlg);
		dlg.querySelector(".sk-close").addEventListener("click", function() { dlg.close(); });
		dlg.addEventListener("click", function(e) { if (e.target === dlg) dlg.close(); });
		dlg.querySelector(".sk-body").addEventListener("click", onBodyClick);
		return dlg;
	}
	function msg(text, bad) {
		var el = dlg.querySelector(".sk-msg");
		el.textContent = text || "";
		el.classList.toggle("is-bad", !!bad);
	}
	function render() {
		dlg.querySelector("#skinTitle").textContent = t("skin.title");
		dlg.querySelector(".sk-close").setAttribute("aria-label", t("common.close"));
		dlg.querySelector(".sk-sub").textContent = t("skin.sub");
		var bal = dlg.querySelector(".sk-balance b");
		bal.textContent = state && typeof state.balance === "number" ? state.balance : "–";
		dlg.querySelector(".sk-balance").setAttribute("aria-label", t("skin.balance").replace("{n}", bal.textContent));
		var body = dlg.querySelector(".sk-body");
		body.innerHTML = "";
		if (!state) {
			body.innerHTML = '<div class="sk-empty"><i class="fas fa-wifi" aria-hidden="true"></i><p></p><button type="button" class="jbtn sk-retry"></button></div>';
			body.querySelector("p").textContent = t("skin.loadFailed");
			body.querySelector(".sk-retry").textContent = t("skin.retry");
			return;
		}
		// ยังไม่มีสกินขาย → บอกตรง ๆ ว่ายังไม่มีให้ซื้อ (ไม่โชว์การ์ดไข่ปกติเดี่ยว ๆ ให้ดูเหมือนมีของ)
		if (!state.skins.length) {
			body.innerHTML = '<div class="sk-none"><img src="img/Dino/3.png" alt=""/><b></b><p></p></div>';
			body.querySelector("b").textContent = t("skin.noneTitle");
			body.querySelector("p").textContent = t("skin.noneDesc");
			return;
		}
		// ใส่ไข่ปกติ (ไม่ใส่สกิน) — เลือกกลับได้เสมอ
		var list = document.createElement("ul");
		list.className = "sk-grid";
		list.appendChild(card({ id: "", image: "img/Dino/3.png", owned: true, plain: true }));
		state.skins.forEach(function(s) { list.appendChild(card(s)); });
		body.appendChild(list);
	}
	function card(s) {
		var li = document.createElement("li");
		var on = s.plain ? !state.equipped : state.equipped === s.id;
		li.className = "sk-card" + (on ? " is-on" : "") + (s.rarity ? " r-" + s.rarity : "");
		var name = s.plain ? t("skin.plain") : skinName(s);
		var action, label;
		// ล็อกเลเวล (SQL Phase 29): ยังไม่มีและเลเวลไม่ถึง → "ต้อง Lv.X" กดซื้อไม่ได้ (ฐานข้อมูลตรวจซ้ำ)
		var locked = !s.plain && !s.owned && s.minLevel > 1 && typeof state.level === "number" && state.level < s.minLevel;
		if (on) { action = ""; label = t("skin.wearing"); }
		else if (s.owned) { action = "equip"; label = t("skin.wear"); }
		else if (locked) { action = ""; label = t("skin.needLevel").replace("{n}", s.minLevel); }
		else { action = "buy"; label = t("skin.buy").replace("{n}", s.price); }
		li.innerHTML =
			'<span class="sk-art"><img alt="" loading="lazy" decoding="async"/></span>' +
			(s.rarity ? '<span class="sk-rarity"></span>' : "") +
			'<b class="sk-name"></b>' +
			(s.source === "chest" || s.source === "egg" ? '<small class="sk-from"><i class="fas fa-' + (s.source === "egg" ? "egg" : "gift") + '" aria-hidden="true"></i> </small>' : "") +
			'<button type="button" class="sk-act"></button>';
		li.querySelector("img").src = s.image;
		li.querySelector(".sk-name").textContent = name;
		if (s.rarity) li.querySelector(".sk-rarity").textContent = t("skin.rarity." + s.rarity);
		if (s.source === "chest" || s.source === "egg") li.querySelector(".sk-from").appendChild(document.createTextNode(t(s.source === "egg" ? "skin.fromEgg" : "skin.fromChest")));
		var b = li.querySelector(".sk-act");
		b.textContent = label;
		b.setAttribute("data-act", action);
		b.setAttribute("data-id", s.id);
		b.className = "sk-act" + (action === "buy" ? " is-buy" : "");
		if (!action) b.setAttribute("aria-disabled", "true");
		if (locked) {
			li.classList.add("is-locked");
			b.classList.add("is-locked");
			b.insertAdjacentHTML("afterbegin", '<i class="fas fa-lock" aria-hidden="true"></i> ');
			b.setAttribute("aria-label", t("skin.needLevelLabel").replace("{name}", name).replace("{n}", s.minLevel).replace("{lv}", state.level));
		} else if (!s.plain && s.minLevel > 1) {
			var tag = document.createElement("small");
			tag.className = "sk-lv";
			tag.textContent = "Lv." + s.minLevel + "+";
			li.insertBefore(tag, b);
		}
		if (action === "buy") {
			b.insertAdjacentHTML("afterbegin", '<img src="img/prize/coin.svg" alt=""/> ');
			b.setAttribute("aria-label", t("skin.buyLabel").replace("{name}", name).replace("{n}", s.price));
			if (state && typeof state.balance === "number" && state.balance < s.price) b.classList.add("is-short");
		} else if (action === "equip") {
			b.setAttribute("aria-label", t("skin.wearLabel").replace("{name}", name));
		}
		return li;
	}
	function onBodyClick(e) {
		if (e.target.closest(".sk-retry")) { msg(""); refresh().then(function(st) { if (!st) msg(t("skin.loadFailed"), true); }); return; }
		var b = e.target.closest(".sk-act");
		if (!b || busy) return;
		var act = b.getAttribute("data-act"), id = b.getAttribute("data-id");
		if (act === "equip") equip(id || null);
		else if (act === "buy") buy(id, b);
	}
	function skinById(id) { return state.skins.filter(function(s) { return s.id === id; })[0] || null; }
	function equip(id) {
		busy = true;
		msg(t("skin.saving"));
		sbEquipSkin(id).then(function(res) {
			busy = false;
			if (!res || res.status !== "ok") { msg(t(res && res.status === "notOwned" ? "skin.notOwned" : "skin.failed"), true); return; }
			state.equipped = res.equipped || null;
			applySkin(equippedSkin());
			render();
			msg(id ? t("skin.wornNow").replace("{name}", skinName(skinById(id))) : t("skin.plainNow"));
		});
	}
	function buy(id, b) {
		var s = skinById(id);
		if (!s) return;
		if (typeof state.balance === "number" && state.balance < s.price) {
			msg(t("skin.poor").replace("{n}", s.price - state.balance), true);
			return;
		}
		// ยืนยันในหน้าต่างร้านเอง (หน้าต่างยืนยันแยกจะไปอยู่ใต้ dialog ที่เปิดแบบ modal กดไม่ได้):
		// แตะครั้งแรก = ปุ่มเปลี่ยนเป็น "ยืนยันซื้อ" + บอกยอดที่จะเหลือ · แตะซ้ำภายใน 5 วิ = ซื้อจริง
		if (b.getAttribute("data-confirm") !== "1") {
			dlg.querySelectorAll('.sk-act[data-confirm="1"]').forEach(function(x) { x.removeAttribute("data-confirm"); x.classList.remove("is-confirm"); });
			b.setAttribute("data-confirm", "1");
			b.classList.add("is-confirm");
			b.lastChild.textContent = " " + t("skin.confirmBtn").replace("{n}", s.price);
			msg(t("skin.confirmMsg").replace("{name}", skinName(s)).replace("{n}", s.price).replace("{b}", state.balance - s.price));
			clearTimeout(b._skt);
			b._skt = setTimeout(function() { if (dlg.open && !busy) { render(); msg(""); } }, 5000);
			return;
		}
		clearTimeout(b._skt);
		(function() {
			busy = true;
			b.setAttribute("aria-disabled", "true");
			msg(t("skin.buying"));
			sbBuySkin(id).then(function(res) {
				busy = false;
				if (!res) { msg(t("skin.failed"), true); render(); return; }
				if (typeof res.balance === "number") {
					state.balance = res.balance;
					if (typeof chimchimPaintTokenBalance === "function") chimchimPaintTokenBalance(res.balance);
				}
				if (res.status === "bought" || res.status === "owned") {
					s.owned = true;
					s.source = s.source || "buy";
					state.equipped = id; // ซื้อแล้วฐานข้อมูลใส่ให้เลย
					if (res.status === "owned") sbEquipSkin(id);
					applySkin(s);
					render();
					msg(t("skin.boughtNow").replace("{name}", skinName(s)));
				} else if (res.status === "level") {
					state.level = res.level;
					render();
					msg(t("skin.needLevelMsg").replace("{n}", res.needLevel).replace("{lv}", res.level), true);
				} else if (res.status === "poor") {
					render();
					msg(t("skin.poor").replace("{n}", (res.price || s.price) - (res.balance || 0)), true);
				} else {
					render();
					msg(t(res.status === "none" ? "skin.gone" : "skin.failed"), true);
					refresh();
				}
			});
		})();
	}
	function openShop() {
		build();
		render();
		msg("");
		if (!dlg.open) dlg.showModal();
		refresh().then(function(st) { if (!st && !state) render(); });
	}

	// หีบสมบัติให้สกินมา (chimchim-coin.js เรียก) → โหลดสถานะร้านใหม่
	window.chimchimSkinsChanged = refresh;
})();
