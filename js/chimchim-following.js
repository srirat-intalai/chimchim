// chimchim-following.js
// รายชื่อ 11 ร้านจริงใกล้ ม.กรุงเทพ (เพจร้านBU) + คนจริงที่ผู้ใช้ติดตามไว้ (กดรูปเพื่อดูโปรไฟล์สาธารณะ + ดูโพสต์)
// ทุกอย่างอยู่ในลิสต์เดียว ไม่มีแท็บแยกร้าน/คนแล้ว — Follow ร้านจากหน้ารายละเอียดร้านก็ขึ้นที่นี่เหมือนกัน
// รองรับลิงก์ตรงจากหน้าโปรไฟล์ผ่าน query param ?filter=following

/* --- ร้าน/คนในชุมชน — "ทั้งหมด" (11 ร้านจริงใกล้ ม.กรุงเทพ) หรือ "ที่ติดตามแล้ว" (รวมสมาชิกจริงที่ Follow ไว้ด้วย) --- */
var currentPeopleFilter = 'all';
var currentPeopleSearch = '';
function buildPersonCard(person) {
	var col = document.createElement('div');
	col.className = 'col-6';
	var avatarInner = person.avatarImg
		? '<img src="' + safeImgSrc(person.avatarImg) + '" alt="" style="width:100%;height:100%;object-fit:cover;"/>'
		: '<span style="font-size:3rem;font-weight:800;color:#fff;">' + escapeHtml(person.name.charAt(0).toUpperCase()) + '</span>';
	col.innerHTML =
		'<div class="chcard">' +
			'<a href="public-profile.html?u=' + encodeURIComponent(person.linkId || person.id) + '" class="chimg" style="background:' + person.color + ';display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
				avatarInner +
			'</a>' +
			'<div class="chbody">' +
				'<a href="public-profile.html?u=' + encodeURIComponent(person.linkId || person.id) + '" class="chnm" style="text-decoration:none;color:inherit;display:block;">' + escapeHtml(person.name) + '</a>' +
				'<div class="chlv">' + person.sub + '</div>' +
				'<button class="followbtn" data-uid="' + person.id + '">+ ' + t("common.follow") + '</button>' +
			'</div>' +
		'</div>';
	return col;
}

/* --- รายชื่อนักชิม (ผู้ใช้จริง) — ดึงจากตาราง profiles ใน Supabase ครั้งเดียวแล้วเก็บไว้ใช้ทั้งหน้า
   เดิมหน้านี้โชว์แต่ร้าน คนจะโผล่ก็ต่อเมื่อติดตามไว้แล้วหรือพิมพ์ค้นชื่อเอง เลยหาคนใหม่ ๆ ไปติดตามไม่ได้ --- */
var peopleCache = null; // null = ยังไม่โหลด, [] = โหลดแล้ว
var peopleLoading = false;
function profileRowToPerson(row) {
	return {
		id: row.id,
		name: row.name,
		avatarImg: row.avatar_url || row.avatar || null,
		color: 'var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))',
		university: row.university || null,
		dna: row.food_dna || row.foodDNA || null,
		sub: row.university
			? '<i class="fas fa-graduation-cap"></i> ' + escapeHtml(row.university)
			: '<i class="fas fa-user"></i> ' + t("following.foodie")
	};
}

/* --- คัดนักชิมที่ "เหมาะกับฉัน" — ชอบอาหารคล้ายกัน (Food DNA) หรืออยู่มหาลัยเดียวกัน ไม่โชว์ทุกคน ---
   มหาลัยของฉัน: ที่ตั้งไว้ในหน้าตั้งค่า ไม่งั้นใช้มหาลัยที่ใกล้ที่สุดจาก GPS (ตำแหน่งจริงไม่ได้ส่งขึ้นเซิร์ฟเวอร์
   เลยใช้มหาลัยเป็นตัวแทน "อยู่ใกล้กัน") ส่วนมหาลัยของคนอื่นต้องรัน SQL Phase 6 ก่อนถึงจะมีข้อมูล */
