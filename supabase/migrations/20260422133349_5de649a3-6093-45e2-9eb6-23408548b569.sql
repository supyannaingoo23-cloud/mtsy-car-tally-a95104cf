
-- MTSY Cloud sync tables (shared single-workspace, no auth)

create table public.daily_entries (
  id text primary key,
  date date not null,
  mileage_start numeric not null default 0,
  mileage_stop numeric not null default 0,
  fuel_fees numeric not null default 0,
  other_fees numeric not null default 0,
  income numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table public.monthly_inputs (
  ym text primary key,
  gc numeric not null default 0,
  plastic_income numeric not null default 0,
  rental_represent numeric not null default 0,
  rental_present numeric not null default 0,
  rental_outflow numeric not null default 0,
  plastic_outflow numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table public.maintenance_parts (
  key text primary key,
  label text not null,
  km_interval numeric not null default 0,
  months_interval numeric,
  last_service_mileage numeric not null default 0,
  last_service_date date not null,
  updated_at timestamptz not null default now()
);

create table public.withdrawals (
  id text primary key,
  date date not null,
  category text not null,
  amount numeric not null default 0,
  note text not null default '',
  updated_at timestamptz not null default now()
);

create table public.fuel_prices (
  id integer primary key default 1,
  price_92 numeric not null default 0,
  price_95 numeric not null default 0,
  price_diesel numeric not null default 0,
  updated_at timestamptz not null default now(),
  constraint fuel_prices_singleton check (id = 1)
);

insert into public.fuel_prices (id, price_92, price_95, price_diesel) values (1, 0, 0, 0);

-- Enable RLS, allow anon full access (single-operator shared workspace)
alter table public.daily_entries enable row level security;
alter table public.monthly_inputs enable row level security;
alter table public.maintenance_parts enable row level security;
alter table public.withdrawals enable row level security;
alter table public.fuel_prices enable row level security;

create policy "public read daily" on public.daily_entries for select using (true);
create policy "public write daily" on public.daily_entries for insert with check (true);
create policy "public update daily" on public.daily_entries for update using (true);
create policy "public delete daily" on public.daily_entries for delete using (true);

create policy "public read monthly" on public.monthly_inputs for select using (true);
create policy "public write monthly" on public.monthly_inputs for insert with check (true);
create policy "public update monthly" on public.monthly_inputs for update using (true);
create policy "public delete monthly" on public.monthly_inputs for delete using (true);

create policy "public read parts" on public.maintenance_parts for select using (true);
create policy "public write parts" on public.maintenance_parts for insert with check (true);
create policy "public update parts" on public.maintenance_parts for update using (true);
create policy "public delete parts" on public.maintenance_parts for delete using (true);

create policy "public read wd" on public.withdrawals for select using (true);
create policy "public write wd" on public.withdrawals for insert with check (true);
create policy "public update wd" on public.withdrawals for update using (true);
create policy "public delete wd" on public.withdrawals for delete using (true);

create policy "public read fuel" on public.fuel_prices for select using (true);
create policy "public update fuel" on public.fuel_prices for update using (true);

-- Realtime
alter publication supabase_realtime add table public.daily_entries;
alter publication supabase_realtime add table public.monthly_inputs;
alter publication supabase_realtime add table public.maintenance_parts;
alter publication supabase_realtime add table public.withdrawals;
alter publication supabase_realtime add table public.fuel_prices;
