import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Brain, BarChart3, ChevronRight, Save, Users, Download, ChevronDown, ChevronUp, Info, LayoutGrid } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  onNavigateToGedragskaart: () => void;
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
  compact = false,
}: {
  functions: ExecutiveFunction[];
  getRating: (id: string) => number;
  getSupport: (id: string) => number;
  compact?: boolean;
}) {
  const size = compact ? 120 : 130;
  const radius = compact ? 55 : 90;
  const cx = size, cy = size;
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
    const labelR = compact ? radius + 18 : radius + 24;
    return { x: cx + Math.cos(angle) * labelR, y: cy + Math.sin(angle) * labelR };
  };

  const abilityPts = functions.map((f, i) => pointFor(i, getRating(f.id)));
  const supportPts = functions.map((f, i) => pointFor(i, getSupport(f.id)));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  const svgSize = size * 2;
  return (
    <svg width={svgSize} height={svgSize} className="overflow-visible">
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
            <text x={x} y={y - (compact ? 5 : 6)} textAnchor="middle" fontSize={compact ? 13 : 12}>{f.icon}</text>
            {!compact && (
              <text x={x} y={y + 6} textAnchor="middle" fontSize="8" fill="#374151" fontWeight="500">
                {f.name.split(' ')[0]}
              </text>
            )}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={compact ? 1.5 : 2.5} fill="#374151" />
    </svg>
  );
}

