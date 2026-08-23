-- Retention for leaderboard_score_events, and make it self-maintaining.
--
-- That table is an append-only audit log: up to MAX_EVENTS_PER_USER_PER_DAY
-- rows per user per day, forever. Nothing reads it beyond the current day —
-- the three queries in the edge function (last-snapshot dedup, checksum replay
-- check, per-day count) all filter on `day = payload.day`, and every public
-- read is served from leaderboard_rollups. So old rows cost storage and slow
-- writes without ever being looked at.
--
-- Rollups are NOT touched: they are the leaderboard's history and are what the
-- weekly/monthly/yearly boards sum over.
--
-- Scheduled with pg_cron so it keeps happening without anyone running anything.
-- If pg_cron is unavailable the one-off cleanup below still applies and the
-- migration still succeeds — a missing scheduler must not block a deploy.

begin;

delete from public.leaderboard_score_events
where day < (current_date - interval '90 days');

commit;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron unavailable (%), skipping schedule', sqlerrm;
    return;
  end;

  begin
    perform cron.unschedule('athar_prune_leaderboard_events');
  exception when others then
    null; -- not scheduled yet, which is the normal first run
  end;

  begin
    perform cron.schedule(
      'athar_prune_leaderboard_events',
      '17 3 * * *',  -- daily, off the hour to avoid the crowd
      $cron$delete from public.leaderboard_score_events
            where day < (current_date - interval '90 days')$cron$
    );
    raise notice 'scheduled athar_prune_leaderboard_events';
  exception when others then
    raise notice 'could not schedule prune (%)', sqlerrm;
  end;
end $$;
