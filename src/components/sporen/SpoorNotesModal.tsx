import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { X, Save, Check, Clock } from 'lucide-react';

interface SpoorNotesModalProps {
  groupId: string;
  subjectId: string;
  spoorId: string;
  spoorName: string;
  groupName: string;
  subjectName: string;
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
  onClose,
  onSave
}: SpoorNotesModalProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchNotes();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (notes !== originalNotes) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    }
  }, [notes]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('spoor_notes')
        .select('notes_text')
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('spoor_id', spoorId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const notesText = data?.notes_text || '';
      setNotes(notesText);
      setOriginalNotes(notesText);
    } catch (error) {
      console.error('Error fetching notes:', error);
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
            created_by_user_id: user.id
          });

        if (error) throw error;
      }

      setOriginalNotes(notes);
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

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notities
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Voeg hier je notities toe voor deze combinatie van klas, vak en spoor..."
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {notes.length} tekens
              </p>
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
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-200">
            <Button onClick={onClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
