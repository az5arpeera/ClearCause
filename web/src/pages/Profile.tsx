import { useRef, useState, type FormEvent } from "react"
import { Camera, CreditCard, LockKeyhole, LogOut, PencilLine, Trash2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"

import { Avatar } from "@/components/Avatar"
import { PageFrame } from "@/components/Glass"
import { causes } from "@/data/causes"
import { stateName } from "@/data/us-states"
import { useAuth } from "@/lib/auth"
import { glassChip, glassPanel, solidButton } from "@/lib/glass"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { answerRows, useSavedPreferences, type SavedPreferences } from "@/lib/preferences"
import {
  AVATAR_MAX_BYTES,
  displayNameFor,
  removeAvatar,
  saveDisplayName,
  uploadAvatar,
  useProfile,
  type Profile as ProfileData,
} from "@/lib/profile"
import { cn } from "@/lib/utils"

const causeLabel = Object.fromEntries(causes.map((c) => [c.id, c.label])) as Record<string, string>
const sectionTitle = "text-lg font-bold tracking-tight"

/**
 * The donor's profile: photo and name, their quiz answers, and the saved
 * payment method (a placeholder until donations open; cards will live in
 * Stripe, never in our database).
 */
export default function Profile() {
  const { user, loading } = useAuth()
  const { prefs, ready } = useSavedPreferences(user, loading)
  const profile = useProfile(user)
  useLiquidGlass(`${Boolean(user)}-${ready}`)

  if (loading) {
    return (
      <PageFrame title="Your profile">
        <p className="mt-6 text-ink-2">One moment.</p>
      </PageFrame>
    )
  }

  return (
    <PageFrame
      title="Your profile"
      intro={user ? "Your photo and name, your giving answers, and how you'll pay." : "Sign in to keep a profile. Your quiz answers are already saved in this browser."}
    >
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {user && profile ? <AccountCard user={user} profile={profile} /> : <GuestCard />}
        <div className="grid gap-6">
          <AnswersCard prefs={ready ? prefs : null} loading={!ready} />
          <PaymentCard signedIn={Boolean(user)} />
        </div>
      </div>
    </PageFrame>
  )
}

/* ------------------------------------------------------------------ account */

function AccountCard({ user, profile }: { user: User; profile: ProfileData }) {
  const { signOut } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<"photo" | "name" | null>(null)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const name = displayNameFor(user, profile)

  const run = async (kind: "photo" | "name", task: () => Promise<void>, ok: string) => {
    setBusy(kind)
    setMessage(null)
    try {
      await task()
      setMessage({ kind: "ok", text: ok })
      return true
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong. Try again." })
      return false
    } finally {
      setBusy(null)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    await run("photo", () => uploadAvatar(user, profile, file), "Photo updated.")
    if (fileRef.current) fileRef.current.value = ""
  }

  const onName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get("name") ?? "")
    if (await run("name", () => saveDisplayName(user, profile, value), "Name saved.")) setEditing(false)
  }

  return (
    <section aria-labelledby="account-title" className={cn(glassPanel, "p-6")} data-refract="0.5">
      <h2 id="account-title" className="sr-only">Account</h2>
      <div className="flex items-center gap-4">
        <Avatar name={name} url={profile.avatarUrl} className="size-20 text-3xl ring-2 ring-paper" />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold tracking-tight" title={name}>{name}</p>
          {user.email && user.email !== name ? <p className="truncate text-sm text-ink-2" title={user.email}>{user.email}</p> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          id="avatar-file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <label htmlFor="avatar-file" className={cn(glassChip, "cursor-pointer", busy && "pointer-events-none opacity-60")}>
          <Camera className="size-4" aria-hidden />
          {busy === "photo" ? "Uploading…" : profile.avatarUrl ? "Change photo" : "Add a photo"}
        </label>
        {profile.avatarUrl ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("photo", () => removeAvatar(user, profile), "Photo removed.")}
            className={glassChip}
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-[0.8125rem] text-ink-3">PNG, JPEG or WebP, up to {AVATAR_MAX_BYTES / 1024 / 1024} MB.</p>

      <div className="mt-6 border-t border-ink/10 pt-5">
        {editing ? (
          <form onSubmit={onName}>
            <label htmlFor="display-name" className="text-sm font-semibold">Name shown on Clear Cause</label>
            <input
              id="display-name"
              name="name"
              defaultValue={profile.displayName ?? ""}
              maxLength={80}
              autoComplete="name"
              autoFocus
              className="mt-2 block min-h-11 w-full rounded-[12px] border border-input bg-paper px-3 text-sm"
            />
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={busy !== null} className={solidButton}>
                {busy === "name" ? "Saving…" : "Save name"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className={glassChip}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-ink-2">Name shown on Clear Cause</p>
              <p className="truncate font-medium">{profile.displayName || "Not set"}</p>
            </div>
            <button type="button" onClick={() => setEditing(true)} className={glassChip}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </button>
          </div>
        )}
      </div>

      <p role="status" aria-live="polite" className={cn("mt-4 min-h-5 text-sm", message?.kind === "error" ? "text-destructive" : "text-forest")}>
        {message?.text}
      </p>

      <button
        type="button"
        onClick={async () => {
          await signOut()
          window.location.assign("/")
        }}
        className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden />
        Sign out
      </button>
    </section>
  )
}

function GuestCard() {
  return (
    <section aria-labelledby="guest-title" className={cn(glassPanel, "p-6")} data-refract="0.5">
      <h2 id="guest-title" className={sectionTitle}>You're browsing as a guest</h2>
      <p className="mt-2 text-ink-2">
        Create an account to add a photo, keep your answers on every device, and save a card when donations open.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href="/signin" className={solidButton}>Sign in or create an account</a>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ answers */

function AnswersCard({ prefs, loading }: { prefs: SavedPreferences | null; loading: boolean }) {
  return (
    <section aria-labelledby="answers-title" className={cn(glassPanel, "p-6")} data-refract="0.4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="answers-title" className={sectionTitle}>Your giving answers</h2>
        {prefs ? (
          <a href="/quiz" className={glassChip}>
            <PencilLine className="size-4" aria-hidden />
            Edit answers
          </a>
        ) : null}
      </div>
      {loading ? (
        <p className="mt-3 text-ink-2">Loading your answers…</p>
      ) : prefs ? (
        <>
          <dl className="mt-3 grid text-sm sm:grid-cols-2 sm:gap-x-8">
            {answerRows(prefs, { cause: causeLabel, state: stateName }).map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-ink/10 py-2.5">
                <dt className="w-28 shrink-0 text-ink-2">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-ink-2">
            These rank your <a href="/for-you" className="font-semibold text-forest underline">For You</a> page. They never hide a charity.
          </p>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-ink-2">You haven't taken the quiz yet. It takes about a minute and ranks every charity for you.</p>
          <a href="/quiz" className={cn(solidButton, "mt-4")}>Take the quiz</a>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ payment */

/**
 * Placeholder until donations open. There is deliberately no card form here:
 * cards will be collected by Stripe's own fields and stored by Stripe.
 */
function PaymentCard({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="payment-title" className="rounded-[12px] border border-rule bg-paper-sunk p-6">
      <h2 id="payment-title" className={sectionTitle}>Payment method</h2>
      <div className="mt-4 flex items-center gap-4 rounded-[12px] border border-dashed border-ink/20 bg-paper px-4 py-4">
        <CreditCard className="size-6 shrink-0 text-ink-3" aria-hidden />
        <div>
          <p className="font-semibold">No card saved</p>
          <p className="text-sm text-ink-2">Saving a card opens when donations go live.</p>
        </div>
      </div>
      <p className="mt-4 flex gap-2 text-sm text-ink-2">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
        <span>
          Cards will be stored by Stripe, our payment processor. Clear Cause never sees or stores your card number.
        </span>
      </p>
      <button type="button" disabled className={cn(solidButton, "mt-5")}>
        {signedIn ? "Add a card · coming soon" : "Sign in to add a card later"}
      </button>
    </section>
  )
}
