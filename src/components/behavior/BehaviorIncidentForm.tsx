import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  ArrowLeft, 
  Save, 
  Calendar,
  Clock,
  MapPin,
  User,
  Upload,
  AlertTriangle,
  Users,
  BookOpen,
  Coffee,
  Utensils,
  MoreHorizontal
} from 'lucide-react';

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

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  school_year: string | null;
}

interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface GroupDayTemplate {
  id: string;
  group_id: string;
  template_id: string;
  is_default: boolean;
  effective_from: string;
  effective_until: string | null;
  day_templates: DayTemplate;
}

interface TemplateBlock {
  id: string;
  template_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  block_type: 'lesson' | 'break' | 'lunch' | 'other';
  title: string;
  subject_id: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  school_subjects?: {
    id: string;
    title: string;
    icon: string;
    color: string;
  };
}

interface BehaviorIncidentFormProps {
  schoolId: string;
  onIncidentCreated: () => void;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Maandag' },
  { value: 2, label: 'Dinsdag' },
  { value: 3, label: 'Woensdag' },
  { value: 4, label: 'Donderdag' },
  { value: 5, label: 'Vrijdag' },
  { value: 6, label: 'Zaterdag' },
  { value: 0, label: 'Zondag' },
];

const BLOCK_TYPE_ICONS = {
  lesson: BookOpen,
  break: Coffee,
  lunch: Utensils,
  other: MoreHorizontal,
};

