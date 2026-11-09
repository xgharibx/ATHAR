-- Account deletion must not depend on flushing the full app snapshot. Store
-- verified account-to-leaderboard links (fingerprints only), so all identities
-- copied to or synced with an account can be handled atomically on deletion.

create schema if not exists private;

create table if not exists private.auth_leaderboard_identity_links (
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  leaderboard_user_id text not null,
  fingerprint_hash text not null check (fingerprint_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (auth_user_id, leaderboard_user_id)
);

create index if not exists auth_leaderboard_identity_links_user_idx
  on private.auth_leaderboard_identity_links (leaderboard_user_id);

alter table private.auth_leaderboard_identity_links owner to postgres;
revoke all on table private.auth_leaderboard_identity_links
  from public, anon, authenticated, service_role;

-- Record identities when sync stores them, not only when an account is about
-- to be deleted. The same identity can be imported into more than one account;
-- deleting one account must not erase rankings another account still uses.
create or replace function private.capture_account_leaderboard_identity_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity jsonb;
  v_user_id text;
  v_secret text;
  v_expected_fingerprint text;
  v_stored_fingerprint text;
begin
  if new.kind <> 'settings' then
    return new;
  end if;

  v_identity := new.payload -> 'leaderboardIdentity';
  if pg_catalog.jsonb_typeof(v_identity) is distinct from 'object' then
    return new;
  end if;

  v_user_id := v_identity ->> 'id';
  v_secret := v_identity ->> 'secret';
  if v_user_id is null
     or pg_catalog.length(v_user_id) not between 1 and 120
     or v_secret is null
     or pg_catalog.length(v_secret) not between 1 and 512
     or v_user_id = 'anon_fallback'
     or v_secret = 'fallback_secret'
     or pg_catalog.to_regclass('public.leaderboard_user_profiles') is null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id, 0));

  select fingerprint_hash
    into v_stored_fingerprint
  from public.leaderboard_user_profiles
  where user_id = v_user_id;
  if not found then
    return new;
  end if;

  v_expected_fingerprint := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_user_id || '|' || v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  if pg_catalog.lower(coalesce(v_stored_fingerprint, '')) <> v_expected_fingerprint then
    return new;
  end if;

  insert into private.auth_leaderboard_identity_links (
    auth_user_id,
    leaderboard_user_id,
    fingerprint_hash
  ) values (
    new.user_id,
    v_user_id,
    v_expected_fingerprint
  ) on conflict (auth_user_id, leaderboard_user_id) do nothing;

  return new;
end;
$$;

alter function private.capture_account_leaderboard_identity_link() owner to postgres;
revoke all on function private.capture_account_leaderboard_identity_link()
  from public, anon, authenticated, service_role;

drop trigger if exists athar_capture_leaderboard_identity_link on public.athar_sync;
create trigger athar_capture_leaderboard_identity_link
  after insert or update of payload on public.athar_sync
  for each row
  execute function private.capture_account_leaderboard_identity_link();

-- Sync settings may arrive before the first leaderboard submission creates a
-- profile. Revisit those settings when the profile appears so every importing
-- account is linked before any one of them can delete the shared identity.
create or replace function private.capture_existing_sync_links_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sync record;
  v_secret text;
  v_expected_fingerprint text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id, 0));

  for v_sync in
    select s.user_id as auth_user_id, s.payload -> 'leaderboardIdentity' as identity_json
    from public.athar_sync s
    where s.kind = 'settings'
      and s.payload -> 'leaderboardIdentity' ->> 'id' = new.user_id
    order by s.user_id
  loop
    if pg_catalog.jsonb_typeof(v_sync.identity_json) is distinct from 'object' then
      continue;
    end if;
    v_secret := v_sync.identity_json ->> 'secret';
    if v_secret is null
       or pg_catalog.length(v_secret) not between 1 and 512
       or v_secret = 'fallback_secret'
       or new.user_id = 'anon_fallback' then
      continue;
    end if;

    v_expected_fingerprint := pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(new.user_id || '|' || v_secret, 'UTF8'),
        'sha256'
      ),
      'hex'
    );
    if pg_catalog.lower(coalesce(new.fingerprint_hash, '')) <> v_expected_fingerprint then
      continue;
    end if;

    insert into private.auth_leaderboard_identity_links (
      auth_user_id,
      leaderboard_user_id,
      fingerprint_hash
    ) values (
      v_sync.auth_user_id,
      new.user_id,
      v_expected_fingerprint
    ) on conflict (auth_user_id, leaderboard_user_id) do nothing;
  end loop;

  return new;
