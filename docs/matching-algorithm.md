# ClearCause — Donor–Charity Matching Algorithm

**Status:** Design / research notes (Phase 1)
**Owners:** Shaheer, Ali
**Related:** [`ERD.md`](./ERD.md), [`../schema.txt`](../schema.txt), migration `0001`

---

## 1. Goal

Given a donor, produce a **ranked list of charities** that best fit their values
and giving preferences — so donors don't have to search directories, and small
vetted charities get surfaced on merit instead of brand recognition.

This is a **recommendation / ranking** problem. For the MVP we deliberately use a
**content-based** approach (match on attributes we already know) rather than
collaborative filtering (match on what similar donors gave to), because at launch
we have **no donation history** — the classic *cold-start* problem.

---

## 2. What we have to work with

**Donor signals** (from the onboarding quiz — `donor_preferences` +
`donor_cause_preferences`):

| Signal | Column | Use |
|---|---|---|
| Weighted causes | `donor_cause_preferences(cause_id, weight 1–5)` | Primary match signal |
| Typical donation size | `donor_preferences.giving_budget` | Context, light signal |
| Frequency | `donor_preferences.frequency` | Context |
| Geographic scope | `donor_preferences.location_scope` (local/national/global) | **Hard filter** |
| Min % to charity | `donor_preferences.direct_pct_min` | **Hard filter** on efficiency |

**Charity signals** (admin-curated + scraper-fed):

| Signal | Column | Use |
|---|---|---|
| Causes it works on | `charity_causes(cause_id)` | Primary match signal |
| Location | `charities.location_city/region/country` | Scope filter |
| Transparency | `charities.transparency_score` (0–100) | Quality boost |
| Efficiency | `charity_financials.program_expense_ratio` | Efficiency filter/boost |
| Vetted partner | `charities.is_partner` | Small tie-breaker boost |
| Vetting status | `charities.vetting_status` | **Only `vetted` are eligible** |

---

## 3. Approaches considered

### a. Content-based filtering — chosen for MVP
Represent each donor and each charity as a **vector over causes**, then measure
similarity. Works from day one with zero interaction history, is explainable
("matched because you care about climate & education"), and maps cleanly onto our
tables. This is the backbone of the MVP.

### b. Collaborative filtering — later
"Donors like you also gave to X." Powerful, but needs a **donation history**
(`donations` table filling up) and suffers cold-start for new donors *and* new
charities. Revisit once we have meaningful donation volume.

### c. Hybrid / learning-to-rank — future
Combine content + collaborative signals, or train a model (e.g. gradient-boosted
ranker) on actual click/donation outcomes to *learn* the weights we hand-tune
below. This is the long-term target (ties into Phase 4, "enhanced ranking").

**Decision:** ship **content-based** now; keep the scoring modular so collaborative
and learned signals can be added as extra terms later.

---

## 4. Proposed MVP algorithm

A two-stage pipeline: **filter → score → rank**.

### Stage 1 — Hard filters (eligibility)
Drop charities the donor would never want *before* scoring:

1. `vetting_status = 'vetted'` (enforced anyway by RLS)
2. **Location scope**: if donor is `local`, restrict to their city/region; `national`
   → same country; `global` → no geo filter.
3. **Efficiency floor**: charity's latest `program_expense_ratio * 100 >=
   donor.direct_pct_min` (if the donor set one).

### Stage 2 — Composite relevance score (0–1)

```
score = w_cause   * cause_alignment
      + w_trans   * transparency_norm
      + w_effic   * efficiency_norm
      + w_partner * is_partner_flag
