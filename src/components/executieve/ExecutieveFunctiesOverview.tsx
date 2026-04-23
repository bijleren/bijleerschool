import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Brain, BarChart3, ChevronRight, Save, Users } from 'lucide-react';

interface ExecutiveFunction {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
}

interface Assessment {
  executive_function_id: string;
  rating: number;
  support_rating: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Group {
  id: string;
  name: string;
}

interface Props {
  schoolId: string;
  schoolName: string;
  onNavigateToStudent: (studentId: string, studentName: string) => void;
  onNavigateToAnalytics: () => void;
}

const RATING_LABELS = ['---', '--', '-', '0', '+', '++', '+++'];
const RATING_COLORS = ['#dc2626', '#f97316', '#fbbf24', '#6b7280', '#34d399', '#10b981', '#059669'];

function getRatingColor(rating: number): string {
  return RATING_COLORS[rating + 3];
}

function getRatingLabel(rating: number): string {
  return RATING_LABELS[rating + 3];
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold text-white"
      style={{ backgroundColor: getRatingColor(rating) }}
    >
      {getRatingLabel(rating)}
    </span>
  );
}

function RadarChart({
  functions,
  getRating,
  getSupport,
}: {
  functions: ExecutiveFunction[];
  getRating: (id: string) => number;
  getSupport: (id: string) => number;
}) {
  const cx = 130, cy = 130, radius = 90;
  const n = functions.length;

  const pointFor = (index: number, value: number) => {
    const angle = (index * 2 * Math.PI) / n - Math.PI / 2;
    const norm = (value + 3) / 6;
    const minR = radius * 0.17;
    const dist = minR + norm * (radius - minR);
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  };

  const labelPos = (index: number) => {
    const angle = (index * 2 * Math.PI) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * (radius + 24), y: cy + Math.sin(angle) * (radius + 24) };
  };

  const abilityPts = functions.map((f, i) => pointFor(i, getRating(f.id)));
  const supportPts = functions.map((f, i) => pointFor(i, getSupport(f.id)));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <svg width="260" height="260" className="overflow-visible">
      {[0.17, 0.33, 0.5, 0.67, 0.83, 1.0].map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={radius * s} fill="none"
          stroke={i < 3 ? '#d1d5db' : '#e5e7eb'} strokeWidth="1" />
      ))}
      {functions.map((f, i) => {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        return (
          <line key={f.id} x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * radius}
            y2={cy + Math.sin(angle) * radius}
            stroke="#e5e7eb" strokeWidth="1" />
        );
      })}
      <path d={toPath(supportPts)} fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,3" />
      <path d={toPath(abilityPts)} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2" />
      {abilityPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
      ))}
      {supportPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#10b981" stroke="white" strokeWidth="1.5" />
      ))}
      {functions.map((f, i) => {
        const { x, y } = labelPos(i);
        return (
          <g key={f.id}>
            <text x={x} y={y - 6} textAnchor="middle" fontSize="12">{f.icon}</text>
            <text x={x} y={y + 6} textAnchor="middle" fontSize="8" fill="#374151" fontWeight="500">
              {f.name.split(' ')[0]}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="2.5" fill="#374151" />
    </svg>
  );
}

export function ExecutieveFunctiesOverview({ schoolId, schoolName, onNavigateToStudent, onNavigateToAnalytics }: Props) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [executiveFunctions, setExecutiveFunctions] = useState<ExecutiveFunction[]>([]);
  const [assessments, setAssessments] = useState<Record<string, Assessment[]>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, { rating: number; support_rating: number }>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
    fetchExecutiveFunctions();
  }, [schoolId]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchStudents();
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (students.length > 0) {
      fetchAllAssessments();
    }
  }, [students]);

  const fetchGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('id, name')
      .eq('school_id', schoolId)
      .order('name');
    const list = data || [];
    setGroups(list);
    if (list.length > 0) setSelectedGroupId(list[0].id);
  };

  const fetchExecutiveFunctions = async () => {
    const { data } = await supabase
      .from('executive_functions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setExecutiveFunctions(data || []);
  };

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('student_groups')
      .select('students(id, first_name, last_name)')
      .eq('group_id', selectedGroupId)
      .eq('is_active', true);

    const list: Student[] = (data || [])
      .map((r: any) => r.students)
      .filter(Boolean)
      .sort((a: Student, b: Student) => a.last_name.localeCompare(b.last_name));

    setStudents(list);
    setLoading(false);
  };

  const fetchAllAssessments = async () => {
    if (students.length === 0) return;
    const studentIds = students.map(s => s.id);
    const { data } = await supabase
      .from('executive_function_assessments')
      .select('student_id, executive_function_id, rating, support_rating')
      .in('student_id', studentIds);

    const byStudent: Record<string, Assessment[]> = {};
    (data || []).forEach((row: any) => {
      if (!byStudent[row.student_id]) byStudent[row.student_id] = [];
      byStudent[row.student_id].push({
        executive_function_id: row.executive_function_id,
        rating: row.rating,
        support_rating: row.support_rating,
      });
    });
    setAssessments(byStudent);
  };

  const getStudentRating = (studentId: string, functionId: string): number => {
    const pending = pendingChanges[studentId]?.[functionId];
    if (pending !== undefined) return pending.rating;
    return assessments[studentId]?.find(a => a.executive_function_id === functionId)?.rating ?? 0;
  };

  const getStudentSupportRating = (studentId: string, functionId: string): number => {
    const pending = pendingChanges[studentId]?.[functionId];
    if (pending !== undefined) return pending.support_rating;
    return assessments[studentId]?.find(a => a.executive_function_id === functionId)?.support_rating ?? 0;
  };

  const handleRatingChange = (studentId: string, functionId: string, field: 'rating' | 'support_rating', value: number) => {
    setPendingChanges(prev => {
      const existing = prev[studentId]?.[functionId] ?? {
        rating: getStudentRating(studentId, functionId),
        support_rating: getStudentSupportRating(studentId, functionId),
      };
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [functionId]: { ...existing, [field]: value },
        },
      };
    });
  };

  const handleSaveStudent = async (studentId: string) => {
    if (!user) return;
    const changes = pendingChanges[studentId];
    if (!changes || Object.keys(changes).length === 0) return;

    setSaving(studentId);

    const student = students.find(s => s.id === studentId);
    const school = { id: schoolId };

    for (const [functionId, vals] of Object.entries(changes)) {
      const { data: upserted, error } = await supabase
        .from('executive_function_assessments')
        .upsert({
          student_id: studentId,
          executive_function_id: functionId,
          rating: vals.rating,
          support_rating: vals.support_rating,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id,executive_function_id' })
        .select()
        .maybeSingle();

      if (!error) {
        // Write history snapshot
        await supabase.from('executive_function_assessment_history').insert({
          student_id: studentId,
          executive_function_id: functionId,
          rating: vals.rating,
          support_rating: vals.support_rating,
          changed_by: user.id,
          school_id: schoolId,
        });

        // Update local assessments
        setAssessments(prev => {
          const list = [...(prev[studentId] || [])];
          const idx = list.findIndex(a => a.executive_function_id === functionId);
          const entry: Assessment = { executive_function_id: functionId, rating: vals.rating, support_rating: vals.support_rating };
          if (idx >= 0) list[idx] = entry;
          else list.push(entry);
          return { ...prev, [studentId]: list };
        });
      }
    }

    // Clear pending for this student
    setPendingChanges(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });

    setSaving(null);
  };

  const hasPendingChanges = (studentId: string) =>
    Object.keys(pendingChanges[studentId] || {}).length > 0;

  const getInitials = (s: Student) =>
    `${s.first_name[0] ?? ''}${s.last_name[0] ?? ''}`.toUpperCase();

  if (loading && students.length === 0 && selectedGroupId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-600" />
            Executieve Functies
          </h1>
          <p className="text-gray-500 mt-1">{schoolName} — beoordeel leerlingen per executieve functie</p>
        </div>
        <button
          onClick={onNavigateToAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
        >
          <BarChart3 className="w-4 h-4" />
          Analyse
        </button>
      </div>

      {/* Group selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Klas:</span>
        <select
          value={selectedGroupId}
          onChange={e => { setSelectedGroupId(e.target.value); setExpandedStudent(null); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {students.length > 0 && (
          <span className="text-sm text-gray-400">{students.length} leerlingen</span>
        )}
      </div>

      {/* Function legend row */}
      {executiveFunctions.length > 0 && students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Compact table header */}
          <div className="grid grid-cols-[1fr_repeat(8,_2.5rem)] gap-1 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leerling</div>
            {executiveFunctions.map(ef => (
              <div key={ef.id} className="flex flex-col items-center justify-center" title={ef.name}>
                <span className="text-base leading-none">{ef.icon}</span>
                <span className="text-[9px] text-gray-400 mt-0.5 leading-none text-center truncate w-full">{ef.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>

          {/* Student rows */}
          {students.map(student => {
            const isExpanded = expandedStudent === student.id;
            const hasChanges = hasPendingChanges(student.id);
            const isSaving = saving === student.id;

            return (
              <div key={student.id} className="border-b border-gray-50 last:border-0">
                {/* Compact row */}
                <div
                  className={`grid grid-cols-[1fr_repeat(8,_2.5rem)] gap-1 px-4 py-2.5 items-center cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {getInitials(student)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.first_name} {student.last_name}
                      </p>
                    </div>
                    {hasChanges && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                        gewijzigd
                      </span>
                    )}
                  </div>
                  {executiveFunctions.map(ef => (
                    <div key={ef.id} className="flex justify-center">
                      <RatingBadge rating={getStudentRating(student.id, ef.id)} />
                    </div>
                  ))}
                </div>

                {/* Expanded rating panel */}
                {isExpanded && (
                  <div className="bg-blue-50 border-t border-blue-100 px-4 py-4">
                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => onNavigateToStudent(student.id, `${student.first_name} ${student.last_name}`)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                      >
                        Volledig profiel <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleSaveStudent(student.id)}
                        disabled={!hasChanges || isSaving}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          hasChanges && !isSaving
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Opslaan...' : 'Opslaan'}
                      </button>
                    </div>

                    {/* Radar + ratings side by side */}
                    <div className="flex gap-6 items-start">
                      {/* Radar chart */}
                      <div className="hidden lg:flex flex-col items-center bg-white rounded-xl p-4 shadow-sm flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Spinnenwebanalyse</p>
                        <RadarChart
                          functions={executiveFunctions}
                          getRating={(id) => getStudentRating(student.id, id)}
                          getSupport={(id) => getStudentSupportRating(student.id, id)}
                        />
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
                            Vermogen
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 border-t border-dashed border-green-500 inline-block" />
                            Ondersteuning
                          </span>
                        </div>
                      </div>

                      {/* Function cards */}
                      <div className="flex-1 space-y-3 min-w-0">

                    {executiveFunctions.map(ef => (
                      <div key={ef.id} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{ef.icon}</span>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{ef.name}</p>
                            <p className="text-xs text-gray-500">{ef.description}</p>
                          </div>
                        </div>

                        {/* Ability rating */}
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Hoe goed is de leerling hierin?</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {RATING_LABELS.map((label, i) => {
                              const val = i - 3;
                              const active = getStudentRating(student.id, ef.id) === val;
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleRatingChange(student.id, ef.id, 'rating', val)}
                                  className={`w-10 h-9 rounded-lg border-2 text-xs font-bold transition-all ${
                                    active ? 'border-transparent text-white shadow-sm scale-105' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                  }`}
                                  style={active ? { backgroundColor: RATING_COLORS[i] } : {}}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Support rating */}
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Hoe goed kan de leerling zichzelf ondersteunen?</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {RATING_LABELS.map((label, i) => {
                              const val = i - 3;
                              const active = getStudentSupportRating(student.id, ef.id) === val;
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleRatingChange(student.id, ef.id, 'support_rating', val)}
                                  className={`w-10 h-9 rounded-lg border-2 text-xs font-bold transition-all ${
                                    active ? 'border-transparent text-white shadow-sm scale-105' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                  }`}
                                  style={active ? { backgroundColor: RATING_COLORS[i], filter: 'brightness(0.9)' } : {}}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {students.length === 0 && selectedGroupId && !loading && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-100">
          <Users className="w-10 h-10 mb-2 opacity-40" />
          <p>Geen leerlingen in deze klas</p>
        </div>
      )}
    </div>
  );
}