const BLOCK_TYPE_COLORS = {
  lesson: 'bg-blue-100 text-blue-800',
  break: 'bg-green-100 text-green-800',
  lunch: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

export function BehaviorIncidentForm({ schoolId, onIncidentCreated, onCancel }: BehaviorIncidentFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupTemplates, setGroupTemplates] = useState<GroupDayTemplate[]>([]);
  const [templateBlocks, setTemplateBlocks] = useState<TemplateBlock[]>([]);
  const [behaviorItems, setBehaviorItems] = useState<BehaviorItem[]>([]);
  const [consequences, setConsequences] = useState<Consequence[]>([]);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [behaviorItemId, setBehaviorItemId] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [actionTakenConsequenceId, setActionTakenConsequenceId] = useState('');
  const [actionTakenOther, setActionTakenOther] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'resolved'>('pending');

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchGroups();
    fetchBehaviorItems();
    fetchConsequences();

    // Check for preselected student
    const preselectedStudentId = sessionStorage.getItem('preselectedStudentId');
    if (preselectedStudentId) {
      setStudentId(preselectedStudentId);
      sessionStorage.removeItem('preselectedStudentId');
    }

    // Check for preload data from schoolday
    const preloadData = sessionStorage.getItem('behaviorPreloadData');
    if (preloadData) {
      try {
        const data = JSON.parse(preloadData);
        if (data.groupId) setSelectedGroupId(data.groupId);
        if (data.templateId) setSelectedTemplateId(data.templateId);
        if (data.blockId) setSelectedBlockId(data.blockId);
        if (data.incidentDate) setIncidentDate(data.incidentDate);
        if (data.location) setLocation(data.location);
        sessionStorage.removeItem('behaviorPreloadData');
      } catch (error) {
        console.error('Error parsing preload data:', error);
        sessionStorage.removeItem('behaviorPreloadData');
      }
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupTemplates();
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedTemplateId) {
      fetchTemplateBlocks();
    }
  }, [selectedTemplateId]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchGroupTemplates = async () => {
    if (!selectedGroupId) return;

    try {
      const { data, error } = await supabase
        .from('group_day_templates')
        .select(`
          *,
          day_templates (*)
        `)
        .eq('group_id', selectedGroupId)
        .order('is_default', { ascending: false })
        .order('effective_from', { ascending: false });

      if (error) throw error;
      setGroupTemplates(data || []);

      // Auto-select default template if available
      const defaultTemplate = data?.find(gt => gt.is_default);
      if (defaultTemplate && !selectedTemplateId) {
        setSelectedTemplateId(defaultTemplate.template_id);
      }
    } catch (error) {
      console.error('Error fetching group templates:', error);
    }
  };

  const fetchTemplateBlocks = async () => {
    if (!selectedTemplateId) return;

    try {
      const currentDate = new Date(incidentDate);
      const dayOfWeek = currentDate.getDay();

      const { data, error } = await supabase
        .from('day_template_blocks')
        .select(`
          *,
          school_subjects (
            id,
            title,
            icon,
            color
          )
        `)
        .eq('template_id', selectedTemplateId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;
      setTemplateBlocks(data || []);
    } catch (error) {
      console.error('Error fetching template blocks:', error);
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
        .eq('school_id', schoolId)
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
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setConsequences(data || []);
    } catch (error) {
      console.error('Error fetching consequences:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      // Get the selected template block data for storage
      const selectedBlock = templateBlocks.find(block => block.id === selectedBlockId);
      
      // Determine action taken value
      let actionTakenValue = '';
      if (actionTakenConsequenceId && actionTakenConsequenceId !== 'other') {
        const selectedConsequence = consequences.find(c => c.id === actionTakenConsequenceId);
        actionTakenValue = selectedConsequence?.name || '';
      } else if (actionTakenConsequenceId === 'other') {
        actionTakenValue = actionTakenOther;
      }

      // Create the incident
      const { data: incident, error: incidentError } = await supabase
        .from('behavior_incidents')
        .insert({
          school_id: schoolId,
          student_id: studentId,
          behavior_item_id: behaviorItemId,
          reported_by: user.id,
          incident_date: incidentDate,
          location: location || null,
          description,
          action_taken: actionTakenValue || null,
          follow_up_required: followUpRequired,
          follow_up_date: followUpRequired && followUpDate ? followUpDate : null,
          follow_up_notes: followUpRequired && followUpNotes ? followUpNotes : null,
          status,
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // If a lesson block was selected, create a day block activity record
      if (selectedBlockId && selectedBlock) {
        const activityDate = new Date(incidentDate).toISOString().split('T')[0];
        
        const { error: activityError } = await supabase
          .from('day_block_activities')
          .insert({
            template_block_id: selectedBlockId,
            user_id: user.id,
            activity_date: activityDate,
            activity_type: 'behavior_incident',
            behavior_incident_id: incident.id,
            notes: `Incident: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`
          });

        if (activityError) {
          console.warn('Error creating day block activity:', activityError);
          // Don't fail the whole operation if this fails
        }
      }

      // Handle file uploads if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `behavior-incidents/${incident.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('attachments')
              .getPublicUrl(filePath);

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
          } catch (fileError) {
            console.error('Error uploading file:', fileError);
            // Continue with other files
          }
        }
      }

      setMessage('Incident succesvol gemeld!');
      onIncidentCreated();
    } catch (error) {
      console.error('Error creating incident:', error);
      setMessage('Er is een fout opgetreden bij het melden van het incident.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds
  };

  const getBlockTypeIcon = (blockType: string) => {
    const Icon = BLOCK_TYPE_ICONS[blockType as keyof typeof BLOCK_TYPE_ICONS] || MoreHorizontal;
    return Icon;
  };

  const getBlockTypeColor = (blockType: string) => {
    return BLOCK_TYPE_COLORS[blockType as keyof typeof BLOCK_TYPE_COLORS] || 'bg-gray-100 text-gray-800';
  };

  const getCurrentDayOfWeek = () => {
    const date = new Date(incidentDate);
    return date.getDay();
  };

  const getDayName = (dayOfWeek: number) => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
    return day ? day.label : 'Onbekend';
  };

  // Filter template blocks for the current day
  const currentDayBlocks = templateBlocks.filter(block => 
    block.day_of_week === getCurrentDayOfWeek()
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar incidenten
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Incident melden</h1>
          <p className="text-gray-600">Meld een nieuw gedragsincident</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.toLowerCase().includes('succesvol')
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Datum en tijd *"
              type="datetime-local"
              value={incidentDate}
              onChange={(e) => {
                setIncidentDate(e.target.value);
                // Reset template blocks when date changes (different day of week)
                if (selectedTemplateId) {
                  fetchTemplateBlocks();
                }
              }}
              required
            />
            <Input
              label="Locatie"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bijv. Klaslokaal 1A, Speelplaats"
            />
          </div>

          {/* Lesson Block Selection */}
          <div className="space-y-4">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="context"
                  value="general"
                  checked={!selectedGroupId}
                  onChange={() => {
                    setSelectedGroupId('');
                    setSelectedTemplateId('');
                    setSelectedBlockId('');
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Algemeen incident</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="context"
                  value="lesson"
                  checked={!!selectedGroupId}
                  onChange={() => {
                    // Don't auto-select, let user choose
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Lesblok incident</span>
              </label>
            </div>

            {/* Group Selection for Lesson Context */}
            {(selectedGroupId || document.querySelector('input[name="context"]:checked')?.getAttribute('value') === 'lesson') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Klas/Groep
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setSelectedTemplateId('');
                    setSelectedBlockId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecteer klas/groep</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                      {group.grade_level && ` (${group.grade_level})`}
                      {group.school_year && ` - ${group.school_year}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Template Selection */}
            {selectedGroupId && groupTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dagschema Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value);
                    setSelectedBlockId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecteer template</option>
                  {groupTemplates.map((groupTemplate) => (
                    <option key={groupTemplate.id} value={groupTemplate.template_id}>
                      {groupTemplate.day_templates.name}
                      {groupTemplate.is_default && ' (Standaard)'}
                      {groupTemplate.day_templates.description && ` - ${groupTemplate.day_templates.description}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lesson Block Selection */}
            {selectedTemplateId && currentDayBlocks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesblok ({getDayName(getCurrentDayOfWeek())})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentDayBlocks.map((block) => {
                    const Icon = getBlockTypeIcon(block.block_type);
                    const colorClass = getBlockTypeColor(block.block_type);
                    
                    return (
                      <label
                        key={block.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedBlockId === block.id 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="lessonBlock"
                          value={block.id}
                          checked={selectedBlockId === block.id}
                          onChange={(e) => setSelectedBlockId(e.target.value)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <div className="ml-3 flex items-center space-x-3 flex-1">
                          <div className={`p-2 rounded-lg ${colorClass} flex items-center space-x-1`}>
                            <Icon className="w-4 h-4" />
                            {block.school_subjects && (
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: block.school_subjects.color }}
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{block.title}</span>
                              <span className="text-sm text-gray-500">
                                {formatTime(block.start_time)} - {formatTime(block.end_time)}
                              </span>
                            </div>
                            {block.school_subjects && (
                              <p className="text-sm text-gray-600">Vak: {block.school_subjects.title}</p>
                            )}
                            {block.description && (
                              <p className="text-xs text-gray-500">{block.description}</p>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedTemplateId && currentDayBlocks.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                  <p className="text-yellow-800">
                    Geen lesblokken gevonden voor {getDayName(getCurrentDayOfWeek())} in de geselecteerde template.
                  </p>
                </div>
              </div>
            )}
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
                  multiple
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  loading={uploadingFile}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bestanden toevoegen
                </Button>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuleren
            </Button>
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4 mr-2" />
              Incident melden
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}