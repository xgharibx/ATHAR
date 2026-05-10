-- Noor/Athar Leaderboard reset: scores only
-- Paste this in Supabase SQL Editor AFTER running leaderboard_v3_profiles.sql.
-- This clears the public leaderboard scores but preserves users, first join dates,
-- moderation, blocklists, alias registry, and audit history.

begin;

truncate table
  public.leaderboard_score_events,
  public.leaderboard_rollups
restart identity;

commit;

select
  'leaderboard_scores_reset_profiles_preserved' as status,
  (select count(*) from public.leaderboard_score_events) as score_events,
  (select count(*) from public.leaderboard_rollups) as rollups,
  (select count(*) from public.leaderboard_user_profiles) as preserved_profiles,
  (select count(*) from public.leaderboard_user_moderation) as preserved_moderation_rows,
  (select count(*) from public.leaderboard_alias_registry) as preserved_alias_rows;