export function ExecutieveFunctiesOverview({ schoolId, schoolName, onNavigateToStudent, onNavigateToAnalytics, onNavigateToGedragskaart }: Props) {
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
  const [infoOpen, setInfoOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'beoordeling' | 'profielen'>('beoordeling');

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

  // Collapse info block once any real assessment data exists
  useEffect(() => {
    const hasData = Object.values(assessments).some(arr => arr.length > 0);
    if (hasData) setInfoOpen(false);
  }, [assessments]);

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

  const handleExport = () => {
    const groupName = groups.find(g => g.id === selectedGroupId)?.name ?? 'Klas';
    const ratingLabel = (r: number) => ['---', '--', '-', '0', '+', '++', '+++'][r + 3];

    // Sheet 1: flat table — one row per student/function combination
    const flatRows = students.flatMap(student =>
      executiveFunctions.map(ef => ({
        Leerling: `${student.last_name} ${student.first_name}`,
        Klas: groupName,
        School: schoolName,
        Functie: ef.name,
        Vermogen: ratingLabel(getStudentRating(student.id, ef.id)),
        'Vermogen (getal)': getStudentRating(student.id, ef.id),
        Zelfondersteuning: ratingLabel(getStudentSupportRating(student.id, ef.id)),
        'Zelfondersteuning (getal)': getStudentSupportRating(student.id, ef.id),
      }))
    );

    // Sheet 2: matrix — students as rows, functions as columns
    const matrixRows = students.map(student => {
      const row: Record<string, string | number> = {
        Leerling: `${student.last_name} ${student.first_name}`,
        Klas: groupName,
      };
      executiveFunctions.forEach(ef => {
        row[`${ef.name} — Vermogen`] = ratingLabel(getStudentRating(student.id, ef.id));
        row[`${ef.name} — Ondersteuning`] = ratingLabel(getStudentSupportRating(student.id, ef.id));
      });
      return row;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flatRows), 'Details');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrixRows), 'Matrix');
    XLSX.writeFile(wb, `Executieve_Functies_${groupName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading && students.length === 0 && selectedGroupId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-600" />
            Executieve Functies
          </h1>
          <p className="text-gray-500 mt-1">{schoolName} — beoordeel leerlingen per executieve functie</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            disabled={students.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exporteer
          </button>
          <button
            onClick={onNavigateToAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            Analyse
          </button>
          <button
            onClick={onNavigateToGedragskaart}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <LayoutGrid className="w-4 h-4" />
            Gedragskaart
          </button>
        </div>
      </div>

      {/* Info block */}
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setInfoOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <Info className="w-4 h-4 flex-shrink-0" />
            Wat is het doel van deze pagina?
          </div>
          {infoOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {infoOpen && (
          <div className="px-5 pb-6 border-t border-blue-50">
            <div className="flex flex-col lg:flex-row gap-8 pt-5">
              {/* Text column */}
              <div className="flex-1 space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>
                  Met deze pagina breng je de <strong className="text-gray-800">executieve functies</strong> van elke leerling in kaart.
                  Executieve functies zijn de mentale vaardigheden die helpen bij plannen, focussen, impulsen beheersen en flexibel denken.
                </p>
                <p>
                  Voor elke functie geef je twee scores op een schaal van <strong className="text-gray-800">--- tot +++</strong>:
                </p>
                <ul className="space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                    <span><strong className="text-gray-800">Vermogen</strong> — hoe sterk is de leerling in deze functie?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span><strong className="text-gray-800">Zelfondersteuning</strong> — hoe goed kan de leerling zichzelf hierin helpen?</span>
                  </li>
                </ul>
                <p>
                  De scores verschijnen direct in het <strong className="text-gray-800">spinnenwebdiagram</strong> (zie rechts).
                  Zo zie je in een oogopslag waar een leerling sterk in is en waar er ruimte is voor groei.
                  Via <strong className="text-gray-800">Analyse</strong> bekijk je de gemiddelden per klas of school.
                </p>
              </div>

              {/* Demo radar column */}
              <div className="flex flex-col items-center flex-shrink-0">
                <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Voorbeelddiagram</p>
                {executiveFunctions.length > 0 && (() => {
                  const DEMO_RATINGS: Record<number, number> = { 0: 2, 1: 1, 2: -1, 3: 1, 4: -2, 5: 0, 6: 1, 7: 2 };
                  const DEMO_SUPPORT: Record<number, number> = { 0: 1, 1: 2, 2: 0, 3: 2, 4: -1, 5: 1, 6: 0, 7: 1 };
                  return (
                    <RadarChart
                      functions={executiveFunctions}
                      getRating={(id) => DEMO_RATINGS[executiveFunctions.findIndex(f => f.id === id)] ?? 0}
                      getSupport={(id) => DEMO_SUPPORT[executiveFunctions.findIndex(f => f.id === id)] ?? 0}
                    />
                  );
                })()}
                <div className="flex gap-5 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-blue-500 inline-block rounded" />
                    Vermogen
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-0 border-t-2 border-dashed border-emerald-500 inline-block" />
                    Ondersteuning
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Group selector + tab toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-sm font-medium">
          <button
            onClick={() => setActiveTab('beoordeling')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${activeTab === 'beoordeling' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users className="w-3.5 h-3.5" />
            Beoordeling
          </button>
          <button
            onClick={() => setActiveTab('profielen')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${activeTab === 'profielen' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Brain className="w-3.5 h-3.5" />
            Profielen
          </button>
        </div>
      </div>

      {/* ── PROFIELEN TAB ── */}
      {activeTab === 'profielen' && (
        <>
          {students.length > 0 && executiveFunctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {students.map(student => (
                <button
                  key={student.id}
                  onClick={() => onNavigateToStudent(student.id, `${student.first_name} ${student.last_name}`)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center hover:shadow-md hover:border-blue-200 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold mb-3 group-hover:bg-blue-200 transition-colors flex-shrink-0">
                    {getInitials(student)}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 text-center mb-4 leading-tight">
                    {student.first_name} {student.last_name}
                  </p>
                  <RadarChart
                    functions={executiveFunctions}
                    getRating={(id) => getStudentRating(student.id, id)}
                    getSupport={(id) => getStudentSupportRating(student.id, id)}
                    compact
                  />
                  <div className="flex gap-3 mt-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
                      Vermogen
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 border-t border-dashed border-emerald-500 inline-block" />
                      Ondersteuning
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-100">
              <Users className="w-10 h-10 mb-2 opacity-40" />
              <p>Geen leerlingen in deze klas</p>
            </div>
          )}
        </>
      )}

      {/* ── BEOORDELING TAB ── */}
      {activeTab === 'beoordeling' && executiveFunctions.length > 0 && students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          {/* Compact table header */}
          <div
            className="px-4 py-3 bg-gray-50 border-b border-gray-100 min-w-max"
            style={{ display: 'grid', gridTemplateColumns: `minmax(160px,1fr) repeat(${executiveFunctions.length}, 2.5rem)`, gap: '0.25rem' }}
          >
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leerling</div>
            {executiveFunctions.map(ef => (
              <div key={ef.id} className="flex flex-col items-center justify-center" title={ef.name}>
                <span className="text-base leading-none">{ef.icon}</span>
                <span className="text-[9px] text-gray-400 mt-0.5 leading-none text-center w-9 truncate">{ef.name.split(' ')[0]}</span>
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
                  className={`px-4 py-2.5 items-center cursor-pointer transition-colors min-w-max ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  style={{ display: 'grid', gridTemplateColumns: `minmax(160px,1fr) repeat(${executiveFunctions.length}, 2.5rem)`, gap: '0.25rem' }}
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

      {activeTab === 'beoordeling' && students.length === 0 && selectedGroupId && !loading && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-100">
          <Users className="w-10 h-10 mb-2 opacity-40" />
          <p>Geen leerlingen in deze klas</p>
        </div>
      )}
    </div>
  );
}
