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
		? '<img src="' + person.avatarImg + '" alt="" style="width:100%;height:100%;object-fit:cover;"/>'
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

function renderCreators() {
	var grid = document.getElementById('creatorGrid');
	var emptyMsg = document.getElementById('followedPeopleEmpty');
	var lbl = document.getElementById('peopleSectionLbl');
	if (!grid) return;
	grid.innerHTML = '';

	var seedPeople = เพจร้านBU.map(function(shop) {
		return { id: 'bu-' + shop.id, name: shop.name, color: 'linear-gradient(135deg, var(--primary), var(--secondary))', avatarImg: shop.avatar, sub: '<i class="fas fa-store"></i> ' + catEmoji(shop.cat) + ' ' + escapeHtml(catLabel(shop.cat)) };
	});

	var list;
	if (currentPeopleFilter === 'following') {
		var realPeople = getUsers().map(function(u) {
			return { id: u.id, name: u.name, color: 'linear-gradient(135deg, var(--dark), #8b68e0)', sub: '<i class="fas fa-graduation-cap"></i> ' + t("common.member") };
		});
		var followedPages = getPages().map(function(p) {
			return { id: p.id, linkId: 'page-' + p.id, name: p.name, color: 'var(--cream2)', avatarImg: p.avatar, sub: '<i class="fas fa-store"></i> ' + catEmoji(p.cat) + ' ' + escapeHtml(catLabel(p.cat)) };
		});
		list = seedPeople.concat(realPeople).concat(followedPages).filter(function(p) { return isUserFollowed(p.id); });
		if (lbl) lbl.textContent = t('following.onlyFollowing');
	} else {
		list = seedPeople;
		if (lbl) lbl.textContent = t('following.topReviewers');
	}

	var searchEmptyMsg = document.getElementById('followingSearchEmpty');
	var q = currentPeopleSearch.trim().toLowerCase();
	var listBeforeSearch = list;

	// มีคำค้นหา: ค้นหาคนจริงทุกคนด้วยเสมอ (ไม่ใช่แค่ร้านตัวอย่าง หรือแค่คนที่ติดตามอยู่แล้ว) กันปัญหา
	// "หาคนไม่เจอทั้งที่ติดตามแล้วหรือยังไม่ได้ติดตาม" — getUsers() คือคนที่เครื่องนี้เคยเห็นมาก่อนเท่านั้น
	// ส่วนคนที่เครื่องนี้ไม่เคยเห็นเลย ไปค้นหาเพิ่มจาก Supabase จริงด้านล่าง (โผล่มาทีหลังแบบ progressive)
	if (q) {
		var existingIds = {};
		list.forEach(function(p) { existingIds[p.id] = true; });
		getUsers().forEach(function(u) {
			if (!u.name || existingIds[u.id]) return;
			existingIds[u.id] = true;
			list.push({ id: u.id, name: u.name, color: 'linear-gradient(135deg, var(--dark), #8b68e0)', sub: '<i class="fas fa-graduation-cap"></i> ' + t("common.member") });
		});
		list = list.filter(function(p) { return p.name.toLowerCase().indexOf(q) !== -1; });
	}

	if (emptyMsg) emptyMsg.hidden = !(currentPeopleFilter === 'following' && listBeforeSearch.length === 0);
	if (searchEmptyMsg) searchEmptyMsg.hidden = !(q && list.length === 0);

	list.forEach(function(person) {
		grid.appendChild(buildPersonCard(person));
	});

	// ค้นหาคนจาก Supabase จริงด้วย (ครอบคลุมทุกคนที่สมัครจริง ไม่ใช่แค่คนที่เครื่องนี้เคยเห็นมาก่อน)
	// ผลมาทีหลัง (async) เลยต้องเช็คว่าช่องค้นหายังเป็นคำเดิมอยู่ไหมก่อนเอามาต่อท้าย กันพิมพ์เปลี่ยนไปแล้วผลเก่าโผล่มาทับ
	if (q && q.length >= 2 && typeof sbClient !== "undefined" && sbClient) {
		var existingIdsForRemote = {};
		list.forEach(function(p) { existingIdsForRemote[p.id] = true; });
		sbClient.from("profiles").select("id, name").ilike("name", "%" + currentPeopleSearch.trim() + "%").limit(8).then(function(res) {
			if (res.error || !res.data || !res.data.length) return;
			if (currentPeopleSearch.trim().toLowerCase() !== q) return;
			if (searchEmptyMsg) searchEmptyMsg.hidden = true;
			res.data.forEach(function(row) {
				if (existingIdsForRemote[row.id]) return;
				existingIdsForRemote[row.id] = true;
				grid.appendChild(buildPersonCard({ id: row.id, name: row.name, color: 'linear-gradient(135deg, var(--dark), #8b68e0)', sub: '<i class="fas fa-graduation-cap"></i> ' + t("common.member") }));
			});
			wireFollowButtons();
		}).catch(function() {});
	}

	wireFollowButtons();

	function wireFollowButtons() {
	document.querySelectorAll('.followbtn').forEach(function(btn) {
		var uid = btn.getAttribute('data-uid');
		if (isUserFollowed(uid)) {
			btn.classList.add('following');
			btn.textContent = '✓ ' + t("common.following");
		}
		btn.addEventListener('click', function() {
			var nowFollowing = toggleFollowUser(uid);
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

var peopleFilterAllBtn = document.getElementById('peopleFilterAll');
var peopleFilterFollowingBtn = document.getElementById('peopleFilterFollowing');
if (peopleFilterAllBtn && peopleFilterFollowingBtn) {
	peopleFilterAllBtn.addEventListener('click', function() {
		currentPeopleFilter = 'all';
		this.classList.add('active');
		peopleFilterFollowingBtn.classList.remove('active');
		renderCreators();
	});
	peopleFilterFollowingBtn.addEventListener('click', function() {
		currentPeopleFilter = 'following';
		this.classList.add('active');
		peopleFilterAllBtn.classList.remove('active');
		renderCreators();
	});
}

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
	if (params.get('filter') === 'following' && peopleFilterFollowingBtn) {
		peopleFilterFollowingBtn.click();
	}
})();
