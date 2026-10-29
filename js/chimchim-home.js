// chimchim-home.js
// โค้ดเฉพาะหน้าแรกของแอป (home.html): แถบไอคอนหมวดหมู่, แท็บ Discovery Feed,
// การ์ดร้าน (ของทีมชิมชิม + ที่ชุมชนโพสต์), ค้นหาแบบพิมพ์กรองสด ๆ
// ทุกการ์ดกดแล้วพาไปหน้ารายละเอียดร้าน (restaurant.html) แทนที่ป็อปอัพเดิม
// (buildMiniCard ย้ายไปอยู่ chimchim-core.js แล้ว เพื่อให้หน้าอื่น เช่น วงล้อสุ่มเมนู เรียกใช้ได้ด้วย)

/* -----------------------------------------------------
   แบนเนอร์ขอตำแหน่งที่ตั้ง — โผล่ทันทีตอนเข้าหน้าแรก (แทนที่จะให้ต้องไปกดเองใน Settings)
   ถ้าเคยอนุญาต/เคยกดปิดไปแล้ว ไม่โผล่ซ้ำอีก ใช้ ขอตำแหน่งผู้ใช้() ตัวเดียวกับใน Settings เป๊ะ ๆ
----------------------------------------------------- */
/* -----------------------------------------------------
   คำทักทายบนสุดหน้าแรก — ล็อกอินแล้วทักด้วยชื่อ (เอาแค่ชื่อแรก) ไม่งั้นทักว่า "นักชิม"
   ข้อความแปลภาษาอยู่ใน span ที่มี data-i18n อยู่แล้ว เปลี่ยนภาษากลางหน้าก็อัปเดตเองได้
----------------------------------------------------- */
(function setupHomeGreeting() {
	var userEl = document.getElementById("homeGreetUser");
	if (!userEl) return;
	var session = getSession();
	var name = session && session.name ? String(session.name).trim().split(/\s+/)[0] : "";
	if (!name) return;
	document.getElementById("homeGreetName").textContent = name;
	document.getElementById("homeGreetGuest").hidden = true;
	userEl.hidden = false;
})();

var CHIMCHIM_LOCATION_PROMPT_DISMISSED_KEY = "chimchim_location_prompt_dismissed";
(function setupLocationPrompt() {
	var banner = document.getElementById("locationPrompt");
	if (!banner) return;
	if (getUserLocation() || localStorage.getItem(CHIMCHIM_LOCATION_PROMPT_DISMISSED_KEY)) return;

	banner.hidden = false;

	function dismiss() {
		banner.hidden = true;
		localStorage.setItem(CHIMCHIM_LOCATION_PROMPT_DISMISSED_KEY, "1");
	}

	document.getElementById("locationPromptCloseBtn").addEventListener("click", dismiss);
	document.getElementById("locationPromptAllowBtn").addEventListener("click", function() {
		var btn = this;
		btn.disabled = true;
		var originalHtml = btn.innerHTML;
		btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
		ขอตำแหน่งผู้ใช้().then(function() {
			dismiss();
			if (typeof showToast === "function") showToast(t("settings.locationSuccess"));
			if (typeof renderRecommendedRow === "function") renderRecommendedRow();
			if (typeof renderMatchHero === "function") renderMatchHero();
		}).catch(function() {
			dismiss();
			if (typeof showToast === "function") showToast(t("settings.locationError"));
		}).finally(function() {
			btn.disabled = false;
			btn.innerHTML = originalHtml;
		});
	});
})();

/* -----------------------------------------------------
   แถบหมวดหมู่อาหารหน้าเทรนด์ — กดหมวดไหนแล้วทั้งหน้า (แนะนำสำหรับคุณ + ฟีดชุมชน) กรองตามหมวดนั้นทันที
   จำหมวดที่เลือกไว้ใน sessionStorage กันหายตอนเลื่อนฟีดจนสุดแล้วรีเฟรชอัตโนมัติ
----------------------------------------------------- */
var currentTrendCat = sessionStorage.getItem('chimchim_trend_cat') || 'all';

// การ์ด "ให้ชิมชิมสุ่มร้าน" พาหมวดที่เลือกอยู่บนหน้านี้ไปเป็นตัวเลือกในหน้าสุ่มด้วย (เลือกทั้งหมด = ไม่ส่ง)
function updateRandomCtaLink() {
    var cta = document.getElementById('homeRandomCta');
    if (cta) cta.href = currentTrendCat === 'all' ? 'roulette.html' : 'roulette.html?cat=' + encodeURIComponent(currentTrendCat);
}
updateRandomCtaLink();

