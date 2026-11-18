-- ============================================================================
-- Align the cause taxonomy with the web app (web/src/data/causes.ts)
-- ----------------------------------------------------------------------------
-- The initial seed in 0001 used a generic starter set. The app ships a fixed
-- set of 8 causes (hunger, housing, kids, climate, animals, health, arts,
-- reuse) with its own labels, and matches charities to donors by cause SLUG.
-- This migration makes the database agree with that set.
--
-- Safe to run now: no charity data references causes yet (charities are seeded
-- in 0003, after this).
-- ============================================================================

-- Add the causes the app has that the DB was missing.
insert into public.causes (slug, name) values
  ('hunger',  'Hunger'),
  ('housing', 'Housing'),
  ('kids',    'Kids and schools'),
  ('reuse',   'Repair and reuse')
on conflict (slug) do nothing;

-- Bring the overlapping causes' display names in line with the app's labels.
update public.causes set name = 'Climate' where slug = 'climate';
update public.causes set name = 'Animals' where slug = 'animals';
update public.causes set name = 'Health'  where slug = 'health';
update public.causes set name = 'Arts'    where slug = 'arts';

-- Drop the starter causes the app does not use. No rows reference them yet.
delete from public.causes
where slug in ('education', 'poverty', 'human_rights', 'disaster_relief');
