import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { 
  ArrowLeft, 
  Save, 
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  File,
  AlertTriangle
} from 'lucide-react';

interface BehaviorIncident {
  id: string;
  school_id: string;
  student_id: string;
  behavior_item_id: string;
  reported_by: string;
  incident_date: string;
  location: string | null;
  description: string;
  action_taken: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  status: 'pending' | 'in_progress' | 'resolved';
  followup_action_id: string | null;
  followup_action_other: string | null;
  created_at: string;
  updated_at: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
}

interface BehaviorCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface BehaviorSeverityLevel {
  id: string;
  name: string;
  level: number;
  color: string;
}

interface BehaviorItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  severity_level_id: string;
  behavior_categories: BehaviorCategory;
  behavior_severity_levels: BehaviorSeverityLevel;
}

interface Consequence {
  id: string;
  name: string;
  description: string | null;
  severity_level: number | null;
  is_active: boolean;
}

interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

interface BehaviorIncidentEditProps {
  incident: BehaviorIncident;
  onIncidentUpdated: () => void;
  onCancel: () => void;
}

export function BehaviorIncidentEdit({ incident, onIncidentUpdated, onCancel }: BehaviorIncidentEditProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviorItems, setBehaviorItems] = useState<BehaviorItem[]>([]);
  const [consequences, setConsequences] = useState<Consequence[]>([]);
  const [attachments, setAttachments] = useState<IncidentAttachment[]>([]);

  // Form state
  const [studentId, setStudentId] = useState(incident.student_id);
  const [behaviorItemId, setBehaviorItemId] = useState(incident.behavior_item_id);
  const [incidentDate, setIncidentDate] = useState(incident.incident_date.slice(0, 16));
  const [location, setLocation] = useState(incident.location || '');
  const [description, setDescription] = useState(incident.description);
  const [actionTakenConsequenceId, setActionTakenConsequenceId] = useState('');
  const [actionTakenOther, setActionTakenOther] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(incident.follow_up_required);
  const [followUpDate, setFollowUpDate] = useState(incident.follow_up_date?.slice(0, 10) || '');
  const [followUpNotes, setFollowUpNotes] = useState(incident.follow_up_notes || '');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'resolved'>(incident.status);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);

  // Delete incident state
  const [deletingIncident, setDeletingIncident] = useState(false);

  // Confirmation modal
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
    fetchStudents();
    fetchBehaviorItems();
    fetchConsequences();
    fetchAttachments();
  }, []);

  // Set initial action taken values after consequences are loaded
  useEffect(() => {
    if (consequences.length > 0) {
      // Check if the current action_taken matches any consequence
      const matchingConsequence = consequences.find(c => c.name === incident.action_taken);
      
      if (matchingConsequence) {
        setActionTakenConsequenceId(matchingConsequence.id);
        setActionTakenOther('');
      } else if (incident.action_taken) {
        // If action_taken exists but doesn't match any consequence, set as "other"
        setActionTakenConsequenceId('other');
        setActionTakenOther(incident.action_taken);
      }
    }
  }, [consequences, incident.action_taken]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', incident.school_id)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchBehaviorItems = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_items')
        .select(`
          *,
          behavior_categories (*),
          behavior_severity_levels (*)
        `)
        .eq('school_id', incident.school_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBehaviorItems(data || []);
    } catch (error) {
      console.error('Error fetching behavior items:', error);
    }
  };

  const fetchConsequences = async () => {
    try {
      const { data, error } = await supabase
        .from('consequences')
        .select('*')
        .eq('school_id', incident.school_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setConsequences(data || []);
    } catch (error) {
      console.error('Error fetching consequences:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_incident_attachments')
        .select('*')
        .eq('incident_id', incident.id)
        .order('created_at');

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      // Determine action taken value
      let actionTakenValue = '';
      if (actionTakenConsequenceId && actionTakenConsequenceId !== 'other') {
        const selectedConsequence = consequences.find(c => c.id === actionTakenConsequenceId);
        actionTakenValue = selectedConsequence?.name || '';
      } else if (actionTakenConsequenceId === 'other') {
        actionTakenValue = actionTakenOther;
      }

      const { error } = await supabase
        .from('behavior_incidents')
        .update({
          student_id: studentId,
          behavior_item_id: behaviorItemId,
          incident_date: incidentDate,
          location: location || null,
          description,
          action_taken: actionTakenValue || null,
          follow_up_required: followUpRequired,
          follow_up_date: followUpRequired && followUpDate ? followUpDate : null,
          follow_up_notes: followUpRequired && followUpNotes ? followUpNotes : null,
          status,
          // Note: followup_action_id references followup_actions table which doesn't exist in current schema
          // The action_taken field already stores the consequence name, so we don't need these fields
        })
        .eq('id', incident.id);

      if (error) throw error;

      setMessage('Incident succesvol bijgewerkt!');
      onIncidentUpdated();
    } catch (error) {
      console.error('Error updating incident:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van het incident.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingFile(true);
    setMessage('');

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `behavior-incidents/${incident.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      // Save attachment record
      const { error: attachmentError } = await supabase
        .from('behavior_incident_attachments')
        .insert({
          incident_id: incident.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (attachmentError) throw attachmentError;

      setMessage('Bestand succesvol geüpload!');
      fetchAttachments();
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Er is een fout opgetreden bij het uploaden van het bestand.');
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteAttachment = async (attachmentId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const filePath = urlParts.slice(-3).join('/'); // Get last 3 parts: behavior-incidents/id/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([filePath]);

      if (storageError) {
        console.warn('Error deleting from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete attachment record
      const { error: dbError } = await supabase
        .from('behavior_incident_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      setMessage('Bestand succesvol verwijderd!');
      fetchAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van het bestand.');
    }
  };

  const downloadAttachment = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteIncident = async () => {
    setDeletingIncident(true);
    
    try {
      const { error } = await supabase
        .from('behavior_incidents')
        .delete()
        .eq('id', incident.id);

      if (error) throw error;

      // Navigate back to incidents list
      onIncidentUpdated();
    } catch (error) {
      console.error('Error deleting incident:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van het incident.');
    } finally {
      setDeletingIncident(false);
    }
  };

  const showDeleteConfirmation = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Incident verwijderen',
      message: 'Weet je zeker dat je dit incident wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt. Alle bijlagen en gerelateerde gegevens worden ook verwijderd.',
      onConfirm: () => {
        deleteIncident();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar incidenten
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Incident bewerken</h1>
          <p className="text-gray-600">Wijzig de details van het gedragsincident</p>
        </div>
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

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student *
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecteer student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                  {student.student_number && ` (#${student.student_number})`}
                  {student.grade_level && ` - ${student.grade_level}`}
                </option>
              ))}
            </select>
          </div>

          {/* Behavior Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gedragsitem *
            </label>
            <select
              value={behaviorItemId}
              onChange={(e) => setBehaviorItemId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecteer gedragsitem</option>
              {behaviorItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.behavior_categories.name} - Niveau {item.behavior_severity_levels.level})
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Datum en tijd *"
              type="datetime-local"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              required
            />
            <Input
              label="Locatie"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bijv. Klaslokaal 1A, Speelplaats"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschrijving *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Beschrijf wat er gebeurd is..."
            />
          </div>

          {/* Action Taken */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Consequentie:
            </label>
            <select
              value={actionTakenConsequenceId}
              onChange={(e) => setActionTakenConsequenceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-3"
            >
              <option value="">Geen actie ondernomen</option>
              {consequences.map((consequence) => (
                <option key={consequence.id} value={consequence.id}>
                  {consequence.name}
                  {consequence.severity_level && ` (Niveau ${consequence.severity_level})`}
                </option>
              ))}
              <option value="other">Andere...</option>
            </select>

            {actionTakenConsequenceId === 'other' && (
              <textarea
                value={actionTakenOther}
                onChange={(e) => setActionTakenOther(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Beschrijf welke andere actie je hebt ondernomen..."
                required
              />
            )}
          </div>

          {/* Follow-up */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="followUpRequired" className="ml-2 block text-sm text-gray-900">
                Follow-up vereist
              </label>
            </div>

            {followUpRequired && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <Input
                  label="Follow-up datum"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up notities
                  </label>
                  <textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Wat moet er gedaan worden?"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'in_progress' | 'resolved')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="pending">Melding</option>
              <option value="in_progress">Onderzoek</option>
              <option value="resolved">Afgerond</option>
            </select>
          </div>

          {/* File Attachments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Bijlagen ({attachments.length})
              </label>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  loading={uploadingFile}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bestand toevoegen
                </Button>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                {attachments.map((attachment) => {
                  const FileIcon = getFileIcon(attachment.file_type);
                  
                  return (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center space-x-3">
                        <FileIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.file_size)} • 
                            Geüpload op {new Date(attachment.created_at).toLocaleDateString('nl-NL')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadAttachment(attachment.file_url, attachment.file_name)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: 'Bestand verwijderen',
                            message: `Weet je zeker dat je "${attachment.file_name}" wilt verwijderen?`,
                            onConfirm: () => {
                              deleteAttachment(attachment.id, attachment.file_url);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            },
                          })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button 
              type="button" 
              variant="danger" 
              onClick={showDeleteConfirmation}
              loading={deletingIncident}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Incident verwijderen
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuleren
            </Button>
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4 mr-2" />
              Wijzigingen opslaan
            </Button>
          </div>
        </form>
      </Card>

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