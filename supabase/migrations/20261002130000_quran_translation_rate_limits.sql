-- Durable abuse and provider-call limits for the public Quran translation proxy.
-- Client addresses are HMACed by the Edge Function; no raw address or Quran text is stored.

create table if not exists public.quran_translation_usage_counters (
  client_hash text primary key,
  bucket_tokens numeric not null check (bucket_tokens >= 0),
  bucket_updated_at timestamptz not null,
  utc_day date not null,
  daily_count integer not null default 0 check (daily_count >= 0),
  updated_at timestamptz not null default now(),
  constraint quran_translation_client_hash_format check (
    client_hash = 'global' or client_hash ~ '^[0-9a-f]{64}$'
  )
);

comment on table public.quran_translation_usage_counters is
  'Hashed-client and global token-bucket counters for the Quran Foundation proxy; stores no raw IP addresses or Quran text.';

create index if not exists quran_translation_usage_counters_updated_at_idx
  on public.quran_translation_usage_counters (updated_at);

alter table public.quran_translation_usage_counters enable row level security;
revoke all on table public.quran_translation_usage_counters from public, anon, authenticated;
grant select, insert, update, delete on table public.quran_translation_usage_counters to service_role;

create or replace function public.reserve_quran_translation_request(p_client_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_now timestamptz;
  v_utc_day date;
  v_client public.quran_translation_usage_counters%rowtype;
  v_global public.quran_translation_usage_counters%rowtype;
  v_client_tokens numeric;
  v_client_daily_count integer;
  v_global_tokens numeric;
  v_global_daily_count integer;
begin
  if p_client_hash is null or p_client_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  -- Lock the shared row before sampling time. This serializes quota decisions
  -- and prevents a waiter from writing an older refill timestamp or UTC day.
  insert into public.quran_translation_usage_counters (
    client_hash, bucket_tokens, bucket_updated_at, utc_day, daily_count, updated_at
  ) values (
    'global', 1200, pg_catalog.clock_timestamp(),
    (pg_catalog.clock_timestamp() at time zone 'UTC')::date, 0, pg_catalog.clock_timestamp()
  )
  on conflict (client_hash) do nothing;

  select * into v_global
  from public.quran_translation_usage_counters
  where client_hash = 'global'
  for update;

  v_now := greatest(pg_catalog.clock_timestamp(), v_global.bucket_updated_at);
  v_utc_day := (v_now at time zone 'UTC')::date;
  v_global_tokens := least(
    1200::numeric,
    v_global.bucket_tokens + greatest(extract(epoch from (v_now - v_global.bucket_updated_at)), 0::numeric) * 20
  );
  v_global_daily_count := case
    when v_global.utc_day = v_utc_day then v_global.daily_count
    else 0
  end;
  if v_global_tokens < 1 or v_global_daily_count >= 50000 then
    return false;
  end if;

  insert into public.quran_translation_usage_counters (
    client_hash, bucket_tokens, bucket_updated_at, utc_day, daily_count, updated_at
  ) values (p_client_hash, 60, v_now, v_utc_day, 0, v_now)
  on conflict (client_hash) do nothing;

  select * into v_client
  from public.quran_translation_usage_counters
  where client_hash = p_client_hash
  for update;

  v_client_tokens := least(
    60::numeric,
    v_client.bucket_tokens + greatest(extract(epoch from (v_now - v_client.bucket_updated_at)), 0::numeric)
  );
  v_client_daily_count := case
    when v_client.utc_day = v_utc_day then v_client.daily_count
    else 0
  end;
  if v_client_tokens < 1 or v_client_daily_count >= 2000 then
    return false;
  end if;

  -- Prune inactive rows on day rollover but keep the locked row for this call.
  if v_global.utc_day <> v_utc_day then
    delete from public.quran_translation_usage_counters
    where client_hash not in ('global', p_client_hash)
      and updated_at < v_now - interval '1 day';
  end if;

  update public.quran_translation_usage_counters
  set bucket_tokens = v_client_tokens - 1,
      bucket_updated_at = v_now,
      utc_day = v_utc_day,
      daily_count = v_client_daily_count + 1,
      updated_at = v_now
  where client_hash = p_client_hash;

  update public.quran_translation_usage_counters
  set bucket_tokens = v_global_tokens - 1,
      bucket_updated_at = v_now,
      utc_day = v_utc_day,
      daily_count = v_global_daily_count + 1,
      updated_at = v_now
  where client_hash = 'global';

  return true;
end;
$$;

revoke all on function public.reserve_quran_translation_request(text) from public, anon, authenticated;
grant execute on function public.reserve_quran_translation_request(text) to service_role;
