import { useState, type FormEvent } from "react"
import { CheckCircle2, Send } from "lucide-react"

import { PageFrame } from "@/components/Glass"
import { useAuth } from "@/lib/auth"
import { fieldInput, glassChip, glassPanel, solidButton } from "@/lib/glass"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { displayNameFor, useProfile } from "@/lib/profile"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const topics: [string, string][] = [
  ["general", "A general question"],
  ["charity_data", "A charity's figures look wrong"],
  ["nonprofit", "I run a nonprofit"],
  ["account", "My account"],
  ["other", "Something else"],
]

const field = `${fieldInput} mt-2`

/** Contact form: saves to the contact_messages table (insert-only for the public). */
export default function Contact() {
  const { user } = useAuth()
  const profile = useProfile(user)
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  useLiquidGlass(state)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setState("sending")
    const { error } = await supabase.from("contact_messages").insert({
      name: String(data.get("name") ?? "").trim() || null,
      email: String(data.get("email") ?? "").trim(),
      topic: String(data.get("topic") ?? "general"),
      message: String(data.get("message") ?? "").trim(),
    })
    setState(error ? "error" : "sent")
  }

  return (
    <PageFrame
      title="Contact us"
      intro="Questions, a figure that looks wrong, or a nonprofit you'd like us to look at. We read every message."
      width="narrow"
    >
      <div className={cn(glassPanel, "mt-8 p-6 sm:p-8")} data-refract="0.4" data-refract-source="#page-backdrop">
        {state === "sent" ? (
          <div role="status">
            <CheckCircle2 className="size-8 text-forest" aria-hidden />
            <h2 className="mt-3 text-xl font-bold tracking-tight">Thanks, we got your message</h2>
            <p className="mt-2 text-ink-2">We'll reply to the email you gave us.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href="/explore" className={solidButton}>Back to Explore</a>
              <button type="button" onClick={() => setState("idle")} className={glassChip}>Send another</button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="text-sm font-semibold">Name <span className="font-normal text-ink-3">(optional)</span></label>
                <input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  maxLength={200}
                  defaultValue={user && profile ? (profile.displayName ?? "") : ""}
                  key={user && profile ? displayNameFor(user, profile) : "guest"}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-semibold">Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={320}
                  defaultValue={user?.email ?? ""}
                  key={user?.email ?? "guest-email"}
                  className={field}
                />
              </div>
            </div>
            <div>
              <label htmlFor="contact-topic" className="text-sm font-semibold">What's it about?</label>
              <select id="contact-topic" name="topic" defaultValue="general" className={field}>
                {topics.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contact-message" className="text-sm font-semibold">Message</label>
              <textarea
                id="contact-message"
                name="message"
                required
                maxLength={5000}
                rows={6}
                className={cn(field, "py-2.5 leading-relaxed")}
              />
            </div>
            {state === "error" ? (
              <p role="alert" className="text-sm text-destructive">
                Your message didn't send. Check your connection and try again.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" disabled={state === "sending"} className={solidButton}>
                <Send className="size-4" aria-hidden />
                {state === "sending" ? "Sending…" : "Send message"}
              </button>
              <p className="text-[0.8125rem] text-ink-3">We only use your email to reply.</p>
            </div>
          </form>
        )}
      </div>
      <p className="mt-6 text-sm text-ink-2">
        Asking about a charity's figures? Every number on its page links to the document it came from, which is often the
        quickest answer.
      </p>
    </PageFrame>
  )
}
