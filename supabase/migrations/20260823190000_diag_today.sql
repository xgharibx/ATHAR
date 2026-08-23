-- TEMPORARY: is today's rise genuine activity or an old client re-posting a
-- carried-over total? Dropped by the next migration.
begin;
drop table if exists public.athar_diag_today;
create table public.athar_diag_today as
select user_id, day, score, generated_at
from public.leaderboard_score_events
where board = 'global' and section_id is null
  and day >= current_date - interval '1 day'
  and user_id in ('anon_4fab1c88ad1948fa','anon_6ea86481a3ae467a','anon_g7286qi5f1rmopz1');
alter table public.athar_diag_today enable row level security;
drop policy if exists athar_diag_today_read on public.athar_diag_today;
create policy athar_diag_today_read on public.athar_diag_today for select using (true);
commit;
