---
name: Clear Cause
description: Matching and transparency for charitable giving, set like an audited statement of funds.
colors:
  paper: "oklch(0.972 0.013 84)"
  paper-sunk: "oklch(0.944 0.018 84)"
  rule: "oklch(0.85 0.02 84)"
  input-stroke: "oklch(0.72 0.025 84)"
  ink: "oklch(0.255 0.055 258)"
  ink-2: "oklch(0.41 0.045 258)"
  ink-3: "oklch(0.5 0.035 258)"
  forest: "oklch(0.375 0.078 157)"
  forest-deep: "oklch(0.3 0.064 158)"
  forest-soft: "oklch(0.915 0.035 150)"
  money: "oklch(0.83 0.165 146)"
  admin: "oklch(0.47 0.05 258)"
  fundraising: "oklch(0.74 0.035 258)"
  error: "oklch(0.52 0.17 30)"
typography:
  display:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  subtitle:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\", \"lnum\""
  label:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "1px"
  md: "2px"
spacing:
  gutter-sm: "16px"
  gutter-md: "24px"
  gutter-lg: "40px"
  opener-to-content: "32px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
    typography: "{typography.data}"
  button-primary-hover:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.paper}"
  button-choice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
  button-choice-selected:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  masthead:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.paper}"
    height: "56px"
  composer:
    backgroundColor: "{colors.paper-sunk}"
    textColor: "{colors.ink}"
    padding: "16px 20px 20px"
---

# Design System: Clear Cause

## Overview

**Creative North Star: "The Statement of Funds"**

Clear Cause reads like a well-made annual report or a good bank statement, not a startup landing page. Every surface is a document with a forest-green frame around it. Inside, ink-navy figures sit on warm paper in ruled rows, with totals double-underlined the way accountants close a column. Numbers are the hero. Prose explains them, and decoration never stands in for them.

The world owns the frame: the forest masthead and colophon, the forest rule that opens each section, and the ruled tables. The reading column stays calm: a book serif at a real measure, high contrast, and nothing moving behind it. Color is restrained (paper, ink, forest), with one exception that carries meaning: a bright green highlighter marks money that reached programs, and is used for nothing else.

The user rejected these, and they stay rejected: purple, gradients, glassmorphism, glowing shadows, emoji as icons, a centered hero with a big headline and two buttons, rows of three identical rounded cards, stock "AI" illustrations, Inter as the only font, and everything rounded-2xl.

**Key Characteristics:**
- Warm paper ground, ink-navy type and figures, and forest green as the structural color.
- Hairline-ruled tables with right-aligned tabular figures and double-ruled totals.
- One bright green, used only as a highlighter behind money that reached programs.
- A grotesk for statements and figures, and a book serif for prose.
- Square corners, flat print, no shadows.

## Colors

A restrained print palette: tinted paper and ink, a forest green that carries structure, and one bright green that carries meaning.

