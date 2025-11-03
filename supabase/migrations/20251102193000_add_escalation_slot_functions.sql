-- Add helper functions to enforce atomic escalation limits and transactional founder comment saves

create or replace function public.reserve_escalation_slot(p_user_id uuid)
returns table(success boolean, escalation_count integer, max_escalations integer)
language plpgsql
as $$
declare
  tracking_record user_escalation_tracking%ROWTYPE;
  v_escalation_count integer;
  v_max_escalations integer;
begin
  -- Ensure tracking record exists and lock it for update
  loop
    select *
    into tracking_record
    from user_escalation_tracking
    where user_id = p_user_id
    for update;

    exit when found;

    begin
      insert into user_escalation_tracking (
        user_id,
        escalation_count,
        max_escalations,
        subscription_started_at,
        last_reset_at
      )
      values (
        p_user_id,
        0,
        2,
        now(),
        now()
      );
    exception
      when unique_violation then
        -- Another transaction created the row; retry the select
        null;
    end;
  end loop;

  v_escalation_count := tracking_record.escalation_count;
  v_max_escalations := tracking_record.max_escalations;

  if tracking_record.escalation_count >= tracking_record.max_escalations then
    return query select false, v_escalation_count, v_max_escalations;
  end if;

  update user_escalation_tracking
  set escalation_count = escalation_count + 1,
      updated_at = now()
  where id = tracking_record.id
  returning escalation_count, max_escalations
  into v_escalation_count, v_max_escalations;

  return query select true, v_escalation_count, v_max_escalations;
end;
$$;


create or replace function public.release_escalation_slot(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  update user_escalation_tracking
  set escalation_count = greatest(escalation_count - 1, 0),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;


create or replace function public.save_founder_comments(
  p_essay_id uuid,
  p_escalation_id uuid,
  p_comments jsonb
)
returns void
language plpgsql
as $$
begin
  delete from founder_comments
  where escalation_id = p_escalation_id;

  if p_comments is null
     or jsonb_typeof(p_comments) <> 'array'
     or jsonb_array_length(p_comments) = 0 then
    return;
  end if;

  insert into founder_comments (
    id,
    essay_id,
    escalation_id,
    block_id,
    type,
    content,
    target_text,
    position_start,
    position_end,
    resolved,
    resolved_at,
    metadata,
    created_at,
    updated_at
  )
  select
    coalesce((comment->>'id')::uuid, gen_random_uuid()),
    p_essay_id,
    p_escalation_id,
    coalesce((comment->>'blockId')::uuid, (comment->>'block_id')::uuid),
    comment->>'type',
    comment->>'content',
    nullif(comment->>'targetText', ''),
    case
      when comment ? 'position' and (comment->'position')->>'start' is not null
        then ((comment->'position')->>'start')::integer
      else null
    end,
    case
      when comment ? 'position' and (comment->'position')->>'end' is not null
        then ((comment->'position')->>'end')::integer
      else null
    end,
    false,
    null,
    coalesce(comment->'metadata', '{}'::jsonb),
    coalesce((comment->>'createdAt')::timestamptz, now()),
    now()
  from jsonb_array_elements(p_comments) as comment;
end;
$$;

