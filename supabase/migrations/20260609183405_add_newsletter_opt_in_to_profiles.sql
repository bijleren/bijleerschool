-- Add newsletter_opt_in column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false;

-- Backfill from existing auth user metadata where available
UPDATE profiles p
SET newsletter_opt_in = true
FROM auth.users u
WHERE u.id = p.id
  AND (u.raw_user_meta_data->>'newsletter_opt_in')::boolean = true;
