
-- Add region to fuel_fills, quota_liters to app_owner, trip fields to daily_entries
ALTER TABLE public.fuel_fills ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '';
ALTER TABLE public.app_owner ADD COLUMN IF NOT EXISTS quota_liters NUMERIC NOT NULL DEFAULT 35;
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS trip_type TEXT NOT NULL DEFAULT 'city';
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS trip_start DATE;
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS trip_end DATE;

-- Allow owner to update app_owner (for quota & region updates)
DROP POLICY IF EXISTS "owner update app_owner" ON public.app_owner;
CREATE POLICY "owner update app_owner"
ON public.app_owner
FOR UPDATE
USING (public.is_owner_or_unclaimed());

-- Allow update + delete on fuel_history (for editing/deleting price records)
DROP POLICY IF EXISTS "owner update fuel_history" ON public.fuel_history;
CREATE POLICY "owner update fuel_history"
ON public.fuel_history
FOR UPDATE
USING (public.is_owner_or_unclaimed());
