/*
  # Backfill student codes & colors, add auto-generate trigger

  ## Summary
  This migration does three things:

  ### 1. Backfill missing student codes
  Any student row where `student_code` is NULL gets a freshly generated
  8-character code using the existing `generate_student_code()` function.
  The loop retries on collision to guarantee uniqueness.

  ### 2. Backfill missing access hashes
  Any student row where `access_hash` is NULL gets a freshly generated hash
  using the existing `generate_access_hash()` function.

  ### 3. Backfill missing colors
  Any student row where `color` is NULL gets the default blue color `#3B82F6`
  so that WebWijzer widgets are never shown in grey.

  ### 4. BEFORE INSERT trigger
  A trigger function `auto_generate_student_code()` is created and attached as
  a BEFORE INSERT trigger on the `students` table. It:
  - Sets `student_code` to a unique generated code when the inserted value is NULL or empty
  - Sets `access_hash` to a generated hash when the inserted value is NULL or empty
  - Sets `color` to `#3B82F6` when the inserted value is NULL or empty

  ### Security
  No RLS changes — this only modifies trigger/function definitions and
  backfills existing data.
*/

-- ─────────────────────────────────────────
-- 1. Backfill student_code for existing rows
-- ─────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
  new_code text;
  new_hash text;
BEGIN
  FOR rec IN
    SELECT id FROM students WHERE student_code IS NULL OR student_code = ''
  LOOP
    -- Retry until we get a code that doesn't collide
    LOOP
      new_code := generate_student_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM students WHERE student_code = new_code);
    END LOOP;

    new_hash := generate_access_hash();

    UPDATE students
    SET student_code = new_code,
        access_hash  = COALESCE(access_hash, new_hash)
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ─────────────────────────────────────────
-- 2. Backfill access_hash for rows that still lack one
-- ─────────────────────────────────────────
UPDATE students
SET access_hash = generate_access_hash()
WHERE access_hash IS NULL OR access_hash = '';

-- ─────────────────────────────────────────
-- 3. Backfill color for existing rows
-- ─────────────────────────────────────────
UPDATE students
SET color = '#3B82F6'
WHERE color IS NULL OR color = '';

-- ─────────────────────────────────────────
-- 4. Trigger function: auto-fill on INSERT
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_generate_student_code()
RETURNS trigger AS $$
DECLARE
  new_code text;
BEGIN
  -- Auto-assign color
  IF NEW.color IS NULL OR NEW.color = '' THEN
    NEW.color := '#3B82F6';
  END IF;

  -- Auto-assign access_hash
  IF NEW.access_hash IS NULL OR NEW.access_hash = '' THEN
    NEW.access_hash := generate_access_hash();
  END IF;

  -- Auto-assign student_code (with collision retry)
  IF NEW.student_code IS NULL OR NEW.student_code = '' THEN
    LOOP
      new_code := generate_student_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM students WHERE student_code = new_code);
    END LOOP;
    NEW.student_code := new_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS trg_auto_generate_student_code ON students;

CREATE TRIGGER trg_auto_generate_student_code
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_student_code();
