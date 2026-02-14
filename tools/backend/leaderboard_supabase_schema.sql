-- ATHAR Leaderboard (Anonymous) - Supabase/Postgres starter schema
-- Phase 2: production-ready storage + aggregation foundations

create extension if not exists pgcrypto;

create table if not exists public.leaderboard_score_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  generated_at timestamptz not null,
  day date not null,
  user_id text not null,
  alias text not null,
  fingerprint text not null,
  checksum text not null,
  board text not null,
  period text not null default 'daily',
  section_id text null,
  score integer not null check (score >= 0),
  source text not null default 'client_v1',
  payload jsonb not null
);

create index if not exists idx_lb_events_day_board on public.leaderboard_score_events (day, board);
create index if not exists idx_lb_events_user_day on public.leaderboard_score_events (user_id, day);
create index if not exists idx_lb_events_period on public.leaderboard_score_events (period);
create index if not exists idx_lb_events_checksum on public.leaderboard_score_events (checksum);
create unique index if not exists uq_lb_events_no_replay
  on public.leaderboard_score_events (day, user_id, board, coalesce(section_id, ''), checksum);

create table if not exists public.leaderboard_rollups (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  day date not null,
  period text not null,
  board text not null,
  section_id text null,
  user_id text not null,
  alias text not null,
  score integer not null check (score >= 0),
  unique (day, period, board, section_id, user_id)
);

create index if not exists idx_lb_rollup_query on public.leaderboard_rollups (day, period, board, section_id, score desc);

-- Optional helper view: top rows for reads
create or replace view public.leaderboard_top as
select
  day,
  period,
  board,
  section_id,
  user_id as id,
  alias as name,
  score,
  rank() over (
    partition by day, period, board, coalesce(section_id, '')
    order by score desc, user_id asc
  ) as rank_position
from public.leaderboard_rollups;

-- Recommended RLS baseline
alter table public.leaderboard_score_events enable row level security;
alter table public.leaderboard_rollups enable row level security;

-- Public read policy for top leaderboard rows
drop policy if exists "lb_rollups_read" on public.leaderboard_rollups;

create policy "lb_rollups_read"
  on public.leaderboard_rollups
  for select
  using (true);

-- Service role should handle inserts/updates for events/rollups.
