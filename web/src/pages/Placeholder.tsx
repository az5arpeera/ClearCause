import { ArrowLeft } from "lucide-react"

import { PageBackdrop } from "@/components/Glass"
import { SiteHeader } from "@/components/SiteHeader"
import { SiteFooter } from "@/components/SiteFooter"
import { cn } from "@/lib/utils"
import { solidButton } from "@/lib/glass"
type Kind = "partners" | "missing"

const copy: Record<Kind, { title: string; body: string }> = {
  partners: {
    title: "Partner applications aren't open yet",
    body: "This is a design prototype. When applications open, small nonprofits will start here: apply, pass an independent audit, and get listed free.",
  },
  missing: {
    title: "There's nothing at this address",
    body: "The page may have moved, or the link may be mistyped.",
  },
}

export default function Placeholder({ kind }: { kind: Kind }) {
  const { title, body } = copy[kind]

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-paper text-ink">
      <PageBackdrop size="full" />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[76rem] flex-1 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="max-w-[40rem] lg lg-paper rounded-[12px] p-6 sm:p-8" data-refract="0.4" data-refract-source="#page-backdrop">
          <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.02em] text-balance">{title}</h1>
          <p className="mt-3 font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{body}</p>
          <a
            href="/"
            className={cn(solidButton, "mt-8")}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to Clear Cause
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
