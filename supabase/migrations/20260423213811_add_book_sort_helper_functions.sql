/*
  # Add book sort helper functions

  ## Purpose
  Provides two SQL functions to support sorting books by computed/aggregated values
  that can't be done with a simple column order:

  1. `get_books_by_popularity(p_school_id, p_letter, p_avail_filter)`
     Returns books ordered by total borrow count (student_books rows) descending.

  2. `get_books_by_recent_activity(p_school_id, p_letter, p_avail_filter)`
     Returns books ordered by the most recent borrow date (student_books.borrowed_at) descending.

  Both functions accept:
  - p_letter: single letter 'A'-'Z' or '#' for non-alpha titles (NULL = no filter)
  - p_avail_filter: 'available' | 'unavailable' | anything else = no filter

  These are SECURITY DEFINER functions but check school_id, so they are safe for
  authenticated users to call via supabase.rpc().
*/

CREATE OR REPLACE FUNCTION get_books_by_popularity(
  p_school_id uuid,
  p_letter text DEFAULT NULL,
  p_avail_filter text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  isbn text,
  title text,
  author text,
  cover_image_url text,
  custom_cover_url text,
  page_count integer,
  total_copies integer,
  available_copies integer,
  metadata_source text,
  location_id uuid,
  created_at timestamptz,
  loan_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.id, b.isbn, b.title, b.author,
    b.cover_image_url, b.custom_cover_url,
    b.page_count, b.total_copies, b.available_copies,
    b.metadata_source, b.location_id, b.created_at,
    COUNT(sb.id) AS loan_count
  FROM books b
  LEFT JOIN student_books sb ON sb.book_id = b.id
  WHERE b.school_id = p_school_id
    AND (
      p_letter IS NULL
      OR (p_letter = '#' AND b.title !~* '^[A-Z]')
      OR (p_letter != '#' AND b.title ILIKE (p_letter || '%'))
    )
    AND (
      p_avail_filter = 'available' AND b.available_copies > 0
      OR p_avail_filter = 'unavailable' AND b.available_copies = 0
      OR p_avail_filter NOT IN ('available', 'unavailable')
    )
  GROUP BY b.id
  ORDER BY loan_count DESC, b.title ASC;
$$;

CREATE OR REPLACE FUNCTION get_books_by_recent_activity(
  p_school_id uuid,
  p_letter text DEFAULT NULL,
  p_avail_filter text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  isbn text,
  title text,
  author text,
  cover_image_url text,
  custom_cover_url text,
  page_count integer,
  total_copies integer,
  available_copies integer,
  metadata_source text,
  location_id uuid,
  created_at timestamptz,
  last_borrowed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.id, b.isbn, b.title, b.author,
    b.cover_image_url, b.custom_cover_url,
    b.page_count, b.total_copies, b.available_copies,
    b.metadata_source, b.location_id, b.created_at,
    MAX(sb.borrowed_at) AS last_borrowed_at
  FROM books b
  LEFT JOIN student_books sb ON sb.book_id = b.id
  WHERE b.school_id = p_school_id
    AND (
      p_letter IS NULL
      OR (p_letter = '#' AND b.title !~* '^[A-Z]')
      OR (p_letter != '#' AND b.title ILIKE (p_letter || '%'))
    )
    AND (
      p_avail_filter = 'available' AND b.available_copies > 0
      OR p_avail_filter = 'unavailable' AND b.available_copies = 0
      OR p_avail_filter NOT IN ('available', 'unavailable')
    )
  GROUP BY b.id
  ORDER BY last_borrowed_at DESC NULLS LAST, b.title ASC;
$$;
