-- «الختمة الجماعية»: one khatma shared by a group of friends, each on their
-- own phone. The 30 juz are claimed and ticked by the members themselves (or
-- given by the khatma's owner to someone without the app, by name), and
-- everyone sees the same progress.
--
-- No anon/authenticated table access: only the `khatma` Edge Function, using
-- service_role, reads and writes. Members and the owner are recognised by
-- random keys held on their phones; only SHA-256 hashes are stored here.

create table if not exists public.athar_group_khatmas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  admin_token_hash text not null check (admin_token_hash ~ '^[0-9a-f]{64}$'),
  round int not null default 1 check (round between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.athar_group_khatma_members (
  id uuid primary key default gen_random_uuid(),
  khatma_id uuid not null references public.athar_group_khatmas(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  joined_at timestamptz not null default now()
);

create index if not exists athar_group_khatma_members_khatma_idx
  on public.athar_group_khatma_members (khatma_id);

create table if not exists public.athar_group_khatma_parts (
  khatma_id uuid not null references public.athar_group_khatmas(id) on delete cascade,
  juz smallint not null check (juz between 1 and 30),
  -- A member who took this juz on their own phone…
  member_id uuid references public.athar_group_khatma_members(id) on delete set null,
  -- …or a name the owner gave it to (someone reading without the app).
  guest_name text check (guest_name is null or char_length(btrim(guest_name)) between 1 and 40),
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (khatma_id, juz),
  check (member_id is null or guest_name is null)
);

alter table public.athar_group_khatmas enable row level security;
alter table public.athar_group_khatma_members enable row level security;
alter table public.athar_group_khatma_parts enable row level security;

revoke all on table public.athar_group_khatmas from public, anon, authenticated;
revoke all on table public.athar_group_khatma_members from public, anon, authenticated;
revoke all on table public.athar_group_khatma_parts from public, anon, authenticated;

grant select, insert, update, delete on table public.athar_group_khatmas to service_role;
grant select, insert, update, delete on table public.athar_group_khatma_members to service_role;
grant select, insert, update, delete on table public.athar_group_khatma_parts to service_role;

-- Khatmas nobody has touched for half a year are removed (members and parts
-- go with them). Called by the function now and then.
create or replace function public.athar_prune_group_khatmas()
returns int
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.athar_group_khatmas
    where updated_at < now() - interval '180 days'
    returning 1
  )
  select count(*)::int from gone;
$$;

revoke all on function public.athar_prune_group_khatmas() from public, anon, authenticated;
grant execute on function public.athar_prune_group_khatmas() to service_role;
