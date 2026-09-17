// chimchim-home.js
// โค้ดเฉพาะหน้าแรกของแอป (home.html): แถบไอคอนหมวดหมู่, แท็บ Discovery Feed,
// การ์ดร้าน (ของทีมชิมชิม + ที่ชุมชนโพสต์), ค้นหาแบบพิมพ์กรองสด ๆ
// ทุกการ์ดกดแล้วพาไปหน้ารายละเอียดร้าน (restaurant.html) แทนที่ป็อปอัพเดิม
// (buildMiniCard ย้ายไปอยู่ chimchim-core.js แล้ว เพื่อให้หน้าอื่น เช่น วงล้อสุ่มเมนู เรียกใช้ได้ด้วย)

/* -----------------------------------------------------
   Match Hero — วงกลมเดียว แต่ภาพข้างในเลื่อนซ้ายขวาดูร้าน Match สูงสุดได้ทีละร้าน
   (Match% / ระยะทางจริง คำนวณจาก Food DNA ปัจจุบัน) ป้ายลอยอัปเดตตามภาพที่เลื่อนมาอยู่ตรงกลาง
   เรียก renderMatchHero() ซ้ำได้ทุกครั้งที่สลับภาษา เพื่อสร้างภาพชุดใหม่ให้ข้อความตรงโหมด
----------------------------------------------------- */
var mhState = { ranked: [], currentIndex: 0 };
function updateHeroBadges() {
    var item = mhState.ranked[mhState.currentIndex];
    if (!item) return;
    document.getElementById('mhMatchVal').textContent = matchHeadline(item.m);
    document.getElementById('mhDistVal').textContent = distanceText(item.r.ระยะทาง);
}
function renderMatchHero() {
    var wrap = document.getElementById('matchHero');
    var slidesEl = document.getElementById('mhSlides');
    if (!wrap || !slidesEl) return;

    var mhDeduped = กรองรูปไม่ซ้ำ(
        รายการร้าน
            .map(function(r) { return { r: r, m: คำนวณMatch(r, foodDNA) }; })
            .sort(function(a, b) { return b.m - a.m; }),
        function(item) { return item.r.รูป; }
    );
    mhState.ranked = หมุนเวียนตามวันนี้(mhDeduped, function(item) { return 'hero-' + item.r.id; }, 8);
    if (ขอสลับเนื้อหาใหม่) mhState.ranked = สับลำดับ(mhState.ranked);
    if (!mhState.ranked.length) return;
    mhState.currentIndex = 0;

    slidesEl.innerHTML = '';
    mhState.ranked.forEach(function(item) {
        var img = document.createElement('img');
        img.src = item.r.รูป;
        img.alt = item.r.เมนู;
        slidesEl.appendChild(img);
    });
    slidesEl.scrollLeft = 0;
    updateHeroBadges();

    if (!slidesEl.getAttribute('data-wired')) {
        slidesEl.setAttribute('data-wired', '1');
        var scrollTimer;
        slidesEl.addEventListener('scroll', function() {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                var w = slidesEl.clientWidth || 1;
                var idx = Math.round(slidesEl.scrollLeft / w);
                if (idx < 0) idx = 0;
                if (idx >= mhState.ranked.length) idx = mhState.ranked.length - 1;
                mhState.currentIndex = idx;
                updateHeroBadges();
            }, 80);
        });
        document.getElementById('mhCircleWrap').addEventListener('click', function() {
            var item = mhState.ranked[mhState.currentIndex];
            if (item) window.location.href = 'restaurant.html?id=' + item.r.id;
        });

        /* --- เลื่อนอัตโนมัติทีละร้านทุก 5 วิ หยุดเองเมื่อผู้ใช้ปัดดู แล้วกลับมาเลื่อนอัตโนมัติอีกครั้ง --- */
        var mhAutoTimer = null;
        var mhAutoPaused = false;
        var mhResumeTimeout;
        function mhStepAuto() {
            if (mhAutoPaused || !mhState.ranked.length) return;
            var w = slidesEl.clientWidth || 1;
            var next = (mhState.currentIndex + 1) % mhState.ranked.length;
            slidesEl.scrollTo({ left: next * w, behavior: 'smooth' });
        }
        function mhStartAuto() {
            clearInterval(mhAutoTimer);
            mhAutoTimer = setInterval(mhStepAuto, 5000);
        }
        function mhPauseThenResume() {
            mhAutoPaused = true;
            clearTimeout(mhResumeTimeout);
            mhResumeTimeout = setTimeout(function() {
                mhAutoPaused = false;
            }, 6000);
        }
        ['pointerdown', 'touchstart', 'wheel'].forEach(function(evt) {
            slidesEl.addEventListener(evt, mhPauseThenResume, { passive: true });
        });
        mhStartAuto();
    }
    wrap.hidden = false;
}
renderMatchHero();

