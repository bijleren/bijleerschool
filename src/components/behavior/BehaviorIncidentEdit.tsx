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
  AlertTriangle,
  Plus,
  Users
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

interface TeacherNotification {
  id: string;
  incident_id: string;
  teacher_id: string;
  notification_type: 'teacher';
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface GroupNotification {
  id: string;
  incident_id: string;
  group_id: string;
  notification_type: 'group';
  groups: {
    name: string;
  };
}

type IncidentNotification = TeacherNotification | GroupNotification;

interface AvailableTeacher {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AvailableGroup {
  id: string;
  name: string;
  description: string | null;
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
  const [notifications, setNotifications] = useState<IncidentNotification[]>([]);
  const [eersteActies, setEersteActies] = useState<Array<{ id?: string; consequence_id: string; notes: string }>>([]);
  const [followupActies, setFollowupActies] = useState<Array<{ id?: string; consequence_id: string; notes: string; action_date: string }>>([]);
  const [availableTeachers, setAvailableTeachers] = useState<AvailableTeacher[]>([]);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [incidentStudents, setIncidentStudents] = useState<Array<{ id?: string; student_id: string; role_id: string }>>([]);
  const [studentRoles, setStudentRoles] = useState<any[]>([]);

  // Form state
  const [behaviorItemId, setBehaviorItemId] = useState(incident.behavior_item_id);
  const [incidentDate, setIncidentDate] = useState(incident.incident_date.slice(0, 16));
  const [location, setLocation] = useState(incident.location || '');
  const [description, setDescription] = useState(incident.description);
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'resolved'>(incident.status);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);

