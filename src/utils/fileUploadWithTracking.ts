import { supabase } from '../lib/supabase';
import { trackFileUpload, FileType } from './storageTracking';

interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  schoolId: string;
  userId: string;
  fileType: FileType;
  upsert?: boolean;
}

export async function uploadFileWithTracking(options: UploadOptions) {
  const { bucket, path, file, schoolId, userId, fileType, upsert = false } = options;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert });

    if (error) throw error;

    await trackFileUpload(schoolId, fileType, path, file.size, userId);

    return { data, error: null };
  } catch (error) {
    console.error('Error uploading file with tracking:', error);
    return { data: null, error };
  }
}

export async function getFileSizeFromUrl(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}
