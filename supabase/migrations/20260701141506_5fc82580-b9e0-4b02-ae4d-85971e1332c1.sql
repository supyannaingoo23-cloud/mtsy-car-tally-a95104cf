CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, anon, authenticated;

-- Drop policies that reference the old public helpers.
DROP POLICY IF EXISTS "read app_owner" ON public.app_owner;
DROP POLICY IF EXISTS "owner update app_owner" ON public.app_owner;
DROP POLICY IF EXISTS "owner read daily" ON public.daily_entries;
DROP POLICY IF EXISTS "owner write daily" ON public.daily_entries;
DROP POLICY IF EXISTS "owner update daily" ON public.daily_entries;
DROP POLICY IF EXISTS "owner delete daily" ON public.daily_entries;
DROP POLICY IF EXISTS "owner read monthly" ON public.monthly_inputs;
DROP POLICY IF EXISTS "owner write monthly" ON public.monthly_inputs;
DROP POLICY IF EXISTS "owner update monthly" ON public.monthly_inputs;
DROP POLICY IF EXISTS "owner delete monthly" ON public.monthly_inputs;
DROP POLICY IF EXISTS "owner read wd" ON public.withdrawals;
DROP POLICY IF EXISTS "owner write wd" ON public.withdrawals;
DROP POLICY IF EXISTS "owner update wd" ON public.withdrawals;
DROP POLICY IF EXISTS "owner delete wd" ON public.withdrawals;
DROP POLICY IF EXISTS "owner read parts" ON public.maintenance_parts;
DROP POLICY IF EXISTS "owner write parts" ON public.maintenance_parts;
DROP POLICY IF EXISTS "owner update parts" ON public.maintenance_parts;
DROP POLICY IF EXISTS "owner delete parts" ON public.maintenance_parts;
DROP POLICY IF EXISTS "owner read fuel" ON public.fuel_prices;
DROP POLICY IF EXISTS "owner write fuel" ON public.fuel_prices;
DROP POLICY IF EXISTS "owner update fuel" ON public.fuel_prices;
DROP POLICY IF EXISTS "owner delete fuel" ON public.fuel_prices;
DROP POLICY IF EXISTS "owner read fuel_history" ON public.fuel_history;
DROP POLICY IF EXISTS "owner write fuel_history" ON public.fuel_history;
DROP POLICY IF EXISTS "owner update fuel_history" ON public.fuel_history;
DROP POLICY IF EXISTS "owner delete fuel_history" ON public.fuel_history;
DROP POLICY IF EXISTS "owner read fuel_fills" ON public.fuel_fills;
DROP POLICY IF EXISTS "owner write fuel_fills" ON public.fuel_fills;
DROP POLICY IF EXISTS "owner update fuel_fills" ON public.fuel_fills;
DROP POLICY IF EXISTS "owner delete fuel_fills" ON public.fuel_fills;

-- CASCADE cleans up any triggers using set_owner_id (varying names).
DROP FUNCTION IF EXISTS public.is_owner_or_unclaimed() CASCADE;
DROP FUNCTION IF EXISTS public.current_owner_id() CASCADE;
DROP FUNCTION IF EXISTS public.set_owner_id() CASCADE;

CREATE OR REPLACE FUNCTION private.current_owner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT owner_id FROM public.app_owner WHERE id = 1 $$;

CREATE OR REPLACE FUNCTION private.is_owner_or_unclaimed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN private.current_owner_id() IS NULL THEN auth.uid() IS NOT NULL
    ELSE auth.uid() = private.current_owner_id()
  END
$$;

