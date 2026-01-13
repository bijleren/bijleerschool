import { supabase } from '../lib/supabase';

export type FileType =
  | 'student_photo'
  | 'book_cover'
  | 'school_material'
  | 'newsletter_attachment'
  | 'other';

export async function trackFileUpload(
  schoolId: string,
  fileType: FileType,
  filePath: string,
  fileSizeBytes: number,
  uploadedBy: string
): Promise<boolean> {
  try {
    const { error: logError } = await supabase
      .from('storage_usage_log')
      .insert({
        school_id: schoolId,
        file_type: fileType,
        file_path: filePath,
        file_size_bytes: fileSizeBytes,
        uploaded_by: uploadedBy,
      });

    if (logError) {
      console.error('Error logging storage usage:', logError);
      return false;
    }

    const { error: updateError } = await supabase.rpc('update_school_storage_usage', {
      p_school_id: schoolId,
    });

    if (updateError) {
      console.error('Error updating school storage:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error tracking file upload:', error);
    return false;
  }
}

export async function trackFileDelete(
  schoolId: string,
  filePath: string
): Promise<boolean> {
  try {
    const { error: markDeleteError } = await supabase
      .from('storage_usage_log')
      .update({ deleted_at: new Date().toISOString() })
      .eq('school_id', schoolId)
      .eq('file_path', filePath)
      .is('deleted_at', null);

    if (markDeleteError) {
      console.error('Error marking file as deleted:', markDeleteError);
      return false;
    }

    const { error: updateError } = await supabase.rpc('update_school_storage_usage', {
      p_school_id: schoolId,
    });

    if (updateError) {
      console.error('Error updating school storage:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error tracking file delete:', error);
    return false;
  }
}

export async function getSchoolStorageUsage(schoolId: string) {
  try {
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('storage_used_bytes, storage_limit_bytes, is_premium_school')
      .eq('id', schoolId)
      .maybeSingle();

    if (schoolError) throw schoolError;

    if (!school) {
      return null;
    }

    const usedGB = school.storage_used_bytes / (1024 * 1024 * 1024);
    const limitGB = school.storage_limit_bytes / (1024 * 1024 * 1024);
    const percentageUsed = (school.storage_used_bytes / school.storage_limit_bytes) * 100;

    return {
      usedBytes: school.storage_used_bytes,
      limitBytes: school.storage_limit_bytes,
      usedGB: parseFloat(usedGB.toFixed(2)),
      limitGB: parseFloat(limitGB.toFixed(2)),
      percentageUsed: parseFloat(percentageUsed.toFixed(1)),
      isPremium: school.is_premium_school,
    };
  } catch (error) {
    console.error('Error getting school storage usage:', error);
    return null;
  }
}

export async function getStorageBreakdown(schoolId: string) {
  try {
    const { data, error } = await supabase.rpc('get_storage_breakdown', {
      p_school_id: schoolId,
    });

    if (error) throw error;

    return data?.map((item: any) => ({
      fileType: item.file_type,
      totalSizeBytes: parseInt(item.total_size_bytes),
      totalSizeGB: parseFloat((parseInt(item.total_size_bytes) / (1024 * 1024 * 1024)).toFixed(2)),
      fileCount: parseInt(item.file_count),
    })) || [];
  } catch (error) {
    console.error('Error getting storage breakdown:', error);
    return [];
  }
}

export async function getRecentUploads(schoolId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('storage_usage_log')
      .select(`
        *,
        users:uploaded_by(email)
      `)
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data?.map((log: any) => ({
      id: log.id,
      fileType: log.file_type,
      filePath: log.file_path,
      fileSizeBytes: log.file_size_bytes,
      fileSizeMB: parseFloat((log.file_size_bytes / (1024 * 1024)).toFixed(2)),
      uploadedBy: log.users?.email || 'Unknown',
      uploadedAt: log.uploaded_at,
    })) || [];
  } catch (error) {
    console.error('Error getting recent uploads:', error);
    return [];
  }
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getFileTypeLabel(fileType: FileType): string {
  const labels: Record<FileType, string> = {
    student_photo: 'Leerling foto',
    book_cover: 'Boekomslag',
    school_material: 'Schoolmateriaal',
    newsletter_attachment: 'Nieuwsbrief bijlage',
    other: 'Overig',
  };
  return labels[fileType] || fileType;
}
