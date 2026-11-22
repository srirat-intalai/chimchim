// chimchim-qrscan.js
// ตัวสแกนคิวอาร์ร้านด้วยกล้อง (ใช้ในหน้าไดอารี่) — เปิดกล้องหลัง อ่านคิวอาร์สด ๆ แล้วคืนข้อความในคิวอาร์
// ตัวอ่าน: BarcodeDetector ของเบราว์เซอร์ (Chrome/Android) ถ้ามี · ไม่มี (เช่น iPhone Safari) → โหลด js/vendor/jsQR.js ตอนต้องใช้
// ทางสำรอง: กล้องเปิดไม่ได้/ไม่อนุญาต → "ใช้รูปคิวอาร์" (ถ่าย/เลือกรูปแล้วอ่านจากรูป)
// ใช้: chimchimOpenQrScanner({ onResult(text) → true = รับแล้ว ปิดตัวสแกน / ข้อความ error = สแกนต่อ })
// ไม่มีทาง "กรอกเอง" แล้ว — บันทึกไดอารี่ได้จากการสแกนคิวอาร์ร้านเท่านั้น (กล้องใช้ไม่ได้ = ใช้รูปคิวอาร์)
//
// รูปแบบคิวอาร์ร้าน (ตกลงกันไว้ — ตอนสร้างคิวอาร์ให้ร้านในขั้นถัดไปต้องใช้แบบนี้):
//   https://srirat-intalai.github.io/chimchim/restaurant.html?id=<id ร้าน>&qr=1
//   สแกนในแอป = เปิดฟอร์มไดอารี่ของร้านนั้น · สแกนด้วยกล้องมือถือปกติ = เปิดหน้าร้าน (มีปุ่มบันทึกลงไดอารี่)

var CHIMCHIM_QR_HOSTS = ["srirat-intalai.github.io"];

// อ่าน id ร้านจากข้อความในคิวอาร์ — รับเฉพาะลิงก์หน้าร้านของ ChimChim (โดเมนจริง หรือเว็บเดียวกับที่เปิดอยู่ตอนทดสอบ)
function chimchimParseShopQr(text) {
	var u;
	try { u = new URL(String(text || "").trim()); } catch (e) { return null; }
	if (u.protocol !== "https:" && !(u.protocol === "http:" && u.host === location.host)) return null;
	if (CHIMCHIM_QR_HOSTS.indexOf(u.hostname) === -1 && u.host !== location.host) return null;
	if (!/\/restaurant\.html$/.test(u.pathname)) return null;
	var id = u.searchParams.get("id");
	return id && /^\d{1,12}$/.test(id) ? Number(id) : null;
}

