import { useState, type FormEvent } from "react"
import { ArrowLeft } from "lucide-react"

import { SiteHeader } from "@/components/SiteHeader"
import { useAuth } from "@/lib/auth"

type Mode = "signin" | "signup"

export default function SignIn() {
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  // Already signed in → send them to their matches.
  if (user) {
    window.location.replace("/for-you")
    return null
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setBusy(true)
    const run = mode === "signin" ? signInWithEmail : signUpWithEmail
    const { error } = await run(email, password)
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    if (mode === "signup") {
      // Supabase sends a confirmation email by default.
      setCheckEmail(true)
      return
    }
    window.location.assign("/for-you")
  }

  async function onGoogle() {
    setBusy(true)
    setError(null)
    const { error } = await signInWithGoogle()
    // On success the browser redirects to Google, so we only land here on error.
    if (error) {
      setError(error)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-paper text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[76rem] flex-1 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="max-w-[26rem] border-t-2 border-forest pt-5">
          <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.02em] text-balance">
            {mode === "signin" ? "Sign in to Clear Cause" : "Create your account"}
          </h1>
          <p className="mt-3 font-serif text-[1.0625rem] leading-[1.6] text-ink-2">
            {mode === "signin"
              ? "Pick up where you left off and see the causes matched to you."
              : "Save your giving preferences and get charities matched to your values."}
          </p>

          {checkEmail ? (
            <div className="mt-8 rounded-[2px] border border-forest/30 bg-forest/5 p-5">
              <p className="font-serif text-[1rem] leading-[1.6] text-ink">
                Check your inbox — we sent a confirmation link to{" "}
                <span className="font-semibold">{email}</span>. Confirm it, then sign in.
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-[2px] border border-ink/15 bg-paper px-5 text-[0.9375rem] font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
              >
                <GoogleGlyph />
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3 text-[0.8125rem] text-ink-2">
                <span className="h-px flex-1 bg-ink/10" />
                or
                <span className="h-px flex-1 bg-ink/10" />
              </div>

              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[0.8125rem] font-semibold text-ink-2">Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-[2px] border border-ink/15 bg-paper px-3 text-[0.9375rem] outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[0.8125rem] font-semibold text-ink-2">Password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-[2px] border border-ink/15 bg-paper px-3 text-[0.9375rem] outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  />
                </label>

                {mode === "signup" && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[0.8125rem] font-semibold text-ink-2">Confirm password</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      aria-invalid={confirm.length > 0 && confirm !== password}
                      className="h-11 rounded-[2px] border border-ink/15 bg-paper px-3 text-[0.9375rem] outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 aria-[invalid=true]:border-red-500"
                    />
                  </label>
                )}

                {error && (
                  <p className="text-[0.875rem] text-red-700" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 inline-flex h-11 items-center justify-center rounded-[2px] bg-forest px-5 text-[0.9375rem] font-semibold text-paper hover:bg-forest-deep disabled:opacity-50"
                >
                  {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-5 text-[0.9375rem] text-ink-2">
                {mode === "signin" ? "New here? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin")
                    setError(null)
                    setConfirm("")
                  }}
                  className="font-semibold text-forest underline underline-offset-2 hover:text-forest-deep"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}

          <a
            href="/"
            className="mt-10 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-ink-2 no-underline hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to Clear Cause
          </a>
        </div>
      </main>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.46h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.73Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.47 11.47 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}
