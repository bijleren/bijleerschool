/*
  # Boeker Library System - Tables

  ## Overview
  Create tables for the Boeker digital library system.

  ## New Tables
  1. books - Library book catalog
  2. student_books - Borrowed books tracking
  3. reading_sessions - Reading progress tracking
  4. book_reviews - Student book reviews

  ## Features
  - ISBN-based book management
  - Reading progress tracking with timer support
  - Book reviews and ratings
  - Copy management (total/available)
*/

-- Create books table
CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  isbn text NOT NULL,
  isbn_13 text,
  isbn_10 text,
  title text NOT NULL,
  author text,
  publisher text,
  published_date text,
  page_count integer,
  description text,
  cover_image_url text,
  custom_cover_url text,
  language text,
  categories text[],
  total_copies integer DEFAULT 1,
  available_copies integer DEFAULT 1,
  metadata_source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  added_by uuid,
  UNIQUE(school_id, isbn)
);

-- Create student_books table
CREATE TABLE student_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  borrowed_at timestamptz DEFAULT now(),
  returned_at timestamptz,
  status text DEFAULT 'current' CHECK (status IN ('current', 'returned', 'overdue')),
  created_at timestamptz DEFAULT now()
);

-- Create reading_sessions table
CREATE TABLE reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_book_id uuid REFERENCES student_books(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  start_page integer,
  end_page integer,
  pages_read integer,
  timer_duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create book_reviews table
CREATE TABLE book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  student_book_id uuid REFERENCES student_books(id) ON DELETE SET NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, book_id)
);

-- Create indexes
CREATE INDEX idx_books_school_id ON books(school_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_student_books_student_id ON student_books(student_id);
CREATE INDEX idx_student_books_book_id ON student_books(book_id);
CREATE INDEX idx_student_books_status ON student_books(status);
CREATE INDEX idx_reading_sessions_student_id ON reading_sessions(student_id);
CREATE INDEX idx_reading_sessions_book_id ON reading_sessions(book_id);
CREATE INDEX idx_book_reviews_student_id ON book_reviews(student_id);
CREATE INDEX idx_book_reviews_book_id ON book_reviews(book_id);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
