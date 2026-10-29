-- =====================================================================
-- ชิมชิม (CHIMCHIM) — Supabase schema (Phase 1)
-- รันไฟล์นี้ทั้งไฟล์ใน Supabase Dashboard → SQL Editor → New query → Run
-- ออกแบบให้ตรงกับโครงสร้างข้อมูลเดิมที่เคยเก็บใน localStorage ทุกจุด
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles — ข้อมูลผู้ใช้ ผูกกับ auth.users (Supabase Auth) แบบ 1:1
--    ไม่มีตาราง users แยกต่างหาก และไม่เก็บรหัสผ่านเองอีกต่อไป
--    Supabase Auth จัดการเรื่อง login/password/session ให้ทั้งหมด
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_text char(1),                         -- ตัวอักษรย่อชื่อ (ใช้ตอนยังไม่มีรูปโปรไฟล์จริง)
  food_dna jsonb,                               -- { chob_chat_ahan: [], chob_rot: [], ngob_chalia: int, raya_yom_pai: int, chob_muad: [] }
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. shops — ร้าน/เมนู (ทั้งร้านตั้งต้นในระบบ และร้านที่ผู้ใช้โพสต์เอง)
-- ---------------------------------------------------------------------
create table public.shops (
  id bigint generated always as identity primary key,
  vendor_id uuid references public.profiles(id) on delete set null,  -- null = ร้านตั้งต้นของระบบ
  menu_name text not null,          -- เมนู
  shop_name text not null,          -- ร้าน
  category text not null,           -- หมวด
  cuisine text,                     -- ชาติอาหาร
  flavors text[] default '{}',      -- รส
  price_low int not null,
  price_high int not null,
  distance_m int not null default 0,
  university text,                  -- มหาลัย
  is_trending boolean not null default false,
  meal_times text[] default '{}',   -- มื้อที่เหมาะ
  image_url text not null,
  tags text[] default '{}',
  hours text,
  promo text,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. pages — เพจร้านอาหารสไตล์ Facebook Page (ใครก็สร้างได้ 1 เพจ)
-- ---------------------------------------------------------------------
create table public.pages (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  avatar_url text,
  category text,
  bio text,
  created_at timestamptz not null default now(),
  unique (owner_id)                 -- 1 บัญชี สร้างได้ 1 เพจ
);

-- ---------------------------------------------------------------------
-- 4. posts — โพสต์รูป (โพสต์ในนามตัวเอง หรือในนามเพจก็ได้)
-- ---------------------------------------------------------------------
create table public.posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  page_id bigint references public.pages(id) on delete cascade,  -- null = โพสต์ในนามตัวเอง
  images text[] not null,           -- รองรับหลายรูปต่อโพสต์เหมือน IG
  caption text default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. comments — คอมเมนต์ใต้โพสต์
-- ---------------------------------------------------------------------
create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. reviews — รีวิวร้าน (ให้คะแนนไดโนเสาร์ 3 ด้าน)
-- ---------------------------------------------------------------------
create table public.reviews (
  id bigint generated always as identity primary key,
  shop_id bigint not null references public.shops(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,        -- เผื่อรีวิวแบบไม่ล็อกอิน (กรอกชื่อเอง)
  taste int not null check (taste between 1 and 5),
  atmosphere int not null check (atmosphere between 1 and 5),
  service int not null check (service between 1 and 5),
  text text default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. follows — Follow แบบรวมทุกประเภท (คน/ร้าน/เพจ) เป็นระบบเดียว
--    target_type บอกว่ากำลัง follow อะไรอยู่ ("profile" | "shop" | "page")
-- ---------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'shop', 'page')),
  target_id text not null,          -- เก็บเป็น text กันปัญหา id ต่างชนิดกัน (uuid/bigint)
  created_at timestamptz not null default now(),
  primary key (follower_id, target_type, target_id)
);

-- ---------------------------------------------------------------------
-- 8. likes_shops / likes_posts — กดถูกใจ (แยกจาก follow)
-- ---------------------------------------------------------------------
create table public.likes_shops (
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_id bigint not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create table public.likes_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id bigint not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- =====================================================================
-- Row Level Security (RLS) — เปิดทุกตาราง แล้วกำหนดว่าใครทำอะไรได้บ้าง
-- หลักการ: อ่านได้ทุกคน (public), เขียน/แก้/ลบได้เฉพาะเจ้าของข้อมูลเท่านั้น
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.pages enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reviews enable row level security;
alter table public.follows enable row level security;
alter table public.likes_shops enable row level security;
alter table public.likes_posts enable row level security;

-- profiles: ทุกคนอ่านได้ (โชว์โปรไฟล์สาธารณะ), แก้ไขได้เฉพาะของตัวเอง
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- shops: อ่านได้ทุกคน, โพสต์/แก้/ลบได้เฉพาะเจ้าของร้าน (vendor_id ตรงกับตัวเอง)
create policy "shops_select_all" on public.shops for select using (true);
create policy "shops_insert_own" on public.shops for insert with check (auth.uid() = vendor_id);
create policy "shops_update_own" on public.shops for update using (auth.uid() = vendor_id);
create policy "shops_delete_own" on public.shops for delete using (auth.uid() = vendor_id);

-- pages: อ่านได้ทุกคน, จัดการได้เฉพาะเจ้าของเพจ
create policy "pages_select_all" on public.pages for select using (true);
create policy "pages_insert_own" on public.pages for insert with check (auth.uid() = owner_id);
create policy "pages_update_own" on public.pages for update using (auth.uid() = owner_id);

-- posts: อ่านได้ทุกคน, โพสต์/ลบได้เฉพาะเจ้าของโพสต์
create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);

-- comments: อ่านได้ทุกคน, คอมเมนต์ได้ทุกคนที่ล็อกอิน, ลบได้เฉพาะคนคอมเมนต์เอง
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = author_id);

-- reviews: อ่านได้ทุกคน, เขียนได้ทุกคนที่ล็อกอิน
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_own" on public.reviews for insert with check (auth.uid() = user_id or user_id is null);

-- follows: เห็นได้ทุกคน, เพิ่ม/ลบได้เฉพาะของตัวเอง
create policy "follows_select_all" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

-- likes: เห็นได้ทุกคน, เพิ่ม/ลบได้เฉพาะของตัวเอง
create policy "likes_shops_select_all" on public.likes_shops for select using (true);
create policy "likes_shops_insert_own" on public.likes_shops for insert with check (auth.uid() = user_id);
create policy "likes_shops_delete_own" on public.likes_shops for delete using (auth.uid() = user_id);

create policy "likes_posts_select_all" on public.likes_posts for select using (true);
create policy "likes_posts_insert_own" on public.likes_posts for insert with check (auth.uid() = user_id);
create policy "likes_posts_delete_own" on public.likes_posts for delete using (auth.uid() = user_id);

