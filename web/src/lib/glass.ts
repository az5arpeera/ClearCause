/**
 * Liquid glass, shared by every page so the functional layer looks the same
 * everywhere: paper-glass chips and panels for things you press, filter or
 * navigate with. Money, statements and tables never go on glass.
 */
export const glassChip =
  "lg lg-paper inline-flex min-h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-sm font-semibold no-underline [&.lg-selected]:text-paper transition-[filter,scale] hover:brightness-[1.04] active:scale-[0.97]"
export const glassPanel = "lg lg-paper rounded-[12px]"
/** Data attributes that let refraction.js bend the page backdrop at the rim. */
export const refract = { "data-refract": "0.9", "data-refract-source": "#page-backdrop" } as const

/**
 * The one solid action per view (submit, give, go): forest, 12px like the
 * glass so the two layers read as one family.
 */
export const solidButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-forest px-5 text-sm font-semibold text-paper no-underline transition-[background-color,scale] hover:bg-forest-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
