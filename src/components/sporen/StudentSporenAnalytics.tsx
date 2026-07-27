import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, AlertCircle, ChevronDown, ChevronUp, TrendingUp, Flag, BookOpen } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
}

interface SubjectSession {
  subject_id: string;
  subject_name: string;
  subject_color: string;
  spoor_id: string;
  spoor_name: string;
  spoor_color: string;
  assigned_at: string;
  is_current: boolean;
  needs_attention: boolean;
  change_notes: string | null;
  group_name: string;
  durationDays: number;
  endDate: Date | null;
}

interface SubjectHistory {
  subject_id: string;
  subject_name: string;
  subject_color: string;
  group_name: string;
  sessions: SubjectSession[];
  currentSpoorName: string;
  currentSpoorColor: string;
  hasAttention: boolean;
  totalChanges: number;
}

interface StudentSporenAnalyticsProps {
  schoolId: string;
  groups: { id: string; name: string; grade_level: string | null }[];
}

export function StudentSporenAnalytics({ schoolId, groups }: StudentSporenAnalyticsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjectHistories, setSubjectHistories] = useState<SubjectHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, [schoolId, groups]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentHistory();
    } else {
      setSubjectHistories([]);
    }
  }, [selectedStudentId]);

  const loadStudents = async () => {
    if (!groups.length) {
      setLoadingStudents(false);
      return;
    }
    setLoadingStudents(true);
    try {
      const groupIds = groups.map((g) => g.id);
      const { data, error } = await supabase
        .from('student_groups')
        .select('students!inner(id, first_name, last_name, student_number, is_active)')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .eq('students.is_active', true);

      if (error) throw error;

      const seen = new Set<string>();
      const unique: Student[] = [];
      for (const row of data || []) {
        const s = (row as any).students;
        if (s && !seen.has(s.id)) {
          seen.add(s.id);
          unique.push({ id: s.id, first_name: s.first_name, last_name: s.last_name, student_number: s.student_number });
        }
      }
      unique.sort((a, b) => a.last_name.localeCompare(b.last_name, 'nl') || a.first_name.localeCompare(b.first_name, 'nl'));
      setStudents(unique);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadStudentHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_spoor_assignments')
        .select(`
          id,
          spoor_id,
          school_subject_id,
          group_id,
          is_current,
          assigned_at,
          needs_attention,
          change_notes,
          sporen!student_spoor_assignments_spoor_id_fkey(name, color),
          school_subjects!student_spoor_assignments_school_subject_id_fkey(title, color)
        `)
        .eq('student_id', selectedStudentId)
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      const rows = data || [];

      const subjectMap: Record<string, {
        subject_id: string;
        subject_name: string;
        subject_color: string;
        group_id: string;
        sessions: any[];
      }> = {};

      for (const row of rows) {
        const subjectId = row.school_subject_id;
        if (!subjectMap[subjectId]) {
          subjectMap[subjectId] = {
            subject_id: subjectId,
            subject_name: (row.school_subjects as any)?.title || '',
            subject_color: (row.school_subjects as any)?.color || '#6b7280',
            group_id: row.group_id,
            sessions: [],
          };
        }
        subjectMap[subjectId].sessions.push(row);
      }

      const histories: SubjectHistory[] = Object.values(subjectMap).map((entry) => {
        const sorted = [...entry.sessions].sort(
          (a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime()
        );

        const sessions: SubjectSession[] = sorted.map((row, i) => {
          const nextRow = sorted[i + 1];
          const start = new Date(row.assigned_at);
          const end = nextRow ? new Date(nextRow.assigned_at) : null;
          const durationMs = end ? end.getTime() - start.getTime() : Date.now() - start.getTime();
          const durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));
          const groupName = groups.find((g) => g.id === row.group_id)?.name || '';

          return {
            subject_id: entry.subject_id,
            subject_name: entry.subject_name,
            subject_color: entry.subject_color,
            spoor_id: row.spoor_id,
            spoor_name: (row.sporen as any)?.name || '',
            spoor_color: (row.sporen as any)?.color || '#6b7280',
            assigned_at: row.assigned_at,
            is_current: row.is_current,
            needs_attention: row.needs_attention,
            change_notes: row.change_notes || null,
            group_name: groupName,
            durationDays,
            endDate: end,
          };
        });

        const currentSession = sessions.find((s) => s.is_current) || sessions[sessions.length - 1];

        return {
          subject_id: entry.subject_id,
          subject_name: entry.subject_name,
          subject_color: entry.subject_color,
          group_name: sessions[0]?.group_name || '',
          sessions,
          currentSpoorName: currentSession?.spoor_name || '',
          currentSpoorColor: currentSession?.spoor_color || '#6b7280',
          hasAttention: sessions.some((s) => s.is_current && s.needs_attention),
          totalChanges: sessions.length - 1,
        };
      });

      histories.sort((a, b) => a.subject_name.localeCompare(b.subject_name, 'nl'));
      setSubjectHistories(histories);

      if (histories.length > 0 && !expandedSubjectId) {
        setExpandedSubjectId(histories[0].subject_id);
      }
    } catch (err) {
      console.error('Error loading student spoor history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDuration = (days: number) => {
    if (days === 0) return 'Minder dan 1 dag';
    if (days < 7) return `${days} dag${days !== 1 ? 'en' : ''}`;
    if (days < 31) return `${Math.round(days / 7)} week${Math.round(days / 7) !== 1 ? 'en' : ''}`;
    const months = Math.round(days / 30);
    return `${months} maand${months !== 1 ? 'en' : ''}`;
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.student_number && s.student_number.toLowerCase().includes(q))
    );
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const allMinDate =
    subjectHistories.length > 0 && subjectHistories[0].sessions.length > 0
      ? new Date(
          Math.min(
            ...subjectHistories.flatMap((h) =>
              h.sessions.map((s) => new Date(s.assigned_at).getTime())
            )
          )
        )
      : null;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-#946B29" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Leerling selecteren</h3>
            <p className="text-xs text-gray-500">Bekijk de spoor-geschiedenis van een specifieke leerling</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Zoeken</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Naam of leerlingnummer..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Leerling</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setExpandedSubjectId(null);
              }}
              disabled={loadingStudents}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {loadingStudents ? 'Laden...' : `Selecteer een leerling (${filteredStudents.length})`}
              </option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name}{s.student_number ? ` — ${s.student_number}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedStudentId && (
        <div className="text-center py-16 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecteer een leerling om de spoor-geschiedenis te zien</p>
        </div>
      )}

      {selectedStudentId && loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29"></div>
        </div>
      )}

      {selectedStudentId && !loading && subjectHistories.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Nog geen spoor-toewijzingen gevonden voor{' '}
            <span className="font-medium">{selectedStudent?.first_name} {selectedStudent?.last_name}</span>
          </p>
        </div>
      )}

      {selectedStudentId && !loading && subjectHistories.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {selectedStudent?.first_name} {selectedStudent?.last_name}
                {selectedStudent?.student_number && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    #{selectedStudent.student_number}
                  </span>
                )}
              </h3>
              {allMinDate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Gevolgd sinds {formatDate(allMinDate)} &bull; {subjectHistories.length} vak{subjectHistories.length !== 1 ? 'ken' : ''}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {subjectHistories.filter((h) => h.hasAttention).length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                  <Flag className="w-3 h-3" />
                  Aandacht nodig
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{subjectHistories.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Vakken</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {subjectHistories.reduce((sum, h) => sum + h.totalChanges, 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Totale wijzigingen</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {subjectHistories.filter((h) => h.hasAttention).length}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Vereisen aandacht</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {allMinDate
                  ? formatDuration(Math.round((Date.now() - allMinDate.getTime()) / (1000 * 60 * 60 * 24)))
                  : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">In systeem</div>
            </div>
          </div>

          <div className="space-y-3">
            {subjectHistories.map((history) => {
              const isExpanded = expandedSubjectId === history.subject_id;
              const currentSession = history.sessions.find((s) => s.is_current) || history.sessions[history.sessions.length - 1];
              const totalDays = history.sessions.reduce((sum, s) => sum + s.durationDays, 0) || 1;

              return (
                <div key={history.subject_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => setExpandedSubjectId(isExpanded ? null : history.subject_id)}
                  >
                    <div
                      className="w-2.5 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: history.subject_color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{history.subject_name}</span>
                        {history.group_name && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {history.group_name}
                          </span>
                        )}
                        {history.hasAttention && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Aandacht
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span
                          className="text-xs text-white px-2.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: history.currentSpoorColor }}
                        >
                          {history.currentSpoorName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {history.sessions.length} sessie{history.sessions.length !== 1 ? 's' : ''}
                          {history.totalChanges > 0 && ` · ${history.totalChanges} wijziging${history.totalChanges !== 1 ? 'en' : ''}`}
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                      <div className="w-32 h-3 rounded-full overflow-hidden flex bg-gray-100">
                        {history.sessions.map((seg, i) => {
                          const widthPct = Math.max(3, (seg.durationDays / totalDays) * 100);
                          return (
                            <div
                              key={i}
                              className="h-full flex-shrink-0"
                              style={{
                                width: `${widthPct}%`,
                                backgroundColor: seg.spoor_color,
                              }}
                              title={`${seg.spoor_name}: ${formatDuration(seg.durationDays)}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                      <div className="space-y-2">
                        {[...history.sessions].reverse().map((session, i) => {
                          const isFirst = i === history.sessions.length - 1;
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                session.is_current
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div
                                className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                                style={{ backgroundColor: session.spoor_color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="text-xs font-medium text-white px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: session.spoor_color }}
                                  >
                                    {session.spoor_name}
                                  </span>
                                  {session.is_current && (
                                    <span className="text-xs text-#946B29 font-medium">Huidig</span>
                                  )}
                                  {session.needs_attention && (
                                    <span className="flex items-center gap-1 text-xs text-red-600">
                                      <Flag className="w-3 h-3" />
                                      Aandacht
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-xs text-gray-500">
                                    {formatDate(session.assigned_at)}
                                    {session.endDate
                                      ? ` — ${formatDate(session.endDate)}`
                                      : ' — heden'}
                                  </span>
                                  <span className="text-xs font-medium text-gray-700">
                                    {formatDuration(session.durationDays)}
                                    {!session.endDate && ' (lopend)'}
                                  </span>
                                </div>
                                {session.change_notes && (
                                  <p className="text-xs text-gray-500 mt-1 italic">
                                    "{session.change_notes}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">Tijdsindeling per spoor</p>
                        <div className="space-y-1.5">
                          {Object.entries(
                            history.sessions.reduce<Record<string, { name: string; color: string; days: number }>>((acc, s) => {
                              if (!acc[s.spoor_id]) {
                                acc[s.spoor_id] = { name: s.spoor_name, color: s.spoor_color, days: 0 };
                              }
                              acc[s.spoor_id].days += s.durationDays;
                              return acc;
                            }, {})
                          ).sort(([, a], [, b]) => b.days - a.days).map(([id, { name, color, days }]) => {
                            const pct = Math.round((days / totalDays) * 100);
                            return (
                              <div key={id} className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-xs text-gray-700 w-28 truncate">{name}</span>
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-20 text-right">
                                  {formatDuration(days)} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
