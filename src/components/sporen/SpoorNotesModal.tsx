import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { X, Save, Check, Clock, User } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
}

interface SpoorNotesModalProps {
  groupId: string;
  subjectId: string;
  spoorId: string;
  spoorName: string;
  groupName: string;
  subjectName: string;
  schoolId: string;
  onClose: () => void;
  onSave: (spoorId: string, notesText: string) => void;
}

export function SpoorNotesModal({
  groupId,
  subjectId,
  spoorId,
  spoorName,
  groupName,
  subjectName,
  schoolId,
  onClose,
  onSave
}: SpoorNotesModalProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [originalTeamMemberId, setOriginalTeamMemberId] = useState<string | null>(null);
  const [begeleidingKlas, setBegeleidingKlas] = useState('');
  const [originalBegeleidingKlas, setOriginalBegeleidingKlas] = useState('');
  const [begeleidingThuis, setBegeleidingThuis] = useState('');
  const [originalBegeleidingThuis, setOriginalBegeleidingThuis] = useState('');
  const [evaluatie, setEvaluatie] = useState('');
  const [originalEvaluatie, setOriginalEvaluatie] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchTeamMembers();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const hasChanges =
      notes !== originalNotes ||
      teamMemberId !== originalTeamMemberId ||
      begeleidingKlas !== originalBegeleidingKlas ||
      begeleidingThuis !== originalBegeleidingThuis ||
      evaluatie !== originalEvaluatie;

    if (hasChanges) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    }
  }, [notes, teamMemberId, begeleidingKlas, begeleidingThuis, evaluatie]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('spoor_notes')
        .select('notes_text, team_member_id, begeleiding_klas, begeleiding_thuis, evaluatie')
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('spoor_id', spoorId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const notesText = data?.notes_text || '';
      const teamMember = data?.team_member_id || null;
      const klas = data?.begeleiding_klas || '';
      const thuis = data?.begeleiding_thuis || '';
      const eval_text = data?.evaluatie || '';

      setNotes(notesText);
      setOriginalNotes(notesText);
      setTeamMemberId(teamMember);
      setOriginalTeamMemberId(teamMember);
      setBegeleidingKlas(klas);
      setOriginalBegeleidingKlas(klas);
      setBegeleidingThuis(thuis);
      setOriginalBegeleidingThuis(thuis);
      setEvaluatie(eval_text);
      setOriginalEvaluatie(eval_text);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: members } = await supabase
        .from('user_schools')
        .select('user_id')
        .eq('school_id', schoolId)
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
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleAutoSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('spoor_notes')
        .select('id')
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('spoor_id', spoorId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('spoor_notes')
          .update({
            notes_text: notes,
            team_member_id: teamMemberId,
            begeleiding_klas: begeleidingKlas,
            begeleiding_thuis: begeleidingThuis,
            evaluatie: evaluatie,
            updated_at: new Date().toISOString()
          })
          .eq('group_id', groupId)
          .eq('school_subject_id', subjectId)
          .eq('spoor_id', spoorId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('spoor_notes')
          .insert({
            group_id: groupId,
            school_subject_id: subjectId,
            spoor_id: spoorId,
            notes_text: notes,
            team_member_id: teamMemberId,
            begeleiding_klas: begeleidingKlas,
            begeleiding_thuis: begeleidingThuis,
            evaluatie: evaluatie,
            created_by_user_id: user.id
          });

        if (error) throw error;
      }

      setOriginalNotes(notes);
      setOriginalTeamMemberId(teamMemberId);
      setOriginalBegeleidingKlas(begeleidingKlas);
      setOriginalBegeleidingThuis(begeleidingThuis);
      setOriginalEvaluatie(evaluatie);
      setLastSaved(new Date());
      setJustSaved(true);
      onSave(spoorId, notes);

      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

    if (diff < 60) return 'zojuist opgeslagen';
    if (diff < 3600) return `${Math.floor(diff / 60)} minuten geleden opgeslagen`;
    return lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Notities voor {spoorName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {groupName} - {subjectName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Verantwoordelijke coach
            </label>
            <select
              value={teamMemberId || ''}
              onChange={(e) => setTeamMemberId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Geen coach geselecteerd</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              De coach die verantwoordelijk is voor dit spoor
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Begeleiding in de klas
            </label>
            <textarea
              value={begeleidingKlas}
              onChange={(e) => setBegeleidingKlas(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Beschrijf hoe leerlingen in dit spoor worden begeleid in de klas..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Begeleiding thuis
            </label>
            <textarea
              value={begeleidingThuis}
              onChange={(e) => setBegeleidingThuis(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Beschrijf hoe ouders thuis kunnen ondersteunen bij dit spoor..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluatie
            </label>
            <textarea
              value={evaluatie}
              onChange={(e) => setEvaluatie(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Evalueer de aanpak en resultaten van dit spoor..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Algemene notities
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Extra notities voor dit spoor..."
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              {saving && (
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                  Opslaan...
                </span>
              )}
              {justSaved && (
                <span className="text-xs text-green-600 flex items-center">
                  <Check className="w-3 h-3 mr-1" />
                  Opgeslagen
                </span>
              )}
              {lastSaved && !saving && !justSaved && (
                <span className="text-xs text-gray-500">
                  {formatLastSaved()}
                </span>
              )}
            </div>
            <Button onClick={onClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
