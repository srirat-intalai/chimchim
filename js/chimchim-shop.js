// chimchim-shop.js
// หน้า Settings: สร้าง/แก้ไข "ร้านของฉัน" เข้าสู่ Discovery Feed / AI Finder ได้จริง
// ต่างจากเพจร้าน (chimchim-page.js) ตรงที่ร้านนี้มีราคา/ระยะทาง/หมวด เข้าไปคำนวณ Match % ได้
// ไม่ใช่แค่โพสต์รูปเฉย ๆ — บันทึกผ่าน createOrUpdateMyShop() ใน chimchim-core.js

(function() {
	var guestCard = document.getElementById("shopGuestCard");
	var formCard = document.getElementById("shopFormCard");
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
			errBox.textContent = "กรอกชื่อร้าน เมนูเด่น รูป และราคาให้ครบก่อนนะ";
			errBox.classList.add("show");
			return;
		}
		if (priceLow > priceHigh) {
			errBox.textContent = "ราคาต่ำต้องน้อยกว่าหรือเท่ากับราคาสูง";
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
		if (typeof showToast === "function") showToast("โพสต์ร้าน “" + name + "” เข้าชุมชนเรียบร้อยแล้ว! 🎉");
	});
})();
