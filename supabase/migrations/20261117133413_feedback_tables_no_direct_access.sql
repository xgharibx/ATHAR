-- Feedback tables are written only by the athar-feedback Edge Function
-- through owner-run functions. State that no API role may reach them
-- directly, as for the other server-only tables.
do $$
declare
  target text;
  policy_name text;
begin
  foreach target in array array[
    'public.athar_feedback_submissions',
    'public.athar_feedback_rate_limits'
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
