-- Keep the NULLS NOT DISTINCT column index used by PostgREST upserts.
-- The original UNIQUE constraint treats NULL section IDs as distinct, and
-- the expression index duplicates the same uniqueness using COALESCE. Both
-- indexes add storage and write work without serving any current query path.
-- This changes no leaderboard rows or scores.

begin;

do $guard$
declare
  retained_index oid := to_regclass('public.uq_lb_rollups_upsert');
begin
  if retained_index is null or not exists (
    select 1
    from pg_index
    where indexrelid = retained_index
      and indisunique
      and indnullsnotdistinct
  ) then
    raise exception 'Expected unique NULLS NOT DISTINCT upsert index is missing; refusing to remove redundant indexes';
  end if;
end
$guard$;

alter table public.leaderboard_rollups
  drop constraint if exists leaderboard_rollups_day_period_board_section_id_user_id_key;

drop index if exists public.uq_lb_rollups_day_period_board_user;

commit;
