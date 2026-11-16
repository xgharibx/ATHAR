-- Raise the shared daily ceiling for Companion usage from $1.00 to $2.00.
--
-- Both reservation functions (signed-in and guest) carry the ceiling as a
-- constant. Each is redefined from its current definition with only that
-- constant changed, so quota logic, locking and grants stay exactly as they
-- are. Running this again is a no-op.
do $$
declare
  target record;
  definition text;
begin
  for target in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('reserve_companion_request', 'reserve_companion_anonymous_request')
      and pg_get_functiondef(p.oid) like '%v_daily_budget_micro_usd bigint := 1000000;%'
  loop
    definition := replace(
      pg_get_functiondef(target.oid),
      'v_daily_budget_micro_usd bigint := 1000000;',
      'v_daily_budget_micro_usd bigint := 2000000;'
    );
    execute definition;
  end loop;
end
$$;