end;
$$;

alter function private.capture_existing_sync_links_for_profile() owner to postgres;
revoke all on function private.capture_existing_sync_links_for_profile()
  from public, anon, authenticated, service_role;

drop trigger if exists athar_capture_sync_links_for_leaderboard_profile on public.leaderboard_user_profiles;
create trigger athar_capture_sync_links_for_leaderboard_profile
  after insert or update of fingerprint_hash on public.leaderboard_user_profiles
  for each row
  execute function private.capture_existing_sync_links_for_profile();

-- Backfill already-synced, cryptographically verified ownership associations.
insert into private.auth_leaderboard_identity_links (
  auth_user_id,
  leaderboard_user_id,
  fingerprint_hash
)
select
  s.user_id,
  x.identity_json ->> 'id',
  p.fingerprint_hash
from public.athar_sync s
cross join lateral (select s.payload -> 'leaderboardIdentity' as identity_json) x
join public.leaderboard_user_profiles p
  on p.user_id = x.identity_json ->> 'id'
where s.kind = 'settings'
  and pg_catalog.jsonb_typeof(x.identity_json) = 'object'
  and pg_catalog.length(coalesce(x.identity_json ->> 'id', '')) between 1 and 120
  and pg_catalog.length(coalesce(x.identity_json ->> 'secret', '')) between 1 and 512
  and x.identity_json ->> 'id' <> 'anon_fallback'
  and x.identity_json ->> 'secret' <> 'fallback_secret'
  and p.fingerprint_hash = pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to((x.identity_json ->> 'id') || '|' || (x.identity_json ->> 'secret'), 'UTF8'),
      'sha256'
    ),
    'hex'
  )
on conflict (auth_user_id, leaderboard_user_id) do nothing;

