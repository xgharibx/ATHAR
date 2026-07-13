-- ════════════════════════════════════════════════════════════════════════
--  ATHAR — LEADERBOARD "ULTIMATE" SETUP + RESET   (2026-07-13)
--  Paste this whole file into the Supabase SQL Editor and run it once.
--
--  It is 100% idempotent (safe to re-run):
--    PART A  ensures every table / index / RLS policy / RPC the Edge Function
--            needs actually exists (nothing is dropped or altered destructively).
--    PART B  RESETS the published scores so the board re-seeds cleanly with the
--            corrected client scoring (Quran now counts *ayahs read today*, not
--            the reader's bookmark position). Join dates, moderation, blocklists,
--            alias registry and audit history are all PRESERVED.
--
--  If you ONLY want to re-affirm the schema and NOT wipe scores, run PART A and
--  skip PART B (it is clearly fenced at the bottom).
-- ════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────  PART A — SCHEMA  ─────────────────────────
create extension if not exists pgcrypto;

-- 1) Raw score events (append-only; one row per board per submission) ───────
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

-- 2) Daily rollups (one row per user/day/board; read path serves these) ─────
create table if not exists public.leaderboard_rollups (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  day date not null,
  period text not null,
  board text not null,
  section_id text null,
  user_id text not null,
  alias text not null,
  score integer not null check (score >= 0)
);
create index if not exists idx_lb_rollup_query on public.leaderboard_rollups (day, period, board, section_id, score desc);
create unique index if not exists uq_lb_rollups_day_period_board_user
  on public.leaderboard_rollups (day, period, board, coalesce(section_id, ''), user_id);

-- 3) User profiles (join date, submission counters) ─────────────────────────
create table if not exists public.leaderboard_user_profiles (
  user_id text primary key,
  joined_at date not null default current_date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  canonical_alias text not null default 'user',
  alias_display text not null default 'user',
  fingerprint_hash text null,
  total_submissions bigint not null default 0,
  last_day date null,
  last_board_count integer not null default 0,
  meta jsonb not null default '{}'::jsonb
);
create index if not exists idx_lb_profiles_joined_at on public.leaderboard_user_profiles (joined_at asc);
create index if not exists idx_lb_profiles_last_seen_at on public.leaderboard_user_profiles (last_seen_at desc);

-- 4) Moderation, blocklist, alias registry + audit ─────────────────────────
create table if not exists public.leaderboard_name_blocklist (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  term text not null,
  match_mode text not null default 'contains' check (match_mode in ('contains', 'exact')),
  is_active boolean not null default true,
  note text null
);
create unique index if not exists uq_lb_name_blocklist_term_mode
  on public.leaderboard_name_blocklist (lower(term), match_mode);

create table if not exists public.leaderboard_user_moderation (
  user_id text primary key,
  updated_at timestamptz not null default now(),
  hidden boolean not null default false,
  forced_alias text null,
  reason text null
);

create table if not exists public.leaderboard_alias_registry (
  user_id text primary key,
  updated_at timestamptz not null default now(),
  alias_normalized text not null unique,
  alias_display text not null
);

create table if not exists public.leaderboard_alias_audit (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id text not null,
  requested_alias text null,
  resolved_alias text not null,
  status text not null,
  reason text null
);
create index if not exists idx_lb_alias_audit_user_created
  on public.leaderboard_alias_audit (user_id, created_at desc);

-- 5) Row Level Security ─────────────────────────────────────────────────────
alter table public.leaderboard_score_events    enable row level security;
alter table public.leaderboard_rollups         enable row level security;
alter table public.leaderboard_user_profiles   enable row level security;
alter table public.leaderboard_name_blocklist  enable row level security;
alter table public.leaderboard_user_moderation enable row level security;
alter table public.leaderboard_alias_registry  enable row level security;
alter table public.leaderboard_alias_audit     enable row level security;

-- Public may read the rollups (the leaderboard itself). Everything else is
-- service-role only (the Edge Function uses the service key and bypasses RLS).
drop policy if exists "lb_rollups_read" on public.leaderboard_rollups;
create policy "lb_rollups_read" on public.leaderboard_rollups for select using (true);

-- 6) Profile upsert RPC (called by the Edge Function on every submit) ────────
create or replace function public.leaderboard_upsert_user_profile(
  p_user_id text,
  p_joined_at date,
  p_alias text,
  p_fingerprint_hash text,
  p_last_day date,
  p_board_count integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := nullif(btrim(coalesce(p_user_id, '')), '');
  v_joined_at date := coalesce(p_joined_at, current_date);
  v_alias text := coalesce(nullif(btrim(coalesce(p_alias, '')), ''), 'user');
  v_board_count integer := greatest(0, coalesce(p_board_count, 0));
begin
  if v_user_id is null then
    raise exception 'missing-user-id';
  end if;
  if v_joined_at > current_date + 1 then v_joined_at := current_date; end if;
  if v_joined_at < date '2020-01-01' then v_joined_at := current_date; end if;

  insert into public.leaderboard_user_profiles (
    user_id, joined_at, first_seen_at, last_seen_at, canonical_alias,
    alias_display, fingerprint_hash, total_submissions, last_day, last_board_count, meta
  ) values (
    v_user_id, v_joined_at, now(), now(), v_alias, v_alias,
    nullif(btrim(coalesce(p_fingerprint_hash, '')), ''), 1, p_last_day, v_board_count,
    jsonb_build_object('created_by', 'leaderboard_v3')
  )
  on conflict (user_id) do update set
    joined_at = least(public.leaderboard_user_profiles.joined_at, excluded.joined_at),
    first_seen_at = least(public.leaderboard_user_profiles.first_seen_at, excluded.first_seen_at),
    last_seen_at = now(),
    canonical_alias = excluded.canonical_alias,
    alias_display = excluded.alias_display,
    fingerprint_hash = coalesce(excluded.fingerprint_hash, public.leaderboard_user_profiles.fingerprint_hash),
    total_submissions = public.leaderboard_user_profiles.total_submissions + 1,
    last_day = coalesce(excluded.last_day, public.leaderboard_user_profiles.last_day),
    last_board_count = excluded.last_board_count,
    meta = coalesce(public.leaderboard_user_profiles.meta, '{}'::jsonb) || jsonb_build_object('updated_by', 'leaderboard_v3');
end;
$$;

revoke all on function public.leaderboard_upsert_user_profile(text, date, text, text, date, integer) from public;
grant execute on function public.leaderboard_upsert_user_profile(text, date, text, text, date, integer) to service_role;

-- ───────────────────────  PART B — RESET SCORES ONLY  ────────────────────
-- Clears published scores so the board re-seeds from the corrected client.
-- PRESERVES: profiles/join-dates, moderation, blocklist, alias registry, audit.
-- ↓↓↓ Delete/comment this block if you want to keep existing score history. ↓↓↓
begin;
  truncate table
    public.leaderboard_score_events,
    public.leaderboard_rollups
  restart identity;
commit;

-- ─────────────────────────────  VERIFY  ─────────────────────────────────────
select
  'athar_leaderboard_ready' as status,
  (select count(*) from public.leaderboard_score_events)   as score_events,
  (select count(*) from public.leaderboard_rollups)        as rollups,
  (select count(*) from public.leaderboard_user_profiles)  as preserved_profiles,
  (select count(*) from public.leaderboard_user_moderation) as preserved_moderation,
  (select count(*) from public.leaderboard_alias_registry) as preserved_aliases;
