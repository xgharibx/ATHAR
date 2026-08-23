-- Drop the pre-repair rollup snapshots.
--
-- Taken before the two carry-over repairs so those could be undone (and one
-- was). Both repairs are settled and verified, so these are now just stale
-- copies of a live table sitting in the database.
drop table if exists public.leaderboard_rollups_backup_20260823;
drop table if exists public.leaderboard_rollups_backup_v2;
