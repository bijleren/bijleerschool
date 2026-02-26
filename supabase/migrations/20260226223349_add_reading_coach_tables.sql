/*
  # Add Reading Coach System - Tables

  ## Overview
  Create tables for the Leescoach reading assessment system.

  ## New Tables
  1. reading_techniques - Reading techniques used by teachers
  2. reading_interventions - Interventions (4 defaults + school-specific)
  3. reading_coach_sessions - Individual reading assessment sessions
  4. reading_session_techniques - Junction table for session techniques
  5. reading_session_interventions - Junction table for session interventions

  ## Features
  - Four-level assessment scale (very_poor, poor, good, excellent)
  - Four assessment parameters (leesniveau, begrip, motivatie, smaakontwikkeling)
  - Reading techniques management per school
  - Default and custom interventions
  - Integration with book library
*/

-- Create reading_techniques table
CREATE TABLE reading_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create reading_interventions table
CREATE TABLE reading_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create reading_coach_sessions table
CREATE TABLE reading_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_date timestamptz NOT NULL,
  book_id uuid REFERENCES books(id) ON DELETE SET NULL,
  manual_book_title text,
  manual_book_author text,
  general_observations text,
  leesniveau_scale text CHECK (leesniveau_scale IN ('very_poor', 'poor', 'good', 'excellent')),
  leesniveau_observations text,
  begrip_scale text CHECK (begrip_scale IN ('very_poor', 'poor', 'good', 'excellent')),
  begrip_observations text,
  motivatie_scale text CHECK (motivatie_scale IN ('very_poor', 'poor', 'good', 'excellent')),
  motivatie_observations text,
  smaakontwikkeling_scale text CHECK (smaakontwikkeling_scale IN ('very_poor', 'poor', 'good', 'excellent')),
  smaakontwikkeling_observations text,
  custom_intervention_notes text,
  next_session_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create reading_session_techniques junction table
CREATE TABLE reading_session_techniques (
  session_id uuid REFERENCES reading_coach_sessions(id) ON DELETE CASCADE NOT NULL,
  technique_id uuid REFERENCES reading_techniques(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (session_id, technique_id)
);

-- Create reading_session_interventions junction table
CREATE TABLE reading_session_interventions (
  session_id uuid REFERENCES reading_coach_sessions(id) ON DELETE CASCADE NOT NULL,
  intervention_id uuid REFERENCES reading_interventions(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (session_id, intervention_id)
);

-- Add indexes
CREATE INDEX idx_reading_techniques_school_id ON reading_techniques(school_id);
CREATE INDEX idx_reading_techniques_active ON reading_techniques(is_active) WHERE is_active = true;
CREATE INDEX idx_reading_interventions_school_id ON reading_interventions(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_reading_interventions_default ON reading_interventions(is_default) WHERE is_default = true;
CREATE INDEX idx_reading_coach_sessions_school_id ON reading_coach_sessions(school_id);
CREATE INDEX idx_reading_coach_sessions_student_id ON reading_coach_sessions(student_id);
CREATE INDEX idx_reading_coach_sessions_coach_id ON reading_coach_sessions(coach_id) WHERE coach_id IS NOT NULL;
CREATE INDEX idx_reading_coach_sessions_session_date ON reading_coach_sessions(session_date DESC);
CREATE INDEX idx_reading_session_techniques_session_id ON reading_session_techniques(session_id);
CREATE INDEX idx_reading_session_techniques_technique_id ON reading_session_techniques(technique_id);
CREATE INDEX idx_reading_session_interventions_session_id ON reading_session_interventions(session_id);
CREATE INDEX idx_reading_session_interventions_intervention_id ON reading_session_interventions(intervention_id);

-- Enable RLS
ALTER TABLE reading_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_session_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_session_interventions ENABLE ROW LEVEL SECURITY;