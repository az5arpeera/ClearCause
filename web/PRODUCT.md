# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Clear Cause is a two-sided marketplace.

- **Donors:** individuals deciding where to give, or checking on what their past giving has done. They want to find charities that fit their values without searching through directories, and to trust that their money is used well.
- **Nonprofits:** staff at charities, especially small and mid-sized ones that can't afford their own visibility. They want to reach donors, show how they operate and use funds, and earn trust by becoming vetted partners.

Open: the detailed nonprofit-side workflows (onboarding, applying for partnership, the audit process, publishing financials) haven't been specified yet.

## Product Purpose

Clear Cause connects donors with the charities that best match their values and makes it easy to see where the money goes. It adds a matching and transparency layer on top of charitable giving.

It exists because most giving platforms favor large, well-known charities, and donors have little insight into how their money is used.

Success means:
- donors give with more confidence and keep giving over time;
- small and mid-sized nonprofits get exposure they couldn't get on their own.

## Positioning

The differentiator is two things together: matching charities to each donor's values, and a transparency layer backed by audits. Other platforms ask donors to browse directories ranked by prominence. Clear Cause ranks charities for each donor, and gives smaller organizations equal footing through vetted, free partner representation.

Open: the user hasn't yet set a sharper competitive claim beyond this.

## Capabilities and Constraints

- **Donor–charity matching:** ranks charities and matches them to each donor based on cause alignment and giving preferences. How the algorithm works and which preference inputs it uses are not yet specified.
- **Transparency dashboard:** shows how each organization operates and uses its funds. It also gives smaller, donor-facing nonprofits visibility and recognition.
- **Vetted partner organizations:** official partners pass strict financial audits and get free representation on the platform in return.
- **Gamification:** badges, streaks, and leaderboards make giving more engaging and encourage regular donations.
- **Stack:** Vite, React, TypeScript, Tailwind CSS v4, and shadcn/ui (already in the repo).

Open decisions:
- payment processing and donation mechanics;
- the audit criteria and who performs audits;
- how leaderboards handle donor privacy and anonymous giving.

## Brand Commitments

- **Name:** "Clear Cause" (the repository is named ClearCauseUI).
- No logo, voice guide, or other brand assets exist yet.

### Binding visual direction (set by the user)

These constraints are fixed. Design work refines them but must not override them.

- **Feel:** trustworthy, calm, specific. Like a well-designed annual report or a good bank statement, not a startup landing page. Numbers are the hero. It should feel made by a human designer for this exact product.
- **Colors:** green and blue.
  - Deep forest green is the main color.
  - Dark ink/navy blue is for text and data.
  - Warm off-white paper is the background.
  - One brighter green is used only for "money went here" highlights.
- **Hard no's:**
  - purple;
  - gradients as surfaces or backgrounds (the liquid glass rim and sheen highlights are the one exception);
  - glowing shadows;
  - emoji as icons;
  - a centered hero with a big headline and two buttons;
  - rows of three identical rounded cards;
  - stock "AI" illustrations;
  - Inter as the only font;
  - everything rounded-2xl.
- **Liquid glass (added 2026-11-11):** the top navigation and floating controls use Apple-style liquid glass, with refraction, a rim highlight and a frosted fallback. Glass sits over a soft green-and-blue photo so it has something to refract. Money figures and tables always stay on solid surfaces.

## Evidence on Hand

None yet: no real partner organizations, audit results, financial data, donor counts, testimonials, or press.

Future work must use clearly labeled placeholder data and must not present invented charities, figures, or endorsements as real.

## Product Principles

1. **Transparency is the product.** Every claim about a charity should be traceable to its operations and funds. Never imply more verification than actually happened.
2. **Fit over fame.** Rank by how well a charity matches the donor, not by its size or name recognition. Smaller organizations should not be visually or structurally second-class.
3. **Trust is earned through vetting.** Make partner status and what the audits checked legible, and keep audited facts visibly separate from self-reported ones.
4. **Engagement serves giving, not vanity.** Badges, streaks, and leaderboards should encourage steady, considered giving, never pressure or shame.
5. **Serve both sides.** Donors and nonprofits are both primary users. A gain for one should not come at the cost of the other's dignity or effort.
