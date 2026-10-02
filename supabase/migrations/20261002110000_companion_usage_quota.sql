-- Durable, minimal usage counters for the paid Companion endpoint.
-- One row per authenticated account; no prompt or response content is stored.

create table if not exists public.companion_usage_counters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  utc_day date not null,
  daily_count integer not null default 0 check (daily_count >= 0),
  minute_requests timestamptz[] not null default '{}'::timestamptz[]
    check (cardinality(minute_requests) <= 5),
  updated_at timestamptz not null default now()
);

comment on table public.companion_usage_counters is
  'Minimal per-user request counters for the paid Companion API; stores no prompts or model output.';

alter table public.companion_usage_counters enable row level security;
revoke all on table public.companion_usage_counters from public, anon, authenticated;
grant select, insert, update, delete on table public.companion_usage_counters to service_role;

create or replace function public.reserve_companion_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usage public.companion_usage_counters%rowtype;
  v_now timestamptz;
  v_utc_day date;
  v_daily_count integer;
  v_recent_requests timestamptz[];
begin
  if p_user_id is null then
    return false;
  end if;

  insert into public.companion_usage_counters (
    user_id, utc_day, daily_count, minute_requests
  ) values (
    p_user_id,
    (pg_catalog.clock_timestamp() at time zone 'UTC')::date,
    0,
    '{}'::timestamptz[]
  ) on conflict (user_id) do nothing;

  -- Serialize reservations for the same account so parallel calls cannot
  -- race past either limit.
  select * into v_usage
  from public.companion_usage_counters
  where user_id = p_user_id
  for update;

  v_now := pg_catalog.clock_timestamp();
  v_utc_day := (v_now at time zone 'UTC')::date;
  v_daily_count := case when v_usage.utc_day = v_utc_day then v_usage.daily_count else 0 end;
  select coalesce(
    array_agg(recent.requested_at order by recent.requested_at),
    '{}'::timestamptz[]
  ) into v_recent_requests
  from unnest(v_usage.minute_requests) as recent(requested_at)
  where recent.requested_at > v_now - interval '1 minute';

  if v_daily_count >= 30 or cardinality(v_recent_requests) >= 5 then
    update public.companion_usage_counters
    set utc_day = v_utc_day,
        daily_count = v_daily_count,
        minute_requests = v_recent_requests,
        updated_at = v_now
    where user_id = p_user_id;
    return false;
  end if;

  update public.companion_usage_counters
  set utc_day = v_utc_day,
      daily_count = v_daily_count + 1,
      minute_requests = array_append(v_recent_requests, v_now),
      updated_at = v_now
  where user_id = p_user_id;

  return true;
end;
$$;

revoke all on function public.reserve_companion_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_companion_request(uuid) to service_role;
