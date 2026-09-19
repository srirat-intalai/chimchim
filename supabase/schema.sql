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
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'นักชิมชิมชิม'), upper(left(coalesce(new.raw_user_meta_data->>'name', 'C'), 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
