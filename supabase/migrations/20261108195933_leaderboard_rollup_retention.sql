-- The app's yearly leaderboard only includes days from the current calendar
-- year. Older daily rollups cannot appear on any board and otherwise grow
-- indefinitely, so retain only rows used by the active leaderboard periods.
delete from public.leaderboard_rollups
where day < date_trunc('year', current_date)::date;

-- Keep this cleanup running, and bound pg_cron's own execution history too.
do $$
begin
  begin
    perform cron.unschedule('athar_prune_leaderboard_rollups');
  exception when others then
    null;
  end;

  perform cron.schedule(
    'athar_prune_leaderboard_rollups',
    '47 3 * * *',
    $cron$delete from public.leaderboard_rollups
          where day < date_trunc('year', current_date)::date;
          delete from cron.job_run_details
          where end_time < now() - interval '30 days'$cron$
  );
end $$;
