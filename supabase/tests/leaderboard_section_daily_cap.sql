-- Run after leaderboard_section_daily_cap on a disposable database.
-- Synthetic rollups and the helper counter are rolled back at the end.
begin;

select plan(14);

select has_table('private', 'leaderboard_section_daily_usage', 'private daily section counters exist');
select has_trigger('public', 'leaderboard_rollups', 'leaderboard_section_daily_limit_before_insert', 'new section rollups pass through the daily cap');
select has_trigger('public', 'leaderboard_rollups', 'leaderboard_section_daily_usage_after_delete', 'deleting a section rollup frees capacity');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'private.leaderboard_section_daily_usage'::regclass), 'private counters have RLS enabled');
select ok(not has_table_privilege('anon', 'private.leaderboard_section_daily_usage', 'select'), 'anon cannot read private counters');
select ok(not has_table_privilege('service_role', 'private.leaderboard_section_daily_usage', 'select'), 'service role cannot read private counters directly');

insert into public.leaderboard_rollups (day, period, board, section_id, user_id, alias, score)
select current_date, 'daily', 'section', 'codex-cap-' || n::text,
       'codex-test-leaderboard-section-cap', 'Synthetic test', n
from generate_series(1, 65) as n;

select is(
  (select count(*)::integer from public.leaderboard_rollups where user_id = 'codex-test-leaderboard-section-cap' and board = 'section'),
  64,
  'only 64 unique daily section rollups are accepted for one identity'
);
select is(
  (select section_count from private.leaderboard_section_daily_usage where user_id = 'codex-test-leaderboard-section-cap' and day = current_date),
  64,
  'the private counter matches accepted section rows'
);

insert into public.leaderboard_rollups (day, period, board, section_id, user_id, alias, score)
values (current_date, 'daily', 'section', 'codex-cap-1', 'codex-test-leaderboard-section-cap', 'Synthetic test', 999)
on conflict (day, period, board, section_id, user_id) do update set score = excluded.score;

select is(
  (select score from public.leaderboard_rollups where user_id = 'codex-test-leaderboard-section-cap' and section_id = 'codex-cap-1'),
  999,
  'existing section keys remain updatable at the cap'
);
select is(
  (select section_count from private.leaderboard_section_daily_usage where user_id = 'codex-test-leaderboard-section-cap' and day = current_date),
  64,
  'updating an existing key does not consume another slot'
);

delete from public.leaderboard_rollups
where user_id = 'codex-test-leaderboard-section-cap' and section_id = 'codex-cap-1';
select is(
  (select section_count from private.leaderboard_section_daily_usage where user_id = 'codex-test-leaderboard-section-cap' and day = current_date),
  63,
  'deleting a section key decrements the counter'
);

insert into public.leaderboard_rollups (day, period, board, section_id, user_id, alias, score)
values (current_date, 'daily', 'section', 'codex-cap-65', 'codex-test-leaderboard-section-cap', 'Synthetic test', 65);
select is(
  (select count(*)::integer from public.leaderboard_rollups where user_id = 'codex-test-leaderboard-section-cap' and board = 'section'),
  64,
  'a freed slot accepts one new unique section key'
);

delete from public.leaderboard_rollups where user_id = 'codex-test-leaderboard-section-cap';
select is(
  (select count(*)::integer from private.leaderboard_section_daily_usage where user_id = 'codex-test-leaderboard-section-cap'),
  0,
  'deleting all synthetic rows removes the private counter'
);
select is(
  (select count(*)::integer from public.leaderboard_rollups where user_id = 'codex-test-leaderboard-section-cap'),
  0,
  'all synthetic rollups are cleaned up'
);

select * from finish();
rollback;
