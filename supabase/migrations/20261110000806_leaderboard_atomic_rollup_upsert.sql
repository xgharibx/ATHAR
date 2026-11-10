-- Merge each leaderboard score against the current row in the same database
-- transaction. The previous Edge Function read the row, merged it in memory,
-- then upserted it; concurrent submissions could both read the same value and
-- let an older snapshot overwrite the newer one.

create or replace function public.leaderboard_upsert_rollups_batch(p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row jsonb;
  v_day date;
  v_period text;
  v_board text;
  v_section_id text;
  v_user_id text;
  v_alias text;
  v_score integer;
  v_generated_at timestamptz;
  v_updated_at timestamptz;
begin
  if p_rows is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'invalid-rollup-rows';
  end if;
  if jsonb_array_length(p_rows) > 128 then
    raise exception 'too-many-rollup-rows';
  end if;

  -- Stable lock order also keeps two multi-section submissions from taking
  -- section-cap advisory locks in opposite orders.
  for v_row in
    select item.value
    from jsonb_array_elements(p_rows) as item(value)
    order by item.value ->> 'board', coalesce(item.value ->> 'section_id', '')
  loop
    v_day := nullif(v_row ->> 'day', '')::date;
    v_period := nullif(btrim(coalesce(v_row ->> 'period', '')), '');
    v_board := nullif(btrim(coalesce(v_row ->> 'board', '')), '');
    v_section_id := nullif(btrim(coalesce(v_row ->> 'section_id', '')), '');
    v_user_id := nullif(btrim(coalesce(v_row ->> 'user_id', '')), '');
    v_alias := coalesce(nullif(btrim(coalesce(v_row ->> 'alias', '')), ''), 'user');
    v_score := least(1000000, greatest(0, (v_row ->> 'score')::integer));
    v_generated_at := nullif(v_row ->> 'generated_at', '')::timestamptz;
    v_updated_at := coalesce(nullif(v_row ->> 'updated_at', '')::timestamptz, now());

    if v_day is null or v_period is distinct from 'daily' or v_user_id is null or v_score is null then
      raise exception 'invalid-rollup-row';
    end if;
    if v_board is null or v_board not in ('global', 'dhikr', 'quran', 'prayers', 'tasbeeh_daily', 'section') then
      raise exception 'invalid-rollup-board';
    end if;
    if (v_board = 'section') is distinct from (v_section_id is not null) then
      raise exception 'invalid-rollup-section';
    end if;

    insert into public.leaderboard_rollups (
      day, period, board, section_id, user_id, alias, score, generated_at, updated_at
    ) values (
      v_day, v_period, v_board, v_section_id, v_user_id, v_alias, v_score, v_generated_at, v_updated_at
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
  end loop;
end;
$$;

revoke all on function public.leaderboard_upsert_rollups_batch(jsonb) from public, anon, authenticated;
grant execute on function public.leaderboard_upsert_rollups_batch(jsonb) to service_role;