create or replace function private.leaderboard_identity_has_other_account(
  p_leaderboard_user_id text,
  p_fingerprint_hash text,
  p_auth_user_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.auth_leaderboard_identity_links other_link
    where other_link.leaderboard_user_id = p_leaderboard_user_id
      and other_link.auth_user_id <> p_auth_user_id
      and other_link.fingerprint_hash = p_fingerprint_hash
  ) or exists (
    select 1
    from public.athar_sync other_sync
    join public.leaderboard_user_profiles profile
      on profile.user_id = p_leaderboard_user_id
    where other_sync.user_id <> p_auth_user_id
      and other_sync.kind = 'settings'
      and other_sync.payload -> 'leaderboardIdentity' ->> 'id' = p_leaderboard_user_id
      and pg_catalog.length(coalesce(other_sync.payload -> 'leaderboardIdentity' ->> 'secret', '')) between 1 and 512
      and other_sync.payload -> 'leaderboardIdentity' ->> 'secret' <> 'fallback_secret'
      and profile.fingerprint_hash = p_fingerprint_hash
      and pg_catalog.encode(
        extensions.digest(
          pg_catalog.convert_to(
            p_leaderboard_user_id || '|' || (other_sync.payload -> 'leaderboardIdentity' ->> 'secret'),
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ) = p_fingerprint_hash
  );
$$;

alter function private.leaderboard_identity_has_other_account(text, text, uuid) owner to postgres;
revoke all on function private.leaderboard_identity_has_other_account(text, text, uuid)
  from public, anon, authenticated, service_role;

-- Called only by the authenticated delete-account Edge Function using the
-- service role. It compares the account's synced identity and this device's
-- existing local identity with immutable profile fingerprints. No secret is
-- persisted by this migration.
create or replace function public.prepare_account_leaderboard_deletion(
  p_auth_user_id uuid,
  p_local_identity jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cloud_identity jsonb;
  v_identity jsonb;
  v_user_id text;
  v_secret text;
  v_expected_fingerprint text;
  v_stored_fingerprint text;
  v_link_fingerprint text;
  v_profile_exists boolean;
  v_has_data boolean;
  v_relation_has_data boolean;
  v_relation_name text;
  v_linked_count integer := 0;
  v_verified_ids text[] := array[]::text[];
  v_unverified_data_ids text[] := array[]::text[];
  v_relations text[] := array[
    'leaderboard_score_events',
    'leaderboard_rollups',
    'leaderboard_user_profiles',
    'leaderboard_user_moderation',
    'leaderboard_alias_registry',
    'leaderboard_alias_audit'
  ];
begin
  if p_auth_user_id is null
     or not exists (select 1 from auth.users where id = p_auth_user_id) then
    raise exception 'account could not be verified'
      using errcode = '42501';
  end if;

  if pg_catalog.to_regclass('public.athar_sync') is not null then
    select payload -> 'leaderboardIdentity'
      into v_cloud_identity
    from public.athar_sync
    where user_id = p_auth_user_id
      and kind = 'settings';
  end if;

  -- Candidate order is stable across devices and gives the synced value
  -- priority over a stale local secret for the same identity.
  for v_identity in
    select candidates.candidate
    from (values (0, v_cloud_identity), (1, p_local_identity)) as candidates(priority, candidate)
    where candidates.candidate is not null
      and candidates.candidate <> 'null'::jsonb
    order by coalesce(candidates.candidate ->> 'id', ''), candidates.priority
  loop
    if pg_catalog.jsonb_typeof(v_identity) is distinct from 'object' then
      continue;
    end if;

    v_user_id := v_identity ->> 'id';
    if v_user_id is null
       or pg_catalog.length(v_user_id) not between 1 and 120
       or v_user_id = 'anon_fallback'
       or v_user_id = any(v_verified_ids) then
      continue;
    end if;

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id, 0));

    -- A prior sync or deletion attempt is durable proof even if the current
    -- device/cloud copy has a stale or malformed secret.
    select fingerprint_hash
      into v_link_fingerprint
    from private.auth_leaderboard_identity_links
    where auth_user_id = p_auth_user_id
      and leaderboard_user_id = v_user_id;
    if found then
      select fingerprint_hash
        into v_stored_fingerprint
      from public.leaderboard_user_profiles
      where user_id = v_user_id;
      if found and pg_catalog.lower(coalesce(v_stored_fingerprint, '')) = v_link_fingerprint then
        v_verified_ids := pg_catalog.array_append(v_verified_ids, v_user_id);
        v_linked_count := v_linked_count + 1;
        continue;
      end if;
    end if;

    v_has_data := false;
    foreach v_relation_name in array v_relations loop
      if pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation_name)) is null then
        continue;
      end if;
      execute pg_catalog.format(
        'select exists (select 1 from public.%I where user_id = $1)',
        v_relation_name
      ) into v_relation_has_data using v_user_id;
      if v_relation_has_data then
        v_has_data := true;
        exit;
      end if;
    end loop;

    v_secret := v_identity ->> 'secret';
    if v_secret is null
       or pg_catalog.length(v_secret) not between 1 and 512
       or v_secret = 'fallback_secret' then
      if v_has_data and not (v_user_id = any(v_unverified_data_ids)) then
        v_unverified_data_ids := pg_catalog.array_append(v_unverified_data_ids, v_user_id);
      end if;
      continue;
    end if;

    if pg_catalog.to_regclass('public.leaderboard_user_profiles') is null then
      if v_has_data and not (v_user_id = any(v_unverified_data_ids)) then
        v_unverified_data_ids := pg_catalog.array_append(v_unverified_data_ids, v_user_id);
      end if;
      continue;
    end if;

    select fingerprint_hash
      into v_stored_fingerprint
    from public.leaderboard_user_profiles
    where user_id = v_user_id;
    v_profile_exists := found;

    if not v_profile_exists then
      if v_has_data and not (v_user_id = any(v_unverified_data_ids)) then
        v_unverified_data_ids := pg_catalog.array_append(v_unverified_data_ids, v_user_id);
      end if;
      continue;
    end if;

    v_expected_fingerprint := pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(v_user_id || '|' || v_secret, 'UTF8'),
        'sha256'
      ),
      'hex'
    );

    if pg_catalog.lower(coalesce(v_stored_fingerprint, '')) <> v_expected_fingerprint then
      if v_has_data and not (v_user_id = any(v_unverified_data_ids)) then
        v_unverified_data_ids := pg_catalog.array_append(v_unverified_data_ids, v_user_id);
      end if;
      continue;
    end if;

    insert into private.auth_leaderboard_identity_links (
      auth_user_id,
      leaderboard_user_id,
      fingerprint_hash
    ) values (
      p_auth_user_id,
      v_user_id,
      v_expected_fingerprint
    ) on conflict (auth_user_id, leaderboard_user_id) do nothing;

    if not (v_user_id = any(v_verified_ids)) then
      v_verified_ids := pg_catalog.array_append(v_verified_ids, v_user_id);
      v_linked_count := v_linked_count + 1;
    end if;
  end loop;

  foreach v_user_id in array v_unverified_data_ids loop
    if not (v_user_id = any(v_verified_ids)) then
      raise exception 'account leaderboard identity could not be verified for deletion'
        using errcode = '42501';
    end if;
  end loop;

  return pg_catalog.jsonb_build_object('ok', true, 'verified_identities', v_linked_count);