-- =====================================================================
-- Trigger: สร้างแถว profiles อัตโนมัติทันทีที่มีคนสมัครสมาชิกใหม่ผ่าน Supabase Auth
-- (ดึงชื่อจาก user_metadata ที่ส่งมาตอน signUp)
-- =====================================================================
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_text)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'นักชิม ChimChim'), upper(left(coalesce(new.raw_user_meta_data->>'name', 'C'), 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Phase 2 — Moderation (รายงานเนื้อหา) + Analytics (เก็บสถิติการใช้งาน)
-- เพิ่มทีหลัง Phase 1 แต่รันไฟล์นี้ทั้งไฟล์ได้เลยรอบเดียว ไม่ต้องแยกรัน
-- =====================================================================

-- ---------------------------------------------------------------------
-- 9. moderation_reports — รายงานโพสต์/ร้านที่ไม่เหมาะสม (ผู้ใช้กดรายงานเอง)
--    ถึงเกณฑ์ (3 รายงานขึ้นไปต่อชิ้น) ระบบจะซ่อนเนื้อหานั้นออกจากฟีด/การค้นหาอัตโนมัติ
--    ยังไม่มีระบบแอดมินรีวิว เอาไว้ต่อยอดทีหลัง — ตอนนี้ปิดไว้ไม่ให้ใครอ่านรายงานคนอื่นได้เลย
-- ---------------------------------------------------------------------
create table public.moderation_reports (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post', 'shop')),
  target_id bigint not null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('spam', 'inappropriate', 'fake', 'other')),
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.posts add column is_hidden boolean not null default false;
alter table public.shops add column is_hidden boolean not null default false;

-- ถึงเกณฑ์ 3 รายงานต่อชิ้นเมื่อไหร่ ซ่อนอัตโนมัติทันที (เกณฑ์นี้ปรับได้ทีหลังถ้าจำเป็น)
create function public.check_report_threshold()
returns trigger as $$
declare
  report_count int;
begin
  select count(*) into report_count from public.moderation_reports
    where target_type = new.target_type and target_id = new.target_id;
  if report_count >= 3 then
    if new.target_type = 'post' then
      update public.posts set is_hidden = true where id = new.target_id;
    elsif new.target_type = 'shop' then
      update public.shops set is_hidden = true where id = new.target_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_report_created
  after insert on public.moderation_reports
  for each row execute function public.check_report_threshold();

alter table public.moderation_reports enable row level security;
-- รายงานได้เฉพาะคนที่ล็อกอิน ห้ามอ่านรายงานของคนอื่น (ไม่มี select policy = ปิดอ่านทุกคนโดย default)
create policy "reports_insert_authenticated" on public.moderation_reports for insert with check (auth.uid() is not null);

-- posts/shops: select เดิม (select_all) ยังใช้ได้ปกติ แต่ต้องแก้ query ฝั่งแอปให้กรอง is_hidden = false ออกเอง
-- (ไม่ผูก is_hidden ไว้ใน RLS policy ตรง ๆ เพราะเจ้าของเนื้อหาควรยังเห็นโพสต์/ร้านของตัวเองได้แม้โดนซ่อน)

-- ---------------------------------------------------------------------
-- 10. analytics_events — เก็บ event การใช้งานแบบเบา ๆ ไว้ดูภาพรวม (ไม่ใช่ analytics ระดับ production)
--     ตัวอย่าง event_type: app_open, dna_quiz_completed, ai_chat_message_sent,
--     shop_viewed, shop_liked, shop_followed, post_created, review_submitted, shop_posted
-- ---------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,  -- null = ผู้ใช้ยังไม่ล็อกอิน
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;
-- เขียนได้ทุกคน (รวมคนไม่ล็อกอิน) แต่อ่านไม่ได้เลยผ่าน anon key — ดึงสรุปได้เฉพาะฝั่ง dashboard ที่ใช้ service role key เท่านั้น
create policy "events_insert_all" on public.analytics_events for insert with check (true);

-- =====================================================================
-- Phase 3 — sync ข้อมูลผู้ใช้จริงทุกอย่างข้ามอุปกรณ์ (โปรไฟล์/โพสต์/รีวิว/ไลก์/ติดตาม)
-- รันต่อจาก Phase 1+2 ได้เลย (รันไฟล์นี้ทั้งไฟล์ซ้ำได้ปลอดภัย ยกเว้นส่วนนี้ที่เป็น ALTER ต้องรันครั้งเดียว)
-- =====================================================================

-- profiles: เพิ่ม bio + รูปโปรไฟล์จริง (เดิมมีแค่ avatar_text ตัวอักษรเดียว)
alter table public.profiles add column bio text;
alter table public.profiles add column avatar_url text;

-- posts.page_id เดิมอ้างอิงตาราง "pages" (ระบบเพจแยกต่างหากที่เลิกใช้แล้ว) — ตอนนี้ "เพจร้าน" กับ "ร้านของฉัน"
-- รวมเป็นเอนทิตีเดียวกันแล้วฝั่งแอป (ดู migratePageIntoShop ใน chimchim-core.js) เลยต้องย้ายให้ page_id
-- อ้างอิง "shops" แทน ไม่งั้นโพสต์ในนามร้านจะ insert ขึ้น Supabase ไม่ได้เพราะ id ไม่ตรงตารางที่ผูกไว้เดิม
alter table public.posts drop constraint posts_page_id_fkey;
alter table public.posts add constraint posts_shop_id_fkey foreign key (page_id) references public.shops(id) on delete cascade;

-- posts: ตอน Phase 1 ลืมใส่ policy update ไว้ (มีแค่ select/insert/delete) — ฟีเจอร์แก้ไขโพสต์ (updatePost)
-- เลยจะ push การแก้ไขขึ้น Supabase ไม่ได้เลยจนกว่าจะเพิ่มอันนี้ (ถูก RLS บล็อกเงียบ ๆ ไม่ error ที่เห็นชัด)
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);

-- =====================================================================
-- Phase 4 — แก้ไข/ลบรีวิวของตัวเอง + ลบร้านของฉัน
-- =====================================================================

-- reviews: เดิมมีแค่ select/insert (เขียนได้อย่างเดียว แก้/ลบไม่ได้เลย) — ฟีเจอร์แก้ไข/ลบรีวิวของตัวเอง
-- (updateReview/deleteReview) เลยต้องเพิ่ม policy นี้ก่อน ไม่งั้นจะถูก RLS บล็อกเหมือนที่เจอกับ posts มาก่อน
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews for update using (auth.uid() = user_id);
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews for delete using (auth.uid() = user_id);

-- =====================================================================
-- Phase 5 — seed ร้านตั้งต้น 11 ร้าน (จาก รายการร้าน ใน chimchim-data.js, id 101-111) เข้า Supabase จริง
-- เดิมร้านพวกนี้มีแค่ในโค้ดฝั่ง client เท่านั้น เลยกดไลก์/ติดตาม/รีวิวแล้ว sync ข้ามเครื่องไม่ได้เลย
-- (ชน foreign key เพราะ shops.id แถวนี้ไม่มีอยู่จริงใน Supabase) vendor_id เป็น null เพราะเป็น "ร้านตั้งต้นของระบบ"
-- ไม่ใช่ร้านที่ผู้ใช้โพสต์เอง — sbFetchCommunityShops() กรอง vendor_id ไม่ null อยู่แล้ว เลยไม่ซ้ำกับของเดิม
-- ใช้ OVERRIDING SYSTEM VALUE เพราะ id เป็น identity column ปกติกำหนดเองไม่ได้ ต้องบังคับให้ตรงกับ id
-- ที่ chimchim-data.js ใช้อยู่แล้วเป๊ะ — รันซ้ำได้ปลอดภัย (on conflict do nothing)
-- =====================================================================
insert into public.shops (id, vendor_id, menu_name, shop_name, category, cuisine, flavors, price_low, price_high, distance_m, university, is_trending, meal_times, image_url, tags, description)
overriding system value
values
  (101, null, 'ยำมะม่วงปูม้า', 'ร้านยำมะม่วงปูม้า ป้าใจดี', 'ยำ', 'ไทย', ARRAY['เผ็ด', 'เปรี้ยว'], 80, 150, 450, 'มหาวิทยาลัยกรุงเทพ', true, ARRAY['เที่ยง', 'เย็น'], 'img/bu/yammamuang/yammamuang-yum-mango-01.jpg', ARRAY['เผ็ด', 'ยำ', 'ทะเล'], ''),
  (102, null, 'หมูทอดคัตสึซอสสไตล์ญี่ปุ่น', 'MOM KITCHEN', 'อาหารญี่ปุ่น', 'ญี่ปุ่น', ARRAY['กลมกล่อม', 'เค็ม'], 150, 350, 300, 'มหาวิทยาลัยกรุงเทพ', true, ARRAY['เที่ยง', 'เย็น'], 'img/bu/momkitchen/momkitchen-katsu-set-01.jpg', ARRAY['ญี่ปุ่น', 'คัตสึ', 'สเต็ก'], ''),
  (103, null, 'ก๋วยเตี๋ยวหมูน้ำตก', 'กินเตี๋ยวบ้านแม่', 'ก๋วยเตี๋ยว', 'ไทย', ARRAY['เผ็ด', 'กลมกล่อม'], 40, 65, 600, 'มหาวิทยาลัยกรุงเทพ', false, ARRAY['เที่ยง', 'เย็น'], 'img/bu/kinteaw-banmae/kinteaw-banmae-noodle-soup-01.webp', ARRAY['เส้น', 'ก๋วยเตี๋ยว', 'งบน้อย'], ''),
  (104, null, 'ก๋วยเตี๋ยวเรือ', 'ก๋วยเตี๋ยวเรือยกซดมอกรุงเทพ', 'ก๋วยเตี๋ยว', 'ไทย', ARRAY['เผ็ด', 'เข้มข้น'], 50, 90, 700, 'มหาวิทยาลัยกรุงเทพ', true, ARRAY['เที่ยง', 'เย็น'], 'img/bu/boat-noodle/boat-noodle-boat-noodle-01.jpg', ARRAY['เส้น', 'ก๋วยเตี๋ยวเรือ', 'น้ำข้น'], ''),
  (105, null, 'ข้าวมันไก่', 'ข้าวมันไก่ลุงนวย', 'ข้าวแกง', 'ไทย', ARRAY['กลมกล่อม', 'เค็ม'], 45, 70, 350, 'มหาวิทยาลัยกรุงเทพ', false, ARRAY['เที่ยง', 'เย็น'], 'img/bu/khaomankai-luangnuay/khaomankai-luangnuay-roast-pork-rice-01.jpg', ARRAY['ข้าว', 'ข้าวมันไก่', 'งบน้อย'], ''),
  (106, null, 'อาหารตามสั่งครัวใบมิ้นท์', 'ครัวใบมิ้นท์', 'อาหารตามสั่ง', 'ไทย', ARRAY['กลมกล่อม', 'เผ็ด'], 50, 120, 500, 'มหาวิทยาลัยกรุงเทพ', false, ARRAY['เที่ยง', 'เย็น', 'ดึก'], 'img/bu/krua-baimint/krua-baimint-crispy-pork-basil.jpg', ARRAY['ข้าว', 'ตามสั่ง', 'เมนูเยอะ'], ''),
  (107, null, 'หม่าล่าทั่ง', 'ฉงเมาไท่ หม่าล่าทั่ง', 'หม่าล่า', 'จีน', ARRAY['เผ็ด'], 100, 250, 900, 'มหาวิทยาลัยกรุงเทพ', true, ARRAY['เย็น', 'ดึก'], 'img/bu/chongmaotai-mala/chongmaotai-mala-mala-bowl-01.jpg', ARRAY['เผ็ดมาก', 'จีน', 'หม่าล่า'], ''),
  (108, null, 'ตำยำยั่ว', 'ตำยำยั่ว By โบตั๋น', 'ส้มตำ', 'ไทย', ARRAY['เผ็ด', 'เปรี้ยว'], 40, 90, 400, 'มหาวิทยาลัยกรุงเทพ', false, ARRAY['เที่ยง', 'เย็น'], 'img/bu/tamyamyua-botan/tamyamyua-botan-yum-somtum.webp', ARRAY['เผ็ด', 'ส้มตำ', 'อีสาน'], ''),
  (109, null, 'ส้มตำแซ่บ', 'ร้านแอบแซ่บ', 'อีสาน', 'ไทย', ARRAY['เผ็ด', 'เปรี้ยว'], 35, 85, 550, 'มหาวิทยาลัยกรุงเทพ', false, ARRAY['เที่ยง', 'เย็น'], 'img/bu/aab-saep/aab-saep-somtum-seafood.jpg', ARRAY['เผ็ด', 'อีสาน', 'งบน้อย'], ''),
  (110, null, 'สเต็กเนื้อซอสพริกไทยดำ', 'แซมสเต็ก', 'สเต็ก', 'ฝรั่ง', ARRAY['เค็ม', 'กลมกล่อม'], 79, 159, 650, 'มหาวิทยาลัยกรุงเทพ', false, ARRAY['เที่ยง', 'เย็น'], 'img/bu/sam-steak/sam-steak-steak-gravy.jpg', ARRAY['สเต็ก', 'งบน้อย', 'จานเดียว'], ''),
  (111, null, 'ลาบหมูไข่ดาว', 'ไก่และไข่ขายข้าว', 'อีสาน', 'ไทย', ARRAY['เผ็ด', 'เค็ม'], 40, 69, 300, 'มหาวิทยาลัยกรุงเทพ', false, ARRAY['เที่ยง', 'เย็น', 'ดึก'], 'img/bu/kai-lae-khai-khaikhao/kai-lae-khai-khaikhao-pad-thai-01.webp', ARRAY['เผ็ด', 'ลาบ', 'งบน้อย'], '')
on conflict (id) do nothing;

-- แก้ sequence ของ id ให้ต่อจาก 111 (กันร้านชุมชนที่โพสต์ทีหลังได้ id ชนกับร้านตั้งต้นพวกนี้)
select setval(pg_get_serial_sequence('public.shops', 'id'), (select max(id) from public.shops));

-- =====================================================================
-- Phase 6 — มหาวิทยาลัยของผู้ใช้ทั่วไป + โพสต์/รีวิวหลายรูป + บันทึกร้านไว้ดูทีหลัง
-- ใช้ IF NOT EXISTS / CREATE TABLE IF NOT EXISTS ทุกจุด รันซ้ำได้ปลอดภัย
-- =====================================================================

-- 6.1 มหาวิทยาลัยของผู้ใช้ทั่วไป (เดิมมีแค่ของร้าน ไม่มีของโปรไฟล์คน)
alter table public.profiles add column if not exists university text;

-- 6.2 รูปเพิ่มเติมของร้าน (นอกเหนือจาก image_url ที่เป็นรูปปกหลัก) — แกลเลอรีร้าน
alter table public.shops add column if not exists images text[] default '{}';

-- 6.3 รูปแนบในรีวิว (เดิมรีวิวไม่มีรูปเลย)
alter table public.reviews add column if not exists images text[] default '{}';

-- 6.3b พิกัดจริงของร้าน (ไม่บังคับ) — เจ้าของร้านกดใช้ตำแหน่งปัจจุบันตอนโพสต์ได้ ถ้ามีพิกัดจริง
-- หน้าเว็บจะคำนวณระยะทางสดจากตำแหน่งจริงของผู้ชมแทนตัวเลขกะประมาณที่กรอกเอง (ดู shopToร้าน() ใน core.js)
alter table public.shops add column if not exists lat double precision;
alter table public.shops add column if not exists lng double precision;

-- 6.4 บันทึกร้านไว้ดูทีหลัง — แยกจาก likes_shops โดยเจตนา (ถูกใจ ≠ บันทึกไว้ดูทีหลัง)
create table if not exists public.saved_shops (
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_id bigint not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);
alter table public.saved_shops enable row level security;
-- Postgres ไม่รองรับ "create policy if not exists" จริง ๆ (ไม่มี syntax นี้) ใช้ drop policy if exists นำหน้าแทน
-- เพื่อให้สคริปต์นี้รันซ้ำได้ปลอดภัยเหมือนส่วนอื่นของไฟล์
drop policy if exists "saved_shops_select_own" on public.saved_shops;
create policy "saved_shops_select_own" on public.saved_shops for select using (auth.uid() = user_id);
drop policy if exists "saved_shops_insert_own" on public.saved_shops;
create policy "saved_shops_insert_own" on public.saved_shops for insert with check (auth.uid() = user_id);
drop policy if exists "saved_shops_delete_own" on public.saved_shops;
create policy "saved_shops_delete_own" on public.saved_shops for delete using (auth.uid() = user_id);

-- =====================================================================
-- Phase 7 — แก้ไขคอมเมนต์ของตัวเอง (ลบได้อยู่แล้วจาก comments_delete_own ด้านบน)
-- =====================================================================
drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- =====================================================================
-- Phase 8 — รายงานละเอียดขึ้น: เหตุผลเพิ่ม + รายงานความคิดเห็นได้ + เก็บรายละเอียดที่ผู้ใช้เขียน (คอลัมน์ note มีอยู่แล้ว)
-- (constraint เดิมตั้งชื่ออัตโนมัติตามรูปแบบ <table>_<column>_check ของ Postgres)
-- =====================================================================
alter table public.moderation_reports drop constraint if exists moderation_reports_target_type_check;
alter table public.moderation_reports add constraint moderation_reports_target_type_check
  check (target_type in ('post', 'shop', 'comment'));
alter table public.moderation_reports drop constraint if exists moderation_reports_reason_check;
alter table public.moderation_reports add constraint moderation_reports_reason_check
  check (reason in ('spam', 'inappropriate', 'fake', 'harassment', 'hate', 'violence', 'copyright', 'wrong_info', 'other'));
-- รายละเอียดยาวไม่เกิน 300 ตัวอักษร (เท่ากับที่ช่องเขียนในแอปจำกัดไว้)
alter table public.moderation_reports drop constraint if exists moderation_reports_note_length;
alter table public.moderation_reports add constraint moderation_reports_note_length check (char_length(note) <= 300);

-- =====================================================================
-- Phase 9 — ไลก์/คอมเมนต์ของ "โพสต์ตัวอย่างของร้านตั้งต้น" ให้คนอื่นเห็นด้วย
-- โพสต์พวกนี้ฝังอยู่ในโค้ดแอป (id แบบ "bu-yammamuang-post0") ไม่มีแถวในตาราง posts เลยใช้ post_id ไม่ได้
-- → เก็บด้วย post_key แทน (คอมเมนต์ใช้ตาราง comments เดิม / ไลก์แยกตาราง likes_seed_posts)
-- =====================================================================
alter table public.comments alter column post_id drop not null;
alter table public.comments add column if not exists post_key text;
alter table public.comments drop constraint if exists comments_target_check;
alter table public.comments add constraint comments_target_check
  check ((post_id is not null) or (post_key ~ '^bu-[a-z0-9-]+-post[0-9]+$'));
create index if not exists comments_post_key_idx on public.comments (post_key);

create table if not exists public.likes_seed_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_key text not null check (post_key ~ '^bu-[a-z0-9-]+-post[0-9]+$'),
  created_at timestamptz not null default now(),
  primary key (user_id, post_key)
);
alter table public.likes_seed_posts enable row level security;
-- นับไลก์ได้ทุกคน (เหมือน likes_posts) / กดหรือเลิกกดได้เฉพาะของตัวเอง
drop policy if exists "likes_seed_posts_select_all" on public.likes_seed_posts;
create policy "likes_seed_posts_select_all" on public.likes_seed_posts for select using (true);
drop policy if exists "likes_seed_posts_insert_own" on public.likes_seed_posts;
create policy "likes_seed_posts_insert_own" on public.likes_seed_posts for insert with check (auth.uid() = user_id);
drop policy if exists "likes_seed_posts_delete_own" on public.likes_seed_posts;
create policy "likes_seed_posts_delete_own" on public.likes_seed_posts for delete using (auth.uid() = user_id);

