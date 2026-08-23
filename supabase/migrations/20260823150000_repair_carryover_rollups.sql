-- Repair daily rollups that were inflated by the Fajr carry-over bug.
--
-- Until today, a rollup was max() over that day's submissions. That made any
-- wrong-high value permanent — and the carry-over bug produced exactly those:
-- when the day key flipped at Fajr before the daily reset ran, the client
-- posted YESTERDAY's totals under TODAY's date, and the correct low value that
-- followed could never displace it.
--
-- The events table still holds every individual submission, so the true value
-- is recoverable: the client always submits its CURRENT cumulative total for
-- the day, which means the LAST submission of a day is that device's final
-- state for it. Recomputing from that is exactly the ordering rule the edge
-- function now applies going forward, applied backwards.
--
-- Scope is limited to what the events table can actually justify:
--   * daily rollups only (weekly/monthly/yearly are summed from these at read
--     time, so they correct themselves once these are right);
--   * only where a matching event exists — a rollup we cannot justify from the
--     log is left exactly as it is rather than guessed at;
--   * only where the value actually differs, so untouched rows keep their
--     original updated_at.
--
-- The previous state is copied to a backup table first, so this is reversible.

begin;

drop table if exists public.leaderboard_rollups_backup_20260823;
create table public.leaderboard_rollups_backup_20260823 as
  select * from public.leaderboard_rollups;

with last_event as (
  select distinct on (user_id, day, board, coalesce(section_id, ''))
    user_id,
    day,
    board,
    section_id,
    score,
    generated_at
  from public.leaderboard_score_events
  order by
    user_id,
    day,
    board,
    coalesce(section_id, ''),
    generated_at desc,
    created_at desc
)
update public.leaderboard_rollups r
set
  score = le.score,
  generated_at = le.generated_at,
  updated_at = now()
from last_event le
where r.period = 'daily'
  and r.user_id = le.user_id
  and r.day = le.day
  and r.board = le.board
  and coalesce(r.section_id, '') = coalesce(le.section_id, '')
  and r.score is distinct from le.score;

commit;

select
  'carryover_rollups_repaired' as status,
  (select count(*) from public.leaderboard_rollups_backup_20260823) as rows_backed_up,
  (
    select count(*)
    from public.leaderboard_rollups r
    join public.leaderboard_rollups_backup_20260823 b
      on b.day = r.day and b.period = r.period and b.board = r.board
     and coalesce(b.section_id, '') = coalesce(r.section_id, '') and b.user_id = r.user_id
    where b.score is distinct from r.score
  ) as rows_changed;
