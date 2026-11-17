-- Write the profile-checked audit event and all score rollups in one database
-- transaction under the same identity lock used during account deletion.
-- This closes the gap where deletion could remove an identity after profile
-- upsert but before the old, separate event and rollup writes completed.
create or replace function public.leaderboard_submit_score_snapshot(
  p_user_id text,
  p_fingerprint_hash text,
  p_event jsonb,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id text := nullif(btrim(coalesce(p_user_id, '')), '');
  v_fingerprint text := nullif(btrim(coalesce(p_fingerprint_hash, '')), '');
  v_profile_fingerprint text;
  v_event_user_id text;
  v_event_day date;
  v_event_score integer;
  v_previous_scores jsonb;
  v_deduped boolean := false;
  v_event_capped boolean := false;
  v_section_capped boolean := false;
  v_row jsonb;
  v_day date;
  v_period text;
  v_board text;
  v_section_id text;
  v_row_user_id text;
  v_alias text;
  v_score integer;
  v_generated_at timestamptz;
  v_updated_at timestamptz;
  v_rows_affected integer;
begin
  if v_user_id is null or v_fingerprint is null
     or jsonb_typeof(p_event) is distinct from 'object'
     or jsonb_typeof(p_rows) is distinct from 'array'
     or jsonb_array_length(p_rows) < 1
     or jsonb_array_length(p_rows) > 128 then
    raise exception 'invalid-leaderboard-score-snapshot';
  end if;

  -- Deletion trigger takes this same lock, then removes profile, event, and
  -- rollup rows. If it wins the race, the missing profile below prevents the
  -- in-flight request from adding orphaned score data after deletion commits.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id, 0));

  select fingerprint_hash
    into v_profile_fingerprint
  from public.leaderboard_user_profiles
  where user_id = v_user_id;

  if not found or pg_catalog.lower(coalesce(v_profile_fingerprint, ''))
      <> pg_catalog.lower(v_fingerprint) then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'identity-deleted');
  end if;

  v_event_user_id := nullif(btrim(coalesce(p_event ->> 'user_id', '')), '');
  v_event_day := nullif(p_event ->> 'day', '')::date;
  v_event_score := nullif(p_event ->> 'score', '')::integer;
  if v_event_user_id is distinct from v_user_id
     or v_event_day is null
     or p_event ->> 'board' is distinct from 'global'
     or p_event ->> 'period' is distinct from 'daily'
     or nullif(btrim(coalesce(p_event ->> 'checksum', '')), '') is null
     or v_event_score is null then
    raise exception 'invalid-leaderboard-score-event';
  end if;

  select payload -> 'scores'
    into v_previous_scores
  from public.leaderboard_score_events
  where day = v_event_day and user_id = v_user_id and board = 'global'
  order by created_at desc
  limit 1;
  if found and v_previous_scores = p_event -> 'payload' -> 'scores' then
    v_deduped := true;
  elsif exists (
    select 1
    from public.leaderboard_score_events
    where day = v_event_day
      and user_id = v_user_id
      and checksum = p_event ->> 'checksum'
  ) then
    v_deduped := true;
  end if;

  if not v_deduped then
    insert into public.leaderboard_score_events (
      generated_at, day, user_id, alias, fingerprint, board, period,
      section_id, score, source, payload, checksum
    ) values (
      nullif(p_event ->> 'generated_at', '')::timestamptz,
      v_event_day,
      v_user_id,
      coalesce(nullif(btrim(coalesce(p_event ->> 'alias', '')), ''), 'user'),
      v_fingerprint,
      'global',
      'daily',
      null,
      least(1000000, greatest(0, v_event_score)),
      coalesce(nullif(btrim(coalesce(p_event ->> 'source', '')), ''), 'edge_function_v1'),
      coalesce(p_event -> 'payload', '{}'::jsonb),
      p_event ->> 'checksum'
    );
    get diagnostics v_rows_affected = row_count;
    v_event_capped := v_rows_affected = 0;
  end if;

  -- Stable order prevents section-cap advisory locks from deadlocking when
  -- two submissions contain several sections.
  for v_row in
    select item.value
    from jsonb_array_elements(p_rows) as item(value)
    order by item.value ->> 'board', coalesce(item.value ->> 'section_id', '')
  loop
    v_day := nullif(v_row ->> 'day', '')::date;
    v_period := nullif(btrim(coalesce(v_row ->> 'period', '')), '');
    v_board := nullif(btrim(coalesce(v_row ->> 'board', '')), '');
    v_section_id := nullif(btrim(coalesce(v_row ->> 'section_id', '')), '');
    v_row_user_id := nullif(btrim(coalesce(v_row ->> 'user_id', '')), '');
    v_alias := coalesce(nullif(btrim(coalesce(v_row ->> 'alias', '')), ''), 'user');
    v_score := nullif(v_row ->> 'score', '')::integer;
    v_generated_at := nullif(v_row ->> 'generated_at', '')::timestamptz;
    v_updated_at := coalesce(nullif(v_row ->> 'updated_at', '')::timestamptz, now());

    if v_day is distinct from v_event_day
       or v_period is distinct from 'daily'
       or v_row_user_id is distinct from v_user_id
       or v_score is null
       or v_board is null
       or v_board not in ('global', 'dhikr', 'quran', 'prayers', 'tasbeeh_daily', 'section')
       or (v_board = 'section') is distinct from (v_section_id is not null) then
      raise exception 'invalid-leaderboard-rollup-row';
    end if;

    insert into public.leaderboard_rollups (
      day, period, board, section_id, user_id, alias, score, generated_at, updated_at
    ) values (
      v_day,
      v_period,
      v_board,
      v_section_id,
      v_user_id,
      v_alias,
      least(1000000, greatest(0, v_score)),
      v_generated_at,
      v_updated_at
    )
    on conflict (day, period, board, section_id, user_id) do update set
      alias = excluded.alias,
      score = case
        when excluded.generated_at is not null
          and (public.leaderboard_rollups.generated_at is null
            or excluded.generated_at > public.leaderboard_rollups.generated_at)
          then excluded.score
        else greatest(public.leaderboard_rollups.score, excluded.score)
      end,
      generated_at = case
        when excluded.generated_at is not null
          and (public.leaderboard_rollups.generated_at is null
            or excluded.generated_at > public.leaderboard_rollups.generated_at)
          then excluded.generated_at
        else public.leaderboard_rollups.generated_at
      end,
      updated_at = excluded.updated_at;

    get diagnostics v_rows_affected = row_count;
    if v_board = 'section' and v_rows_affected = 0 then
      v_section_capped := true;
    end if;
  end loop;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'deduped', v_deduped,
    'event_capped', v_event_capped,
    'section_capped', v_section_capped
  );
end;
$$;

alter function public.leaderboard_submit_score_snapshot(text, text, jsonb, jsonb) owner to postgres;
revoke all on function public.leaderboard_submit_score_snapshot(text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.leaderboard_submit_score_snapshot(text, text, jsonb, jsonb)
  to service_role;