  // Notification management state
  const [showAddNotification, setShowAddNotification] = useState(false);
  const [selectedNotificationType, setSelectedNotificationType] = useState<'teacher' | 'group'>('teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

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
    fetchNotifications();
    fetchAvailableTeachers();
    fetchAvailableGroups();
    fetchEersteActies();
    fetchFollowupActies();
    fetchIncidentStudents();
    fetchStudentRoles();
  }, []);

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

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_incident_notifications')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email
          ),
          groups (
            name
          )
        `)
        .eq('incident_id', incident.id);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          user_id,
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('school_id', incident.school_id)
        .eq('status', 'approved')
        .eq('is_active', true);

      if (error) throw error;
      
      const teachers = data?.map(us => ({
        id: us.profiles.id,
        user_id: us.user_id,
        first_name: us.profiles.first_name,
        last_name: us.profiles.last_name,
        email: us.profiles.email
      })) || [];
      
      setAvailableTeachers(teachers);
    } catch (error) {
      console.error('Error fetching available teachers:', error);
    }
  };

  const fetchAvailableGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('school_id', incident.school_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailableGroups(data || []);
    } catch (error) {
      console.error('Error fetching available groups:', error);
    }
  };

  const fetchEersteActies = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_incident_eerste_acties')
        .select('*')
        .eq('incident_id', incident.id)
        .order('created_at');

      if (error) throw error;
      setEersteActies(data?.map(actie => ({
        id: actie.id,
        consequence_id: actie.consequence_id,
        notes: actie.notes || ''
      })) || []);
    } catch (error) {
      console.error('Error fetching eerste acties:', error);
    }
  };

  const fetchFollowupActies = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_incident_followup_acties')
        .select('*')
        .eq('incident_id', incident.id)
        .order('action_date', { ascending: false });

      if (error) throw error;
      setFollowupActies(data?.map(actie => ({
        id: actie.id,
        consequence_id: actie.consequence_id,
        notes: actie.notes || '',
        action_date: actie.action_date
      })) || []);
    } catch (error) {
      console.error('Error fetching followup acties:', error);
    }
  };

  const fetchIncidentStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_incident_students')
        .select('*')
        .eq('incident_id', incident.id);

      if (error) throw error;
      setIncidentStudents(data?.map(student => ({
        id: student.id,
        student_id: student.student_id,
        role_id: student.role_id
      })) || []);
    } catch (error) {
      console.error('Error fetching incident students:', error);
    }
  };

  // Initialize eerste acties with at least one empty slot if none exist
  useEffect(() => {
    if (eersteActies.length === 0) {
      setEersteActies([{ consequence_id: '', notes: '' }]);
    }
  }, [eersteActies.length]);

  const fetchStudentRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('student_roles')
        .select('*')
        .eq('school_id', incident.school_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStudentRoles(data || []);
    } catch (error) {
      console.error('Error fetching student roles:', error);
    }
  };

  const addNotification = async () => {
    try {
      const notificationData: any = {
        incident_id: incident.id,
        notification_type: selectedNotificationType,
      };

      if (selectedNotificationType === 'teacher') {
        if (!selectedTeacherId) return;
        notificationData.teacher_id = selectedTeacherId;
        notificationData.group_id = null;
      } else {
        if (!selectedGroupId) return;
        notificationData.group_id = selectedGroupId;
        notificationData.teacher_id = null;
      }

      const { error } = await supabase
        .from('behavior_incident_notifications')
        .insert(notificationData);

      if (error) throw error;

      setMessage('Notificatie succesvol toegevoegd!');
      setShowAddNotification(false);
      setSelectedTeacherId('');
      setSelectedGroupId('');
      fetchNotifications();
    } catch (error) {
      console.error('Error adding notification:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen van de notificatie.');
    }
  };

  const removeNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('behavior_incident_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setMessage('Notificatie succesvol verwijderd!');
      fetchNotifications();
    } catch (error) {
      console.error('Error removing notification:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de notificatie.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('behavior_incidents')
        .update({
          student_id: incidentStudents[0]?.student_id || incident.student_id,
          behavior_item_id: behaviorItemId,
          incident_date: incidentDate,
          location: location || null,
          description,
          status
        })
        .eq('id', incident.id);

      if (error) throw error;

      // Update incident students
      // Delete existing student relationships
      const { error: deleteStudentsError } = await supabase
        .from('behavior_incident_students')
        .delete()
        .eq('incident_id', incident.id);

      if (deleteStudentsError) throw deleteStudentsError;

      // Insert new student relationships
      if (incidentStudents.length > 0) {
        const studentInserts = incidentStudents.map(student => ({
          incident_id: incident.id,
          student_id: student.student_id,
          role_id: student.role_id,
        }));

        const { error: studentsError } = await supabase
          .from('behavior_incident_students')
          .insert(studentInserts);

        if (studentsError) throw studentsError;
      }

      // Update eerste acties
      // First, delete existing eerste acties
      const { error: deleteEersteError } = await supabase
        .from('behavior_incident_eerste_acties')
        .delete()
        .eq('incident_id', incident.id);

      if (deleteEersteError) throw deleteEersteError;

      // Then insert new eerste acties
      if (eersteActies.length > 0) {
        const eersteActiesInserts = eersteActies.map(actie => ({
          incident_id: incident.id,
          consequence_id: actie.consequence_id,
          notes: actie.notes || null,
        }));

        const { error: eersteActiesError } = await supabase
          .from('behavior_incident_eerste_acties')
          .insert(eersteActiesInserts);

        if (eersteActiesError) throw eersteActiesError;
      }

      // Update followup acties
      // Delete existing followup acties
      const { error: deleteFollowupError } = await supabase
        .from('behavior_incident_followup_acties')
        .delete()
        .eq('incident_id', incident.id);

      if (deleteFollowupError) throw deleteFollowupError;

      // Insert new followup acties
      if (followupActies.length > 0) {
        const followupActiesInserts = followupActies.map(actie => ({
          incident_id: incident.id,
          consequence_id: actie.consequence_id,
          notes: actie.notes || null,
          action_date: actie.action_date,
        }));

        const { error: followupActiesError } = await supabase
          .from('behavior_incident_followup_acties')
          .insert(followupActiesInserts);

        if (followupActiesError) throw followupActiesError;
      }

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

  const addEersteActie = () => {
    setEersteActies([...eersteActies, { consequence_id: '', notes: '' }]);
  };

  const removeEersteActie = (index: number) => {
    setEersteActies(eersteActies.filter((_, i) => i !== index));
  };

  const updateEersteActie = (index: number, field: 'consequence_id' | 'notes', value: string) => {
    const updated = [...eersteActies];
    updated[index][field] = value;
    setEersteActies(updated);
  };

  const addFollowupActie = () => {
    setFollowupActies([...followupActies, { consequence_id: '', notes: '', action_date: new Date().toISOString().split('T')[0] }]);
  };

  const removeFollowupActie = (index: number) => {
    setFollowupActies(followupActies.filter((_, i) => i !== index));
  };

  const updateFollowupActie = (index: number, field: 'consequence_id' | 'notes' | 'action_date', value: string) => {
    const updated = [...followupActies];
    updated[index][field] = value;
    setFollowupActies(updated);
  };

  const addIncidentStudent = () => {
    const defaultRole = studentRoles.find(r => r.is_default) || studentRoles[0];
    setIncidentStudents([...incidentStudents, { student_id: '', role_id: defaultRole?.id || '' }]);
  };

  const removeIncidentStudent = (index: number) => {
    setIncidentStudents(incidentStudents.filter((_, i) => i !== index));
  };

  const updateIncidentStudent = (index: number, field: 'student_id' | 'role_id', value: string) => {
    const updated = [...incidentStudents];
    updated[index][field] = value;
    setIncidentStudents(updated);
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
          {/* Students Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Betrokken studenten *
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={addIncidentStudent}>
                <Plus className="w-4 h-4 mr-1" />
                Student toevoegen
              </Button>
            </div>

            {incidentStudents.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Geen studenten geselecteerd</p>
              </div>
            )}

            <div className="space-y-3">
              {incidentStudents.map((incidentStudent, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <select
                      value={incidentStudent.student_id}
                      onChange={(e) => updateIncidentStudent(index, 'student_id', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Selecteer student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.first_name} {student.last_name}
                          {student.student_number && ` (#${student.student_number})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <select
                      value={incidentStudent.role_id}
                      onChange={(e) => updateIncidentStudent(index, 'role_id', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Selecteer rol</option>
                      {studentRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeIncidentStudent(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
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

          {/* Eerste Acties */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Eerste acties *
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={addEersteActie}>
                <Plus className="w-4 h-4 mr-1" />
                Actie toevoegen
              </Button>
            </div>

            {eersteActies.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Geen acties toegevoegd. Voeg minimaal één eerste actie toe.</p>
              </div>
            )}

            <div className="space-y-3">
              {eersteActies.map((actie, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <select
                        value={actie.consequence_id}
                        onChange={(e) => updateEersteActie(index, 'consequence_id', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Selecteer actie</option>
                        {consequences.map((consequence) => (
                          <option key={consequence.id} value={consequence.id}>
                            {consequence.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeEersteActie(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notities (optioneel)
                    </label>
                    <textarea
                      value={actie.notes}
                      onChange={(e) => updateEersteActie(index, 'notes', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Voeg eventuele notities toe voor deze actie..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up Acties */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Follow-up acties
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={addFollowupActie}>
                <Plus className="w-4 h-4 mr-1" />
                Follow-up actie toevoegen
              </Button>
            </div>

            {followupActies.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 text-sm">Geen follow-up acties toegevoegd</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followupActies.map((actie, index) => (
                  <div key={index} className="p-4 bg-blue-50 rounded-lg space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <select
                            value={actie.consequence_id}
                            onChange={(e) => updateFollowupActie(index, 'consequence_id', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Selecteer actie</option>
                            {consequences.map((consequence) => (
                              <option key={consequence.id} value={consequence.id}>
                                {consequence.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="date"
                            value={actie.action_date}
                            onChange={(e) => updateFollowupActie(index, 'action_date', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeFollowupActie(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notities (optioneel)
                      </label>
                      <textarea
                        value={actie.notes}
                        onChange={(e) => updateFollowupActie(index, 'notes', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Voeg eventuele notities toe voor deze follow-up actie..."
                      />
                    </div>
                  </div>
                ))}
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

          {/* Teacher/Group Notifications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Geïnformeerde personen ({notifications.length})
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowAddNotification(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Persoon toevoegen
              </Button>
            </div>

            {showAddNotification && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Persoon informeren</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={selectedNotificationType}
                      onChange={(e) => setSelectedNotificationType(e.target.value as 'teacher' | 'group')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="teacher">Individuele docent</option>
                      <option value="group">Hele groep</option>
                    </select>
                  </div>

                  {selectedNotificationType === 'teacher' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Docent
                      </label>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Selecteer docent</option>
                        {availableTeachers
                          .filter(teacher => !notifications.some(n => 
                            n.notification_type === 'teacher' && 
                            (n as TeacherNotification).teacher_id === teacher.id
                          ))
                          .map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name} ({teacher.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Groep
                      </label>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Selecteer groep</option>
                        {availableGroups
                          .filter(group => !notifications.some(n => 
                            n.notification_type === 'group' && 
                            (n as GroupNotification).group_id === group.id
                          ))
                          .map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setShowAddNotification(false)}
                    >
                      Annuleren
                    </Button>
                    <Button 
                      type="button" 
                      onClick={addNotification}
                      disabled={selectedNotificationType === 'teacher' ? !selectedTeacherId : !selectedGroupId}
                    >
                      Toevoegen
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {notifications.length > 0 && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.notification_type === 'teacher' 
                          ? 'bg-blue-100' 
                          : 'bg-green-100'
                      }`}>
                        {notification.notification_type === 'teacher' ? (
                          <User className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Users className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {notification.notification_type === 'teacher' 
                            ? `${(notification as TeacherNotification).profiles.first_name} ${(notification as TeacherNotification).profiles.last_name}`
                            : `Groep: ${(notification as GroupNotification).groups.name}`
                          }
                        </p>
                        {notification.notification_type === 'teacher' && (
                          <p className="text-sm text-gray-500">
                            {(notification as TeacherNotification).profiles.email}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {notification.notification_type === 'teacher' ? 'Individuele docent' : 'Hele groep'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
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