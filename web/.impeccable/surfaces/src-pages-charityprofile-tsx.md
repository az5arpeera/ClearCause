---
version: 1
slug: "src-pages-charityprofile-tsx"
primary_target: "src/pages/CharityProfile.tsx"
related_targets: ["src/App.tsx"]
---

# Charity profile

Mode: Read. A donor is deciding whether to give to a charity in their matches. Their question: can I trust this organization, and where would my money go? The page ends in a gift action.

Content: one sample charity, Northside Community Pantry, a fictional small food bank in a fictional town (Harlow, Ohio). Every figure is illustrative, and the page says so above the fold. Sections: where the money went (statement and disbursement ledger), audit and partner status (audited facts separate from self-reported ones), why it matched this donor, programs and outcomes.

Constraints: the binding visual direction in PRODUCT.md. Gift mechanics, payments and the matching algorithm are undecided, so the composer is illustrative and claims no earmarking.

## Direction contract

THESIS: The profile is a statement of funds, not a pitch. It refuses the category default of a beneficiary photo, a "Donate now" hero and three impact cards.

OWN-WORLD: Warm paper ground. A forest-green masthead band, with forest rules closing each statement. Ink-navy type and figures, hairline-ruled ledger rows, right-aligned tabular figures, and square corners (2px at most). Bright green appears only as a highlighter mark behind money that reached programs. Libre Franklin sets the statement and figures; Source Serif 4 sets the prose.

STORY: The donor sees how each dollar divided, what an auditor checked and what the charity only reports, why it matched their values, and what each program buys. Then they size a gift and see it split the same way.

FIRST VIEWPORT: Masthead, then a sample-data notice. The charity name at about 44px, with its partner/audit status across from it. Lead sentence: "Of every $1.00 spent in fiscal 2025, 84¢ went to programs", with 84¢ highlighted. Below it, the dollar strip: 100 cent cells, 84 in bright green. The gift composer (the primary action) sits in a sticky right rail.

FORM: Annual-report statement of funds, pinned by the user's visual direction. seed: none (roll skipped: direction pinned by the user)

Signature interaction: changing the gift amount recomputes the split live, and each changed program figure gets a highlighter sweep. Admin and fundraising figures update without one, so bright green stays on program money.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
