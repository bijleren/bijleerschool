import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Check, Plus, Trash2, Film, SlidersHorizontal, CalendarClock, BarChart3, Link as LinkIcon } from 'lucide-react';
import {
  FamilyVideo, TuurSettings, TuurBlock, SelectionMode, SELECTION_MODE_LABELS,
  assignedVideoIds, setAssignment, loadSettings, saveSettings, loadBlocks, saveBlock, deleteBlock,
  usageDays, topVideos, dayKey, addLinkToFamily, minutesToTime, timeToMinutes, formatDuration,
} from './tuurService';

export interface TuurStudent {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
}

type ChildTab = 'videos' | 'settings' | 'blocks' | 'usage';

interface Props {
  student: TuurStudent;
  schoolId: string;
  library: FamilyVideo[];
  onLibraryChanged: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function TuurChildPanel({ student, schoolId, library, onLibraryChanged, notify }: Props) {
  const [tab, setTab] = useState<ChildTab>('videos');
  const [assigned, setAssigned] = useState<Set<string>>(new Set());

  useEffect(() => {
    assignedVideoIds(student.id).then(setAssigned).catch(() => notify('Filmpjes laden mislukt.', 'error'));
  }, [student.id]);

  const tabs: { key: ChildTab; label: string; icon: React.ElementType }[] = [
    { key: 'videos', label: 'Filmpjes', icon: Film },
    { key: 'settings', label: 'Instellingen', icon: SlidersHorizontal },
    { key: 'blocks', label: 'Dagplanning', icon: CalendarClock },
    { key: 'usage', label: 'Kijktijd', icon: BarChart3 },
  ];

  return (
    <Card padding="sm" className="space-y-4">
      <div className="flex items-center gap-3 px-2 pt-2">
        <Avatar student={student} size="lg" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{student.first_name} {student.last_name}</h2>
          <p className="text-sm text-gray-500">{assigned.size} {assigned.size === 1 ? 'filmpje' : 'filmpjes'} toegewezen</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 px-2 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-2 pb-2">
        {tab === 'videos' && (
          <VideosSection
            student={student} schoolId={schoolId} library={library} assigned={assigned}
            setAssigned={setAssigned} onLibraryChanged={onLibraryChanged} notify={notify}
          />
        )}
        {tab === 'settings' && <SettingsSection studentId={student.id} notify={notify} />}
        {tab === 'blocks' && (
          <BlocksSection
            studentId={student.id}
            assignedVideos={library.filter(f => assigned.has(f.video.id))}
            notify={notify}
          />
        )}
        {tab === 'usage' && <UsageSection studentId={student.id} />}
      </div>
    </Card>
  );
}

export function Avatar({ student, size = 'md' }: { student: TuurStudent; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-12 h-12 text-lg' : 'w-8 h-8 text-sm';
  if (student.profile_picture_url) {
    return <img src={student.profile_picture_url} alt="" className={`${dim} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-brand-tint text-brand font-semibold flex items-center justify-center flex-shrink-0`}>
      {student.first_name.charAt(0).toUpperCase()}
    </div>
  );
}

export function VideoThumb({ title, thumbnail }: { title: string; thumbnail: string | null }) {
  return thumbnail ? (
    <img src={thumbnail} alt="" className="w-full aspect-video object-cover rounded-md bg-gray-100" loading="lazy" />
  ) : (
    <div className="w-full aspect-video rounded-md bg-gray-100 flex items-center justify-center" title={title}>
      <Film className="w-6 h-6 text-gray-400" />
    </div>
  );
}

// ---------- Videos ----------

function VideosSection({ student, schoolId, library, assigned, setAssigned, onLibraryChanged, notify }: {
  student: TuurStudent; schoolId: string; library: FamilyVideo[]; assigned: Set<string>;
  setAssigned: (s: Set<string>) => void; onLibraryChanged: () => Promise<void>;
  notify: Props['notify'];
}) {
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (videoId: string) => {
    const next = !assigned.has(videoId);
    setBusy(videoId);
    try {
      await setAssignment(student.id, videoId, next);
      const copy = new Set(assigned);
      if (next) copy.add(videoId); else copy.delete(videoId);
      setAssigned(copy);
    } catch {
      notify('Opslaan mislukt.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;
    setAdding(true);
    try {
      const videoId = await addLinkToFamily(link, schoolId);
      await setAssignment(student.id, videoId, true);
      await onLibraryChanged();
      setAssigned(new Set(assigned).add(videoId));
      setLink('');
      notify(`Filmpje toegevoegd voor ${student.first_name}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Toevoegen mislukt.', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={addLink} className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="Plak een YouTube-link"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </div>
        <Button type="submit" size="sm" loading={adding}>
          <Plus className="w-4 h-4 mr-1" /> Toevoegen
        </Button>
      </form>

      {library.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          De bibliotheek is nog leeg. Plak hierboven een YouTube-link of kies filmpjes uit de Tuur-catalogus.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500">Klik op een filmpje om het aan of uit te zetten voor {student.first_name}.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {library.map(f => {
              const on = assigned.has(f.video.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.video.id)}
                  disabled={busy === f.video.id}
                  className={`relative text-left rounded-lg p-1.5 border-2 transition-all ${
                    on ? 'border-brand bg-brand-tint/40' : 'border-transparent hover:border-gray-200 opacity-70 hover:opacity-100'
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
        </>
      )}
    </div>
  );
}

// ---------- Settings ----------

const TOGGLES: { key: keyof TuurSettings; label: string; hint?: string }[] = [
  { key: 'allow_pause', label: 'Pauzeren / spelen' },
  { key: 'allow_replay', label: 'Opnieuw kijken' },
  { key: 'allow_next', label: 'Volgende filmpje' },
  { key: 'allow_seek', label: 'Spoelen (tijdlijn)' },
  { key: 'allow_fullscreen', label: 'Volledig scherm' },
  { key: 'autoplay', label: 'Automatisch volgende' },
  { key: 'allow_voice', label: "Spraakcommando's" },
  { key: 'show_watch_time', label: 'Toon kijktijd op het scherm' },
];

function SettingsSection({ studentId, notify }: { studentId: string; notify: Props['notify'] }) {
  const [settings, setSettings] = useState<TuurSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(null);
    loadSettings(studentId).then(setSettings).catch(() => notify('Instellingen laden mislukt.', 'error'));
  }, [studentId]);

  if (!settings) return <p className="text-sm text-gray-500 py-6 text-center">Laden…</p>;

  const update = (patch: Partial<TuurSettings>) => setSettings({ ...settings, ...patch });

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings(studentId, settings);
      notify('Instellingen opgeslagen.', 'success');
    } catch {
      notify('Opslaan mislukt.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const limitOn = settings.daily_limit_minutes !== null;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Hoe kiest het kind?</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SELECTION_MODE_LABELS) as SelectionMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => update({ selection_mode: mode })}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                settings.selection_mode === mode
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-brand-soft'
              }`}
            >
              {SELECTION_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Wat mag het kind doen?</h3>
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {TOGGLES.map(t => (
            <label key={t.key} className="flex items-center justify-between px-4 py-2.5 cursor-pointer">
              <span className="text-sm text-gray-800">{t.label}</span>
              <Switch label={t.label} checked={settings[t.key] as boolean} onChange={v => update({ [t.key]: v } as Partial<TuurSettings>)} />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Schermtijd</h3>
        <div className="border border-gray-200 rounded-lg px-4 py-3 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-800">Dagelijkse limiet</span>
            <Switch label="Dagelijkse limiet" checked={limitOn} onChange={v => update({ daily_limit_minutes: v ? 30 : null })} />
          </label>
          {limitOn && (
            <div className="flex items-center gap-3">
              <input
                type="range" min={5} max={180} step={5}
                value={settings.daily_limit_minutes ?? 30}
                onChange={e => update({ daily_limit_minutes: Number(e.target.value) })}
                className="flex-1 bg-gray-200"
              />
              <span className="text-sm font-medium text-gray-800 w-16 text-right">{settings.daily_limit_minutes} min</span>
            </div>
          )}
        </div>
      </div>

      <Button onClick={save} loading={saving}>Opslaan</Button>
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-brand' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  );
}

// ---------- Blocks ----------

function BlocksSection({ studentId, assignedVideos, notify }: {
  studentId: string; assignedVideos: FamilyVideo[]; notify: Props['notify'];
}) {
  const [blocks, setBlocks] = useState<TuurBlock[] | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBlocks(null);
    setDirty(new Set());
    loadBlocks(studentId).then(setBlocks).catch(() => notify('Dagplanning laden mislukt.', 'error'));
  }, [studentId]);

  if (!blocks) return <p className="text-sm text-gray-500 py-6 text-center">Laden…</p>;

  const change = (id: string, patch: Partial<TuurBlock>) => {
    setBlocks(blocks.map(b => (b.id === id ? { ...b, ...patch } : b)));
    setDirty(new Set(dirty).add(id));
  };

  const addBlock = () => {
    const last = blocks[blocks.length - 1];
    const start = last ? Math.min(last.end_minute, 23 * 60) : 8 * 60;
    const block: TuurBlock = {
      id: crypto.randomUUID(),
      label: '',
      start_minute: start,
      end_minute: Math.min(start + 60, 24 * 60 - 1),
      video_ids: [],
    };
    setBlocks([...blocks, block]);
    setDirty(new Set(dirty).add(block.id));
  };

  const remove = async (id: string) => {
    try {
      await deleteBlock(id);
      setBlocks(blocks.filter(b => b.id !== id));
    } catch {
      notify('Verwijderen mislukt.', 'error');
    }
  };

  const saveAll = async () => {
    const invalid = blocks.find(b => b.end_minute <= b.start_minute);
    if (invalid) {
      notify('Het einde van een blok moet na het begin liggen.', 'error');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(blocks.map((b, i) => (dirty.has(b.id) ? saveBlock(studentId, b, i) : Promise.resolve())));
      setDirty(new Set());
      notify('Dagplanning opgeslagen.', 'success');
    } catch {
      notify('Opslaan mislukt.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Optioneel: verdeel de dag in blokken. Tijdens een blok ziet het kind alleen de filmpjes van dat blok.
        Zonder blokken ziet het kind altijd alle toegewezen filmpjes.
      </p>

      {blocks.map(b => (
        <div key={b.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={b.label}
              onChange={e => change(b.id, { label: e.target.value })}
              placeholder="Naam, bv. Ochtend"
              className="flex-1 min-w-[10rem] px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
            <input
              type="time" value={minutesToTime(b.start_minute)}
              onChange={e => change(b.id, { start_minute: timeToMinutes(e.target.value) })}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
            <span className="text-gray-400">–</span>
            <input
              type="time" value={minutesToTime(b.end_minute)}
              onChange={e => change(b.id, { end_minute: timeToMinutes(e.target.value) })}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
            <button onClick={() => remove(b.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Blok verwijderen">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {assignedVideos.length === 0 ? (
            <p className="text-xs text-gray-500">Wijs eerst filmpjes toe om ze in een blok te zetten.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedVideos.map(f => {
                const on = b.video_ids.includes(f.video.id);
                return (
                  <button
                    key={f.video.id}
                    onClick={() => change(b.id, {
                      video_ids: on ? b.video_ids.filter(v => v !== f.video.id) : [...b.video_ids, f.video.id],
                    })}
                    className={`px-2.5 py-1 text-xs rounded-full border max-w-[16rem] truncate ${
                      on ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:border-brand-soft'
                    }`}
                    title={f.video.title}
                  >
                    {f.video.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={addBlock}>
          <Plus className="w-4 h-4 mr-1" /> Blok toevoegen
        </Button>
        {dirty.size > 0 && <Button size="sm" onClick={saveAll} loading={saving}>Opslaan</Button>}
      </div>
    </div>
  );
}

// ---------- Usage ----------

function UsageSection({ studentId }: { studentId: string }) {
  const [days, setDays] = useState<Record<string, number> | null>(null);
  const [top, setTop] = useState<{ title: string; seconds: number }[]>([]);

  useEffect(() => {
    setDays(null);
    Promise.all([usageDays(studentId, 14), topVideos(studentId, 14)])
      .then(([d, t]) => { setDays(d); setTop(t); })
      .catch(() => setDays({}));
  }, [studentId]);

  if (!days) return <p className="text-sm text-gray-500 py-6 text-center">Laden…</p>;

  const series = Array.from({ length: 14 }, (_, i) => {
    const key = dayKey(13 - i);
    return { key, seconds: days[key] ?? 0 };
  });
  const max = Math.max(60, ...series.map(s => s.seconds));
  const total = series.reduce((sum, s) => sum + s.seconds, 0);
  const today = series[series.length - 1].seconds;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Vandaag</p>
          <p className="text-xl font-semibold text-gray-900">{formatDuration(today)}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Laatste 14 dagen</p>
          <p className="text-xl font-semibold text-gray-900">{formatDuration(total)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Kijktijd per dag</h3>
        <div className="flex items-end gap-1.5 h-32">
          {series.map(s => {
            const d = new Date(s.key + 'T00:00:00');
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${d.toLocaleDateString('nl-BE')}: ${formatDuration(s.seconds)}`}>
                <div className="w-full bg-brand rounded-t" style={{ height: `${(s.seconds / max) * 100}%`, minHeight: s.seconds ? 2 : 0 }} />
                <span className="text-[10px] text-gray-400">{d.getDate()}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Meest bekeken</h3>
        {top.length === 0 ? (
          <p className="text-sm text-gray-500">Nog niets bekeken in de laatste 14 dagen.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {top.slice(0, 10).map(v => (
              <li key={v.title} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-gray-800 truncate pr-4">{v.title}</span>
                <span className="text-gray-500 whitespace-nowrap">{formatDuration(v.seconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
