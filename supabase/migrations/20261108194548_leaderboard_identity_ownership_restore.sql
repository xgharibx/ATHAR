-- Restore the atomic, service-role-only claim for leaderboard identities.
-- This version is already deployed in the production project; keep the checked-in
-- migration history aligned with the live database.
create or replace function public.leaderboard_claim_identity(
  p_user_id text,
  p_fingerprint_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id text := p_user_id;
  v_fingerprint text := lower(p_fingerprint_hash);
  v_stored_fingerprint text;
begin
  if v_user_id is null or length(v_user_id) = 0 or length(v_user_id) > 120
     or v_fingerprint is null or v_fingerprint !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  insert into public.leaderboard_user_profiles (user_id, fingerprint_hash)
  values (v_user_id, v_fingerprint)
  on conflict (user_id) do nothing;

  select fingerprint_hash into v_stored_fingerprint
  from public.leaderboard_user_profiles
  where user_id = v_user_id
  for update;

  -- A legacy row without a claim fails closed. Recover such a claim only from
  -- verified private history or an explicit administration process.
  return coalesce(lower(v_stored_fingerprint) = v_fingerprint, false);
end;
$function$;

revoke all on function public.leaderboard_claim_identity(text, text) from public, anon, authenticated;
grant execute on function public.leaderboard_claim_identity(text, text) to service_role;
