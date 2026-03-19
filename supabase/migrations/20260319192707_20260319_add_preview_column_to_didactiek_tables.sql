/*
  # Add preview column to didactiek content tables

  ## Summary
  Adds a boolean `preview` column to four content tables so that admins can
  mark individual items as "preview content".

  ### Business logic
  - preview = false (default): item is shown to ALL authenticated users
    (both premium and non-premium schools)
  - preview = true: item is ONLY shown to non-premium schools
    (premium_school = 0 or NULL). Premium schools do not see preview items.

  This allows the platform admin to create teaser/preview content visible
  only to free-tier schools, and full content visible to everyone.

  ### Modified Tables
  - `teaching_techniques` — new column `preview boolean NOT NULL DEFAULT false`
  - `didactiek_faq`        — new column `preview boolean NOT NULL DEFAULT false`
  - `didactiek_vormingen`  — new column `preview boolean NOT NULL DEFAULT false`
  - `newsletters`          — new column `preview boolean NOT NULL DEFAULT false`

  ### Security
  No RLS policy changes in this migration; filtering is done at the application
  layer (component queries) so that admins always see everything.
  Newsletter RLS is updated separately via a follow-up migration.
*/

-- teaching_techniques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teaching_techniques' AND column_name = 'preview'
  ) THEN
    ALTER TABLE teaching_techniques ADD COLUMN preview boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- didactiek_faq
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'didactiek_faq' AND column_name = 'preview'
  ) THEN
    ALTER TABLE didactiek_faq ADD COLUMN preview boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- didactiek_vormingen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'didactiek_vormingen' AND column_name = 'preview'
  ) THEN
    ALTER TABLE didactiek_vormingen ADD COLUMN preview boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- newsletters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletters' AND column_name = 'preview'
  ) THEN
    ALTER TABLE newsletters ADD COLUMN preview boolean NOT NULL DEFAULT false;
  END IF;
END $$;
