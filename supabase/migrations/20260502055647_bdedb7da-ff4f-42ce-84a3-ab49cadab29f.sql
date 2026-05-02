-- Fuel fill log (each refill event)
CREATE TABLE public.fuel_fills (
  id text PRIMARY KEY,
  date date NOT NULL,
  liters numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_fills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read fuel_fills" ON public.fuel_fills FOR SELECT USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner write fuel_fills" ON public.fuel_fills FOR INSERT WITH CHECK (public.is_owner_or_unclaimed());
CREATE POLICY "owner update fuel_fills" ON public.fuel_fills FOR UPDATE USING (public.is_owner_or_unclaimed());
CREATE POLICY "owner delete fuel_fills" ON public.fuel_fills FOR DELETE USING (public.is_owner_or_unclaimed());

CREATE TRIGGER set_owner_id_fuel_fills
  BEFORE INSERT ON public.fuel_fills
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

-- Region for car (stored on the singleton app_owner row)
ALTER TABLE public.app_owner ADD COLUMN IF NOT EXISTS region text;