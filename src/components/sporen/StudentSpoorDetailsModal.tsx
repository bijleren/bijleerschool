import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { X, Save, Flag } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  profile_picture_url: string | null;
}

interface Spoor {
  id: string;
  name: string;
  color: string;
}

interface StudentSpoorDetailsModalProps {
  student: Student;
  groupId: string;
  subjectId: string;
  sporen: Spoor[];
  currentSpoorId: string | null;
  onClose: () => void;
  onSave: () => void;
}

export function StudentSpoorDetailsModal({
  student,
  groupId,
  subjectId,
  sporen,
  currentSpoorId,
  onClose,
  onSave
}: StudentSpoorDetailsModalProps) {
  const { user } = useAuth();
  const [spoorId, setSpoorId] = useState<string | null>(currentSpoorId);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: assignment } = await supabase
        .from('student_spoor_assignments')
        .select('spoor_id, needs_attention')
        .eq('student_id', student.id)
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('is_current', true)
        .maybeSingle();

      if (assignment) {
        setSpoorId(assignment.spoor_id);
        setNeedsAttention(assignment.needs_attention || false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await supabase
        .from('student_spoor_assignments')
        .update({ is_current: false })
        .eq('student_id', student.id)
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('is_current', true);

      if (spoorId) {
        const { error } = await supabase
          .from('student_spoor_assignments')
          .insert({
            student_id: student.id,
            group_id: groupId,
            school_subject_id: subjectId,
            spoor_id: spoorId,
            needs_attention: needsAttention,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            is_current: true
          });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Er is een fout opgetreden bij het opslaan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {student.first_name} {student.last_name}
            </h2>
            {student.student_number && (
              <p className="text-sm text-gray-500">Leerlingnummer: {student.student_number}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spoor toewijzen
            </label>
            <select
              value={spoorId || ''}
              onChange={(e) => setSpoorId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Geen spoor (niet toegewezen)</option>
              {sporen.map(spoor => (
                <option key={spoor.id} value={spoor.id}>
                  {spoor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={needsAttention}
                onChange={(e) => setNeedsAttention(e.target.checked)}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <Flag className={`w-5 h-5 ${needsAttention ? 'text-red-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700">
                Deze leerling heeft extra aandacht nodig
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2 ml-11">
              Markeer deze leerling als prioriteit voor opvolging
            </p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