function renderTrendCatStrip() {
    var strip = document.getElementById('trendCatStrip');
    if (!strip) return;
    strip.innerHTML = '';

    var allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'trendcatchip' + (currentTrendCat === 'all' ? ' active' : '');
    allChip.setAttribute('data-cat', 'all');
    allChip.setAttribute('aria-pressed', currentTrendCat === 'all' ? 'true' : 'false');
    allChip.innerHTML = '<span class="trendcaticon" aria-hidden="true">🍽️</span><span data-i18n="home.catAll">' + t('home.catAll') + '</span>';
    // หมายเหตุ: data-i18n อยู่บน <span> ลูกโดยตรง (ไม่ใช่ .trendcatchip เอง) กัน applyI18n() ไปเขียนทับไอคอนหมวดด้วย
    strip.appendChild(allChip);

    กลุ่มหมวดหมู่.forEach(function(กลุ่ม) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'trendcatchip' + (currentTrendCat === กลุ่ม.key ? ' active' : '');
        chip.setAttribute('data-cat', กลุ่ม.key);
        chip.setAttribute('aria-pressed', currentTrendCat === กลุ่ม.key ? 'true' : 'false');
        chip.innerHTML = '<span class="trendcaticon" aria-hidden="true">' + กลุ่ม.emoji + '</span><span>' + catGroupLabel(กลุ่ม.key) + '</span>';
        strip.appendChild(chip);
    });

    strip.querySelectorAll('.trendcatchip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            currentTrendCat = this.getAttribute('data-cat');
            sessionStorage.setItem('chimchim_trend_cat', currentTrendCat);
            strip.querySelectorAll('.trendcatchip').forEach(function(c) {
                c.classList.remove('active');
                c.setAttribute('aria-pressed', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            updateRandomCtaLink();
            renderMatchHero();
            renderRecommendedRow();
            var feedContainer = document.getElementById('communityFeed');
            if (feedContainer && typeof renderCommunityFeed === 'function') {
                renderCommunityFeed(feedContainer, currentTrendCat);
            }
        });
    });
}

// currentTrendCat ตอนนี้เก็บ "กลุ่ม" (เช่น "นานาชาติ") ไม่ใช่หมวดย่อยเป๊ะ ๆ แล้ว
// ใช้ตัวนี้เช็คแทนการเทียบ === ตรง ๆ ทุกจุดที่กรองร้าน/โพสต์ตาม currentTrendCat
function ร้านอยู่ในหมวดที่เลือก(catOfItem, selected) {
    if (!selected || selected === 'all') return true;
    return หมวดย่อยในกลุ่ม(selected).indexOf(catOfItem) !== -1;
}