CREATE OR REPLACE FUNCTION private.set_owner_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE o uuid := private.current_owner_id();
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := COALESCE(o, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.current_owner_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_owner_or_unclaimed() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.set_owner_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_owner_or_unclaimed() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_owner_id() TO service_role;
GRANT EXECUTE ON FUNCTION private.set_owner_id() TO service_role;

CREATE POLICY "read app_owner" ON public.app_owner
  FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner update app_owner" ON public.app_owner
  FOR UPDATE USING (private.is_owner_or_unclaimed());

CREATE POLICY "owner read daily"   ON public.daily_entries FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner write daily"  ON public.daily_entries FOR INSERT WITH CHECK (private.is_owner_or_unclaimed());
CREATE POLICY "owner update daily" ON public.daily_entries FOR UPDATE USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner delete daily" ON public.daily_entries FOR DELETE USING (private.is_owner_or_unclaimed());

CREATE POLICY "owner read monthly"   ON public.monthly_inputs FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner write monthly"  ON public.monthly_inputs FOR INSERT WITH CHECK (private.is_owner_or_unclaimed());
CREATE POLICY "owner update monthly" ON public.monthly_inputs FOR UPDATE USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner delete monthly" ON public.monthly_inputs FOR DELETE USING (private.is_owner_or_unclaimed());

CREATE POLICY "owner read wd"   ON public.withdrawals FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner write wd"  ON public.withdrawals FOR INSERT WITH CHECK (private.is_owner_or_unclaimed());
CREATE POLICY "owner update wd" ON public.withdrawals FOR UPDATE USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner delete wd" ON public.withdrawals FOR DELETE USING (private.is_owner_or_unclaimed());

CREATE POLICY "owner read parts"   ON public.maintenance_parts FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner write parts"  ON public.maintenance_parts FOR INSERT WITH CHECK (private.is_owner_or_unclaimed());
CREATE POLICY "owner update parts" ON public.maintenance_parts FOR UPDATE USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner delete parts" ON public.maintenance_parts FOR DELETE USING (private.is_owner_or_unclaimed());

CREATE POLICY "owner read fuel"   ON public.fuel_prices FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner write fuel"  ON public.fuel_prices FOR INSERT WITH CHECK (private.is_owner_or_unclaimed());
CREATE POLICY "owner update fuel" ON public.fuel_prices FOR UPDATE USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner delete fuel" ON public.fuel_prices FOR DELETE USING (private.is_owner_or_unclaimed());

CREATE POLICY "owner read fuel_history"   ON public.fuel_history FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner write fuel_history"  ON public.fuel_history FOR INSERT WITH CHECK (private.is_owner_or_unclaimed());
CREATE POLICY "owner update fuel_history" ON public.fuel_history FOR UPDATE USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner delete fuel_history" ON public.fuel_history FOR DELETE USING (private.is_owner_or_unclaimed());

CREATE POLICY "owner read fuel_fills"   ON public.fuel_fills FOR SELECT USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner write fuel_fills"  ON public.fuel_fills FOR INSERT WITH CHECK (private.is_owner_or_unclaimed());
CREATE POLICY "owner update fuel_fills" ON public.fuel_fills FOR UPDATE USING (private.is_owner_or_unclaimed());
CREATE POLICY "owner delete fuel_fills" ON public.fuel_fills FOR DELETE USING (private.is_owner_or_unclaimed());

CREATE TRIGGER set_owner_daily BEFORE INSERT ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION private.set_owner_id();
CREATE TRIGGER set_owner_monthly BEFORE INSERT ON public.monthly_inputs
  FOR EACH ROW EXECUTE FUNCTION private.set_owner_id();
CREATE TRIGGER set_owner_wd BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION private.set_owner_id();
CREATE TRIGGER set_owner_parts BEFORE INSERT ON public.maintenance_parts
  FOR EACH ROW EXECUTE FUNCTION private.set_owner_id();
CREATE TRIGGER set_owner_fuel BEFORE INSERT ON public.fuel_prices
  FOR EACH ROW EXECUTE FUNCTION private.set_owner_id();
CREATE TRIGGER set_owner_fuel_history BEFORE INSERT ON public.fuel_history
  FOR EACH ROW EXECUTE FUNCTION private.set_owner_id();
CREATE TRIGGER set_owner_fuel_fills BEFORE INSERT ON public.fuel_fills
  FOR EACH ROW EXECUTE FUNCTION private.set_owner_id();

ALTER PUBLICATION supabase_realtime DROP TABLE public.daily_entries;
ALTER PUBLICATION supabase_realtime DROP TABLE public.monthly_inputs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.maintenance_parts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime DROP TABLE public.fuel_prices;