var PEOPLE_SIMILAR_MIN = 50;
function getMyUniversity() {
	var me = getMe();
	if (me && me.university) return me.university;
	var loc = getUserLocation();
	return loc && loc.nearestUni ? loc.nearestUni : null;
}
function suggestPeople(list) {
	var myUni = getMyUniversity();
	return list.map(function(p) {
		var score = p.dna ? คำนวณความชอบคล้ายกัน(foodDNA, p.dna) : 0;
		var sameUni = !!(myUni && p.university && p.university === myUni);
		var tags = [];
		if (score >= PEOPLE_SIMILAR_MIN) tags.push('<span class="ftag ftag-taste"><i class="fas fa-heart"></i> ' + t("following.tasteMatch").replace("{n}", score) + "</span>");
		if (sameUni) tags.push('<span class="ftag ftag-near"><i class="fas fa-location-dot"></i> ' + t("following.sameUni") + "</span>");
		return { person: Object.assign({}, p, { sub: tags.join("") || p.sub }), score: score, sameUni: sameUni };
	}).filter(function(x) {
		return x.sameUni || x.score >= PEOPLE_SIMILAR_MIN;
	}).sort(function(a, b) {
		// มหาลัยเดียวกันได้โบนัส 20 คะแนน (อยู่ใกล้ = นัดกินด้วยกันได้จริง) แล้วเรียงจากคล้ายที่สุดก่อน
		return (b.score + (b.sameUni ? 20 : 0)) - (a.score + (a.sameUni ? 20 : 0));
	}).map(function(x) { return x.person; });
}
function loadPeople() {
	if (peopleCache || peopleLoading) return;
	var me = getSession();
	var myId = me ? me.id : null;
	// ไม่มี Supabase (ออฟไลน์/ยังไม่ตั้งค่า) — ใช้คนที่เครื่องนี้รู้จักไปก่อน
	if (typeof sbClient === "undefined" || !sbClient) {
		peopleCache = getUsers().filter(function(u) { return u.id !== myId && u.name; }).map(profileRowToPerson);
		return;
	}
	peopleLoading = true;
	// คอลัมน์ university มาจาก SQL Phase 6 ส่วน avatar_url มาจาก Phase 3 — ถ้ายังไม่ได้รันอันไหน query จะ error
	// เลยถอยทีละขั้น (ตัด university ก่อน ยังขอรูปโปรไฟล์อยู่) ไม่ใช่ถอยไปขอแค่ชื่อทีเดียว ไม่งั้นรูปหายหมดทั้งที่มีจริง
	function query(cols) {
		return sbClient.from("profiles").select(cols).order("created_at", { ascending: false }).limit(60);
	}
	query("id, name, avatar_url, university, food_dna").then(function(res) {
		return res.error ? query("id, name, avatar_url, food_dna") : res;
	}).then(function(res) {
		return res.error ? query("id, name, food_dna") : res;
	}).then(function(res) {
		peopleCache = (res && !res.error && res.data ? res.data : [])
			.filter(function(row) { return row.id !== myId && row.name; })
			.map(profileRowToPerson);
	}).catch(function() {
		peopleCache = [];
	}).then(function() {
		peopleLoading = false;
		renderCreators();
	});
}

function buildSectionHead(title, count) {
	var head = document.createElement('div');
	head.className = 'col-12';
	head.innerHTML = '<div class="fsechead"><span></span><b></b></div>';
	head.querySelector('span').textContent = title;
	head.querySelector('b').textContent = count;
	return head;
}
function buildGridNote(text, cls) {
	var note = document.createElement('div');
	note.className = 'col-12';
	note.innerHTML = '<p class="' + (cls || 'fgridnote') + '"></p>';
	note.querySelector('p').textContent = text;
	return note;
}

// หัวข้อร้าน: ตามพื้นที่ที่เลือก (ทุกพื้นที่ = "ร้านทั้งหมด" / ไม่มีร้านในพื้นที่ = "ร้านที่ใกล้ X ที่สุด")
function shopsTitle() {
	var info = กรองร้านตามพื้นที่(รายการร้าน);
	if (!info.area) return t("area.shopsAll");
	return t(info.fallback ? "area.shopsNearest" : "area.shopsIn").replace("{area}", areaShortName(info.area));
}
var PEOPLE_FILTER_LABEL = { all: 'following.allTitle', shops: 'following.topReviewers', people: 'following.peopleTitle', following: 'following.onlyFollowing' };

