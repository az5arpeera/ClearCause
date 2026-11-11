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
- [ ] Authentication (Email, google, yahoo)
- [ ] database schemas: (user prefs, charity financials (from scrape), etc (tbd for now)
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

Start from the landing page's cause picker or open /quiz directly. The quiz asks about causes, a preferred state, and whether to favor charities with annual budgets under $1 million. Each answer is optional. Results use fictional sample charities and show the preferences each result matched. Preferences travel in the URL so the results page can reopen the quiz with the same answers.

The matcher in [web/src/lib/matching.ts](web/src/lib/matching.ts) requires at least one cause in common when causes are selected. It gives up to four points for the fraction of selected causes covered, two points for a matching state, and one point for a known budget under $1 million when that preference is selected. The fit percentage divides the points earned by the maximum for the answered questions. With no answers, the catalog is listed alphabetically without scores.

### Scrape charity website metadata - Ali

Run from the repository root.
Replace the example URL with one or more public charity pages.

python scripts/scrape_charities.py https://example.org/about > charity-candidates.json

The scraper reads organization structured data, falls back to page metadata, and collects links labeled as annual reports, financial statements, or Form 990. Each JSON record includes the fetched source URL and timestamp. Unavailable fields are null. The scraper checks robots.txt, spaces out requests, and fetches only the supplied pages and their redirects. Errors go to stderr and produce a nonzero exit code while preserving successful records on stdout.

Review the candidate's identity, description, location, and source links before publication. To feed a reviewed record into matching, assign cause IDs from [web/src/data/causes.ts](web/src/data/causes.ts), normalize the state name, and supply an annual budget only when it is documented. The matcher accepts those reviewed fields through its MatchableCharity type. The prototype currently reads its catalog from [web/src/data/sample-matches.ts](web/src/data/sample-matches.ts).