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

	var myShop = getMyShop();

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
			if (!confirm(t("shop.confirmDelete"))) return;
			deleteMyShop();
			showToast(t("shop.deletedToast"));
			setTimeout(function() { window.location.reload(); }, 400);
		});
	}

	/* --- สลับ "โพสต์ในนามตัวเอง / ในนามร้าน" — ใช้ shop.numId เป็นตัวระบุแทน id เพจเดิม --- */
	function refreshPersonaUI(shop) {
		if (!personaCard) return;
		if (!shop) {
			personaCard.hidden = true;
			return;
		}
		personaCard.hidden = false;
		document.getElementById("personaPageLabel").textContent = shop.name;
		var active = getActivePersona();
		document.querySelectorAll("#personaToggle .settopt").forEach(function(btn) {
			var isPage = btn.getAttribute("data-persona") === "page";
			btn.classList.toggle("active", isPage ? active === String(shop.numId) : active === "self");
		});
	}

	if (myShop) {
		var titleEl = document.getElementById("shopFormTitle");
		titleEl.setAttribute("data-i18n", "shop.editMyShop");
		titleEl.textContent = t("shop.editMyShop");
		document.getElementById("shopName").value = myShop.name;
		document.getElementById("shopDish").value = myShop.dish;
		document.getElementById("shopCat").value = myShop.cat;
		document.getElementById("shopPriceLow").value = myShop.priceLow;
		document.getElementById("shopPriceHigh").value = myShop.priceHigh;
		document.getElementById("shopDistance").value = myShop.distance;
		document.getElementById("shopUni").value = myShop.uni;
		document.getElementById("shopDesc").value = myShop.desc || "";
		document.getElementById("shopHours").value = myShop.hours || "";
		document.getElementById("shopPromo").value = myShop.promo || "";
		document.getElementById("shopSubmitBtn").innerHTML = '<i class="fas fa-floppy-disk"></i><span>' + t("shop.saveChanges") + "</span>";
	}
	refreshViewLink(myShop);
	refreshPersonaUI(myShop);
	refreshDeleteBtn(myShop);

	document.getElementById("shopForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var errBox = document.getElementById("shopErr");
		errBox.classList.remove("show");

		var name = document.getElementById("shopName").value.trim();
		var dish = document.getElementById("shopDish").value.trim();
		var cat = document.getElementById("shopCat").value;
		var img = document.getElementById("shopImage").value;
		var priceLow = parseInt(document.getElementById("shopPriceLow").value, 10);
		var priceHigh = parseInt(document.getElementById("shopPriceHigh").value, 10);
		var distance = parseInt(document.getElementById("shopDistance").value, 10);
		var uni = document.getElementById("shopUni").value;
		var desc = document.getElementById("shopDesc").value.trim();
		var hours = document.getElementById("shopHours").value.trim();
		var promo = document.getElementById("shopPromo").value.trim();

		if (!name || !dish || !img || !priceLow || !priceHigh || !distance) {
			errBox.textContent = t("shop.fillRequired");
			errBox.classList.add("show");
			return;
		}
		if (priceLow > priceHigh) {
			errBox.textContent = t("shop.priceOrderError");
			errBox.classList.add("show");
			return;
		}

		var shop = createOrUpdateMyShop({
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
			promo: promo
		});
		document.getElementById("shopSubmitBtn").innerHTML = '<i class="fas fa-floppy-disk"></i><span>' + t("shop.saveChanges") + "</span>";
		refreshViewLink(shop);
		refreshPersonaUI(shop);
		refreshDeleteBtn(shop);
		if (typeof showToast === "function") showToast(t("shop.postedToast").replace("{name}", name));
	});

	if (personaCard) {
		document.querySelectorAll("#personaToggle .settopt").forEach(function(btn) {
			btn.addEventListener("click", function() {
				var shop = getMyShop();
				if (!shop) return;
				var choice = this.getAttribute("data-persona") === "page" ? String(shop.numId) : "self";
				setActivePersona(choice);
				refreshPersonaUI(shop);
			});
		});
	}
})();
