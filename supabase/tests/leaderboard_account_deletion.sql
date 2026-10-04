-- Run with `supabase test db` against a disposable database after the account
-- sync and leaderboard schema migrations. Fixtures are synthetic and rolled back.
begin;

select plan(22);

select has_function('private', 'purge_leaderboard_for_auth_user_delete', array[], 'account deletion cleanup trigger function exists');
select has_trigger('auth', 'users', 'athar_purge_leaderboard_before_auth_delete', 'Auth deletion runs leaderboard cleanup first');
select has_trigger('public', 'leaderboard_user_profiles', 'leaderboard_user_profile_fingerprint_immutable', 'leaderboard fingerprints cannot be reassigned');
select ok((select prosecdef from pg_catalog.pg_proc where oid = 'private.purge_leaderboard_for_auth_user_delete()'::regprocedure), 'cleanup trigger function is SECURITY DEFINER');
select ok((select proconfig @> array['search_path='] or proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid = 'private.purge_leaderboard_for_auth_user_delete()'::regprocedure), 'cleanup trigger function fixes an empty search path');
select ok(not has_function_privilege('anon', 'private.purge_leaderboard_for_auth_user_delete()', 'execute'), 'anon cannot invoke the trigger function');

insert into auth.users (id, email)
values
  ('d1000000-0000-4000-8000-000000000001', 'delete-owner@example.invalid'),
  ('d2000000-0000-4000-8000-000000000002', 'delete-impostor@example.invalid'),
  ('d3000000-0000-4000-8000-000000000003', 'delete-no-leaderboard@example.invalid')
on conflict (id) do nothing;

insert into public.athar_sync (user_id, kind, payload)
values
  ('d1000000-0000-4000-8000-000000000001', 'settings', '{"leaderboardIdentity":{"id":"lb-synthetic-delete-owner","secret":"owner-secret"}}'::jsonb),
  ('d2000000-0000-4000-8000-000000000002', 'settings', '{"leaderboardIdentity":{"id":"lb-synthetic-delete-owner","secret":"impostor-secret"}}'::jsonb);

insert into public.leaderboard_user_profiles (user_id, fingerprint_hash)
values
  ('lb-synthetic-delete-owner', encode(extensions.digest(convert_to('lb-synthetic-delete-owner|owner-secret', 'UTF8'), 'sha256'), 'hex')),
  ('lb-synthetic-delete-other', encode(extensions.digest(convert_to('lb-synthetic-delete-other|other-secret', 'UTF8'), 'sha256'), 'hex'));

insert into public.leaderboard_score_events (
  generated_at, day, user_id, alias, fingerprint, board, score, payload, checksum
)
values
  (now(), current_date, 'lb-synthetic-delete-owner', 'Owner', 'owner-fingerprint', 'global', 12, '{}'::jsonb, 'owner-checksum'),
  (now(), current_date, 'lb-synthetic-delete-other', 'Other', 'other-fingerprint', 'global', 5, '{}'::jsonb, 'other-checksum');

insert into public.leaderboard_rollups (day, period, board, user_id, alias, score)
values
  (current_date, 'daily', 'global', 'lb-synthetic-delete-owner', 'Owner', 12),
  (current_date, 'daily', 'global', 'lb-synthetic-delete-other', 'Other', 5);

insert into public.leaderboard_user_moderation (user_id, hidden, reason)
values ('lb-synthetic-delete-owner', true, 'synthetic deletion test');

insert into public.leaderboard_alias_registry (user_id, alias_normalized, alias_display)
values ('lb-synthetic-delete-owner', 'synthetic-owner', 'Synthetic Owner');

insert into public.leaderboard_alias_audit (user_id, resolved_alias, status)
values ('lb-synthetic-delete-owner', 'Synthetic Owner', 'canonical');

select throws_ok(
  $$delete from auth.users where id = 'd2000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'a different synced secret cannot delete another leaderboard identity'
);
select is((select count(*)::integer from auth.users where id = 'd2000000-0000-4000-8000-000000000002'), 1, 'mismatched account remains intact');
select is((select count(*)::integer from public.leaderboard_score_events where user_id = 'lb-synthetic-delete-owner'), 1, 'mismatched account cannot remove score events');
select throws_ok(
  $$update public.leaderboard_user_profiles set fingerprint_hash = repeat('0', 64) where user_id = 'lb-synthetic-delete-owner'$$,
  '42501', null, 'a stored leaderboard fingerprint cannot be reassigned'
);
select is(
  (select fingerprint_hash from public.leaderboard_user_profiles where user_id = 'lb-synthetic-delete-owner'),
  encode(extensions.digest(convert_to('lb-synthetic-delete-owner|owner-secret', 'UTF8'), 'sha256'), 'hex'),
  'a rejected fingerprint update leaves the verified owner unchanged'
);

select lives_ok(
  $$delete from auth.users where id = 'd1000000-0000-4000-8000-000000000001'$$,
  'deleting the verified account succeeds'
);
select is((select count(*)::integer from auth.users where id = 'd1000000-0000-4000-8000-000000000001'), 0, 'verified auth user is deleted');
select is((select count(*)::integer from public.leaderboard_score_events where user_id = 'lb-synthetic-delete-owner'), 0, 'score events are deleted');
select is((select count(*)::integer from public.leaderboard_rollups where user_id = 'lb-synthetic-delete-owner'), 0, 'leaderboard rollups are deleted');
select is((select count(*)::integer from public.leaderboard_user_profiles where user_id = 'lb-synthetic-delete-owner'), 0, 'leaderboard profile is deleted');
select is((select count(*)::integer from public.leaderboard_user_moderation where user_id = 'lb-synthetic-delete-owner'), 0, 'leaderboard moderation data is deleted');
select is((select count(*)::integer from public.leaderboard_alias_registry where user_id = 'lb-synthetic-delete-owner'), 0, 'leaderboard alias claim is deleted');
select is((select count(*)::integer from public.leaderboard_alias_audit where user_id = 'lb-synthetic-delete-owner'), 0, 'leaderboard alias audit is deleted');
select ok(
  (select count(*) = 1 from public.leaderboard_score_events where user_id = 'lb-synthetic-delete-other')
  and (select count(*) = 1 from public.leaderboard_user_profiles where user_id = 'lb-synthetic-delete-other'),
  'another leaderboard identity remains unchanged'
);
select lives_ok(
  $$delete from auth.users where id = 'd3000000-0000-4000-8000-000000000003'$$,
  'an account without a linked leaderboard identity can still be deleted'
);
select is((select count(*)::integer from auth.users where id = 'd3000000-0000-4000-8000-000000000003'), 0, 'unlinked auth user is deleted');

select * from finish();
rollback;