-- =====================================================================
-- Phase 10 — ซ่อนคอมเมนต์ที่ AI ตรวจแล้วว่าผิดจริงตามที่รายงาน
-- เซิร์ฟเวอร์ AI (server.js /api/moderate-comment) เป็นคนตั้งค่านี้ด้วย service role key เท่านั้น
-- ผู้ใช้ทั่วไปแก้ค่านี้ไม่ได้ (policy update ของ comments ให้แก้ได้เฉพาะคอมเมนต์ตัวเอง และแอปไม่ส่งคอลัมน์นี้)
-- =====================================================================
alter table public.comments add column if not exists is_hidden boolean not null default false;

-- =====================================================================
-- Phase 11 — จำกัดรูปต่อโพสต์/รีวิว "ไม่เกิน 10 รูป" ฝั่งฐานข้อมูลด้วย
-- (กันคนยิง request ตรงด้วย anon key ข้ามการจำกัดในหน้าเว็บ)
-- ปลอดภัยกับข้อมูลเดิม: ไม่ลบ/ไม่แก้แถวไหนเลย และใช้ NOT VALID = ตรวจเฉพาะแถวที่ insert/update ใหม่
-- โพสต์/รีวิวเก่าที่มีรูปเดียว (หรือไม่มีรูป) ใช้งานได้ตามเดิมทุกอย่าง
-- รันซ้ำได้ (drop constraint if exists ก่อนสร้างใหม่)
-- =====================================================================
-- ตรวจทุกรูป: เป็นรูป data URL (image/...) หรือลิงก์ http(s) และแต่ละรูปไม่เกิน ~1.5MB ตัวอักษร
create or replace function public.chimchim_images_ok(imgs text[])
returns boolean language sql immutable as $$
  select imgs is null or (
    coalesce(cardinality(imgs), 0) <= 10
    and not exists (
      select 1 from unnest(imgs) as u(src)
      where src is null
         or not (src like 'data:image/%' or src like 'https://%' or src like 'http://%' or src like 'img/%')
         or octet_length(src) > 1600000
    )
  );
