/**
 * Liquid glass, shared by every page so the functional layer looks the same
 * everywhere: paper-glass chips and panels for things you press, filter or
 * navigate with. Money, statements and tables never go on glass.
 */
export const glassChip =
  "lg lg-paper inline-flex min-h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-sm font-semibold no-underline [&.lg-selected]:text-paper transition-[filter,scale] duration-150 ease-(--ease-out) hover:brightness-[1.04] active:scale-[0.97]"
export const glassPanel = "lg lg-paper rounded-[12px]"
/** Data attributes that let refraction.js bend the page backdrop at the rim. */
export const refract = { "data-refract": "0.9", "data-refract-source": "#page-backdrop" } as const

/**
 * The one solid action per view (submit, give, go): forest, 12px like the
 * glass so the two layers read as one family.
 */
export const solidButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-forest px-5 text-sm font-semibold text-paper no-underline transition-[background-color,scale] duration-150 ease-(--ease-out) hover:bg-forest-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"

/**
 * "Pick one" buttons on solid surfaces (cause picker, gift amounts). Same
 * 12px shape and press feel as the glass chips; selected turns solid forest.
 * Use with `choiceOn` / `choiceOff`.
 */
export const choiceButton =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[12px] border px-3.5 text-sm font-semibold no-underline transition-[background-color,border-color,color,scale] duration-150 ease-(--ease-out) active:scale-[0.97]"
export const choiceOn = "border-forest bg-forest text-paper"
export const choiceOff = "border-input bg-paper text-ink hover:border-forest hover:text-forest-deep"

/** Every text input, select and textarea: one shape everywhere. */
export const fieldInput =
  "block min-h-11 w-full rounded-[12px] border border-input bg-paper px-3 text-sm transition-[border-color] duration-150 ease-(--ease-out) placeholder:text-ink-3 hover:border-ink/40"

/** Content that replaces a loading placeholder fades in instead of popping. */
export const enterFade = "transition-opacity duration-200 ease-(--ease-out) starting:opacity-0"
