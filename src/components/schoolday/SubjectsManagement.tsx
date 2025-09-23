import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { 
  X, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  BookOpen,
  Palette
} from 'lucide-react';

interface SchoolSubject {
  id: string;
  title: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

interface SubjectsManagementProps {
  schoolId: string;
  onClose: () => void;
}

const COMMON_ICONS = [
  'BookOpen', 'Calculator', 'Globe', 'Languages', 'Clock', 'Map', 
  'Atom', 'Zap', 'Music', 'Palette', 'Coffee', 'Utensils', 'Beaker',
  'Microscope', 'Gamepad2', 'Heart', 'Brain', 'Target', 'Trophy'
];

const DEFAULT_COLORS = [
  '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4',
  '#84CC16', '#F97316', '#EC4899', '#6366F1', '#6B7280', '#14B8A6'
];

export function SubjectsManagement({ schoolId, onClose }: SubjectsManagementProps) {
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    icon: 'BookOpen',
    color: '#3B82F6',
    sort_order: 0
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('school_subjects')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('school_subjects')
          .update(formData)
          .eq('id', editingSubject.id);

        if (error) throw error;
        setMessage('Vak succesvol bijgewerkt!');
      } else {
        const { error } = await supabase
          .from('school_subjects')
          .insert({
            ...formData,
            school_id: schoolId
          });

        if (error) throw error;
        setMessage('Vak succesvol toegevoegd!');
      }

      setShowAddForm(false);
      setEditingSubject(null);
      resetForm();
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      setMessage('Er is een fout opgetreden bij het opslaan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subjectId: string) => {
    try {
      const { error } = await supabase
        .from('school_subjects')
        .update({ is_active: false })
        .eq('id', subjectId);

      if (error) throw error;
      setMessage('Vak succesvol verwijderd!');
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen.');
    }
  };

  const startEdit = (subject: SchoolSubject) => {
    setEditingSubject(subject);
    setFormData({
      title: subject.title,
      icon: subject.icon,
      color: subject.color,
      sort_order: subject.sort_order
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      icon: 'BookOpen',
      color: '#3B82F6',
      sort_order: subjects.length
    });
    setEditingSubject(null);
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BookOpen className="w-6 h-6 mr-3" />
              Vakken Beheren
            </h2>
            <p className="text-gray-600">Beheer de vakken voor je school</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('succesvol')
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            {/* Add/Edit Form */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Vakken ({subjects.length})</h3>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Vak toevoegen
              </Button>
            </div>

            {showAddForm && (
              <Card>
                <h4 className="text-lg font-semibold mb-4">
                  {editingSubject ? 'Vak bewerken' : 'Nieuw vak toevoegen'}
                </h4>
                <div className="space-y-4">
                  <Input
                    label="Titel"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Bijv. Nederlands, Wiskunde"
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icoon
                      </label>
                      <select
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {COMMON_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kleur
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="h-10 w-16 border border-gray-300 rounded-lg"
                        />
                        <div className="flex flex-wrap gap-1">
                          {DEFAULT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setFormData({ ...formData, color })}
                              className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Input
                    label="Sorteervolgorde"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button variant="secondary" onClick={cancelEdit}>
                      Annuleren
                    </Button>
                    <Button onClick={handleSave} loading={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingSubject ? 'Bijwerken' : 'Toevoegen'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Subjects List */}
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {subjects.length === 0 ? (
                <Card className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Geen vakken gevonden</h3>
                  <p className="text-gray-600">Voeg vakken toe om ze te gebruiken in je schema's.</p>
                </Card>
              ) : (
                subjects.map((subject) => (
                  <Card key={subject.id} padding="sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: subject.color }}
                        >
                          <span className="text-sm font-medium">
                            {subject.icon === 'BookOpen' ? '📚' : 
                             subject.icon === 'Calculator' ? '🔢' :
                             subject.icon === 'Globe' ? '🌍' :
                             subject.icon === 'Languages' ? '🗣️' :
                             subject.icon === 'Clock' ? '🕐' :
                             subject.icon === 'Map' ? '🗺️' :
                             subject.icon === 'Atom' ? '⚛️' :
                             subject.icon === 'Zap' ? '⚡' :
                             subject.icon === 'Music' ? '🎵' :
                             subject.icon === 'Palette' ? '🎨' :
                             subject.icon === 'Coffee' ? '☕' :
                             subject.icon === 'Utensils' ? '🍽️' : '📖'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{subject.title}</h4>
                          <p className="text-sm text-gray-500">
                            {subject.icon} • Volgorde: {subject.sort_order}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => startEdit(subject)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: 'Vak verwijderen',
                            message: `Weet je zeker dat je "${subject.title}" wilt verwijderen? Dit kan invloed hebben op bestaande schema's.`,
                            onConfirm: () => {
                              handleDelete(subject.id);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            },
                          })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Verwijderen"
        cancelText="Annuleren"
        variant="danger"
      />
    </div>
  );
}