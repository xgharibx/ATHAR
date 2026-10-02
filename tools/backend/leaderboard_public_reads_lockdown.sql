-- Revoke legacy direct Data API reads after applying the leaderboard schema.
-- This is safe to rerun. Public clients must use the Edge Function so its
-- moderation visibility rules and response limits cannot be bypassed.
begin;

revoke all privileges on table public.leaderboard_score_events
  from public, anon, authenticated;
revoke all privileges on table public.leaderboard_rollups
  from public, anon, authenticated;
drop policy if exists "lb_rollups_read" on public.leaderboard_rollups;

do $$
begin
  if to_regclass('public.leaderboard_user_profiles') is not null then
    execute 'revoke all privileges on table public.leaderboard_user_profiles from public, anon, authenticated';
  end if;
  if to_regclass('public.leaderboard_top') is not null then
    execute 'revoke all privileges on table public.leaderboard_top from public, anon, authenticated';
  end if;
  if to_regclass('public.leaderboard_ranked_v3') is not null then
    execute 'revoke all privileges on table public.leaderboard_ranked_v3 from public, anon, authenticated';
  end if;
end;
$$;

commit;
