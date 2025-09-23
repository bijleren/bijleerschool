/*
  # Add icon field to behavior categories

  1. Changes
    - Add `icon` column to `behavior_categories` table to store Lucide icon names
    - Update existing categories with appropriate icons

  2. Security
    - No changes to RLS policies needed
*/

-- Add icon column to behavior_categories
ALTER TABLE behavior_categories 
ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Tag';

-- Update existing categories with appropriate icons
UPDATE behavior_categories 
SET icon = CASE 
  WHEN LOWER(name) LIKE '%disruption%' OR LOWER(name) LIKE '%verstoring%' THEN 'Lightbulb'
  WHEN LOWER(name) LIKE '%aggressive%' OR LOWER(name) LIKE '%agressie%' THEN 'Zap'
  WHEN LOWER(name) LIKE '%respect%' OR LOWER(name) LIKE '%onrespect%' THEN 'Ban'
  WHEN LOWER(name) LIKE '%material%' OR LOWER(name) LIKE '%materiaal%' THEN 'Package'
  WHEN LOWER(name) LIKE '%rule%' OR LOWER(name) LIKE '%regel%' THEN 'AlertTriangle'
  WHEN LOWER(name) LIKE '%cooperation%' OR LOWER(name) LIKE '%samenwerk%' THEN 'Handshake'
  WHEN LOWER(name) LIKE '%concentration%' OR LOWER(name) LIKE '%concentratie%' THEN 'Target'
  ELSE 'Tag'
END
WHERE icon = 'Tag' OR icon IS NULL;