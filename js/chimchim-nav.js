// chimchim-nav.js
// เริ่มต้น AOS (animate-on-scroll) ให้ทุกหน้าที่มี data-aos
// (ระบบนำทางหลักตอนนี้คือแถบล่าง .appnav ในแต่ละหน้า ไม่ต้องมี JS แยกต่างหาก)

AOS.init({
    duration: 650,
    once: true,
    offset: 40
});

// กดปุ่ม "เทรนด์" ตอนที่อยู่หน้า home.html อยู่แล้ว ให้รีเฟรชหน้าใหม่ทุกครั้ง พร้อมสลับเนื้อหาใหม่
// (ปกติเบราว์เซอร์จะไม่ทำอะไรถ้ากดลิงก์ไปหน้าเดิมที่เปิดอยู่แล้ว)
// ตั้งค่าสถานะ "ขอสลับเนื้อหาใหม่" ไว้ใน sessionStorage แค่ตอนกดซ้ำเท่านั้น — เปิดเข้ามาปกติครั้งแรกจะไม่สลับ
// (chimchim-home.js / chimchim-community.js จะอ่านค่านี้ไปใช้ตอนเรนเดอร์ แล้วล้างทิ้งทันทีให้มีผลแค่รอบเดียว)
(function forceRefreshOnTrendingClick() {
    var onHome = /(^|\/)home\.html$/.test(window.location.pathname);
    if (!onHome) return;
    document.querySelectorAll('a.anitem[href="home.html"]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.setItem('chimchim_shuffle_feed', '1');
            window.location.reload();
        });
    });
})();
