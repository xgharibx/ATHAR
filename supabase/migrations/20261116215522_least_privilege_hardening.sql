-- Least-privilege hardening for the public API surface.
--
-- Nothing here changes what a signed-in user can do with their own data. It
-- removes privileges that were never needed, so that a future mistake in a
-- policy cannot be reached by an anonymous caller.

-- 1. Synced data belongs to signed-in users. Anonymous callers get no table
--    privileges at all, and signed-in users keep only row operations.
revoke all privileges on table public.athar_sync, public.athar_profiles from public, anon;
revoke truncate, references, trigger on table public.athar_sync, public.athar_profiles from authenticated;

alter policy athar_sync_select_own on public.athar_sync to authenticated;
alter policy athar_sync_insert_own on public.athar_sync to authenticated;
alter policy athar_sync_update_own on public.athar_sync to authenticated;
alter policy athar_sync_delete_own on public.athar_sync to authenticated;
alter policy athar_profiles_select_own on public.athar_profiles to authenticated;
alter policy athar_profiles_upsert_own on public.athar_profiles to authenticated;
alter policy athar_profiles_update_own on public.athar_profiles to authenticated;

-- 2. A trigger function is never called directly.
revoke all privileges on function public.athar_sync_touch() from public, anon, authenticated;

-- 3. The account-to-leaderboard link table is reached only through
--    owner-run functions. Row-level security makes that the only way in.
alter table private.auth_leaderboard_identity_links enable row level security;

-- 4. Server-only tables: state the rule explicitly. These tables are read and
--    written only by Edge Functions and owner-run functions; a restrictive
--    policy documents that no API role may ever be given direct access.
do $$
declare
  target text;
  policy_name text;
begin
  foreach target in array array[
    'public.companion_usage_counters',
    'public.companion_global_usage_counters',
    'public.dorar_usage_counters',
    'public.quran_translation_usage_counters',
    'public.leaderboard_alias_audit',
    'public.leaderboard_alias_registry',
    'public.leaderboard_name_blocklist',
    'public.leaderboard_rollups',
    'public.leaderboard_score_events',
    'public.leaderboard_user_moderation',
    'public.leaderboard_user_profiles',
    'private.athar_sync_commit_receipts',
    'private.auth_leaderboard_identity_links',
    'private.leaderboard_event_daily_usage',
    'private.leaderboard_section_daily_usage'
  ]
  loop
    if to_regclass(target) is null then
      continue;
    end if;
    policy_name := split_part(target, '.', 2) || '_no_direct_access';
    if not exists (
      select 1 from pg_policy where polrelid = to_regclass(target) and polname = policy_name
    ) then
      execute format(
        'create policy %I on %s as restrictive for all to anon, authenticated using (false) with check (false)',
        policy_name, target
      );
    end if;
  end loop;
end
$$;
