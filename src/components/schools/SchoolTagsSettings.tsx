import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Plus, Tag, Trash2, CreditCard as Edit, X, Check, Users } from 'lucide-react';

export interface TagDefinition {
  id: string;
  school_id: string;
  name: string;
  color: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  student_count?: number;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#0EA5E9',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#D97706',
];

function getRandomColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

interface SchoolTagsSettingsProps {
  schoolId: string;
  onTagsChanged?: () => void;
}

export function SchoolTagsSettings({ schoolId, onTagsChanged }: SchoolTagsSettingsProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(getRandomColor());
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Color picker open state
  const [showNewColorPicker, setShowNewColorPicker] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);
  const newColorRef = useRef<HTMLDivElement>(null);
  const editColorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTags();
  }, [schoolId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (newColorRef.current && !newColorRef.current.contains(e.target as Node)) {
        setShowNewColorPicker(false);
      }
      if (editColorRef.current && !editColorRef.current.contains(e.target as Node)) {
        setShowEditColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_tag_definitions')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch student counts for each tag
      const tagsWithCounts = await Promise.all(
        (data || []).map(async (tag) => {
          const { count } = await supabase
            .from('student_tag_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('tag_definition_id', tag.id);
          return { ...tag, student_count: count || 0 };
        })
      );

      setTags(tagsWithCounts);
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const createTag = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from('student_tag_definitions')
        .insert({
          school_id: schoolId,
          name: newName.trim(),
          color: newColor,
          description: newDescription.trim() || null,
          created_by: user?.id,
        });
      if (error) throw error;
      setNewName('');
      setNewColor(getRandomColor());
      setNewDescription('');
      setShowCreateForm(false);
      await fetchTags();
      onTagsChanged?.();
      showMessage('Tag aangemaakt');
    } catch (err) {
      console.error('Error creating tag:', err);
      showMessage('Fout bij aanmaken tag');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (tag: TagDefinition) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditDescription(tag.description || '');
    setShowEditColorPicker(false);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('student_tag_definitions')
        .update({
          name: editName.trim(),
          color: editColor,
          description: editDescription.trim() || null,
        })
        .eq('id', editingId);
      if (error) throw error;
      setEditingId(null);
      await fetchTags();
      onTagsChanged?.();
      showMessage('Tag bijgewerkt');
    } catch (err) {
      console.error('Error updating tag:', err);
      showMessage('Fout bij bijwerken tag');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (tag: TagDefinition) => {
    setConfirmModal({
      isOpen: true,
      title: 'Tag verwijderen',
      message: `Weet je zeker dat je "${tag.name}" wilt verwijderen? De tag wordt van ${tag.student_count || 0} leerling(en) verwijderd. De geschiedenis blijft bewaard.`,
      onConfirm: () => {
        deleteTag(tag.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('student_tag_definitions')
        .delete()
        .eq('id', tagId);
      if (error) throw error;
      await fetchTags();
      onTagsChanged?.();
      showMessage('Tag verwijderd');
    } catch (err) {
      console.error('Error deleting tag:', err);
      showMessage('Fout bij verwijderen tag');
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('Fout')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-gray-900">Tags beheren</h4>
          <p className="text-sm text-gray-500 mt-0.5">Maak labels aan om leerlingen te categoriseren en te filteren.</p>
        </div>
        <Button onClick={() => { setShowCreateForm(true); setNewColor(getRandomColor()); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe tag
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card className="border-2 border-amber-100 bg-amber-50/30">
          <h5 className="text-sm font-semibold text-gray-800 mb-3">Nieuwe tag aanmaken</h5>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Color swatch + picker */}
              <div className="relative" ref={newColorRef}>
                <button
                  type="button"
                  onClick={() => setShowNewColorPicker(p => !p)}
                  className="w-10 h-10 rounded-lg border-2 border-white shadow-sm ring-1 ring-gray-200 flex-shrink-0 transition-transform hover:scale-105"
                  style={{ backgroundColor: newColor }}
                  title="Kies kleur"
                />
                {showNewColorPicker && (
                  <div className="absolute top-12 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-52">
                    <p className="text-xs text-gray-500 mb-2">Kies een kleur</p>
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setNewColor(c); setShowNewColorPicker(false); }}
                          className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${newColor === c ? 'ring-2 ring-offset-1 ring-gray-800' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                        title="Aangepaste kleur"
                      />
                      <span className="text-xs text-gray-500">Aangepast</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Naam van de tag *"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createTag(); if (e.key === 'Escape') setShowCreateForm(false); }}
                  autoFocus
                />
              </div>
            </div>
            <Input
              placeholder="Omschrijving (optioneel)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
            />
            {/* Preview */}
            {newName && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Voorbeeld:</span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-medium"
                  style={{ backgroundColor: newColor }}
                >
                  {newName}
                </span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4 mr-1" />
                Annuleren
              </Button>
              <Button onClick={createTag} loading={creating} disabled={!newName.trim()}>
                <Check className="w-4 h-4 mr-1" />
                Aanmaken
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tag list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-#946B29 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tags.length === 0 ? (
        <Card className="text-center py-10">
          <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nog geen tags aangemaakt</p>
          <p className="text-gray-400 text-xs mt-1">Maak je eerste tag aan om leerlingen te labelen.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <Card key={tag.id} className="py-3 px-4">
              {editingId === tag.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={editColorRef}>
                      <button
                        type="button"
                        onClick={() => setShowEditColorPicker(p => !p)}
                        className="w-8 h-8 rounded-lg border-2 border-white shadow-sm ring-1 ring-gray-200 flex-shrink-0 transition-transform hover:scale-105"
                        style={{ backgroundColor: editColor }}
                      />
                      {showEditColorPicker && (
                        <div className="absolute top-10 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-52">
                          <p className="text-xs text-gray-500 mb-2">Kies een kleur</p>
                          <div className="grid grid-cols-5 gap-2">
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => { setEditColor(c); setShowEditColorPicker(false); }}
                                className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${editColor === c ? 'ring-2 ring-offset-1 ring-gray-800' : ''}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="color"
                              value={editColor}
                              onChange={e => setEditColor(e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-0"
                            />
                            <span className="text-xs text-gray-500">Aangepast</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Naam *"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      />
                    </div>
                  </div>
                  <Input
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Omschrijving (optioneel)"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4 mr-1" />
                      Annuleren
                    </Button>
                    <Button onClick={saveEdit} loading={saving} disabled={!editName.trim()}>
                      <Check className="w-4 h-4 mr-1" />
                      Opslaan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-white text-xs font-medium"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tag.student_count}
                        </span>
                      </div>
                      {tag.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(tag)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Bewerken"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => confirmDelete(tag)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
