import { useEffect, useRef, useState } from "react"
import { LogOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

/**
 * Account control for the forest-deep page headers.
 * Logged out → a compact "Sign in" link.
 * Logged in  → an avatar button that opens a dropdown with the name + "Sign out",
 *              so the header stays uncluttered.
 */
export function AuthControl({ className }: { className?: string }) {
  const { user, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  // Hold the avatar's footprint so the header doesn't shift when the session loads.
  if (loading) return <span className={cn("inline-block size-8", className)} aria-hidden />

  if (!user) {
    return (
      <a
        href="/signin"
        className={cn("text-sm font-semibold text-paper/80 no-underline hover:text-paper", className)}
      >
        Sign in
      </a>
    )
  }

  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Account"
  const initial = name.trim()[0]?.toUpperCase() ?? "?"

  async function onSignOut() {
    await signOut()
    window.location.assign("/")
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid size-8 place-items-center rounded-full border border-paper/40 bg-paper/10 text-sm font-semibold text-paper transition-colors hover:bg-paper/20"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-ink/10 bg-paper text-ink shadow-lg"
        >
          <div className="border-b border-rule px-3 py-2.5">
            <p className="truncate text-sm font-semibold" title={name}>
              {name}
            </p>
            {user.email && name !== user.email && (
              <p className="truncate text-xs text-ink-2" title={user.email}>
                {user.email}
              </p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-ink/5"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
