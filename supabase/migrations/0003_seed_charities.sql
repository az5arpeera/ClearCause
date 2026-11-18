-- ============================================================================
-- Seed sample charities (Phase 1 / MVP)
-- ----------------------------------------------------------------------------
-- Fictional, illustrative charities translated from the web prototype's sample
-- data (web/src/data/sample-matches.ts) so the live app has real rows to read
-- and rank. All are marked `vetted` so the anon browser can read them under RLS.
-- Fixed UUIDs keep this migration idempotent.
-- ============================================================================

insert into public.charities
  (id, name, ein, description, website_url, location_city, location_region, country,
   vetting_status, is_partner, transparency_score)
values
  ('10000000-0000-4000-8000-000000000001', 'Northside Community Pantry', '83-0000001',
   'Households shop for their own groceries twice a week in a former hardware store on Linden Avenue.',
   'https://northside.example.org', 'Harlow', 'Ohio', 'USA', 'vetted', true, 84),
  ('10000000-0000-4000-8000-000000000002', 'Eastgate Tool Library', '83-0000002',
   'A library card for drills, ladders and pressure washers, run out of a church basement.',
   'https://eastgate.example.org', 'Harlow', 'Ohio', 'USA', 'vetted', false, 81),
  ('10000000-0000-4000-8000-000000000003', 'River Bend Reading Corps', '83-0000003',
   'One adult, one child, twice a week, from first grade until they read at grade level.',
   'https://riverbend.example.org', 'Marlow County', 'Ohio', 'USA', 'vetted', true, 86),
  ('10000000-0000-4000-8000-000000000004', 'Willow Keys Housing Fund', '83-0000004',
   'Helps renters cover emergency costs and find stable housing.',
   'https://willowkeys.example.org', null, 'Michigan', 'USA', 'vetted', false, 82),
  ('10000000-0000-4000-8000-000000000005', 'Alder Watershed Crew', '83-0000005',
   'Restores creekside habitat and plants shade trees with local volunteers.',
   'https://alder.example.org', null, 'Pennsylvania', 'USA', 'vetted', true, 88),
  ('10000000-0000-4000-8000-000000000006', 'Pawbridge Foster Network', '83-0000006',
   'Provides foster homes and veterinary care for dogs and cats awaiting adoption.',
   'https://pawbridge.example.org', null, 'Ohio', 'USA', 'vetted', false, 79),
  ('10000000-0000-4000-8000-000000000007', 'Meadowline Mobile Health', '83-0000007',
   'Runs mobile clinics and helps families connect with ongoing care.',
   'https://meadowline.example.org', null, 'Michigan', 'USA', 'vetted', false, 80),
  ('10000000-0000-4000-8000-000000000008', 'Linden Street Arts Workshop', '83-0000008',
   'Offers free after-school arts classes and studio space for young people.',
   'https://linden.example.org', null, 'Pennsylvania', 'USA', 'vetted', true, 83)
on conflict (id) do nothing;

-- Cause tags (resolve cause ids by slug so this survives identity re-numbering).
insert into public.charity_causes (charity_id, cause_id)
select v.charity_id, ca.id
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'hunger'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'reuse'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'kids'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'housing'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'climate'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'animals'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'health'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'arts'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'kids')
) as v(charity_id, slug)
join public.causes ca on ca.slug = v.slug
on conflict do nothing;

-- One fiscal year of financials each (fiscal 2025). total_expenses doubles as
-- the "annual budget" the matcher reads; program_expense_ratio feeds efficiency.
insert into public.charity_financials
  (charity_id, fiscal_year, total_revenue, total_expenses, program_expenses, program_expense_ratio)
values
  ('10000000-0000-4000-8000-000000000001', 2025,  398200,  398200,  334500, 0.8400),
  ('10000000-0000-4000-8000-000000000002', 2025,  142000,  142000,  115020, 0.8100),
  ('10000000-0000-4000-8000-000000000003', 2025,  264000,  264000,  227040, 0.8600),
  ('10000000-0000-4000-8000-000000000004', 2025,  680000,  680000,  557600, 0.8200),
  ('10000000-0000-4000-8000-000000000005', 2025,  360000,  360000,  316800, 0.8800),
  ('10000000-0000-4000-8000-000000000006', 2025,  510000,  510000,  402900, 0.7900),
  ('10000000-0000-4000-8000-000000000007', 2025, 1250000, 1250000, 1000000, 0.8000),
  ('10000000-0000-4000-8000-000000000008', 2025,  290000,  290000,  240700, 0.8300)
on conflict (charity_id, fiscal_year) do nothing;
