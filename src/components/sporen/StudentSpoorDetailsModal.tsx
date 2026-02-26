import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { X, Save, Flag, User } from 'lucide-react';

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

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
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
  const [begeleidingKlas, setBegeleidingKlas] = useState('');
  const [begeleidingThuis, setBegeleidingThuis] = useState('');
  const [evaluatie, setEvaluatie] = useState('');
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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
        .select('*')
        .eq('student_id', student.id)
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('is_current', true)
        .maybeSingle();

      if (assignment) {
        setSpoorId(assignment.spoor_id);
        setBegeleidingKlas(assignment.begeleiding_klas || '');
        setBegeleidingThuis(assignment.begeleiding_thuis || '');
        setEvaluatie(assignment.evaluatie || '');
        setTeamMemberId(assignment.team_member_id || null);
        setNeedsAttention(assignment.needs_attention || false);
      }

      const { data: studentData } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', student.id)
        .single();

      if (studentData?.school_id) {
        const { data: members } = await supabase
          .from('user_schools')
          .select('user_id')
          .eq('school_id', studentData.school_id)
          .eq('status', 'approved')
          .eq('is_active', true);

        if (members) {
          const userIds = members.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);

          if (profiles) {
            setTeamMembers(profiles);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !spoorId) return;

    setSaving(true);
    try {
      await supabase
        .from('student_spoor_assignments')
        .update({ is_current: false })
        .eq('student_id', student.id)
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('is_current', true);

      const { error } = await supabase
        .from('student_spoor_assignments')
        .insert({
          student_id: student.id,
          group_id: groupId,
          school_subject_id: subjectId,
          spoor_id: spoorId,
          begeleiding_klas: begeleidingKlas,
          begeleiding_thuis: begeleidingThuis,
          evaluatie: evaluatie,
          team_member_id: teamMemberId,
          needs_attention: needsAttention,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          is_current: true
        });

      if (error) throw error;

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
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
              Spoor
            </label>
            <select
              value={spoorId || ''}
              onChange={(e) => setSpoorId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecteer een spoor</option>
              {sporen.map(spoor => (
                <option key={spoor.id} value={spoor.id}>
                  {spoor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Verantwoordelijke teamlid
            </label>
            <select
              value={teamMemberId || ''}
              onChange={(e) => setTeamMemberId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Geen teamlid geselecteerd</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={needsAttention}
                onChange={(e) => setNeedsAttention(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <Flag className={`w-4 h-4 ${needsAttention ? 'text-red-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700">
                Leerling heeft aandacht nodig
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Begeleiding in de klas
            </label>
            <textarea
              value={begeleidingKlas}
              onChange={(e) => setBegeleidingKlas(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Beschrijf hoe de leerling wordt ondersteund in de klas..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Begeleiding thuis
            </label>
            <textarea
              value={begeleidingThuis}
              onChange={(e) => setBegeleidingThuis(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Beschrijf hoe de leerling thuis wordt ondersteund..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluatie
            </label>
            <textarea
              value={evaluatie}
              onChange={(e) => setEvaluatie(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Evalueer de voortgang en resultaten..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving || !spoorId}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
