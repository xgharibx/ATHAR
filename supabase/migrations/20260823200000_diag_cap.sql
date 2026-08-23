begin;
drop table if exists public.athar_diag_cap;
create table public.athar_diag_cap as
select user_id, day, count(*) as all_events,
       count(*) filter (where board='global') as global_events,
       max(generated_at) as last_event_at
from public.leaderboard_score_events
where day >= current_date - interval '3 days'
group by user_id, day
order by all_events desc;
alter table public.athar_diag_cap enable row level security;
drop policy if exists athar_diag_cap_read on public.athar_diag_cap;
create policy athar_diag_cap_read on public.athar_diag_cap for select using (true);
commit;
