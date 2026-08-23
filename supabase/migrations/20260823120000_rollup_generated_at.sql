-- Let a leaderboard rollup be corrected downward by a newer snapshot.
--
-- Rollups have always been max(stored, incoming). That was a defence against
-- out-of-order delivery — a stale submission arriving late must not drag a
-- day's score back down — but it also made any wrong-high value permanent.
--
-- That mattered because of the Fajr carry-over bug: the day key flipped before
-- the daily reset ran, so yesterday's totals were posted under today's date.
-- The client no longer does that, but every user still on an older build does,
-- and under max() the correct zero that follows can never take effect.
--
-- Recording the CLIENT's generatedAt alongside the score fixes the ordering
-- question properly: a submission that is genuinely newer than what we hold is
-- the user's current total for that day and wins outright, higher or lower.
-- Anything older still falls back to max(). Client clocks are already bounded
-- by MAX_GENERATED_AT_SKEW_MS in the edge function, so this cannot be used to
-- write arbitrarily far into the future.

begin;

alter table public.leaderboard_rollups
  add column if not exists generated_at timestamptz;

commit;

select
  'leaderboard_rollup_generated_at_ready' as status,
  (select count(*) from public.leaderboard_rollups) as rollup_rows;
