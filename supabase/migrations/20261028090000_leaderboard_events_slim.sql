-- Shrink leaderboard_score_events, which was filling the free database quota.
--
-- Cause: every accepted submission inserted one row per board and per section
-- (~37 rows), and each row carried a full copy of the submission payload. Nothing
-- ever read those extra rows: the dedup checks in the leaderboard edge function
-- only look at the day's "global" row, and every public board is served from
-- leaderboard_rollups. The edge function now writes the single global row.
--
-- This migration clears the backlog and tightens retention. Rollups are untouched.
-- Nothing reads events older than the allowed client day skew (3 days), so a week is
-- generous.

begin;

-- Rows the function no longer writes and nothing reads.
delete from public.leaderboard_score_events
where board <> 'global' or section_id is not null;

-- Keep a week of the global rows.
delete from public.leaderboard_score_events
where day < (current_date - interval '7 days');

-- The alias audit logged the default "canonical" outcome on every submission (~195k rows).
-- The edge function now records only non-default decisions; drop the noise and keep a month.
delete from public.leaderboard_alias_audit where status = 'canonical';
delete from public.leaderboard_alias_audit where created_at < now() - interval '30 days';

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
    null;
  end;

  begin
    perform cron.schedule(
      'athar_prune_leaderboard_events',
      '17 3 * * *',
      $cron$delete from public.leaderboard_score_events
            where day < (current_date - interval '7 days');
            delete from public.leaderboard_alias_audit
            where created_at < now() - interval '30 days'$cron$
    );
  exception when others then
    raise notice 'could not schedule prune (%)', sqlerrm;
  end;
end $$;

-- Deleted rows free space inside the table but the database size shown in the dashboard
-- only drops after a rewrite. Run this once, by hand, after the migration (it cannot run
-- inside a migration transaction and briefly locks the table):
--
--   vacuum full public.leaderboard_score_events;
--   vacuum full public.leaderboard_alias_audit;
