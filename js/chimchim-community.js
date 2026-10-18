// chimchim-community.js
// UI: ป็อปอัพเข้าสู่ระบบ/สมัครสมาชิก, ปุ่มบัญชีบน apptop, โพสต์ร้านเข้าชุมชน, toast แจ้งเตือน
// ต้องโหลดหลัง js/chimchim-core.js (ใช้ getSession/getUsers/getShops ฯลฯ จากที่นั่น)
// โหลดในทุกหน้า เพราะแถบบนสุด (apptop) กับป็อปอัพเข้าสู่ระบบใช้ร่วมกันทุกหน้า

/* =====================================================================
   หน้าต่างยืนยันของแอป (แทน confirm() ของเบราว์เซอร์ที่หน้าตาไม่เข้ากับแอป และบนมือถือโชว์ชื่อเว็บแปลก ๆ)
   showConfirmDialog({ title, message, confirmText, cancelText, image, icon }) → Promise<boolean>
   ปุ่มที่โฟกัสไว้ก่อนคือ "ยกเลิก" (กด Enter เผลอ ๆ จะไม่ลบ) / Esc หรือแตะพื้นหลัง = ยกเลิก
   ===================================================================== */
function showConfirmDialog(opts) {
	opts = opts || {};
	return new Promise(function(resolve) {
		var overlay = document.createElement("div");
		overlay.className = "ccdialog";
		overlay.setAttribute("role", "alertdialog");
		overlay.setAttribute("aria-modal", "true");
		var visual = opts.image
			? '<div class="ccdialog-thumb"><img src="' + safeImgSrc(opts.image) + '" alt=""/><span><i class="fas fa-trash-can"></i></span></div>'
			: '<div class="ccdialog-icon"><i class="fas fa-' + (opts.icon || "trash-can") + '"></i></div>';
		overlay.innerHTML =
			'<div class="ccdialog-box">' +
				visual +
				'<h3 class="ccdialog-title"></h3>' +
				'<p class="ccdialog-msg"></p>' +
				'<div class="ccdialog-btns">' +
					'<button type="button" class="ccdialog-ok"></button>' +
					'<button type="button" class="ccdialog-cancel"></button>' +
				"</div>" +
			"</div>";
		// ข้อความใส่ด้วย textContent เสมอ (อาจมีชื่อ/แคปชั่นจากผู้ใช้ปนมา)
		overlay.querySelector(".ccdialog-title").textContent = opts.title || "";
		overlay.querySelector(".ccdialog-msg").textContent = opts.message || "";
		overlay.querySelector(".ccdialog-msg").hidden = !opts.message;
		var okBtn = overlay.querySelector(".ccdialog-ok");
		var cancelBtn = overlay.querySelector(".ccdialog-cancel");
		okBtn.textContent = opts.confirmText || t("common.delete");
		cancelBtn.textContent = opts.cancelText || t("community.commentCancel");

		var prevFocus = document.activeElement;
		function close(result) {
			document.removeEventListener("keydown", onKey, true);
			overlay.classList.remove("open");
			setTimeout(function() { overlay.remove(); }, 180);
			if (prevFocus && prevFocus.focus) prevFocus.focus();
			resolve(result);
		}
		function onKey(e) {
			if (e.key === "Escape") {
				// กันไม่ให้ Esc ไปปิดหน้าดูโพสต์ที่เปิดอยู่ข้างหลังด้วย
				e.stopPropagation();
				close(false);
			}
		}
		okBtn.addEventListener("click", function() { close(true); });
		cancelBtn.addEventListener("click", function() { close(false); });
		overlay.addEventListener("click", function(e) {
			if (e.target === overlay) close(false);
		});
		document.addEventListener("keydown", onKey, true);
		document.body.appendChild(overlay);
		requestAnimationFrame(function() { overlay.classList.add("open"); });
		cancelBtn.focus();
	});
}

/* =====================================================================
   TOAST แจ้งเตือนแบบลอยด้านล่าง (แทนมาสคอตลอยมุมจอเดิม)
   ===================================================================== */
function showToast(msg) {
	var toast = document.getElementById("appToast");
	if (!toast) return;
	toast.textContent = msg;
	toast.classList.add("show");
	clearTimeout(toast.__hideTimer);
	toast.__hideTimer = setTimeout(function() {
		toast.classList.remove("show");
	}, 2800);
}

/* =====================================================================
   แถบบนสุด (apptop) — ปุ่มเข้าสู่ระบบ / ไอคอนโปรไฟล์
   ===================================================================== */
function refreshAuthUI() {
	var session = getSession();
	var loginBtn = document.getElementById("loginBtn");
	var avatarLink = document.getElementById("userAvatarLink");
	var avatarIco = document.getElementById("userAvatarIco");
	if (session) {
		if (loginBtn) loginBtn.hidden = true;
		if (avatarLink) {
			avatarLink.hidden = false;
			var me = typeof getMe === "function" ? getMe() : null;
			if (avatarIco) {
				if (me && me.avatar) {
					avatarIco.textContent = "";
					avatarLink.style.background = "var(--cream2) center/cover no-repeat url('" + cssUrl(me.avatar) + "')";
				} else {
					avatarIco.textContent = session.name.charAt(0).toUpperCase();
					avatarLink.style.background = "";
				}
			}
		}
	} else {
		if (loginBtn) loginBtn.hidden = false;
		if (avatarLink) avatarLink.hidden = true;
	}
}

