import { useState } from "react"

import { cn } from "@/lib/utils"

/** A round profile photo, or the first letter of the name when there isn't one. */
export function Avatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null)
  const initial = name.trim()[0]?.toUpperCase() ?? "?"
  return url && broken !== url ? (
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(url)}
      className={cn("rounded-full object-cover", className)}
    />
  ) : (
    <span aria-hidden className={cn("grid place-items-center rounded-full bg-forest font-semibold text-paper", className)}>
      {initial}
    </span>
  )
}
