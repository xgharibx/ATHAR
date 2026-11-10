-- Keep untrusted/imported section identifiers from creating unlimited new
-- rollup keys for one leaderboard identity on a single day. The app sends at
-- most 64 section scores per snapshot, so this preserves normal writes while
-- putting a durable bound at the database boundary.
create table if not exists private.leaderboard_section_daily_usage (
  user_id text not null,
  day date not null,
  section_count integer not null default 0 check (section_count >= 0),
  primary key (user_id, day)
);

alter table private.leaderboard_section_daily_usage enable row level security;
revoke all on table private.leaderboard_section_daily_usage from public, anon, authenticated, service_role;

-- Preserve the current count before enforcing the cap. Existing over-limit
-- days remain readable and their existing rows may still be updated; only new
-- section keys are stopped once the count reaches the established app limit.
insert into private.leaderboard_section_daily_usage (user_id, day, section_count)
select user_id, day, count(*)::integer
from public.leaderboard_rollups
where board = 'section'
  and period = 'daily'
  and section_id is not null
group by user_id, day
on conflict (user_id, day) do update
set section_count = excluded.section_count;

create or replace function private.enforce_leaderboard_section_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if tg_op = 'INSERT' then
    if new.period is distinct from 'daily'
      or new.board is distinct from 'section'
      or new.section_id is null then
      return new;
    end if;

    -- Serialize key creation for the same identity/day so parallel requests
    -- cannot race past the cumulative cap.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.user_id || '|' || (new.day - date '2000-01-01')::text, 0)
    );

    -- INSERT ... ON CONFLICT performs this BEFORE INSERT trigger even for a
    -- row that will become an update. Existing keys must remain writable and
    -- must not consume another slot.
    if exists (
      select 1
      from public.leaderboard_rollups as existing
      where existing.user_id = new.user_id
        and existing.day = new.day
        and existing.period = 'daily'
        and existing.board = 'section'
        and existing.section_id = new.section_id
    ) then
      return new;
    end if;

    insert into private.leaderboard_section_daily_usage as daily_usage (user_id, day, section_count)
    values (new.user_id, new.day, 1)
    on conflict (user_id, day) do update
      set section_count = daily_usage.section_count + 1
      where daily_usage.section_count < 64
    returning section_count into current_count;

    -- Returning NULL skips only this over-limit section row. Other board
    -- rollups in the same upsert, including the user's global score, proceed.
    if not found then
      return null;
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    if old.period is distinct from 'daily'
      or old.board is distinct from 'section'
      or old.section_id is null then
      return old;
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old.user_id || '|' || (old.day - date '2000-01-01')::text, 0)
    );

    update private.leaderboard_section_daily_usage
    set section_count = greatest(section_count - 1, 0)
    where user_id = old.user_id and day = old.day
    returning section_count into current_count;

    if current_count = 0 then
      delete from private.leaderboard_section_daily_usage
      where user_id = old.user_id and day = old.day;
    end if;

    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_leaderboard_section_daily_limit() from public, anon, authenticated, service_role;

create trigger leaderboard_section_daily_limit_before_insert
before insert on public.leaderboard_rollups
for each row execute function private.enforce_leaderboard_section_daily_limit();

create trigger leaderboard_section_daily_usage_after_delete
after delete on public.leaderboard_rollups
for each row execute function private.enforce_leaderboard_section_daily_limit();

create or replace function private.clear_leaderboard_section_daily_usage_after_truncate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.leaderboard_section_daily_usage;
  return null;
end;
$$;

revoke all on function private.clear_leaderboard_section_daily_usage_after_truncate() from public, anon, authenticated, service_role;

create trigger leaderboard_section_daily_usage_after_truncate
after truncate on public.leaderboard_rollups
for each statement execute function private.clear_leaderboard_section_daily_usage_after_truncate();
