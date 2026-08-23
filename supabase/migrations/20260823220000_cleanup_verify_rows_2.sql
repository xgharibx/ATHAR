-- Remove rows written while verifying the scoring chain end-to-end against the
-- live function. Verifying a write path necessarily writes.
begin;
delete from public.leaderboard_score_events   where user_id like 'anon_synthetic_verify_%';
delete from public.leaderboard_rollups        where user_id like 'anon_synthetic_verify_%';
delete from public.leaderboard_user_profiles  where user_id like 'anon_synthetic_verify_%';
commit;
