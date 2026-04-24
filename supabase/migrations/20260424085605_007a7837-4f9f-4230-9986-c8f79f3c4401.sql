-- 1. App owner singleton
CREATE TABLE IF NOT EXISTS public.app_owner (
  id integer PRIMARY KEY DEFAULT 1,
  owner_id uuid UNIQUE,
  email text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_owner_singleton CHECK (id = 1)
);
ALTER TABLE public.app_owner ENABLE ROW LEVEL SECURITY;

-- Helper: returns the current owner_id (or null if unclaimed)
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.app_owner WHERE id = 1
$$;

-- Helper: returns true when caller is the owner OR when no owner has claimed yet
CREATE OR REPLACE FUNCTION public.is_owner_or_unclaimed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN public.current_owner_id() IS NULL THEN true
      ELSE auth.uid() = public.current_owner_id()
    END
$$;

-- Anyone may read app_owner (so the client can know the lock state)
DROP POLICY IF EXISTS "read app_owner" ON public.app_owner;
CREATE POLICY "read app_owner" ON public.app_owner FOR SELECT USING (true);

-- Only allow claiming the owner row when it's empty AND caller is authenticated
DROP POLICY IF EXISTS "claim app_owner" ON public.app_owner;
CREATE POLICY "claim app_owner" ON public.app_owner FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = 1
    AND owner_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.app_owner WHERE id = 1)
  );

-- 2. Add owner_id to existing tables (nullable, defaults to current owner via trigger)
ALTER TABLE public.daily_entries     ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.monthly_inputs    ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.withdrawals       ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.maintenance_parts ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.fuel_prices       ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Trigger to auto-stamp owner_id on insert/update from current owner (or auth.uid())
CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o uuid := public.current_owner_id();
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := COALESCE(o, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_owner_daily ON public.daily_entries;
CREATE TRIGGER set_owner_daily BEFORE INSERT OR UPDATE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

DROP TRIGGER IF EXISTS set_owner_monthly ON public.monthly_inputs;
CREATE TRIGGER set_owner_monthly BEFORE INSERT OR UPDATE ON public.monthly_inputs
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

DROP TRIGGER IF EXISTS set_owner_wd ON public.withdrawals;
CREATE TRIGGER set_owner_wd BEFORE INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

DROP TRIGGER IF EXISTS set_owner_parts ON public.maintenance_parts;
CREATE TRIGGER set_owner_parts BEFORE INSERT OR UPDATE ON public.maintenance_parts
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

DROP TRIGGER IF EXISTS set_owner_fuel ON public.fuel_prices;
CREATE TRIGGER set_owner_fuel BEFORE INSERT OR UPDATE ON public.fuel_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

-- 3. Replace permissive public policies with owner-or-unclaimed policies
-- daily_entries
DROP POLICY IF EXISTS "public read daily"   ON public.daily_entries;
DROP POLICY IF EXISTS "public write daily"  ON public.daily_entries;
DROP POLICY IF EXISTS "public update daily" ON public.daily_entries;
DROP POLICY IF EXISTS "public delete daily" ON public.daily_entries;
CREATE POLICY "owner read daily"   ON public.daily_entries FOR SELECT USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner write daily"  ON public.daily_entries FOR INSERT WITH CHECK (public.is_owner_or_unclaimed());
CREATE POLICY "owner update daily" ON public.daily_entries FOR UPDATE USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner delete daily" ON public.daily_entries FOR DELETE USING (public.is_owner_or_unclaimed());

-- monthly_inputs
DROP POLICY IF EXISTS "public read monthly"   ON public.monthly_inputs;
DROP POLICY IF EXISTS "public write monthly"  ON public.monthly_inputs;
DROP POLICY IF EXISTS "public update monthly" ON public.monthly_inputs;
DROP POLICY IF EXISTS "public delete monthly" ON public.monthly_inputs;
CREATE POLICY "owner read monthly"   ON public.monthly_inputs FOR SELECT USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner write monthly"  ON public.monthly_inputs FOR INSERT WITH CHECK (public.is_owner_or_unclaimed());
CREATE POLICY "owner update monthly" ON public.monthly_inputs FOR UPDATE USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner delete monthly" ON public.monthly_inputs FOR DELETE USING (public.is_owner_or_unclaimed());

-- withdrawals
DROP POLICY IF EXISTS "public read wd"   ON public.withdrawals;
DROP POLICY IF EXISTS "public write wd"  ON public.withdrawals;
DROP POLICY IF EXISTS "public update wd" ON public.withdrawals;
DROP POLICY IF EXISTS "public delete wd" ON public.withdrawals;
CREATE POLICY "owner read wd"   ON public.withdrawals FOR SELECT USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner write wd"  ON public.withdrawals FOR INSERT WITH CHECK (public.is_owner_or_unclaimed());
CREATE POLICY "owner update wd" ON public.withdrawals FOR UPDATE USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner delete wd" ON public.withdrawals FOR DELETE USING (public.is_owner_or_unclaimed());

-- maintenance_parts
DROP POLICY IF EXISTS "public read parts"   ON public.maintenance_parts;
DROP POLICY IF EXISTS "public write parts"  ON public.maintenance_parts;
DROP POLICY IF EXISTS "public update parts" ON public.maintenance_parts;
DROP POLICY IF EXISTS "public delete parts" ON public.maintenance_parts;
CREATE POLICY "owner read parts"   ON public.maintenance_parts FOR SELECT USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner write parts"  ON public.maintenance_parts FOR INSERT WITH CHECK (public.is_owner_or_unclaimed());
CREATE POLICY "owner update parts" ON public.maintenance_parts FOR UPDATE USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner delete parts" ON public.maintenance_parts FOR DELETE USING (public.is_owner_or_unclaimed());

-- fuel_prices
DROP POLICY IF EXISTS "public read fuel"   ON public.fuel_prices;
DROP POLICY IF EXISTS "public update fuel" ON public.fuel_prices;
CREATE POLICY "owner read fuel"   ON public.fuel_prices FOR SELECT USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner write fuel"  ON public.fuel_prices FOR INSERT WITH CHECK (public.is_owner_or_unclaimed());
CREATE POLICY "owner update fuel" ON public.fuel_prices FOR UPDATE USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner delete fuel" ON public.fuel_prices FOR DELETE USING (public.is_owner_or_unclaimed());

-- 4. fuel_history (insert-only log of weekly prices)
CREATE TABLE IF NOT EXISTS public.fuel_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  gasoline_92 numeric NOT NULL DEFAULT 0,
  gasoline_95 numeric NOT NULL DEFAULT 0,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_history_created_at ON public.fuel_history (created_at DESC);
ALTER TABLE public.fuel_history ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_owner_fuel_history ON public.fuel_history;
CREATE TRIGGER set_owner_fuel_history BEFORE INSERT OR UPDATE ON public.fuel_history
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

CREATE POLICY "owner read fuel_history"   ON public.fuel_history FOR SELECT USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner write fuel_history"  ON public.fuel_history FOR INSERT WITH CHECK (public.is_owner_or_unclaimed());
CREATE POLICY "owner delete fuel_history" ON public.fuel_history FOR DELETE USING (public.is_owner_or_unclaimed());