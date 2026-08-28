-- Total pageviews since launch, shown as a gauge next to the ranking.
-- A single-row counter bumped through an RPC (never written to directly) so
-- the anon key can only ever add one, never set an arbitrary total.

create table if not exists site_visits (
  id smallint primary key default 1,
  total bigint not null default 0,
  constraint site_visits_single_row check (id = 1)
);

insert into site_visits (id, total) values (1, 0) on conflict (id) do nothing;

create or replace function bump_site_visits()
returns bigint
language sql
security definer
set search_path = public
as $$
  update site_visits set total = total + 1 where id = 1
  returning total;
$$;

grant execute on function bump_site_visits() to anon, authenticated;

alter table site_visits enable row level security;
create policy "public read site_visits" on site_visits for select using (true);

-- realtime on site_visits so every open tab sees the count climb live
alter publication supabase_realtime add table site_visits;
