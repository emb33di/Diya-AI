-- Create function to atomically decrement escalation_slots for a user
-- This ensures thread-safe decrement operations when escalating essays

CREATE OR REPLACE FUNCTION public.decrement_escalation_slots(p_user_id uuid)
RETURNS TABLE(success boolean, remaining_slots integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_slots integer;
  v_user_tier text;
BEGIN
  -- Get current state with lock to prevent race conditions
  SELECT escalation_slots, user_tier
  INTO v_remaining_slots, v_user_tier
  FROM user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Verify user exists
  IF v_user_tier IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Check if user is Pro and has slots available
  IF v_user_tier != 'Pro' OR v_remaining_slots IS NULL OR v_remaining_slots <= 0 THEN
    RETURN QUERY SELECT false, COALESCE(v_remaining_slots, 0);
    RETURN;
  END IF;

  -- Decrement atomically
  UPDATE user_profiles
  SET escalation_slots = escalation_slots - 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING escalation_slots
  INTO v_remaining_slots;

  RETURN QUERY SELECT true, v_remaining_slots;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_escalation_slots(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.decrement_escalation_slots(uuid) IS 'Atomically decrements escalation_slots for a Pro user. Returns success status and remaining slots. Uses SECURITY DEFINER to bypass RLS for atomic operations.';

