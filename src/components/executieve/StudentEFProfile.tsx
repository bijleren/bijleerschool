import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

interface HistoryEntry {
  id: string;
  executive_function_id: string;
  rating: number;
  support_rating: number;
  created_at: string;
}

interface Props {
  schoolId: string;
  studentId: string;
  studentName: string;
  onNavigateBack: () => void;
}

const RATING_LABELS = ['---', '--', '-', '0', '+', '++', '+++'];
const RATING_COLORS = ['#dc2626', '#f97316', '#fbbf24', '#6b7280', '#34d399', '#10b981', '#059669'];

function getRatingLabel(r: number) { return RATING_LABELS[r + 3]; }
function getRatingColor(r: number) { return RATING_COLORS[r + 3]; }

function RadarChart({ functions, assessments }: { functions: ExecutiveFunction[]; assessments: Assessment[] }) {
  const cx = 160, cy = 160, radius = 110;
  const n = functions.length;

  const getRating = (id: string) => assessments.find(a => a.executive_function_id === id)?.rating ?? 0;
  const getSupport = (id: string) => assessments.find(a => a.executive_function_id === id)?.support_rating ?? 0;

  const pointForValue = (index: number, value: number) => {
    const angle = (index * 2 * Math.PI) / n - Math.PI / 2;
    const norm = (value + 3) / 6;
    const minR = radius * 0.17;
    const dist = minR + norm * (radius - minR);
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  };

  const labelPos = (index: number) => {
    const angle = (index * 2 * Math.PI) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * (radius + 28), y: cy + Math.sin(angle) * (radius + 28) };
  };

  const abilityPoints = functions.map((f, i) => pointForValue(i, getRating(f.id)));
  const supportPoints = functions.map((f, i) => pointForValue(i, getSupport(f.id)));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <svg width="320" height="320" className="overflow-visible">
      {/* Grid circles */}
      {[0.17, 0.33, 0.5, 0.67, 0.83, 1.0].map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={radius * s} fill="none"
          stroke={i < 3 ? '#d1d5db' : '#e5e7eb'} strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {functions.map((f, i) => {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        return (
          <line key={f.id} x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * radius}
            y2={cy + Math.sin(angle) * radius}
            stroke="#e5e7eb" strokeWidth="1" />
        );
      })}
      {/* Support area */}
      <path d={toPath(supportPoints)} fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2" strokeDasharray="5,4" />
      {/* Ability area */}
      <path d={toPath(abilityPoints)} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2.5" />
      {/* Data points */}
      {abilityPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
      ))}
      {supportPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
      ))}
      {/* Labels */}
      {functions.map((f, i) => {
        const { x, y } = labelPos(i);
        return (
          <g key={f.id}>
            <text x={x} y={y - 7} textAnchor="middle" fontSize="14">{f.icon}</text>
            <text x={x} y={y + 7} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="500">
              {f.name.split(' ')[0]}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="3" fill="#374151" />
    </svg>
  );
}

export function StudentEFProfile({ schoolId, studentId, studentName, onNavigateBack }: Props) {
  const { user } = useAuth();
  const [functions, setFunctions] = useState<ExecutiveFunction[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [studentId]);

  const fetchAll = async () => {
    setLoading(true);

    const [funcsRes, assessRes, histRes] = await Promise.all([
      supabase.from('executive_functions').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('executive_function_assessments').select('*').eq('student_id', studentId),
      supabase.from('executive_function_assessment_history')
        .select('id, executive_function_id, rating, support_rating, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    setFunctions(funcsRes.data || []);
    setAssessments(
      (assessRes.data || []).map((r: any) => ({
        executive_function_id: r.executive_function_id,
        rating: r.rating,
        support_rating: r.support_rating,
      }))
    );
    setHistory(histRes.data || []);
    setLoading(false);
  };

  const getFunctionName = (id: string) => functions.find(f => f.id === id)?.name ?? '—';
  const getFunctionIcon = (id: string) => functions.find(f => f.id === id)?.icon ?? '';

  // Build logbook: group consecutive history entries by function to show deltas
  const logbook = (() => {
    const entries: Array<{
      id: string;
      date: string;
      functionId: string;
      ratingBefore: number | null;
      ratingAfter: number;
      supportBefore: number | null;
      supportAfter: number;
    }> = [];

    // Per function, find previous entry to compute delta
    const byFunction: Record<string, HistoryEntry[]> = {};
    history.forEach(h => {
      if (!byFunction[h.executive_function_id]) byFunction[h.executive_function_id] = [];
      byFunction[h.executive_function_id].push(h);
    });

    history.forEach(h => {
      const list = byFunction[h.executive_function_id];
      const idx = list.findIndex(x => x.id === h.id);
      const prev = idx + 1 < list.length ? list[idx + 1] : null;
      entries.push({
        id: h.id,
        date: h.created_at,
        functionId: h.executive_function_id,
        ratingBefore: prev?.rating ?? null,
        ratingAfter: h.rating,
        supportBefore: prev?.support_rating ?? null,
        supportAfter: h.support_rating,
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{studentName}</h1>
          <p className="text-sm text-gray-500">Executieve Functies Profiel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Radar</h2>
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-brand inline-block rounded" />
              Vermogen
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-green-500 inline-block" />
              Zelfondersteuning
            </span>
          </div>
          <div className="flex justify-center">
            <RadarChart functions={functions} assessments={assessments} />
          </div>
          <div className="flex justify-center gap-6 mt-3 text-xs text-gray-400">
            <span>Binnenste = ---</span>
            <span>Midden = 0</span>
            <span>Buiten = +++</span>
          </div>
        </div>

        {/* Current scores list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Huidige scores</h2>
          <div className="space-y-2">
            {functions.map(f => {
              const a = assessments.find(x => x.executive_function_id === f.id);
              const rating = a?.rating ?? 0;
              const support = a?.support_rating ?? 0;
              return (
                <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-lg w-7 text-center">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: getRatingColor(rating) }}
                      title="Vermogen"
                    >
                      {getRatingLabel(rating)}
                    </span>
                    <span
                      className="inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold text-white opacity-80"
                      style={{ backgroundColor: getRatingColor(support) }}
                      title="Zelfondersteuning"
                    >
                      {getRatingLabel(support)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-400 inline-block opacity-70" /> Vermogen
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-400 inline-block opacity-70" /> Zelfondersteuning
            </span>
          </div>
        </div>
      </div>

      {/* Logbook */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          Logboek wijzigingen
        </h2>

        {logbook.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nog geen wijzigingen geregistreerd.</p>
        ) : (
          <div className="space-y-2">
            {logbook.map(entry => {
              const ratingChanged = entry.ratingBefore !== null && entry.ratingBefore !== entry.ratingAfter;
              const supportChanged = entry.supportBefore !== null && entry.supportBefore !== entry.supportAfter;
              const isNew = entry.ratingBefore === null;

              return (
                <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-base mt-0.5">{getFunctionIcon(entry.functionId)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{getFunctionName(entry.functionId)}</span>
                      {isNew && (
                        <span className="text-xs bg-brand-tint text-brand-dark px-1.5 py-0.5 rounded font-medium">Eerste beoordeling</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {/* Rating change */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wide">Vermogen</span>
                        {entry.ratingBefore !== null && (
                          <>
                            <span
                              className="inline-flex items-center justify-center w-7 h-5 rounded text-xs font-bold text-white"
                              style={{ backgroundColor: getRatingColor(entry.ratingBefore) }}
                            >
                              {getRatingLabel(entry.ratingBefore)}
                            </span>
                            {ratingChanged ? (
                              entry.ratingAfter > entry.ratingBefore
                                ? <TrendingUp className="w-3 h-3 text-green-500" />
                                : <TrendingDown className="w-3 h-3 text-red-500" />
                            ) : (
                              <Minus className="w-3 h-3 text-gray-300" />
                            )}
                          </>
                        )}
                        <span
                          className="inline-flex items-center justify-center w-7 h-5 rounded text-xs font-bold text-white"
                          style={{ backgroundColor: getRatingColor(entry.ratingAfter) }}
                        >
                          {getRatingLabel(entry.ratingAfter)}
                        </span>
                      </div>
                      {/* Support change */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wide">Ondersteuning</span>
                        {entry.supportBefore !== null && (
                          <>
                            <span
                              className="inline-flex items-center justify-center w-7 h-5 rounded text-xs font-bold text-white opacity-80"
                              style={{ backgroundColor: getRatingColor(entry.supportBefore) }}
                            >
                              {getRatingLabel(entry.supportBefore)}
                            </span>
                            {supportChanged ? (
                              entry.supportAfter > entry.supportBefore
                                ? <TrendingUp className="w-3 h-3 text-green-500" />
                                : <TrendingDown className="w-3 h-3 text-red-500" />
                            ) : (
                              <Minus className="w-3 h-3 text-gray-300" />
                            )}
                          </>
                        )}
                        <span
                          className="inline-flex items-center justify-center w-7 h-5 rounded text-xs font-bold text-white opacity-80"
                          style={{ backgroundColor: getRatingColor(entry.supportAfter) }}
                        >
                          {getRatingLabel(entry.supportAfter)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <time className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                    {new Date(entry.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' '}
                    {new Date(entry.date).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