/* --- เปิด/ปิด popup เข้าสู่ระบบ (เฉพาะหน้าที่มี #authPop อยู่จริง) --- */
var authPop = document.getElementById("authPop");
function openAuthPop(tab) {
	if (!authPop) return;
	switchAuthTab(tab || "login");
	document.getElementById("loginErr").classList.remove("show");
	document.getElementById("registerErr").classList.remove("show");
	authPop.classList.add("open");
	document.body.style.overflow = "hidden";
}
function closeAuthPop() {
	if (!authPop) return;
	authPop.classList.remove("open");
	document.body.style.overflow = "";
}
function switchAuthTab(tab) {
	var isLogin = tab === "login";
	document.getElementById("apTabLogin").classList.toggle("active", isLogin);
	document.getElementById("apTabRegister").classList.toggle("active", !isLogin);
	document.getElementById("loginForm").style.display = isLogin ? "block" : "none";
	document.getElementById("registerForm").style.display = isLogin ? "none" : "block";
}
var loginBtnEl = document.getElementById("loginBtn");
if (loginBtnEl) {
	loginBtnEl.addEventListener("click", function() {
		openAuthPop("login");
	});
}

if (authPop) {
	document.getElementById("apClose").addEventListener("click", closeAuthPop);
	authPop.addEventListener("click", function(e) {
		if (e.target === authPop) closeAuthPop();
	});
	document.getElementById("apTabLogin").addEventListener("click", function() {
		switchAuthTab("login");
	});
	document.getElementById("apTabRegister").addEventListener("click", function() {
		switchAuthTab("register");
	});
	document.querySelectorAll("[data-switch]").forEach(function(a) {
		a.addEventListener("click", function(e) {
			e.preventDefault();
			switchAuthTab(this.getAttribute("data-switch"));
		});
	});

	/* --- สมัครสมาชิก — ผ่าน Supabase Auth จริง (ดู js/chimchim-supabase-client.js) ---
	   รหัสผ่านตรวจสอบ/เก็บฝั่งเซิร์ฟเวอร์ทั้งหมด ไม่แตะ localStorage เรื่องรหัสผ่านอีกต่อไป --- */
	document.getElementById("registerForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var form = this;
		var errBox = document.getElementById("registerErr");
		errBox.classList.remove("show");

		var name = document.getElementById("registerName").value.trim();
		var email = document.getElementById("registerEmail").value.trim().toLowerCase();
		var password = document.getElementById("registerPassword").value;

		if (!name || !email || password.length < 4) {
			errBox.textContent = t("auth.fillAllFields");
			errBox.classList.add("show");
			return;
		}

		sbSignUp(name, email, password).then(function(res) {
			if (!res.ok) {
				if (res.errorCode === "user_already_exists" || res.errorCode === 422) {
					errBox.textContent = t("auth.emailAlreadyRegistered");
				} else if (res.errorCode === "over_email_send_rate_limit" || res.errorCode === 429) {
					// เจอเคสนี้ตอนสมัครซ้ำด้วยอีเมลที่เคยสมัครไว้แล้วแต่ยังไม่ยืนยัน — Supabase พยายามส่งอีเมลยืนยันซ้ำแล้วโดนลิมิต
					errBox.textContent = t("auth.emailRateLimited");
				} else {
					errBox.textContent = res.error || t("auth.genericError");
				}
				errBox.classList.add("show");
				return;
			}
			if (res.needsEmailConfirm) {
				errBox.classList.remove("show");
				closeAuthPop();
				form.reset();
				showToast(t("auth.checkEmailToConfirm").replace("{email}", email));
				return;
			}
			closeAuthPop();
			refreshAuthUI();
			form.reset();
			// ทุกบัญชีเป็นแบบเดียวกันหมด -> พาไปทำแบบสอบถาม Food DNA ต่อเสมอ
			window.location.href = "profile-setup.html";
		});
	});

	/* --- เข้าสู่ระบบ — ผ่าน Supabase Auth จริงเช่นกัน --- */
	document.getElementById("loginForm").addEventListener("submit", function(e) {
		e.preventDefault();
		var form = this;
		var errBox = document.getElementById("loginErr");
		errBox.classList.remove("show");

		var email = document.getElementById("loginEmail").value.trim().toLowerCase();
		var password = document.getElementById("loginPassword").value;

		sbSignIn(email, password).then(function(res) {
			if (!res.ok) {
				errBox.textContent = (res.errorCode === "email_not_confirmed")
					? t("auth.emailNotConfirmed")
					: t("auth.invalidCredentials");
				errBox.classList.add("show");
				return;
			}
			var me = getMe();
			closeAuthPop();
			refreshAuthUI();
			form.reset();
			showToast(t("auth.welcomeBack").replace("{name}", me ? me.name : email));
			// รีเฟรชหน้าปัจจุบันเพื่อให้ Food DNA ส่วนตัว + สถานะล็อกอินอัปเดตทุกจุด
			setTimeout(function() {
				window.location.reload();
			}, 600);
		});
	});
}

document.addEventListener("keydown", function(e) {
	if (e.key === "Escape") {
		closeAuthPop();
	}
});

/* =====================================================================
   Post Viewer Modal — กดดูโพสต์แบบเต็มจอเหมือนอินสตาแกรม
   ใช้ร่วมกันได้ทุกหน้า (โปรไฟล์ตัวเอง + โปรไฟล์คนอื่น) โดยสร้าง DOM ของโมดัลขึ้นเองที่นี่
   เรียกใช้ผ่าน window.openPostView({ img, caption, posterName, posterColor })
   ===================================================================== */
