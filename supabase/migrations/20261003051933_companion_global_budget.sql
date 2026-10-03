-- Reserve paid Companion usage against both account limits and a shared daily ceiling.
-- Store aggregate estimates only; never persist prompts, responses, or account identifiers.

create table if not exists public.companion_global_usage_counters (
  utc_day date primary key,
  daily_request_count integer not null default 0 check (daily_request_count >= 0),
  reserved_cost_micro_usd bigint not null default 0 check (reserved_cost_micro_usd >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.companion_global_usage_counters is
  'Daily aggregate Companion request and conservative spend reservations; contains no prompts or user identifiers.';

alter table public.companion_global_usage_counters enable row level security;
revoke all on table public.companion_global_usage_counters from public, anon, authenticated;
grant select, insert, update, delete on table public.companion_global_usage_counters to service_role;

create or replace function public.reserve_companion_request(
  p_user_id uuid,
  p_request_bytes integer,
  p_max_output_tokens integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_account public.companion_usage_counters%rowtype;
  v_global public.companion_global_usage_counters%rowtype;
  v_now timestamptz;
  v_utc_day date;
  v_daily_count integer;
  v_recent_requests timestamptz[];
  v_request_cost_micro_usd bigint;
  v_daily_budget_micro_usd bigint := 1000000;
  v_daily_request_limit integer := 250;
begin
  if p_user_id is null
    or p_request_bytes is null or p_request_bytes < 0 or p_request_bytes > 262144
    or p_max_output_tokens is null or p_max_output_tokens < 1 or p_max_output_tokens > 4096
  then
    return false;
  end if;

  v_now := pg_catalog.clock_timestamp();
  v_utc_day := (v_now at time zone 'UTC')::date;

  insert into public.companion_global_usage_counters (
    utc_day, daily_request_count, reserved_cost_micro_usd
  ) values (v_utc_day, 0, 0)
  on conflict (utc_day) do nothing;

  -- Acquire locks in a fixed global-then-account order so concurrent requests
  -- cannot overspend the shared daily budget or deadlock with each other.
  select * into v_global
  from public.companion_global_usage_counters
  where utc_day = v_utc_day
  for update;

  insert into public.companion_usage_counters (
    user_id, utc_day, daily_count, minute_requests
  ) values (p_user_id, v_utc_day, 0, '{}'::timestamptz[])
  on conflict (user_id) do nothing;

  select * into v_account
  from public.companion_usage_counters
  where user_id = p_user_id
  for update;

  v_daily_count := case when v_account.utc_day = v_utc_day then v_account.daily_count else 0 end;
  select coalesce(
    array_agg(recent.requested_at order by recent.requested_at),
    '{}'::timestamptz[]
  ) into v_recent_requests
  from unnest(v_account.minute_requests) as recent(requested_at)
  where recent.requested_at > v_now - interval '1 minute';

  -- The UTF-8 body byte count is used as a conservative input-token ceiling,
  -- with extra room for provider-side message framing. Rates are rounded up
  -- to whole micro-dollars per token from current standard MiniMax-M3 pricing:
  -- $0.60/M input -> $1/M estimated input; $2.40/M output -> $3/M output.
  v_request_cost_micro_usd := p_request_bytes::bigint + 1024 + (p_max_output_tokens::bigint * 3);

  if v_daily_count >= 30
    or pg_catalog.cardinality(v_recent_requests) >= 5
    or v_global.daily_request_count >= v_daily_request_limit
    or v_global.reserved_cost_micro_usd + v_request_cost_micro_usd > v_daily_budget_micro_usd
  then
    return false;
  end if;

  update public.companion_usage_counters
  set utc_day = v_utc_day,
      daily_count = v_daily_count + 1,
      minute_requests = pg_catalog.array_append(v_recent_requests, v_now),
      updated_at = v_now
  where user_id = p_user_id;

  update public.companion_global_usage_counters
  set daily_request_count = v_global.daily_request_count + 1,
      reserved_cost_micro_usd = v_global.reserved_cost_micro_usd + v_request_cost_micro_usd,
      updated_at = v_now
  where utc_day = v_utc_day;

  return true;
end;
$$;

-- Keep already-deployed function versions working during rollout, but charge
-- their unmetered calls at the full request/output ceiling until they update.
create or replace function public.reserve_companion_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  return public.reserve_companion_request(p_user_id, 262144, 4096);
end;
$$;

revoke all on function public.reserve_companion_request(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_companion_request(uuid, integer, integer) to service_role;
revoke all on function public.reserve_companion_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_companion_request(uuid) to service_role;
