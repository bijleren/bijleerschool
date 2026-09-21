import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import {
  Tv, Users, UsersRound, Library, LayoutGrid, Search, ChevronDown, Plus, Trash2, Pencil, X, Check, Link as LinkIcon, Smartphone,
} from 'lucide-react';
import {
  FamilyVideo, CatalogueVideo, TuurChannel,
  familyCatalogue, adminCatalogue, addLinkToFamily, addToFamily, removeFromFamily,
  loadChannels, saveChannel, deleteChannel,
} from './tuurService';
import { TuurChildPanel, TuurStudent, Avatar, VideoThumb } from './TuurChildPanel';
import { TuurBulkPanel } from './TuurBulkPanel';

interface School { id: string; name: string; }

interface TuurTabProps {
  focusSchool?: School | null;
  userSchools?: School[];
}

type Section = 'children' | 'bulk' | 'library' | 'channels';
type Notify = (message: string, type?: 'success' | 'error' | 'info') => void;

export function TuurTab({ focusSchool, userSchools = [] }: TuurTabProps) {
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(focusSchool ?? userSchools[0] ?? null);
  const [section, setSection] = useState<Section>('children');
  const [students, setStudents] = useState<TuurStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<TuurStudent | null>(null);
  const [library, setLibrary] = useState<FamilyVideo[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const notify: Notify = useCallback((message, type = 'info') => setToast({ message, type }), []);

  useEffect(() => {
    if (focusSchool) setSchool(focusSchool);
    else if (!school && userSchools.length > 0) setSchool(userSchools[0]);
  }, [focusSchool?.id, userSchools.length]);

  const refreshLibrary = useCallback(async () => {
    if (!school) return;
    try {
      setLibrary(await familyCatalogue(school.id));
    } catch {
      notify('Bibliotheek laden mislukt.', 'error');
    }
  }, [school?.id]);

  useEffect(() => {
    if (!school || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSelectedStudent(null);
    Promise.all([
      supabase
        .from('students')
        .select('id, first_name, last_name, profile_picture_url')
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('first_name'),
      familyCatalogue(school.id),
    ])
      .then(([{ data }, lib]) => {
        const list = (data ?? []) as TuurStudent[];
        setStudents(list);
        setLibrary(lib);
        if (list.length > 0) setSelectedStudent(list[0]);
      })
      .catch(() => notify('Laden mislukt.', 'error'))
      .finally(() => setLoading(false));
  }, [school?.id, user?.id]);

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const sections: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: 'children', label: 'Per kind', icon: Users },
    { key: 'bulk', label: 'Meerdere kinderen', icon: UsersRound },
    { key: 'library', label: 'Bibliotheek', icon: Library },
    { key: 'channels', label: 'Kanalen', icon: LayoutGrid },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Tuur</h1>
          {userSchools.length > 1 && (
            <div className="relative">
              <select
                value={school?.id ?? ''}
                onChange={e => setSchool(userSchools.find(s => s.id === e.target.value) ?? null)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 font-medium cursor-pointer hover:border-brand-soft focus:outline-none focus:ring-2 focus:ring-brand-soft"
              >
                {userSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>
          )}
          {userSchools.length === 1 && school && <span className="text-sm text-gray-500">{school.name}</span>}
        </div>
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                section === s.key ? 'bg-white text-brand shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-brand-tint bg-gradient-to-r from-brand-tint/60 to-cream p-5">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-tint flex items-center justify-center">
            <Tv className="w-5 h-5 text-brand" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Veilige filmpjes met Tuur</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Kies hier welke YouTube-filmpjes elk kind mag bekijken, hoe lang en op welk moment van de dag.
              Het kind kijkt in de Tuur-app door zijn WebWijzer-QR-code te scannen. Wijzigingen verschijnen
              de volgende keer dat de app de lijst ophaalt.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-brand">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Zelfde gegevens als in de Tuur-app voor iPhone en iPad</span>
            </div>
          </div>
        </div>
      </div>

      {!school ? (
        <Card><p className="text-center text-gray-500 py-8">Je bent nog niet gekoppeld aan een school of organisatie.</p></Card>
      ) : loading ? (
        <Card><p className="text-center text-gray-500 py-8">Laden…</p></Card>
      ) : section === 'children' ? (
        students.length === 0 ? (
          <Card><p className="text-center text-gray-500 py-8">Er zijn nog geen leerlingen in {school.name}.</p></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 items-start">
            <Card padding="sm" className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Zoek een kind…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft"
                />
              </div>
              <ul className="max-h-[60vh] overflow-y-auto -mx-1">
                {filteredStudents.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors ${
                        selectedStudent?.id === s.id ? 'bg-brand-tint text-brand font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Avatar student={s} />
                      <span className="truncate">{s.first_name} {s.last_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            {selectedStudent && (
              <TuurChildPanel
                key={selectedStudent.id}
                student={selectedStudent}
                schoolId={school.id}
                library={library}
                onLibraryChanged={refreshLibrary}
                notify={notify}
              />
            )}
          </div>
        )
      ) : section === 'bulk' ? (
        students.length === 0 ? (
          <Card><p className="text-center text-gray-500 py-8">Er zijn nog geen leerlingen in {school.name}.</p></Card>
        ) : (
          <TuurBulkPanel schoolId={school.id} students={students} library={library} notify={notify} />
        )
      ) : section === 'library' ? (
        <LibrarySection schoolId={school.id} library={library} onChanged={refreshLibrary} notify={notify} />
      ) : (
        <ChannelsSection schoolId={school.id} library={library} notify={notify} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ---------- Library ----------

function LibrarySection({ schoolId, library, onChanged, notify }: {
  schoolId: string; library: FamilyVideo[]; onChanged: () => Promise<void>; notify: Notify;
}) {
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueVideo[]>([]);
  const [removeTarget, setRemoveTarget] = useState<FamilyVideo | null>(null);

  useEffect(() => {
    adminCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
  }, []);

  const inLibrary = new Set(library.map(f => f.video.id));
  const categories = Array.from(new Set(catalogue.map(c => c.category || 'Andere')));

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;
    setAdding(true);
    try {
      await addLinkToFamily(link, schoolId);
      await onChanged();
      setLink('');
      notify('Filmpje toegevoegd aan de bibliotheek.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Toevoegen mislukt.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const importVideo = async (videoId: string) => {
    try {
      await addToFamily(videoId, schoolId, 'admin');
      await onChanged();
    } catch {
      notify('Toevoegen mislukt.', 'error');
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeFromFamily(removeTarget.id);
      await onChanged();
    } catch {
      notify('Verwijderen mislukt.', 'error');
    } finally {
      setRemoveTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Jullie bibliotheek</h2>
          <p className="text-sm text-gray-500">Goedgekeurde filmpjes die je daarna per kind kan aanzetten.</p>
        </div>
        <form onSubmit={addLink} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="Plak een YouTube-link"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </div>
          <Button type="submit" size="sm" loading={adding}><Plus className="w-4 h-4 mr-1" /> Toevoegen</Button>
        </form>
        {library.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Nog geen filmpjes. Plak een link of kies er hieronder uit de catalogus.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {library.map(f => (
              <div key={f.id} className="group relative">
                <VideoThumb title={f.video.title} thumbnail={f.video.thumbnail_url} />
                <p className="mt-1.5 text-xs font-medium text-gray-800 line-clamp-2">{f.video.title}</p>
                <button
                  onClick={() => setRemoveTarget(f)}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 rounded-md text-gray-500 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow"
                  title="Uit bibliotheek verwijderen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {catalogue.length > 0 && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tuur-catalogus</h2>
            <p className="text-sm text-gray-500">Door bijleer geselecteerde filmpjes. Voeg ze met één klik toe aan jullie bibliotheek.</p>
          </div>
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{cat}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {catalogue.filter(c => (c.category || 'Andere') === cat).map(c => {
                  const added = inLibrary.has(c.video.id);
                  return (
                    <div key={c.id}>
                      <VideoThumb title={c.video.title} thumbnail={c.video.thumbnail_url} />
                      <p className="mt-1.5 text-xs font-medium text-gray-800 line-clamp-2">{c.video.title}</p>
                      <button
                        onClick={() => !added && importVideo(c.video.id)}
                        disabled={added}
                        className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${added ? 'text-green-700' : 'text-brand hover:text-brand-dark'}`}
                      >
                        {added ? <><Check className="w-3.5 h-3.5" /> In bibliotheek</> : <><Plus className="w-3.5 h-3.5" /> Toevoegen</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      )}

      <ConfirmationModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Filmpje verwijderen?"
        message={`"${removeTarget?.video.title ?? ''}" verdwijnt uit de bibliotheek. Kinderen aan wie het al is toegewezen, blijven het zien tot je het bij hen uitzet.`}
        confirmText="Verwijderen"
        variant="danger"
      />
    </div>
  );
}

// ---------- Channels ----------

function ChannelsSection({ schoolId, library, notify }: { schoolId: string; library: FamilyVideo[]; notify: Notify }) {
  const [channels, setChannels] = useState<TuurChannel[] | null>(null);
  const [editing, setEditing] = useState<TuurChannel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TuurChannel | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    loadChannels(schoolId).then(setChannels).catch(() => { setChannels([]); notify('Kanalen laden mislukt.', 'error'); });
  }, [schoolId]);

  useEffect(refresh, [refresh]);

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    try {
      await saveChannel({ ...editing, name: editing.name.trim() });
      setEditing(null);
      refresh();
      notify('Kanaal opgeslagen.', 'success');
    } catch {
      notify('Opslaan mislukt.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteChannel(deleteTarget.id);
      refresh();
    } catch {
      notify('Verwijderen mislukt.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (!channels) return <Card><p className="text-center text-gray-500 py-8">Laden…</p></Card>;

  const titleOf = (id: string) => library.find(f => f.video.id === id)?.video.title;

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kanalen</h2>
          <p className="text-sm text-gray-500">
            Groepeer filmpjes per thema. Een kind met de keuzemodus "Per kanaal" kiest eerst een kanaal.
            Het ziet alleen kanalen met filmpjes die aan hem of haar zijn toegewezen.
          </p>
        </div>
        <Button size="sm" className="flex-shrink-0 whitespace-nowrap" onClick={() => setEditing({ id: crypto.randomUUID(), school_id: schoolId, name: '', emoji: '', video_ids: [] })}>
          <Plus className="w-4 h-4 mr-1" /> Nieuw kanaal
        </Button>
      </div>

      {channels.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">Nog geen kanalen.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {channels.map(c => {
            const global = c.school_id === null;
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl w-8 text-center">{c.emoji || '📺'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {c.name}
                    {global && <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">Tuur</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {c.video_ids.length} {c.video_ids.length === 1 ? 'filmpje' : 'filmpjes'}
                    {c.video_ids.length > 0 && ': ' + c.video_ids.map(titleOf).filter(Boolean).slice(0, 3).join(', ')}
                  </p>
                </div>
                {!global && (
                  <>
                    <button onClick={() => setEditing({ ...c, emoji: c.emoji ?? '' })} className="p-1.5 text-gray-400 hover:text-gray-700" title="Bewerken">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600" title="Verwijderen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{channels.some(c => c.id === editing.id) ? 'Kanaal bewerken' : 'Nieuw kanaal'}</h3>
              <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex gap-3">
                <input
                  value={editing.emoji ?? ''}
                  onChange={e => setEditing({ ...editing, emoji: e.target.value })}
                  placeholder="🐘"
                  maxLength={4}
                  className="w-16 text-center text-xl px-2 py-2 border border-gray-300 rounded-lg"
                  aria-label="Emoji"
                />
                <input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Naam, bv. Dieren"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft"
                  autoFocus
                />
              </div>
              {library.length === 0 ? (
                <p className="text-sm text-gray-500">Voeg eerst filmpjes toe aan de bibliotheek.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {library.map(f => {
                    const on = editing.video_ids.includes(f.video.id);
                    return (
                      <button
                        key={f.video.id}
                        onClick={() => setEditing({
                          ...editing,
                          video_ids: on ? editing.video_ids.filter(v => v !== f.video.id) : [...editing.video_ids, f.video.id],
                        })}
                        className={`relative text-left rounded-lg p-1.5 border-2 ${on ? 'border-brand bg-brand-tint/40' : 'border-transparent hover:border-gray-200'}`}
                      >
                        <VideoThumb title={f.video.title} thumbnail={f.video.thumbnail_url} />
                        <p className="mt-1 text-xs text-gray-800 line-clamp-2">{f.video.title}</p>
                        {on && (
                          <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>Annuleren</Button>
              <Button size="sm" onClick={save} loading={saving} disabled={!editing.name.trim()}>Opslaan</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Kanaal verwijderen?"
        message={`Het kanaal "${deleteTarget?.name ?? ''}" wordt verwijderd. De filmpjes zelf blijven in de bibliotheek.`}
        confirmText="Verwijderen"
        variant="danger"
      />
    </Card>
  );
}
