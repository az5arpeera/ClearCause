# ClearCause
Donation Matching Dashboard

Clear Cause connects donors with the charities that best match their values, and makes it easy to see where the money goes.

What it is

Most giving platforms favor large, well-known charities, and donors have little insight into how their money is used. Clear Cause addresses both problems with a matching and transparency layer on top of charitable giving.

Core features
- Donor–charity matching algorithm: Ranks charities and matches them to each donor based on cause alignment and giving preferences, instead of making donors search through directories.
- Transparency dashboard: Shows how each organization operates and uses funds. It also gives smaller, donor-facing nonprofits visibility and recognition.
- Vetted partner organizations: Official partners pass strict financial audits and get free representation on the platform in return, which builds donor trust and lowers the barrier for small organizations.
- Gamification: Badges, streaks, and leaderboards make giving more engaging and encourage regular donations.


Why it matters
- Donors give with more confidence because the charities are vetted and the finances are visible.
- Small and mid-sized nonprofits get exposure they can’t afford on their own.
- Matching on personal values makes giving feel more relevant, which encourages donors to keep giving.

## Phases
1) Local charities (MVP)
2) Global expansion + enhanced support
3) Gamification + interactivity
4) Enhanced charity ranking Algorithm


## Tasks (for 10/26 - 11/3)
#### Ayman and Guarang
- [ ] Create landing page (UI)
- [ ] About page
- [ ] Contact Form

#### Shaheer
- [x] Authentication (Email, google, yahoo)
- [x] database schemas: (user prefs, charity financials (from scrape), etc (tbd for now)
- [ ] matching algorithm

#### Ali
- [ ] scraper
- [ ] matching algorithm


#### Eeshan
- [ ] charity ranking algorithm


#### TBD
- [ ] payment processor (stripe)

## later but necessary for MVP / phase 1 
- [ ] buy a domain name
- [ ] seperate test and prod endpoints
- [ ] CAPTCHA on sign-up (hCaptcha / Cloudflare Turnstile) to stop bot spam
- [ ] custom SMTP for auth emails (built-in Supabase mailer is dev-only / rate-limited)

## Architecture/Tech Stack
- Typescript
- Node.js
- Vercel
- Supabase
- 

## Features (general not final)
- Sign-up portal
- Account Setup
- Initial onboarding quiz
- Request form for charities
- Leaderboard of donators
- Charity ranking (1-100) based on transparency
- Smart search bar
- Filters/categories (purpose, location, cause, percentage given directly to charity, transparency score)
- Payment processor integration
- Matching algorithm
- Division of money's
- Interactive map to see where donated money went to
- Scraper for charities financials
- News feed
- dark and light mode

## Charity discovery prototype - Ali

From the repository root, run:
cd web
npm ci
npm run dev

Start from the landing page's cause picker or open /quiz directly. The quiz asks about causes, a preferred state, charity size, a typical gift, how often you give, and a minimum share reaching programs. Each answer is optional, and signed-in donors have them saved to Supabase. Preferences travel in the URL, so results, profiles and "Edit my preferences" all reopen with the same answers.

Every page reads live data from Supabase (vetted charities only, under RLS):

- **Landing page** (`/`): live counters (charities listed, partners, share under $1M, median cents to programs), "Follow $1.00" from a real charity's latest statement, and the three most transparent small charities.
- **Matches** (`/matches`): the ranked list from [web/src/lib/matching.ts](web/src/lib/matching.ts), each with a cents-to-programs bar and a link to its profile.
- **Charity profile** (`/charity/<id>`): where each dollar went, year by year when there are several statements, how it fits your quiz answers, and where every figure came from (the statement PDF and page, when the scraper supplied it).

The matcher is the content-based model in [docs/matching-algorithm.md](docs/matching-algorithm.md): cosine similarity between your causes and the charity's (60%), transparency (20%), share reaching programs (15%) and partner status (5%). A minimum program share is a hard filter; a chosen state and "prefer small" are soft ranking nudges.

### Scrape charity website metadata - Ali

Run from the repository root.
Replace the example URL with one or more public charity pages.

```powershell
python -m pip install -r scripts/requirements.txt
python scripts/scrape_charities.py https://www.charitywater.org/ https://stjude.org/ https://development.org/ > charity-candidates.json
```

The scraper reads organization structured data, falls back to page metadata, and collects financial links. It follows links such as Financials, Reports & Financials, and Audit Report. When needed, it explores the charity's About section and linked report pages. Discovery is bounded to eight page requests and three link levels per charity. It checks robots.txt and spaces out requests, including on external PDF hosts.

It reads up to five financial statement PDFs, prioritizing recent years, with a 20 MiB download limit and a 30-page scan limit per PDF. It handles rotated text pages, comparative years, nested donor subtotals, and amounts reported in thousands or millions. Total columns are checked against their component columns when available.

Each entry in `financialStatements` includes the PDF URL and any recognized figures, such as contributions, total expenses, program service expenses, and ending net assets. Each figure includes its fiscal year, the statement row label, its 1-based PDF page number, and an `extractionMethod` of `text` or `ocr`. Amounts are expanded to full units. `currencySymbol` records the symbol present in the document.

Scanned pages use local OCR. On Windows, the scraper uses the built-in English OCR engine when Tesseract is absent. Windows English OCR language support must be installed. On other platforms, install Tesseract with its English language data and make `tesseract` available on PATH. OCR also tries rotating sideways scans. Review OCR figures against their cited pages before publication.

Extraction covers supported statement of activities and balance sheet layouts. JavaScript-only navigation and Form 990 tables are outside its coverage. A readable PDF with no recognized figures has status `noSupportedFigures`. Follow-up errors appear in `financialStatementErrors` while the charity record stays on stdout. If OCR fails on a PDF that already yielded text figures, those figures are preserved and the statement includes `warnings`. Errors fetching or reading a supplied charity page go to stderr and produce a nonzero exit code.

Run the discovery and extraction regression checks with `python -B -m unittest scripts.test_scrape_charities`.

### From scraper output to the live site

Turn the scraper's JSON into a reviewable migration (PowerShell's UTF-16 output is fine):

