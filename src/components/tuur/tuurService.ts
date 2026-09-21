import { supabase } from '../../lib/supabase';

// Data layer for Tuur (the iOS child video player). Mirrors
// Tuur/Services/TuurVideoService.swift so both clients write the same rows.

export interface TuurVideo {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
}

export interface FamilyVideo {
  id: string;
  source: string;
  video: TuurVideo;
}

export interface CatalogueVideo {
  id: string;
  category: string | null;
  video: TuurVideo;
}

export type SelectionMode = 'automatic' | 'two' | 'three' | 'full' | 'channel';

export interface TuurSettings {
  allow_pause: boolean;
  allow_replay: boolean;
  allow_next: boolean;
  allow_seek: boolean;
  allow_fullscreen: boolean;
  autoplay: boolean;
  daily_limit_minutes: number | null;
  selection_mode: SelectionMode;
  show_watch_time: boolean;
  allow_voice: boolean;
}

// Same defaults as tuur_child_playlist() and the iOS app.
export const DEFAULT_SETTINGS: TuurSettings = {
  allow_pause: true,
  allow_replay: true,
  allow_next: true,
  allow_seek: false,
  allow_fullscreen: false,
  autoplay: true,
  daily_limit_minutes: null,
  selection_mode: 'automatic',
  show_watch_time: false,
  allow_voice: false,
};

export const SELECTION_MODE_LABELS: Record<SelectionMode, string> = {
  automatic: 'Automatisch',
  two: '2 keuzes',
  three: '3 keuzes',
  full: 'Volledige lijst',
  channel: 'Per kanaal',
};

export interface TuurBlock {
  id: string;
  label: string;
  start_minute: number;
  end_minute: number;
  video_ids: string[];
}

export interface TuurChannel {
  id: string;
  school_id: string | null;
  name: string;
  emoji: string | null;
  video_ids: string[];
}

const VIDEO_COLUMNS = 'id, youtube_id, title, thumbnail_url, duration_seconds';

// ---------- YouTube helpers ----------

const isValidId = (s: string) => /^[A-Za-z0-9_-]{11}$/.test(s);

/** Extract the 11-char id from any common YouTube URL form, or a bare id. */
export function parseYouTubeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (isValidId(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const v = url.searchParams.get('v');
  if (v && isValidId(v)) return v;
  for (const prefix of ['/shorts/', '/embed/', '/live/', '/v/']) {
    const i = url.pathname.indexOf(prefix);
    if (i >= 0) {
      const id = url.pathname.slice(i + prefix.length).split('/')[0];
      if (isValidId(id)) return id;
    }
  }
  if (url.hostname.includes('youtu.be')) {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (isValidId(id)) return id;
  }
  return null;
}

/** Keyless title/thumbnail lookup. Falls back to a generic title. */
async function fetchOEmbed(youtubeId: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    );
    if (res.ok) {
      const r = await res.json();
      return {
        title: (r.title as string) || 'YouTube-filmpje',
        thumbnail_url: (r.thumbnail_url as string) || null,
        channel_title: (r.author_name as string) || null,
      };
    }
  } catch { /* fall through */ }
  return {
    title: 'YouTube-filmpje',
    thumbnail_url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    channel_title: null,
  };
}

/** Register a pasted YouTube link as a canonical tuur_videos row; returns its id. */
async function upsertVideo(link: string): Promise<string> {
  const youtubeId = parseYouTubeId(link);
  if (!youtubeId) throw new Error('Dat lijkt geen geldige YouTube-link.');
  const meta = await fetchOEmbed(youtubeId);
  const { data, error } = await supabase.rpc('tuur_upsert_video', {
    p_youtube_id: youtubeId,
    p_title: meta.title,
    p_thumbnail_url: meta.thumbnail_url,
    p_duration_seconds: null,
    p_channel_title: meta.channel_title,
  });
  if (error) throw error;
  return data as string;
}

// ---------- Family library ----------

export async function familyCatalogue(schoolId: string): Promise<FamilyVideo[]> {
  const { data, error } = await supabase
    .from('tuur_family_videos')
    .select(`id, source, video:tuur_videos!inner(${VIDEO_COLUMNS})`)
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FamilyVideo[];
}