(function setupPostViewerModal() {
	var modal = document.createElement("div");
	modal.id = "postViewModal";
	modal.innerHTML =
		'<div class="pvbox">' +
			'<button class="pvclose" id="pvClose"><i class="fas fa-times"></i></button>' +
			'<div class="pvimgs">' +
				'<div class="pvimgstrip" id="pvImgStrip"></div>' +
				'<div class="pvdots" id="pvDots" hidden></div>' +
			"</div>" +
			'<div class="pvinfo">' +
				'<div class="pvhead">' +
					'<div class="pvavatar" id="pvAvatar"></div>' +
					'<div class="pvname" id="pvName"></div>' +
				"</div>" +
				'<div class="pvcap" id="pvCap"></div>' +
				'<div class="pvactions">' +
					'<button class="pvlikebtn" id="pvLikeBtn" type="button"><i class="far fa-heart"></i><span id="pvLikeCount"></span></button>' +
					'<button class="pvsavebtn" id="pvSaveBtn" type="button" aria-label="' + t("community.savePost") + '" title="' + t("community.savePost") + '"><i class="far fa-bookmark"></i></button>' +
					'<button class="pvreportbtn" id="pvReportBtn" type="button" hidden><i class="fas fa-flag"></i><span>' + t("report.button") + '</span></button>' +
				"</div>" +
				'<div class="pvcomments" id="pvComments"></div>' +
				'<form class="pvcommentform" id="pvCommentForm">' +
					'<input type="text" id="pvCommentInput" placeholder="' + t("community.commentPlaceholder") + '" autocomplete="off"/>' +
					'<button type="submit"><i class="fas fa-paper-plane"></i></button>' +
				"</form>" +
			"</div>" +
		"</div>";
	document.body.appendChild(modal);

	var currentPostId = null;

	function refreshPvLike() {
		if (!currentPostId) return;
		var liked = isPostLiked(currentPostId);
		var btn = document.getElementById("pvLikeBtn");
		var ico = btn.querySelector("i");
		ico.classList.toggle("far", !liked);
		ico.classList.toggle("fas", liked);
		btn.classList.toggle("liked", liked);
		document.getElementById("pvLikeCount").textContent = formatLikeCount(getPostLikeCount(currentPostId));
	}
	function queuePvCounts() {
		if (!currentPostId) return;
		if (typeof queuePostLikeCountFetch === "function") queuePostLikeCountFetch(currentPostId, document.getElementById("pvLikeCount"));
	}
	document.getElementById("pvLikeBtn").addEventListener("click", function() {
		if (!currentPostId) return;
		togglePostLike(currentPostId);
		refreshPvLike();
	});
	// บุ๊กมาร์ก — บันทึกโพสต์ไว้ดูทีหลังในแท็บ "บันทึกไว้" ของหน้าโปรไฟล์
	function refreshPvSave() {
		var btn = document.getElementById("pvSaveBtn");
		btn.hidden = !currentPostId;
		if (!currentPostId) return;
		var saved = isPostSaved(currentPostId);
		btn.querySelector("i").className = (saved ? "fas" : "far") + " fa-bookmark";
		btn.classList.toggle("saved", saved);
		btn.setAttribute("aria-pressed", saved ? "true" : "false");
		var lbl = t(saved ? "community.unsavePost" : "community.savePost");
		btn.setAttribute("aria-label", lbl);
		btn.title = lbl;
	}
	document.getElementById("pvSaveBtn").addEventListener("click", function() {
		if (!currentPostId) return;
		var now = toggleSavePost(currentPostId);
		if (now === null) return;
		refreshPvSave();
		if (typeof showToast === "function") showToast(t(now ? "community.postSavedToast" : "community.postUnsavedToast"));
		if (typeof renderProfileActivity === "function") renderProfileActivity();
	});

	// รายงานได้เฉพาะโพสต์จริงที่ผู้ใช้สร้างเอง (id ขึ้นต้นด้วย "post") ไม่ใช่โพสต์ตัวอย่างของร้าน BU/นักรีวิวเด่น
	document.getElementById("pvReportBtn").addEventListener("click", function() {
		if (!currentPostId) return;
		var postId = currentPostId;
		openReportPopup("post", postId, function() {
			if (postId === currentPostId) closePostView();
			if (typeof renderCommunityFeed === "function" && feedState.container) {
				renderCommunityFeed(feedState.container, typeof currentTrendCat !== "undefined" ? currentTrendCat : "all");
			}
		});
	});

	function renderPvComments() {
		var list = document.getElementById("pvComments");
		if (!currentPostId) {
			list.innerHTML = "";
			return;
		}
		var comments = getComments(currentPostId);
		if (comments.length === 0) {
			list.innerHTML = '<p class="pvcommentsempty">' + t("community.noCommentsYet") + '</p>';
			return;
		}
		var me = getSession();
		list.innerHTML = "";
		comments.forEach(function(c) {
			list.appendChild(buildCommentRow(c, !!(me && c.userId && c.userId === me.id)));
		});
		list.scrollTop = list.scrollHeight;
	}

	/* --- แถวคอมเมนต์ — ของตัวเองมีปุ่ม ⋯ (หรือกดค้างที่คอมเมนต์) เปิดเมนู แก้ไข / ลบ --- */
	function buildCommentRow(c, mine) {
		var row = document.createElement("div");
		row.className = "pvcommentrow" + (mine ? " mine" : "");
		row.innerHTML =
			'<div class="pvcommentmain">' +
				'<div class="pvcommenttxt"><b>' + escapeHtml(c.author) + "</b> " + escapeHtml(c.text) + "</div>" +
				'<button type="button" class="pvcommentmore" aria-label="' + t("community.commentOptions") + '"><i class="fas fa-ellipsis"></i></button>' +
			"</div>";
		if (!mine) {
			// ความคิดเห็นของคนอื่น: ⋯ มีแค่ "รายงานความคิดเห็น"
			row.querySelector(".pvcommentmore").addEventListener("click", function(e) {
				e.stopPropagation();
				var open = row.querySelector(".pvcommentmenu");
				document.querySelectorAll("#pvComments .pvcommentmenu").forEach(function(m) { m.remove(); });
				if (open) return;
				var menu = document.createElement("div");
				menu.className = "pvcommentmenu";
				menu.innerHTML =
					'<button type="button" data-act="report" class="danger"><i class="fas fa-flag"></i>' + t("report.reportComment") + "</button>" +
					'<button type="button" data-act="cancel">' + t("community.commentCancel") + "</button>";
				menu.addEventListener("click", function(ev) {
					var btn = ev.target.closest("button");
					if (!btn) return;
					menu.remove();
					if (btn.getAttribute("data-act") === "report") {
						var postIdAtReport = currentPostId;
						openReportPopup("comment", c.id, function(saved) {
							if (!c.remoteId) return; // คอมเมนต์ที่ยังไม่ขึ้นเซิร์ฟเวอร์ ตรวจด้วย AI ไม่ได้ เก็บรายงานไว้เฉย ๆ
							Promise.resolve(saved).then(function(ok) {
								if (!ok) return null;
								return sbRequestCommentModeration(c.remoteId);
							}).then(function(result) {
								if (!result || !result.checked) {
									showToast(t("report.thanks"));
									return;
								}
								if (result.hidden) {
									// AI ยืนยันว่าผิดจริง → เอาออกจากหน้าจอทันที (เซิร์ฟเวอร์ซ่อนให้ทุกเครื่องแล้ว)
									saveCommentsOfPost(postIdAtReport, getComments(postIdAtReport).filter(function(x) { return x.id !== c.id; }));
									if (postIdAtReport === currentPostId) renderPvComments();
									showToast(t("report.aiHidden"));
								} else {
									showToast(t("report.aiNotViolating"));
								}
							});
						}, { remoteId: c.remoteId });
					}
				});
				row.appendChild(menu);
			});
			return row;
		}

		function openMenu() {
			// ปิดเมนูของแถวอื่นที่เปิดค้างอยู่ก่อน ให้เปิดได้ทีละอัน
			document.querySelectorAll("#pvComments .pvcommentmenu").forEach(function(m) { m.remove(); });
			var menu = document.createElement("div");
			menu.className = "pvcommentmenu";
			// คอมเมนต์ที่เพิ่งส่งยังไม่ได้ id จริงจาก Supabase แก้ไม่ได้ (ไม่มีแถวให้อัปเดต) แต่ลบได้
			menu.innerHTML =
				(c.remoteId ? '<button type="button" data-act="edit"><i class="fas fa-pen"></i>' + t("community.commentEdit") + "</button>" : "") +
				'<button type="button" data-act="delete" class="danger"><i class="fas fa-trash-can"></i>' + t("community.commentDelete") + "</button>" +
				'<button type="button" data-act="cancel">' + t("community.commentCancel") + "</button>";
			menu.addEventListener("click", function(e) {
				var btn = e.target.closest("button");
				if (!btn) return;
				var act = btn.getAttribute("data-act");
				menu.remove();
				if (act === "edit") startEdit();
				if (act === "delete") doDelete();
			});
			row.appendChild(menu);
		}

		function doDelete() {
			showConfirmDialog({
				title: t("community.commentDeleteTitle"),
				message: t("community.commentConfirmDelete"),
				confirmText: t("community.commentDeleteBtn")
			}).then(function(yes) {
				if (yes) reallyDelete();
			});
		}
		function reallyDelete() {
			var postId = currentPostId;
			deleteComment(postId, c.id).then(function(ok) {
				if (ok) {
					showToast(t("community.commentDeleted"));
					return;
				}
				showToast(t("community.commentDeleteFailed"));
				// Supabase ไม่ยอมลบ — ดึงชุดจริงกลับมาแสดงใหม่ คอมเมนต์จะกลับมาให้เห็นตามความจริง
				if (typeof syncCommentsWithSupabase === "function") {
					syncCommentsWithSupabase(postId, function() { if (postId === currentPostId) renderPvComments(); });
				}
			});
			renderPvComments();
		}

		function startEdit() {
			var main = row.querySelector(".pvcommentmain");
			main.hidden = true;
			var form = document.createElement("form");
			form.className = "pvcommentedit";
			form.innerHTML =
				'<input type="text" maxlength="500" autocomplete="off"/>' +
				'<div class="pvcommenteditbtns">' +
					'<button type="button" data-act="cancel">' + t("community.commentCancel") + "</button>" +
					'<button type="submit" class="primary">' + t("community.commentSave") + "</button>" +
				"</div>";
			var input = form.querySelector("input");
			input.value = c.text;
			form.querySelector('[data-act="cancel"]').addEventListener("click", function() {
				form.remove();
				main.hidden = false;
			});
			input.addEventListener("keydown", function(e) {
				if (e.key === "Escape") { e.stopPropagation(); form.remove(); main.hidden = false; }
			});
			form.addEventListener("submit", function(e) {
				e.preventDefault();
				var text = input.value.trim();
				if (!text || text === c.text) { form.remove(); main.hidden = false; return; }
				var postId = currentPostId;
				form.querySelector('[type="submit"]').disabled = true;
				updateComment(postId, c.id, text).then(function(ok) {
					showToast(t(ok ? "community.commentUpdated" : "community.commentEditFailed"));
					if (postId === currentPostId) renderPvComments();
				});
				// แสดงข้อความใหม่ไปก่อนเลย ถ้าบันทึกไม่สำเร็จ updateComment จะคืนข้อความเดิมแล้ววาดใหม่ให้เอง
				renderPvComments();
			});
			row.appendChild(form);
			input.focus();
		}

		row.querySelector(".pvcommentmore").addEventListener("click", function(e) {
			e.stopPropagation();
			if (row.querySelector(".pvcommentmenu")) {
				row.querySelector(".pvcommentmenu").remove();
			} else {
				openMenu();
			}
		});
		// กดค้าง ~0.5 วิ บนมือถือ (หรือคลิกขวาบนคอม) ก็เปิดเมนูเดียวกัน
		var pressTimer = null;
		var mainEl = row.querySelector(".pvcommentmain");
		mainEl.addEventListener("touchstart", function() {
			pressTimer = setTimeout(function() {
				pressTimer = null;
				if (navigator.vibrate) navigator.vibrate(15);
				openMenu();
			}, 500);
		}, { passive: true });
		["touchend", "touchmove", "touchcancel"].forEach(function(ev) {
			mainEl.addEventListener(ev, function() {
				if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
			}, { passive: true });
		});
		mainEl.addEventListener("contextmenu", function(e) {
			e.preventDefault();
			openMenu();
		});
		return row;
	}

	function closePostView() {
		document.querySelectorAll(".feeditem").forEach(function(fi) {
			if (typeof fi.__refreshComments === "function") fi.__refreshComments();
		});
		modal.classList.remove("open");
		document.body.style.overflow = "";
	}
	modal.addEventListener("click", function(e) {
		if (e.target === modal) closePostView();
	});
	document.getElementById("pvClose").addEventListener("click", closePostView);
	document.addEventListener("keydown", function(e) {
		if (e.key === "Escape") closePostView();
	});
	document.getElementById("pvCommentForm").addEventListener("submit", function(e) {
		e.preventDefault();
		if (!currentPostId) return;
		// ต้องล็อกอินก่อนคอมเมนต์ (เดิมปล่อยคอมเมนต์แบบไม่ล็อกอินได้ แต่ sbAddComment ต้องมี user ถึงจะ sync ขึ้น Supabase
		// ได้จริง — คอมเมนต์ที่ยังไม่ sync เลยหายไปทันทีที่เปิดโพสต์นี้ใหม่แล้วดึงชุดจริงจาก Supabase มาทับของเดิม)
		if (typeof ต้องล็อกอินก่อนไหม === "function" && ต้องล็อกอินก่อนไหม()) return;
		var input = document.getElementById("pvCommentInput");
		var text = input.value.trim();
		if (!text) return;
		var me = getSession();
		var postId = currentPostId;
		addComment(postId, me.name, text).then(function() {
			// ได้ id จริงจาก Supabase แล้ว วาดใหม่ให้เมนู "แก้ไข" ของคอมเมนต์นี้โผล่ได้
			if (postId === currentPostId) renderPvComments();
		});
		input.value = "";
		renderPvComments();
	});

	window.openPostView = function(post) {
		var images = post.images && post.images.length ? post.images : [post.img];
		var strip = document.getElementById("pvImgStrip");
		var dots = document.getElementById("pvDots");
		strip.innerHTML = images.map(function(src) {
			return '<img src="' + safeImgSrc(src) + '" alt=""/>';
		}).join("");
		if (images.length > 1) {
			dots.hidden = false;
			dots.innerHTML = images.map(function(_, i) {
				return '<span class="' + (i === 0 ? "active" : "") + '"></span>';
			}).join("");
			var dotEls = dots.querySelectorAll("span");
			strip.onscroll = function() {
				var idx = Math.round(strip.scrollLeft / strip.clientWidth);
				dotEls.forEach(function(d, i) { d.classList.toggle("active", i === idx); });
			};
		} else {
			dots.hidden = true;
			strip.onscroll = null;
		}
		strip.scrollLeft = 0;
		document.getElementById("pvCap").textContent = post.caption || "";
		var avatarEl = document.getElementById("pvAvatar");
		if (post.posterAvatarUrl) {
			avatarEl.style.background = "var(--cream2) center/cover no-repeat url('" + cssUrl(post.posterAvatarUrl) + "')";
			avatarEl.textContent = "";
		} else {
			avatarEl.style.background = post.posterColor || "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))";
			avatarEl.textContent = (post.posterName || "?").trim().charAt(0).toUpperCase();
		}
		document.getElementById("pvName").textContent = post.posterName || "";
		currentPostId = post.id || null;
		// รายงานได้เฉพาะโพสต์จริงของผู้ใช้ (id เป็น "post"+timestamp ก่อน sync หรือตัวเลขจริงหลัง sync แล้ว)
		// ไม่ใช่โพสต์ตัวอย่างของร้าน BU ตั้งต้นระบบ (id ขึ้นต้นด้วย "bu-")
		// และไม่ให้รายงานโพสต์ของตัวเอง (posterId = เจ้าของโพสต์ ส่งมาจากจุดที่เปิดโพสต์)
		var pvMe = getSession();
		var isOwnPost = !!(pvMe && post.posterId && post.posterId === pvMe.id);
		document.getElementById("pvReportBtn").hidden = !(currentPostId && !/^bu-/.test(currentPostId)) || isOwnPost;
		renderPvComments();
		refreshPvLike();
		refreshPvSave();
		queuePvCounts();
		if (typeof syncCommentsWithSupabase === "function") {
			syncCommentsWithSupabase(currentPostId, function() {
				if (currentPostId === post.id) renderPvComments();
			});
		}
		modal.classList.add("open");
		document.body.style.overflow = "hidden";
	};
})();

