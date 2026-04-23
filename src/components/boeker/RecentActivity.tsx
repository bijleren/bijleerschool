import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { BookOpen, Clock, FileText, Mic, Play, Pause, ChevronRight, Calendar, BookMarked, Users, ChevronDown } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
}

interface Session {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  start_page: number | null;
  end_page: number | null;
  pages_read: number | null;
  notes: string | null;
  audio_url: string | null;
  emotion: string | null;
  student_id: string;
  book_id: string;
  students: {
    id: string;
    first_name: string;
    last_name: string;
    color: string | null;
  };
  books: {
    id: string;
    title: string;
    author: string | null;
    cover_image_url: string | null;
    custom_cover_url: string | null;
    page_count: number | null;
  };
}

interface RecentActivityProps {
  schoolId: string;
  onViewStudent: (studentId: string) => void;
}

const EMOTION_MAP: Record<string, { emoji: string; label: string }> = {
  happy: { emoji: '😊', label: 'Blij' },
  excited: { emoji: '🤩', label: 'Enthousiast' },
  calm: { emoji: '😌', label: 'Rustig' },
  tired: { emoji: '😴', label: 'Moe' },
  bored: { emoji: '😑', label: 'Verveeld' },
  frustrated: { emoji: '😤', label: 'Gefrustreerd' },
  sad: { emoji: '😢', label: 'Verdrietig' },
};

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      setLoading(true);
      try {
        await audio.play();
      } finally {
        setLoading(false);
      }
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-2">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress(a.currentTime / a.duration);
        }}
      />
      <button
        onClick={toggle}
        disabled={loading}
        className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {loading ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : playing ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>
      <div className="flex-1">
        <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] text-blue-600 font-medium tabular-nums flex-shrink-0">
        {duration > 0 ? formatTime(duration) : <Mic className="w-3.5 h-3.5" />}
      </span>
    </div>
  );
}