end;
$$;

alter function public.prepare_account_leaderboard_deletion(uuid, jsonb) owner to postgres;
revoke all on function public.prepare_account_leaderboard_deletion(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.prepare_account_leaderboard_deletion(uuid, jsonb)
  to service_role;

-- If another account has the same verified ID, retain its leaderboard rows.
-- If the profile disappeared after a previous failed account deletion, allow a
-- retry only when no ranking rows remain; otherwise fail closed.
create or replace function private.purge_linked_leaderboard_before_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link record;
  v_stored_fingerprint text;
  v_has_data boolean;
  v_relation_has_data boolean;
  v_relation_name text;
  v_relations text[] := array[
    'leaderboard_score_events',
    'leaderboard_rollups',
    'leaderboard_user_profiles',
    'leaderboard_user_moderation',
    'leaderboard_alias_registry',
    'leaderboard_alias_audit'
  ];
begin
  for v_link in
    select leaderboard_user_id, fingerprint_hash
    from private.auth_leaderboard_identity_links
    where auth_user_id = old.id
    order by leaderboard_user_id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_link.leaderboard_user_id, 0)
    );

    -- Recheck after obtaining the identity lock. This serializes simultaneous
    -- account deletions and concurrent identity captures for the same rank.
    if private.leaderboard_identity_has_other_account(
      v_link.leaderboard_user_id,
      v_link.fingerprint_hash,
      old.id
    ) then
      continue;
    end if;

    v_has_data := false;
    foreach v_relation_name in array v_relations loop
      if pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation_name)) is null then
        continue;
      end if;
      execute pg_catalog.format(
        'select exists (select 1 from public.%I where user_id = $1)',
        v_relation_name
      ) into v_relation_has_data using v_link.leaderboard_user_id;
      if v_relation_has_data then
        v_has_data := true;
        exit;
      end if;
    end loop;

    if pg_catalog.to_regclass('public.leaderboard_user_profiles') is null then
      if v_has_data then
        raise exception 'account leaderboard identity could not be verified for deletion'
          using errcode = '42501';
      end if;
      continue;
    end if;

    select fingerprint_hash
      into v_stored_fingerprint
    from public.leaderboard_user_profiles
    where user_id = v_link.leaderboard_user_id;

    if not found then
      if v_has_data then
        raise exception 'account leaderboard identity could not be verified for deletion'
          using errcode = '42501';
      end if;
      continue;
    end if;

    if pg_catalog.lower(coalesce(v_stored_fingerprint, '')) <> v_link.fingerprint_hash then
      if v_has_data then
        raise exception 'account leaderboard identity could not be verified for deletion'
          using errcode = '42501';
      end if;
      continue;
    end if;

    foreach v_relation_name in array v_relations loop
      if pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation_name)) is null then
        continue;
      end if;
      execute pg_catalog.format(
        'delete from public.%I where user_id = $1',
        v_relation_name
      ) using v_link.leaderboard_user_id;
    end loop;
  end loop;

  return old;
end;
$$;

alter function private.purge_linked_leaderboard_before_auth_delete() owner to postgres;
revoke all on function private.purge_linked_leaderboard_before_auth_delete()
  from public, anon, authenticated, service_role;

drop trigger if exists athar_00_linked_leaderboard_purge_before_auth_delete on auth.users;
create trigger athar_00_linked_leaderboard_purge_before_auth_delete
  before delete on auth.users
  for each row
  execute function private.purge_linked_leaderboard_before_auth_delete();

