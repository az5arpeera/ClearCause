-- ============================================================================
-- Profile photos and the contact form
-- ----------------------------------------------------------------------------
-- 1. An `avatars` storage bucket. Anyone can view a photo (they're shown in
--    the header), but each user can only write files under their own folder:
--    avatars/<user id>/... . profiles.avatar_url (0001) stores the public URL.
-- 2. contact_messages: anyone (signed in or not) can send a message; only
--    admins can read them. Nothing here is ever shown publicly.
-- Card details are deliberately NOT stored anywhere in this database: saved
-- cards will live in Stripe, referenced only by Stripe's own ids.
-- ============================================================================

-- ---- 1. avatars bucket ------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "anyone views avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- 2. contact messages ----------------------------------------------------
create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  name        text check (char_length(name) <= 200),
  email       text not null check (char_length(email) between 3 and 320 and email like '%@%'),
  topic       text not null default 'general'
              check (topic in ('general', 'charity_data', 'nonprofit', 'account', 'other')),
  message     text not null check (char_length(message) between 1 and 5000),
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.contact_messages is 'Messages from the Contact page. Insert-only for the public; admins read and handle them.';

alter table public.contact_messages enable row level security;

-- Anyone may send; a signed-in sender can only attach their own user id.
create policy "anyone sends contact messages" on public.contact_messages
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "admins manage contact messages" on public.contact_messages
  for all using (public.is_admin()) with check (public.is_admin());
