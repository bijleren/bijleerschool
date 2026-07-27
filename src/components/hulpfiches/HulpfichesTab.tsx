import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import {
  FileText, Plus, Pencil, Trash2, Eye, EyeOff, Upload, X, ChevronDown,
  ChevronRight, Users, Download, Search, ChevronDown as ChevronDownSm,
  Layers, ArrowUpRight, BookOpen
} from 'lucide-react';

const DEFAULT_VAKKEN = [
  'Nederlands', 'Wiskunde', 'Engels', 'Geschiedenis', 'Aardrijkskunde',
  'Biologie', 'Scheikunde', 'Natuurkunde', 'Kunst', 'Muziek',
  'Lichamelijke opvoeding', 'Algemeen'
];

const LEERJAREN = [
  '1e leerjaar', '2e leerjaar', '3e leerjaar', '4e leerjaar',
  '5e leerjaar', '6e leerjaar', '1e graad', '2e graad', '3e graad',
];

interface School { id: string; name: string; }

interface Fiche {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  is_visible_to_students: boolean;
  created_at: string;
  hulpfiche_vakken: { vak_name: string }[];
  hulpfiche_leerjaren: { leerjaar: string }[];
  hulpfiche_assignments: { id: string; assignable_type: string; assignable_id: string }[];
}

interface Student { id: string; first_name: string; last_name: string; }
interface Group { id: string; name: string; }

interface HulpfichesTabProps {
  focusSchool?: School | null;
  userSchools?: School[];
}