$$;

alter table public.posts drop constraint if exists posts_images_limit;
alter table public.posts add constraint posts_images_limit
  check (cardinality(images) between 1 and 10 and public.chimchim_images_ok(images)) not valid;

alter table public.reviews drop constraint if exists reviews_images_limit;
alter table public.reviews add constraint reviews_images_limit
  check (public.chimchim_images_ok(images)) not valid;

-- =====================================================================
-- Phase 12 — บันทึกโพสต์ (ปุ่มบุ๊กมาร์กในหน้าดูโพสต์ → แท็บ "บันทึกไว้" ในโปรไฟล์)
-- post_key = id โพสต์จริง (ตัวเลข เป็นข้อความ) หรือโพสต์ตัวอย่างของร้านตั้งต้น ("bu-…-postN")
-- ไม่แตะตาราง/ข้อมูลเดิม รันซ้ำได้
-- =====================================================================
create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_key text not null check (post_key ~ '^([0-9]+|bu-[a-z0-9-]+-post[0-9]+)$'),
  created_at timestamptz not null default now(),
  primary key (user_id, post_key)
);
alter table public.saved_posts enable row level security;
-- รายการที่บันทึกเป็นเรื่องส่วนตัว เห็นได้เฉพาะเจ้าของ
drop policy if exists "saved_posts_select_own" on public.saved_posts;
drop policy if exists "saved_posts_insert_own" on public.saved_posts;
drop policy if exists "saved_posts_delete_own" on public.saved_posts;
drop policy if exists "saved_posts_select_own" on public.saved_posts;
create policy "saved_posts_select_own" on public.saved_posts for select using (auth.uid() = user_id);
drop policy if exists "saved_posts_insert_own" on public.saved_posts;
create policy "saved_posts_insert_own" on public.saved_posts for insert with check (auth.uid() = user_id);
drop policy if exists "saved_posts_delete_own" on public.saved_posts;
create policy "saved_posts_delete_own" on public.saved_posts for delete using (auth.uid() = user_id);

