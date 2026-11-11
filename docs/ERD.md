# ClearCause — Entity Relationship Diagram

Visual map of the database defined in
[`supabase/migrations/0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql).

**Scope:** Phase 1 / MVP (Local charities). Covers sign-up, the onboarding quiz,
charity browsing + transparency, and donations. Gamification, news feed, charity
applications, and split donations are deferred to later phases.

**Model:** Only **donors** and **admins** log in. Charities are admin-curated
data records (scraper-fed + vetted), not accounts.

> Renders automatically on GitHub. In VS Code, install the "Markdown Preview
> Mermaid Support" extension to preview locally.
>
> A rendered image is also available at [`ERD.png`](./ERD.png) (regenerate with
> `npx @mermaid-js/mermaid-cli -i erd.mmd -o docs/ERD.png -b white -s 2`).

![ClearCause ERD](./ERD.png)

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 (trigger)"

    profiles ||--o| donor_preferences : "fills quiz"
    profiles ||--o{ donor_cause_preferences : "weights causes"
    profiles ||--o{ donations : "makes"

    causes ||--o{ donor_cause_preferences : "chosen in"
    causes ||--o{ charity_causes : "tagged on"

    charities ||--o{ charity_causes : "works on"
    charities ||--o{ charity_financials : "reports"
    charities ||--o{ donations : "receives"

    auth_users {
        uuid id PK "managed by Supabase Auth"
        text email
        jsonb raw_user_meta_data
    }

    profiles {
        uuid id PK,FK "= auth.users.id"
        user_role role "donor | admin (admin-set only)"
        text display_name
        text avatar_url
        timestamptz created_at
    }

    donor_preferences {
        uuid profile_id PK,FK
        numeric giving_budget
        text frequency "one_time | monthly ..."
        text location_scope "local | national | global"
        smallint direct_pct_min "0..100"
    }

    causes {
        smallint id PK
        text slug UK "education, climate ..."
        text name
    }

    donor_cause_preferences {
        uuid profile_id PK,FK
        smallint cause_id PK,FK
        smallint weight "1..5 (matching signal)"
    }

    charities {
        uuid id PK
        text name
        text ein UK "tax id / scraper dedupe key"
        text description
        text website_url
        double latitude "for map"
        double longitude
        vetting_status vetting_status "pending|vetted|rejected|suspended"
        boolean is_partner
        smallint transparency_score "0..100 (ranking job)"
        text stripe_account_id "Stripe Connect"
    }

    charity_causes {
        uuid charity_id PK,FK
        smallint cause_id PK,FK
    }

    charity_financials {
        bigint id PK
        uuid charity_id FK
        smallint fiscal_year "UK with charity_id"
        numeric total_revenue
        numeric total_expenses
        numeric program_expenses
        numeric program_expense_ratio "transparency input"
        text source_url
        timestamptz scraped_at
    }

    donations {
        uuid id PK
        uuid donor_id FK "-> profiles"
        uuid charity_id FK "-> charities"
        numeric amount
        text currency
        donation_status status "pending|succeeded|failed|refunded"
        text stripe_payment_intent_id UK
        timestamptz created_at
    }
```

## Notes

- **`auth_users`** is shown as `auth.users`, Supabase's managed auth table. A
  trigger mirrors each signup into `profiles` (1:1).
- A donation references a **single** charity for MVP. Splitting one donation
  across multiple charities ("division of money") returns in a later phase.
- Charity **transparency score** lives as a column on `charities` (updated by
  the ranking job). Score history as its own table is deferred.

### Relationship legend

| Symbol | Meaning |
|--------|---------|
| `\|\|--\|\|` | exactly one to exactly one |
| `\|\|--o\|` | one to zero-or-one (optional) |
| `\|\|--o{` | one to zero-or-many |
| `PK` / `FK` / `UK` | primary key / foreign key / unique key |

### Who can write what (RLS summary)

| Written by **browser** (anon key, RLS) | Written by **service role** only (no write policy) |
|---|---|
| `donor_preferences`, `donor_cause_preferences` (own) | `charity_financials` (scraper) |
| `profiles` (own, except `role`) | `charities.transparency_score` (ranking job) |
| | `donations` (Stripe webhook) |

## Deferred to later phases

Removed from the MVP to keep it lean — reintroduce when the phase calls for it:

- **Gamification** — badges, user badges, streaks, leaderboard
- **News feed** — editorial posts
- **Charity applications** — the public "request form" (handled off-DB at first)
- **Split donations** — `donation_allocations`
- **Ranking history** — per-charity score over time
