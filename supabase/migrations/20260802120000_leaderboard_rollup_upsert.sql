-- Leaderboard: make a per-user rollup upsert possible.
--
-- Why this exists:
--
-- Every score submission used to rebuild the ENTIRE day's leaderboard — for
-- each of six boards it selected every user's events, deleted every rollup row
-- for that day, and re-inserted them all. That is O(all users) work for one
-- person's tap, and worse, between the DELETE and the INSERT the board was
-- genuinely empty for anyone reading it. Two users submitting at once could
-- also interleave and lose each other's rows.
--
-- The fix is for a submission to touch only its own rows, which needs an
-- ON CONFLICT target PostgREST can actually use.
--
-- The existing unique index is on an EXPRESSION — coalesce(section_id, '') —
-- and PostgREST cannot name an expression index in `on_conflict`, which only
-- accepts a column list. So this adds a plain column-list index. Postgres
-- normally treats NULLs as distinct (which would let duplicate non-section
-- rows through), hence NULLS NOT DISTINCT — available from Postgres 15, and
-- this project runs 17.

begin;

-- The index below will refuse to build if duplicates already exist, and the
-- old delete-then-insert race is exactly the thing that could have created
-- them. Collapse any duplicate down to its highest score first — the rollup
-- has always been a max-per-user value, so the largest row is the correct one.
delete from public.leaderboard_rollups a
using public.leaderboard_rollups b
where a.day = b.day
  and a.period = b.period
  and a.board = b.board
  and coalesce(a.section_id, '') = coalesce(b.section_id, '')
  and a.user_id = b.user_id
  and (a.score < b.score or (a.score = b.score and a.id > b.id));

create unique index if not exists uq_lb_rollups_upsert
  on public.leaderboard_rollups (day, period, board, section_id, user_id)
  nulls not distinct;

commit;

select
  'leaderboard_rollup_upsert_ready' as status,
  (select count(*) from public.leaderboard_rollups) as rollup_rows;
