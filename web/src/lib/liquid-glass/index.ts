import { useEffect } from "react"

import "./refraction.js"

/**
 * Re-scan the page for [data-refract] glass once React has rendered it. Pass
 * a value that changes when new glass appears (e.g. loaded data) to re-scan.
 */
export function useLiquidGlass(key?: unknown) {
  useEffect(() => {
    const refresh = () => window.LiquidGlassRefraction?.refresh()
    refresh()
    const t = window.setTimeout(refresh, 400)
    return () => window.clearTimeout(t)
  }, [key])
}