function renderCreators() {
	var grid = document.getElementById('creatorGrid');
	var emptyMsg = document.getElementById('followedPeopleEmpty');
	var lbl = document.getElementById('peopleSectionLbl');
	if (!grid) return;
	grid.innerHTML = '';
	loadPeople();

	var areaShopIds = {};
	ร้านในพื้นที่().forEach(function(r) { areaShopIds[r.id] = true; });
	var shops = เพจร้านBU.filter(function(shop) { return areaShopIds[shop.menuId]; }).map(function(shop) {
		return { id: 'bu-' + shop.id, name: shop.name, color: 'var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))', avatarImg: shop.avatar, sub: '<i class="fas fa-store"></i> ' + catEmoji(shop.cat) + ' ' + escapeHtml(catLabel(shop.cat)) };
	});
	var people = peopleCache || [];
	var peopleStillLoading = peopleCache === null;
	// ที่โชว์ในแท็บ "ทั้งหมด"/"นักชิม" = เฉพาะคนที่ชอบคล้าย/อยู่ใกล้ (ต้องล็อกอินก่อน ถึงจะมี Food DNA ของเราจริงมาเทียบ)
	// ส่วนการค้นหาและแท็บ "ที่ติดตามแล้ว" ยังใช้ people ทั้งหมดเหมือนเดิม
	var loggedIn = !!getSession();
	var suggested = loggedIn ? suggestPeople(people) : [];
	var peopleNoteKey = !loggedIn ? 'following.peopleLoginHint' : (peopleStillLoading ? 'following.peopleLoading' : 'following.peopleNoMatch');
	if (lbl) lbl.textContent = currentPeopleFilter === 'shops' ? shopsTitle() : t(PEOPLE_FILTER_LABEL[currentPeopleFilter] || 'following.allTitle');

	var searchEmptyMsg = document.getElementById('followingSearchEmpty');
	var q = currentPeopleSearch.trim().toLowerCase();
	var me = getSession();

	// รวมทุกคน/ทุกร้านที่รู้จัก (ใช้ตอนค้นหา และตอนกรอง "ที่ติดตามแล้ว") กันซ้ำด้วย id
	function everyone() {
		var seen = {};
		var all = [];
		function add(p) {
			if (!p || !p.name || seen[p.id] || (me && p.id === me.id)) return;
			seen[p.id] = true;
			all.push(p);
		}
		shops.forEach(add);
		people.forEach(add);
		getUsers().forEach(function(u) { add(profileRowToPerson(u)); });
		getPages().forEach(function(pg) {
			add({ id: pg.id, linkId: 'page-' + pg.id, name: pg.name, color: 'var(--cream2)', avatarImg: pg.avatar, sub: '<i class="fas fa-store"></i> ' + catEmoji(pg.cat) + ' ' + escapeHtml(catLabel(pg.cat)) });
		});
		return all;
	}

	var shownIds = {};
	function appendCards(list) {
		list.forEach(function(person) {
			shownIds[person.id] = true;
			grid.appendChild(buildPersonCard(person));
		});
	}

	if (emptyMsg) emptyMsg.hidden = true;
	if (searchEmptyMsg) searchEmptyMsg.hidden = true;

	if (q) {
		// มีคำค้นหา: ค้นทั้งร้านและคนทุกคนที่รู้จัก ไม่สนตัวกรองที่เลือกอยู่
		var found = everyone().filter(function(p) { return p.name.toLowerCase().indexOf(q) !== -1; });
		appendCards(found);
		if (searchEmptyMsg) searchEmptyMsg.hidden = found.length > 0;
	} else if (currentPeopleFilter === 'following') {
		var followed = everyone().filter(function(p) { return isUserFollowed(p.id); });
		appendCards(followed);
		if (emptyMsg) emptyMsg.hidden = followed.length > 0;
	} else if (currentPeopleFilter === 'shops') {
		appendCards(shops);
	} else if (currentPeopleFilter === 'people') {
		grid.appendChild(buildGridNote(t('following.peopleWhyHint'), 'fgridhint'));
		if (suggested.length) {
			appendCards(suggested);
		} else {
			grid.appendChild(buildGridNote(t(peopleNoteKey)));
		}
	} else {
		// ทั้งหมด: แยกเป็น 2 หมวดมีหัวข้อ — ร้านอาหารก่อน แล้วตามด้วยนักชิม
		grid.appendChild(buildSectionHead(shopsTitle(), shops.length));
		appendCards(shops);
		grid.appendChild(buildSectionHead(t('following.peopleTitle'), (peopleStillLoading || !loggedIn) ? '' : suggested.length));
		if (suggested.length) {
			appendCards(suggested.slice(0, 6));
			if (suggested.length > 6) {
				var more = document.createElement('div');
				more.className = 'col-12';
				more.innerHTML = '<button type="button" class="fseemore"></button>';
				more.querySelector('button').textContent = t('following.seeAllPeople').replace('{n}', suggested.length);
				more.querySelector('button').addEventListener('click', function() {
					var btn = document.querySelector('.filtbtn[data-filter="people"]');
					if (btn) btn.click();
				});
				grid.appendChild(more);
			}
		} else {
			grid.appendChild(buildGridNote(t(peopleNoteKey)));
		}
	}

	// ค้นหาคนจาก Supabase จริงด้วย (ครอบคลุมทุกคนที่สมัครจริง ไม่ใช่แค่ 60 คนล่าสุดที่โหลดมา)
	// ผลมาทีหลัง (async) เลยต้องเช็คว่าช่องค้นหายังเป็นคำเดิมอยู่ไหมก่อนเอามาต่อท้าย กันพิมพ์เปลี่ยนไปแล้วผลเก่าโผล่มาทับ
	if (q && q.length >= 2 && typeof sbClient !== "undefined" && sbClient) {
		var term = "%" + currentPeopleSearch.trim() + "%";
		function search(cols) {
			return sbClient.from("profiles").select(cols).ilike("name", term).limit(8);
		}
		// ขอรูปโปรไฟล์มาด้วย ถ้าคอลัมน์ avatar_url ยังไม่มี (ยังไม่รัน SQL Phase 3) ค่อยถอยไปขอแค่ชื่อ
		search("id, name, avatar_url").then(function(res) {
			return res.error ? search("id, name") : res;
		}).then(function(res) {
			if (res.error || !res.data || !res.data.length) return;
			if (currentPeopleSearch.trim().toLowerCase() !== q) return;
			var added = false;
			res.data.forEach(function(row) {
				if (shownIds[row.id] || (me && row.id === me.id)) return;
				shownIds[row.id] = true;
				added = true;
				grid.appendChild(buildPersonCard(profileRowToPerson(row)));
			});
			if (added && searchEmptyMsg) searchEmptyMsg.hidden = true;
			wireFollowButtons();
		}).catch(function() {});
	}

	wireFollowButtons();

	function wireFollowButtons() {
	document.querySelectorAll('.followbtn:not([data-wired])').forEach(function(btn) {
		btn.setAttribute('data-wired', '1');
		var uid = btn.getAttribute('data-uid');
		if (isUserFollowed(uid)) {
			btn.classList.add('following');
			btn.textContent = '✓ ' + t("common.following");
		}
		btn.addEventListener('click', function() {
			var nowFollowing = toggleFollowUser(uid);
			if (nowFollowing === null) return; // ยังไม่ล็อกอิน — toggleFollowUser เปิดป็อปอัพเข้าสู่ระบบให้แล้ว
			this.classList.toggle('following', nowFollowing);
			this.textContent = nowFollowing ? ('✓ ' + t("common.following")) : ('+ ' + t("common.follow"));
			if (currentPeopleFilter === 'following' && !nowFollowing) {
				renderCreators();
			}
		});
	});
}
}
renderCreators();
// ดึงติดตามจริงจาก Supabase มาผสาน (เผื่อกดติดตามไว้จากเครื่องอื่น) แล้ว re-render ให้ปุ่ม/สถานะตรงของจริง
if (typeof syncLikesAndFollowsWithSupabase === "function") {
	syncLikesAndFollowsWithSupabase(renderCreators);
}

/* --- ตัวกรอง: ทั้งหมด / ร้านอาหาร / นักชิม / ที่ติดตามแล้ว (ปุ่มมี data-filter) --- */
var peopleFilterBtns = document.querySelectorAll('.filtbtn[data-filter]');
peopleFilterBtns.forEach(function(btn) {
	btn.addEventListener('click', function() {
		currentPeopleFilter = this.getAttribute('data-filter');
		peopleFilterBtns.forEach(function(b) { b.classList.toggle('active', b === btn); });
		renderCreators();
	});
});

/* --- ค้นหาร้าน/คนในกริดนี้แบบสด ๆ พิมพ์แล้วกรองทันที --- */
var followingSearchInput = document.getElementById('followingSearchInput');
if (followingSearchInput) {
	followingSearchInput.addEventListener('input', function() {
		currentPeopleSearch = this.value;
		renderCreators();
	});
}

/* --- รองรับลิงก์ตรงจากหน้าโปรไฟล์: ?filter=following --- */
(function applyFollowingQueryParams() {
	var params = new URLSearchParams(window.location.search);
	var filter = params.get('filter');
	var btn = filter && document.querySelector('.filtbtn[data-filter="' + filter + '"]');
	if (btn) btn.click();
})();
