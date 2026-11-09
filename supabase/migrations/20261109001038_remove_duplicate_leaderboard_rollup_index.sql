-- The production advisor confirmed that this expression index duplicated
-- uq_lb_rollups_day_period_board_user exactly. Keep the latter and the separate
-- column-list conflict index used by leaderboard upserts.
drop index if exists public.leaderboard_rollups_unique;
