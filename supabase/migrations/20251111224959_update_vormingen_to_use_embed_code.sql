/*
  # Update Vormingen to Use Embed Code

  1. Changes
    - Rename vimeo_url column to embed_code
    - Update column type to text to store full HTML embed code
    - This allows storing the complete Vimeo embed code directly from Vimeo

  2. Notes
    - Users will paste the complete embed code from Vimeo
    - No need to extract or construct video IDs
    - More flexible for future video platforms
*/

-- Rename vimeo_url to embed_code
ALTER TABLE didactiek_vormingen 
RENAME COLUMN vimeo_url TO embed_code;

-- Update any existing data to convert URLs to embed codes (if needed)
-- This is safe even if there's no data yet
UPDATE didactiek_vormingen
SET embed_code = '<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="' || embed_code || '" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="Video"></iframe></div>'
WHERE embed_code NOT LIKE '%<iframe%'
  AND embed_code IS NOT NULL;
