import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { Tag, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface BookTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface BookTagsSettingsProps {
  schoolId: string;
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#64748B',
];

export function BookTagsSettings({ schoolId }: BookTagsSettingsProps) {
  const [tags, setTags] = useState<BookTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTag, setEditingTag] = useState<BookTag | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTags();
  }, [schoolId]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_tag_definitions')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      setTags(data || []);
    } catch {
      setToast({ message: 'Fout bij ophalen tags', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      if (editingTag) {
        const { error } = await supabase
          .from('book_tag_definitions')
          .update({ name: newName.trim(), color: newColor })
          .eq('id', editingTag.id);
        if (error) throw error;
        setToast({ message: 'Tag bijgewerkt', type: 'success' });
      } else {
        const { error } = await supabase
          .from('book_tag_definitions')
          .insert({ school_id: schoolId, name: newName.trim(), color: newColor });
        if (error) throw error;
        setToast({ message: 'Tag toegevoegd', type: 'success' });
      }
      resetForm();
      fetchTags();
    } catch (err: any) {
      if (err?.code === '23505') {
        setToast({ message: 'Een tag met deze naam bestaat al', type: 'error' });
      } else {
        setToast({ message: 'Fout bij opslaan tag', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: BookTag) => {
    if (!confirm(`Weet je zeker dat je de tag "${tag.name}" wilt verwijderen? Dit verwijdert de tag van alle boeken.`)) return;
    try {
      const { error } = await supabase
        .from('book_tag_definitions')
        .delete()
        .eq('id', tag.id);
      if (error) throw error;
      setToast({ message: 'Tag verwijderd', type: 'success' });
      fetchTags();
    } catch {
      setToast({ message: 'Fout bij verwijderen tag', type: 'error' });
    }
  };

  const startEdit = (tag: BookTag) => {
    setEditingTag(tag);
    setNewName(tag.name);
    setNewColor(tag.color);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingTag(null);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Boek Tags</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Maak eigen tags aan om boeken te categoriseren op thema, niveau of andere kenmerken.
              </p>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tag toevoegen
              </Button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {editingTag ? 'Tag bewerken' : 'Nieuwe tag'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="bijv. Avontuur, Niveau 3, Thema Natuur..."
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') resetForm(); }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kleur</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                          newColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Of kies een kleur:</span>
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Voorbeeld:</span>
                  <span
                    className="px-3 py-1 text-xs font-medium rounded-full text-white"
                    style={{ backgroundColor: newColor }}
                  >
                    {newName || 'Tag naam'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSave} disabled={!newName.trim() || saving}>
                  <Check className="w-4 h-4 mr-1.5" />
                  {saving ? 'Opslaan...' : editingTag ? 'Bijwerken' : 'Toevoegen'}
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  <X className="w-4 h-4 mr-1.5" />
                  Annuleren
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-#946B29" />
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nog geen tags aangemaakt</p>
              <p className="text-gray-400 text-sm mt-1">
                Voeg tags toe om boeken te categoriseren op thema, leesniveau of andere kenmerken.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="px-3 py-1 text-sm font-medium rounded-full text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(tag)}
                      className="p-1.5 text-gray-400 hover:text-#946B29 hover:bg-amber-50 rounded transition-colors"
                      title="Bewerken"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
