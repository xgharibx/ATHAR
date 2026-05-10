-- Noor/Athar Leaderboard V3 profile upgrade
-- Paste this in Supabase SQL Editor BEFORE resetting scores.
-- Safe to run more than once. It preserves existing score/moderation tables.

create extension if not exists pgcrypto;

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

alter table public.leaderboard_user_profiles
  add column if not exists joined_at date not null default current_date,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists canonical_alias text not null default 'user',
  add column if not exists alias_display text not null default 'user',
  add column if not exists fingerprint_hash text null,
  add column if not exists total_submissions bigint not null default 0,
  add column if not exists last_day date null,
  add column if not exists last_board_count integer not null default 0,
  add column if not exists meta jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lb_profiles_total_submissions_nonnegative'
  ) then
    alter table public.leaderboard_user_profiles
      add constraint lb_profiles_total_submissions_nonnegative check (total_submissions >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lb_profiles_last_board_count_nonnegative'
  ) then
    alter table public.leaderboard_user_profiles
      add constraint lb_profiles_last_board_count_nonnegative check (last_board_count >= 0);
  end if;
end $$;

create index if not exists idx_lb_profiles_joined_at
  on public.leaderboard_user_profiles (joined_at asc);

create index if not exists idx_lb_profiles_last_seen_at
  on public.leaderboard_user_profiles (last_seen_at desc);

create index if not exists idx_lb_profiles_alias_display
  on public.leaderboard_user_profiles (lower(alias_display));

alter table public.leaderboard_user_profiles enable row level security;

drop policy if exists "lb_profiles_no_public_write" on public.leaderboard_user_profiles;

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

  if v_joined_at > current_date + 1 then
    v_joined_at := current_date;
  end if;

  if v_joined_at < date '2020-01-01' then
    v_joined_at := current_date;
  end if;

  insert into public.leaderboard_user_profiles (
    user_id,
    joined_at,
    first_seen_at,
    last_seen_at,
    canonical_alias,
    alias_display,
    fingerprint_hash,
    total_submissions,
    last_day,
    last_board_count,
    meta
  ) values (
    v_user_id,
    v_joined_at,
    now(),
    now(),
    v_alias,
    v_alias,
    nullif(btrim(coalesce(p_fingerprint_hash, '')), ''),
    1,
    p_last_day,
    v_board_count,
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

create or replace view public.leaderboard_ranked_v3 as
select
  r.day,
  r.period,
  r.board,
  r.section_id,
  r.user_id as id,
  r.alias as name,
  r.score,
  p.joined_at,
  p.first_seen_at,
  p.last_seen_at,
  rank() over (
    partition by r.day, r.period, r.board, coalesce(r.section_id, '')
    order by r.score desc, coalesce(p.joined_at, r.day) asc, r.user_id asc
  ) as rank_position
from public.leaderboard_rollups r
left join public.leaderboard_user_profiles p on p.user_id = r.user_id;

grant select on public.leaderboard_ranked_v3 to anon, authenticated;

select
  'leaderboard_v3_profiles_ready' as status,
  count(*) as existing_profiles
from public.leaderboard_user_profiles;
