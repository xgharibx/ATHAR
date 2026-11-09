-- Atomically cap the leaderboard's retained audit events at 2,000 per identity/day.
-- Scores continue to update in leaderboard_rollups after this audit-only cap.
-- Hold writes briefly while seeding the counter and installing its triggers so
-- no submission can land between the backfill and enforcement becoming active.
lock table public.leaderboard_score_events in share row exclusive mode;

create table if not exists private.leaderboard_event_daily_usage (
  user_id text not null,
  day date not null,
  event_count integer not null default 0 check (event_count >= 0),
  primary key (user_id, day)
);

alter table private.leaderboard_event_daily_usage enable row level security;
revoke all on table private.leaderboard_event_daily_usage from public, anon, authenticated, service_role;

-- Start from the exact retained event count, including any legacy day above cap.
insert into private.leaderboard_event_daily_usage (user_id, day, event_count)
select user_id, day, count(*)::integer
from public.leaderboard_score_events
where board = 'global'
  and section_id is null
group by user_id, day
on conflict (user_id, day) do update
set event_count = excluded.event_count;

create or replace function private.enforce_leaderboard_event_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if tg_op = 'INSERT' then
    if new.board is distinct from 'global' or new.section_id is not null then
      return new;
    end if;

    -- The counter row's ON CONFLICT update serializes concurrent submissions
    -- for this identity/day and only reserves a slot while fewer than 2,000
    -- retained events exist. A refused audit row must not stop score rollups.
    insert into private.leaderboard_event_daily_usage as daily_usage (user_id, day, event_count)
    values (new.user_id, new.day, 1)
    on conflict (user_id, day) do update
      set event_count = daily_usage.event_count + 1
      where daily_usage.event_count < 2000
    returning event_count into current_count;

    if not found then
      return null;
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    if old.board is distinct from 'global' or old.section_id is not null then
      return old;
    end if;

    update private.leaderboard_event_daily_usage
    set event_count = greatest(event_count - 1, 0)
    where user_id = old.user_id and day = old.day
    returning event_count into current_count;

    if found and current_count = 0 then
      delete from private.leaderboard_event_daily_usage
      where user_id = old.user_id and day = old.day and event_count = 0;
    end if;

    return old;
  elsif tg_op = 'TRUNCATE' then
    delete from private.leaderboard_event_daily_usage;
    return null;
  end if;

  return new;
end;
$$;

alter function private.enforce_leaderboard_event_daily_limit() owner to postgres;
revoke all on function private.enforce_leaderboard_event_daily_limit() from public, anon, authenticated, service_role;

drop trigger if exists leaderboard_event_daily_limit_before_insert on public.leaderboard_score_events;
create trigger leaderboard_event_daily_limit_before_insert
before insert on public.leaderboard_score_events
for each row execute function private.enforce_leaderboard_event_daily_limit();

drop trigger if exists leaderboard_event_daily_usage_after_delete on public.leaderboard_score_events;
create trigger leaderboard_event_daily_usage_after_delete
after delete on public.leaderboard_score_events
for each row execute function private.enforce_leaderboard_event_daily_limit();

drop trigger if exists leaderboard_event_daily_usage_after_truncate on public.leaderboard_score_events;
create trigger leaderboard_event_daily_usage_after_truncate
after truncate on public.leaderboard_score_events
for each statement execute function private.enforce_leaderboard_event_daily_limit();
