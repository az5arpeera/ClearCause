-- ============================================================================
-- ClearCause — Initial database schema (Phase 1 / MVP: Local charities)
-- ----------------------------------------------------------------------------
-- Target: Supabase (PostgreSQL 15+)
-- Scope:  Deliberately minimal. Covers sign-up, the onboarding quiz, charity
--         browsing + transparency, and donations. Gamification, news feed,
--         charity applications, and split donations are intentionally LEFT OUT
--         until later phases.
--
-- Model:  Admin-curated charities. The only accounts that log in are DONORS
--         and platform ADMINS. Charities are data records (scraper-fed +
--         admin-vetted), NOT login accounts.
--
-- Security: Row-Level Security (RLS) is enabled on every public table. The
--         browser uses the anon key and is always constrained by these
--         policies. Background jobs (scraper, ranking, Stripe webhooks) use
--         the service-role key, which bypasses RLS.
--
-- Apply with:  supabase db push      (or paste into the SQL editor)
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
create type public.user_role       as enum ('donor', 'admin');
create type public.vetting_status  as enum ('pending', 'vetted', 'rejected', 'suspended');
create type public.donation_status as enum ('pending', 'succeeded', 'failed', 'refunded');

-- ============================================================================
-- PROFILES  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
-- App-level user data. `role` is NEVER self-editable by a user (see policies).
-- ============================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'donor',
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Application profile, one row per auth user. role is admin-managed only.';

