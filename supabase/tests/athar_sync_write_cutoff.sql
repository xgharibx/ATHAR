-- Run after the revision protocol and cutoff migrations on disposable staging.
-- Synthetic users and documents are contained in this transaction and rolled back.
begin;

select plan(24);

select ok(not has_table_privilege('anon', 'public.athar_sync', 'select'), 'anon cannot read sync rows');
select ok(not has_table_privilege('anon', 'public.athar_sync', 'insert'), 'anon cannot insert sync rows');
select ok(not has_table_privilege('anon', 'public.athar_sync', 'update'), 'anon cannot update sync rows');
select ok(not has_table_privilege('anon', 'public.athar_sync', 'delete'), 'anon cannot delete sync rows');
select ok(has_table_privilege('authenticated', 'public.athar_sync', 'select'), 'authenticated retains SELECT');
select ok(not has_table_privilege('authenticated', 'public.athar_sync', 'insert'), 'authenticated cannot insert directly');
select ok(not has_table_privilege('authenticated', 'public.athar_sync', 'update'), 'authenticated cannot update directly');
select ok(not has_table_privilege('authenticated', 'public.athar_sync', 'delete'), 'authenticated cannot delete directly');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.athar_sync'::regclass), 'sync row-level security remains enabled');
select ok(not exists (
  select 1 from pg_catalog.pg_policies
  where schemaname = 'public' and tablename = 'athar_sync' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
), 'only the owner-scoped SELECT policy remains');
select ok(has_function_privilege('authenticated', 'public.athar_sync_commit_batch(uuid,text,jsonb)', 'execute'), 'authenticated retains the commit RPC');
select ok(not has_function_privilege('anon', 'public.athar_sync_commit_batch(uuid,text,jsonb)', 'execute'), 'anon cannot call the commit RPC');

insert into auth.users (id, email)
values
  ('a2000000-0000-4000-8000-000000000001', 'cutoff-a@example.invalid'),
  ('b2000000-0000-4000-8000-000000000002', 'cutoff-b@example.invalid')
on conflict (id) do nothing;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000001', true);
select is(
  public.athar_sync_commit_batch(
    'c2000000-0000-4000-8000-000000000001', 'cutoff-device-a',
    '[{"kind":"favorites","expected_revision":null,"payload":{"favorites":{"one":true}}}]'::jsonb
  )->>'status', 'committed', 'authenticated owner can still commit through the RPC'
);
select is((select count(*)::integer from public.athar_sync where user_id = 'a2000000-0000-4000-8000-000000000001'), 1, 'owner can read its own row');

select pg_catalog.set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000002', true);
select is(
  public.athar_sync_commit_batch(
    'c2000000-0000-4000-8000-000000000002', 'cutoff-device-b',
    '[{"kind":"settings","expected_revision":null,"payload":{"prefs":{"theme":"dark"}}}]'::jsonb
  )->>'status', 'committed', 'second synthetic owner can commit through the RPC'
);
select pg_catalog.set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.athar_sync where user_id = 'b2000000-0000-4000-8000-000000000002'), 0, 'RLS hides the other owner’s row');

select throws_ok(
  $$insert into public.athar_sync (user_id, kind, payload) values ('a2000000-0000-4000-8000-000000000001', 'bookmarks', '{}'::jsonb)$$,
  '42501', null, 'direct authenticated insert is denied'
);
select throws_ok(
  $$update public.athar_sync set payload = '{}'::jsonb where kind = 'favorites'$$,
  '42501', null, 'direct authenticated update is denied'
);
select throws_ok(
  $$delete from public.athar_sync where kind = 'favorites'$$,
  '42501', null, 'direct authenticated delete is denied'
);
select is(public.athar_sync_ack_batch('c2000000-0000-4000-8000-000000000001', 'cutoff-device-a')->>'acknowledged', 'true', 'owner acknowledges the first RPC commit');
select is(
  public.athar_sync_commit_batch(
    'c2000000-0000-4000-8000-000000000003', 'cutoff-device-a',
    '[{"kind":"favorites","expected_revision":1,"payload":{"favorites":{"one":true,"two":true}}}]'::jsonb
  )->>'status', 'committed', 'RPC continues to update after direct writes are revoked'
);
select is((select revision from public.athar_sync where kind = 'favorites'), 2::bigint, 'RPC update advances revision');

reset role;
set local role anon;
select pg_catalog.set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::integer from public.athar_sync), 0, 'anonymous SELECT sees no rows');
select throws_ok(
  $$insert into public.athar_sync (user_id, kind, payload) values ('a2000000-0000-4000-8000-000000000001', 'quran', '{}'::jsonb)$$,
  '42501', null, 'direct anonymous insert is denied'
);

reset role;
select * from finish();
rollback;
