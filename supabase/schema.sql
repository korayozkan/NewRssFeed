-- NewRssFeed — Supabase Şema Tanımı
-- Supabase Dashboard > SQL Editor'e yapıştırarak çalıştırın.
-- Önce var olan tabloları drop etmek için: DROP TABLE IF EXISTS ... CASCADE;

-- feeds tablosu
create table if not exists public.feeds (
  id text not null,
  user_id uuid references auth.users not null,
  name text not null,
  url text not null,
  favicon text,
  created_at timestamptz default now(),
  primary key (id, user_id)
);
alter table public.feeds enable row level security;
create policy "Users own feeds" on public.feeds
  for all using (auth.uid() = user_id);

-- notes tablosu
create table if not exists public.notes (
  article_id text not null,
  user_id uuid references auth.users not null,
  content text,
  updated_at timestamptz default now(),
  primary key (article_id, user_id)
);
alter table public.notes enable row level security;
create policy "Users own notes" on public.notes
  for all using (auth.uid() = user_id);

-- highlights tablosu
create table if not exists public.highlights (
  article_id text not null,
  user_id uuid references auth.users not null,
  data jsonb,
  updated_at timestamptz default now(),
  primary key (article_id, user_id)
);
alter table public.highlights enable row level security;
create policy "Users own highlights" on public.highlights
  for all using (auth.uid() = user_id);

-- read_history tablosu
create table if not exists public.read_history (
  article_id text not null,
  user_id uuid references auth.users not null,
  read_at bigint,
  primary key (article_id, user_id)
);
alter table public.read_history enable row level security;
create policy "Users own read_history" on public.read_history
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFIL TABLOSU
-- Kullanıcı adı, bio, avatar URL, sosyal linkler
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  website text,
  twitter_handle text,
  github_handle text,
  -- istatistikler (denormalize, periyodik güncellenir)
  total_articles_read integer default 0,
  total_feeds integer default 0,
  current_streak integer default 0,
  best_streak integer default 0,
  total_xp integer default 0,
  level integer default 1,
  -- aktivite geçmişi — { "2026-11-01": 5, ... } formatında JSON
  read_activity jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
-- Herkes profilleri okuyabilir (sosyal özellik için)
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
-- Sadece sahip kendi profilini güncelleyebilir
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Yeni kullanıcı kaydolduğunda otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROZETLER TABLOSU
-- Kullanıcının kazandığı rozetler
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  badge_id text not null,
  earned_at timestamptz default now(),
  unique (user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "Badges are viewable by everyone" on public.user_badges
  for select using (true);
create policy "Users can insert own badges" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ARKADAŞLIK TABLOSU
-- İki yönlü arkadaşlık isteği sistemi
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users on delete cascade not null,
  addressee_id uuid references auth.users on delete cascade not null,
  -- pending | accepted | rejected | blocked
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (requester_id, addressee_id),
  -- Aynı çift iki kez kayıt olmasın
  check (requester_id <> addressee_id)
);
alter table public.friendships enable row level security;
create policy "Users can see their own friendships" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users can send friend requests" on public.friendships
  for insert with check (auth.uid() = requester_id);
create policy "Users can update received requests" on public.friendships
  for update using (auth.uid() = addressee_id or auth.uid() = requester_id);
create policy "Users can delete own friendships" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- HAFTALIK XP TABLOSU (liderlik tablosu için)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.weekly_xp (
  user_id uuid references auth.users on delete cascade not null,
  week_start date not null,        -- Haftanın Pazartesi tarihi
  xp integer default 0,
  primary key (user_id, week_start)
);
alter table public.weekly_xp enable row level security;
create policy "Weekly XP viewable by everyone" on public.weekly_xp
  for select using (true);
create policy "Users can upsert own weekly xp" on public.weekly_xp
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FONKSİYON: Arkadaş sayısını döndür
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_friend_counts(uid uuid)
returns table(followers bigint, following bigint) language sql security definer as $$
  select
    (select count(*) from public.friendships where addressee_id = uid  and status = 'accepted') as followers,
    (select count(*) from public.friendships where requester_id = uid  and status = 'accepted') as following;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FONKSİYON: Haftalık liderlik tablosu (arkadaşlar + kendi)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_leaderboard(uid uuid)
returns table(
  user_id uuid,
  display_name text,
  avatar_url text,
  username text,
  xp integer,
  level integer,
  current_streak integer
) language sql security definer as $$
  with friend_ids as (
    select case when requester_id = uid then addressee_id else requester_id end as fid
    from public.friendships
    where (requester_id = uid or addressee_id = uid) and status = 'accepted'
  ),
  all_ids as (
    select uid as fid union select fid from friend_ids
  )
  select p.id, p.display_name, p.avatar_url, p.username, p.total_xp, p.level, p.current_streak
  from public.profiles p
  inner join all_ids a on p.id = a.fid
  order by p.total_xp desc
  limit 20;
$$;
