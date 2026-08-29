-- Adds a per-company total click counter (bumped when a visitor's tap opens
-- the billboard's url) and exposes when the company's rank was last claimed
-- (its most recent payment) on the ranking view. Safe to run on an existing
-- database.

alter table companies add column if not exists click_count bigint not null default 0;

create or replace function bump_company_clicks(p_company_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  update companies set click_count = click_count + 1 where id = p_company_id
  returning click_count;
$$;

grant execute on function bump_company_clicks(uuid) to anon, authenticated;

create or replace view current_ranking as
select c.id, c.name, c.url, c.color, c.icon_url, c.title, c.description, c.category,
       c.click_count, max(p.created_at) as claimed_at,
       sum(p.amount) as total_amount
from payments p
join companies c on c.id = p.company_id
where p.cycle_id = (select id from cycles order by starts_at desc limit 1)
group by c.id, c.name, c.url, c.color, c.icon_url, c.title, c.description, c.category, c.click_count;