-- =====================================================================
-- Phase 13 — ล็อกสถานะ "ถูกซ่อน" (is_hidden) ไม่ให้เจ้าของเนื้อหาปลดซ่อนเองผ่าน API
-- เดิม policy update ของ posts/shops/comments อนุญาตให้เจ้าของแก้แถวตัวเองได้ทุกคอลัมน์ รวมถึง is_hidden
-- → โพสต์/ร้าน/คอมเมนต์ที่โดนรายงานจนถูกซ่อน เจ้าของยิง request ตั้ง is_hidden = false กลับได้เอง
-- trigger นี้คงค่าเดิมไว้ถ้าผู้แก้เป็นผู้ใช้ทั่วไป (anon/authenticated) ส่วนระบบซ่อนอัตโนมัติ (ฟังก์ชัน security definer)
-- และเซิร์ฟเวอร์ AI ที่ใช้ service role ยังเปลี่ยนได้ตามปกติ — ไม่แตะข้อมูลเดิม รันซ้ำได้
-- =====================================================================
create or replace function public.chimchim_lock_is_hidden()
returns trigger language plpgsql as $$
begin
  if new.is_hidden is distinct from old.is_hidden and current_user in ('anon', 'authenticated') then
    new.is_hidden := old.is_hidden;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_lock_is_hidden on public.posts;
create trigger posts_lock_is_hidden before update on public.posts
  for each row execute function public.chimchim_lock_is_hidden();
drop trigger if exists shops_lock_is_hidden on public.shops;
create trigger shops_lock_is_hidden before update on public.shops
  for each row execute function public.chimchim_lock_is_hidden();
drop trigger if exists comments_lock_is_hidden on public.comments;
create trigger comments_lock_is_hidden before update on public.comments
  for each row execute function public.chimchim_lock_is_hidden();

-- =====================================================================
-- Phase 14 — ต้องล็อกอินก่อนถึงจะรีวิวได้ + ล้างการติดตามนักรีวิวตัวอย่างที่ถูกลบออกจากแอป
-- เดิม reviews_insert_own อนุญาต user_id is null (รีวิวแบบไม่ล็อกอิน) → ใครก็ยิงรีวิวปลอม/สแปมด้วย anon key ได้
-- รีวิวเก่าที่มีอยู่แล้ว (รวมรีวิวแบบไม่ล็อกอินเดิม) ไม่ถูกลบหรือแก้ไข — มีผลเฉพาะการเพิ่มรีวิวใหม่ รันซ้ำได้
-- =====================================================================
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

-- นักรีวิวตัวอย่าง 8 คน (id "seed-…") ไม่มีในแอปแล้ว การติดตามที่ชี้ไปหาคนเหล่านี้เป็นข้อมูลค้างที่ไม่มีเจ้าของจริง
delete from public.follows where target_type = 'profile' and target_id like 'seed-%';

-- =====================================================================
-- Phase 15 — พิกัดจริงของร้านตั้งต้น (ใส่เฉพาะร้านที่ยืนยันหมุดได้จากแหล่งจริงแล้ว)
-- 101 ร้านยำมะม่วงปูม้า ป้าใจดี — หมุด Google Maps ของร้าน (ซ.รังสิตภิรมย์ ข้าง ม.กรุงเทพ รังสิต)
-- ไม่ทับพิกัดที่มีอยู่แล้ว รันซ้ำได้
-- =====================================================================
update public.shops set lat = 14.0409189, lng = 100.6146675, distance_m = 970
  where id = 101 and lat is null;

