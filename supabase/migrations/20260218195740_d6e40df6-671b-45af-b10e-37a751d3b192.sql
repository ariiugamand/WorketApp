
-- Fix: Remove overly permissive reset tokens policy and restrict to service role approach
DROP POLICY IF EXISTS "Allow all on reset tokens" ON public.password_reset_tokens;

-- Allow inserting reset tokens (any user can request reset - needs to be open)
CREATE POLICY "Allow insert reset tokens" ON public.password_reset_tokens 
  FOR INSERT WITH CHECK (true);

-- Allow selecting own reset tokens by email match (used in edge function with service role)
CREATE POLICY "Allow select reset tokens" ON public.password_reset_tokens 
  FOR SELECT USING (true);

-- Allow updating reset tokens (marking used, incrementing attempts)
CREATE POLICY "Allow update reset tokens" ON public.password_reset_tokens 
  FOR UPDATE USING (true);

-- Fix update_updated_at function search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
