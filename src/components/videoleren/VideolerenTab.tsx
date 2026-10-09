import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clapperboard, Plus, Pencil, Share2, Lock, Unlock, Trash2, BarChart3, X, Search, Users, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { VideolerenFrame } from './VideolerenFrame';
import { VideolerenProgress } from './VideolerenProgress';

interface VideolerenTabProps {
  focusSchool: { id: string; name: string } | null;
}

export interface VideoTask {
  id: string;
  school_id: string;
  created_by: string | null;
  title: string;
  video_url: string | null;
  status: 'concept' | 'gepubliceerd' | 'gearchiveerd';
  deadline: string | null;
  closed_at: string | null;
  share_code: string;
  updated_at: string;
  videoleren_task_werkvormen: { werkvorm: string }[];
  videoleren_assignments: { id: string; assignable_type: 'student' | 'group'; assignable_id: string }[];
}

type State = 'concept' | 'actief' | 'afgesloten' | 'gearchiveerd';

export const taskState = (t: Pick<VideoTask, 'status' | 'deadline' | 'closed_at'>): State => {
  if (t.status === 'gearchiveerd') return 'gearchiveerd';
  if (t.status === 'concept') return 'concept';
  if (t.closed_at || !t.deadline || new Date(t.deadline) <= new Date()) return 'afgesloten';
  return 'actief';
};

