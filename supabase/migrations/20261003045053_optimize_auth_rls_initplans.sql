-- Keep the sync trigger on a fixed catalog-only search path.
alter function public.athar_sync_touch()
  set search_path = pg_catalog;

-- Wrap auth.uid() as a scalar subquery so Postgres can evaluate it once per
-- statement instead of once per row. The predicates remain owner-equality checks.
drop policy if exists athar_sync_select_own on public.athar_sync;
create policy athar_sync_select_own on public.athar_sync
  as permissive for select to public
  using ((select auth.uid()) = user_id);

drop policy if exists athar_sync_insert_own on public.athar_sync;
create policy athar_sync_insert_own on public.athar_sync
  as permissive for insert to public
  with check ((select auth.uid()) = user_id);

drop policy if exists athar_sync_update_own on public.athar_sync;
create policy athar_sync_update_own on public.athar_sync
  as permissive for update to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists athar_sync_delete_own on public.athar_sync;
create policy athar_sync_delete_own on public.athar_sync
  as permissive for delete to public
  using ((select auth.uid()) = user_id);

drop policy if exists athar_profiles_select_own on public.athar_profiles;
create policy athar_profiles_select_own on public.athar_profiles
  as permissive for select to public
  using ((select auth.uid()) = user_id);

drop policy if exists athar_profiles_update_own on public.athar_profiles;
create policy athar_profiles_update_own on public.athar_profiles
  as permissive for update to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists athar_profiles_upsert_own on public.athar_profiles;
create policy athar_profiles_upsert_own on public.athar_profiles
  as permissive for insert to public
  with check ((select auth.uid()) = user_id);