/* -----------------------------------------------------
   🎯 Recommended For You — เฉพาะร้าน Match 70% ขึ้นไป เรียงมากไปน้อย สูงสุด 6 ร้าน
----------------------------------------------------- */
(function renderRecommendedRow() {
    var row = document.getElementById('recommendedRow');
    if (!row) return;
    var recDeduped = กรองรูปไม่ซ้ำ(
        รายการร้าน
            .map(function(r) { return { r: r, m: คำนวณMatch(r, foodDNA) }; })
            .filter(function(x) { return x.m >= 70; })
            .sort(function(a, b) { return b.m - a.m; }),
        function(x) { return x.r.รูป; }
    );
    var แนะนำ = หมุนเวียนตามวันนี้(recDeduped, function(x) { return 'rec-' + x.r.id; }, 6);
    if (ขอสลับเนื้อหาใหม่) แนะนำ = สับลำดับ(แนะนำ);
    แนะนำ.forEach(function(x) {
        row.appendChild(buildMiniCard(x.r));
    });
    if (แนะนำ.length === 0) {
        row.innerHTML = '<p style="color:#bbb;font-size:.82rem;padding:6px 2px;">ยังไม่มีร้านที่ Match 70% ขึ้นไปตอนนี้ ลองทำแบบทดสอบ Food DNA เพื่อผลลัพธ์ที่แม่นขึ้น</p>';
    }
})();