export function HulpfichesTab({ focusSchool, userSchools = [] }: HulpfichesTabProps) {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingFiche, setEditingFiche] = useState<Fiche | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningFiche, setAssigningFiche] = useState<Fiche | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fiche | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVakken, setFormVakken] = useState<string[]>([]);
  const [formLeerjaren, setFormLeerjaren] = useState<string[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFilePreview, setFormFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Assignment state
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  // UI state
  const [expandedVak, setExpandedVak] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // School selection
  useEffect(() => {
    if (focusSchool) {
      setSelectedSchool(focusSchool);
      setSchoolId(focusSchool.id);
      setLoading(false);
    } else {
      fetchUserSchool();
    }
  }, [user, focusSchool]);

  useEffect(() => {
    if (selectedSchool && selectedSchool.id !== schoolId) {
      setSchoolId(selectedSchool.id);
    }
  }, [selectedSchool?.id]);

  useEffect(() => {
    if (schoolId) fetchFiches();
  }, [schoolId]);

  const fetchUserSchool = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_schools')
        .select('school_id, schools(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();
      if (data?.schools) {
        const s = data.schools as unknown as School;
        setSelectedSchool(s);
        setSchoolId(data.school_id);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const fetchFiches = async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('hulpfiches')
        .select(`
          id, title, description, file_url, file_name, file_size, file_type,
          is_visible_to_students, created_at,
          hulpfiche_vakken(vak_name),
          hulpfiche_leerjaren(leerjaar),
          hulpfiche_assignments(id, assignable_type, assignable_id)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFiches(data || []);
    } catch {
      setToast({ message: 'Fout bij laden van fiches', type: 'error' });
    }
  };

  const fetchStudentsAndGroups = async () => {
    if (!schoolId) return;
    const [studentsRes, groupsRes] = await Promise.all([
      supabase.from('students').select('id, first_name, last_name')
        .eq('school_id', schoolId).eq('is_active', true).order('last_name'),
      supabase.from('groups').select('id, name')
        .eq('school_id', schoolId).eq('is_active', true).order('name'),
    ]);
    setStudents(studentsRes.data || []);
    setGroups(groupsRes.data || []);
  };

  // Group fiches by vak
  const fichesByVak: Record<string, Fiche[]> = {};
  const filtered = fiches.filter(f =>
    !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  filtered.forEach(f => {
    const vakken = f.hulpfiche_vakken.map(v => v.vak_name);
    const keys = vakken.length > 0 ? vakken : ['Geen vak'];
    keys.forEach(vak => {
      if (!fichesByVak[vak]) fichesByVak[vak] = [];
      fichesByVak[vak].push(f);
    });
  });

  // Form helpers
  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormVakken([]);
    setFormLeerjaren([]); setFormVisible(false);
    setFormFile(null); setFormFilePreview(null);
    setEditingFiche(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (f: Fiche) => {
    setEditingFiche(f);
    setFormTitle(f.title);
    setFormDescription(f.description || '');
    setFormVakken(f.hulpfiche_vakken.map(v => v.vak_name));
    setFormLeerjaren(f.hulpfiche_leerjaren.map(v => v.leerjaar));
    setFormVisible(f.is_visible_to_students);
    setFormFile(null);
    setFormFilePreview(f.file_url);
    setShowForm(true);
  };

  const toggleChip = (val: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; size: number; type: string } | null> => {
    try {
      const ext = file.name.split('.').pop();
      const path = `${schoolId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('hulpfiches-files').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('hulpfiches-files').getPublicUrl(path);
      return { url: data.publicUrl, name: file.name, size: file.size, type: file.type };
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !schoolId || !user) return;
    setSaving(true);
    try {
      let fileData: { file_url: string; file_name: string; file_size: number; file_type: string } | undefined;
      if (formFile) {
        const uploaded = await uploadFile(formFile);
        if (!uploaded) { setToast({ message: 'Bestand uploaden mislukt', type: 'error' }); return; }
        fileData = { file_url: uploaded.url, file_name: uploaded.name, file_size: uploaded.size, file_type: uploaded.type };
      }

      let ficheId: string;
      if (editingFiche) {
        const { error } = await supabase.from('hulpfiches').update({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          is_visible_to_students: formVisible,
          ...(fileData || {}),
        }).eq('id', editingFiche.id);
        if (error) throw error;
        ficheId = editingFiche.id;

        // Replace vakken and leerjaren
        await supabase.from('hulpfiche_vakken').delete().eq('fiche_id', ficheId);
        await supabase.from('hulpfiche_leerjaren').delete().eq('fiche_id', ficheId);
      } else {
        const { data, error } = await supabase.from('hulpfiches').insert({
          school_id: schoolId,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          is_visible_to_students: formVisible,
          created_by: user.id,
          ...(fileData || {}),
        }).select('id').single();
        if (error) throw error;
        ficheId = data.id;
      }

      if (formVakken.length > 0) {
        await supabase.from('hulpfiche_vakken').insert(formVakken.map(v => ({ fiche_id: ficheId, vak_name: v })));
      }
      if (formLeerjaren.length > 0) {
        await supabase.from('hulpfiche_leerjaren').insert(formLeerjaren.map(l => ({ fiche_id: ficheId, leerjaar: l })));
      }

      setToast({ message: editingFiche ? 'Fiche bijgewerkt' : 'Fiche aangemaakt', type: 'success' });
      setShowForm(false);
      resetForm();
      fetchFiches();
    } catch {
      setToast({ message: 'Opslaan mislukt', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supabase.from('hulpfiches').delete().eq('id', deleteTarget.id);
      setToast({ message: 'Fiche verwijderd', type: 'success' });
      setDeleteTarget(null);
      fetchFiches();
    } catch {
      setToast({ message: 'Verwijderen mislukt', type: 'error' });
    }
  };

  const toggleVisibility = async (f: Fiche) => {
    try {
      await supabase.from('hulpfiches').update({ is_visible_to_students: !f.is_visible_to_students }).eq('id', f.id);
      fetchFiches();
    } catch {
      setToast({ message: 'Wijzigen mislukt', type: 'error' });
    }
  };

  const openAssign = (f: Fiche) => {
    setAssigningFiche(f);
    setAssignSearch('');
    setShowAssignModal(true);
    fetchStudentsAndGroups();
  };

  const toggleAssignment = async (fiche: Fiche, type: 'student' | 'group', id: string) => {
    setAssignSaving(true);
    try {
      const existing = fiche.hulpfiche_assignments.find(a => a.assignable_type === type && a.assignable_id === id);
      if (existing) {
        await supabase.from('hulpfiche_assignments').delete().eq('id', existing.id);
      } else {
        await supabase.from('hulpfiche_assignments').insert({
          fiche_id: fiche.id, assignable_type: type, assignable_id: id, assigned_by: user!.id,
        });
      }
      await fetchFiches();
      setAssigningFiche(prev => fiches.find(f => f.id === prev?.id) ?? prev);
    } catch {
      setToast({ message: 'Toewijzen mislukt', type: 'error' });
    } finally {
      setAssignSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29" />
      </div>
    );
  }

  const allVakken = Object.keys(fichesByVak).sort((a, b) => {
    if (a === 'Geen vak') return 1;
    if (b === 'Geen vak') return -1;
    return a.localeCompare(b);
  });

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(assignSearch.toLowerCase())
  );
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(assignSearch.toLowerCase()));

  const currentAssigning = assigningFiche ? fiches.find(f => f.id === assigningFiche.id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Hulpfiches</h1>
          {userSchools.length > 1 && (
            <div className="relative">
              <select
                value={selectedSchool?.id ?? ''}
                onChange={e => {
                  const s = userSchools.find(s => s.id === e.target.value);
                  if (s) { setSelectedSchool(s); setSchoolId(s.id); }
                }}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 font-medium cursor-pointer hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {userSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDownSm className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>
          )}
          {userSchools.length === 1 && selectedSchool && (
            <span className="text-sm text-gray-500">{selectedSchool.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoeken..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-48"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe fiche
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-slate-50 p-5">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Layers className="w-5 h-5 text-#946B29" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Hulpfiches als verticale leerlijn</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Houd alle hulpmiddelen van je school op één centrale plek bij. Door fiches te koppelen aan een vak en leerjaar bouw je een verticale leerlijn op — tools die doorheen verschillende jaren hergebruikt en verfijnd worden. Wijs een fiche toe aan een leerling of klas zodat de digitale versie automatisch verschijnt in hun WebWijzer.
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-xs text-#74531F">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Georganiseerd per vak</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-#74531F">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Verticale leerlijn over leerjaren</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-#74531F">
                <Users className="w-3.5 h-3.5" />
                <span>Direct zichtbaar in WebWijzer van de leerling</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fiches grouped by vak */}
      {fiches.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nog geen fiches</h3>
            <p className="text-gray-500 mb-6">Maak je eerste hulpfiche aan om te delen met leerlingen.</p>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Eerste fiche aanmaken</Button>
          </div>
        </Card>
      ) : allVakken.length === 0 ? (
        <Card><div className="p-8 text-center text-gray-500">Geen fiches gevonden voor "{searchQuery}"</div></Card>
      ) : (
        <div className="space-y-3">
          {allVakken.map(vak => {
            const vakFiches = fichesByVak[vak];
            const isOpen = expandedVak === vak || allVakken.length === 1;
            return (
              <Card key={vak} className="overflow-hidden">
                <button
                  onClick={() => setExpandedVak(isOpen && allVakken.length > 1 ? null : vak)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-#946B29" />
                    </div>
                    <span className="font-semibold text-gray-900">{vak}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {vakFiches.length} {vakFiches.length === 1 ? 'fiche' : 'fiches'}
                    </span>
                  </div>
                  {allVakken.length > 1 && (
                    isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {vakFiches.map(fiche => (
                      <div key={fiche.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                        {/* File icon / preview */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {fiche.file_type?.includes('image') ? (
                            <img src={fiche.file_url!} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{fiche.title}</span>
                            {fiche.is_visible_to_students ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Eye className="w-3 h-3" />Zichtbaar
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <EyeOff className="w-3 h-3" />Verborgen
                              </span>
                            )}
                          </div>
                          {fiche.description && (
                            <p className="text-sm text-gray-500 mt-0.5 truncate">{fiche.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {fiche.hulpfiche_leerjaren.map(l => (
                              <span key={l.leerjaar} className="text-xs bg-amber-50 text-#74531F px-2 py-0.5 rounded-full">
                                {l.leerjaar}
                              </span>
                            ))}
                            {fiche.hulpfiche_assignments.length > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {fiche.hulpfiche_assignments.length} toegewezen
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {fiche.file_url && (
                            <a
                              href={fiche.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-#946B29 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Openen"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => openAssign(fiche)}
                            className="p-2 text-gray-400 hover:text-#946B29 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Toewijzen"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleVisibility(fiche)}
                            className="p-2 text-gray-400 hover:text-#946B29 hover:bg-amber-50 rounded-lg transition-colors"
                            title={fiche.is_visible_to_students ? 'Verbergen' : 'Zichtbaar maken'}
                          >
                            {fiche.is_visible_to_students ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEdit(fiche)}
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Bewerken"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(fiche)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingFiche ? 'Fiche bewerken' : 'Nieuwe fiche'}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel <span className="text-red-500">*</span></label>
                <Input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Naam van de fiche"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Korte uitleg over deze fiche..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bestand</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { setFormFile(file); setFormFilePreview(URL.createObjectURL(file)); }
                  }}
                />
                {(formFile || formFilePreview) ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {formFile?.name || editingFiche?.file_name || 'Huidig bestand'}
                      </p>
                      {formFile && (
                        <p className="text-xs text-gray-500">{(formFile.size / 1024).toFixed(0)} KB</p>
                      )}
                    </div>
                    <button onClick={() => { setFormFile(null); setFormFilePreview(null); }} className="p-1 hover:bg-gray-200 rounded">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-amber-500 hover:bg-amber-50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Klik om een bestand te uploaden</span>
                    <span className="text-xs text-gray-400">PDF, Word, Excel, PowerPoint of afbeelding (max 20 MB)</span>
                  </button>
                )}
                {(!formFile && !formFilePreview) && (
                  <p className="text-xs text-gray-400 mt-1">Optioneel — je kan ook een fiche zonder bestand aanmaken.</p>
                )}
              </div>

              {/* Vakken */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vak(ken)</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_VAKKEN.map(vak => (
                    <button
                      key={vak}
                      type="button"
                      onClick={() => toggleChip(vak, formVakken, setFormVakken)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formVakken.includes(vak)
                          ? 'bg-#946B29 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {vak}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leerjaren */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Leerjaar/jaren</label>
                <div className="flex flex-wrap gap-2">
                  {LEERJAREN.map(lj => (
                    <button
                      key={lj}
                      type="button"
                      onClick={() => toggleChip(lj, formLeerjaren, setFormLeerjaren)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formLeerjaren.includes(lj)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Zichtbaar voor leerlingen</p>
                  <p className="text-xs text-gray-500 mt-0.5">Leerlingen zien deze fiche in hun WebWijzer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormVisible(v => !v)}
                  className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${formVisible ? 'bg-#946B29' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${formVisible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowForm(false); resetForm(); }}>
                Annuleren
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                loading={saving}
                disabled={!formTitle.trim()}
              >
                {editingFiche ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && currentAssigning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Toewijzen</h2>
                <p className="text-sm text-gray-500">{currentAssigning.title}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek leerling of klas..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {filteredGroups.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">Klassen</p>
                  {filteredGroups.map(g => {
                    const assigned = currentAssigning.hulpfiche_assignments.some(
                      a => a.assignable_type === 'group' && a.assignable_id === g.id
                    );
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleAssignment(currentAssigning, 'group', g.id)}
                        disabled={assignSaving}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          assigned ? 'bg-amber-50 text-#74531F' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span>{g.name}</span>
                        {assigned && <div className="w-4 h-4 rounded-full bg-#946B29 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>}
                      </button>
                    );
                  })}
                </div>
              )}
              {filteredStudents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1 mt-2">Leerlingen</p>
                  {filteredStudents.map(s => {
                    const assigned = currentAssigning.hulpfiche_assignments.some(
                      a => a.assignable_type === 'student' && a.assignable_id === s.id
                    );
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleAssignment(currentAssigning, 'student', s.id)}
                        disabled={assignSaving}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          assigned ? 'bg-amber-50 text-#74531F' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span>{s.first_name} {s.last_name}</span>
                        {assigned && <div className="w-4 h-4 rounded-full bg-#946B29 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>}
                      </button>
                    );
                  })}
                </div>
              )}
              {filteredGroups.length === 0 && filteredStudents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Geen resultaten</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <Button variant="secondary" className="w-full" onClick={() => setShowAssignModal(false)}>
                Sluiten
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmationModal
          title="Fiche verwijderen"
          message={`Weet je zeker dat je "${deleteTarget.title}" wilt verwijderen?`}
          confirmLabel="Verwijderen"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDestructive
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
