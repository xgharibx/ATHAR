-- Private, anonymous feedback inbox for ATHAR.
-- No anon/authenticated table access: only Edge Functions using service_role can insert.
create table if not exists public.athar_feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('problem','feature','suggestion','content','other')),
  message text not null check (char_length(btrim(message)) between 10 and 3000),
  sender_name text check (sender_name is null or char_length(sender_name) <= 80),
  contact text check (contact is null or char_length(contact) <= 160),
  status text not null default 'new' check (status in ('new','reviewing','resolved','archived'))
);
alter table public.athar_feedback_submissions enable row level security;
revoke all on table public.athar_feedback_submissions from public, anon, authenticated;
grant select, insert, update, delete on table public.athar_feedback_submissions to service_role;

create index if not exists athar_feedback_created_idx
  on public.athar_feedback_submissions (created_at desc);

-- A short-lived HMAC pseudonym, not a raw address or device identifier.
create table if not exists public.athar_feedback_rate_limits (
  day date not null,
  fingerprint text not null check (char_length(fingerprint) = 64),
  submissions int not null default 0 check (submissions >= 0),
  primary key (day, fingerprint)
);
alter table public.athar_feedback_rate_limits enable row level security;
revoke all on table public.athar_feedback_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.athar_feedback_rate_limits to service_role;

create or replace function public.athar_submit_feedback(
  p_category text,
  p_message text,
  p_sender_name text,
  p_contact text,
  p_fingerprint text
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
    raise exception 'INVALID_FEEDBACK_CATEGORY' using errcode = '22023';
  end if;
  if p_message is null or char_length(btrim(p_message)) not between 10 and 3000 then
    raise exception 'INVALID_FEEDBACK_MESSAGE' using errcode = '22023';
  end if;
  if p_sender_name is not null and char_length(p_sender_name) > 80 then
    raise exception 'INVALID_FEEDBACK_NAME' using errcode = '22023';
  end if;
  if p_contact is not null and char_length(p_contact) > 160 then
    raise exception 'INVALID_FEEDBACK_CONTACT' using errcode = '22023';
  end if;
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_FEEDBACK_REQUEST' using errcode = '22023';
  end if;

  -- Atomic per-day ceiling limits automated abuse and protects free-plan quotas.
  insert into public.athar_feedback_rate_limits (day, fingerprint, submissions)
  values (v_day, p_fingerprint, 1)
  on conflict (day, fingerprint) do update
    set submissions = public.athar_feedback_rate_limits.submissions + 1
    where public.athar_feedback_rate_limits.submissions < 8
  returning submissions into v_count;
  if v_count is null then
    raise exception 'FEEDBACK_RATE_LIMIT' using errcode = 'P0001';
  end if;

  insert into public.athar_feedback_submissions (category, message, sender_name, contact)
  values (
    p_category,
    btrim(p_message),
    nullif(btrim(coalesce(p_sender_name, '')), ''),
    nullif(btrim(coalesce(p_contact, '')), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- PostgreSQL ordinarily grants function execute to PUBLIC: remove that explicitly.
revoke all on function public.athar_submit_feedback(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.athar_submit_feedback(text, text, text, text, text)
  to service_role;

comment on table public.athar_feedback_submissions is
  'Private anonymous ATHAR feedback. Viewable by project administrators in Supabase Studio, never by application users.';