export async function addLinkToFamily(link: string, schoolId: string): Promise<string> {
  const videoId = await upsertVideo(link);
  await addToFamily(videoId, schoolId, 'manual');
  return videoId;
}

export async function addToFamily(videoId: string, schoolId: string, source: 'manual' | 'admin') {
  const { error } = await supabase
    .from('tuur_family_videos')
    .upsert(
      { school_id: schoolId, video_id: videoId, source, is_active: true },
      { onConflict: 'school_id,video_id' }
    );
  if (error) throw error;
}

export async function removeFromFamily(familyVideoId: string) {
  const { error } = await supabase
    .from('tuur_family_videos')
    .update({ is_active: false })
    .eq('id', familyVideoId);
  if (error) throw error;
}

export async function adminCatalogue(): Promise<CatalogueVideo[]> {
  const { data, error } = await supabase
    .from('tuur_admin_catalogue')
    .select(`id, category, video:tuur_videos!inner(${VIDEO_COLUMNS})`)
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CatalogueVideo[];
}

// ---------- Per child ----------

export async function assignedVideoIds(studentId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('tuur_child_videos')
    .select('video_id')
    .eq('student_id', studentId)
    .eq('is_active', true);
  if (error) throw error;
  return new Set((data ?? []).map(r => r.video_id as string));
}

export async function setAssignment(studentId: string, videoId: string, assigned: boolean) {
  const { error } = await supabase
    .from('tuur_child_videos')
    .upsert(
      { student_id: studentId, video_id: videoId, is_active: assigned },
      { onConflict: 'student_id,video_id' }
    );
  if (error) throw error;
}

export async function loadSettings(studentId: string): Promise<TuurSettings> {
  const { data, error } = await supabase
    .from('tuur_child_settings')
    .select('allow_pause, allow_replay, allow_next, allow_seek, allow_fullscreen, autoplay, daily_limit_minutes, selection_mode, show_watch_time, allow_voice')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...DEFAULT_SETTINGS, ...(data as Partial<TuurSettings>) } : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(studentId: string, settings: TuurSettings) {
  const { error } = await supabase
    .from('tuur_child_settings')
    .upsert(
      { student_id: studentId, ...settings, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' }
    );
  if (error) throw error;
}

export async function loadBlocks(studentId: string): Promise<TuurBlock[]> {
  const { data, error } = await supabase
    .from('tuur_child_blocks')
    .select('id, label, start_minute, end_minute, video_ids')
    .eq('student_id', studentId)
    .order('position', { ascending: true })
    .order('start_minute', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TuurBlock[];
}

export async function saveBlock(studentId: string, block: TuurBlock, position: number) {
  const { error } = await supabase
    .from('tuur_child_blocks')
    .upsert(
      { ...block, student_id: studentId, position },
      { onConflict: 'id' }
    );
  if (error) throw error;
}

export async function deleteBlock(id: string) {
  const { error } = await supabase.from('tuur_child_blocks').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Channels ----------

export async function loadChannels(schoolId: string): Promise<TuurChannel[]> {
  const { data, error } = await supabase
    .from('tuur_channels')
    .select('id, name, emoji, school_id, videos:tuur_channel_videos(video_id, position)')
    .or(`school_id.is.null,school_id.eq.${schoolId}`)
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    school_id: row.school_id,
    video_ids: [...(row.videos as { video_id: string; position: number }[])]
      .sort((a, b) => a.position - b.position)
      .map(v => v.video_id),
  }));
}

export async function saveChannel(channel: TuurChannel) {
  const { error } = await supabase
    .from('tuur_channels')
    .upsert(
      {
        id: channel.id,
        school_id: channel.school_id,
        name: channel.name,
        emoji: channel.emoji || null,
        is_active: true,
      },
      { onConflict: 'id' }
    );
  if (error) throw error;

  const { error: delError } = await supabase
    .from('tuur_channel_videos')
    .delete()
    .eq('channel_id', channel.id);
  if (delError) throw delError;

  if (channel.video_ids.length > 0) {
    const { error: insError } = await supabase
      .from('tuur_channel_videos')
      .insert(channel.video_ids.map((video_id, position) => ({ channel_id: channel.id, video_id, position })));
    if (insError) throw insError;
  }
}

