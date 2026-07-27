import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, AlertCircle, User, ChevronDown, ChevronUp } from 'lucide-react';

interface HistoryEntry {
  id: string;
  student_id: string;
  spoor_id: string;
  spoor_name: string;
  spoor_color: string;
  is_current: boolean;
  assigned_at: string;
  needs_attention: boolean;
}

interface StudentTimeline {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_number: string | null;
  segments: TimelineSegment[];
  currentSpoorName: string;
  currentSpoorColor: string;
  changesCount: number;
  hasAttention: boolean;
}

interface TimelineSegment {
  spoor_id: string;
  spoor_name: string;
  spoor_color: string;
  start: Date;
  end: Date | null;
  durationDays: number;
}

interface Spoor {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface SporenTimelineProps {
  schoolId: string;
  groupId: string;
  subjectId: string;
  groupName: string;
  subjectName: string;
  sporen: Spoor[];
}

export function SporenTimeline({ schoolId, groupId, subjectId, groupName, subjectName, sporen }: SporenTimelineProps) {
  const [studentTimelines, setStudentTimelines] = useState<StudentTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'changes' | 'spoor'>('name');
  const [filterSpoorId, setFilterSpoorId] = useState<string>('');

  useEffect(() => {
    if (groupId && subjectId) {
      loadTimelines();
    }
  }, [groupId, subjectId]);

  const loadTimelines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_spoor_assignments')
        .select(`
          id,
          student_id,
          spoor_id,
          is_current,
          assigned_at,
          needs_attention,
          students!student_spoor_assignments_student_id_fkey(first_name, last_name, student_number),
          sporen!student_spoor_assignments_spoor_id_fkey(name, color)
        `)
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      const rawEntries: HistoryEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        spoor_id: row.spoor_id,
        spoor_name: row.sporen?.name || '',
        spoor_color: row.sporen?.color || '#6b7280',
        is_current: row.is_current,
        assigned_at: row.assigned_at,
        needs_attention: row.needs_attention,
      }));

      const studentMap: Record<string, { info: any; entries: HistoryEntry[] }> = {};

      for (const entry of rawEntries) {
        if (!studentMap[entry.student_id]) {
          const rowData = data?.find((r: any) => r.student_id === entry.student_id);
          studentMap[entry.student_id] = {
            info: rowData?.students || {},
            entries: [],
          };
        }
        studentMap[entry.student_id].entries.push(entry);
      }

      const timelines: StudentTimeline[] = Object.entries(studentMap).map(([studentId, { info, entries }]) => {
        const sorted = [...entries].sort(
          (a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime()
        );

        const segments: TimelineSegment[] = sorted.map((entry, i) => {
          const nextEntry = sorted[i + 1];
          const start = new Date(entry.assigned_at);
          const end = nextEntry ? new Date(nextEntry.assigned_at) : null;
          const durationMs = end ? end.getTime() - start.getTime() : Date.now() - start.getTime();
          const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
          return {
            spoor_id: entry.spoor_id,
            spoor_name: entry.spoor_name,
            spoor_color: entry.spoor_color,
            start,
            end,
            durationDays,
          };
        });

        const currentEntry = sorted.find((e) => e.is_current) || sorted[sorted.length - 1];

        return {
          student_id: studentId,
          student_first_name: info.first_name || '',
          student_last_name: info.last_name || '',
          student_number: info.student_number || null,
          segments,
          currentSpoorName: currentEntry?.spoor_name || '',
          currentSpoorColor: currentEntry?.spoor_color || '#6b7280',
          changesCount: sorted.length - 1,
          hasAttention: entries.some((e) => e.is_current && e.needs_attention),
        };
      });

      setStudentTimelines(timelines);
    } catch (err) {
      console.error('Error loading spoor timelines:', err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...studentTimelines]
    .filter((st) => filterSpoorId === '' || st.segments.some((s) => s.spoor_id === filterSpoorId && !s.end))
    .sort((a, b) => {
      if (sortBy === 'changes') return b.changesCount - a.changesCount;
      if (sortBy === 'spoor') {
        const spoorA = sporen.find((s) => s.name === a.currentSpoorName)?.sort_order ?? 999;
        const spoorB = sporen.find((s) => s.name === b.currentSpoorName)?.sort_order ?? 999;
        if (spoorA !== spoorB) return spoorA - spoorB;
      }
      return `${a.student_last_name} ${a.student_first_name}`.localeCompare(
        `${b.student_last_name} ${b.student_first_name}`, 'nl'
      );
    });

  const allMinDate = studentTimelines.length > 0
    ? new Date(Math.min(...studentTimelines.flatMap((st) => st.segments.map((s) => s.start.getTime()))))
    : new Date();
  const totalDays = Math.max(
    1,
    Math.ceil((Date.now() - allMinDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const formatDuration = (days: number) => {
    if (days < 7) return `${days}d`;
    if (days < 31) return `${Math.round(days / 7)}w`;
    return `${Math.round(days / 30)}m`;
  };

  const formatDate = (d: Date) => d.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (studentTimelines.length === 0) {
    return (
      <div className="text-center py-16">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Nog geen spoor-toewijzingen beschikbaar voor een tijdlijn</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Sorteren:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['name', 'spoor', 'changes'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-1.5 text-xs border-l border-gray-300 first:border-l-0 transition-colors ${
                  sortBy === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {key === 'name' ? 'Naam' : key === 'spoor' ? 'Huidig spoor' : 'Wijzigingen'}
              </button>
            ))}
          </div>
        </div>
        <select
          value={filterSpoorId}
          onChange={(e) => setFilterSpoorId(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Alle sporen</option>
          {sporen.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 grid grid-cols-[200px_1fr_80px] gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Leerling</span>
          <span>Tijdlijn ({formatDate(allMinDate)} — vandaag)</span>
          <span className="text-right">Wijz.</span>
        </div>

        <div className="divide-y divide-gray-100">
          {sorted.map((st) => {
            const isExpanded = expandedStudentId === st.student_id;
            return (
              <div key={st.student_id} className="bg-white">
                <div
                  className="grid grid-cols-[200px_1fr_80px] gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedStudentId(isExpanded ? null : st.student_id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: st.currentSpoorColor }}
                    >
                      {st.student_first_name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {st.student_first_name} {st.student_last_name}
                        {st.hasAttention && <AlertCircle className="inline w-3 h-3 text-red-500 ml-1" />}
                      </div>
                      <div
                        className="text-xs px-1.5 py-0.5 rounded-full text-white inline-block mt-0.5"
                        style={{ backgroundColor: st.currentSpoorColor }}
                      >
                        {st.currentSpoorName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-full h-6 rounded-full overflow-hidden flex bg-gray-100">
                      {st.segments.map((seg, i) => {
                        const segDays = seg.durationDays;
                        const widthPct = Math.max(2, (segDays / totalDays) * 100);
                        return (
                          <div
                            key={i}
                            className="h-full flex-shrink-0 relative group"
                            style={{ width: `${widthPct}%`, backgroundColor: seg.spoor_color }}
                            title={`${seg.spoor_name}: ${formatDuration(seg.durationDays)}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <span className="text-sm font-semibold text-gray-700">{st.changesCount}</span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="mt-3 space-y-2">
                      {st.segments.map((seg, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.spoor_color }} />
                          <span
                            className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                            style={{ backgroundColor: seg.spoor_color }}
                          >
                            {seg.spoor_name}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {formatDate(seg.start)}
                            {seg.end ? ` → ${formatDate(seg.end)}` : ' → heden'}
                          </span>
                          <span className="ml-auto text-xs font-medium text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                            {formatDuration(seg.durationDays)}
                            {!seg.end && ' (lopend)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {sporen.map((spoor) => {
          const count = studentTimelines.filter((st) => st.currentSpoorName === spoor.name).length;
          if (count === 0) return null;
          return (
            <div key={spoor.id} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spoor.color }} />
              <span className="text-gray-700">{spoor.name}</span>
              <span className="text-gray-400 font-medium">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
