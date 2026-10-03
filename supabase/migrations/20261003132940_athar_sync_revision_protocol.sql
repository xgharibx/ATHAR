-- Revisioned, atomic and replay-safe writes for authenticated cloud sync.
-- Keep direct table writes enabled until the separately staged client cutoff.

alter table public.athar_sync
  add column if not exists revision bigint not null default 1;

alter table public.athar_sync
  drop constraint if exists athar_sync_revision_positive;
alter table public.athar_sync
  add constraint athar_sync_revision_positive check (revision >= 1);

create schema if not exists private authorization postgres;
alter schema private owner to postgres;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function public.athar_sync_touch()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := pg_catalog.now();
    new.revision := 1;
    return new;
  end if;
  new.updated_at := pg_catalog.now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop trigger if exists athar_sync_touch_trg on public.athar_sync;
create trigger athar_sync_touch_trg
  before insert or update on public.athar_sync
  for each row execute function public.athar_sync_touch();

create table if not exists private.athar_sync_commit_receipts (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  request_id uuid not null,
  request_hash bytea not null,
  revisions jsonb not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint athar_sync_commit_receipts_device_valid
    check (pg_catalog.length(device_id) between 1 and 128 and device_id = pg_catalog.btrim(device_id)),
  constraint athar_sync_commit_receipts_revisions_object
    check (pg_catalog.jsonb_typeof(revisions) = 'object'),
  primary key (user_id, device_id)
);

alter table private.athar_sync_commit_receipts enable row level security;
revoke all on table private.athar_sync_commit_receipts from public, anon, authenticated;

comment on table private.athar_sync_commit_receipts is
  'Private idempotency receipt for one outstanding cloud sync batch per account and device.';

create or replace function private.athar_sync_commit_batch(
  p_request_id uuid,
  p_device_id text,
  p_writes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_write jsonb;
  v_kind text;
  v_expected bigint;
  v_expected_text text;
  v_actual bigint;
  v_row_found boolean;
  v_kinds text[] := array[]::text[];
  v_current_revisions jsonb;
  v_revisions jsonb := '{}'::jsonb;
  v_hash bytea;
  v_receipt private.athar_sync_commit_receipts%rowtype;
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_request_id is null then
    raise exception 'request ID is required' using errcode = '22023';
  end if;
  if p_device_id is null
     or pg_catalog.length(p_device_id) not between 1 and 128
     or p_device_id <> pg_catalog.btrim(p_device_id) then
    raise exception 'invalid device ID' using errcode = '22023';
  end if;
  if p_writes is null or pg_catalog.jsonb_typeof(p_writes) <> 'array' then
    raise exception 'writes must be a JSON array' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_array_length(p_writes) not between 1 and 6 then
    raise exception 'batch must contain between one and six writes' using errcode = '22023';
  end if;

  for v_write in select value from pg_catalog.jsonb_array_elements(p_writes)
  loop
    if pg_catalog.jsonb_typeof(v_write) <> 'object'
       or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_write)) <> 3
       or not (v_write ?& array['kind', 'expected_revision', 'payload']) then
      raise exception 'each write must contain kind, expected_revision and payload only' using errcode = '22023';
    end if;

    v_kind := v_write ->> 'kind';
    if v_kind is null or v_kind not in ('progress', 'favorites', 'bookmarks', 'reminders', 'quran', 'settings') then
      raise exception 'unsupported sync document kind' using errcode = '22023';
    end if;
    if v_kind = any(v_kinds) then
      raise exception 'a batch cannot contain a kind more than once' using errcode = '22023';
    end if;
    v_kinds := pg_catalog.array_append(v_kinds, v_kind);

    if pg_catalog.jsonb_typeof(v_write -> 'payload') <> 'object' then
      raise exception 'sync payload must be a JSON object' using errcode = '22023';
    end if;

    if pg_catalog.jsonb_typeof(v_write -> 'expected_revision') = 'null' then
      continue;
    end if;
    if pg_catalog.jsonb_typeof(v_write -> 'expected_revision') <> 'number' then
      raise exception 'expected revision must be an integer or null' using errcode = '22023';
    end if;
    v_expected_text := v_write ->> 'expected_revision';
    if v_expected_text !~ '^[1-9][0-9]*$' then
      raise exception 'expected revision must be a positive integer or null' using errcode = '22023';
    end if;
    begin
      v_expected := v_expected_text::bigint;
    exception when numeric_value_out_of_range then
      raise exception 'expected revision is out of range' using errcode = '22023';
    end;
  end loop;

  -- Serialize all protocol operations for this account. Existing row locks
  -- below protect against legacy UPDATE/DELETE statements that do not take it.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 20261003)
  );

  v_hash := extensions.digest(
    pg_catalog.convert_to(
      pg_catalog.jsonb_build_object('device_id', p_device_id, 'writes', p_writes)::text,
      'UTF8'
    ),
    'sha256'
  );

  select receipt.*
    into v_receipt
    from private.athar_sync_commit_receipts as receipt
   where receipt.user_id = v_user_id
     and receipt.device_id = p_device_id;

  if found then
    if v_receipt.request_id <> p_request_id then
      return pg_catalog.jsonb_build_object('status', 'pending_ack');
    end if;
    if v_receipt.request_hash <> v_hash then
      raise exception 'request ID reused with different content' using errcode = '22023';
    end if;
    return pg_catalog.jsonb_build_object(
      'status', 'replayed',
      'revisions', v_receipt.revisions
    );
  end if;

  -- Lock and validate every existing row before any mutation. Missing rows
  -- cannot be row-locked; their insert race is caught as one atomic conflict.
  for v_write in
    select item.value
      from pg_catalog.jsonb_array_elements(p_writes) as item(value)
     order by item.value ->> 'kind'
  loop
    v_kind := v_write ->> 'kind';
    v_expected_text := v_write ->> 'expected_revision';
    v_expected := case when v_expected_text is null then null else v_expected_text::bigint end;

    select row.revision
      into v_actual
      from public.athar_sync as row
     where row.user_id = v_user_id
       and row.kind = v_kind
     for update;
    v_row_found := found;

    if v_expected is null then
      if v_row_found then
        select coalesce(pg_catalog.jsonb_object_agg(sync.kind, sync.revision), '{}'::jsonb)
          into v_current_revisions
          from public.athar_sync as sync
         where sync.user_id = v_user_id and sync.kind = any(v_kinds);
        return pg_catalog.jsonb_build_object('status', 'conflict', 'revisions', v_current_revisions);
      end if;
    elsif not v_row_found or v_actual is distinct from v_expected then
      select coalesce(pg_catalog.jsonb_object_agg(sync.kind, sync.revision), '{}'::jsonb)
        into v_current_revisions
        from public.athar_sync as sync
       where sync.user_id = v_user_id and sync.kind = any(v_kinds);
      return pg_catalog.jsonb_build_object('status', 'conflict', 'revisions', v_current_revisions);
    end if;
  end loop;

  begin
    for v_write in select value from pg_catalog.jsonb_array_elements(p_writes)
    loop
      v_kind := v_write ->> 'kind';
      v_expected_text := v_write ->> 'expected_revision';
      v_expected := case when v_expected_text is null then null else v_expected_text::bigint end;

      if v_expected is null then
        insert into public.athar_sync (user_id, kind, payload, device_id)
        values (v_user_id, v_kind, v_write -> 'payload', p_device_id)
        returning revision into v_actual;
      else
        update public.athar_sync
           set payload = v_write -> 'payload', device_id = p_device_id
         where user_id = v_user_id
           and kind = v_kind
           and revision = v_expected
        returning revision into v_actual;
        get diagnostics v_rows = row_count;
        if v_rows <> 1 then
          raise exception 'sync revision changed during batch' using errcode = '40001';
        end if;
      end if;

      v_revisions := v_revisions || pg_catalog.jsonb_build_object(v_kind, v_actual);
    end loop;

    insert into private.athar_sync_commit_receipts
      (user_id, device_id, request_id, request_hash, revisions)
    values
      (v_user_id, p_device_id, p_request_id, v_hash, v_revisions);
  exception when unique_violation then
    -- A legacy writer may have inserted one of the missing documents between
    -- validation and INSERT. The exception subtransaction rolls back every
    -- write in this batch before we report a conflict.
    select coalesce(pg_catalog.jsonb_object_agg(sync.kind, sync.revision), '{}'::jsonb)
      into v_current_revisions
      from public.athar_sync as sync
     where sync.user_id = v_user_id and sync.kind = any(v_kinds);
    return pg_catalog.jsonb_build_object('status', 'conflict', 'revisions', v_current_revisions);
  end;

  return pg_catalog.jsonb_build_object('status', 'committed', 'revisions', v_revisions);