/* -----------------------------------------------------
   Match Hero — วงกลมเดียว แต่ภาพข้างในเลื่อนซ้ายขวาดูร้าน Match สูงสุดได้ทีละร้าน
   (Match% / ระยะทางจริง คำนวณจาก Food DNA ปัจจุบัน) ป้ายลอยอัปเดตตามภาพที่เลื่อนมาอยู่ตรงกลาง
   เรียก renderMatchHero() ซ้ำได้ทุกครั้งที่สลับภาษา เพื่อสร้างภาพชุดใหม่ให้ข้อความตรงโหมด
----------------------------------------------------- */
var mhState = { ranked: [], currentIndex: 0 };
var MH_MAX_SLIDES = 5;
function updateHeroBadges() {
    var item = mhState.ranked[mhState.currentIndex];
    if (!item) return;
    // % โชว์เฉพาะตอนมี Food DNA ของผู้ใช้จริง ไม่งั้นป้ายเดียวกันกลายเป็นปุ่มชวนทำ Food DNA แทน
    document.getElementById('mhMatchBadge').hidden = !foodDNAPersonal;
    document.getElementById('mhDnaCta').hidden = foodDNAPersonal;
    document.getElementById('mhMatchVal').textContent = matchHeadline(item.m);
    document.getElementById('mhDish').textContent = item.r.เมนู;
    document.getElementById('mhShop').textContent = item.r.ร้าน + ' · ฿' + item.r.ราคาต่ำ + '–' + item.r.ราคาสูง;
    document.getElementById('mhCircleWrap').setAttribute('aria-label',
        item.r.เมนู + ' · ' + item.r.ร้าน + ' — ' +
        t('home.heroSlideLabel').replace('{n}', mhState.currentIndex + 1).replace('{total}', mhState.ranked.length));
    document.querySelectorAll('#mhDots button').forEach(function(d, i) {
        d.setAttribute('aria-current', i === mhState.currentIndex ? 'true' : 'false');
    });
    // ระยะจริงจากหมุดร้านถึงตำแหน่งผู้ใช้ ถ้ามีพิกัดทั้งสองฝั่ง ไม่งั้นบอกตามจริงว่าเป็นระยะจากมหาลัย
    var dist = ข้อมูลระยะทาง(item.r);
    document.getElementById('mhDistVal').textContent = distanceText(dist.meters);
    var distLbl = document.getElementById('mhDistLbl');
    distLbl.textContent = ป้ายที่มาระยะทาง(dist);
    distLbl.removeAttribute('data-i18n');
}
function renderMatchHero() {
    var wrap = document.getElementById('matchHero');
    var slidesEl = document.getElementById('mhSlides');
    if (!wrap || !slidesEl) return;

    var mhPool = ร้านในพื้นที่().filter(function(r) { return ร้านอยู่ในหมวดที่เลือก(r.หมวด, currentTrendCat); });
    var mhDeduped = กรองรูปไม่ซ้ำ(
        mhPool
            .map(function(r) { return { r: r, m: คำนวณMatch(r, foodDNA) }; })
            .sort(function(a, b) { return b.m - a.m; }),
        function(item) { return item.r.รูป; }
    );
    mhState.ranked = หมุนเวียนตามวันนี้(mhDeduped, function(item) { return 'hero-' + item.r.id; }, MH_MAX_SLIDES);
    if (!mhState.ranked.length) {
        wrap.hidden = true;
        return;
    }
    mhState.currentIndex = 0;

    slidesEl.innerHTML = '';
    mhState.ranked.forEach(function(item) {
        var img = document.createElement('img');
        img.src = item.r.รูป;
        img.alt = '';
        slidesEl.appendChild(img);
    });
    var dotsEl = document.getElementById('mhDots');
    dotsEl.innerHTML = '';
    if (mhState.ranked.length > 1) {
        mhState.ranked.forEach(function(item, i) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', t('home.heroSlideLabel').replace('{n}', i + 1).replace('{total}', mhState.ranked.length));
            dot.addEventListener('click', function() { mhGoTo(i); });
            dotsEl.appendChild(dot);
        });
    }
    slidesEl.scrollLeft = 0;
    updateHeroBadges();

    if (!slidesEl.getAttribute('data-wired')) {
        slidesEl.setAttribute('data-wired', '1');
        var circle = document.getElementById('mhCircleWrap');
        function indexFromScroll() {
            var idx = Math.round(slidesEl.scrollLeft / (slidesEl.clientWidth || 1));
            return Math.max(0, Math.min(mhState.ranked.length - 1, idx));
        }
        var scrollTimer;
        slidesEl.addEventListener('scroll', function() {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                mhState.currentIndex = indexFromScroll();
                updateHeroBadges();
            }, 80);
        });
        // อ่านตำแหน่งจากภาพที่อยู่ตรงกลางตอนกดจริง ๆ ไม่ใช้ currentIndex ที่อาจยังไม่อัปเดต (กดตอนกำลังเลื่อน = เข้าผิดร้าน)
        function openCurrent() {
            var item = mhState.ranked[indexFromScroll()];
            if (item) window.location.href = 'restaurant.html?id=' + item.r.id;
        }
        circle.addEventListener('click', openCurrent);
        circle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') openCurrent();
            else if (e.key === 'ArrowRight') { e.preventDefault(); mhStopAuto(); mhGoTo(mhState.currentIndex + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); mhStopAuto(); mhGoTo(mhState.currentIndex - 1); }
        });
        document.getElementById('mhDnaCta').addEventListener('click', function() {
            // ยังไม่ล็อกอิน → สมัครก่อน (สมัครเสร็จระบบพาไปทำแบบทดสอบเอง) ล็อกอินแล้ว → ไปทำแบบทดสอบเลย
            if (!getSession() && typeof openAuthPop === 'function') openAuthPop('register');
            else window.location.href = 'profile-setup.html';
        });

        /* --- เลื่อนอัตโนมัติทีละร้านทุก 5 วิ — หยุดถาวรทันทีที่ผู้ใช้แตะ/ปัด/โฟกัส (กันภาพเลื่อนหนีตอนกำลังอ่าน)
           และไม่เลื่อนเองเลยถ้าระบบขอลดการเคลื่อนไหว --- */
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var mhAutoTimer = null;
        function mhStopAuto() {
            clearInterval(mhAutoTimer);
            mhAutoTimer = null;
        }
        if (!reduceMotion) {
            mhAutoTimer = setInterval(function() {
                if (mhState.ranked.length > 1) mhGoTo((mhState.currentIndex + 1) % mhState.ranked.length);
            }, 5000);
            ['pointerdown', 'touchstart', 'wheel'].forEach(function(evt) {
                slidesEl.addEventListener(evt, mhStopAuto, { passive: true });
            });
            circle.addEventListener('focus', mhStopAuto);
            dotsEl.addEventListener('pointerdown', mhStopAuto);
            dotsEl.addEventListener('focusin', mhStopAuto);
        }
    }
    wrap.hidden = false;
}
function mhGoTo(idx) {
    var slidesEl = document.getElementById('mhSlides');
    var n = mhState.ranked.length;
    if (!slidesEl || !n) return;
    idx = (idx + n) % n;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    slidesEl.scrollTo({ left: idx * slidesEl.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
}
renderMatchHero();

/* -----------------------------------------------------
   🎯 Recommended For You — เฉพาะร้าน Match 70% ขึ้นไป เรียงมากไปน้อย สูงสุด 6 ร้าน
----------------------------------------------------- */
function renderRecommendedRow() {
    var row = document.getElementById('recommendedRow');
    if (!row) return;
    row.innerHTML = '';
    var recPool = ร้านในพื้นที่().filter(function(r) { return ร้านอยู่ในหมวดที่เลือก(r.หมวด, currentTrendCat); });
    var recDeduped = กรองรูปไม่ซ้ำ(
        recPool
            .map(function(r) { return { r: r, m: คำนวณMatch(r, foodDNA) }; })
            .filter(function(x) { return x.m >= 70; })
            .sort(function(a, b) { return b.m - a.m; }),
        function(x) { return x.r.รูป; }
    );
    // ร้านที่อยู่ในวงกลมด้านบนแล้วไม่ต้องซ้ำในแถวนี้อีก (ถ้าตัดแล้วเหลือน้อยเกินไปค่อยยอมซ้ำ)
    var heroIds = {};
    mhState.ranked.forEach(function(item) { heroIds[item.r.id] = true; });
    var notInHero = recDeduped.filter(function(x) { return !heroIds[x.r.id]; });
    if (notInHero.length >= 3) recDeduped = notInHero;
    var แนะนำ = หมุนเวียนตามวันนี้(recDeduped, function(x) { return 'rec-' + x.r.id; }, 6);

    var recTitle = document.getElementById('recTitle');
    var recSub = document.getElementById('recSub');
    if (recTitle && recSub) {
        recTitle.setAttribute('data-i18n', foodDNAPersonal ? 'home.recommendedTitle' : 'home.recommendedTitleGuest');
        recSub.setAttribute('data-i18n', foodDNAPersonal ? 'home.recommendedSub' : 'home.recommendedSubGuest');
        recTitle.textContent = t(recTitle.getAttribute('data-i18n'));
        recSub.textContent = t(recSub.getAttribute('data-i18n'));
    }
    แนะนำ.forEach(function(x) {
        row.appendChild(buildMiniCard(x.r));
    });
    var emptyEl = document.getElementById('trendCatEmptyRec');
    if (แนะนำ.length === 0) {
        if (emptyEl) {
            emptyEl.hidden = false;
            emptyEl.textContent = currentTrendCat === 'all'
                ? t('home.recNoResultsAll')
                : t('home.recNoResultsCat');
        }
    } else if (emptyEl) {
        emptyEl.hidden = true;
    }
}
renderRecommendedRow();

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
            return '<a class="spitem" href="restaurant.html?id=' + r.id + '"><img src="' + safeImgSrc(r.รูป) + '" alt=""/><div><div class="sptit">' + escapeHtml(r.เมนู) + '</div><div class="spsub">' + escapeHtml(r.ร้าน) + '</div></div></a>';
        }).join("");

        var seenShops = {};
        var shopMatches = รายการร้าน.filter(function(r) {
            if (r.ร้าน.toLowerCase().indexOf(q) === -1) return false;
            if (seenShops[r.ร้าน]) return false;
            seenShops[r.ร้าน] = true;
            return true;
        }).slice(0, 4);
        var shopHtml = shopMatches.map(function(r) {
            return '<a class="spitem" href="restaurant.html?id=' + r.id + '"><img src="' + safeImgSrc(r.รูป) + '" alt=""/><div><div class="sptit">' + escapeHtml(r.ร้าน) + '</div><div class="spsub">' + catLabel(r.หมวด) + ' • ฿' + r.ราคาต่ำ + '–' + r.ราคาสูง + '</div></div></a>';
        }).join("");

        var people = [];
        // getUsers() เป็นแค่ cache ในเครื่องนี้ (คนที่เคยเห็นมาก่อนเท่านั้น) ไม่ใช่ทุกคนที่สมัครจริง
        // เลยค้นหาเพิ่มจาก Supabase จริงด้านล่างด้วย (ดู searchPeopleFromSupabase) ผลจะโผล่มาเพิ่มทีหลังแบบ progressive
        getUsers().forEach(function(u) {
            if (u.name && u.name.toLowerCase().indexOf(q) !== -1) {
                people.push({ id: u.id, name: u.name, sub: '<i class="fas fa-graduation-cap"></i> ' + t("common.member"), color: "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))" });
            }
        });

        function buildPeopleHtml(list) {
            return list.slice(0, 5).map(function(p) {
                return '<a class="spitem" href="public-profile.html?u=' + encodeURIComponent(p.id) + '"><div class="spavatar" style="background:' + p.color + ';">' + initials(p.name) + '</div><div><div class="sptit">' + escapeHtml(p.name) + '</div><div class="spsub">' + p.sub + '</div></div></a>';
            }).join("");
        }

        var locMatches = มหาวิทยาลัยทั้งหมด.filter(function(u) {
            return u.toLowerCase().indexOf(q) !== -1;
        }).slice(0, 3);
        var locHtml = locMatches.map(function(u) {
            return '<div class="spitem" data-goto-loc="' + escapeHtml(u) + '"><div class="spavatar" style="background:var(--green);"><i class="fas fa-location-dot"></i></div><div><div class="sptit">' + escapeHtml(u) + '</div><div class="spsub">' + t('search.locations') + '</div></div></div>';
        }).join("");

        var peopleHtml = buildPeopleHtml(people);
        // กลุ่ม "คน" ต้องมี wrapper เสมอ (ผลจาก Supabase มาเติมทีหลัง) เลยเช็คว่างจากเนื้อหาแต่ละกลุ่ม ไม่ใช่จาก html รวม
        var nothingFound = !foodHtml && !shopHtml && !peopleHtml && !locHtml;
        var html =
            buildGroup('search.food', foodHtml) +
            buildGroup('search.restaurants', shopHtml) +
            '<div id="spPeopleGroup">' + buildGroup('search.people', peopleHtml) + '</div>' +
            buildGroup('search.locations', locHtml);

        if (nothingFound) {
            html = '<div id="spPeopleGroup"></div>' +
                '<p class="spempty">' + t('search.noResults') + '<br><a href="roulette.html">' + t('search.tryRandom') + '</a></p>';
        }
        panel.innerHTML = html;
        panel.hidden = false;

        panel.querySelectorAll('[data-goto-loc]').forEach(function(el) {
            el.addEventListener('click', function() {
                input.value = this.getAttribute('data-goto-loc');
                panel.hidden = true;
            });
        });

        // ค้นหาคนจาก Supabase จริงด้วย (ครอบคลุมทุกคนที่สมัครจริง ไม่ใช่แค่คนที่เครื่องนี้เคยเห็นมาก่อน)
        // ผลมาทีหลัง (async) เลยต้องเช็คว่าช่องค้นหายังเป็นคำเดิมอยู่ไหมก่อนเอามาผสาน กันพิมพ์เปลี่ยนไปแล้วผลเก่าโผล่มาทับ
        if (typeof sbClient !== "undefined" && sbClient && q.length >= 2) {
            sbClient.from("profiles").select("id, name").ilike("name", "%" + qRaw.trim() + "%").limit(6).then(function(res) {
                if (res.error || !res.data || !res.data.length) return;
                if (input.value.trim().toLowerCase() !== q) return;
                var existingIds = {};
                people.forEach(function(p) { existingIds[p.id] = true; });
                res.data.forEach(function(row) {
                    if (existingIds[row.id]) return;
                    existingIds[row.id] = true;
                    people.push({ id: row.id, name: row.name, sub: '<i class="fas fa-graduation-cap"></i> ' + t("common.member"), color: "var(--avatar-grad, linear-gradient(135deg, #4a4852, #1f1e24))" });
                });
                var groupEl = document.getElementById("spPeopleGroup");
                if (groupEl) groupEl.innerHTML = buildGroup('search.people', buildPeopleHtml(people));
                var emptyEl = panel.querySelector(".spempty");
                if (emptyEl) emptyEl.remove();
            }).catch(function() {});
        }
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

