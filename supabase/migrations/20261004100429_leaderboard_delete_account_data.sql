-- Account deletion must also remove the pseudonymous leaderboard identity
-- saved in the account's private settings document. Do the cleanup in a
-- BEFORE DELETE trigger so leaderboard rows and auth.users commit or roll back
-- together. Never accept a leaderboard id from the delete request.

create or replace function private.prevent_leaderboard_fingerprint_reassignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.fingerprint_hash is distinct from old.fingerprint_hash then
    raise exception 'leaderboard identity fingerprint is immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

alter function private.prevent_leaderboard_fingerprint_reassignment() owner to postgres;
revoke all on function private.prevent_leaderboard_fingerprint_reassignment()
  from public, anon, authenticated, service_role;

drop trigger if exists leaderboard_user_profile_fingerprint_immutable
  on public.leaderboard_user_profiles;
create trigger leaderboard_user_profile_fingerprint_immutable
  before update of fingerprint_hash on public.leaderboard_user_profiles
  for each row
  execute function private.prevent_leaderboard_fingerprint_reassignment();

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
  -- Leaderboard is optional for self-hosted installs. If the account sync
  -- schema is absent, there is no server-side account-to-identity link.
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
     or pg_catalog.length(v_leaderboard_user_id) not between 1 and 120
     or v_identity_secret is null
     or pg_catalog.length(v_identity_secret) not between 1 and 512 then
    raise exception 'account leaderboard identity could not be verified for deletion'
      using errcode = '42501';
  end if;

  -- No matching rows means the identity has never been stored on the server;
  -- there is no leaderboard data to remove.
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

  if pg_catalog.to_regclass('public.leaderboard_user_profiles') is not null then
    execute
      'select exists (select 1 from public.leaderboard_user_profiles where user_id = $1)'
      into v_profile_exists using v_leaderboard_user_id;

    if v_profile_exists then
      execute
        'select fingerprint_hash from public.leaderboard_user_profiles where user_id = $1'
        into v_stored_fingerprint using v_leaderboard_user_id;
    end if;
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

drop trigger if exists athar_purge_leaderboard_before_auth_delete on auth.users;
create trigger athar_purge_leaderboard_before_auth_delete
  before delete on auth.users
  for each row
  execute function private.purge_leaderboard_for_auth_user_delete();

comment on function private.purge_leaderboard_for_auth_user_delete() is
  'Atomically removes a verified synced leaderboard identity with its Auth account.';
