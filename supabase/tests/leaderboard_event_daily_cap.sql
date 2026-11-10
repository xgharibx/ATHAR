-- Run after leaderboard_event_daily_cap on a disposable database.
-- Synthetic score events and private counters are rolled back at the end.
begin;

select plan(14);

select has_table('private', 'leaderboard_event_daily_usage', 'private daily event counters exist');
select has_trigger('public', 'leaderboard_score_events', 'leaderboard_event_daily_limit_before_insert', 'new score events pass through the daily cap');
select has_trigger('public', 'leaderboard_score_events', 'leaderboard_event_daily_usage_after_delete', 'deleting a score event frees capacity');
select has_trigger('public', 'leaderboard_score_events', 'leaderboard_event_daily_usage_after_truncate', 'truncating score events clears counters');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'private.leaderboard_event_daily_usage'::regclass), 'private counters have RLS enabled');
select ok(not has_table_privilege('anon', 'private.leaderboard_event_daily_usage', 'select'), 'anon cannot read private counters');
select ok(not has_table_privilege('service_role', 'private.leaderboard_event_daily_usage', 'select'), 'service role cannot read private counters directly');

insert into public.leaderboard_score_events (generated_at, day, user_id, alias, fingerprint, board, period, section_id, score, payload, checksum)
select now(), current_date, 'codex-test-leaderboard-event-cap', 'Synthetic test', repeat('f', 64),
       'global', 'daily', null, n, '{}'::jsonb, lpad(to_hex(n), 64, '0')
from generate_series(1, 2001) as n;

select is(
  (select count(*)::integer from public.leaderboard_score_events where user_id = 'codex-test-leaderboard-event-cap' and board = 'global' and section_id is null),
  2000,
  'at most 2000 global audit events are retained for one identity/day'
);
select is(
  (select event_count from private.leaderboard_event_daily_usage where user_id = 'codex-test-leaderboard-event-cap' and day = current_date),
  2000,
  'the private event counter matches accepted rows'
);

insert into public.leaderboard_score_events (generated_at, day, user_id, alias, fingerprint, board, period, section_id, score, payload, checksum)
values (now(), current_date, 'codex-test-leaderboard-event-cap', 'Synthetic test', repeat('f', 64), 'global', 'daily', null, 1, '{}'::jsonb, repeat('e', 64));
select is(
  (select count(*)::integer from public.leaderboard_score_events where user_id = 'codex-test-leaderboard-event-cap' and board = 'global' and section_id is null),
  2000,
  'another event is skipped after the daily cap'
);

delete from public.leaderboard_score_events
where user_id = 'codex-test-leaderboard-event-cap' and checksum = lpad(to_hex(1), 64, '0');
select is(
  (select event_count from private.leaderboard_event_daily_usage where user_id = 'codex-test-leaderboard-event-cap' and day = current_date),
  1999,
  'deleting an event decrements the counter'
);

insert into public.leaderboard_score_events (generated_at, day, user_id, alias, fingerprint, board, period, section_id, score, payload, checksum)
values (now(), current_date, 'codex-test-leaderboard-event-cap', 'Synthetic test', repeat('f', 64), 'global', 'daily', null, 1, '{}'::jsonb, repeat('d', 64));
select is(
  (select count(*)::integer from public.leaderboard_score_events where user_id = 'codex-test-leaderboard-event-cap' and board = 'global' and section_id is null),
  2000,
  'a freed slot accepts one new event'
);

delete from public.leaderboard_score_events where user_id = 'codex-test-leaderboard-event-cap';
select is(
  (select count(*)::integer from private.leaderboard_event_daily_usage where user_id = 'codex-test-leaderboard-event-cap'),
  0,
  'deleting all synthetic events removes the private counter'
);
select is(
  (select count(*)::integer from public.leaderboard_score_events where user_id = 'codex-test-leaderboard-event-cap'),
  0,
  'all synthetic score events are cleaned up'
);

select * from finish();
rollback;
