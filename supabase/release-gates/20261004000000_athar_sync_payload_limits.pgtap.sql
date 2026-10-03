-- Run on a disposable database after applying the matching release-gate SQL.
begin;

select plan(4);

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.athar_sync'::regclass
      and conname = 'athar_sync_payload_max_4mib'
      and not convalidated
  ),
  'the document size check is installed without scanning old rows'
);

insert into auth.users (id, email)
values ('a4000000-0000-4000-8000-000000000004', 'sync-payload@example.invalid')
on conflict (id) do nothing;

create temporary table athar_sync_oversized_batch as
select
  'c4000000-0000-4000-8000-000000000005'::uuid as request_id,
  'sync-device-replay'::text as device_id,
  pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
      'kind', 'settings', 'expected_revision', null,
      'payload', pg_catalog.jsonb_build_object('large', pg_catalog.repeat('x', 2700000))
    ),
    pg_catalog.jsonb_build_object(
      'kind', 'quran', 'expected_revision', null,
      'payload', pg_catalog.jsonb_build_object('large', pg_catalog.repeat('y', 2700000))
    )
  ) as writes;

grant select on athar_sync_oversized_batch to authenticated;

insert into private.athar_sync_commit_receipts
  (user_id, device_id, request_id, request_hash, revisions)
select
  'a4000000-0000-4000-8000-000000000004',
  device_id,
  request_id,
  extensions.digest(
    pg_catalog.convert_to(
      pg_catalog.jsonb_build_object('device_id', device_id, 'writes', writes)::text,
      'UTF8'
    ),
    'sha256'
  ),
  '{"settings":1,"quran":1}'::jsonb
from athar_sync_oversized_batch;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a4000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$insert into public.athar_sync (user_id, kind, payload, device_id)
    values (
      'a4000000-0000-4000-8000-000000000004', 'quran',
      pg_catalog.jsonb_build_object('large', pg_catalog.repeat('x', 4194304)),
      'sync-device-a'
    )$$,
  '23514', null, 'direct writes cannot exceed the 4 MiB document limit'
);

select throws_ok(
  $$select public.athar_sync_commit_batch(
    'c4000000-0000-4000-8000-000000000004', 'sync-device-a',
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'kind', 'settings', 'expected_revision', null,
        'payload', pg_catalog.jsonb_build_object('large', pg_catalog.repeat('x', 2700000))
      ),
      pg_catalog.jsonb_build_object(
        'kind', 'quran', 'expected_revision', null,
        'payload', pg_catalog.jsonb_build_object('large', pg_catalog.repeat('y', 2700000))
      )
    )
  )$$,
  '22023', 'SYNC_PAYLOAD_TOO_LARGE: request exceeds 5 MiB',
  'the RPC rejects an oversized batch before calling the commit implementation'
);

select is(
  (
    select public.athar_sync_commit_batch(request_id, device_id, writes)->>'status'
    from athar_sync_oversized_batch
  ),
  'replayed',
  'a previously committed oversized request can still replay its receipt'
);

reset role;
select * from finish();
rollback;
