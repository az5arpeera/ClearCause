export {}

declare global {
  interface Window {
    /** Set by refraction.js: re-scans [data-refract] elements and applies the bend. */
    LiquidGlassRefraction?: {
      refresh: () => void
      supported: () => boolean
      modeOf: (el: Element) => "backdrop" | "mirror" | null
    }
  }
}
