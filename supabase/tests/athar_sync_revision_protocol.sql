-- Run with `supabase test db` against a disposable database.
-- These fixtures are synthetic and the entire test transaction is rolled back.
begin;

select plan(60);

select has_column('public', 'athar_sync', 'revision', 'sync documents have a revision');
select has_table('private', 'athar_sync_commit_receipts', 'private commit receipts exist');
select has_function('public', 'athar_sync_commit_batch', array['uuid', 'text', 'jsonb'], 'batch commit RPC exists');
select has_function('public', 'athar_sync_ack_batch', array['uuid', 'text'], 'receipt acknowledgement RPC exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'private.athar_sync_commit_receipts'::regclass), 'receipt RLS is enabled');
select ok(not has_table_privilege('anon', 'private.athar_sync_commit_receipts', 'select'), 'anon cannot read receipts');
select ok(not has_table_privilege('anon', 'private.athar_sync_commit_receipts', 'insert'), 'anon cannot create receipts');
select ok(not has_table_privilege('authenticated', 'private.athar_sync_commit_receipts', 'select'), 'authenticated cannot read receipts directly');
select ok(not has_table_privilege('authenticated', 'private.athar_sync_commit_receipts', 'insert'), 'authenticated cannot create receipts directly');
select ok(has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated can reach private helpers through public wrappers');
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon cannot reach the private schema');
select ok(not has_schema_privilege('authenticated', 'private', 'create'), 'authenticated cannot create objects in the private schema');
select ok(has_function_privilege('authenticated', 'public.athar_sync_commit_batch(uuid,text,jsonb)', 'execute'), 'authenticated can commit batches');
select ok(not has_function_privilege('anon', 'public.athar_sync_commit_batch(uuid,text,jsonb)', 'execute'), 'anon cannot commit batches');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc p
  cross join lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
  where p.oid = 'public.athar_sync_commit_batch(uuid,text,jsonb)'::regprocedure
    and acl.grantee = 0
    and acl.privilege_type = 'EXECUTE'
), 'PUBLIC cannot commit batches');
select ok(not (select prosecdef from pg_catalog.pg_proc where oid = 'public.athar_sync_commit_batch(uuid,text,jsonb)'::regprocedure), 'exposed commit RPC is SECURITY INVOKER');
select ok((select proconfig @> array['search_path='] or proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid = 'public.athar_sync_commit_batch(uuid,text,jsonb)'::regprocedure), 'public commit wrapper fixes an empty search path');
select has_function('private', 'athar_sync_commit_batch', array['uuid', 'text', 'jsonb'], 'private commit implementation exists');
select ok(has_function_privilege('authenticated', 'private.athar_sync_commit_batch(uuid,text,jsonb)', 'execute'), 'authenticated can invoke the private commit implementation through the wrapper');
select ok(not has_function_privilege('anon', 'private.athar_sync_commit_batch(uuid,text,jsonb)', 'execute'), 'anon cannot invoke the private commit implementation');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc p
  cross join lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
  where p.oid = 'private.athar_sync_commit_batch(uuid,text,jsonb)'::regprocedure
    and acl.grantee = 0
    and acl.privilege_type = 'EXECUTE'
), 'PUBLIC cannot invoke the private commit implementation');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'private.athar_sync_commit_batch(uuid,text,jsonb)'::regprocedure), 'private commit implementation is SECURITY DEFINER');
select ok((select proconfig @> array['search_path='] or proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid = 'private.athar_sync_commit_batch(uuid,text,jsonb)'::regprocedure), 'private commit implementation has an empty search path');
select is(pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid = 'private.athar_sync_commit_batch(uuid,text,jsonb)'::regprocedure)), 'postgres', 'private commit implementation has the trusted owner');
select ok(has_function_privilege('authenticated', 'public.athar_sync_ack_batch(uuid,text)', 'execute'), 'authenticated can acknowledge receipts');
select ok(not has_function_privilege('anon', 'public.athar_sync_ack_batch(uuid,text)', 'execute'), 'anon cannot acknowledge receipts');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc p
  cross join lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
  where p.oid = 'public.athar_sync_ack_batch(uuid,text)'::regprocedure
    and acl.grantee = 0
    and acl.privilege_type = 'EXECUTE'
), 'PUBLIC cannot acknowledge receipts');
select ok(not (select prosecdef from pg_catalog.pg_proc where oid = 'public.athar_sync_ack_batch(uuid,text)'::regprocedure), 'exposed ack RPC is SECURITY INVOKER');
select ok((select proconfig @> array['search_path='] or proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid = 'public.athar_sync_ack_batch(uuid,text)'::regprocedure), 'public ack wrapper fixes an empty search path');
select has_function('private', 'athar_sync_ack_batch', array['uuid', 'text'], 'private ack implementation exists');
select ok(has_function_privilege('authenticated', 'private.athar_sync_ack_batch(uuid,text)', 'execute'), 'authenticated can invoke the private ack implementation through the wrapper');
select ok(not has_function_privilege('anon', 'private.athar_sync_ack_batch(uuid,text)', 'execute'), 'anon cannot invoke the private ack implementation');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc p
  cross join lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
  where p.oid = 'private.athar_sync_ack_batch(uuid,text)'::regprocedure
    and acl.grantee = 0
    and acl.privilege_type = 'EXECUTE'
), 'PUBLIC cannot invoke the private ack implementation');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'private.athar_sync_ack_batch(uuid,text)'::regprocedure), 'private ack implementation is SECURITY DEFINER');
select ok((select proconfig @> array['search_path='] or proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid = 'private.athar_sync_ack_batch(uuid,text)'::regprocedure), 'private ack implementation has an empty search path');
select is(pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid = 'private.athar_sync_ack_batch(uuid,text)'::regprocedure)), 'postgres', 'private ack implementation has the trusted owner');

