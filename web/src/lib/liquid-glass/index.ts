import { useEffect } from "react"

import "./refraction.js"

/** Re-scan the page for [data-refract] glass once React has rendered it. */
export function useLiquidGlass() {
  useEffect(() => {
    const refresh = () => window.LiquidGlassRefraction?.refresh()
    refresh()
    const t = window.setTimeout(refresh, 400)
    return () => window.clearTimeout(t)
  }, [])
}