export function RecentActivity({ schoolId, onViewStudent }: RecentActivityProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  useEffect(() => {
    loadGroups();
  }, [schoolId]);

  useEffect(() => {
    fetchRecentActivity(selectedGroupId);
  }, [schoolId, selectedGroupId]);

  const loadGroups = async () => {
    const [groupsRes, prefsRes] = await Promise.all([
      supabase
        .from('groups')
        .select('id, name, grade_level')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name'),
      user
        ? supabase
            .from('user_preferences')
            .select('last_group_id')
            .eq('user_id', user.id)
            .eq('school_id', schoolId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const fetchedGroups = groupsRes.data || [];
    setGroups(fetchedGroups);

    const savedId = (prefsRes as any).data?.last_group_id;
    if (savedId && fetchedGroups.some(g => g.id === savedId)) {
      setSelectedGroupId(savedId);
    } else if (fetchedGroups.length > 0) {
      setSelectedGroupId(fetchedGroups[0].id);
    }
  };

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroupId(groupId);
    if (!user) return;
    await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, school_id: schoolId, last_group_id: groupId || null, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,school_id' }
      );
  };

  const fetchRecentActivity = async (groupId: string) => {
    setLoading(true);
    try {
      let studentIds: string[] = [];

      if (groupId) {
        const { data: sgData } = await supabase
          .from('student_groups')
          .select('student_id')
          .eq('group_id', groupId)
          .eq('is_active', true);
        studentIds = (sgData || []).map((r: any) => r.student_id);
      } else {
        const { data: schoolStudents } = await supabase
          .from('students')
          .select('id')
          .eq('school_id', schoolId)
          .eq('is_active', true);
        studentIds = (schoolStudents || []).map((s: any) => s.id);
      }

      if (!studentIds.length) {
        setSessions([]);
        return;
      }

      const { data, error } = await supabase
        .from('reading_sessions')
        .select(`
          id, start_time, end_time, duration_minutes,
          start_page, end_page, pages_read, notes,
          audio_url, emotion, student_id, book_id,
          students (id, first_name, last_name, color),
          books (id, title, author, cover_image_url, custom_cover_url, page_count)
        `)
        .in('student_id', studentIds)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSessions((data as unknown as Session[]) || []);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const grouped = React.useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      if (!map.has(s.student_id)) map.set(s.student_id, []);
      map.get(s.student_id)!.push(s);
    }
    // Return sorted by most recent session per student
    return Array.from(map.entries())
      .sort((a, b) => new Date(b[1][0].start_time).getTime() - new Date(a[1][0].start_time).getTime());
  }, [sessions]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

  const getInitials = (s: Session) =>
    `${s.students.first_name[0]}${s.students.last_name[0]}`.toUpperCase();

  const getAvatarColor = (s: Session) => s.students.color || '#3B82F6';

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const GroupSelector = (
    <div className="relative">
      <div className="flex items-center gap-2 pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-400 transition-colors min-w-[180px]">
        <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={selectedGroupId}
          onChange={e => handleGroupChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full cursor-pointer"
        >
          {groups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}{g.grade_level ? ` (${g.grade_level})` : ''}
            </option>
          ))}
        </select>
        <span className="flex-1 truncate">
          {selectedGroup ? selectedGroup.name : 'Kies klas'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">{GroupSelector}</div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">{GroupSelector}</div>
        <Card>
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nog geen leesactiviteit</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedGroup
                ? `${selectedGroup.name} heeft nog geen voltooide leessessies.`
                : 'Zodra leerlingen leessessies voltooien, verschijnen ze hier.'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {GroupSelector}
        <p className="text-sm text-gray-500">{grouped.length} leerlingen · {sessions.length} sessies</p>
      </div>

      <div className="space-y-3">
        {grouped.map(([studentId, studentSessions]) => {
          const latest = studentSessions[0];
          const isExpanded = expandedId === studentId;
          const totalPages = studentSessions.reduce((sum, s) => sum + (s.pages_read || 0), 0);
          const totalMinutes = studentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
          const hasAudio = studentSessions.some(s => s.audio_url);

          return (
            <Card key={studentId} className="overflow-hidden">
              {/* Student header row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : studentId)}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(latest) }}
                >
                  {getInitials(latest)}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {latest.students.first_name} {latest.students.last_name}
                    </span>
                    {hasAudio && (
                      <span className="flex items-center gap-1 text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                        <Mic className="w-3 h-3" />
                        opname
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(latest.start_time)}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <BookMarked className="w-3 h-3" />
                      {studentSessions.length} {studentSessions.length === 1 ? 'sessie' : 'sessies'}
                    </span>
                    <span className="text-xs text-gray-500">{totalPages} pag. · {totalMinutes} min.</span>
                  </div>
                </div>

                {/* Latest book cover */}
                <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {(latest.books.custom_cover_url || latest.books.cover_image_url) ? (
                    <img
                      src={latest.books.custom_cover_url || latest.books.cover_image_url || ''}
                      alt={latest.books.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Go-to-student button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onViewStudent(studentId); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                >
                  Leerling
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Expand chevron */}
                <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>

              {/* Expanded sessions */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {studentSessions.map((session) => {
                    const cover = session.books.custom_cover_url || session.books.cover_image_url;
                    const progressPct = session.books.page_count && session.end_page
                      ? Math.round((session.end_page / session.books.page_count) * 100)
                      : null;
                    const emotion = session.emotion ? EMOTION_MAP[session.emotion] : null;

                    return (
                      <div key={session.id} className="p-4 pl-16 bg-gray-50/50">
                        <div className="flex items-start gap-3">
                          {/* Book cover */}
                          <div className="w-9 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {cover ? (
                              <img src={cover} alt={session.books.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Book title */}
                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{session.books.title}</p>
                            {session.books.author && (
                              <p className="text-xs text-gray-500 line-clamp-1">{session.books.author}</p>
                            )}

                            {/* Session meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <span className="text-xs text-gray-500">
                                {formatDate(session.start_time)} · {formatTime(session.start_time)}
                              </span>
                              {session.duration_minutes != null && (
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  {session.duration_minutes} min.
                                </span>
                              )}
                              {session.pages_read != null && session.pages_read > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  <BookOpen className="w-3 h-3" />
                                  {session.pages_read} pag.
                                  {session.start_page && session.end_page && (
                                    <span className="text-gray-400">(p.{session.start_page}–{session.end_page})</span>
                                  )}
                                </span>
                              )}
                              {emotion && (
                                <span className="text-xs" title={emotion.label}>
                                  {emotion.emoji} {emotion.label}
                                </span>
                              )}
                            </div>

                            {/* Progress bar */}
                            {progressPct !== null && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-gray-500 tabular-nums">{progressPct}%</span>
                              </div>
                            )}

                            {/* Notes */}
                            {session.notes && (
                              <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-md px-2.5 py-2">
                                <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                                <span>{session.notes}</span>
                              </div>
                            )}

                            {/* Audio player */}
                            {session.audio_url && (
                              <AudioPlayer url={session.audio_url} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}


export { RecentActivity }