import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import type { VideoTask } from './VideolerenTab';
import { taskState } from './VideolerenTab';

const WV: Record<string, string> = {
  A: 'Tekst inlezen', B: 'Moeilijke woorden', C: 'Voice-over', D: 'Woordenlijst', E: 'Dicteerfunctie',
  F: 'Tekst uittekenen', G: 'Screenshots', H: 'Interview', I: 'Tekstanalyse', J: 'Vraagwoorden',
  K: 'Synoniemen', L: 'Snellezen', M: 'Debat', N: 'Nieuwslezer',
};

interface ProgressRow { student_id: string; werkvorm: string; status: 'bezig' | 'klaar'; data: Record<string, unknown>; transcript_version: number | null; updated_at: string }
interface Student { id: string; first_name: string; last_name: string | null }

// Same word numbering as the app (public/videoleren/app.html: getBlocks + tokenize).
const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
function wordsOf(html: string): string[] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;
  const texts: string[] = [];
  root.childNodes.forEach(n => {
    if (n.nodeType === 3) { if (n.textContent?.trim()) texts.push(n.textContent); return; }
    if (n.nodeType !== 1) return;
    const e = n as Element;
    if (e.tagName === 'UL' || e.tagName === 'OL') e.querySelectorAll('li').forEach(li => texts.push(li.textContent || ''));
    else texts.push(e.textContent || '');
  });
  return texts.filter(t => t.trim()).flatMap(t => t.match(WORD_RE) || []);
}

const CELL = {
  klaar: { label: '✓', cls: 'bg-green-100 text-green-700', name: 'Klaar' },
  bezig: { label: '◐', cls: 'bg-blue-100 text-blue-700', name: 'Bezig' },
  niet: { label: '–', cls: 'bg-gray-100 text-gray-400', name: 'Niet gestart' },
} as const;

