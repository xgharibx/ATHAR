-- Remove rows written while verifying daily/weekly/monthly/yearly aggregation
-- against the live function before release.
begin;
delete from public.leaderboard_score_events   where user_id like 'anon_synthetic_verify%';
delete from public.leaderboard_rollups        where user_id like 'anon_synthetic_verify%';
delete from public.leaderboard_user_profiles  where user_id like 'anon_synthetic_verify%';
commit;