/* =====================================================================
   ฟีดชุมชนหน้าแรก (Instagram/Facebook/Lemon8 style) — ใช้ getFeedItems() จาก core.js
   โพสต์เดียวโชว์ได้หลายรูปแบบปัดซ้าย-ขวา กดรูปเปิดโมดัลดูเต็มจอ + คอมเมนต์ได้เหมือนอินสตาแกรม
   ===================================================================== */
function formatFeedTime(dateStr) {
	var diffMs = Date.now() - new Date(dateStr).getTime();
	var mins = Math.floor(diffMs / 60000);
	if (mins < 1) return t("feed.justNow");
	if (mins < 60) return mins + t("feed.minsAgo");
	var hrs = Math.floor(mins / 60);
	if (hrs < 24) return hrs + t("feed.hoursAgo");
	var days = Math.floor(hrs / 24);
	return days + t("feed.daysAgo");
}
// เวลาโพสต์เดิมคำนวณใหม่ตอน re-render เท่านั้น ถ้าเปิดหน้าค้างไว้เฉย ๆ (ไม่กดอะไรเลย) เวลาจะไม่ขยับเอง
// ไทม์เมอร์นี้อัปเดตแค่ข้อความเวลาทุก 30 วิ โดยไม่ต้องสร้างการ์ดใหม่ทั้งฟีด (เบากว่า re-render เต็ม ๆ)
setInterval(function() {
	document.querySelectorAll("[data-feed-time]").forEach(function(el) {
		el.textContent = formatFeedTime(el.getAttribute("data-feed-time"));
	});
}, 30000);

