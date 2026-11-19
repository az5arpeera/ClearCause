import { useEffect, useRef, useState } from "react"
import { ClipboardCheck, LogOut, UserRound } from "lucide-react"

import { Avatar } from "@/components/Avatar"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { fetchIsAdmin } from "@/lib/db"
import { displayNameFor, useProfile } from "@/lib/profile"

/**
 * Account control for the forest-deep page headers.
 * Logged out → a compact "Sign in" link.
 * Logged in  → an avatar button that opens a dropdown with the name + "Sign out",
 *              so the header stays uncluttered.
 */
export function AuthControl({ className }: { className?: string }) {
  const { user, loading, signOut } = useAuth()
  const profile = useProfile(user)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!user) return
    let active = true
    fetchIsAdmin(user.id).then((ok) => active && setIsAdmin(ok))
    return () => {
      active = false
    }
  }, [user])
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
        className={cn("nav-bubble", className)}
      >
        Sign in
      </a>
    )
  }

  const name = profile ? displayNameFor(user, profile) : (user.email ?? "Account")

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
        className="grid size-9 place-items-center rounded-full ring-1 ring-paper/50 transition-[box-shadow] hover:ring-2 hover:ring-paper/80"
      >
        <Avatar name={name} url={profile?.avatarUrl ?? null} className="size-8 bg-paper/15 text-sm" />
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
          <a
            href="/profile"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-ink no-underline hover:bg-ink/5"
          >
            <UserRound className="size-4" aria-hidden />
            Your profile
          </a>
          {isAdmin ? (
            <a
              href="/admin/review"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-ink no-underline hover:bg-ink/5"
            >
              <ClipboardCheck className="size-4" aria-hidden />
              Review charities
            </a>
          ) : null}
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