(function() {
	var dlg = null, video = null, stream = null, raf = 0, opts = null, detector = null, decodeBusy = false, lastBad = "", canvas = null;

	function reduced() {
		return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}
	function loadJsQr() {
		if (window.jsQR) return Promise.resolve(window.jsQR);
		if (loadJsQr.p) return loadJsQr.p;
		loadJsQr.p = new Promise(function(res, rej) {
			var s = document.createElement("script");
			s.src = "js/vendor/jsQR.js";
			s.onload = function() { window.jsQR ? res(window.jsQR) : rej(new Error("jsQR")); };
			s.onerror = function() { loadJsQr.p = null; rej(new Error("jsQR")); };
			document.head.appendChild(s);
		});
		return loadJsQr.p;
	}
	function makeDetector() {
		if (detector) return Promise.resolve(detector);
		if (typeof window.BarcodeDetector === "function" && typeof window.BarcodeDetector.getSupportedFormats === "function") {
			return BarcodeDetector.getSupportedFormats().then(function(f) {
				if (f.indexOf("qr_code") !== -1) {
					var bd = new BarcodeDetector({ formats: ["qr_code"] });
					detector = function(src) { return bd.detect(src).then(function(r) { return r && r[0] ? r[0].rawValue : null; }); };
					return detector;
				}
				return jsQrDetector();
			}).catch(jsQrDetector);
		}
		return jsQrDetector();
	}
	function jsQrDetector() {
		return loadJsQr().then(function(jsQR) {
			canvas = canvas || document.createElement("canvas");
			detector = function(src) {
				var w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
				if (!w || !h) return Promise.resolve(null);
				// ย่อให้ด้านยาวไม่เกิน 720px อ่านเร็วขึ้นและพอสำหรับคิวอาร์ที่ถือใกล้ ๆ
				var k = Math.min(1, 720 / Math.max(w, h));
				canvas.width = Math.round(w * k);
				canvas.height = Math.round(h * k);
				var c = canvas.getContext("2d", { willReadFrequently: true });
				c.drawImage(src, 0, 0, canvas.width, canvas.height);
				var img = c.getImageData(0, 0, canvas.width, canvas.height);
				var r = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
				return Promise.resolve(r ? r.data : null);
			};
			return detector;
		});
	}

	function build() {
		if (dlg) return dlg;
		dlg = document.createElement("dialog");
		dlg.className = "qrscan";
		dlg.setAttribute("aria-labelledby", "qrsTitle");
		dlg.innerHTML =
			'<div class="qrs-head">' +
				'<h2 id="qrsTitle"></h2>' +
				'<button type="button" class="qrs-close"><i class="fas fa-xmark" aria-hidden="true"></i></button>' +
			"</div>" +
			'<div class="qrs-view">' +
				'<video class="qrs-video" playsinline muted autoplay></video>' +
				'<div class="qrs-frame" aria-hidden="true"><i></i><i></i><i></i><i></i><b class="qrs-line"></b></div>' +
				'<div class="qrs-state" hidden><i class="fas fa-camera" aria-hidden="true"></i><p class="qrs-state-text"></p></div>' +
			"</div>" +
			'<p class="qrs-hint" aria-live="polite"></p>' +
			'<div class="qrs-actions">' +
				'<label class="jbtn jbtn-quiet qrs-photo"><i class="fas fa-image" aria-hidden="true"></i><span></span>' +
					'<input type="file" accept="image/*" capture="environment" class="jvisually-hidden"/></label>' +
			"</div>";
		document.body.appendChild(dlg);
		video = dlg.querySelector(".qrs-video");
		dlg.querySelector(".qrs-close").addEventListener("click", function() { dlg.close(); });
		dlg.addEventListener("close", stop);
		dlg.addEventListener("click", function(e) { if (e.target === dlg) dlg.close(); });
		dlg.querySelector(".qrs-photo input").addEventListener("change", function() {
			var file = this.files && this.files[0];
			this.value = "";
			if (file) readFromFile(file);
		});
		return dlg;
	}
	function paintText() {
		dlg.querySelector("#qrsTitle").textContent = t("qr.title");
		dlg.querySelector(".qrs-close").setAttribute("aria-label", t("common.close"));
		dlg.querySelector(".qrs-photo span").textContent = t("qr.fromPhoto");
	}
	function hint(text, bad) {
		var el = dlg.querySelector(".qrs-hint");
		el.textContent = text;
		el.classList.toggle("is-bad", !!bad);
	}
	function showState(text) {
		var st = dlg.querySelector(".qrs-state");
		st.hidden = !text;
		dlg.querySelector(".qrs-frame").hidden = !!text;
		st.querySelector(".qrs-state-text").textContent = text || "";
	}
	function stop() {
		cancelAnimationFrame(raf);
		raf = 0;
		if (stream) stream.getTracks().forEach(function(tr) { tr.stop(); });
		stream = null;
		if (video) video.srcObject = null;
		if (dlg) dlg.classList.remove("is-live");
	}
	// ส่งผลให้หน้าที่เรียก: true = จบ ปิดตัวสแกน · ข้อความ = คิวอาร์ใช้ไม่ได้ บอกแล้วสแกนต่อ
	function deliver(text) {
		var res = opts && typeof opts.onResult === "function" ? opts.onResult(text) : true;
		if (res === true) {
			if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}
			dlg.close();
			return true;
		}
		if (text !== lastBad) {
			lastBad = text;
			hint(typeof res === "string" ? res : t("qr.notShop"), true);
		}
		return false;
	}
	function loop() {
		if (!stream || !dlg.open) return;
		if (!decodeBusy && video.readyState >= 2) {
			decodeBusy = true;
			detector(video).then(function(text) {
				decodeBusy = false;
				if (text && deliver(text)) return;
				raf = requestAnimationFrame(loop);
			}, function() {
				decodeBusy = false;
				raf = requestAnimationFrame(loop);
			});
			return;
		}
		raf = requestAnimationFrame(loop);
	}
	function readFromFile(file) {
		hint(t("qr.reading"), false);
		var url = URL.createObjectURL(file);
		var img = new Image();
		img.onload = function() {
			makeDetector().then(function(det) { return det(img); }).then(function(text) {
				URL.revokeObjectURL(url);
				if (!text) { hint(t("qr.noCodeInPhoto"), true); return; }
				deliver(text);
			}, function() {
				URL.revokeObjectURL(url);
				hint(t("qr.readerFailed"), true);
			});
		};
		img.onerror = function() { URL.revokeObjectURL(url); hint(t("qr.noCodeInPhoto"), true); };
		img.src = url;
	}
	function startCamera() {
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			showState(t(window.isSecureContext === false ? "qr.needHttps" : "qr.noCamera"));
			hint(t("qr.useFallback"), false);
			return;
		}
		showState(t("qr.starting"));
		Promise.all([
			navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
			makeDetector()
		]).then(function(r) {
			if (!dlg.open) { r[0].getTracks().forEach(function(tr) { tr.stop(); }); return; }
			stream = r[0];
			video.srcObject = stream;
			var p = video.play();
			if (p && p.catch) p.catch(function() {});
			showState("");
			dlg.classList.add("is-live");
			hint(t("qr.aim"), false);
			raf = requestAnimationFrame(loop);
		}, function(err) {
			var name = err && err.name;
			if (stream) stop();
			showState(t(name === "NotAllowedError" || name === "SecurityError" ? "qr.denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "qr.noCamera" : err && err.message === "jsQR" ? "qr.readerFailed" : "qr.cameraFailed"));
			hint(t("qr.useFallback"), false);
		});
	}

	window.chimchimOpenQrScanner = function(o) {
		opts = o || {};
		build();
		paintText();
		lastBad = "";
		dlg.classList.toggle("is-still", reduced());
		hint("", false);
		if (!dlg.open) dlg.showModal();
		startCamera();
	};
})();
