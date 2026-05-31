/*
  # Fix public bucket listing policies

  Public buckets allow direct URL access without any storage policy. The broad SELECT
  policies (`bucket_id = X`) allow clients to LIST all files via the storage API, which
  exposes filenames/paths unintentionally.

  Fix: Drop the broad SELECT policies. Public URL access still works via the CDN/public
  bucket setting. This removes listing capability while preserving direct URL access.

  Buckets fixed:
  - activity-board-icons, audio-recordings, blinkQR-*, book-covers, feedback-audio,
    feedback-photos, fiche-images, material-photos, reading-audio, spoor-icons,
    student-files, video-content, video-recordings, webwijzer-files
*/

-- activity-board-icons
DROP POLICY IF EXISTS "Anyone can view board icons" ON storage.objects;

-- audio-recordings
DROP POLICY IF EXISTS "Anyone can view audio recordings" ON storage.objects;

-- blinkQR buckets (individual legacy policies + combined policy)
DROP POLICY IF EXISTS "Public read access to blinkQR audios" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to blinkQR documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to blinkQR images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to blinkQR videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for blinkQR buckets" ON storage.objects;

-- book-covers
DROP POLICY IF EXISTS "Anyone can view book covers" ON storage.objects;

-- feedback-audio
DROP POLICY IF EXISTS "Anyone can view feedback audio" ON storage.objects;

-- feedback-photos
DROP POLICY IF EXISTS "Anyone can view feedback photos" ON storage.objects;

-- fiche-images
DROP POLICY IF EXISTS "Public can view fiche images" ON storage.objects;

-- material-photos
DROP POLICY IF EXISTS "Anyone can view material photos" ON storage.objects;

-- reading-audio
DROP POLICY IF EXISTS "Anyone can view reading audio" ON storage.objects;

-- spoor-icons
DROP POLICY IF EXISTS "Public can view spoor icons" ON storage.objects;

-- student-files
DROP POLICY IF EXISTS "Public read access to student files" ON storage.objects;

-- video-content (two policies)
DROP POLICY IF EXISTS "Public can view word images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for video content" ON storage.objects;

-- video-recordings (three policies)
DROP POLICY IF EXISTS "Public can read video recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can view recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for video recordings" ON storage.objects;

-- webwijzer-files
DROP POLICY IF EXISTS "Public can view webwijzer files" ON storage.objects;
