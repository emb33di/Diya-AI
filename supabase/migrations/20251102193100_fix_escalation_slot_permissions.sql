-- Fix permissions and security for escalation slot functions
-- Add SECURITY DEFINER to allow functions to properly manage escalation tracking
-- Grant execute permissions to authenticated users

-- Update reserve_escalation_slot to use SECURITY DEFINER
-- This allows the function to bypass RLS when needed for atomic operations
create or replace function public.reserve_escalation_slot(p_user_id uuid)
returns table(success boolean, escalation_count integer, max_escalations integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  tracking_record user_escalation_tracking%ROWTYPE;
  v_escalation_count integer;
  v_max_escalations integer;
begin
  -- Verify the user_id matches the authenticated user for security
  if p_user_id is null or p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id must match authenticated user';
  end if;

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

-- Update release_escalation_slot to use SECURITY DEFINER
create or replace function public.release_escalation_slot(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify the user_id matches the authenticated user for security
  if p_user_id is null or p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id must match authenticated user';
  end if;

  update user_escalation_tracking
  set escalation_count = greatest(escalation_count - 1, 0),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.reserve_escalation_slot(uuid) to authenticated;
grant execute on function public.release_escalation_slot(uuid) to authenticated;

-- Add comments for documentation
comment on function public.reserve_escalation_slot(uuid) is 'Atomically reserves an escalation slot for a user. Returns success status and current counts. Uses SECURITY DEFINER to bypass RLS for atomic operations.';
comment on function public.release_escalation_slot(uuid) is 'Releases an escalation slot for a user (used when escalation fails). Uses SECURITY DEFINER to bypass RLS.';