renderTrendCatStrip();

/* ดึงร้านที่คนอื่นโพสต์ไว้ใน Supabase จริง (ข้ามเครื่อง) มาผสานกับ รายการร้าน หลัง render หน้าแรกเสร็จแล้ว
   แล้ว re-render ส่วนที่ขึ้นกับ รายการร้าน อีกครั้งเงียบ ๆ (ไม่บล็อกโหลดหน้าแรก) */
if (typeof syncShopsWithSupabase === "function") {
    syncShopsWithSupabase(function() {
        renderRecommendedRow();
        renderTrendCatStrip();
    });
}

/* ดึงโพสต์ของทุกคนจาก Supabase จริงมาผสานกับฟีดชุมชน + ดึงไลก์/ติดตามของตัวเองมาผสาน (accurate ข้ามเครื่อง)
   แล้ว re-render ฟีด (renderCommunityFeed มาจาก chimchim-community.js ที่โหลดทีหลังไฟล์นี้เสมอ) */
if (typeof syncPostsWithSupabase === "function") {
    syncPostsWithSupabase(function() {
        var feedContainer = document.getElementById('communityFeed');
        if (feedContainer && typeof renderCommunityFeed === "function") {
            renderCommunityFeed(feedContainer, currentTrendCat);
        }
    });
}
if (typeof syncLikesAndFollowsWithSupabase === "function") {
    syncLikesAndFollowsWithSupabase();
}

