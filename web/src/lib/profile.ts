import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

export type Profile = { displayName: string | null; avatarUrl: string | null }

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

// One shared copy so the header and the profile page agree without refetching.
let cache: { userId: string; profile: Profile } | null = null
const listeners = new Set<(p: Profile) => void>()

function publish(userId: string, profile: Profile) {
  cache = { userId, profile }
  for (const l of listeners) l(profile)
}

/** What to show before the profile row loads, or if it can't be read. */
export function fallbackProfile(user: User): Profile {
  const meta = user.user_metadata ?? {}
  return {
    displayName: (meta.full_name as string | undefined) ?? null,
    avatarUrl: (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null,
  }
}

export function displayNameFor(user: User, profile: Profile) {
  return profile.displayName?.trim() || user.email || "Your account"
}

/** The signed-in donor's profile row (name and photo), kept in sync app-wide. */
export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(() =>
    user ? (cache?.userId === user.id ? cache.profile : fallbackProfile(user)) : null,
  )

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    const onChange = (p: Profile) => setProfile(p)
    listeners.add(onChange)
    if (cache?.userId !== user.id) {
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const fb = fallbackProfile(user)
          publish(user.id, {
            displayName: data?.display_name ?? fb.displayName,
            // A saved row is the truth (a removed photo stays removed).
            avatarUrl: data ? data.avatar_url : fb.avatarUrl,
          })
        })
    } else {
      setProfile(cache.profile)
    }
    return () => {
      listeners.delete(onChange)
    }
  }, [user])

  return profile
}

export async function saveDisplayName(user: User, current: Profile, name: string) {
  const displayName = name.trim().slice(0, 80) || null
  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id)
  if (error) throw new Error("Your name couldn't be saved. Try again in a moment.")
  publish(user.id, { ...current, displayName })
}

/** Upload a new photo to avatars/<user id>/ and point the profile at it. */
export async function uploadAvatar(user: User, current: Profile, file: File) {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error("Use a PNG, JPEG or WebP image.")
  if (file.size > AVATAR_MAX_BYTES) throw new Error("That image is over 2 MB. Try a smaller one.")
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true })
  if (error) {
    throw new Error(
      /bucket/i.test(error.message)
        ? "Photo uploads aren't switched on yet (the avatars storage hasn't been set up)."
        : "Your photo couldn't be uploaded. Try again in a moment.",
    )
  }
  const avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
  const { error: saveError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id)
  if (saveError) throw new Error("Your photo uploaded but couldn't be saved to your profile. Try again.")
  publish(user.id, { ...current, avatarUrl })
}

export async function removeAvatar(user: User, current: Profile) {
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id)
  if (error) throw new Error("Your photo couldn't be removed. Try again in a moment.")
  publish(user.id, { ...current, avatarUrl: null })
}