-- =====================================================================
-- Phase 16 — เก็บรูปโพสต์/รีวิวใน Supabase Storage + โพสต์ข้อความล้วนได้
-- ปัญหาเดิม: รูปทุกรูปเป็น base64 ยัดในแถว posts/reviews → ถูกดึงไปเก็บใน localStorage ของทุกเครื่องที่เปิดฟีด
-- จนเครื่องเต็ม แล้วโพสต์ใหม่ขึ้น "บันทึกไม่สำเร็จ ลองลดจำนวนรูป…" ทั้งที่เลือกแค่ไม่กี่รูป
-- ตอนนี้แอปอัปไฟล์ขึ้น bucket "chimchim-images" แล้วเก็บแค่ URL ในแถว (CHECK เดิมรับ https:// อยู่แล้ว)
-- ไม่ลบ/ไม่แก้แถวเดิม — โพสต์/รีวิวเก่าที่เป็น base64 ยังแสดงได้ตามเดิม รันซ้ำได้
-- (ถ้ายังไม่รัน Phase นี้ แอปยังโพสต์รูปได้ด้วยวิธีเดิม แต่โพสต์ข้อความล้วนจะถูกปฏิเสธ)
-- =====================================================================
-- bucket สาธารณะ (อ่านรูปผ่าน URL ได้ทุกคนเหมือนรูปในฟีด) จำกัด 5MB/ไฟล์ และรับเฉพาะไฟล์รูป
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chimchim-images', 'chimchim-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ผู้ใช้ที่ล็อกอินอัป/ลบได้เฉพาะไฟล์ในโฟลเดอร์ของตัวเอง (<user id>/posts/... หรือ <user id>/reviews/...)
-- ไม่มี policy update = เขียนทับไฟล์เดิมไม่ได้ / select เฉพาะของตัวเอง (ใช้ตอนลบ) — การดูรูปใช้ URL สาธารณะ ไม่ต้องผ่าน policy
drop policy if exists "chimchim_images_insert_own" on storage.objects;
create policy "chimchim_images_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'chimchim-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "chimchim_images_select_own" on storage.objects;
create policy "chimchim_images_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'chimchim-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "chimchim_images_delete_own" on storage.objects;
create policy "chimchim_images_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'chimchim-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- รีวิวมีรูปได้ (ซ้ำกับ Phase 6 เผื่อยังไม่เคยรัน — ไม่มีผลถ้ามีคอลัมน์แล้ว)
alter table public.reviews add column if not exists images text[] default '{}';

-- ฟังก์ชันตรวจรูป (เหมือน Phase 11 ทุกอย่าง — ใส่ซ้ำให้ Phase นี้รันเดี่ยว ๆ ได้)
create or replace function public.chimchim_images_ok(imgs text[])
returns boolean language sql immutable as $$
  select imgs is null or (
    coalesce(cardinality(imgs), 0) <= 10
    and not exists (
      select 1 from unnest(imgs) as u(src)
      where src is null
         or not (src like 'data:image/%' or src like 'https://%' or src like 'http://%' or src like 'img/%')
         or octet_length(src) > 1600000
    )
  );
$$;

-- posts: โพสต์ข้อความล้วนได้ (0-10 รูป แทน 1-10) — ไม่ส่งรูปมา = อาร์เรย์ว่าง
alter table public.posts alter column images set default '{}';
alter table public.posts drop constraint if exists posts_images_limit;
alter table public.posts add constraint posts_images_limit
  check (coalesce(cardinality(images), 0) <= 10 and public.chimchim_images_ok(images)) not valid;
alter table public.reviews drop constraint if exists reviews_images_limit;
alter table public.reviews add constraint reviews_images_limit
  check (public.chimchim_images_ok(images)) not valid;

-- =====================================================================
-- Phase 17 — โพสต์ในนามร้านได้เฉพาะเจ้าของร้านจริง (ระบบสลับโปรไฟล์)
-- เดิม posts_insert_own เช็คแค่ auth.uid() = user_id → ใครก็ใส่ page_id เป็นร้านของคนอื่นแล้วโพสต์ในนามร้านนั้นได้
-- ตอนนี้ฐานข้อมูลตรวจซ้ำเองว่า page_id (ถ้ามี) เป็นร้านที่ vendor_id = ผู้โพสต์ และร้านไม่ถูกซ่อน/ปิดใช้งาน
-- ไม่เชื่อค่า "โปรไฟล์ที่ใช้งานอยู่" จากหน้าเว็บ — ไม่แตะแถวเดิม (โพสต์เก่าทุกโพสต์ยังอยู่ครบ) รันซ้ำได้
-- =====================================================================
create or replace function public.chimchim_can_post_as_shop(shop_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select shop_id is null or exists (
    select 1 from public.shops s
    where s.id = shop_id and s.vendor_id = auth.uid() and not s.is_hidden
  );
$$;

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts for insert
  with check (auth.uid() = user_id and public.chimchim_can_post_as_shop(page_id));

-- แก้ไขโพสต์: ต้องเป็นเจ้าของโพสต์ และถ้าย้าย/คงไว้ในนามร้าน ร้านนั้นต้องเป็นของตัวเองด้วย
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.chimchim_can_post_as_shop(page_id));

-- =====================================================================
-- Phase 18 — ตัวเลขของร้าน (ราคา/ระยะทาง) ต้องถูกต้องเสมอ แม้ยิง API ข้ามหน้าเว็บ
-- คอลัมน์เป็น int อยู่แล้ว (ตัวอักษรเข้าไม่ได้) เพิ่มกติกาเดียวกับหน้า Settings (validateShopNumbers ใน core.js):
-- ราคา 1–100,000 บาท / ราคาต่ำ ≤ ราคาสูง / ระยะทาง 0–100,000 เมตร (ไม่ติดลบ)
-- NOT VALID = ตรวจเฉพาะแถวที่ insert/update ใหม่ ไม่แตะร้านเดิม (ร้านตั้งต้นทั้งหมดอยู่ในช่วงนี้อยู่แล้ว) รันซ้ำได้
-- =====================================================================
alter table public.shops drop constraint if exists shops_price_range;
alter table public.shops add constraint shops_price_range
  check (price_low between 1 and 100000 and price_high between 1 and 100000 and price_low <= price_high) not valid;
alter table public.shops drop constraint if exists shops_distance_range;
alter table public.shops add constraint shops_distance_range
  check (distance_m between 0 and 100000) not valid;

-- =====================================================================
-- Phase 19 — ตรวจสอบร้านที่ผู้ใช้เพิ่มก่อนเข้าระบบแนะนำ/สุ่ม
-- review_status: pending (รอตรวจ) / approved (ทีมตรวจข้อมูลร้านแล้ว) / rejected (ไม่ผ่าน)
-- "ตรวจข้อมูลร้าน" = ชื่อ ที่ตั้ง รูป หมวด มีอยู่จริงและถูกต้อง — ไม่ใช่การรับรองรสชาติ/คุณภาพอาหาร
-- - ร้านตั้งต้นของระบบ (vendor_id null) = approved / ร้านที่ผู้ใช้เพิ่มไว้แล้วทั้งหมด = pending (ยังไม่เคยมีใครตรวจ)
-- - ร้านใหม่ที่ผู้ใช้เพิ่ม = pending เสมอ / เจ้าของเปลี่ยนสถานะเองผ่าน API ไม่ได้ (trigger คงค่าเดิมไว้ แบบเดียวกับ is_hidden)
-- - เจ้าของแก้ข้อมูลหลัก (ชื่อ/เมนู/หมวด/รูป/พิกัด/มหาลัย) → กลับไป pending ให้ตรวจใหม่ (กันผ่านแล้วค่อยเปลี่ยนเป็นร้านอื่น)
-- - ร้านที่ไม่ผ่าน: เห็นได้เฉพาะเจ้าของ (จะได้รู้เหตุผลและแก้ไข) / ร้านรอตรวจ: ยังเปิดหน้าร้าน/ค้นหาเจอได้ปกติ
-- เปลี่ยนสถานะได้เฉพาะ service role (scripts/admin-review-shops.js) — ไม่ลบ/ไม่แก้ข้อมูลร้านเดิม รันซ้ำได้
-- =====================================================================
-- เพิ่มคอลัมน์พร้อม default 'pending' = ทุกแถวเดิมเป็น pending ทันที โดยไม่ต้อง UPDATE ร้านของผู้ใช้
-- (UPDATE จะตรวจ constraint NOT VALID ของ Phase 18 ซ้ำ ร้านเก่าที่ตัวเลขผิดกติกาจะทำให้ทั้งสคริปต์ล้ม)
alter table public.shops add column if not exists review_status text not null default 'pending';
alter table public.shops add column if not exists review_note text;
alter table public.shops add column if not exists reviewed_at timestamptz;
alter table public.shops drop constraint if exists shops_review_status_check;
alter table public.shops add constraint shops_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));
-- ร้านตั้งต้นของระบบ (ทีมใส่เอง ผู้ใช้สร้าง vendor_id null ไม่ได้ตาม policy insert) = ผ่านการตรวจแล้ว
update public.shops set review_status = 'approved'
  where vendor_id is null and review_status = 'pending';