```

Starting weights (hand-tuned; sum = 1.0):

| Term | Weight | Why |
|---|---|---|
| `cause_alignment` | **0.60** | Values match is the whole point |
| `transparency_norm` | 0.20 | Core to our trust promise |
| `efficiency_norm` | 0.15 | Rewards charities that spend on programs |
| `is_partner_flag` | 0.05 | Light nudge for vetted partners |

**Term definitions**

- **`cause_alignment`** — cosine similarity between the donor's weighted-cause
  vector and the charity's cause vector.
  - Donor vector `d`: component for each cause = that cause's `weight` (0 if not chosen).
  - Charity vector `c`: 1 for each cause it's tagged with, else 0.
  - `cause_alignment = (d · c) / (‖d‖ · ‖c‖)` → range 0..1.
  - Cosine (not raw overlap) so a donor who picked many causes isn't unfairly
    boosted, and a charity tagged with many causes isn't either.
- **`transparency_norm`** = `transparency_score / 100`.
- **`efficiency_norm`** = `program_expense_ratio` (already 0..1); fall back to a
  neutral 0.5 if we have no financials yet (don't punish un-scraped charities).
- **`is_partner_flag`** = 1 if `is_partner`, else 0.

### Worked example

Donor weights: `climate=5`, `education=3`, `poverty=1`.
Charity A tagged `climate, education`; `transparency_score=80`;
`program_expense_ratio=0.90`; `is_partner=true`.

- `d = [5,3,1]` over (climate, education, poverty); `c = [1,1,0]`
- `d · c = 5+3+0 = 8`; `‖d‖ = √35 ≈ 5.92`; `‖c‖ = √2 ≈ 1.41`
- `cause_alignment = 8 / (5.92·1.41) ≈ 0.96`
- `score = 0.60·0.96 + 0.20·0.80 + 0.15·0.90 + 0.05·1 = 0.576 + 0.16 + 0.135 + 0.05 = 0.92`

A near-perfect match → ranks at the top.

---

## 5. Implementation notes

**MVP can run entirely in Postgres** — no ML service needed. The cause vectors are
small (one dimension per cause, ~8 to start), so cosine similarity is a cheap
aggregate over the two join tables. Sketch:

```sql
-- Cause alignment per charity for a given donor
with donor as (
  select cause_id, weight::float from donor_cause_preferences where profile_id = :donor
),
dnorm as (select sqrt(sum(weight*weight)) n from donor)
select c.id, c.name,
       coalesce(sum(d.weight) /
         (nullif((select n from dnorm),0) *
          nullif(sqrt(count(cc.cause_id) over (partition by c.id)),0)), 0) as cause_alignment
from charities c
join charity_causes cc on cc.charity_id = c.id
left join donor d on d.cause_id = cc.cause_id
where c.vetting_status = 'vetted'
group by c.id, c.name, cc.cause_id;  -- (illustrative; real query tidies the window)
```

Then combine with the other normalized terms in an outer query and `order by score desc`.

**Scaling path:** if the cause set grows large or we add free-text/semantic
matching (charity descriptions, donor-written interests), move to **`pgvector`** —
store an embedding per charity and per donor and do approximate nearest-neighbor
search. Supabase supports the `vector` extension natively. Not needed for MVP.

**Where it runs:** a Postgres function / view, or a thin Node endpoint that issues
the query. Precompute nothing for MVP; the result set per donor is small.

---

## 6. Cold start & edge cases

- **New donor, no quiz yet** → can't match; prompt them to finish onboarding. Until
  then, fall back to a generic "top vetted & transparent charities" list
  (sort by `transparency_score`, then `is_partner`).
- **Charity with no financials scraped** → use neutral efficiency (0.5) so it isn't
  buried before Ali's scraper has reached it.
- **Donor picks 0 causes** → treat as "no preference"; rank by transparency only.
- **Ties** → break by `transparency_score`, then `is_partner`, then recency.

---

## 7. Measuring success

Offline (before launch): sanity-check that hand-picked donor profiles surface
sensible charities; eyeball ranking quality.

Online (once live): the real signals of a good matcher —
- **Click-through rate** on recommended charities
- **Donation conversion** from a recommendation
- **Diversity / coverage** — are small charities actually getting surfaced, not just
  the same few? (This is a core product goal, so track it explicitly.)

These outcomes become the **training labels** for a learned ranker later.

---

## 8. Roadmap

| Phase | Matching capability |
|---|---|
| **1 (MVP)** | Content-based: weighted cause cosine + transparency + efficiency, hard geo/efficiency filters, all in Postgres |
| 2 | Add semantic matching (pgvector on descriptions/interests); richer location handling |
| 3 | Introduce collaborative signals once donation history exists; gamification feeds engagement data |
| 4 | Learning-to-rank — learn the weights from click/donation outcomes (ties to "enhanced ranking algorithm") |

---

## 9. Open questions

- Where do the hand-tuned weights (0.60 / 0.20 / 0.15 / 0.05) get stored — constants
  in code, or a small config table so we can tune without a deploy?
- Should `giving_budget` / `frequency` influence ranking at all in MVP, or stay
  purely contextual? (Leaning: contextual only for now.)
- How does the **ranking algorithm** (Eeshan's `transparency_score`) interface here —
  is transparency purely an input to matching, or a separately surfaced number?
  Worth aligning so we don't double-count it.
- Do we cap how many results we return, and do we inject some diversity so the list
  isn't all big charities?