/* -----------------------------------------------------
   ค้นหาแบบใช้งานได้จริง — ค้นหาข้าม 4 ประเภท: เมนูอาหาร / ร้านอาหาร / คน / สถานที่
   แสดงผลเป็น dropdown ใต้ช่องค้นหา กดแล้วพาไปหน้าที่เกี่ยวข้องได้ทันที
----------------------------------------------------- */
(function setupGlobalSearch() {
    var input = document.getElementById('homeSearchInput');
    var panel = document.getElementById('searchPanel');
    if (!input || !panel) return;

    function initials(name) {
        return (name || "?").trim().charAt(0).toUpperCase();
    }

    function buildGroup(labelKey, itemsHtml) {
        if (!itemsHtml) return "";
        return '<div class="spgroup"><div class="spgrouplbl">' + t(labelKey) + '</div>' + itemsHtml + '</div>';
    }

    function renderSearchResults(qRaw) {
        var q = qRaw.trim().toLowerCase();
        if (!q) {
            panel.hidden = true;
            panel.innerHTML = "";
            return;
        }

        var foodMatches = รายการร้าน.filter(function(r) {
            var blob = (r.เมนู + ' ' + r.หมวด + ' ' + catLabel(r.หมวด) + ' ' + (r.แท็ก || []).join(' ')).toLowerCase();
            return blob.indexOf(q) !== -1;
        }).slice(0, 4);
        var foodHtml = foodMatches.map(function(r) {
            return '<a class="spitem" href="restaurant.html?id=' + r.id + '"><img src="' + r.รูป + '" alt=""/><div><div class="sptit">' + escapeHtml(r.เมนู) + '</div><div class="spsub">' + escapeHtml(r.ร้าน) + '</div></div></a>';
        }).join("");

        var seenShops = {};
        var shopMatches = รายการร้าน.filter(function(r) {
            if (r.ร้าน.toLowerCase().indexOf(q) === -1) return false;
            if (seenShops[r.ร้าน]) return false;
            seenShops[r.ร้าน] = true;
            return true;
        }).slice(0, 4);
        var shopHtml = shopMatches.map(function(r) {
            return '<a class="spitem" href="restaurant.html?id=' + r.id + '"><img src="' + r.รูป + '" alt=""/><div><div class="sptit">' + escapeHtml(r.ร้าน) + '</div><div class="spsub">' + catLabel(r.หมวด) + ' • ฿' + r.ราคาต่ำ + '–' + r.ราคาสูง + '</div></div></a>';
        }).join("");

        var people = [];
        นักรีวิวเด่น.forEach(function(คน) {
            if (คน.ชื่อ.toLowerCase().indexOf(q) !== -1) {
                people.push({ id: คน.id, name: คน.ชื่อ, sub: "🦖 Food Explorer Lv." + คน.ระดับ, color: คน.สี });
            }
        });
        getUsers().forEach(function(u) {
            if (u.name && u.name.toLowerCase().indexOf(q) !== -1) {
                people.push({ id: u.id, name: u.name, sub: "🧑‍🎓 Member", color: "linear-gradient(135deg, var(--dark), #7d6fb0)" });
            }
        });
        var peopleHtml = people.slice(0, 4).map(function(p) {
            return '<a class="spitem" href="public-profile.html?u=' + encodeURIComponent(p.id) + '"><div class="spavatar" style="background:' + p.color + ';">' + initials(p.name) + '</div><div><div class="sptit">' + escapeHtml(p.name) + '</div><div class="spsub">' + p.sub + '</div></div></a>';
        }).join("");

        var locMatches = มหาวิทยาลัยทั้งหมด.filter(function(u) {
            return u.toLowerCase().indexOf(q) !== -1;
        }).slice(0, 3);
        var locHtml = locMatches.map(function(u) {
            return '<div class="spitem" data-goto-loc="' + escapeHtml(u) + '"><div class="spavatar" style="background:var(--green);"><i class="fas fa-location-dot"></i></div><div><div class="sptit">' + escapeHtml(u) + '</div><div class="spsub">' + t('search.locations') + '</div></div></div>';
        }).join("");

        var html =
            buildGroup('search.food', foodHtml) +
            buildGroup('search.restaurants', shopHtml) +
            buildGroup('search.people', peopleHtml) +
            buildGroup('search.locations', locHtml);

        if (!html) {
            html = '<p class="spempty">' + t('search.noResults') + '</p>';
        }
        panel.innerHTML = html;
        panel.hidden = false;

        panel.querySelectorAll('[data-goto-loc]').forEach(function(el) {
            el.addEventListener('click', function() {
                input.value = this.getAttribute('data-goto-loc');
                panel.hidden = true;
            });
        });
    }

    input.addEventListener('input', function() {
        renderSearchResults(this.value);
    });
    input.addEventListener('focus', function() {
        if (this.value.trim()) renderSearchResults(this.value);
    });
    input.addEventListener('blur', function() {
        setTimeout(function() { panel.hidden = true; }, 150);
    });
})();

/* หมายเหตุ: ฟีดชุมชน (#communityFeed) render โดย renderCommunityFeed() ใน chimchim-community.js
   เพราะไฟล์นั้นโหลดทีหลังสุด (หลัง chimchim-home.js) และมีฟังก์ชัน openPostView/like ที่ฟีดต้องใช้ร่วมกัน
   หมายเหตุ 2: หน้านี้ไม่มีกริด "ร้านทั้งหมด" (#mgrid) แล้ว เหลือแค่ "แนะนำสำหรับคุณ" (Food DNA Match) + ฟีดชุมชน
   ตามที่ตกลงไว้ — ดูร้านทีละร้านได้ผ่านการ์ดแนะนำ/ฟีด/ค้นหา ซึ่งลิงก์ไป restaurant.html โดยตรงอยู่แล้ว */

/* -----------------------------------------------------
   จัดการตอนถูกพามาที่หน้าแรกจากหน้าอื่น (หลังโพสต์ร้าน/หลังรีวิว)
----------------------------------------------------- */
window.addEventListener('load', function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('posted') === '1' && typeof showToast === 'function') {
        showToast('ร้านของคุณโพสต์เข้าชุมชนเรียบร้อยแล้ว! 🎉');
    }
    if (params.get('reviewed') === '1' && typeof showToast === 'function') {
        showToast('ขอบคุณสำหรับรีวิว! 🎉');
    }
});
