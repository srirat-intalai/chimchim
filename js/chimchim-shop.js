// chimchim-shop.js
// หน้า Settings: สร้าง/แก้ไข "ร้านของฉัน" — รวมทั้งข้อมูลสำหรับ Match %/Discovery Feed/AI Finder
// (ราคา/ระยะทาง/หมวด/เมนูเด่น) และความสามารถแบบเพจร้าน (โพสต์รูป, สลับโพสต์ในนาม) ไว้ในที่เดียว
// เดิมแยกเป็น "เพจร้านอาหาร" (chimchim-page.js) กับ "ร้านของฉัน" คนละระบบกัน ตอนนี้รวมเป็นเอนทิตีเดียว
// (ร้านเก่า/เพจเก่าที่เคยแยกกันไว้ จะถูกรวมอัตโนมัติผ่าน migratePageIntoShop() ใน chimchim-core.js)
// บันทึกผ่าน createOrUpdateMyShop() ใน chimchim-core.js

(function() {
	var guestCard = document.getElementById("shopGuestCard");
	var formCard = document.getElementById("shopFormCard");
	var personaCard = document.getElementById("personaCard");
	if (!guestCard || !formCard) return;

	var session = getSession();
	if (!session) {
		guestCard.hidden = false;
		return;
	}
	formCard.hidden = false;

	// ?newShop=1 = มาจากเมนูสลับโปรไฟล์ "+ เพิ่มโปรไฟล์ → โปรไฟล์ร้านค้า" — ฟอร์มว่างสำหรับสร้างร้านใหม่ ไม่แก้ร้านเดิม
	var newShopMode = new URLSearchParams(window.location.search).get("newShop") === "1";
	var myShop = newShopMode ? null : getMyShop();

	/* --- ตัวเลือกมหาวิทยาลัยใกล้เคียง --- */
	var uniSelect = document.getElementById("shopUni");
	มหาวิทยาลัยทั้งหมด.forEach(function(uni) {
		var opt = document.createElement("option");
		opt.value = uni;
		opt.textContent = uni;
		uniSelect.appendChild(opt);
	});

	/* --- อัปโหลดรูปเมนูเด่นเอง --- */
	wireImageUpload("shopImageFile", "shopImage", "shopImagePreviewImg", "shopImageUploadBox", myShop ? myShop.img : null);

	/* --- ใช้ตำแหน่งจริงของเจ้าของร้านตอนโพสต์ (ไม่บังคับ) — ถ้ากด จะได้ระยะทางที่คำนวณสด ๆ จากตำแหน่งจริง
	   ของผู้ชมแต่ละคนแทนตัวเลขกะประมาณที่กรอกเอง (ดู shopToร้าน() ใน chimchim-core.js) --- */
	var shopLat = myShop && typeof myShop.lat === "number" ? myShop.lat : null;
	var shopLng = myShop && typeof myShop.lng === "number" ? myShop.lng : null;
	var useLocationBtn = document.getElementById("shopUseLocationBtn");
	var locationHint = document.getElementById("shopLocationHint");
	if (shopLat !== null) {
		locationHint.hidden = false;
		locationHint.textContent = t("shop.locationSavedHint");
	}
	if (useLocationBtn) {
		useLocationBtn.addEventListener("click", function() {
			useLocationBtn.disabled = true;
			ขอตำแหน่งผู้ใช้().then(function(loc) {
				shopLat = loc.lat;
				shopLng = loc.lng;
				useLocationBtn.disabled = false;
				locationHint.hidden = false;
				locationHint.textContent = t("shop.locationSavedHint");
			}).catch(function() {
				useLocationBtn.disabled = false;
				locationHint.hidden = false;
				locationHint.textContent = t("shop.locationFailedHint");
			});
		});
	}

	/* --- หมวดอาหารแบบพิมพ์ค้นหาได้ (ไทย/อังกฤษ) ---
	   <select id="shopCat"> เดิมยังเป็นที่เก็บค่าจริง (ซ่อนไว้) ค่าที่บันทึก = value ของ option = ชื่อหมวดภาษาไทยตามเดิม
	   รายการสร้างจาก option ใน select ทุกตัว (หมวดเดิมไม่หาย) คำค้น = ชื่อหมวด + ชื่อใน CHIMCHIM_CAT_LABEL + CHIMCHIM_CAT_SEARCH
	   พิมพ์แล้วไม่ได้เลือก = ไม่เปลี่ยนหมวด (ออกจากช่องแล้วกลับเป็นหมวดเดิม) --- */
	// ตัวพิมพ์เล็ก ตัดช่องว่างเกิน ไม่สนวรรณยุกต์ไทย (หมาล่า = หม่าล่า, สเต็ก = สเต๊ก)
	function catNorm(str) {
		return String(str || "").toLowerCase().replace(/[\u0E48-\u0E4B]/g, "").replace(/\s+/g, " ").trim();
	}
	// คำไทยไม่มีช่องว่างคั่น → หาแบบมีคำนี้อยู่ในคำค้น / คำอังกฤษ → ต้องเป็นต้นคำ (กัน "ice" ไปเจอ "rice", "tea" เจอ "steak")
	function catTokenMatches(token, term) {
		if (/[\u0E00-\u0E7F]/.test(token)) return term.indexOf(token) !== -1;
		return term.split(/[\s\/\-]+/).some(function(w) { return w.indexOf(token) === 0; }) || term.indexOf(token) === 0;
	}
	function catSearch(items, query) {
		var q = catNorm(query);
		if (!q) return items.slice();
		var tokens = q.split(" ");
		var scored = [];
		items.forEach(function(item, order) {
			// ทุกคำที่พิมพ์ต้องเจอในคำค้นสักคำของหมวดนี้ (พิมพ์ไทยปนอังกฤษได้ เช่น "อาหาร japan")
			if (!tokens.every(function(tok) { return item.terms.some(function(term) { return catTokenMatches(tok, term); }); })) return;
			var score = 3;
			if (item.terms.some(function(term) { return term === q; })) score = 0;          // ตรงชื่อ/คำค้นทั้งคำ
			else if (catNorm(item.label).indexOf(q) === 0 || catNorm(item.value).indexOf(q) === 0) score = 1; // ชื่อขึ้นต้นด้วยคำที่พิมพ์
			else if (item.terms.some(function(term) { return term.indexOf(q) === 0; })) score = 2;
			scored.push({ item: item, score: score, order: order });
		});
		scored.sort(function(a, b) { return a.score - b.score || a.order - b.order; });
		return scored.map(function(x) { return x.item; });
	}
	function wireCategorySearch(select) {
		if (!select || select.dataset.searchWired) return;
		select.dataset.searchWired = "1";
		var items = [];
		Array.prototype.forEach.call(select.options, function(opt) {
			var group = opt.parentNode && opt.parentNode.tagName === "OPTGROUP" ? opt.parentNode : null;
			var value = opt.value;
			var emoji = (opt.textContent.match(/^\s*(\S+)\s/) || [])[1];
			var label = catLabel(value);
			var terms = [value, label, opt.textContent, CHIMCHIM_CAT_LABEL.en[value], CHIMCHIM_CAT_LABEL.th[value]].concat(CHIMCHIM_CAT_SEARCH[value] || [])
				.filter(Boolean).map(catNorm);
			items.push({
				value: value,
				label: label,
				display: (emoji && !/[\u0E00-\u0E7Fa-z]/i.test(emoji) ? emoji + " " : "") + label,
				group: group ? (group.getAttribute("data-group-key") ? t(group.getAttribute("data-group-key")) : group.label) : "",
				terms: terms
			});
		});

		var wrap = document.createElement("div");
		wrap.className = "catcombo";
		var listId = select.id + "List";
		wrap.innerHTML =
			'<input class="fctrl catcombo-input" type="text" id="' + select.id + 'Search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + listId + '" autocomplete="off" autocapitalize="off" spellcheck="false"/>' +
			'<i class="fas fa-chevron-down catcombo-caret" aria-hidden="true"></i>' +
			'<ul class="catcombo-list" id="' + listId + '" role="listbox" hidden></ul>' +
			'<span class="catcombo-status" aria-live="polite"></span>';
		select.parentNode.insertBefore(wrap, select);
		select.classList.add("catcombo-native");
		select.setAttribute("aria-hidden", "true");
		select.tabIndex = -1;
		var input = wrap.querySelector("input");
		var list = wrap.querySelector("ul");
		var status = wrap.querySelector(".catcombo-status");
		input.placeholder = t("shop.catSearchPlaceholder");
		// ป้าย "หมวดอาหาร" เดิมผูกกับช่องค้นหาให้โปรแกรมอ่านหน้าจออ่านชื่อช่องถูก
		var labelEl = wrap.previousElementSibling;
		if (labelEl && labelEl.classList.contains("flbl")) {
			labelEl.id = labelEl.id || select.id + "Label";
			labelEl.setAttribute("for", input.id);
			list.setAttribute("aria-labelledby", labelEl.id);
		}

		var shown = [];
		var active = -1;
		function current() {
			return items.filter(function(it) { return it.value === select.value; })[0] || null;
		}
		function showSelected() {
			var cur = current();
			input.value = cur ? cur.display : "";
		}
		function setActive(i) {
			var opts = list.querySelectorAll('[role="option"]');
			if (!opts.length) { active = -1; input.removeAttribute("aria-activedescendant"); return; }
			active = Math.max(0, Math.min(i, opts.length - 1));
			opts.forEach(function(o, k) {
				o.classList.toggle("is-active", k === active);
				o.setAttribute("aria-selected", o.getAttribute("data-value") === select.value ? "true" : "false");
			});
			input.setAttribute("aria-activedescendant", opts[active].id);
			opts[active].scrollIntoView({ block: "nearest" });
		}
		function render(query) {
			shown = catSearch(items, query);
			list.innerHTML = "";
			var grouped = !catNorm(query); // ยังไม่พิมพ์ = แสดงทั้งหมดเป็นกลุ่มเหมือน dropdown เดิม
			var lastGroup = null;
			shown.forEach(function(it, k) {
				if (grouped && it.group && it.group !== lastGroup) {
					lastGroup = it.group;
					var h = document.createElement("li");
					h.className = "catcombo-group";
					h.setAttribute("role", "presentation");
					h.textContent = it.group;
					list.appendChild(h);
				}
				var li = document.createElement("li");
				li.id = listId + "-" + k;
				li.className = "catcombo-opt" + (it.value === select.value ? " is-selected" : "");
				li.setAttribute("role", "option");
				li.setAttribute("data-value", it.value);
				li.textContent = it.display;
				if (it.value === select.value) {
					var tick = document.createElement("i");
					tick.className = "fas fa-check";
					tick.setAttribute("aria-hidden", "true");
					li.appendChild(tick);
				}
				list.appendChild(li);
			});
			if (!shown.length) {
				var empty = document.createElement("li");
				empty.className = "catcombo-empty";
				empty.setAttribute("role", "presentation");
				empty.textContent = t("shop.catNoMatch");
				list.appendChild(empty);
			}
			status.textContent = shown.length ? t("shop.catResults").replace("{n}", shown.length) : t("shop.catNoMatch");
			// ไม่ได้พิมพ์: ชี้ที่หมวดที่เลือกอยู่ / พิมพ์แล้ว: ชี้ผลแรก (ตรงที่สุด) ให้กด Enter เลือกได้เลย
			var selIdx = shown.indexOf(current());
			setActive(grouped && selIdx !== -1 ? selIdx : 0);
		}
		function open(query) {
			var wasHidden = list.hidden;
			list.hidden = false;
			wrap.classList.add("is-open");
			input.setAttribute("aria-expanded", "true");
			render(query);
			// ช่องอยู่ใกล้ขอบล่างจอ (บนมือถือเจอบ่อย) → เลื่อนหน้าให้เห็นรายการทั้งหมด ไม่ยื่นหลุดจอ
			if (wasHidden) setTimeout(function() { if (!list.hidden) list.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 0);
		}
		function close(revert) {
			list.hidden = true;
			wrap.classList.remove("is-open");
			input.setAttribute("aria-expanded", "false");
			input.removeAttribute("aria-activedescendant");
			if (revert) showSelected(); // พิมพ์แล้วไม่ได้เลือก = หมวดเดิม
		}
		function choose(value) {
			if (select.value !== value) {
				select.value = value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
			}
			showSelected();
			close(false);
		}

		input.addEventListener("focus", function() {
			open("");
			input.select(); // พิมพ์ทับชื่อหมวดเดิมได้ทันที
		});
		input.addEventListener("click", function() { if (list.hidden) open(""); });
		input.addEventListener("input", function() { open(input.value); });
		input.addEventListener("keydown", function(e) {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				if (list.hidden) { open(""); return; }
				setActive(active + (e.key === "ArrowDown" ? 1 : -1));
			} else if (e.key === "Enter") {
				if (list.hidden) return;
				e.preventDefault(); // ไม่ส่งฟอร์มตอนกำลังเลือกหมวด
				if (shown[active]) choose(shown[active].value);
			} else if (e.key === "Escape") {
				if (!list.hidden) { e.preventDefault(); close(true); }
			} else if (e.key === "Tab") {
				close(true);
			}
		});
		// mousedown แทน click — เลือกได้ก่อนช่องเสียโฟกัส (ไม่งั้น blur ปิดรายการไปก่อน)
		list.addEventListener("mousedown", function(e) {
			e.preventDefault();
			var li = e.target.closest('[role="option"]');
			if (li) choose(li.getAttribute("data-value"));
		});
		input.addEventListener("blur", function() { close(true); });
		wrap.querySelector(".catcombo-caret").addEventListener("mousedown", function(e) {
			e.preventDefault();
			if (list.hidden) input.focus(); else close(true);
		});
		select.addEventListener("change", showSelected); // เผื่อมีโค้ดอื่นตั้งค่า select
		showSelected();
	}

	/* --- ช่องตัวเลข (ราคาต่ำ/ราคาสูง/ระยะทาง) — พิมพ์ได้เฉพาะเลข 0-9 ไม่มีปุ่มลูกศร (type="text" + inputmode="numeric")
	   ตัวอักษรไทย/อังกฤษ/สัญลักษณ์ถูกกันไม่ให้เข้าช่อง + ขอบแดงและข้อความเตือนใต้ช่อง แก้จนถูกแล้วเตือนหายเอง
	   วางข้อความที่มีตัวอักษรปน = ปฏิเสธทั้งก้อน (ไม่ตัดเหลือแต่ตัวเลขเอง เดาผิดได้ เช่น "1,500" ≠ 1500 หรือ 15)
	   ลบจนว่างได้ระหว่างพิมพ์ (ไม่เติม 0 ให้เอง) — ช่องว่าง/ช่วงค่า/ราคาต่ำ>สูง ตรวจตอนออกจากช่องและตอนบันทึก --- */
	var NUM_FIELDS = { shopPriceLow: "priceLow", shopPriceHigh: "priceHigh", shopDistance: "distance" };
	function numError(input, text) {
		var errEl = document.getElementById(input.id + "Err");
		input.classList.toggle("is-invalid", !!text);
		input.setAttribute("aria-invalid", text ? "true" : "false");
		if (errEl) errEl.textContent = text || "";
	}
	function numMessage(r) {
		return t(r.key).replace("{min}", r.min).replace("{max}", r.max);
	}
	Object.keys(NUM_FIELDS).forEach(function(id) {
		var input = document.getElementById(id);
		var lastValid = "";
		var digitsWarn = false;
		// ค่าที่ใส่จากโค้ด (โหลดร้านเดิมมาแก้) ไม่ยิง input event — จำค่าตอนเริ่มแก้แทน
		input.addEventListener("focus", function() { if (/^\d*$/.test(input.value)) lastValid = input.value; });
		function warnDigits() {
			digitsWarn = true;
			numError(input, t("shop.numOnlyDigits"));
		}
		input.addEventListener("beforeinput", function(e) {
			if (e.inputType === "insertFromPaste" || e.inputType === "insertFromDrop") return; // ดู paste ด้านล่าง
			if (e.data && /\D/.test(e.data) && e.cancelable) {
				e.preventDefault();
				warnDigits();
			}
		});
		input.addEventListener("paste", function(e) {
			var text = ((e.clipboardData || window.clipboardData) || { getData: function() { return ""; } }).getData("text");
			var trimmed = String(text || "").trim();
			e.preventDefault();
			if (!/^\d+$/.test(trimmed)) { warnDigits(); return; }
			// ใส่ตัวเลขที่วางแทนส่วนที่เลือกไว้ (เหมือนวางปกติ) แล้วแจ้ง input ให้ตรวจต่อ
			var start = input.selectionStart, end = input.selectionEnd;
			var next = input.value.slice(0, start) + trimmed + input.value.slice(end);
			if (next.length > input.maxLength && input.maxLength > 0) { warnDigits(); return; }
			input.value = next;
			input.setSelectionRange(start + trimmed.length, start + trimmed.length);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		});
		// ตาข่ายชั้นสุดท้าย: แป้นพิมพ์ไทย/IME/ลากวาง ที่ beforeinput ยกเลิกไม่ได้ → คืนค่าที่ถูกล่าสุด
		input.addEventListener("input", function() {
			if (!/^\d*$/.test(input.value)) {
				input.value = lastValid;
				warnDigits();
				return;
			}
			lastValid = input.value;
			if (digitsWarn || input.classList.contains("is-invalid")) {
				digitsWarn = false;
				numError(input, "");
			}
		});
		input.addEventListener("blur", function() {
			// ปล่อยว่างไว้ก่อนได้ — บังคับกรอกตอนบันทึก
			if (input.value !== "") {
				var r = checkShopNumber(NUM_FIELDS[id], input.value);
				numError(input, r.ok ? "" : numMessage(r));
				if (!r.ok) return;
			}
			if (id === "shopDistance") return;
			// ราคาต่ำ > ราคาสูง (เมื่อกรอกถูกทั้งสองช่อง) → เตือนที่ช่องราคาต่ำ / แก้แล้วเตือนนี้หาย
			var low = document.getElementById("shopPriceLow"), high = document.getElementById("shopPriceHigh");
			var lo = checkShopNumber("priceLow", low.value), hi = checkShopNumber("priceHigh", high.value);
			if (lo.ok && hi.ok) numError(low, lo.value > hi.value ? t("shop.priceOrderError") : "");
		});
	});
	// ตรวจทุกช่องตัวเลขก่อนบันทึก — คืนค่าตัวเลขจริง หรือ null (พร้อมเตือนสีแดงที่ช่องแรกที่ผิด)
	function readShopNumbers() {
		Object.keys(NUM_FIELDS).forEach(function(id) { numError(document.getElementById(id), ""); });
		var raw = {
			priceLow: document.getElementById("shopPriceLow").value,
			priceHigh: document.getElementById("shopPriceHigh").value,
			distance: document.getElementById("shopDistance").value
		};
		var r = validateShopNumbers(raw);
		if (r.ok) return r.values;
		var badId = Object.keys(NUM_FIELDS).filter(function(id) { return NUM_FIELDS[id] === r.field; })[0];
		var bad = document.getElementById(badId);
		numError(bad, numMessage(r));
		bad.focus();
		return null;
	}

	function refreshViewLink(shop) {
		var viewLink = document.getElementById("shopViewLink");
		if (!shop) {
			viewLink.hidden = true;
			return;
		}
		viewLink.hidden = false;
		viewLink.href = "restaurant.html?id=" + shop.numId;
	}

	/* --- ลบร้านของฉัน — ลบทิ้งทั้งเครื่องนี้และ Supabase จริง (โพสต์ในนามร้านนี้จะถูกลบตามไปด้วยอัตโนมัติ
	   ผ่าน on delete cascade ฝั่ง Supabase) มีป๊อปอัพยืนยันก่อนเสมอเพราะเป็นการลบที่กู้คืนไม่ได้ --- */
	var deleteBtn = document.getElementById("shopDeleteBtn");
	function refreshDeleteBtn(shop) {
		if (!deleteBtn) return;
		deleteBtn.hidden = !shop;
	}
	if (deleteBtn) {
		deleteBtn.addEventListener("click", function() {
			// หน้าต่างยืนยันของแอป (แบบเดียวกับลบโพสต์/คอมเมนต์/รีวิว) — โชว์รูปร้านให้แน่ใจว่าลบร้านที่ถูก
			var shop = typeof getMyShop === "function" ? getMyShop() : null;
			showConfirmDialog({
				title: t("shop.deleteTitle"),
				message: (shop && shop.name ? "“" + shop.name + "” — " : "") + t("shop.confirmDelete"),
				confirmText: t("shop.deleteMyShop"),
				image: shop && shop.img ? shop.img : null,
				icon: "store-slash"
			}).then(function(yes) {
				if (!yes) return;
				deleteMyShop();
				showToast(t("shop.deletedToast"));
				setTimeout(function() { window.location.reload(); }, 400);
			});
		});
	}

	/* --- โพสต์ในนาม (= โปรไฟล์ที่ใช้งานอยู่) — แสดงโปรไฟล์ปัจจุบัน แตะเพื่อเปิดเมนูสลับโปรไฟล์ตัวเดียวกับหน้าโปรไฟล์ --- */
	function refreshPersonaUI(shop) {
		if (!personaCard) return;
		if (!shop) {
			personaCard.hidden = true;
			return;
		}
		personaCard.hidden = false;
		var me = getMe() || session;
		var active = getActivePersona();
		var activeShop = active === "self" ? null : getMyShopsForDisplay().filter(function(s) { return String(s.numId) === active; })[0];
		var name = activeShop ? activeShop.name : me.name;
		var img = activeShop ? activeShop.img : me.avatar;
		var av = document.getElementById("personaAvatar");
		av.style.backgroundImage = img && cssUrl(img) ? "url('" + cssUrl(img) + "')" : "";
		av.textContent = img && cssUrl(img) ? "" : (name || "?").charAt(0).toUpperCase();
		document.getElementById("personaPageLabel").textContent = t("profile.postingAsName").replace("{name}", name);
	}

	if (myShop) {
		var titleEl = document.getElementById("shopFormTitle");
		titleEl.setAttribute("data-i18n", "shop.editMyShop");
		titleEl.textContent = t("shop.editMyShop");
		document.getElementById("shopName").value = myShop.name;
		document.getElementById("shopDish").value = myShop.dish;
		// หมวดเก่าที่ไม่มีในรายการแล้ว (เช่น "ข้าว" จากระบบก่อน) — เพิ่มเป็นตัวเลือกไว้ ไม่ให้ select เด้งไปหมวดแรก
		// แล้วบันทึกทับหมวดจริงของร้านโดยไม่รู้ตัว
		var catSelect = document.getElementById("shopCat");
		if (myShop.cat && !Array.prototype.some.call(catSelect.options, function(o) { return o.value === myShop.cat; })) {
			var keepOpt = document.createElement("option");
			keepOpt.value = myShop.cat;
			keepOpt.textContent = myShop.cat;
			catSelect.appendChild(keepOpt);
		}
		catSelect.value = myShop.cat;
		document.getElementById("shopPriceLow").value = myShop.priceLow;
		document.getElementById("shopPriceHigh").value = myShop.priceHigh;
		document.getElementById("shopDistance").value = myShop.distance;
		document.getElementById("shopUni").value = myShop.uni;
		document.getElementById("shopDesc").value = myShop.desc || "";
		document.getElementById("shopHours").value = myShop.hours || "";
		document.getElementById("shopPromo").value = myShop.promo || "";
		document.getElementById("shopSubmitBtn").innerHTML = '<i class="fas fa-floppy-disk"></i><span>' + t("shop.saveChanges") + "</span>";
	}
	wireCategorySearch(document.getElementById("shopCat"));

	if (newShopMode) {
		var newTitleEl = document.getElementById("shopFormTitle");
		newTitleEl.setAttribute("data-i18n", "shop.createNewShop");
		newTitleEl.textContent = t("shop.createNewShop");
		document.getElementById("shopSubmitBtn").innerHTML = '<i class="fas fa-store"></i><span>' + escapeHtml(t("shop.createShopBtn")) + "</span>";
		setTimeout(function() { formCard.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150);
	}
	refreshViewLink(myShop);
	refreshPersonaUI(newShopMode ? getMyShop() : myShop);
	refreshDeleteBtn(myShop);

	document.getElementById("shopForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("shopErr");
		errBox.classList.remove("show");

		var name = document.getElementById("shopName").value.trim();
		var dish = document.getElementById("shopDish").value.trim();
		var cat = document.getElementById("shopCat").value;
		var img = document.getElementById("shopImage").value;

		var uni = document.getElementById("shopUni").value;
		var desc = document.getElementById("shopDesc").value.trim();
		var hours = document.getElementById("shopHours").value.trim();
		var promo = document.getElementById("shopPromo").value.trim();

		if (!name || !dish || !img) {
			errBox.textContent = t("shop.fillRequired");
			errBox.classList.add("show");
			return;
		}
		// ตรวจตัวเลขซ้ำก่อนบันทึกเสมอ (ไม่เชื่อว่าช่องกันไว้แล้ว) — ผิดช่องไหนเตือนแดงที่ช่องนั้น
		var nums = readShopNumbers();
		if (!nums) return;
		var priceLow = nums.priceLow, priceHigh = nums.priceHigh, distance = nums.distance;

		var submitBtn = document.getElementById("shopSubmitBtn");
		if (submitBtn.disabled) return; // กันกดซ้ำระหว่างส่งขึ้นเซิร์ฟเวอร์ (สร้างร้านซ้ำ)
		var shopData = {
			name: name,
			dish: dish,
			cat: cat,
			img: img,
			priceLow: priceLow,
			priceHigh: priceHigh,
			distance: distance,
			uni: uni,
			desc: desc,
			hours: hours,
			promo: promo,
			lat: shopLat,
			lng: shopLng
		};
		// ยังไม่มีร้าน (ฟอร์ม "โพสต์ร้านของฉัน" ครั้งแรก) หรือมาจาก "+ เพิ่มโปรไฟล์" = สร้างร้านใหม่
		if (newShopMode || !getMyShop()) {
			createShopProfile(shopData);
			return;
		}
		updateShopProfile(shopData);
	});

	/* --- ผลบันทึกร้าน → ข้อความที่ตรงกับสาเหตุจริง (+ เตือนแดงที่ช่องที่ต้องแก้ ถ้ารู้ว่าช่องไหน) --- */
	var SHOP_FIELD_INPUT = { name: "shopName", dish: "shopDish", cat: "shopCatSearch", img: "shopImageUploadBox", priceLow: "shopPriceLow", priceHigh: "shopPriceHigh", distance: "shopDistance" };
	function showShopSaveError(result) {
		var errBox = document.getElementById("shopErr");
		var key = "shop.saveFailed." + (result.error || "server");
		errBox.textContent = t(key) === key ? t("shop.saveFailed.server") : t(key);
		errBox.classList.add("show");
		var el = result.field && document.getElementById(SHOP_FIELD_INPUT[result.field]);
		if (el && /^shop(Price|Distance)/.test(el.id)) numError(el, t("shop.saveFailed.validation"));
		(el || errBox).scrollIntoView({ behavior: "smooth", block: "center" });
	}
	function setShopBusy(on, html) {
		var btn = document.getElementById("shopSubmitBtn");
		btn.disabled = on;
		btn.innerHTML = on ? '<i class="fas fa-spinner fa-spin"></i><span>' + escapeHtml(t("photos.saving")) + "</span>" : html;
	}
	function serverFirst() {
		return typeof sbSaveShop === "function" && ต้องบันทึกขึ้นเซิร์ฟเวอร์();
	}

	/* --- สร้างโปรไฟล์ร้านค้าใหม่ — บัญชีจริง: ต้องบันทึกลงฐานข้อมูลสำเร็จก่อน (ได้ id จริง เจ้าของ = uid ในเซสชัน)
	   สำเร็จ → สลับโปรไฟล์ที่ใช้งานเป็นร้านใหม่ → เปิดหน้าโปรไฟล์ร้านนั้นทันที (หน้าโปรไฟล์ตรวจสิทธิ์+โหลดข้อมูลจากฐานข้อมูลเอง)
	   ไม่สำเร็จ → ถอนร้านในเครื่องออก (ไม่มีร้านค้าง/ร้านซ้ำ) ฟอร์มยังเก็บข้อมูลไว้ แจ้งสาเหตุจริง
	   กดซ้ำ: ปุ่มถูกปิดระหว่างบันทึก + sbSaveShop ไม่ insert ซ้ำถ้าร้านเดียวกันเพิ่งบันทึกสำเร็จไปแล้ว --- */
	function createShopProfile(data) {
		var errBox = document.getElementById("shopErr");
		var submitBtn = document.getElementById("shopSubmitBtn");
		var html = submitBtn.innerHTML;
		var shop = createNewShop(data);
		if (!shop) {
			errBox.textContent = t("shop.storageFullError");
			errBox.classList.add("show");
			return;
		}
		if (!serverFirst()) { // บัญชีทดลองในเครื่อง: ร้านอยู่ในเครื่องนี้อย่างเดียวเหมือนเดิม
			setActivePersona(String(shop.numId));
			window.location.href = "profile.html?as=shop:" + encodeURIComponent(shop.numId) + "&created=1";
			return;
		}
		setShopBusy(true);
		sbSaveShop(shop).then(function(result) {
			if (result.error) {
				discardLocalShop(shop.numId);
				setShopBusy(false, html);
				showShopSaveError(result);
				return;
			}
			var numId = result.shop.numId;
			reconcileShopNumId(shop.numId, numId);
			if (typeof sbSaveMyShopLocation === "function" && data.lat !== null) sbSaveMyShopLocation(numId, data.lat, data.lng);
			setActivePersona(String(numId));
			window.location.href = "profile.html?as=shop:" + encodeURIComponent(numId) + "&created=1";
		});
	}
	/* --- แก้ไขร้านเดิม — บัญชีจริง: บันทึกลงฐานข้อมูลก่อน สำเร็จแล้วค่อยแก้ในเครื่อง + บอกว่าบันทึกแล้ว
	   (เดิมแก้ในเครื่องแล้วขึ้น "บันทึกแล้ว" ทันที แม้ฐานข้อมูลไม่รับ) --- */
	function updateShopProfile(data) {
		var current = getMyShop();
		var html = document.getElementById("shopSubmitBtn").innerHTML;
		function applyLocal(serverId) {
			var shop = createOrUpdateMyShop(data);
			if (!shop) {
				var errBox = document.getElementById("shopErr");
				errBox.textContent = t("shop.storageFullError");
				errBox.classList.add("show");
				return;
			}
			if (serverId && serverId !== shop.numId) reconcileShopNumId(shop.numId, serverId);
			document.getElementById("shopSubmitBtn").innerHTML = '<i class="fas fa-floppy-disk"></i><span>' + t("shop.saveChanges") + "</span>";
			refreshViewLink(getMyShop());
			refreshPersonaUI(getMyShop());
			refreshDeleteBtn(getMyShop());
			if (typeof showToast === "function") showToast(t("shop.postedToast").replace("{name}", data.name));
		}
		if (!serverFirst()) { applyLocal(null); return; }
		setShopBusy(true);
		var nums = validateShopNumbers(data);
		var candidate = Object.assign({}, current, data, nums.ok ? nums.values : {});
		delete candidate.pendingInsert;
		sbSaveShop(candidate).then(function(result) {
			setShopBusy(false, html);
			if (result.error) { showShopSaveError(result); return; }
			applyLocal(result.shop.numId);
			if (typeof sbSaveMyShopLocation === "function" && data.lat !== null) sbSaveMyShopLocation(result.shop.numId, data.lat, data.lng);
		});
	}

	if (personaCard) {
		document.getElementById("personaSwitchBtn").addEventListener("click", function() {
			openProfileSwitcher({ forceNavigate: true });
		});
	}
})();