-- Auto-create a profile whenever a new auth user signs up (email, Google, etc.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user a platform admin?
-- SECURITY DEFINER so it can read profiles without tripping over RLS,
-- and so policies that call it stay simple.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- CAUSES  (shared taxonomy for matching)
-- ============================================================================
create table public.causes (
  id   smallint generated always as identity primary key,
  slug text not null unique,          -- 'education', 'climate', 'health', ...
  name text not null
);

-- ============================================================================
-- DONOR PREFERENCES  (onboarding quiz → matching algorithm inputs)
-- ============================================================================
create table public.donor_preferences (
  profile_id     uuid primary key references public.profiles (id) on delete cascade,
  giving_budget  numeric(10,2),            -- typical donation size
  frequency      text,                     -- 'one_time' | 'monthly' | 'quarterly' ...
  location_scope text,                     -- 'local' | 'national' | 'global'
  direct_pct_min smallint,                 -- min % reaching the charity they'll accept
  updated_at     timestamptz not null default now(),
  constraint direct_pct_min_range check (direct_pct_min between 0 and 100)
);

-- Weighted cause preferences — the core matching signal
create table public.donor_cause_preferences (
  profile_id uuid     references public.profiles (id) on delete cascade,
  cause_id   smallint references public.causes (id)   on delete cascade,
  weight     smallint not null default 1,   -- 1..5 from the quiz
  primary key (profile_id, cause_id),
  constraint weight_range check (weight between 1 and 5)
);

-- ============================================================================
-- CHARITIES  (admin-curated + scraper-fed)
-- ============================================================================
create table public.charities (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  ein                text unique,              -- tax id; natural dedupe key for scraper
  description        text,
  website_url        text,
  logo_url           text,
  location_city      text,
  location_region    text,
  country            text,
  latitude           double precision,         -- for the "where money went" map
  longitude          double precision,
  vetting_status     public.vetting_status not null default 'pending',
  is_partner         boolean not null default false,  -- vetted partner (free representation)
  transparency_score smallint,                 -- 0..100, written by the ranking job
  stripe_account_id  text,                      -- Stripe Connect account, for payouts
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint transparency_score_range check (transparency_score between 0 and 100)
);

create index on public.charities (vetting_status);
create index on public.charities (transparency_score desc);

-- Many-to-many: a charity works across one or more causes
create table public.charity_causes (
  charity_id uuid     references public.charities (id) on delete cascade,
  cause_id   smallint references public.causes (id)    on delete cascade,
  primary key (charity_id, cause_id)
);

-- ============================================================================
-- CHARITY FINANCIALS  (written by the scraper)
-- ============================================================================
create table public.charity_financials (
  id                    bigint generated always as identity primary key,
  charity_id            uuid not null references public.charities (id) on delete cascade,
  fiscal_year           smallint not null,
  total_revenue         numeric(14,2),
  total_expenses        numeric(14,2),
  program_expenses      numeric(14,2),         -- $ going to programs
  admin_expenses        numeric(14,2),
  fundraising_expenses  numeric(14,2),
  program_expense_ratio numeric(5,4),          -- key transparency input (0.0000..1.0000)
  source_url            text,
  scraped_at            timestamptz not null default now(),
  unique (charity_id, fiscal_year)             -- idempotent upserts from the scraper
);

-- ============================================================================
-- DONATIONS  (Stripe) — one donation goes to one charity for MVP
-- ----------------------------------------------------------------------------
-- Rows are written SERVER-SIDE ONLY (Stripe webhook, service-role key).
-- The browser only creates a PaymentIntent via your API — never inserts here.
-- (Splitting one donation across multiple charities is a later phase.)
-- ============================================================================
create table public.donations (
  id                       uuid primary key default gen_random_uuid(),
  donor_id                 uuid references public.profiles (id) on delete set null,
  charity_id               uuid not null references public.charities (id),
  amount                   numeric(10,2) not null,
  currency                 text not null default 'usd',
  status                   public.donation_status not null default 'pending',
  stripe_payment_intent_id text unique,
  created_at               timestamptz not null default now(),
  constraint amount_positive check (amount > 0)
);

create index on public.donations (donor_id, created_at desc);
create index on public.donations (charity_id);

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Enable RLS everywhere, then grant exactly what each actor needs.
-- Anything NOT covered by a policy is denied for the anon/authenticated roles.
-- The service-role key bypasses all of this.
-- ============================================================================
alter table public.profiles                enable row level security;
alter table public.causes                   enable row level security;
alter table public.donor_preferences        enable row level security;
alter table public.donor_cause_preferences  enable row level security;
alter table public.charities                 enable row level security;
alter table public.charity_causes            enable row level security;
alter table public.charity_financials        enable row level security;
alter table public.donations                 enable row level security;

-- ---- profiles -------------------------------------------------------------
create policy "read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- A user may update their own row, but NOT change their role.
create policy "update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "admins manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- causes (public read, admin write) ------------------------------------
create policy "anyone reads causes" on public.causes
  for select using (true);
create policy "admins write causes" on public.causes
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- donor preferences (owner CRUD) ---------------------------------------
create policy "owner crud prefs" on public.donor_preferences
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "owner crud cause prefs" on public.donor_cause_preferences
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---- charities (public reads VETTED only; admins everything) --------------
create policy "read vetted charities" on public.charities
  for select using (vetting_status = 'vetted' or public.is_admin());
create policy "admins write charities" on public.charities
  for all using (public.is_admin()) with check (public.is_admin());

create policy "read charity_causes" on public.charity_causes
  for select using (
    public.is_admin()
    or exists (select 1 from public.charities c
               where c.id = charity_id and c.vetting_status = 'vetted')
  );
create policy "admins write charity_causes" on public.charity_causes
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- financials (public read; writes via service role only) ---------------
create policy "anyone reads financials" on public.charity_financials
  for select using (true);
-- (No insert/update/delete policies → only the service-role key can write.)

-- ---- donations (owner reads own; writes via service role / Stripe) --------
create policy "read own donations" on public.donations
  for select using (donor_id = auth.uid() or public.is_admin());
-- (No insert/update policies → the Stripe webhook writes with service role.)

-- ============================================================================
-- SEED DATA (optional starter causes)
-- ============================================================================
insert into public.causes (slug, name) values
  ('education',      'Education'),
  ('health',         'Health & Medicine'),
  ('climate',        'Climate & Environment'),
  ('poverty',        'Poverty & Hunger'),
  ('animals',        'Animal Welfare'),
  ('human_rights',   'Human Rights'),
  ('disaster_relief','Disaster Relief'),
  ('arts',           'Arts & Culture')
on conflict (slug) do nothing;
