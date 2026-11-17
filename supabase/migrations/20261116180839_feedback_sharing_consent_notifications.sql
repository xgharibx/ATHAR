-- Add explicit, optional consent to share an anonymised feedback excerpt.
-- Keep notification state visible to the owner, so failures are not silently lost.
alter table public.athar_feedback_submissions
  add column if not exists share_consent boolean not null default false,
  add column if not exists email_status text not null default 'pending'
    check (email_status in ('pending', 'queued', 'failed', 'not_configured')),
  add column if not exists email_attempted_at timestamptz;

create or replace function public.athar_submit_feedback_v2(
  p_category text,
  p_message text,
  p_sender_name text,
  p_contact text,
  p_fingerprint text,
  p_share_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_day date := (now() at time zone 'utc')::date;
  v_count int;
begin
  if p_category is null or p_category not in ('problem','feature','suggestion','content','other') then
    raise exception 'INVALID_FEEDBACK_CATEGORY' using errcode='22023';
  end if;
  if p_message is null or char_length(btrim(p_message)) not between 10 and 3000 then
    raise exception 'INVALID_FEEDBACK_MESSAGE' using errcode='22023';
  end if;
  if p_sender_name is not null and char_length(p_sender_name) > 80 then
    raise exception 'INVALID_FEEDBACK_NAME' using errcode='22023';
  end if;
  if p_contact is not null and char_length(p_contact) > 160 then
    raise exception 'INVALID_FEEDBACK_CONTACT' using errcode='22023';
  end if;
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_FEEDBACK_REQUEST' using errcode='22023';
  end if;
  -- An explicit opt-in is mandatory for sharing: false and null both mean no.
  insert into public.athar_feedback_rate_limits (day, fingerprint, submissions)
  values (v_day, p_fingerprint, 1)
  on conflict (day, fingerprint) do update
  set submissions = public.athar_feedback_rate_limits.submissions + 1
  where public.athar_feedback_rate_limits.submissions < 8
  returning submissions into v_count;
  if v_count is null then
    raise exception 'FEEDBACK_RATE_LIMIT' using errcode='P0001';
  end if;

  insert into public.athar_feedback_submissions
    (category, message, sender_name, contact, share_consent)
  values
    (p_category, btrim(p_message),
     nullif(btrim(coalesce(p_sender_name,'')), ''),
     nullif(btrim(coalesce(p_contact,'')), ''),
     coalesce(p_share_consent, false))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.athar_submit_feedback_v2(text,text,text,text,text,boolean)
  from public,anon,authenticated;
grant execute on function public.athar_submit_feedback_v2(text,text,text,text,text,boolean)
  to service_role;

comment on column public.athar_feedback_submissions.share_consent is
  'Opt-in only: may manually share an anonymised excerpt after review; never auto-post, never share contact or sender name.';
