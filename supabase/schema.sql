-- NewRssFeed — Supabase Şema Tanımı
-- Supabase Dashboard > SQL Editor'e yapıştırarak çalıştırın.

-- feeds tablosu
create table public.feeds (
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
create table public.notes (
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
create table public.highlights (
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
create table public.read_history (
  article_id text not null,
  user_id uuid references auth.users not null,
  read_at bigint,
  primary key (article_id, user_id)
);
alter table public.read_history enable row level security;
create policy "Users own read_history" on public.read_history
  for all using (auth.uid() = user_id);