/* --- ฟีดชุมชน: โชว์ 6 โพสต์แรก พอเลื่อนถึงล่างสุดค่อยเพิ่มทีละ 5 (ต่อท้ายในหน้าเดิม ไม่รีเฟรชหน้า) --- */
var FEED_INITIAL_SIZE = 5;
var FEED_PAGE_STEP = 5;
var feedState = { items: [], shown: 0, container: null };

function renderCommunityFeed(container, catFilter) {
	if (window.__chimchimFeedSentinelObserver) {
		window.__chimchimFeedSentinelObserver.disconnect();
		window.__chimchimFeedSentinelObserver = null;
	}
	var emptyMsg = document.getElementById("communityFeedEmpty");
	var items = getFeedItems();
	// เลือกพื้นที่ไว้ → โพสต์ของร้านโชว์เฉพาะร้านแถวนั้น (โพสต์ของนักชิมทั่วไปไม่มีพื้นที่ โชว์ตามเดิม)
	var areaInfo = typeof กรองร้านตามพื้นที่ === "function" ? กรองร้านตามพื้นที่(typeof รายการร้าน !== "undefined" ? รายการร้าน : []) : null;
	if (areaInfo && areaInfo.area) {
		var okUnis = {};
		areaInfo.list.forEach(function(r) { okUnis[r.มหาลัย] = true; });
		items = items.filter(function(item) { return !item.uni || (!areaInfo.fallback && okUnis[item.uni]); });
	}
	if (catFilter && catFilter !== "all") {
		items = items.filter(function(item) { return typeof ร้านอยู่ในหมวดที่เลือก === "function" && ร้านอยู่ในหมวดที่เลือก(item.cat, catFilter); });
	}
	container.innerHTML = "";
	feedState.items = items;
	feedState.shown = 0;
	feedState.container = container;

	var loadingMore = document.getElementById("communityFeedLoadingMore");
	if (loadingMore) loadingMore.hidden = true;

	if (items.length === 0) {
		if (emptyMsg) {
			emptyMsg.textContent = (catFilter && catFilter !== "all") ? (t("home.feedEmptyCat") || "ยังไม่มีโพสต์ในหมวดนี้") : t("home.feedEmpty");
			emptyMsg.hidden = false;
		}
		return;
	}
	if (emptyMsg) emptyMsg.hidden = true;

	appendNextFeedBatch(FEED_INITIAL_SIZE);
	wireFeedLoadMoreSentinel();
}

