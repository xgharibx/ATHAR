-- Run in Supabase Dashboard > SQL Editor. Shows which tables use the database space.
select
  schemaname || '.' || relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total,
  pg_size_pretty(pg_relation_size(relid)) as table_only,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as indexes_and_toast,
  n_live_tup as approx_rows
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 15;

-- After deploying the migration, run once to actually return the space:
-- vacuum full public.leaderboard_score_events;

-- Rows per day in the events table (should now be ~1 per submission):
-- select day, count(*) from public.leaderboard_score_events group by day order by day desc limit 10;