create or replace function public.chimchim_shop_review_guard()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.review_status := 'pending';
    new.review_note := null;
    new.reviewed_at := null;
    return new;
  end if;
  new.review_status := old.review_status;
  new.review_note := old.review_note;
  new.reviewed_at := old.reviewed_at;
  if (new.shop_name, new.menu_name, new.category, new.image_url, new.lat, new.lng, new.university)
     is distinct from (old.shop_name, old.menu_name, old.category, old.image_url, old.lat, old.lng, old.university) then
    new.review_status := 'pending';
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists shops_review_guard on public.shops;
create trigger shops_review_guard before insert or update on public.shops
  for each row execute function public.chimchim_shop_review_guard();

drop policy if exists "shops_select_all" on public.shops;
drop policy if exists "shops_select_visible" on public.shops;
create policy "shops_select_visible" on public.shops for select
  using (review_status <> 'rejected' or auth.uid() = vendor_id);

-- =====================================================================
-- Phase 20 — Token สำหรับช่อง Prompt บนหน้าสุ่มร้าน (ไข่ปริศนา)
-- กติกา: สมาชิกได้ฟรีวันละ 5 Token (นับวันตามเวลาไทย ไม่สะสมข้ามวัน) / ให้ AI ตีความ Prompt 1 ครั้ง = 1 Token
-- - การสุ่มพื้นฐานและตัวเลือกเพิ่มเติม (งบ/หมวด/ระยะ) ฟรีเสมอ ไม่ใช้ Token
-- - หักที่เซิร์ฟเวอร์เท่านั้น (server.js ใช้ service role เรียก chimchim_spend_prompt_token) ผู้ใช้เขียนตารางนี้เองไม่ได้
-- - request_id ไม่ซ้ำ = กดซ้ำ/ส่งซ้ำด้วยคำขอเดิมไม่หักซ้ำ (ได้ผลเดิมกลับไป)
-- - AI ล้มเหลว หรืออ่านไม่พบเงื่อนไขเรื่องอาหารเลย → เซิร์ฟเวอร์คืน Token (status = refunded)
-- - AI ตีความได้แล้วแม้ไม่เจอร้านตรงเงื่อนไข = หักตามปกติ (แอปแจ้งก่อนกดยืนยัน)
-- ไม่เก็บข้อความ Prompt ของผู้ใช้ เก็บแค่เงื่อนไขที่ AI แปลงได้ (ใช้ตอบซ้ำเมื่อส่ง request_id เดิม) รันซ้ำได้
-- =====================================================================
create table if not exists public.prompt_token_spends (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null unique,
  spent_on date not null,
  status text not null default 'charged' check (status in ('charged', 'refunded')),
  result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists prompt_token_spends_user_day on public.prompt_token_spends (user_id, spent_on);
alter table public.prompt_token_spends enable row level security;
drop policy if exists "prompt_token_spends_select_own" on public.prompt_token_spends;
create policy "prompt_token_spends_select_own" on public.prompt_token_spends for select using (auth.uid() = user_id);
-- ไม่มี policy insert/update/delete = ผู้ใช้ทั่วไปเพิ่ม/แก้/ลบแถวเองไม่ได้ (service role ข้าม RLS ได้)

create or replace function public.chimchim_prompt_daily_tokens()
returns int language sql immutable as $$ select 5 $$;

-- ยอดคงเหลือวันนี้ของผู้ใช้ที่ล็อกอินอยู่ (หน้าเว็บเรียกได้ — อ่านของตัวเองเท่านั้น)
create or replace function public.chimchim_prompt_tokens_left()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'daily', public.chimchim_prompt_daily_tokens(),
    'left', greatest(0, public.chimchim_prompt_daily_tokens() - (
      select count(*)::int from public.prompt_token_spends
      where user_id = auth.uid() and status = 'charged'
        and spent_on = (now() at time zone 'Asia/Bangkok')::date
    ))
  );
$$;
revoke execute on function public.chimchim_prompt_tokens_left() from public, anon;
grant execute on function public.chimchim_prompt_tokens_left() to authenticated;

