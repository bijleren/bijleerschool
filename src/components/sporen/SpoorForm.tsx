import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { X, GitBranch, Check } from 'lucide-react';
import * as Icons from 'lucide-react';

interface Spoor {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  linked_subjects: string[];
}

interface Subject {
  id: string;
  name: string;
}

interface SpoorFormProps {
  schoolId: string;
  subjects: Subject[];
  editingSpoor: Spoor | null;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  'GraduationCap', 'Star', 'Award', 'Target', 'Zap', 'TrendingUp',
  'Rocket', 'Flag', 'Trophy', 'BookOpen', 'Brain', 'Sparkles'
];

const PREDEFINED_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

export function SpoorForm({ schoolId, subjects, editingSpoor, onClose }: SpoorFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('GraduationCap');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingSpoor) {
      setName(editingSpoor.name);
      setColor(editingSpoor.color);
      setIcon(editingSpoor.icon);
      setSelectedSubjects(editingSpoor.linked_subjects);
    }
  }, [editingSpoor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingSpoor) {
        const { error: updateError } = await supabase
          .from('sporen')
          .update({
            name: name.trim(),
            color,
            icon,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSpoor.id);

        if (updateError) throw updateError;

        await supabase
          .from('spoor_subject_links')
          .delete()
          .eq('spoor_id', editingSpoor.id);

        if (selectedSubjects.length > 0) {
          const links = selectedSubjects.map(subjectId => ({
            spoor_id: editingSpoor.id,
            school_subject_id: subjectId
          }));

          const { error: linksError } = await supabase
            .from('spoor_subject_links')
            .insert(links);

          if (linksError) throw linksError;
        }
      } else {
        const { data: maxOrderData } = await supabase
          .from('sporen')
          .select('sort_order')
          .eq('school_id', schoolId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextOrder = (maxOrderData?.sort_order ?? -1) + 1;

        const { data: newSpoor, error: insertError } = await supabase
          .from('sporen')
          .insert({
            school_id: schoolId,
            name: name.trim(),
            color,
            icon,
            sort_order: nextOrder,
            is_active: true
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (selectedSubjects.length > 0 && newSpoor) {
          const links = selectedSubjects.map(subjectId => ({
            spoor_id: newSpoor.id,
            school_subject_id: subjectId
          }));

          const { error: linksError } = await supabase
            .from('spoor_subject_links')
            .insert(links);

          if (linksError) throw linksError;
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving spoor:', error);
      alert('Er is een fout opgetreden bij het opslaan van het spoor.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const IconComponent = (Icons as any)[icon] || Icons.GraduationCap;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingSpoor ? 'Spoor Bewerken' : 'Nieuw Spoor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Naam *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bijv. Basis, Verdieping, Uitdaging"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kleur
            </label>
            <div className="flex items-center space-x-4">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-200 flex items-center justify-center"
                style={{ backgroundColor: color }}
              >
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-9 gap-2 mb-3">
                  {PREDEFINED_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        color === c ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icoon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_ICONS.map((iconName) => {
                const Icon = (Icons as any)[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                      icon === iconName
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-gray-700" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gekoppelde Vakken
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Geen vakken beschikbaar. Maak eerst vakken aan in schoolbeheer.
                </p>
              ) : (
                subjects.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{subject.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selecteer de vakken waarvoor dit spoor beschikbaar is
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
            >
              {saving ? 'Opslaan...' : editingSpoor ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
