-- Bemaamoo Daily leaderboard. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Anyone can read the board. Anyone can add ONE score per device per day (name only, no sign-in).
-- Nobody can edit or delete scores from the website.

create table if not exists public.daily_scores (
  id bigint generated always as identity primary key,
  day int not null,                       -- Daily number (#1 = 23 Nov 2026, Lagos midnight)
  device text not null check (char_length(device) between 8 and 64),
  name text not null check (char_length(name) between 1 and 18),
  score int not null check (score between 0 and 20000),
  words int not null check (words between 0 and 400),
  perks int not null default 0 check (perks between 0 and 400),
  found boolean not null default false,   -- unscrambled the day's word
  created_at timestamptz not null default now(),
  unique (day, device)
);
create index if not exists daily_scores_day_idx on public.daily_scores (day, score desc, created_at);

alter table public.daily_scores enable row level security;
drop policy if exists "daily scores are public" on public.daily_scores;
create policy "daily scores are public" on public.daily_scores for select using (true);
drop policy if exists "add a daily score" on public.daily_scores;
-- only today's (Lagos) number is accepted, so old days can't be filled in afterwards
create policy "add a daily score" on public.daily_scores for insert
  with check (day = floor(extract(epoch from (now() + interval '1 hour')) / 86400)::int - 20779);
grant select, insert on public.daily_scores to anon, authenticated;
