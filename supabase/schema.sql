-- OutGrow.lol schema — companies / payments / cycles, per the brief.
-- The ranking of a cycle is the sum of its payments per company, so resets are
-- free: open a new cycle, the old one becomes the hall of fame.

create table if not exists cycles (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null default now(),
  ends_at timestamptz
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  url text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  cycle_id uuid not null references cycles (id),
  amount numeric not null check (amount > 0),
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

-- current ranking = payments of the latest cycle, summed per company
create or replace view current_ranking as
select c.id, c.name, c.url, c.color, sum(p.amount) as total_amount
from payments p
join companies c on c.id = p.company_id
where p.cycle_id = (select id from cycles order by starts_at desc limit 1)
group by c.id, c.name, c.url, c.color;

-- open the first cycle
insert into cycles default values;

-- RLS: public read, writes only through the service role (webhook)
alter table cycles enable row level security;
alter table companies enable row level security;
alter table payments enable row level security;
create policy "public read cycles" on cycles for select using (true);
create policy "public read companies" on companies for select using (true);
create policy "public read payments" on payments for select using (true);

-- realtime on payments so open tabs re-rank live
alter publication supabase_realtime add table payments;