-- Keep the prior synced-settings cleanup as a fallback for legacy records, but
-- never treat the old shared emergency identity as a user's deletion key. Any
-- identity with a verified account link was already handled above.
create or replace function private.purge_leaderboard_for_auth_user_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity jsonb;
  v_leaderboard_user_id text;
  v_identity_secret text;
  v_expected_fingerprint text;
  v_stored_fingerprint text;
  v_profile_exists boolean := false;
  v_has_data boolean := false;
  v_relation_has_data boolean;
  v_relation_name text;
  v_relations text[] := array[
    'leaderboard_score_events',
    'leaderboard_rollups',
    'leaderboard_user_profiles',
    'leaderboard_user_moderation',
    'leaderboard_alias_registry',
    'leaderboard_alias_audit'
  ];
begin
  if pg_catalog.to_regclass('public.athar_sync') is null then
    return old;
  end if;

  select payload -> 'leaderboardIdentity'
    into v_identity
  from public.athar_sync
  where user_id = old.id
    and kind = 'settings';

  if not found or v_identity is null or v_identity = 'null'::jsonb then
    return old;
  end if;

  if pg_catalog.jsonb_typeof(v_identity) is distinct from 'object' then
    raise exception 'account leaderboard identity could not be verified for deletion'
      using errcode = '42501';
  end if;

  v_leaderboard_user_id := v_identity ->> 'id';
  v_identity_secret := v_identity ->> 'secret';
  if v_leaderboard_user_id is null
     or pg_catalog.length(v_leaderboard_user_id) not between 1 and 120 then
    raise exception 'account leaderboard identity could not be verified for deletion'
      using errcode = '42501';
  end if;

  if v_leaderboard_user_id = 'anon_fallback' then
    return old;
  end if;

  if pg_catalog.to_regclass('private.auth_leaderboard_identity_links') is not null
     and exists (
       select 1
       from private.auth_leaderboard_identity_links
       where auth_user_id = old.id
         and leaderboard_user_id = v_leaderboard_user_id
     ) then
    return old;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_leaderboard_user_id, 0)
  );

  if pg_catalog.to_regclass('public.leaderboard_user_profiles') is not null then
    select fingerprint_hash
      into v_stored_fingerprint
    from public.leaderboard_user_profiles
    where user_id = v_leaderboard_user_id;
    v_profile_exists := found;
  end if;

  if v_profile_exists and private.leaderboard_identity_has_other_account(
    v_leaderboard_user_id,
    v_stored_fingerprint,
    old.id
  ) then
    return old;
  end if;

  if v_identity_secret = 'fallback_secret' then
    return old;
  end if;
  if v_identity_secret is null or pg_catalog.length(v_identity_secret) not between 1 and 512 then
    raise exception 'account leaderboard identity could not be verified for deletion'
      using errcode = '42501';
  end if;

  foreach v_relation_name in array v_relations loop
    if pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation_name)) is null then
      continue;
    end if;
    execute pg_catalog.format(
      'select exists (select 1 from public.%I where user_id = $1)',
      v_relation_name
    ) into v_relation_has_data using v_leaderboard_user_id;
    if v_relation_has_data then
      v_has_data := true;
      exit;
    end if;
  end loop;

  if not v_has_data then
    return old;
  end if;

  v_expected_fingerprint := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_leaderboard_user_id || '|' || v_identity_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  if not v_profile_exists
     or pg_catalog.lower(coalesce(v_stored_fingerprint, '')) <> v_expected_fingerprint then
    raise exception 'account leaderboard identity could not be verified for deletion'
      using errcode = '42501';
  end if;

  foreach v_relation_name in array v_relations loop
    if pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation_name)) is null then
      continue;
    end if;
    execute pg_catalog.format(
      'delete from public.%I where user_id = $1',
      v_relation_name
    ) using v_leaderboard_user_id;
  end loop;

  return old;
end;
$$;

alter function private.purge_leaderboard_for_auth_user_delete() owner to postgres;
revoke all on function private.purge_leaderboard_for_auth_user_delete()
  from public, anon, authenticated, service_role;

comment on function public.prepare_account_leaderboard_deletion(uuid, jsonb) is
  'Verifies account-owned leaderboard identities before the atomic account deletion transaction.';