end;
$$;

alter function private.athar_sync_commit_batch(uuid, text, jsonb) owner to postgres;
revoke all on function private.athar_sync_commit_batch(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function private.athar_sync_commit_batch(uuid, text, jsonb) to authenticated;

create or replace function private.athar_sync_ack_batch(
  p_request_id uuid,
  p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_request_id is null then
    raise exception 'request ID is required' using errcode = '22023';
  end if;
  if p_device_id is null
     or pg_catalog.length(p_device_id) not between 1 and 128
     or p_device_id <> pg_catalog.btrim(p_device_id) then
    raise exception 'invalid device ID' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 20261003)
  );

  delete from private.athar_sync_commit_receipts as receipt
   where receipt.user_id = v_user_id
     and receipt.device_id = p_device_id
     and receipt.request_id = p_request_id;
  get diagnostics v_rows = row_count;

  return pg_catalog.jsonb_build_object('acknowledged', true, 'removed', v_rows > 0);
end;
$$;

alter function private.athar_sync_ack_batch(uuid, text) owner to postgres;
revoke all on function private.athar_sync_ack_batch(uuid, text) from public, anon, authenticated;
grant execute on function private.athar_sync_ack_batch(uuid, text) to authenticated;

-- PostgREST needs the public entry points, but the exposed functions remain
-- SECURITY INVOKER. Only their private, auth.uid()-checked implementations
-- run with the trusted owner's privileges.
create or replace function public.athar_sync_commit_batch(
  p_request_id uuid,
  p_device_id text,
  p_writes jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.athar_sync_commit_batch($1, $2, $3)
$$;

alter function public.athar_sync_commit_batch(uuid, text, jsonb) owner to postgres;
revoke all on function public.athar_sync_commit_batch(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.athar_sync_commit_batch(uuid, text, jsonb) to authenticated;

create or replace function public.athar_sync_ack_batch(
  p_request_id uuid,
  p_device_id text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.athar_sync_ack_batch($1, $2)
$$;

alter function public.athar_sync_ack_batch(uuid, text) owner to postgres;
revoke all on function public.athar_sync_ack_batch(uuid, text) from public, anon, authenticated;
grant execute on function public.athar_sync_ack_batch(uuid, text) to authenticated;