export function VideolerenProgress({ task, onBack }: { task: VideoTask; onBack: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [version, setVersion] = useState<number>(1);
  const [tab, setTab] = useState<'overzicht' | 'woorden'>('overzicht');
  const [color, setColor] = useState<'blue' | 'green' | 'red'>('blue');
  const [loading, setLoading] = useState(true);
  const letters = useMemo(() => task.videoleren_task_werkvormen.map(w => w.werkvorm).sort(), [task]);

  useEffect(() => {
    (async () => {
      const groupIds = task.videoleren_assignments.filter(a => a.assignable_type === 'group').map(a => a.assignable_id);
      const directIds = task.videoleren_assignments.filter(a => a.assignable_type === 'student').map(a => a.assignable_id);
      const members = groupIds.length
        ? (await supabase.from('student_groups').select('student_id').in('group_id', groupIds).eq('is_active', true)).data || []
        : [];
      const ids = [...new Set([...directIds, ...members.map(m => m.student_id as string)])];
      const [s, p, t] = await Promise.all([
        ids.length ? supabase.from('students').select('id, first_name, last_name').in('id', ids).eq('is_active', true).order('first_name') : Promise.resolve({ data: [] }),
        supabase.from('videoleren_progress').select('student_id, werkvorm, status, data, transcript_version, updated_at').eq('task_id', task.id),
        supabase.from('videoleren_tasks').select('transcript_html, transcript_version').eq('id', task.id).single(),
      ]);
      setStudents((s.data as Student[]) || []);
      setRows((p.data as ProgressRow[]) || []);
      setWords(wordsOf(t.data?.transcript_html || ''));
      setVersion(t.data?.transcript_version || 1);
      setLoading(false);
    })();
  }, [task]);

  const statusOf = (sid: string, l: string): keyof typeof CELL => {
    const r = rows.find(x => x.student_id === sid && x.werkvorm === l);
    return r ? r.status : 'niet';
  };

  const wordStats = useMemo(() => {
    const m = new Map<string, { word: string; blue: string[]; green: string[]; red: string[] }>();
    let stale = 0;
    for (const r of rows.filter(x => x.werkvorm === 'B')) {
      if (r.transcript_version && r.transcript_version !== version) stale++;
      const st = students.find(s => s.id === r.student_id);
      const marks = (r.data?.marks || {}) as Record<string, 'blue' | 'green' | 'red'>;
      for (const [i, c] of Object.entries(marks)) {
        const w = words[+i]?.toLowerCase();
        if (!w || !st) continue;
        if (!m.has(w)) m.set(w, { word: w, blue: [], green: [], red: [] });
        const e = m.get(w)!;
        if (!e[c].includes(st.first_name)) e[c].push(st.first_name);
      }
    }
    return { list: [...m.values()], stale };
  }, [rows, students, words, version]);

  const markers = rows.filter(r => r.werkvorm === 'B').length;
  const sorted = [...wordStats.list].filter(x => x[color].length).sort((a, b) => b[color].length - a[color].length);
  const done = (sid: string) => letters.filter(l => statusOf(sid, l) === 'klaar').length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <button onClick={onBack} className="text-blue-600 font-semibold flex items-center gap-1"><ArrowLeft className="w-4 h-4" />Leervideo-taken</button>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          <p className="text-gray-500 text-sm">{students.length} leerlingen · deadline {task.deadline ? new Date(task.deadline).toLocaleString('nl-BE') : '—'} · {taskState(task)}</p>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {(['overzicht', 'woorden'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
              {t === 'overzicht' ? 'Overzicht' : 'Moeilijke woorden'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-gray-500 py-10 text-center">Laden…</p> : tab === 'overzicht' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 overflow-x-auto">
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
            {Object.values(CELL).map(c => <span key={c.name} className="flex items-center gap-1.5"><span className={`w-7 h-6 rounded-md grid place-items-center font-bold ${c.cls}`}>{c.label}</span>{c.name}</span>)}
          </div>
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="text-left py-2 pr-3">Leerling</th>
                <th className="text-left py-2 pr-3">Voortgang</th>
                {letters.map(l => <th key={l} className="py-2 px-1 text-center" title={WV[l]}><div className="font-bold text-gray-700">{l}</div><div className="font-normal">{WV[l]}</div></th>)}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3 font-semibold whitespace-nowrap">{s.first_name} {s.last_name}</td>
                  <td className="py-1.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${letters.length ? done(s.id) / letters.length * 100 : 0}%` }} /></div>
                      <span className="text-gray-500"><b className="text-gray-800">{done(s.id)}</b>/{letters.length}</span>
                    </div>
                  </td>
                  {letters.map(l => { const c = CELL[statusOf(s.id, l)]; return <td key={l} className="text-center py-1.5"><span title={c.name} className={`inline-grid place-items-center w-7 h-6 rounded-md font-bold ${c.cls}`}>{c.label}</span></td>; })}
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={letters.length + 2} className="py-6 text-center text-gray-500">Deze taak is nog met niemand gedeeld.</td></tr>}
            </tbody>
            {students.length > 0 && (
              <tfoot>
                <tr className="border-t text-gray-500">
                  <td className="py-2">Klaar per onderdeel</td><td />
                  {letters.map(l => <td key={l} className="text-center"><b className="text-gray-800">{students.filter(s => statusOf(s.id, l) === 'klaar').length}</b>/{students.length}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {([['blue', 'Blauw · begrijpen', 'bg-blue-500'], ['green', 'Groen · lezen', 'bg-green-500'], ['red', 'Rood · spellen', 'bg-red-500']] as const).map(([k, label, dot]) => (
              <button key={k} onClick={() => setColor(k)} className={`px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-2 ${color === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />{label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500">{markers} leerlingen markeerden woorden. Hoe vaker een woord gemarkeerd werd, hoe hoger het staat.</p>
          {wordStats.stale > 0 && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2">Let op: de tekst werd aangepast nadat {wordStats.stale} leerling(en) woorden markeerden. Hun markeringen kunnen verschoven zijn.</p>}
          {sorted.length === 0 ? <p className="text-gray-500 py-6 text-center">Nog geen woorden gemarkeerd in deze kleur.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-gray-500 text-xs text-left"><th className="py-2">Woord</th><th>Aantal</th><th>Leerlingen</th></tr></thead>
              <tbody>
                {sorted.map(x => (
                  <tr key={x.word} className="border-t border-gray-100 align-top">
                    <td className="py-2 font-bold text-base">{x.word}</td>
                    <td className="py-2 tabular-nums"><b>{x[color].length}</b> <span className="text-gray-500">van {markers}</span></td>
                    <td className="py-2 text-gray-600">{x[color].join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(sorted.slice(0, 10).map(x => x.word).join('\n'))}>Kopieer de top 10</Button>
        </div>
      )}
    </div>
  );
}
