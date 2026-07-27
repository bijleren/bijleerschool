import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { X, Plus, CreditCard as Edit, Trash2, Save, GraduationCap, ArrowUp, ArrowDown } from 'lucide-react';

interface SchoolGrade {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface GradeManagementProps {
  schoolId: string;
  onClose: () => void;
  inline?: boolean;
  onCountChange?: (count: number) => void;
}

export function GradeManagement({ schoolId, onClose, inline = false, onCountChange }: GradeManagementProps) {
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState<SchoolGrade | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('school_grades')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setGrades(data || []);
      onCountChange?.((data || []).length);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (editingGrade) {
        const { error } = await supabase
          .from('school_grades')
          .update(formData)
          .eq('id', editingGrade.id);

        if (error) throw error;
        setMessage('Groep succesvol bijgewerkt!');
      } else {
        const { error } = await supabase
          .from('school_grades')
          .insert({
            ...formData,
            school_id: schoolId
          });

        if (error) throw error;
        setMessage('Groep succesvol toegevoegd!');
      }

      setShowAddForm(false);
      setEditingGrade(null);
      resetForm();
      fetchGrades();
    } catch (error) {
      console.error('Error saving grade:', error);
      setMessage('Er is een fout opgetreden bij het opslaan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gradeId: string) => {
    try {
      const { error } = await supabase
        .from('school_grades')
        .update({ is_active: false })
        .eq('id', gradeId);

      if (error) throw error;
      setMessage('Groep succesvol verwijderd!');
      fetchGrades();
    } catch (error) {
      console.error('Error deleting grade:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen.');
    }
  };

  const moveGrade = async (gradeId: string, direction: 'up' | 'down') => {
    const currentIndex = grades.findIndex(g => g.id === gradeId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= grades.length) return;

    try {
      // Swap sort orders
      const currentGrade = grades[currentIndex];
      const targetGrade = grades[newIndex];

      await Promise.all([
        supabase
          .from('school_grades')
          .update({ sort_order: targetGrade.sort_order })
          .eq('id', currentGrade.id),
        supabase
          .from('school_grades')
          .update({ sort_order: currentGrade.sort_order })
          .eq('id', targetGrade.id)
      ]);

      fetchGrades();
    } catch (error) {
      console.error('Error moving grade:', error);
      setMessage('Er is een fout opgetreden bij het verplaatsen.');
    }
  };

  const startEdit = (grade: SchoolGrade) => {
    setEditingGrade(grade);
    setFormData({
      name: grade.name,
      description: grade.description || '',
      sort_order: grade.sort_order
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sort_order: grades.length
    });
    setEditingGrade(null);
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    resetForm();
  };

  const content = (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('succesvol')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Leerjaren ({grades.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Leerjaar toevoegen
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingGrade ? 'Leerjaar bewerken' : 'Nieuw leerjaar toevoegen'}
          </h4>
          <div className="space-y-4">
            <Input
              label="Naam"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Leerjaar 3, Niveau 1A"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Bijv. Onderbouw - 6 jaar"
              />
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
                {editingGrade ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {grades.length === 0 ? (
          <Card className="text-center py-8">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen leerjaren gevonden</h3>
            <p className="text-gray-600">Voeg leerjaren toe om ze te gebruiken bij techniek registratie.</p>
          </Card>
        ) : (
          grades.map((grade, index) => (
            <Card key={grade.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-#946B29" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{grade.name}</h4>
                    {grade.description && (
                      <p className="text-sm text-gray-600">{grade.description}</p>
                    )}
                    <p className="text-xs text-gray-500">Volgorde: {grade.sort_order}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveGrade(grade.id, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveGrade(grade.id, 'down')}
                    disabled={index === grades.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => startEdit(grade)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Leerjaar verwijderen',
                      message: `Weet je zeker dat je "${grade.name}" wilt verwijderen? Dit kan invloed hebben op bestaande registraties.`,
                      onConfirm: () => {
                        handleDelete(grade.id);
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

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <GraduationCap className="w-6 h-6 mr-3" />
              Leerjaar/Niveau Beheren
            </h2>
            <p className="text-gray-600">Beheer de leerjaren en niveaus voor je school</p>
          </div>

          {content}
        </div>
      </div>
    </div>
  );
}