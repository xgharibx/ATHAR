-- ATHAR Leaderboard hardening patch for existing deployments
-- Run this if leaderboard tables already exist in production.

alter table public.leaderboard_score_events
  add column if not exists checksum text;

update public.leaderboard_score_events
set checksum = coalesce(payload->>'checksum', md5(random()::text || now()::text))
where checksum is null;

alter table public.leaderboard_score_events
  alter column checksum set not null;

create index if not exists idx_lb_events_checksum on public.leaderboard_score_events (checksum);

create unique index if not exists uq_lb_events_no_replay
  on public.leaderboard_score_events (day, user_id, board, coalesce(section_id, ''), checksum);
