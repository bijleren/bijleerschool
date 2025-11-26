/*
  # Allow public read access to technique related data

  1. Changes
    - Allow public read access to age groups
    - Allow public read access to subjects
    - Allow public read access to materials
    - Allow public read access to technique categories
    - Allow public read access to technique junction tables
    - Allow public read access to profiles (for author information)

  2. Security
    - Only SELECT operations are allowed publicly
    - Write operations still require authentication
*/

-- Age groups
DROP POLICY IF EXISTS "Anyone can view age groups" ON age_groups;
CREATE POLICY "Public read access to age groups"
  ON age_groups
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Subjects
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
CREATE POLICY "Public read access to subjects"
  ON subjects
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Materials
DROP POLICY IF EXISTS "Anyone can view materials" ON materials;
CREATE POLICY "Public read access to materials"
  ON materials
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Technique categories
DROP POLICY IF EXISTS "Anyone can view technique categories" ON technique_categories;
CREATE POLICY "Public read access to technique categories"
  ON technique_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Teaching technique age groups junction
DROP POLICY IF EXISTS "Anyone can view teaching technique age groups" ON teaching_technique_age_groups;
CREATE POLICY "Public read access to teaching technique age groups"
  ON teaching_technique_age_groups
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Teaching technique subjects junction
DROP POLICY IF EXISTS "Anyone can view teaching technique subjects" ON teaching_technique_subjects;
CREATE POLICY "Public read access to teaching technique subjects"
  ON teaching_technique_subjects
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Teaching technique materials junction
DROP POLICY IF EXISTS "Anyone can view teaching technique materials" ON teaching_technique_materials;
CREATE POLICY "Public read access to teaching technique materials"
  ON teaching_technique_materials
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Teaching technique categories junction
DROP POLICY IF EXISTS "Anyone can view teaching technique categories" ON teaching_technique_categories;
CREATE POLICY "Public read access to teaching technique categories"
  ON teaching_technique_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Profiles (for author information)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public read access to profiles"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);