export async function deleteChannel(id: string) {
  const { error } = await supabase.from('tuur_channels').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Usage ----------

/** "yyyy-MM-dd" in local time for `daysAgo` days before today. */
export function dayKey(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function usageDays(studentId: string, lastDays: number): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('tuur_daily_usage')
    .select('usage_date, seconds_watched')
    .eq('student_id', studentId)
    .gte('usage_date', dayKey(lastDays - 1));
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.usage_date] = (out[r.usage_date] ?? 0) + r.seconds_watched;
  return out;
}

export async function topVideos(studentId: string, lastDays: number): Promise<{ title: string; seconds: number }[]> {
  const { data, error } = await supabase
    .from('tuur_video_usage')
    .select('seconds_watched, video:tuur_videos!inner(title)')
    .eq('student_id', studentId)
    .gte('usage_date', dayKey(lastDays - 1));
  if (error) throw error;
  const totals: Record<string, number> = {};
  for (const r of (data ?? []) as unknown as { seconds_watched: number; video: { title: string } }[]) {
    totals[r.video.title] = (totals[r.video.title] ?? 0) + r.seconds_watched;
  }
  return Object.entries(totals)
    .map(([title, seconds]) => ({ title, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

// ---------- Formatting ----------

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0 min';
  if (seconds < 60) return `${seconds} s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} u ${mins % 60} min`;
}

// ---------- Bulk (many children at once) ----------

export interface TuurGroup {
  id: string;
  name: string;
  student_ids: string[];
}

export async function loadGroups(schoolId: string): Promise<TuurGroup[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, members:student_groups(student_id, is_active)')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(g => ({
    id: g.id,
    name: g.name,
    student_ids: (g.members as { student_id: string; is_active: boolean }[])
      .filter(m => m.is_active !== false)
      .map(m => m.student_id),
  }));
}

/** Assign (or un-assign) every video to every student in one request. */
export async function bulkSetAssignments(studentIds: string[], videoIds: string[], assigned: boolean) {
  const rows = studentIds.flatMap(student_id =>
    videoIds.map(video_id => ({ student_id, video_id, is_active: assigned }))
  );
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('tuur_child_videos')
    .upsert(rows, { onConflict: 'student_id,video_id' });
  if (error) throw error;
}

/**
 * Apply only the given fields to each student. Children without a settings row
 * get one with the column defaults for everything not in `patch`.
 */
export async function bulkPatchSettings(studentIds: string[], patch: Partial<TuurSettings>) {
  if (studentIds.length === 0 || Object.keys(patch).length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tuur_child_settings')
    .upsert(studentIds.map(student_id => ({ student_id, ...patch, updated_at: now })), { onConflict: 'student_id' });
  if (error) throw error;
}

/** Replace each target's day schedule with a copy of `blocks` (fresh ids). */
export async function bulkReplaceBlocks(studentIds: string[], blocks: TuurBlock[]) {
  if (studentIds.length === 0) return;
  const { error: delError } = await supabase.from('tuur_child_blocks').delete().in('student_id', studentIds);
  if (delError) throw delError;
  const rows = studentIds.flatMap(student_id =>
    blocks.map((b, position) => ({
      id: crypto.randomUUID(),
      student_id,
      label: b.label,
      start_minute: b.start_minute,
      end_minute: b.end_minute,
      video_ids: b.video_ids,
      position,
    }))
  );
  if (rows.length === 0) return;
  const { error } = await supabase.from('tuur_child_blocks').insert(rows);
  if (error) throw error;
}

/** Make each target's assigned videos exactly `videoIds`. */
export async function bulkReplaceAssignments(studentIds: string[], videoIds: string[]) {
  if (studentIds.length === 0) return;
  const { error } = await supabase
    .from('tuur_child_videos')
    .update({ is_active: false })
    .in('student_id', studentIds)
    .eq('is_active', true);
  if (error) throw error;
  await bulkSetAssignments(studentIds, videoIds, true);
}