-- หัก 1 Token แบบ atomic (ล็อกต่อผู้ใช้ กันยิงพร้อมกันหลายคำขอจนเกินโควตา)
-- คืน { status: charged | replay | in_progress | insufficient | conflict, left, result? }
create or replace function public.chimchim_spend_prompt_token(p_user uuid, p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  daily int := public.chimchim_prompt_daily_tokens();
  used int;
  existing public.prompt_token_spends%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 20));
  select count(*)::int into used from public.prompt_token_spends
    where user_id = p_user and status = 'charged' and spent_on = today;
  select * into existing from public.prompt_token_spends where request_id = p_request;
  if found then
    if existing.user_id <> p_user then
      return jsonb_build_object('status', 'conflict');
    end if;
    if existing.status = 'charged' then
      -- คำขอเดิมที่ประมวลผลเสร็จแล้ว → ส่งผลเดิม ไม่หักซ้ำ / ยังไม่เสร็จ → บอกให้รอ (กันเรียก AI ฟรีซ้ำ ๆ)
      return jsonb_build_object('status', case when existing.result is null then 'in_progress' else 'replay' end,
        'left', greatest(0, daily - used), 'result', existing.result);
    end if;
    -- เคยถูกคืน Token (AI ล้มเหลว) แล้วผู้ใช้ลองใหม่ด้วยคำขอเดิม → หักใหม่ได้ถ้ายังมีโควตา
    if used >= daily then
      return jsonb_build_object('status', 'insufficient', 'left', 0);
    end if;
    update public.prompt_token_spends set status = 'charged', spent_on = today, result = null where id = existing.id;
    return jsonb_build_object('status', 'charged', 'left', daily - used - 1);
  end if;
  if used >= daily then
    return jsonb_build_object('status', 'insufficient', 'left', 0);
  end if;
  insert into public.prompt_token_spends (user_id, request_id, spent_on) values (p_user, p_request, today);
  return jsonb_build_object('status', 'charged', 'left', daily - used - 1);
end;
$$;
revoke execute on function public.chimchim_spend_prompt_token(uuid, uuid) from public, anon, authenticated;
grant execute on function public.chimchim_spend_prompt_token(uuid, uuid) to service_role;

-- =====================================================================
-- Phase 21 — ไดอารี่อาหาร (Food Diary) — บันทึกมื้ออาหารส่วนตัว อ่าน/เขียนได้เฉพาะเจ้าของ
-- หน้า diary.html และส่วน "ไดอารี่ของฉัน" ในโปรไฟล์ใช้ตารางนี้ชุดเดียวกัน (js/chimchim-diary-store.js)
-- รูปอยู่ใน Storage bucket "chimchim-images" โฟลเดอร์ <user id>/diary/ (policy อัปไฟล์จาก Phase 16 ใช้ได้เลย)
-- หมายเหตุ: bucket เป็นสาธารณะ — คนที่มี URL รูปเปิดดูรูปได้ (URL สุ่มเดายาก) แต่ข้อความบันทึกเห็นได้เฉพาะเจ้าของ
-- ไม่แตะตารางอื่น รันซ้ำได้
-- =====================================================================
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  eaten_on date not null,
  eaten_at time,
  dish text not null check (char_length(btrim(dish)) between 1 and 80),
  shop_name text check (shop_name is null or char_length(shop_name) <= 80),
  shop_id bigint references public.shops(id) on delete set null,
  rating smallint check (rating is null or rating between 1 and 5),
  note text check (note is null or char_length(note) <= 500),
  image_url text check (image_url is null or image_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists diary_entries_user_day on public.diary_entries (user_id, eaten_on desc);
alter table public.diary_entries enable row level security;
drop policy if exists "diary_select_own" on public.diary_entries;
create policy "diary_select_own" on public.diary_entries for select using (auth.uid() = user_id);
drop policy if exists "diary_insert_own" on public.diary_entries;
create policy "diary_insert_own" on public.diary_entries for insert with check (auth.uid() = user_id);
drop policy if exists "diary_update_own" on public.diary_entries;
create policy "diary_update_own" on public.diary_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "diary_delete_own" on public.diary_entries;
create policy "diary_delete_own" on public.diary_entries for delete using (auth.uid() = user_id);

-- =====================================================================
-- Phase 22 — ความเป็นส่วนตัวของไดอารี่อาหาร
-- profiles.diary_visibility: 'private' (ค่าเริ่มต้น — เห็นเฉพาะเจ้าของ) / 'public' (ผู้ใช้ที่ล็อกอินแล้วทุกคนเห็นได้)
-- บังคับที่ RLS ของ diary_entries จริง ไม่ใช่แค่ซ่อนบนหน้าจอ — ยิง API ตรงก็อ่านไดอารี่ส่วนตัวของคนอื่นไม่ได้
-- ไม่มีระดับ "เฉพาะผู้ติดตาม" เพราะระบบติดตามของแอปเป็นแบบทางเดียว ใครก็กดติดตามได้ จึงกันใครไม่ได้จริง
-- ไดอารี่ทุกเล่มที่มีอยู่แล้วเป็น private (ไม่เปิดเผยของใครโดยไม่ได้ตั้งใจ) / แก้/เพิ่ม/ลบ ยังทำได้เฉพาะเจ้าของ รันซ้ำได้
-- =====================================================================
alter table public.profiles add column if not exists diary_visibility text not null default 'private';
alter table public.profiles drop constraint if exists profiles_diary_visibility_check;
alter table public.profiles add constraint profiles_diary_visibility_check check (diary_visibility in ('private', 'public'));

create or replace function public.chimchim_diary_is_public(owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = owner and p.diary_visibility = 'public');
$$;

drop policy if exists "diary_select_own" on public.diary_entries;
drop policy if exists "diary_select_visible" on public.diary_entries;
create policy "diary_select_visible" on public.diary_entries for select
  using (auth.uid() = user_id or (auth.uid() is not null and public.chimchim_diary_is_public(user_id)));

-- =====================================================================
-- Phase 23 — ไดอารี่บันทึกได้เฉพาะ "วันนี้และเมื่อวาน" (เวลาไทย Asia/Bangkok)
-- ไดอารี่เป็นความทรงจำของแต่ละวัน ไม่ใช่ที่เติมย้อนหลังได้ตลอด — เมื่อวานยังทันเผื่อมื้อดึก/ลืมบันทึกก่อนนอน
-- บังคับที่ RLS ตอนเพิ่ม/แก้ (หน้าเว็บกันซ้ำอีกชั้น) / บันทึกเก่าทุกรายการยังอยู่ เปิดดูและลบได้ตามเดิม
-- เปลี่ยนจำนวนวันได้ที่ chimchim_diary_open_from() จุดเดียว (ให้ตรงกับ DIARY_OPEN_DAYS ใน chimchim-diary-store.js) รันซ้ำได้
-- =====================================================================
create or replace function public.chimchim_diary_today()
returns date language sql stable as $$ select (now() at time zone 'Asia/Bangkok')::date $$;
create or replace function public.chimchim_diary_open_from()
returns date language sql stable as $$ select public.chimchim_diary_today() - 1 $$;

drop policy if exists "diary_insert_own" on public.diary_entries;
create policy "diary_insert_own" on public.diary_entries for insert
  with check (auth.uid() = user_id and eaten_on between public.chimchim_diary_open_from() and public.chimchim_diary_today());
drop policy if exists "diary_update_own" on public.diary_entries;
create policy "diary_update_own" on public.diary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and eaten_on between public.chimchim_diary_open_from() and public.chimchim_diary_today());
