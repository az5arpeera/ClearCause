import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

/**
 * Placeholders shaped like the content they stand in for, so the page keeps
 * its layout while data loads and nothing jumps when it arrives. The pulse
 * stops for people who ask for reduced motion.
 */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden style={style} className={cn("block rounded-[4px] bg-ink/[0.07] motion-safe:animate-pulse", className)} />
}

/** Stand-ins for CharityRow, same height and rhythm. */
export function CharityRowSkeleton({ count = 3, label = "Loading charities" }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <ul aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="border-b border-rule py-6">
            <div className="flex items-start justify-between gap-4">
              <Bone className="h-6 w-56 max-w-[60%]" />
              <Bone className="h-7 w-16" />
            </div>
            <Bone className="mt-2 h-4 w-72 max-w-[80%]" />
            <Bone className="mt-3 h-4 w-[34rem] max-w-full" />
            <Bone className="mt-2 h-4 w-80 max-w-[70%]" />
            <div className="mt-4 flex items-center gap-6">
              <Bone className="h-3 w-56" />
              <Bone className="h-4 w-28" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A label/value list placeholder (answers panels). */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="mt-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 border-b border-ink/10 py-2.5">
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}
