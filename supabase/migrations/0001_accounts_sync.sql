-- Athar accounts & cloud sync — schema + row-level security.
--
-- Run this once in the Supabase SQL editor (see docs/ACCOUNTS_SETUP.md).
--
-- Design notes:
--
-- * One row per user per "document". The app's state is a handful of coherent
--   blobs (progress, favorites, reminders, settings…), not relational data, so
--   storing them as JSONB keeps sync simple and lets the client evolve its
--   shape without a migration every time. Splitting by `kind` means a write to
--   settings never has to touch the (much larger) progress blob.
--
-- * `updated_at` is what the sync engine uses for last-write-wins per document,
--   and `device_id` records which device wrote last so the UI can explain a
--   conflict rather than silently clobbering.
--
-- * RLS is ON for every table with policies keyed to auth.uid(). Without this,
--   the anon key shipped in the client could read every user's data — so these
--   policies are the entire security model, not a nicety.

create table if not exists public.athar_sync (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  kind        text        not null,
  payload     jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  device_id   text,
  primary key (user_id, kind)
);

comment on table public.athar_sync is
  'Per-user synced app state, one row per document kind (progress, favorites, reminders, settings, quran).';

-- Guard against typos silently creating orphan document kinds.
alter table public.athar_sync
  drop constraint if exists athar_sync_kind_check;
alter table public.athar_sync
  add constraint athar_sync_kind_check
  check (kind in ('progress', 'favorites', 'bookmarks', 'reminders', 'quran', 'settings'));

create index if not exists athar_sync_user_idx on public.athar_sync (user_id);

alter table public.athar_sync enable row level security;

-- Each policy is scoped to the caller's own uid. `with check` on insert/update
-- is what stops a client from writing a row under someone else's user_id.
drop policy if exists athar_sync_select_own on public.athar_sync;
create policy athar_sync_select_own on public.athar_sync
  for select using (auth.uid() = user_id);

drop policy if exists athar_sync_insert_own on public.athar_sync;
create policy athar_sync_insert_own on public.athar_sync
  for insert with check (auth.uid() = user_id);

drop policy if exists athar_sync_update_own on public.athar_sync;
create policy athar_sync_update_own on public.athar_sync
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists athar_sync_delete_own on public.athar_sync;
create policy athar_sync_delete_own on public.athar_sync
  for delete using (auth.uid() = user_id);

-- Keep updated_at honest even if a client forgets to send it.
create or replace function public.athar_sync_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists athar_sync_touch_trg on public.athar_sync;
create trigger athar_sync_touch_trg
  before update on public.athar_sync
  for each row execute function public.athar_sync_touch();

-- Optional profile row, so the leaderboard can show a real display name
-- instead of the current device-generated alias once a user signs in.
create table if not exists public.athar_profiles (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  display_name text,
  updated_at   timestamptz not null default now()
);

alter table public.athar_profiles enable row level security;

drop policy if exists athar_profiles_select_own on public.athar_profiles;
create policy athar_profiles_select_own on public.athar_profiles
  for select using (auth.uid() = user_id);

drop policy if exists athar_profiles_upsert_own on public.athar_profiles;
create policy athar_profiles_upsert_own on public.athar_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists athar_profiles_update_own on public.athar_profiles;
create policy athar_profiles_update_own on public.athar_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
