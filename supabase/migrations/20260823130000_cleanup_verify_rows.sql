-- Remove rows created while verifying the rollup ordering change against the
-- live function. Verifying a write path necessarily writes, so these are
-- cleared rather than left sitting on the public board.
begin;

delete from public.leaderboard_score_events   where user_id like 'anon_synthetic_verify_%';
delete from public.leaderboard_rollups        where user_id like 'anon_synthetic_verify_%';
delete from public.leaderboard_user_profiles  where user_id like 'anon_synthetic_verify_%';

commit;

select 'verify_rows_cleaned' as status,
       (select count(*) from public.leaderboard_rollups where user_id like 'anon_synthetic_verify_%') as remaining;