### Primary
- **Ledger Forest** (forest): Section-opening rules, the primary button, selected choices, focus rings, and links. It signals structure and action, never decoration.
- **Deep Ledger Forest** (forest-deep): The masthead and colophon bands that frame every page, and the hover state of the primary button.
- **Forest Wash** (forest-soft): Reserved accent surface for forest-tinted states (shadcn's `accent` role). Rarely used.

### Secondary
- **Money-Went-Here Green** (money): The highlighter. It sits as a band behind figures for money that reached programs: the lead's cents figure, the Programs row of a statement, program spending, a ledger's total, and the program lines of a gift split. It also fills the program cells of the dollar strip. Text over it is always ink.

### Neutral
- **Annual-Report Paper** (paper): The page ground and input fields. Uncoated, warm, low chroma.
- **Sunk Paper** (paper-sunk): Inset surfaces such as the sample-data notice and the gift composer.
- **Hairline** (rule): Table row rules and quiet dividers.
- **Field Stroke** (input-stroke): Borders on inputs and unselected choice buttons.
- **Statement Ink** (ink): Headings, figures, and primary text. Also the heavy rule under a table's column heads.
- **Secondary Ink** (ink-2): Supporting text, deks, column heads, and row labels.
- **Tertiary Ink** (ink-3): Separators, placeholders, and self-reported markers.
- **Admin Slate** (admin) / **Fundraising Slate** (fundraising): The overhead shares in the dollar strip and its legend. Ink-family tones, so overhead never reads as "money went here".
- **Correction Red** (error): Validation errors on inputs, and nothing else.

### Named Rules
**The One Highlighter Rule.** The bright green marks only money that reached programs. Never use it for navigation, selection, success states, badges, or decoration. Ask of every bright-green pixel: did money go here?

**The Focal Figure Rule.** A highlighter loses its meaning when everything is highlighted. Mark totals and program lines, not every row in a ledger.

## Typography

**Display Font:** Libre Franklin (with Franklin Gothic Medium, Arial Narrow, sans-serif)
**Body Font:** Source Serif 4 (with Georgia, serif)

**Character:** Franklin Gothic is the voice of financial reports and newspaper tables: sturdy, plain-spoken, with good figures. Source Serif is a calm text face for the explanation around the numbers. Both are self-hosted through Fontsource.

### Hierarchy
- **Display** (700, 2.75rem; 2.125rem on mobile; line-height 1.05; tracking -0.025em): The organization or page name. One per page.
- **Headline** (600, 2.125rem; 1.625rem on mobile; line-height 1.2): The lead statement, a full sentence with its key figure highlighted inline.
- **Title** (700, 1.5rem, line-height 1.25): Section headings, each sitting under a 2px forest rule.
- **Subtitle** (700, 1.125rem): Table captions and sub-section heads ("Came in", "Recent payments", a program's name).
- **Body** (Source Serif 4, 400, 1.0625rem, line-height 1.6, max 60–62ch): Section deks, mission text, and program descriptions.
- **Data** (Libre Franklin, 400–600, 0.9375rem, tabular lining figures): Every table, figure, and control.
- **Label** (500, 0.8125rem): Column heads, notices, and fine print.

### Named Rules
**The Tabular Figures Rule.** Every number that could sit in a column uses tabular lining figures (`.figures`), so columns align and amounts can be compared at a glance.

**The Sentence Lead Rule.** The key number is set inside a sentence ("Of every $1.00… 84¢ went to programs"), never as a giant isolated figure above a small label.

## Layout

There is one centered column at most 76rem wide, with side gutters of 16px (mobile), 24px (sm) and 40px (lg). On large screens the document column runs beside a 21rem sticky right rail, which holds the primary action. Columns are separated by 48–64px. Below lg the rail falls into the flow right after the lead section, so the action stays near the top.

Sections are spaced 80px apart. Each opens with a 2px forest rule, a title, and an optional serif dek, then 32px to its content. Statements pair into two columns from md upward and stack below that. Tables stay real tables at every width. On mobile, secondary columns fold under the primary cell rather than scrolling sideways.

On-page contents sit in a single ruled row under the page header, scrolling horizontally on narrow screens.

## Elevation & Depth

This system is flat. There are no shadows anywhere. Depth comes from print devices: tonal insets (sunk paper for the composer and notices), rule weight (hairline rows, ink column-head rules, 2px forest section rules), and the forest bands that frame the page.

### Named Rules
**The Flat Print Rule.** If it would not survive being printed on uncoated stock, it does not belong: no shadows, glows, blur, or glass.

## Shapes

Corners are square or nearly square: 2px on buttons, inputs, and inset panels, and none on rules or strip cells. The only round shape is the account initial in the masthead. Borders are 1px hairlines, with two exceptions: 2px forest rules open sections and frame the composer, and a 3px double rule underlines totals. Dashed rules mark self-reported, unaudited information, so the line style itself carries meaning.

## Components

### Buttons
Plain, firm and squared, like a form you sign.
- **Shape:** Nearly square corners (2px).
- **Primary:** Forest fill with paper text, semibold 0.9375rem, 44px tall. Full width inside the composer.
- **Hover / Focus:** Hover deepens the fill to forest-deep. Focus shows a 2px forest outline offset by 2px.
- **Choice (amount presets):** Paper fill, field-stroke border, ink figures, 40px tall. Selected switches to a forest fill with paper text and sets `aria-pressed`. Hover turns the border forest.
- **Frame link (colophon):** Paper-outlined on forest. Hover inverts it to a paper fill with forest text.

### Inputs / Fields
- **Style:** Paper fill, 1px field-stroke border, 2px corners, 40px tall, with tabular figures and an ink-3 currency prefix.
- **Focus:** 2px forest outline on the field wrapper, with a forest caret.
- **Error:** Correction-red border plus a plain-language message below that names the fix ("Enter an amount of $1 or more."). The primary button is disabled while an error stands.

### Navigation
- **Masthead:** A 56px forest-deep band with the wordmark and primary links in paper at 80% opacity. The current page gets full paper and a 2px paper underline (never the money green). On mobile the links drop to a second 44px row inside the band.
- **Breadcrumb:** Ink-2 text, with the parent link underlined in hairline color.
- **On-page contents:** A ruled row of section links. Hover turns them forest and underlined.

### Statement Table (signature)
Two ruled columns of label and right-aligned figure, with a subtitle caption and a total row set semibold over a double rule. The Programs line carries the highlighter.

### Ledger (signature)
Date, payee (with its purpose as a second line), program, and amount, under an ink rule. Rows are separated by hairlines. Only the total carries the highlighter.

### Dollar Strip (signature)
One dollar drawn as 100 square cents: 50×2 on desktop, 20×5 on mobile, with 3px gaps. Program cents are money green, admin cents admin slate, fundraising cents fundraising slate. A legend table below gives each share in cents and dollars. It carries a full text description for assistive technology.

### Audited vs. Reported
Audited facts sit under a solid ink rule with a check icon. Self-reported counts sit under dashed rules with a dashed-circle icon. Any figure derived from a reported count carries the dashed-circle marker wherever it appears.

### Gift Composer (signature)
A sunk-paper panel under a 2px forest rule, holding the presets, a custom amount, and a live split table. When the amount changes, each program figure replays a highlighter sweep that grows the green band left to right over 520ms on an exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`). The sweep is disabled under reduced motion. Admin and fundraising figures update without a sweep.

## Do's and Don'ts

### Do:
- **Do** set every figure in tabular lining figures and right-align it in its column.
- **Do** open each section with the 2px forest rule and a plain heading. Let the heading speak without a label above it.
- **Do** close every column of money with a double-ruled total.
- **Do** keep audited facts and self-reported counts visibly separate, solid against dashed, everywhere they appear.
- **Do** label sample or illustrative data plainly, above the fold.
- **Do** theme the browser surfaces: money-green text selection, forest focus rings and caret, paper-toned scrollbars.

### Don't:
- **Don't** use the money green for anything except money that reached programs: not nav states, success, badges, or selection controls.
- **Don't** use purple, gradients, glassmorphism, or glowing shadows.
- **Don't** use emoji as icons. Icons come from Lucide at a consistent 1.75–2.5 stroke.
- **Don't** build a centered hero with a big headline and two buttons, or rows of three identical rounded cards.
- **Don't** use stock "AI" illustrations.
- **Don't** set Inter as the only font, or round everything to 2xl. Corners stay at 2px.
- **Don't** put a big isolated number over a small label. Put the figure inside a sentence or a table.
