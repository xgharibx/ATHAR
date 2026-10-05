-- Guests may use Companion without an account, within the same hard shared
-- daily spend ceiling as signed-in users. No prompt, reply, or IP address is
-- stored by this reservation.
create or replace function public.reserve_companion_anonymous_request(
  p_request_bytes integer,
  p_max_output_tokens integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_global public.companion_global_usage_counters%rowtype;
  v_now timestamptz;
  v_utc_day date;
  v_request_cost_micro_usd bigint;
  v_daily_budget_micro_usd bigint := 1000000;
  v_daily_request_limit integer := 250;
begin
  if p_request_bytes is null or p_request_bytes < 0 or p_request_bytes > 262144
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

  select * into v_global
  from public.companion_global_usage_counters
  where utc_day = v_utc_day
  for update;

  -- Match the conservative reservation already used for account requests.
  v_request_cost_micro_usd := p_request_bytes::bigint + 1024 + (p_max_output_tokens::bigint * 3);

  if v_global.daily_request_count >= v_daily_request_limit
    or v_global.reserved_cost_micro_usd + v_request_cost_micro_usd > v_daily_budget_micro_usd
  then
    return false;
  end if;

  update public.companion_global_usage_counters
  set daily_request_count = v_global.daily_request_count + 1,
      reserved_cost_micro_usd = v_global.reserved_cost_micro_usd + v_request_cost_micro_usd,
      updated_at = v_now
  where utc_day = v_utc_day;

  return true;
end;
$$;

revoke all on function public.reserve_companion_anonymous_request(integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_companion_anonymous_request(integer, integer) to service_role;
