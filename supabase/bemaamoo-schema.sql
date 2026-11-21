-- Bemaamoo accounts, profile pictures and scores.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run. It is safe to run more than once.

-- 1. Profiles: one row per signed-in player
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 18),
  avatar_url text check (avatar_url is null or char_length(avatar_url) < 400),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "add own profile" on public.profiles;
create policy "add own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "change own profile" on public.profiles;
create policy "change own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 2. Game results: one row per player per finished game
create table if not exists public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (char_length(game_id) between 3 and 40),
  played_at timestamptz not null default now(),
  players int not null check (players between 1 and 50),
  place int not null check (place between 1 and 50),
  points int not null check (points between 0 and 100000),
  rounds int not null check (rounds between 1 and 200),
  category text check (category is null or char_length(category) < 60),
  rule int not null default 0 check (rule between 0 and 3),
  unique (user_id, game_id)
);
alter table public.game_results enable row level security;
drop policy if exists "see own results" on public.game_results;
create policy "see own results" on public.game_results for select using (auth.uid() = user_id);
drop policy if exists "add own results" on public.game_results;
create policy "add own results" on public.game_results for insert with check (auth.uid() = user_id);

-- 3. Leaderboard: totals for everyone, readable by all (no private details)
create or replace view public.bmo_leaderboard as
  select p.id, p.name, p.avatar_url,
         count(*)::int as games,
         (count(*) filter (where r.place = 1 and r.players > 1))::int as wins,
         coalesce(sum(r.points), 0)::int as points
  from public.game_results r
  join public.profiles p on p.id = r.user_id
  group by p.id, p.name, p.avatar_url;
grant select on public.bmo_leaderboard to anon, authenticated;

-- 4. Profile pictures: a public bucket, one small square JPEG per player
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 262144, allowed_mime_types = array['image/jpeg'];

drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "add own avatar" on storage.objects;
create policy "add own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "replace own avatar" on storage.objects;
create policy "replace own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "remove own avatar" on storage.objects;
create policy "remove own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
