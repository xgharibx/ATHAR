-- TEMPORARY diagnostic. Materialises the raw submission timeline for the
-- highest-scoring users so it can be read out and reasoned about, instead of
-- repairing scores on a guess again. Dropped by the next migration.
begin;

drop table if exists public.athar_diag_events;

create table public.athar_diag_events as
with top_users as (
  select user_id
  from public.leaderboard_rollups
  where period = 'daily' and board = 'global'
    and day >= current_date - interval '9 days'
  group by user_id
  order by max(score) desc
  limit 12
)
select
  e.user_id,
  e.day,
  e.score,
  e.generated_at,
  e.created_at,
  row_number() over (partition by e.user_id, e.day order by e.generated_at, e.created_at) as seq,
  count(*)  over (partition by e.user_id, e.day) as events_that_day
from public.leaderboard_score_events e
join top_users t on t.user_id = e.user_id
where e.board = 'global'
  and e.section_id is null
  and e.day >= current_date - interval '9 days';

alter table public.athar_diag_events enable row level security;
drop policy if exists athar_diag_read on public.athar_diag_events;
create policy athar_diag_read on public.athar_diag_events for select using (true);

commit;
