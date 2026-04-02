-- ATHAR Leaderboard moderation tables
-- Run this after leaderboard_supabase_schema.sql

create table if not exists public.leaderboard_name_blocklist (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  term text not null,
  match_mode text not null default 'contains' check (match_mode in ('contains', 'exact')),
  is_active boolean not null default true,
  note text null
);

create unique index if not exists uq_lb_name_blocklist_term_mode
  on public.leaderboard_name_blocklist (lower(term), match_mode);

create table if not exists public.leaderboard_user_moderation (
  user_id text primary key,
  updated_at timestamptz not null default now(),
  hidden boolean not null default false,
  forced_alias text null,
  reason text null
);

create table if not exists public.leaderboard_alias_audit (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id text not null,
  requested_alias text null,
  resolved_alias text not null,
  status text not null,
  reason text null
);

create index if not exists idx_lb_alias_audit_user_created
  on public.leaderboard_alias_audit (user_id, created_at desc);

alter table public.leaderboard_name_blocklist enable row level security;
alter table public.leaderboard_user_moderation enable row level security;
alter table public.leaderboard_alias_audit enable row level security;

-- No public policies here: service role/admin only.

-- Example 1: block a substring everywhere in names
-- insert into public.leaderboard_name_blocklist (term, match_mode, note)
-- values ('badword', 'contains', 'manual moderation');

-- Example 2: block one exact impersonation name
-- insert into public.leaderboard_name_blocklist (term, match_mode, note)
-- values ('الإدارة', 'exact', 'reserved team name');

-- Example 3: force-safe alias for one abusive user
-- insert into public.leaderboard_user_moderation (user_id, forced_alias, hidden, reason)
-- values ('anon_abc123', 'مستخدم آمن', false, 'renamed by admin')
-- on conflict (user_id) do update
-- set forced_alias = excluded.forced_alias,
--     hidden = excluded.hidden,
--     reason = excluded.reason,
--     updated_at = now();

-- Example 4: hide a user completely from leaderboard reads
-- insert into public.leaderboard_user_moderation (user_id, hidden, reason)
-- values ('anon_abc123', true, 'abusive display name')
-- on conflict (user_id) do update
-- set hidden = excluded.hidden,
--     reason = excluded.reason,
--     updated_at = now();