-- Adds the scraped site metadata to companies (favicon, SEO copy, category) and
-- exposes it on the ranking view. Safe to run on an existing database.

alter table companies add column if not exists icon_url text;
alter table companies add column if not exists title text;
alter table companies add column if not exists description text;
alter table companies add column if not exists category text;
alter table companies add column if not exists enriched_at timestamptz;

create or replace view current_ranking as
select c.id, c.name, c.url, c.color, c.icon_url, c.title, c.description, c.category,
       sum(p.amount) as total_amount
from payments p
join companies c on c.id = p.company_id
where p.cycle_id = (select id from cycles order by starts_at desc limit 1)
group by c.id, c.name, c.url, c.color, c.icon_url, c.title, c.description, c.category;
