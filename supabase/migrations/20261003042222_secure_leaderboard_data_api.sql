-- Keep leaderboard data behind the Edge Function, which applies moderation
-- and response limits. The service-role function remains the only API path.
begin;

-- The project grants API roles access to newly created public objects by
-- default. Migrations that need client access must grant it explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;

do $$
declare
  relation_name text;
  view_name text;
  sequence_name text;
  profile_function regprocedure := to_regprocedure(
    'public.leaderboard_upsert_user_profile(text,date,text,text,date,integer)'
  );
begin
  foreach relation_name in array array[
    'leaderboard_score_events',
    'leaderboard_rollups',
    'leaderboard_user_profiles',
    'leaderboard_name_blocklist',
    'leaderboard_user_moderation',
    'leaderboard_alias_registry',
    'leaderboard_alias_audit',
    'leaderboard_top',
    'leaderboard_ranked_v3'
  ] loop
    if to_regclass(format('public.%I', relation_name)) is not null then
      execute format(
        'revoke all privileges on table public.%I from public, anon, authenticated',
        relation_name
      );
    end if;
  end loop;

  if to_regclass('public.leaderboard_rollups') is not null then
    for relation_name in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = 'leaderboard_rollups'
    loop
      execute format(
        'drop policy %I on public.leaderboard_rollups',
        relation_name
      );
    end loop;
  end if;

  foreach view_name in array array[
    'leaderboard_top',
    'leaderboard_ranked_v3'
  ] loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = view_name
        and c.relkind = 'v'
    ) then
      execute format(
        'alter view public.%I set (security_invoker = true)',
        view_name
      );
    end if;
  end loop;

  foreach sequence_name in array array[
    'leaderboard_name_blocklist_id_seq',
    'leaderboard_alias_audit_id_seq'
  ] loop
    if to_regclass(format('public.%I', sequence_name)) is not null then
      execute format(
        'revoke all privileges on sequence public.%I from public, anon, authenticated',
        sequence_name
      );
    end if;
  end loop;

  if profile_function is not null then
    execute 'revoke all on function public.leaderboard_upsert_user_profile(text,date,text,text,date,integer) from public, anon, authenticated';
    execute 'grant execute on function public.leaderboard_upsert_user_profile(text,date,text,text,date,integer) to service_role';
  end if;
end;
$$;

-- Fail the migration if any API role can still bypass the Edge Function.
do $$
declare
  relation_name text;
  role_name text;
  privilege_name text;
  profile_function regprocedure := to_regprocedure(
    'public.leaderboard_upsert_user_profile(text,date,text,text,date,integer)'
  );
begin
  foreach relation_name in array array[
    'leaderboard_score_events',
    'leaderboard_rollups',
    'leaderboard_user_profiles',
    'leaderboard_name_blocklist',
    'leaderboard_user_moderation',
    'leaderboard_alias_registry',
    'leaderboard_alias_audit',
    'leaderboard_top',
    'leaderboard_ranked_v3'
  ] loop
    if to_regclass(format('public.%I', relation_name)) is not null then
      foreach role_name in array array['anon', 'authenticated'] loop
        foreach privilege_name in array array[
          'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
        ] loop
          if has_table_privilege(
            role_name,
            to_regclass(format('public.%I', relation_name)),
            privilege_name
          ) then
            raise exception 'Unexpected % privilege for % on public.%',
              privilege_name, role_name, relation_name;
          end if;
        end loop;
      end loop;
    end if;
  end loop;

  if profile_function is not null and (
    has_function_privilege('anon', profile_function, 'EXECUTE')
    or has_function_privilege('authenticated', profile_function, 'EXECUTE')
    or not has_function_privilege('service_role', profile_function, 'EXECUTE')
  ) then
    raise exception 'Leaderboard profile RPC grants are not service-role-only';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_rollups'
  ) then
    raise exception 'Leaderboard rollup RLS policy still exposes direct access';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('leaderboard_top', 'leaderboard_ranked_v3')
      and c.relkind = 'v'
      and not coalesce(c.reloptions @> array['security_invoker=true'], false)
  ) then
    raise exception 'Leaderboard view is not configured with security_invoker';
  end if;
end;
$$;

commit;
