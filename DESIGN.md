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
  caption:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1
  control:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.3
  wordmark:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  marketing-hero:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "4rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.032em"
  marketing-hero-tablet:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.032em"
  marketing-hero-mobile:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.032em"
  marketing-close:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  marketing-section:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  marketing-section-mobile:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  counter:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\", \"lnum\""
  counter-mobile:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  pull-quote:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "1.625rem"
    fontWeight: 400
    lineHeight: 1.45
  pull-quote-mobile:
    fontFamily: "Source Serif 4 Variable, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.45
  entry-title:
    fontFamily: "Libre Franklin Variable, Franklin Gothic Medium, Arial Narrow, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
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
  logo-wordmark:
    textColor: "{colors.paper}"
    typography: "{typography.wordmark}"
  band-forest:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.paper}"
  band-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  band-soft:
    backgroundColor: "{colors.forest-soft}"
    textColor: "{colors.ink}"
  cause-tile-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.forest-deep}"
    rounded: "{rounded.md}"
  cause-tile:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
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

### Bands
Marketing pages carry color at page scale through full-width bands rather than accents. Each band is one existing token used as a ground:
- **Forest band** (forest-deep ground, paper text, secondary text at 80% paper): for the product's own mechanism, such as how matching works.
- **Ink band** (navy ground, paper text): for trust and verification, such as the audit explainer and the seal.
- **Soft band** (forest-soft ground, ink text): for quiet, personal moments, such as the streak strip.
- **Paper** stays the default ground. Bands alternate with paper, and two dark bands may sit back to back only when their topics belong together.

### Named Rules
**The Band Tone Rule.** A band never introduces a new hue. Forest-deep, ink and forest-soft are the only band grounds, and money green is never a ground.

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

### Marketing scale
Marketing pages (the landing page) step up from the product ramp, in the same faces:
- **Marketing hero** (700, 4rem desktop, 3.25rem tablet, 2.5rem mobile; line-height 1.02; tracking -0.032em): one promise per page, set left, never centered over buttons.
- **Marketing close** (700, 3rem; 2.25rem mobile): the final call to action's question.
- **Marketing section** (700, 2.25rem; 1.875rem mobile; tracking -0.025em): section headings on the trail.
- **Counter** (700, 2rem; 1.75rem mobile, tabular): sample or real platform totals, number above its label.
- **Pull quote** (Source Serif 4, 1.625rem; 1.375rem mobile): a plain-words explanation in curly quotes.
- **Entry title** (700, 1.25rem): an organization's name in a spotlight entry.
- **Control** (500, 0.875rem), **caption** (0.75rem) and **micro** (600, 0.625rem, the streak's month letters) round out the small end.

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

Corners are square or nearly square: 2px on buttons, inputs, inset panels and photos, and none on rules or strip cells. The only round shapes are the account initial in the masthead and the verified-partner seal, which is round because seals are. Trail stops are squares, never dots. Borders are 1px hairlines, with two exceptions: 2px forest rules open sections and frame the composer, and a 3px double rule underlines totals. Dashed rules mark self-reported, unaudited information, so the line style itself carries meaning.

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

### Logo
- **Mark:** a 32px paper square (2px corners) holding a squared "C" drawn as a 3.5px forest stroke: a stretch of the money trail, with a square stop at each end (forest-deep at the top, forest at the bottom).
- **Wordmark:** "Clear Cause" with a word space, extrabold 1.3125rem at -0.03em tracking. "Clear" is paper and "Cause" forest-soft, set on the forest-deep masthead and footer.
- **Behavior:** the mark tilts -3° on hover. The logo always links home and is labeled "Clear Cause home".
- **Don't:** run the words together, recolor the mark, or put the logo on paper without a forest-deep field behind it.

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

### Money Trail (signature, marketing pages)
- **The line:** a 2px line in a left track (12, 20 or 32px in from the content column at mobile, sm and lg) that runs continuously through every section of a marketing page, ending on a 26px square terminal stop at the final call.
- **Stops:** forest squares with a 3px ring in the band's own ground. A numbered stop marks a sequential step.
- **Ticks:** reach from the line to the content. Solid ticks lead to audited money. Dashed ticks lead to counts that are only reported.
- **Bands:** on forest and ink bands the line, stops and ticks turn paper. Each band supplies `--trail-c`, `--band`, `--stop-text`, `--dash-c` and `--sub`.
- **Motion:** the line draws downward with scroll, to a tip at 78% of the viewport height. It is fully drawn by default and under reduced motion.

### Cause Tiles
A photo (7:5) over a label strip, arranged 4 across on desktop and 2 on mobile. Unpicked tiles show a dimmed photo over a forest label. A picked tile shows a full-color photo with a paper outline and a paper label with a check.

### Photography
- **Source and credit:** real stock photos of work in the field, never illustrations. Each shipping photo records its source and credit in the data module, and the page credits it.
- **Honest captions:** a photo beside a named organization is captioned "Stock photo, not the organization" until real photos exist.
- **Shape:** corners are 2px. Aspect ratios vary on purpose (16:10, 4:5, square) so a row of entries never reads as identical cards.

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
- **Do** carry color at page scale on marketing pages with forest, ink and soft bands, alternating with paper.
- **Do** caption every stock photo, and say "not the organization" beside a named org.

### Don't:
- **Don't** use the money green for anything except money that reached programs: not nav states, success, badges, or selection controls.
- **Don't** use purple, gradients, glassmorphism, or glowing shadows.
- **Don't** use emoji as icons. Icons come from Lucide at a consistent 1.75–2.5 stroke.
- **Don't** build a centered hero with a big headline and two buttons, or rows of three identical rounded cards.
- **Don't** use stock "AI" illustrations.
- **Don't** set Inter as the only font, or round everything to 2xl. Corners stay at 2px.
- **Don't** put a big isolated number over a small label. Put the figure inside a sentence or a table.
