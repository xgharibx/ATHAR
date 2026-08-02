-- Leaderboard: remove verification rows, then reset scores.
--
-- Part 1 — housekeeping. Verifying the new per-user rollup upsert against the
-- live function necessarily wrote real rows. They are removed here rather than
-- left sitting on the public board.
--
-- Part 2 — the score reset. Every score standing before today was produced by
-- a leaderboard that could not reset itself: ensureDailyResets() only ran when
-- a live Fajr time was available, so for anyone offline or without location
-- permission the adhkar counters and quick tasbeeh accumulated indefinitely,
-- and the "daily" score with them. Those numbers reflect a defect, not effort,
-- and they are not comparable with scores produced after the fix.
--
-- Profiles, join dates, aliases, moderation and blocklists are all preserved —
-- only the scores go. Clients resubmit today's score on their next sync, so
-- the boards refill on their own within minutes.

begin;

delete from public.leaderboard_score_events where user_id like 'anon_synthetic_verify_%';
delete from public.leaderboard_rollups      where user_id like 'anon_synthetic_verify_%';
delete from public.leaderboard_user_profiles where user_id like 'anon_synthetic_verify_%';

truncate table
  public.leaderboard_score_events,
  public.leaderboard_rollups
restart identity;

commit;

select
  'leaderboard_reset_after_reset_bug_fix' as status,
  (select count(*) from public.leaderboard_score_events) as score_events,
  (select count(*) from public.leaderboard_rollups) as rollups,
  (select count(*) from public.leaderboard_user_profiles) as preserved_profiles;