const STATE_STYLE: Record<State, string> = {
  concept: 'bg-gray-100 text-gray-600',
  actief: 'bg-green-100 text-green-700',
  afgesloten: 'bg-blue-100 text-blue-700',
  gearchiveerd: 'bg-gray-100 text-gray-400',
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// <input type="datetime-local"> wants local time without timezone.
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function VideolerenTab({ focusSchool }: VideolerenTabProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [stateFilter, setStateFilter] = useState<'alle' | State>('alle');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [sharing, setSharing] = useState<VideoTask | null>(null);
  const [progressFor, setProgressFor] = useState<VideoTask | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!focusSchool) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('videoleren_tasks')
      .select('id, school_id, created_by, title, video_url, status, deadline, closed_at, share_code, updated_at, videoleren_task_werkvormen(werkvorm), videoleren_assignments(id, assignable_type, assignable_id)')
      .eq('school_id', focusSchool.id)
      .order('updated_at', { ascending: false });
    if (err) setError('De taken konden niet geladen worden.');
    else { setTasks((data as VideoTask[]) || []); setError(''); }
    setLoading(false);
  }, [focusSchool]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => tasks.filter(t =>
    (!onlyMine || t.created_by === user?.id) &&
    (stateFilter === 'alle' ? taskState(t) !== 'gearchiveerd' : taskState(t) === stateFilter) &&
    t.title.toLowerCase().includes(query.trim().toLowerCase())
  ), [tasks, onlyMine, stateFilter, query, user]);

  const createTask = async () => {
    if (!focusSchool) return;
    const { data, error: err } = await supabase
      .from('videoleren_tasks')
      .insert({ school_id: focusSchool.id, title: 'Nieuwe leervideo-taak', layout: { font: 'Andika', size: '13', lh: '1.9', num: true, marg: true, newpage: true } })
      .select('id')
      .single();
    if (err || !data) { setError('De taak kon niet aangemaakt worden.'); return; }
    await load();
    setEditing(data.id);
  };

  const closeNow = async (t: VideoTask) => {
    await supabase.from('videoleren_tasks').update({ closed_at: new Date().toISOString() }).eq('id', t.id);
    load();
  };

  const removeTask = async (id: string) => {
    await supabase.from('videoleren_tasks').delete().eq('id', id);
    setConfirmDelete(null);
    load();
  };

  if (!focusSchool) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
        <Clapperboard className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">Selecteer een school om te beginnen</p>
      </div>
    );
  }

  if (editing) {
    return <VideolerenFrame mode="teacher" taskId={editing} onClose={() => { setEditing(null); load(); }} />;
  }
  if (progressFor) {
    return <VideolerenProgress task={progressFor} onBack={() => setProgressFor(null)} />;
  }

  const counts = (s: 'alle' | State) => tasks.filter(t => (!onlyMine || t.created_by === user?.id) && (s === 'alle' ? taskState(t) !== 'gearchiveerd' : taskState(t) === s)).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clapperboard className="w-8 h-8 text-blue-600" /> Videoleren
          </h1>
          <p className="text-gray-600 mt-1">Maak een studietaak bij een SchoolTV-video, deel ze met een klas of met leerlingen en volg op wie waar staat.</p>
        </div>
        <Button onClick={createTask}><Plus className="w-4 h-4 mr-2" />Nieuwe leervideo-taak</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {[[true, 'Mijn taken'], [false, 'Alle taken van de school']].map(([v, label]) => (
            <button key={String(v)} onClick={() => setOnlyMine(v as boolean)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${onlyMine === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{label as string}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['alle', 'actief', 'concept', 'afgesloten', 'gearchiveerd'] as const).map(s => (
            <button key={s} onClick={() => setStateFilter(s)}
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${stateFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {s[0].toUpperCase() + s.slice(1)} <span className="tabular-nums opacity-70">{counts(s)}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Zoek een taak…"
            className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm w-56" />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-gray-500">Taken laden…</div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
          {tasks.length === 0 ? 'Nog geen leervideo-taken. Klik op "Nieuwe leervideo-taak" om te beginnen.' : 'Geen taken voor deze filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(t => {
            const st = taskState(t);
            const nGroups = t.videoleren_assignments.filter(a => a.assignable_type === 'group').length;
            const nStudents = t.videoleren_assignments.filter(a => a.assignable_type === 'student').length;
            const letters = t.videoleren_task_werkvormen.map(w => w.werkvorm).sort();
            return (
              <div key={t.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900">{t.title || 'Naamloze taak'}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATE_STYLE[st]}`}>{st}</span>
                    {t.created_by !== user?.id && <span className="text-xs text-gray-500">van een collega</span>}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3">
                    <span>Deadline: <b className="text-gray-700">{fmtDate(t.deadline)}</b>{t.closed_at && ' (vroeger afgesloten)'}</span>
                    <span>{nGroups} {nGroups === 1 ? 'groep' : 'groepen'} · {nStudents} {nStudents === 1 ? 'leerling' : 'leerlingen'}</span>
                    <span>Code {t.share_code}</span>
                  </div>
                  {letters.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {letters.map(l => <span key={l} className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 text-xs font-bold grid place-items-center">{l}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(t.id)}><Pencil className="w-4 h-4 mr-1" />Bewerken</Button>
                  <Button size="sm" variant="secondary" onClick={() => setSharing(t)}><Share2 className="w-4 h-4 mr-1" />{st === 'concept' ? 'Delen' : st === 'afgesloten' ? 'Heropenen' : 'Delen en deadline'}</Button>
                  {st !== 'concept' && <Button size="sm" variant="secondary" onClick={() => setProgressFor(t)}><BarChart3 className="w-4 h-4 mr-1" />Voortgang</Button>}
                  {st === 'actief' && <Button size="sm" variant="ghost" onClick={() => closeNow(t)}><Lock className="w-4 h-4 mr-1" />Nu afsluiten</Button>}
                  {confirmDelete === t.id ? (
                    <>
                      <Button size="sm" variant="danger" onClick={() => removeTask(t.id)}>Zeker verwijderen</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Annuleren</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(t.id)} aria-label="Verwijderen"><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sharing && (
        <ShareDialog task={sharing} schoolId={focusSchool.id} onClose={() => setSharing(null)} onSaved={() => { setSharing(null); load(); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ delen + deadline */
function ShareDialog({ task, schoolId, onClose, onSaved }: { task: VideoTask; schoolId: string; onClose: () => void; onSaved: () => void }) {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; first_name: string; last_name: string | null }[]>([]);
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set(task.videoleren_assignments.filter(a => a.assignable_type === 'group').map(a => a.assignable_id)));
  const [selStudents, setSelStudents] = useState<Set<string>>(new Set(task.videoleren_assignments.filter(a => a.assignable_type === 'student').map(a => a.assignable_id)));
  const isOpen = taskState(task) === 'actief';
  const defaultDeadline = task.deadline && isOpen ? new Date(task.deadline) : new Date(Date.now() + 7 * 86400000);
  if (!(task.deadline && isOpen)) defaultDeadline.setHours(16, 0, 0, 0);
  const [deadline, setDeadline] = useState(toLocalInput(defaultDeadline));
  const [view, setView] = useState<'groups' | 'students'>('groups');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const [g, s] = await Promise.all([
        supabase.from('groups').select('id, name').eq('school_id', schoolId).eq('is_active', true).order('name'),
        supabase.from('students').select('id, first_name, last_name').eq('school_id', schoolId).eq('is_active', true).order('first_name'),
      ]);
      setGroups(g.data || []);
      setStudents(s.data || []);
    })();
  }, [schoolId]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); setter(n);
  };

  const save = async () => {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) { setErr('Kies een geldige deadline.'); return; }
    if (d <= new Date()) { setErr('De deadline moet in de toekomst liggen.'); return; }
    if (selGroups.size === 0 && selStudents.size === 0) { setErr('Kies minstens één groep of leerling.'); return; }
    setSaving(true); setErr('');
    const wanted = [
      ...[...selGroups].map(id => ({ assignable_type: 'group' as const, assignable_id: id })),
      ...[...selStudents].map(id => ({ assignable_type: 'student' as const, assignable_id: id })),
    ];
    const key = (a: { assignable_type: string; assignable_id: string }) => a.assignable_type + ':' + a.assignable_id;
    const wantedKeys = new Set(wanted.map(key));
    const existing = task.videoleren_assignments;
    const toRemove = existing.filter(a => !wantedKeys.has(key(a))).map(a => a.id);
    const existingKeys = new Set(existing.map(key));
    const toAdd = wanted.filter(a => !existingKeys.has(key(a))).map(a => ({ ...a, task_id: task.id }));

    const results = await Promise.all([
      toRemove.length ? supabase.from('videoleren_assignments').delete().in('id', toRemove) : Promise.resolve({ error: null }),
      toAdd.length ? supabase.from('videoleren_assignments').insert(toAdd) : Promise.resolve({ error: null }),
      supabase.from('videoleren_tasks').update({ status: 'gepubliceerd', deadline: d.toISOString(), closed_at: null }).eq('id', task.id),
    ]);
    setSaving(false);
    if (results.some(r => r.error)) { setErr('Delen lukte niet. Probeer opnieuw.'); return; }
    onSaved();
  };

  const filteredStudents = students.filter(s => `${s.first_name} ${s.last_name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="vl-share-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="vl-share-title" className="text-xl font-bold text-gray-900">Delen: {task.title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Sluiten"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Deadline</span>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2" />
            <span className="text-xs text-gray-500">Na de deadline sluit de taak vanzelf. Je kan ze ook vroeger afsluiten, of later heropenen met een nieuwe deadline.</span>
          </label>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 p-1">
              <button onClick={() => setView('groups')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 ${view === 'groups' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}><Users className="w-4 h-4" />Groepen ({selGroups.size})</button>
              <button onClick={() => setView('students')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 ${view === 'students' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}><User className="w-4 h-4" />Leerlingen ({selStudents.size})</button>
            </div>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Zoeken…" className="ml-auto rounded-xl border border-gray-200 px-3 py-1.5 text-sm w-40" />
          </div>

          <div className="border border-gray-200 rounded-xl max-h-72 overflow-y-auto divide-y">
            {view === 'groups'
              ? filteredGroups.map(g => (
                  <label key={g.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selGroups.has(g.id)} onChange={() => toggle(selGroups, setSelGroups, g.id)} className="w-4 h-4" />
                    <span className="font-medium">{g.name}</span>
                  </label>
                ))
              : filteredStudents.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selStudents.has(s.id)} onChange={() => toggle(selStudents, setSelStudents, s.id)} className="w-4 h-4" />
                    <span>{s.first_name} {s.last_name}</span>
                  </label>
                ))}
            {(view === 'groups' ? filteredGroups : filteredStudents).length === 0 && <p className="p-4 text-sm text-gray-500">Niets gevonden.</p>}
          </div>
          <p className="text-xs text-gray-500">Een groep delen betekent: alle leerlingen van die groep, ook wie er later bij komt. Je kan groepen en losse leerlingen combineren.</p>
          {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm" role="alert">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Annuleren</Button>
          <Button onClick={save} loading={saving}>{taskState(task) === 'afgesloten' ? <><Unlock className="w-4 h-4 mr-1" />Heropenen</> : 'Delen'}</Button>
        </div>
      </div>
    </div>
  );
}
