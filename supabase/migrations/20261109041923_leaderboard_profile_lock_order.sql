-- Account deletion locks a leaderboard identity before deleting its profile.
-- Score submissions must take that same lock before their profile UPSERT so
-- both paths acquire locks in the same order and cannot deadlock.
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id, 0));

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

revoke all on function public.leaderboard_upsert_user_profile(text, date, text, text, date, integer)
  from public, anon, authenticated;
grant execute on function public.leaderboard_upsert_user_profile(text, date, text, text, date, integer)
  to service_role;