// รายงานได้เฉพาะโพสต์จริงของคนอื่น — ไม่ใช่โพสต์ตัวอย่างของร้าน BU และไม่ใช่โพสต์ของตัวเอง
function canReportFeedItem(item) {
	if (item.kind === "bushop" || /^bu-/.test(String(item.id))) return false;
	var me = getSession();
	return !(me && item.userId && item.userId === me.id);
}
// แตะที่อื่นแล้วปิดเมนู ⋯ ของโพสต์ในฟีด
document.addEventListener("click", function(e) {
	if (!e.target.closest || !e.target.closest(".feedmenu, .feedmore")) {
		document.querySelectorAll(".feedmenu").forEach(function(m) { m.remove(); });
	}
});

function buildFeedItemEl(item) {
		var el = document.createElement("div");
		el.className = "feeditem card-enter";

		var avatarHtml = item.posterAvatarUrl
			? '<div class="feedavatar" style="background:var(--cream2) center/cover no-repeat url(\'' + cssUrl(item.posterAvatarUrl) + '\')"></div>'
			: '<div class="feedavatar" style="background:' + item.posterColor + '">' + escapeHtml((item.posterName || "?").trim().charAt(0).toUpperCase()) + '</div>';

		var imgsHtml = item.images.map(function(src) {
			return '<img src="' + safeImgSrc(src) + '" alt=""/>';
		}).join("");
		var dotsHtml = item.images.length > 1
			? '<div class="feeddots">' + item.images.map(function(_, i) { return '<span class="' + (i === 0 ? "active" : "") + '"></span>'; }).join("") + '</div>'
			: "";

		el.innerHTML =
			'<div class="feedhead">' +
				avatarHtml +
				'<div class="feednm">' +
					'<div class="feedname">' + escapeHtml(item.posterName) + ((item.kind === "mockup" || item.kind === "page") ? ' <i class="fas fa-store feedstoreico" title="' + t("common.restaurantIcon") + '"></i>' : "") + "</div>" +
					'<div class="feedtime" data-feed-time="' + escapeHtml(item.date) + '">' + formatFeedTime(item.date) + "</div>" +
				"</div>" +
				(canReportFeedItem(item) ? '<button type="button" class="feedmore" aria-label="' + t("report.postOptions") + '"><i class="fas fa-ellipsis"></i></button>' : "") +
			"</div>" +
			'<div class="feedimgs"><div class="feedimgstrip">' + imgsHtml + "</div>" + dotsHtml + "</div>" +
			'<div class="feedactions">' +
				'<button class="feedlikebtn" type="button"><i class="far fa-heart"></i><span></span></button>' +
				'<button class="feedcommentbtn" type="button"><i class="far fa-comment"></i><span></span></button>' +
			"</div>" +
			'<div class="feedlikesline" hidden></div>' +
			'<div class="feedcap"><b>' + escapeHtml(item.posterName) + "</b> " + escapeHtml(item.caption) + "</div>" +
			'<div class="feedcomments" hidden></div>';

		if (item.posterLink) {
			var headEl = el.querySelector(".feedhead");
			headEl.style.cursor = "pointer";
			headEl.addEventListener("click", function(e) {
				if (e.target.closest(".feedmore, .feedmenu")) return;
				window.location.href = item.posterLink;
			});
		}
		var moreBtn = el.querySelector(".feedmore");
		if (moreBtn) {
			moreBtn.addEventListener("click", function(e) {
				e.stopPropagation();
				var open = el.querySelector(".feedmenu");
				document.querySelectorAll(".feedmenu").forEach(function(m) { m.remove(); });
				if (open) return;
				var menu = document.createElement("div");
				menu.className = "feedmenu";
				menu.innerHTML = '<button type="button" class="danger"><i class="fas fa-flag"></i>' + t("report.reportPost") + "</button>";
				menu.querySelector("button").addEventListener("click", function(ev) {
					ev.stopPropagation();
					menu.remove();
					openReportPopup("post", item.id, function() {
						// ถ้ารายงานถึงเกณฑ์ซ่อนแล้ว เอาออกจากฟีดทันที (ซ่อนจริงทุกเครื่องเมื่อ Supabase นับครบ 3 รายงาน)
						if (isContentHidden("post", item.id)) el.remove();
					});
				});
				el.querySelector(".feedhead").appendChild(menu);
			});
		}

		var strip = el.querySelector(".feedimgstrip");
		var dotsBox = el.querySelector(".feeddots");
		if (dotsBox) {
			var dotEls = dotsBox.querySelectorAll("span");
			strip.addEventListener("scroll", function() {
				var idx = Math.round(strip.scrollLeft / strip.clientWidth);
				dotEls.forEach(function(d, i) { d.classList.toggle("active", i === idx); });
			});
		}
		strip.addEventListener("click", function() {
			openPostView({ id: item.id, images: item.images, caption: item.caption, posterName: item.posterName, posterColor: item.posterColor, posterAvatarUrl: item.posterAvatarUrl, posterId: item.userId });
		});

		var likeBtn = el.querySelector(".feedlikebtn");
		var likesLine = el.querySelector(".feedlikesline");
		// "ถูกใจ N คน" — ยอดรวมของทุกคน (ดึงจริงจาก Supabase) ไม่ใช่แค่ของเครื่องนี้
		function showLikesLine(count) {
			likesLine.hidden = !count;
			likesLine.innerHTML = count ? '<i class="fas fa-heart"></i> ' + escapeHtml(t("community.likedByCount").replace("{n}", formatLikeCount(count))) : "";
			likeBtn.setAttribute("aria-label", t("community.likedByCount").replace("{n}", count));
		}
		function refreshFeedLike() {
			var liked = isPostLiked(item.id);
			var ico = likeBtn.querySelector("i");
			ico.classList.toggle("far", !liked);
			ico.classList.toggle("fas", liked);
			likeBtn.classList.toggle("liked", liked);
			likeBtn.querySelector("span").textContent = formatLikeCount(getPostLikeCount(item.id));
			showLikesLine(getPostLikeCount(item.id));
		}
		likeBtn.addEventListener("click", function() {
			togglePostLike(item.id);
			refreshFeedLike();
		});
		refreshFeedLike();
		if (typeof queuePostLikeCountFetch === "function") {
			queuePostLikeCountFetch(item.id, likeBtn.querySelector("span"));
			queuePostLikeCountFetch(item.id, showLikesLine);
		}

	var commentBtn = el.querySelector(".feedcommentbtn");
	var commentCountEl = commentBtn.querySelector("span");
	var commentsBox = el.querySelector(".feedcomments");
	function openThisPost() {
		openPostView({ id: item.id, images: item.images, caption: item.caption, posterName: item.posterName, posterColor: item.posterColor, posterAvatarUrl: item.posterAvatarUrl, posterId: item.userId });
	}
	// คอมเมนต์ล่าสุด 2 อันโชว์ใต้โพสต์เลย (ของทุกคน) + "ดูความคิดเห็นทั้งหมด N รายการ" กดแล้วเปิดโพสต์
	function showCommentPreview(summary) {
		var count = summary.count;
		commentCountEl.textContent = count;
		commentsBox.hidden = !count;
		if (!count) {
			commentsBox.innerHTML = "";
			return;
		}
		var lines = summary.latest.slice(0, 2).reverse().map(function(c) {
			return '<div class="feedcommentline"><b>' + escapeHtml(c.author) + "</b> " + escapeHtml(c.text) + "</div>";
		}).join("");
		commentsBox.innerHTML =
			(count > 2 ? '<button type="button" class="feedcommentsall">' + escapeHtml(t("community.viewAllComments").replace("{n}", count)) + "</button>" : "") +
			lines;
	}
	// แสดงจากในเครื่องไปก่อน แล้วค่อยแทนด้วยของจริงจากเซิร์ฟเวอร์ (ใหม่สุดก่อน เหมือนที่เซิร์ฟเวอร์ส่งมา)
	var localComments = getComments(item.id);
	showCommentPreview({
		count: localComments.length,
		latest: localComments.slice(-2).reverse().map(function(c) { return { author: c.author, text: c.text }; })
	});
	if (typeof queueCommentCountFetch === "function") queueCommentCountFetch(item.id, showCommentPreview);
	commentBtn.addEventListener("click", openThisPost);
	commentsBox.addEventListener("click", openThisPost);
	// ปิดหน้าดูโพสต์แล้ว อัปเดตตัวอย่างคอมเมนต์ใต้โพสต์นี้ให้ตรงกับที่เพิ่งพิมพ์/ลบ
	el.__refreshComments = function() {
		var list = getComments(item.id);
		showCommentPreview({ count: list.length, latest: list.slice(-2).reverse().map(function(c) { return { author: c.author, text: c.text }; }) });
	};

	return el;
}

