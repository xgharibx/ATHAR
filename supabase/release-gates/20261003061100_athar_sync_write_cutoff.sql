-- RELEASE GATE: apply only after the RPC client is available on web, Android,
-- and iOS and the rollout has been checked. This deliberately retires direct
-- table writers; it is separate from the additive revision-protocol migration.

alter table public.athar_sync enable row level security;

drop policy if exists athar_sync_insert_own on public.athar_sync;
drop policy if exists athar_sync_update_own on public.athar_sync;
drop policy if exists athar_sync_delete_own on public.athar_sync;

drop policy if exists athar_sync_select_own on public.athar_sync;
create policy athar_sync_select_own on public.athar_sync
  for select using (auth.uid() = user_id);

revoke all on table public.athar_sync from public, anon, authenticated;
grant select on table public.athar_sync to authenticated;

comment on table public.athar_sync is
  'Per-user sync documents. Authenticated reads are owner-scoped; writes must use the revision-checked batch RPC.';