/* หมายเหตุ: ฟีดชุมชน (#communityFeed) render โดย renderCommunityFeed() ใน chimchim-community.js
   เพราะไฟล์นั้นโหลดทีหลังสุด (หลัง chimchim-home.js) และมีฟังก์ชัน openPostView/like ที่ฟีดต้องใช้ร่วมกัน
   (อ่าน currentTrendCat ที่ประกาศไว้ด้านบนไฟล์นี้ไปกรองด้วยตอนโหลดหน้าครั้งแรก)
   หมายเหตุ 2: หน้านี้ไม่มีกริด "ร้านทั้งหมด" (#mgrid) แล้ว เหลือแค่ "แนะนำสำหรับคุณ" (Food DNA Match) + ฟีดชุมชน
   ตามที่ตกลงไว้ — ดูร้านทีละร้านได้ผ่านการ์ดแนะนำ/ฟีด/ค้นหา ซึ่งลิงก์ไป restaurant.html โดยตรงอยู่แล้ว */

/* -----------------------------------------------------
   จัดการตอนถูกพามาที่หน้าแรกจากหน้าอื่น (หลังโพสต์ร้าน/หลังรีวิว)
----------------------------------------------------- */
window.addEventListener('load', function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('posted') === '1' && typeof showToast === 'function') {
        showToast(t('home.shopPostedToast'));
    }
    if (params.get('reviewed') === '1' && typeof showToast === 'function') {
        showToast(t('home.reviewThanksToast'));
    }
});


/* --- พื้นที่ที่เลือก (ปุ่มบนแถบบน) ยังไม่มีร้าน → บอกตรง ๆ ว่ายังไม่มี และที่โชว์คือร้านที่ใกล้ที่สุด --- */
(function showAreaNotice() {
	var box = document.getElementById("areaNotice");
	if (!box || typeof กรองร้านตามพื้นที่ !== "function") return;
	var info = กรองร้านตามพื้นที่(รายการร้าน);
	if (!info.area || !info.fallback) return;
	box.querySelector("span").textContent = info.list.length
		? t("area.noneNearestHint").replace("{area}", areaShortName(info.area)).replace("{km}", info.km)
		: t("area.noneAtAll").replace("{area}", areaShortName(info.area));
	box.hidden = false;
})();
