import type { ReactNode } from "react"

import { SiteHeader } from "@/components/SiteHeader"
import { photos, photoUrl } from "@/data/sample-landing"
import { cn } from "@/lib/utils"

/**
 * The soft green-and-blue photo the glass refracts, the same one as the
 * landing hero. `band` sits behind the header and page intro; `full` covers
 * the whole page for short form pages (quiz, sign in).
 */
export function PageBackdrop({ size = "band" }: { size?: "band" | "full" }) {
  const p = photos.backdrop
  return (
    <div
      id="page-backdrop"
      aria-hidden
      className={cn(
        "pointer-events-none overflow-hidden",
        size === "full" ? "fixed inset-0 -z-10" : "absolute inset-x-0 top-0 -z-10 h-[30rem] sm:h-[26rem]",
      )}
    >
      <img
        src={photoUrl(p.src, 2400, 1400)}
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover object-[30%_40%] blur-[7px] saturate-[0.85]"
      />
      <div className="absolute inset-0 bg-paper/[0.7]" />
      {size === "band" ? <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" /> : null}
    </div>
  )
}

/** Header + backdrop + page title and intro: the top of every app page. */
export function PageFrame({
  title,
  intro,
  backdrop = "band",
  width = "wide",
  children,
  below,
}: {
  title: ReactNode
  intro?: ReactNode
  backdrop?: "band" | "full"
  width?: "wide" | "narrow"
  /** Sits right under the intro, still over the photo (e.g. glass chips). */
  below?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-paper text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      <PageBackdrop size={backdrop} />
      <SiteHeader />
      <main
        id="main"
        className={cn("mx-auto px-4 pt-10 pb-24 sm:px-6 lg:px-10", width === "wide" ? "max-w-[76rem]" : "max-w-3xl")}
      >
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-[2.75rem]">{title}</h1>
        {intro ? <p className="mt-3 max-w-[62ch] font-serif text-lg text-ink-2">{intro}</p> : null}
        {below ? <div className="mt-6">{below}</div> : null}
        {children}
      </main>
    </div>
  )
}
