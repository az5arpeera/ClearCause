import { ArrowLeft } from "lucide-react"

import { Logo } from "@/components/Logo"
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
    <div className="flex min-h-svh flex-col bg-paper text-ink">
      <header className="bg-forest-deep text-paper">
        <div className="mx-auto flex h-16 max-w-[76rem] items-center px-4 sm:px-6 lg:px-10">
          <Logo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[76rem] flex-1 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="max-w-[40rem] border-t-2 border-forest pt-5">
          <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.02em] text-balance">{title}</h1>
          <p className="mt-3 font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{body}</p>
          <a
            href="/"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-[2px] bg-forest px-5 text-[0.9375rem] font-semibold text-paper no-underline hover:bg-forest-deep"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to Clear Cause
          </a>
        </div>
      </main>
    </div>
  )
}
