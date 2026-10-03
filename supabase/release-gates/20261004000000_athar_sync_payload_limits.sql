-- Apply on disposable staging after confirming the 4 MiB document and 5 MiB
-- batch limits work for the deployed client. NOT VALID avoids scanning existing
-- JSON documents while enforcing the check on every new or updated row.
alter table public.athar_sync
  add constraint athar_sync_payload_max_4mib
  check (pg_catalog.octet_length(payload::text) <= 4194304)
  not valid;

comment on constraint athar_sync_payload_max_4mib on public.athar_sync is
  'Limits each cloud-sync JSON document to 4 MiB of UTF-8 JSON text.';

-- Preserve replay of a request that committed before this cap was installed.
-- Only a new oversized batch is rejected; the existing private implementation
-- remains responsible for all writes and conflict checks.
create or replace function private.athar_sync_commit_batch_guarded(
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
  v_receipt private.athar_sync_commit_receipts%rowtype;
  v_hash bytea;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if pg_catalog.octet_length(p_writes::text) <= 5242880 then
    return private.athar_sync_commit_batch(p_request_id, p_device_id, p_writes);
  end if;

  -- Match the existing RPC's bounded request envelope before checking receipts.
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

  raise exception 'SYNC_PAYLOAD_TOO_LARGE: request exceeds 5 MiB' using errcode = '22023';
end;
$$;

alter function private.athar_sync_commit_batch_guarded(uuid, text, jsonb) owner to postgres;
revoke all on function private.athar_sync_commit_batch_guarded(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function private.athar_sync_commit_batch_guarded(uuid, text, jsonb) to authenticated;

-- Keep the exposed RPC SECURITY INVOKER with its empty search path.
create or replace function public.athar_sync_commit_batch(
  p_request_id uuid,
  p_device_id text,
  p_writes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.athar_sync_commit_batch_guarded(p_request_id, p_device_id, p_writes);
end;
$$;

alter function public.athar_sync_commit_batch(uuid, text, jsonb) owner to postgres;
revoke all on function public.athar_sync_commit_batch(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.athar_sync_commit_batch(uuid, text, jsonb) to authenticated;