insert into auth.users (id, email)
values
  ('a1000000-0000-4000-8000-000000000001', 'sync-a@example.invalid'),
  ('b1000000-0000-4000-8000-000000000002', 'sync-b@example.invalid')
on conflict (id) do nothing;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000001', 'sync-device-a',
    '[{"kind":"favorites","expected_revision":null,"payload":{"favorites":{"a":true}}}]'::jsonb
  )->>'status', 'committed', 'owner can create a first document'
);
select is((select revision from public.athar_sync where kind = 'favorites'), 1::bigint, 'new documents start at revision one');
select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000002', 'sync-device-a',
    '[{"kind":"bookmarks","expected_revision":null,"payload":{"bookmarks":{}}}]'::jsonb
  )->>'status', 'pending_ack', 'a device cannot replace an unacknowledged receipt'
);
select is((select count(*)::integer from public.athar_sync where kind = 'bookmarks'), 0, 'blocked request made no document changes');
select throws_ok(
  $$select public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000001', 'sync-device-a',
    '[{"kind":"favorites","expected_revision":null,"payload":{"favorites":{"tampered":true}}}]'::jsonb
  )$$,
  '22023', null, 'reusing a request ID with a different hash is rejected'
);
select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000001', 'sync-device-a',
    '[{"kind":"favorites","expected_revision":null,"payload":{"favorites":{"a":true}}}]'::jsonb
  )->>'status', 'replayed', 'identical request replay returns its receipt'
);
select is((select revision from public.athar_sync where kind = 'favorites'), 1::bigint, 'replay does not increment a revision twice');

select pg_catalog.set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
select is(
  public.athar_sync_ack_batch('c1000000-0000-4000-8000-000000000001', 'sync-device-a')->>'acknowledged',
  'true', 'another account cannot acknowledge a receipt'
);
select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000003', 'sync-device-a',
    '[{"kind":"bookmarks","expected_revision":null,"payload":{"bookmarks":{}}}]'::jsonb
  )->>'status', 'pending_ack', 'foreign acknowledgement leaves the owner receipt intact'
);
select is(public.athar_sync_ack_batch('c1000000-0000-4000-8000-000000000001', 'sync-device-a')->>'acknowledged', 'true', 'owner can acknowledge its receipt');
select is(public.athar_sync_ack_batch('c1000000-0000-4000-8000-000000000001', 'sync-device-a')->>'acknowledged', 'true', 'repeated acknowledgement is harmless');

update public.athar_sync
set payload = '{"favorites":{"a":true}}'::jsonb, revision = 999
where kind = 'favorites';
select is((select revision from public.athar_sync where kind = 'favorites'), 2::bigint, 'legacy update advances revision exactly once and ignores client revision');

select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000004', 'sync-device-a',
    '[{"kind":"favorites","expected_revision":2,"payload":{"favorites":{"lost":true}}},{"kind":"progress","expected_revision":99,"payload":{"progress":{"beads":2}}}]'::jsonb
  )->>'status', 'conflict', 'one stale row conflicts the entire batch'
);
select is((select revision from public.athar_sync where kind = 'favorites'), 2::bigint, 'stale batch changes no earlier document');
select is((select payload from public.athar_sync where kind = 'favorites'), '{"favorites":{"a":true}}'::jsonb, 'stale batch preserves original payload');

select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000005', 'sync-device-a',
    '[{"kind":"favorites","expected_revision":2,"payload":{"favorites":{"a":true,"next":true}}},{"kind":"progress","expected_revision":null,"payload":{"progress":{"beads":4}}}]'::jsonb
  )->>'status', 'committed', 'owner can atomically update and insert documents'
);
select is((select revision from public.athar_sync where kind = 'favorites'), 3::bigint, 'updated document increments revision once');
select is((select revision from public.athar_sync where kind = 'progress'), 1::bigint, 'batch insert starts at revision one');
select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000005', 'sync-device-a',
    '[{"kind":"favorites","expected_revision":2,"payload":{"favorites":{"a":true,"next":true}}},{"kind":"progress","expected_revision":null,"payload":{"progress":{"beads":4}}}]'::jsonb
  )->>'status', 'replayed', 'successful batch replay is idempotent'
);
select is((select revision from public.athar_sync where kind = 'favorites'), 3::bigint, 'batch replay does not apply updates twice');
select is(public.athar_sync_ack_batch('c1000000-0000-4000-8000-000000000005', 'sync-device-a')->>'acknowledged', 'true', 'owner acknowledges the second receipt');

select pg_catalog.set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
select is(
  public.athar_sync_commit_batch(
    'c1000000-0000-4000-8000-000000000006', 'sync-device-b',
    '[{"kind":"settings","expected_revision":null,"payload":{"settings":{"theme":"dark"}}}]'::jsonb
  )->>'status', 'committed', 'second account writes only its own document'
);
select is((select count(*)::integer from public.athar_sync where user_id = 'a1000000-0000-4000-8000-000000000001'), 0, 'RLS hides another account’s rows');
select is((select count(*)::integer from public.athar_sync where user_id = 'b1000000-0000-4000-8000-000000000002'), 1, 'RLS shows the current account’s rows');

reset role;
select * from finish();
rollback;
