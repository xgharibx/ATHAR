-- Repair daily rollups inflated by the Fajr carry-over — second attempt, this
-- time backed by the raw submission log rather than by reasoning alone.
--
-- What the log shows (athar_diag_events, 9 users / 29 day-rows):
--
--   healthy day:    first=0, max=last   — the reset zeroes progress at Fajr and
--                                          the score climbs to its final value
--   carry-over day: first=max > last    — the app woke, posted YESTERDAY's
--                                          totals under today before the reset
--                                          ran, then fell back to the real value
--
-- So `last < max` IS the carry-over signature, and for every healthy day
-- last == max, meaning this rewrite is a no-op for them. The client submits its
-- running cumulative total, so the final submission of a day is that day's true
-- state.
--
-- Guard: never write a zero over a positive max. The carry-over bug has a
-- mirror image (reset runs before the day key flips, posting a zero under the
-- old day) and that would erase real work. The log shows zero such rows today,
-- but the guard costs nothing and removes the only way this can destroy data.
--
-- Weekly/monthly/yearly are summed from these rows at read time, so they
-- correct themselves.

begin;

drop table if exists public.leaderboard_rollups_backup_v2;
create table public.leaderboard_rollups_backup_v2 as
  select * from public.leaderboard_rollups;

with agg as (
  select
    user_id, day, board, coalesce(section_id, '') as sec,
    max(score) as max_score,
    (array_agg(score order by generated_at desc, created_at desc))[1] as last_score,
    (array_agg(generated_at order by generated_at desc, created_at desc))[1] as last_generated_at
  from public.leaderboard_score_events
  group by user_id, day, board, coalesce(section_id, '')
)
update public.leaderboard_rollups r
set score = a.last_score,
    generated_at = a.last_generated_at,
    updated_at = now()
from agg a
where r.period = 'daily'
  and r.user_id = a.user_id
  and r.day = a.day
  and r.board = a.board
  and coalesce(r.section_id, '') = a.sec
  and r.score is distinct from a.last_score
  and (a.last_score > 0 or a.max_score = 0);   -- never let a zero erase a day

commit;

-- diagnostic table has served its purpose
drop table if exists public.athar_diag_events;
