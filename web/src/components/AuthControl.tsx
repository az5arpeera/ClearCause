import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

/**
 * Sign-in / sign-out control for the forest-deep page headers (paper text).
 * Logged out → a "Sign in" link. Logged in → the account name + "Sign out".
 */
export function AuthControl({ className }: { className?: string }) {
  const { user, loading, signOut } = useAuth()

  // Don't flash "Sign in" before the session has been read.
  if (loading) return <span className={cn("inline-block", className)} aria-hidden />

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

  const label =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Account"

  async function onSignOut() {
    await signOut()
    window.location.assign("/")
  }

  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <span className="hidden max-w-[12rem] truncate text-paper/70 sm:inline" title={label}>
        {label}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center rounded-[2px] border border-paper/25 px-3 py-1 font-semibold text-paper/90 hover:border-paper hover:text-paper"
      >
        Sign out
      </button>
    </div>
  )
}