```powershell
python scripts/import_candidates.py charity-candidates.json
```

This writes the next file in `supabase/migrations/`. Each charity is added as `pending`, which keeps it off the public site, with one `charity_financials` row per fiscal year it read: revenue, total, program, admin and fundraising expenses, the program ratio, and a `source_url` pointing at the exact statement page (`report.pdf#page=4`). Re-running the import updates the figures but never changes a charity's vetting status. The charity's id is derived from its source URL, so it stays the same between runs.

Before publishing, a reviewer checks each figure against its cited page (OCR figures especially), tags causes in `charity_causes` using the slugs in [web/src/data/causes.ts](web/src/data/causes.ts), and sets `vetting_status = 'vetted'`. Then apply it with `supabase db push`. The charity then appears in matches and gets a profile at `/charity/<id>`, with every figure linked to its source page.

Run the importer checks with `python -B -m unittest scripts.test_import_candidates`.

### Automatic charity discovery (weekly)

The **Discover charities** GitHub Action (`.github/workflows/discover-charities.yml`) runs every Monday, and on demand from the Actions tab:

1. `scripts/irs_candidates.py` reads the IRS register of tax-exempt organizations for every state and keeps small 501(c)(3) public charities (revenue $50K to $5M) whose NTEE code matches one of our causes. It skips any EIN already in the database.
2. For each one it fetches only that charity's latest Form 990 / 990-EZ from the IRS e-file archives (HTTP range requests, so nothing large is downloaded). The return gives the name, city, mission, website, revenue, expenses and, on a full Form 990, the program / management / fundraising split.
3. Our scraper (`scrape_charities.py`) then visits each charity's website, plus every site listed in `scripts/charity-websites.txt`, looking for audited statements; those figures take priority over the return for the same year.
4. `import_candidates.py` writes everything into Supabase as **pending**, matched by EIN so nothing is added twice. Figures cite the IRS page for the charity.

Admins then review at **`/admin/review`**: check the figures against the linked source, fix the causes, and approve or reject. Approved charities appear on the site straight away.

**One-time setup** (someone with Supabase access):
- Add a repository secret `SUPABASE_DB_URL` (GitHub → Settings → Secrets and variables → Actions). Use the **Session pooler** connection string from Supabase → Project Settings → Database, since GitHub's runners connect over IPv4.
- Make reviewers admins in the SQL Editor: `update public.profiles set role = 'admin' where id = (select id from auth.users where email = '...');`

To try it locally without touching the database:

```powershell
python scripts/irs_candidates.py --states VT RI --per-state-cause 1 --scrape-minutes 5 --out candidates.json
python scripts/import_candidates.py candidates.json --out import.sql
```

A few IRS archives use Deflate64 compression; reading them needs `inflate64` (in `scripts/requirements.txt`). Without it those archives are skipped. Run the checks with `python -B -m unittest scripts.test_irs_candidates`.

### Finding real charities via ProPublica

`scripts/discover_propublica.py` searches ProPublica's Nonprofit Explorer API (IRS Form 990 data) for small charities in each Clear Cause cause, by state, and writes records in the scraper's format, with an EIN and cause tags:

```powershell
python scripts/discover_propublica.py --states OH MI PA --per-cause 2 --out propublica.json
python scripts/import_candidates.py propublica.json
```

These filings give revenue and total expenses only, not the program/admin/fundraising split, so profiles show the totals and say the split isn't broken out yet; ranking uses a neutral efficiency score. ProPublica's terms require citing it wherever its data appears: profiles label these figures "IRS Form 990 via ProPublica Nonprofit Explorer" and link the filing.

## Pages

- `/explore`: every vetted charity, with a filter sidebar (search, causes, state, budget, share to programs, transparency, partners) and a donut chart; click a slice to filter. Filters live in the URL.
- `/quiz`: one-time onboarding. Answers are saved in the browser (and to the account when signed in; a guest's answers move to their account on sign-up), then it goes to For You. Visiting again edits them.
- `/for-you`: every charity ranked by `suggestCharities` in `web/src/lib/matching.ts`. Nothing is filtered out: charities sharing a chosen cause come first, the rest under "More to explore".
- `/charity/<id>`: a charity's page: where the money went, a gift form, why it matched you, and a source for every figure.
- `/profile`: the donor's photo and name (saved to `profiles`; photos go to the `avatars` storage bucket), their quiz answers, and a payment-method placeholder. Cards will be stored by Stripe, never in our database.
- `/about`: what Clear Cause is, where charities and figures come from, and how matching is weighted.
- `/contact`: a form that saves to `contact_messages` (anyone can send; only admins can read).

Photo uploads and the contact form need `supabase/migrations/0005_profile_avatars_contact.sql` applied (paste it into Supabase's SQL Editor, or `supabase db push`).