function appendNextFeedBatch(count) {
	var next = feedState.items.slice(feedState.shown, feedState.shown + count);
	next.forEach(function(item) {
		feedState.container.appendChild(buildFeedItemEl(item));
	});
	feedState.shown += next.length;
}

/* --- sentinel ท้ายฟีด: เลื่อนถึงแล้วโชว์ตัวหมุนโหลดก่อน (เนื้อหาเดิมยังอยู่ครบ ไม่หาย) จากนั้นค่อยเพิ่มโพสต์ชุดถัดไปต่อท้าย
   ทำซ้ำแบบนี้ไปเรื่อย ๆ ทุกครั้งที่เลื่อนถึงท้ายฟีด จนกว่าโพสต์จะหมด (ไม่รีเฟรชหน้าเลย)
   ข้าม callback แรกสุด (ที่ยิงทันทีตอน observe() เพื่อรายงานสถานะปัจจุบัน ไม่ใช่การเลื่อนจริงของผู้ใช้) --- */
function wireFeedLoadMoreSentinel() {
	var sentinel = document.getElementById("communityFeedSentinel");
	var loadingMore = document.getElementById("communityFeedLoadingMore");
	if (!sentinel || !("IntersectionObserver" in window)) return;
	if (feedState.shown >= feedState.items.length) return;

	var isFirstCallback = true;
	var isLoading = false;
	var observer = new IntersectionObserver(function(entries) {
		if (isFirstCallback) {
			isFirstCallback = false;
			return;
		}
		if (!entries[0].isIntersecting || isLoading) return;
		isLoading = true;
		if (loadingMore) loadingMore.hidden = false;
		setTimeout(function() {
			appendNextFeedBatch(FEED_PAGE_STEP);
			isLoading = false;
			if (loadingMore) loadingMore.hidden = true;
			if (feedState.shown >= feedState.items.length) {
				observer.disconnect();
				window.__chimchimFeedSentinelObserver = null;
			}
		}, 600);
	}, { threshold: 0.1 });
	observer.observe(sentinel);
	window.__chimchimFeedSentinelObserver = observer;
}

