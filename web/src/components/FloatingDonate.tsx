import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The floating action: a forest liquid-glass control pinned bottom-right.
 * It steps aside while any `hideWhile` element is on screen (the page's own
 * form or call to action), and while it would sit over anything matching
 * `avoid`, so glass never covers a money figure (DESIGN.md, Solid Money Rule).
 */
export function FloatingDonate({
  href,
  label = "Donate",
  hideWhile,
  avoid = "[data-money]",
  ariaLabel,
  className,
}: {
  href: string
  label?: string
  hideWhile: string[]
  avoid?: string
  ariaLabel?: string
  className?: string
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [nearOwnAction, setNearOwnAction] = useState(true)
  const [overMoney, setOverMoney] = useState(false)

  useEffect(() => {
    const targets = hideWhile.map((sel) => document.querySelector(sel)).filter((el): el is Element => Boolean(el))
    if (targets.length === 0) {
      setNearOwnAction(false)
      return
    }
    const visible = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        }
        setNearOwnAction(visible.size > 0)
      },
      { threshold: 0.15 },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [hideWhile])

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const me = ref.current?.getBoundingClientRect()
      if (!me || me.width === 0) {
        setOverMoney(false)
        return
      }
      const pad = 8
      const hit = Array.from(document.querySelectorAll(avoid)).some((el) => {
        const r = el.getBoundingClientRect()
        return r.left < me.right + pad && r.right > me.left - pad && r.top < me.bottom + pad && r.bottom > me.top - pad
      })
      setOverMoney(hit)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [avoid])

  const hidden = nearOwnAction || overMoney
  return (
    <a
      ref={ref}
      href={href}
      data-hidden={hidden}
      data-refract="0.9"
      aria-label={ariaLabel}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={cn(
        "lg lg-forest lg-text lg-float fixed right-4 bottom-4 z-50 inline-flex h-14 items-center gap-2 rounded-[12px] pr-5 pl-6 text-base font-semibold no-underline hover:brightness-110 active:scale-[0.97] sm:right-6 sm:bottom-6",
        className,
      )}
    >
      {label}
      <ArrowRight className="size-[18px]" strokeWidth={2.25} aria-hidden />
    </a>
  )
}
