/*
  # Create student_roles table with default roles

  1. New Tables
    - `student_roles`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `name` (text, role name)
      - `description` (text, role description)
      - `color` (text, hex color code)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `student_roles` table
    - Add policy for school members to manage roles

  3. Default Data
    - Insert default roles: Victim, Witness, Perpetrator for all existing schools
*/

-- Create the student_roles table
CREATE TABLE IF NOT EXISTS public.student_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6B7280'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_roles_pkey PRIMARY KEY (id),
    CONSTRAINT student_roles_school_id_name_key UNIQUE (school_id, name),
    CONSTRAINT student_roles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.student_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for school members
CREATE POLICY "School members can manage student roles"
ON public.student_roles
FOR ALL
TO authenticated
USING (
  school_id IN (
    SELECT school_id 
    FROM user_schools 
    WHERE user_id = auth.uid() 
    AND status = 'approved' 
    AND is_active = true
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM user_schools 
    WHERE user_id = auth.uid() 
    AND status = 'approved' 
    AND is_active = true
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_student_roles_updated_at
    BEFORE UPDATE ON public.student_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles for all existing schools
INSERT INTO public.student_roles (school_id, name, description, color, is_active)
SELECT 
    s.id as school_id,
    role_data.name,
    role_data.description,
    role_data.color,
    true as is_active
FROM schools s
CROSS JOIN (
    VALUES 
        ('Victim', 'The student who was harmed or targeted in the incident', '#EF4444'),
        ('Witness', 'The student who observed or witnessed the incident', '#F59E0B'),
        ('Perpetrator', 'The student who committed or initiated the behavior', '#DC2626')
) AS role_data(name, description, color)
ON CONFLICT (school_id, name) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_student_roles_school_id ON public.student_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_student_roles_active ON public.student_roles(school_id, is_active) WHERE is_active = true;