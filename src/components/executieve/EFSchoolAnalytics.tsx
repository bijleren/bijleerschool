import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ChevronRight, Users, School, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExecutiveFunction {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
}

interface Group {
  id: string;
  name: string;
}

interface StudentScore {
  studentId: string;
  studentName: string;
  rating: number;
  support_rating: number;
}

interface FunctionStats {
  functionId: string;
  avgRating: number;
  avgSupport: number;
  count: number;
  scores: StudentScore[];
}

interface Props {
  schoolId: string;
  schoolName: string;
  onNavigateBack: () => void;
  onNavigateToStudent: (studentId: string, studentName: string) => void;
}

const RATING_LABELS = ['---', '--', '-', '0', '+', '++', '+++'];
const RATING_COLORS = ['#dc2626', '#f97316', '#fbbf24', '#6b7280', '#34d399', '#10b981', '#059669'];

function getRatingColor(r: number) { return RATING_COLORS[Math.round(r) + 3] ?? '#6b7280'; }
function getRatingLabel(r: number) { return RATING_LABELS[Math.round(r) + 3] ?? '0'; }

function AvgBar({ value, max = 3 }: { value: number; max?: number }) {
  const norm = Math.max(0, Math.min(1, (value + max) / (2 * max)));
  const color = getRatingColor(Math.round(value));
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${norm * 100}%`, backgroundColor: color }} />
      </div>
      <span
        className="text-xs font-bold text-white rounded px-1.5 py-0.5 w-10 text-center"
        style={{ backgroundColor: color }}
      >
        {getRatingLabel(Math.round(value))}
      </span>
    </div>
  );
}

export function EFSchoolAnalytics({ schoolId, schoolName, onNavigateBack, onNavigateToStudent }: Props) {
  const [scope, setScope] = useState<'school' | 'class'>('class');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [functions, setFunctions] = useState<ExecutiveFunction[]>([]);
  const [stats, setStats] = useState<FunctionStats[]>([]);
  const [expandedFunction, setExpandedFunction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
    fetchFunctions();
  }, [schoolId]);

  useEffect(() => {
    fetchStats();
  }, [selectedGroupId, scope, functions]);

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

  const fetchFunctions = async () => {
    const { data } = await supabase
      .from('executive_functions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setFunctions(data || []);
  };

  const fetchStats = async () => {
    if (functions.length === 0) return;
    setLoading(true);

    let studentIds: string[] = [];
    let studentNames: Record<string, string> = {};

    if (scope === 'class' && selectedGroupId) {
      const { data: sgRows } = await supabase
        .from('student_groups')
        .select('students(id, first_name, last_name)')
        .eq('group_id', selectedGroupId)
        .eq('is_active', true);

      (sgRows || []).forEach((r: any) => {
        if (r.students) {
          studentIds.push(r.students.id);
          studentNames[r.students.id] = `${r.students.first_name} ${r.students.last_name}`;
        }
      });
    } else {
      // School scope: get all students in all groups of the school
      const { data: allGroups } = await supabase
        .from('groups')
        .select('id')
        .eq('school_id', schoolId);

      const groupIds = (allGroups || []).map((g: any) => g.id);
      if (groupIds.length > 0) {
        const { data: sgRows } = await supabase
          .from('student_groups')
          .select('students(id, first_name, last_name)')
          .in('group_id', groupIds)
          .eq('is_active', true);

        (sgRows || []).forEach((r: any) => {
          if (r.students && !studentNames[r.students.id]) {
            studentIds.push(r.students.id);
            studentNames[r.students.id] = `${r.students.first_name} ${r.students.last_name}`;
          }
        });
      }
    }

    if (studentIds.length === 0) {
      setStats([]);
      setLoading(false);
      return;
    }

    const { data: assessments } = await supabase
      .from('executive_function_assessments')
      .select('student_id, executive_function_id, rating, support_rating')
      .in('student_id', studentIds);

    const computed: FunctionStats[] = functions.map(f => {
      const relevant = (assessments || []).filter((a: any) => a.executive_function_id === f.id);
      const scores: StudentScore[] = relevant.map((a: any) => ({
        studentId: a.student_id,
        studentName: studentNames[a.student_id] ?? '—',
        rating: a.rating,
        support_rating: a.support_rating,
      })).sort((a: StudentScore, b: StudentScore) => a.rating - b.rating);

      const avg = relevant.length > 0
        ? relevant.reduce((s: number, a: any) => s + a.rating, 0) / relevant.length
        : 0;
      const avgSup = relevant.length > 0
        ? relevant.reduce((s: number, a: any) => s + a.support_rating, 0) / relevant.length
        : 0;

      return {
        functionId: f.id,
        avgRating: avg,
        avgSupport: avgSup,
        count: relevant.length,
        scores,
      };
    });

    setStats(computed);
    setLoading(false);
  };

  const getFunction = (id: string) => functions.find(f => f.id === id);

  const ratingLabel = (r: number) => ['---', '--', '-', '0', '+', '++', '+++'][Math.round(r) + 3] ?? '0';

  const handleExport = () => {
    const scopeLabel = scope === 'class'
      ? (groups.find(g => g.id === selectedGroupId)?.name ?? 'Klas')
      : schoolName;

    // Sheet 1: summary — one row per function with averages
    const summaryRows = stats.map(stat => {
      const fn = getFunction(stat.functionId);
      return {
        Functie: fn?.name ?? '—',
        Scope: scopeLabel,
        'Gem. Vermogen (label)': ratingLabel(stat.avgRating),
        'Gem. Vermogen (getal)': +stat.avgRating.toFixed(2),
        'Gem. Ondersteuning (label)': ratingLabel(stat.avgSupport),
        'Gem. Ondersteuning (getal)': +stat.avgSupport.toFixed(2),
        'Aantal leerlingen': stat.count,
      };
    });

    // Sheet 2: detail — one row per student per function
    const detailRows = stats.flatMap(stat => {
      const fn = getFunction(stat.functionId);
      return stat.scores.map(s => ({
        Functie: fn?.name ?? '—',
        Leerling: s.studentName,
        Scope: scopeLabel,
        'Vermogen (label)': ratingLabel(s.rating),
        'Vermogen (getal)': s.rating,
        'Ondersteuning (label)': ratingLabel(s.support_rating),
        'Ondersteuning (getal)': s.support_rating,
      }));
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Gemiddelden');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Details per leerling');
    XLSX.writeFile(wb, `EF_Analyse_${scopeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analyse — {schoolName}</h1>
            <p className="text-sm text-gray-500">Gemiddelde scores per executieve functie</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={stats.length === 0 || loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exporteer
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Scope toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
          <button
            onClick={() => setScope('class')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              scope === 'class' ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Klas
          </button>
          <button
            onClick={() => setScope('school')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              scope === 'school' ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            School
          </button>
        </div>

        {scope === 'class' && (
          <select
            value={selectedGroupId}
            onChange={e => setSelectedGroupId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-[2fr_3fr_3fr_auto] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Functie</span>
              <span>Gemiddeld vermogen</span>
              <span>Gemiddelde ondersteuning</span>
              <span>Leerlingen</span>
            </div>
          </div>

          {stats.map(stat => {
            const fn = getFunction(stat.functionId);
            if (!fn) return null;
            const isExpanded = expandedFunction === stat.functionId;

            return (
              <div key={stat.functionId} className="border-b border-gray-50 last:border-0">
                <div
                  className={`grid grid-cols-[2fr_3fr_3fr_auto] gap-4 px-5 py-3.5 items-center cursor-pointer transition-colors ${isExpanded ? 'bg-brand-tint' : 'hover:bg-gray-50'}`}
                  onClick={() => setExpandedFunction(isExpanded ? null : stat.functionId)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{fn.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{fn.name}</p>
                      <p className="text-xs text-gray-400 hidden md:block line-clamp-1">{fn.description}</p>
                    </div>
                  </div>
                  <AvgBar value={stat.avgRating} />
                  <AvgBar value={stat.avgSupport} />
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span className="font-medium">{stat.count}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded: student ranking */}
                {isExpanded && (
                  <div className="bg-brand-tint border-t border-line px-5 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Scores per leerling — {fn.name}
                    </p>
                    {stat.scores.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">Geen beoordelingen voor deze functie.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {stat.scores.map(s => (
                          <div
                            key={s.studentId}
                            className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 cursor-pointer hover:shadow-sm transition-shadow"
                            onClick={() => onNavigateToStudent(s.studentId, s.studentName)}
                          >
                            <div className="w-7 h-7 rounded-full bg-brand-tint text-brand-dark flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {s.studentName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-900 truncate">{s.studentName}</span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-flex items-center justify-center w-9 h-6 rounded text-xs font-bold text-white"
                                style={{ backgroundColor: getRatingColor(s.rating) }}
                                title="Vermogen"
                              >
                                {getRatingLabel(s.rating)}
                              </span>
                              <span
                                className="inline-flex items-center justify-center w-9 h-6 rounded text-xs font-bold text-white opacity-80"
                                style={{ backgroundColor: getRatingColor(s.support_rating) }}
                                title="Zelfondersteuning"
                              >
                                {getRatingLabel(s.support_rating)}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {stats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">Geen beoordelingen gevonden</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
