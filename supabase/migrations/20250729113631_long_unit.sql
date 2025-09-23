/*
  # Add technique categories and photo support

  1. New Tables
    - `technique_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `icon` (text) - Lucide icon name
      - `color` (text) - hex color
      - `description` (text, optional)
      - `sort_order` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `teaching_technique_categories` (junction table)
      - `id` (uuid, primary key)
      - `technique_id` (uuid, foreign key)
      - `category_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Schema Changes
    - Add `photo_url` column to `teaching_techniques` table

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to manage categories
    - Add policies for users to manage technique-category associations

  4. Sample Data
    - Add default categories: Study, IT, Peer Teaching, Creative, Assessment
*/

-- Add photo_url column to teaching_techniques
ALTER TABLE teaching_techniques 
ADD COLUMN photo_url text;

-- Create technique_categories table
CREATE TABLE IF NOT EXISTS technique_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT 'Tag',
  color text NOT NULL DEFAULT '#6B7280',
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create junction table for technique-category relationships
CREATE TABLE IF NOT EXISTS teaching_technique_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid REFERENCES teaching_techniques(id) ON DELETE CASCADE,
  category_id uuid REFERENCES technique_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(technique_id, category_id)
);

-- Enable RLS
ALTER TABLE technique_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_technique_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for technique_categories
CREATE POLICY "Anyone can read technique categories"
  ON technique_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage technique categories"
  ON technique_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for teaching_technique_categories
CREATE POLICY "Anyone can read technique category associations"
  ON teaching_technique_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage technique category associations"
  ON teaching_technique_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger for technique_categories
CREATE TRIGGER update_technique_categories_updated_at
  BEFORE UPDATE ON technique_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_technique_categories_active ON technique_categories (is_active, sort_order);
CREATE INDEX idx_teaching_technique_categories_technique ON teaching_technique_categories (technique_id);
CREATE INDEX idx_teaching_technique_categories_category ON teaching_technique_categories (category_id);

-- Insert default categories
INSERT INTO technique_categories (name, icon, color, description, sort_order) VALUES
  ('Studie', 'BookOpen', '#3B82F6', 'Studievaardigheden en leerstrategieën', 1),
  ('IT & Technologie', 'Monitor', '#10B981', 'Digitale tools en technologie in het onderwijs', 2),
  ('Peer Teaching', 'Users', '#8B5CF6', 'Leerlingen onderwijzen elkaar', 3),
  ('Creatief', 'Palette', '#F59E0B', 'Creatieve en artistieke benaderingen', 4),
  ('Toetsing', 'CheckSquare', '#EF4444', 'Evaluatie en assessment methoden', 5),
  ('Communicatie', 'MessageCircle', '#06B6D4', 'Communicatieve vaardigheden', 6),
  ('Motivatie', 'Zap', '#EC4899', 'Motivatie en betrokkenheid verhogen', 7);