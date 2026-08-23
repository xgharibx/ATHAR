-- Revert 20260823150000_repair_carryover_rollups.
--
-- That repair recomputed each daily rollup from the LAST submission of the day,
-- on the reasoning that the client always posts its current cumulative total so
-- the final post is the day's true state.
--
-- That reasoning was incomplete. The carry-over bug has a mirror image: if the
-- daily reset runs BEFORE the day key flips, the client posts a freshly-zeroed
-- score under the OLD day. "Last submission" is then a spurious zero, and
-- recomputing from it wipes a real day's work. The measured effect showed
-- exactly that shape — one user dropped 5373 -> 79 — which is not credible as a
-- genuine total.
--
-- Neither max() nor last() is correct in general, so the honest move is to put
-- the data back and decide with evidence rather than with a guess.

begin;

update public.leaderboard_rollups r
set score = b.score,
    generated_at = b.generated_at,
    updated_at = b.updated_at
from public.leaderboard_rollups_backup_20260823 b
where r.day = b.day
  and r.period = b.period
  and r.board = b.board
  and coalesce(r.section_id, '') = coalesce(b.section_id, '')
  and r.user_id = b.user_id
  and r.score is distinct from b.score;

commit;