/* =====================================================================
   เริ่มต้น UI ตอนโหลดหน้า
   ===================================================================== */
refreshAuthUI();
(function initCommunityFeedIfPresent() {
	var feed = document.getElementById("communityFeed");
	if (feed) renderCommunityFeed(feed, typeof currentTrendCat !== "undefined" ? currentTrendCat : "all");
})();


/* =====================================================================
   ปุ่มเลือกพื้นที่ (มหาวิทยาลัย) บนแถบบน — ใส่ให้ทุกหน้าที่มีแถบบนอัตโนมัติ (ข้างปุ่มตั้งค่า)
   เลือกแล้วโหลดหน้าใหม่ ทุกส่วนที่โชว์ร้าน (แนะนำ/ฟีด/ติดตาม/ไข่/AI) จะใช้ร้านแถวนั้น
   ===================================================================== */
(function setupAreaPicker() {
	var actions = document.querySelector(".apptop-actions");
	if (!actions || typeof getSelectedArea !== "function" || typeof มหาวิทยาลัยทั้งหมด === "undefined") return;
	var wrap = document.createElement("div");
	wrap.className = "areawrap";
	wrap.innerHTML =
		'<button type="button" class="areabtn" id="areaBtn" aria-haspopup="listbox" aria-expanded="false">' +
			'<i class="fas fa-location-dot"></i><span class="areabtn-txt"></span><i class="fas fa-chevron-down areabtn-chev"></i>' +
		"</button>" +
		'<div class="areapanel" id="areaPanel" role="listbox" hidden></div>';
	actions.insertBefore(wrap, actions.firstChild);
	var btn = wrap.querySelector(".areabtn");
	var panel = wrap.querySelector(".areapanel");
	var current = getSelectedArea();
	wrap.querySelector(".areabtn-txt").textContent = areaShortName(current);
	btn.setAttribute("aria-label", t("area.pick") + ": " + areaShortName(current));

	function render() {
		var shops = typeof รายการร้าน !== "undefined" ? รายการร้าน : [];
		var options = [""].concat(มหาวิทยาลัยทั้งหมด);
		panel.innerHTML = '<div class="areapanel-tit"></div>';
		panel.querySelector(".areapanel-tit").textContent = t("area.pick");
		options.forEach(function(area) {
			var n = area ? shops.filter(function(r) { return r.มหาลัย === area; }).length : shops.length;
			var opt = document.createElement("button");
			opt.type = "button";
			opt.className = "areaopt" + (area === current ? " active" : "");
			opt.setAttribute("role", "option");
			opt.setAttribute("aria-selected", area === current ? "true" : "false");
			opt.innerHTML = '<i class="fas fa-' + (area ? "graduation-cap" : "earth-asia") + '"></i><span></span><small></small>' + (area === current ? '<i class="fas fa-check areaopt-check"></i>' : "");
			opt.querySelector("span").textContent = area ? areaShortName(area) : t("area.all");
			opt.querySelector("small").textContent = n ? t("area.shopCount").replace("{n}", n) : t("area.noShops");
			opt.addEventListener("click", function(e) {
				e.stopPropagation();
				if (area === current) { close(); return; }
				setSelectedArea(area);
				window.location.reload();
			});
			panel.appendChild(opt);
		});
	}
	function close() {
		panel.hidden = true;
		btn.setAttribute("aria-expanded", "false");
	}
	btn.addEventListener("click", function(e) {
		e.stopPropagation();
		if (!panel.hidden) { close(); return; }
		render();
		panel.hidden = false;
		btn.setAttribute("aria-expanded", "true");
	});
	document.addEventListener("click", function(e) { if (!wrap.contains(e.target)) close(); });
	document.addEventListener("keydown", function(e) { if (e.key === "Escape") close(); });
})();
