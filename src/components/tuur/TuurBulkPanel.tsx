import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Check, Search, Users, Film, SlidersHorizontal, Copy, Minus } from 'lucide-react';
import {
  FamilyVideo, TuurGroup, TuurSettings, SelectionMode, SELECTION_MODE_LABELS,
  loadGroups, bulkSetAssignments, bulkPatchSettings, bulkReplaceBlocks, bulkReplaceAssignments,
  assignedVideoIds, loadSettings, loadBlocks,
} from './tuurService';
import { TuurStudent, Avatar, VideoThumb } from './TuurChildPanel';

type Notify = (message: string, type?: 'success' | 'error' | 'info') => void;
type Action = 'videos' | 'settings' | 'copy';

interface Props {
  schoolId: string;
  students: TuurStudent[];
  library: FamilyVideo[];
  notify: Notify;
}

export function TuurBulkPanel({ schoolId, students, library, notify }: Props) {
  const [groups, setGroups] = useState<TuurGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<Action>('videos');

  useEffect(() => {
    loadGroups(schoolId).then(setGroups).catch(() => setGroups([]));
    setSelected(new Set());
  }, [schoolId]);

  const studentIds = useMemo(() => new Set(students.map(s => s.id)), [students]);
  const visible = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const groupState = (g: TuurGroup): 'all' | 'some' | 'none' => {
    const members = g.student_ids.filter(id => studentIds.has(id));
    const count = members.filter(id => selected.has(id)).length;
    if (members.length > 0 && count === members.length) return 'all';
    return count > 0 ? 'some' : 'none';
  };

  const toggleGroup = (g: TuurGroup) => {
    const members = g.student_ids.filter(id => studentIds.has(id));
    const next = new Set(selected);
    if (groupState(g) === 'all') members.forEach(id => next.delete(id));
    else members.forEach(id => next.add(id));
    setSelected(next);
  };

  const allVisibleSelected = visible.length > 0 && visible.every(s => selected.has(s.id));
  const toggleAllVisible = () => {
    const next = new Set(selected);
    visible.forEach(s => (allVisibleSelected ? next.delete(s.id) : next.add(s.id)));
    setSelected(next);
  };

  const actions: { key: Action; label: string; icon: React.ElementType }[] = [
    { key: 'videos', label: 'Filmpjes', icon: Film },
    { key: 'settings', label: 'Instellingen', icon: SlidersHorizontal },
    { key: 'copy', label: 'Kopiëren van een kind', icon: Copy },
  ];

  const targets = [...selected];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 items-start">
      {/* Who */}
      <Card padding="sm" className="space-y-4">
        {groups.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-2">Groepen</p>
            <div className="flex flex-wrap gap-1.5">
              {groups.map(g => {
                const state = groupState(g);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      state === 'all' ? 'bg-brand text-white border-brand'
                        : state === 'some' ? 'bg-brand-tint text-brand border-brand-soft'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-brand-soft'
                    }`}
                  >
                    {state === 'all' && <Check className="w-3 h-3" />}
                    {state === 'some' && <Minus className="w-3 h-3" />}
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kinderen</p>
            <button onClick={toggleAllVisible} className="text-xs font-medium text-brand hover:text-brand-dark">
              {allVisibleSelected ? 'Niets selecteren' : 'Alles selecteren'}
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Zoek een kind…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </div>
          <ul className="max-h-[50vh] overflow-y-auto -mx-1">
            {visible.map(s => (
              <li key={s.id}>
                <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="w-4 h-4 rounded border-gray-300 accent-brand"
                  />
                  <Avatar student={s} />
                  <span className="truncate">{s.first_name} {s.last_name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* What */}
      <Card padding="sm" className="space-y-4">
        <div className="flex items-center gap-2 px-2 pt-2">
          <Users className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-semibold text-gray-900">
            {targets.length === 0 ? 'Selecteer kinderen' : `${targets.length} ${targets.length === 1 ? 'kind' : 'kinderen'} geselecteerd`}
          </h2>
        </div>

        <div className="flex gap-1 border-b border-gray-200 px-2 overflow-x-auto">
          {actions.map(a => (
            <button
              key={a.key}
              onClick={() => setAction(a.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                action === a.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <a.icon className="w-4 h-4" />
              {a.label}
            </button>
          ))}
        </div>

        <div className="px-2 pb-2">
          {action === 'videos' && <BulkVideos targets={targets} library={library} notify={notify} />}
          {action === 'settings' && <BulkSettings targets={targets} notify={notify} />}
          {action === 'copy' && <BulkCopy targets={targets} students={students} notify={notify} />}
        </div>
      </Card>
    </div>
  );
}

// ---------- Videos ----------

function BulkVideos({ targets, library, notify }: { targets: string[]; library: FamilyVideo[]; notify: Notify }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'add' | 'remove' | null>(null);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };

  const run = async (assigned: boolean) => {
    setBusy(assigned ? 'add' : 'remove');
    try {
      await bulkSetAssignments(targets, [...picked], assigned);
      notify(
        `${picked.size} ${picked.size === 1 ? 'filmpje' : 'filmpjes'} ${assigned ? 'toegewezen aan' : 'weggehaald bij'} ${targets.length} ${targets.length === 1 ? 'kind' : 'kinderen'}.`,
        'success'
      );
      setPicked(new Set());
    } catch {
      notify('Opslaan mislukt.', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (library.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">De bibliotheek is nog leeg. Voeg eerst filmpjes toe via Bibliotheek.</p>;
  }

  const disabled = targets.length === 0 || picked.size === 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Kies filmpjes en zet ze in één keer aan of uit voor alle geselecteerde kinderen. Andere filmpjes blijven ongewijzigd.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {library.map(f => {
          const on = picked.has(f.video.id);
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.video.id)}
              className={`relative text-left rounded-lg p-1.5 border-2 transition-all ${
                on ? 'border-brand bg-brand-tint/40' : 'border-transparent hover:border-gray-200'
              }`}
            >
              <VideoThumb title={f.video.title} thumbnail={f.video.thumbnail_url} />
              <p className="mt-1.5 text-xs font-medium text-gray-800 line-clamp-2">{f.video.title}</p>
              {on && (
                <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center shadow">
                  <Check className="w-4 h-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run(true)} loading={busy === 'add'} disabled={disabled || busy !== null}>
          Toewijzen
        </Button>
        <Button size="sm" variant="secondary" onClick={() => run(false)} loading={busy === 'remove'} disabled={disabled || busy !== null}>
          Weghalen
        </Button>
      </div>
    </div>
  );
}

// ---------- Settings (only changed fields) ----------

type Tri = 'keep' | 'on' | 'off';

const BOOL_FIELDS: { key: keyof TuurSettings; label: string }[] = [
  { key: 'allow_pause', label: 'Pauzeren / spelen' },
  { key: 'allow_replay', label: 'Opnieuw kijken' },
  { key: 'allow_next', label: 'Volgende filmpje' },
  { key: 'allow_seek', label: 'Spoelen (tijdlijn)' },
  { key: 'allow_fullscreen', label: 'Volledig scherm' },
  { key: 'autoplay', label: 'Automatisch volgende' },
  { key: 'allow_voice', label: "Spraakcommando's" },
  { key: 'show_watch_time', label: 'Toon kijktijd op het scherm' },
];

function BulkSettings({ targets, notify }: { targets: string[]; notify: Notify }) {
  const [bools, setBools] = useState<Record<string, Tri>>({});
  const [mode, setMode] = useState<SelectionMode | 'keep'>('keep');
  const [limit, setLimit] = useState<'keep' | 'none' | 'set'>('keep');
  const [limitMinutes, setLimitMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  const patch: Partial<TuurSettings> = {};
  for (const f of BOOL_FIELDS) {
    const v = bools[f.key];
    if (v === 'on' || v === 'off') (patch as Record<string, boolean>)[f.key] = v === 'on';
  }
  if (mode !== 'keep') patch.selection_mode = mode;
  if (limit === 'none') patch.daily_limit_minutes = null;
  if (limit === 'set') patch.daily_limit_minutes = limitMinutes;
  const changes = Object.keys(patch).length;

  const apply = async () => {
    setSaving(true);
    try {
      await bulkPatchSettings(targets, patch);
      notify(`${changes} ${changes === 1 ? 'instelling' : 'instellingen'} toegepast op ${targets.length} ${targets.length === 1 ? 'kind' : 'kinderen'}.`, 'success');
      setBools({});
      setMode('keep');
      setLimit('keep');
    } catch {
      notify('Opslaan mislukt.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const Seg = ({ value, current, onClick, children }: { value: string; current: string; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md border border-gray-300 -ml-px first:ml-0 ${
        current === value
          ? value === 'keep' ? 'bg-gray-200 text-gray-800' : 'bg-brand text-white border-brand relative z-10'
          : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <p className="text-sm text-gray-600">
        Alleen wat je hier aanpast, wordt overschreven. Laat een instelling op "—" om ze per kind te behouden.
      </p>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Hoe kiest het kind?</h3>
        <div className="flex flex-wrap gap-2">
          {(['keep', ...Object.keys(SELECTION_MODE_LABELS)] as (SelectionMode | 'keep')[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                mode === m
                  ? m === 'keep' ? 'bg-gray-200 text-gray-800 border-gray-300' : 'bg-brand text-white border-brand'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-brand-soft'
              }`}
            >
              {m === 'keep' ? '— niet wijzigen' : SELECTION_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Wat mag het kind doen?</h3>
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {BOOL_FIELDS.map(f => {
            const current = bools[f.key] ?? 'keep';
            const set = (v: Tri) => setBools({ ...bools, [f.key]: v });
            return (
              <div key={f.key} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="text-sm text-gray-800">{f.label}</span>
                <div className="flex flex-shrink-0">
                  <Seg value="keep" current={current} onClick={() => set('keep')}>—</Seg>
                  <Seg value="on" current={current} onClick={() => set('on')}>Aan</Seg>
                  <Seg value="off" current={current} onClick={() => set('off')}>Uit</Seg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Dagelijkse limiet</h3>
        <div className="border border-gray-200 rounded-lg px-4 py-3 space-y-3">
          <div className="flex">
            <Seg value="keep" current={limit} onClick={() => setLimit('keep')}>— niet wijzigen</Seg>
            <Seg value="none" current={limit} onClick={() => setLimit('none')}>Geen limiet</Seg>
            <Seg value="set" current={limit} onClick={() => setLimit('set')}>Limiet</Seg>
          </div>
          {limit === 'set' && (
            <div className="flex items-center gap-3">
              <input
                type="range" min={5} max={180} step={5}
                value={limitMinutes}
                onChange={e => setLimitMinutes(Number(e.target.value))}
                className="flex-1 bg-gray-200"
              />
              <span className="text-sm font-medium text-gray-800 w-16 text-right">{limitMinutes} min</span>
            </div>
          )}
        </div>
      </div>

      <Button onClick={apply} loading={saving} disabled={targets.length === 0 || changes === 0}>
        {changes === 0 ? 'Niets gewijzigd' : `Toepassen (${changes})`}
      </Button>
    </div>
  );
}

// ---------- Copy from one child ----------

function BulkCopy({ targets, students, notify }: { targets: string[]; students: TuurStudent[]; notify: Notify }) {
  const [sourceId, setSourceId] = useState('');
  const [what, setWhat] = useState({ videos: true, settings: true, blocks: true });
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const source = students.find(s => s.id === sourceId);
  const realTargets = targets.filter(id => id !== sourceId);
  const anything = what.videos || what.settings || what.blocks;

  const partList = [what.videos && 'filmpjes', what.settings && 'instellingen', what.blocks && 'dagplanning'].filter(Boolean) as string[];
  const parts = partList.length > 1 ? `${partList.slice(0, -1).join(', ')} en ${partList[partList.length - 1]}` : partList[0] ?? '';

  const run = async () => {
    if (!source) return;
    setSaving(true);
    try {
      const [videoIds, settings, blocks] = await Promise.all([
        what.videos || what.blocks ? assignedVideoIds(source.id) : Promise.resolve(new Set<string>()),
        what.settings ? loadSettings(source.id) : Promise.resolve(null),
        what.blocks ? loadBlocks(source.id) : Promise.resolve([]),
      ]);
      if (what.videos) await bulkReplaceAssignments(realTargets, [...videoIds]);
      if (settings) await bulkPatchSettings(realTargets, settings);
      if (what.blocks) {
        await bulkReplaceBlocks(realTargets, blocks);
        // Block videos must also be assigned, or the child can't play them.
        if (!what.videos) {
          const blockVideos = [...new Set(blocks.flatMap(b => b.video_ids))];
          await bulkSetAssignments(realTargets, blockVideos, true);
        }
      }
      notify(`${parts.charAt(0).toUpperCase() + parts.slice(1)} van ${source.first_name} gekopieerd naar ${realTargets.length} ${realTargets.length === 1 ? 'kind' : 'kinderen'}.`, 'success');
    } catch {
      notify('Kopiëren mislukt.', 'error');
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-sm text-gray-600">
        Stel één kind helemaal in en kopieer dat naar de rest. Wat je kopieert, vervangt wat de geselecteerde kinderen nu hebben.
      </p>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Kopieer van</h3>
        <select
          value={sourceId}
          onChange={e => setSourceId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft"
        >
          <option value="">Kies een kind…</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Wat kopiëren?</h3>
        <div className="space-y-2">
          {([
            ['videos', 'Toegewezen filmpjes'],
            ['settings', 'Instellingen en limiet'],
            ['blocks', 'Dagplanning'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={what[key]}
                onChange={e => setWhat({ ...what, [key]: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <Button onClick={() => setConfirming(true)} disabled={!source || realTargets.length === 0 || !anything}>
        <Copy className="w-4 h-4 mr-2" /> Kopiëren naar {realTargets.length} {realTargets.length === 1 ? 'kind' : 'kinderen'}
      </Button>

      <ConfirmationModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={run}
        loading={saving}
        title="Instellingen kopiëren?"
        message={`De ${parts} van ${source?.first_name ?? ''} vervangen die van ${realTargets.length} ${realTargets.length === 1 ? 'kind' : 'kinderen'}. Dit kan je niet ongedaan maken.`}
        confirmText="Kopiëren"
        variant="warning"
      />
    </div>
  );
}
