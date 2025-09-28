import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Plus, 
  X, 
  Search,
  Lightbulb,
  Zap,
  Ban,
  Package,
  Handshake,
  Target,
  Tag
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
}

interface StudentRole {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface SelectedStudent {
  student_id: string;
  role_id: string;
}

interface GroupTemplate {
  id: string;
  template_id: string;
  is_default: boolean;
  effective_from: string;
  effective_until: string | null;
  day_templates: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface SelectedNotification {
  type: 'teacher' | 'group';
  id: string;
}

interface BehaviorCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface BehaviorSeverityLevel {
  id: string;
  name: string;
  level: number;
  color: string;
  is_active: boolean;
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
}

interface FollowupAction {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
}

interface AttachmentFile {
  file: File;
  preview?: string;
}

interface BehaviorItemConsequence {
  consequence_id: string;
  is_default: boolean;
  consequences: Consequence;
}

interface BehaviorIncidentFormProps {
  schoolId: string;
  onIncidentCreated: () => void;
  onCancel: () => void;
  preloadData?: {
    incidentDateTime?: string;
    location?: string;
    groupId?: string;
    description?: string;
    blockTitle?: string;
    subjectTitle?: string;
  };
}

export function BehaviorIncidentForm({ schoolId, onIncidentCreated, onCancel, preloadData }: BehaviorIncidentFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviorItems, setBehaviorItems] = useState<BehaviorItem[]>([]);
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [severityLevels, setSeverityLevels] = useState<BehaviorSeverityLevel[]>([]);
  const [studentRoles, setStudentRoles] = useState<StudentRole[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupTemplates, setGroupTemplates] = useState<GroupTemplate[]>([]);
  const [message, setMessage] = useState('');
  const [consequences, setConsequences] = useState<Consequence[]>([]);
  const [actionTakenConsequenceId, setActionTakenConsequenceId] = useState('');
  const [actionTakenOther, setActionTakenOther] = useState('');
  const [suggestedConsequences, setSuggestedConsequences] = useState<Consequence[]>([]);
  const [selectedConsequences, setSelectedConsequences] = useState<string[]>([]);
  const [followupActions, setFollowupActions] = useState<FollowupAction[]>([]);
  const [selectedFollowupAction, setSelectedFollowupAction] = useState('');
  const [followupActionOther, setFollowupActionOther] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [consequenceSearch, setConsequenceSearch] = useState('');
  const [showAllConsequences, setShowAllConsequences] = useState(false);
  const [studentSearches, setStudentSearches] = useState<string[]>([]);
  const [showStudentDropdowns, setShowStudentDropdowns] = useState<boolean[]>([]);
  const [defaultRoleId, setDefaultRoleId] = useState<string>('');

  // Form state
  const [selectedStudents, setSelectedStudents] = useState<SelectedStudent[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedBehaviorItem, setSelectedBehaviorItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverityLevel, setSelectedSeverityLevel] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<SelectedNotification[]>([]);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'resolved'>('pending');

  // Separate date and time states
  const [incidentDateOnly, setIncidentDateOnly] = useState(new Date().toISOString().split('T')[0]);
  const [timeSelectionMode, setTimeSelectionMode] = useState<'manual' | 'lesson'>('manual');
  const [incidentTimeOnly, setIncidentTimeOnly] = useState(new Date().toTimeString().slice(0, 5));
  const [selectedLessonBlock, setSelectedLessonBlock] = useState('');
  const [availableLessonBlocks, setAvailableLessonBlocks] = useState<any[]>([]);

  // Initialize incident date to current timestamp when component loads
  useEffect(() => {
    // Check for preloaded data from props or sessionStorage
    const sessionPreloadData = sessionStorage.getItem('behaviorPreloadData');
    if (preloadData) {
      // Use props data (from schoolday component)
      if (preloadData.incidentDateTime) {
        const dateTime = new Date(preloadData.incidentDateTime);
        setIncidentDateOnly(dateTime.toISOString().split('T')[0]);
        setIncidentTimeOnly(dateTime.toTimeString().slice(0, 5));
        setIncidentDate(preloadData.incidentDateTime);
      }
      if (preloadData.location) {
        setLocation(preloadData.location);
      }
      if (preloadData.description) {
        setDescription(preloadData.description);
      }
    } else if (sessionPreloadData) {
      // Fallback to session storage data
      try {
        const data = JSON.parse(sessionPreloadData);
        const dateTime = new Date(data.incidentDateTime);
        setIncidentDateOnly(dateTime.toISOString().split('T')[0]);
        setIncidentTimeOnly(dateTime.toTimeString().slice(0, 5));
        setIncidentDate(data.incidentDateTime);
        setLocation(data.location || '');
        setDescription(data.description || '');
        
        // Clear the preload data after using it
        sessionStorage.removeItem('behaviorPreloadData');
      } catch (error) {
        console.error('Error parsing preload data:', error);
        // Fallback to current time
        setDefaultDateTime();
      }
    } else {
      setDefaultDateTime();
    }
  }, []);
  
  const setDefaultDateTime = () => {
    const now = new Date();
    setIncidentDateOnly(now.toISOString().split('T')[0]);
    setIncidentTimeOnly(now.toTimeString().slice(0, 5));
    setIncidentDate(now.toISOString().slice(0, 16));
  };

  useEffect(() => {
    if (selectedBehaviorItem) {
      fetchSuggestedConsequences(selectedBehaviorItem);
    } else {
      setSuggestedConsequences([]);
      setSelectedConsequences([]);
    }
  }, [selectedBehaviorItem]);

  // Update combined incident date when day or time changes
  useEffect(() => {
    if (timeSelectionMode === 'manual') {
      setIncidentDate(`${incidentDateOnly}T${incidentTimeOnly}`);
    }
  }, [incidentDateOnly, incidentTimeOnly, timeSelectionMode]);

  // Update time when lesson block is selected
  useEffect(() => {
    if (timeSelectionMode === 'lesson' && selectedLessonBlock) {
      const block = availableLessonBlocks.find(b => b.id === selectedLessonBlock);
      if (block) {
        setIncidentTimeOnly(block.start_time);
        setIncidentDate(`${incidentDateOnly}T${block.start_time}`);
      }
    }
  }, [selectedLessonBlock, incidentDateOnly, timeSelectionMode, availableLessonBlocks]);

  useEffect(() => {
    fetchStudents();
    fetchBehaviorData();
    fetchStudentRoles();
    fetchTeachers();
    fetchGroups();
    fetchConsequences();
    fetchFollowupActions();
    fetchLessonBlocks();
  }, [schoolId]);

  // Initialize with one student slot and default role after roles are loaded
  useEffect(() => {
    if (studentRoles.length > 0 && selectedStudents.length === 0) {
      // Find default role
      const defaultRole = studentRoles.find(role => role.is_default);
      const roleId = defaultRole ? defaultRole.id : studentRoles[0]?.id || '';
      
      setDefaultRoleId(roleId);
      setSelectedStudents([{ student_id: '', role_id: roleId }]);
      setStudentSearches(['']);
      setShowStudentDropdowns([false]);
    }
  }, [studentRoles, selectedStudents.length]);

  // Icon mapping for categories
  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Lightbulb,
      Zap,
      Ban,
      Package,
      AlertTriangle,
      Handshake,
      Target,
      Tag
    };
    return icons[iconName] || Tag;
  };

  const fetchDefaultRole = async () => {
    try {
      const { data, error } = await supabase
        .from('student_roles')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setDefaultRoleId(data.id);
      } else {
        // Fallback to first role if no default is set
        const { data: firstRole } = await supabase
          .from('student_roles')
          .select('*')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .order('name')
          .limit(1)
          .maybeSingle();
        
        if (firstRole) {
          setDefaultRoleId(firstRole.id);
        }
      }
    } catch (error) {
      console.error('Error fetching default role:', error);
    }
  };

  const fetchLessonBlocks = async () => {
    try {
      // Get current day of week (JavaScript: 0 = Sunday, 1 = Monday, etc.)
      // But our database uses: 0 = Sunday, 1 = Monday, etc.
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      console.log('Debug: Current day of week:', dayOfWeek, 'Date:', today.toDateString());
      
      // First, check if we have any day templates for this school
      const { data: templates, error: templatesError } = await supabase
        .from('day_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true);

      if (templatesError) throw templatesError;
      console.log('Debug: Found templates:', templates);
      
      if (!templates || templates.length === 0) {
        console.log('Debug: No templates found for school');
        setAvailableLessonBlocks([]);
        return;
      }
      
      // Get template IDs
      const templateIds = templates.map(t => t.id);
      console.log('Debug: Template IDs:', templateIds);
      
      // Now fetch blocks for these templates
      const { data: blocks, error: blocksError } = await supabase
        .from('day_template_blocks')
        .select(`
          id,
          template_id,
          day_of_week,
          start_time,
          end_time,
          title,
          block_type,
          subject_id,
          school_subjects (
            title,
            color
          )
        `)
        .in('template_id', templateIds)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time');
      
      if (blocksError) throw blocksError;
      console.log('Debug: Found blocks for today:', blocks);

      // Add template name to each block
      const blocksWithTemplate = (blocks || []).map(block => {
        const template = templates.find(t => t.id === block.template_id);
        return {
          ...block,
          template_name: template?.name || 'Unknown Template'
        };
      });

      console.log('Debug: Final blocks with template names:', blocksWithTemplate);
      setAvailableLessonBlocks(blocksWithTemplate);
    } catch (error) {
      console.error('Error fetching lesson blocks:', error);
      console.log('Debug: Error details:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchBehaviorData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('behavior_categories')
        .select('id, name, color, icon')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch severity levels
      const { data: severityData, error: severityError } = await supabase
        .from('behavior_severity_levels')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('level');

      if (severityError) throw severityError;
      setSeverityLevels(severityData || []);

      // Fetch behavior items with related data
      const { data: itemsData, error: itemsError } = await supabase
        .from('behavior_items')
        .select(`
          *,
          behavior_categories (*),
          behavior_severity_levels (*)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (itemsError) throw itemsError;
      setBehaviorItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching behavior data:', error);
    }
  };

  const fetchStudentRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('student_roles')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.warn('Student roles table not found, skipping:', error);
        setStudentRoles([]);
      } else {
        setStudentRoles(data || []);
        
        // Set default role after roles are loaded
        if (data && data.length > 0) {
          const defaultRole = data.find(role => role.is_default);
          const roleId = defaultRole ? defaultRole.id : data[0]?.id || '';
          setDefaultRoleId(roleId);
        }
      }
    } catch (error) {
      console.warn('Error fetching student roles:', error);
      setStudentRoles([]);
    }
  };

  const fetchTeachers = async () => {
    try {
      console.log('=== DEBUGGING TEACHER FETCH ===');
      console.log('1. School ID being used:', schoolId);
      console.log('2. Current user ID:', user?.id);
      
      // Get approved users for this school (both teachers and admins)
      const { data: userSchools, error: userSchoolsError } = await supabase
        .from('user_schools')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('status', 'approved')
        .eq('is_active', true);

      if (userSchoolsError) throw userSchoolsError;
      
      console.log('3. User schools query result:', userSchools);
      console.log('4. User schools query error:', userSchoolsError);

      const userIds = userSchools?.map(us => us.user_id) || [];
      console.log('5. Extracted user IDs:', userIds);
      
      // Let's also try a direct query to see all user_schools for this school
      console.log('6. Attempting direct query for all user_schools...');
      const { data: allUserSchools, error: allError } = await supabase
        .from('user_schools')
        .select('*')
        .eq('school_id', schoolId);
      console.log('7. All user_schools (no filters):', allUserSchools);
      console.log('8. All user_schools error:', allError);
      
      if (userIds.length === 0) {
        console.log('9. No user IDs found, setting empty teachers array');
        setTeachers([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds)
        .order('first_name');

      if (error) throw error;
      
      console.log('10. Profiles query result:', data);
      console.log('11. Profiles query error:', error);
      console.log('12. Final teachers array being set:', data?.map(teacher => ({
        id: teacher.id,
        displayName: teacher.first_name && teacher.last_name 
          ? `${teacher.first_name} ${teacher.last_name}` 
          : teacher.email || 'Onbekende docent',
        email: teacher.email,
        first_name: teacher.first_name,
        last_name: teacher.last_name
      })));
      
      setTeachers(data || []);
      console.log('=== END DEBUGGING ===');
    } catch (error) {
      console.error('Error fetching teachers:', error);
      console.log('=== DEBUGGING: Error occurred ===', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
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

  const fetchFollowupActions = async () => {
    try {
      const { data, error } = await supabase
        .from('followup_actions')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setFollowupActions(data || []);
    } catch (error) {
      console.error('Error fetching followup actions:', error);
    }
  };

  const fetchSuggestedConsequences = async (behaviorItemId: string) => {
    try {
      // Fetch consequences connected to this behavior item
      const { data, error } = await supabase
        .from('behavior_item_consequences')
        .select(`
          consequences (*)
        `)
        .eq('behavior_item_id', behaviorItemId);

      if (error) throw error;
      
      const suggested = data?.map(item => item.consequences).filter(Boolean) || [];
      setSuggestedConsequences(suggested);
      
      // Auto-select default consequences
      const defaultConsequences = data?.filter(item => item.is_default).map(item => item.consequences.id) || [];
      setSelectedConsequences(defaultConsequences);
    } catch (error) {
      console.error('Error fetching suggested consequences:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAttachments: AttachmentFile[] = [];

    files.forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessage(`Bestand "${file.name}" is te groot. Maximum grootte is 10MB.`);
        return;
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        setMessage(`Bestandstype "${file.type}" wordt niet ondersteund.`);
        return;
      }

      const attachment: AttachmentFile = { file };
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments(prev => [...prev, attachment]);
        };
        reader.readAsDataURL(file);
      } else {
        newAttachments.push(attachment);
      }
    });

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (incidentId: string) => {
    if (attachments.length === 0) return;

    for (const attachment of attachments) {
      try {
        // In a real implementation, you would upload to Supabase Storage
        // For now, we'll just store the file info in the database
        const { error } = await supabase
          .from('behavior_incident_attachments')
          .insert({
            incident_id: incidentId,
            file_name: attachment.file.name,
            file_url: `placeholder_url_${attachment.file.name}`, // Would be actual storage URL
            file_type: attachment.file.type,
            file_size: attachment.file.size,
            uploaded_by: user!.id
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error uploading attachment:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (selectedStudents.length === 0) {
      setMessage('Selecteer minimaal één student.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Create the incident (without student_id as we'll use the junction table)
      const { data: incident, error: incidentError } = await supabase
        .from('behavior_incidents')
        .insert({
          school_id: schoolId,
          student_id: selectedStudents[0].student_id, // Keep for backward compatibility
          behavior_item_id: selectedBehaviorItem === 'other' ? null : selectedBehaviorItem,
          reported_by: user.id,
          incident_date: incidentDate,
          location: location || null,
          description,
          action_taken: actionTakenConsequenceId === 'other' ? actionTakenOther : 
                       actionTakenConsequenceId ? consequences.find(c => c.id === actionTakenConsequenceId)?.name : null,
          follow_up_required: followUpRequired,
          follow_up_date: followUpRequired && followUpDate ? followUpDate : null,
          follow_up_notes: followUpRequired && followUpNotes ? followUpNotes : null,
          status,
          followup_action_id: selectedFollowupAction || null,
          followup_action_other: selectedFollowupAction === 'other' ? followupActionOther : null,
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // Add notifications
      if (selectedNotifications.length > 0) {
        const notificationInserts = selectedNotifications.map(notification => ({
          incident_id: incident.id,
          notification_type: notification.type,
          teacher_id: notification.type === 'teacher' ? notification.id : null,
          group_id: notification.type === 'group' ? notification.id : null,
        }));

        const { error: notificationsError } = await supabase
          .from('behavior_incident_notifications')
          .insert(notificationInserts);

        if (notificationsError) throw notificationsError;
      }

      // Upload attachments
      await uploadAttachments(incident.id);

      // Reset form
      setSelectedStudents([]);
      setSelectedNotifications([]);
      setSelectedBehaviorItem('');
      setDescription('');
      setActionTaken('');
      setSelectedFollowupAction('');
      setFollowupActionOther('');
      setAttachments([]);

      setMessage('Incident succesvol gemeld!');
      onIncidentCreated();
    } catch (error) {
      console.error('Error creating incident:', error);
      setMessage('Er is een fout opgetreden bij het melden van het incident.');
    } finally {
      setLoading(false);
    }
  };

  const addStudent = () => {
    setSelectedStudents([...selectedStudents, { student_id: '', role_id: defaultRoleId || '' }]);
    setStudentSearches([...studentSearches, '']);
    setShowStudentDropdowns([...showStudentDropdowns, false]);
  };

  const removeStudent = (index: number) => {
    setSelectedStudents(selectedStudents.filter((_, i) => i !== index));
    setStudentSearches(studentSearches.filter((_, i) => i !== index));
    setShowStudentDropdowns(showStudentDropdowns.filter((_, i) => i !== index));
  };

  const updateStudent = (index: number, field: 'student_id' | 'role_id', value: string) => {
    const updated = [...selectedStudents];
    updated[index][field] = value;
    setSelectedStudents(updated);
    
    // If selecting a student, update the search text and hide dropdown
    if (field === 'student_id' && value) {
      const student = students.find(s => s.id === value);
      if (student) {
        const updatedSearches = [...studentSearches];
        updatedSearches[index] = `${student.first_name} ${student.last_name}${student.student_number ? ` (#${student.student_number})` : ''}`;
        setStudentSearches(updatedSearches);
        
        const updatedDropdowns = [...showStudentDropdowns];
        updatedDropdowns[index] = false;
        setShowStudentDropdowns(updatedDropdowns);
      }
    }
  };

  const updateStudentSearch = (index: number, value: string) => {
    const updatedSearches = [...studentSearches];
    updatedSearches[index] = value;
    setStudentSearches(updatedSearches);
    
    // Show dropdown when typing
    const updatedDropdowns = [...showStudentDropdowns];
    updatedDropdowns[index] = value.length > 0;
    setShowStudentDropdowns(updatedDropdowns);
    
    // Clear selected student if search changes
    if (selectedStudents[index].student_id) {
      const updated = [...selectedStudents];
      updated[index].student_id = '';
      setSelectedStudents(updated);
    }
  };

  const getFilteredStudents = (searchTerm: string, excludeIndex: number) => {
    return students.filter(student => {
      const matchesSearch = searchTerm === '' || 
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.student_number && student.student_number.includes(searchTerm));
      
      const notAlreadySelected = !selectedStudents.some((selected, idx) => 
        idx !== excludeIndex && selected.student_id === student.id
      );
      
      return matchesSearch && notAlreadySelected;
    });
  };

  const isStudentAlreadySelected = (studentId: string) => {
    return selectedStudents.some(selected => selected.student_id === studentId);
  };

  const toggleConsequence = (consequenceId: string) => {
    setSelectedConsequences(prev =>
      prev.includes(consequenceId)
        ? prev.filter(id => id !== consequenceId)
        : [...prev, consequenceId]
    );
  };

  const getFilteredConsequences = () => {
    const searchLower = consequenceSearch.toLowerCase();
    return consequences.filter(consequence =>
      consequence.name.toLowerCase().includes(searchLower) ||
      (consequence.description && consequence.description.toLowerCase().includes(searchLower))
    );
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSeverityLevel(''); // Reset severity when category changes
    setSelectedBehaviorItem(''); // Reset behavior item when category changes
  };

  const handleSeveritySelect = (severityId: string) => {
    setSelectedSeverityLevel(severityId);
    setSelectedBehaviorItem(''); // Reset behavior item when severity changes
  };

  const addNotification = (type: 'teacher' | 'group', id: string) => {
    if (!selectedNotifications.some(n => n.type === type && n.id === id)) {
      setSelectedNotifications([...selectedNotifications, { type, id }]);
    }
  };

  const removeNotification = (index: number) => {
    setSelectedNotifications(selectedNotifications.filter((_, i) => i !== index));
  };

  const filteredBehaviorItems = selectedCategory && selectedSeverityLevel
    ? behaviorItems.filter(item => 
        item.category_id === selectedCategory && 
        item.severity_level_id === selectedSeverityLevel
      )
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar incidenten
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Incident melden</h1>
          <p className="text-gray-600">Meld een gedragsincident</p>
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
              <Button type="button" variant="secondary" size="sm" onClick={addStudent}>
                <Plus className="w-4 h-4 mr-1" />
                Student toevoegen
              </Button>
            </div>
            
            {selectedStudents.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Geen studenten geselecteerd</p>
              </div>
            )}

            <div className="space-y-3">
              {selectedStudents.map((selectedStudent, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={studentSearches[index] || ''}
                      onChange={(e) => updateStudentSearch(index, e.target.value)}
                      onFocus={() => {
                        const updatedDropdowns = [...showStudentDropdowns];
                        updatedDropdowns[index] = true;
                        setShowStudentDropdowns(updatedDropdowns);
                      }}
                      placeholder="Typ om student te zoeken..."
                      required={!selectedStudent.student_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    
                    {/* Dropdown with filtered students */}
                    {showStudentDropdowns[index] && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getFilteredStudents(studentSearches[index] || '', index).map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => updateStudent(index, 'student_id', student.id)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            {student.student_number && (
                              <div className="text-sm text-gray-500">#{student.student_number}</div>
                            )}
                          </button>
                        ))}
                        {getFilteredStudents(studentSearches[index] || '', index).length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-center">
                            Geen studenten gevonden
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <select
                      value={selectedStudent.role_id}
                      onChange={(e) => updateStudent(index, 'role_id', e.target.value)}
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
                    onClick={() => removeStudent(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Gedragscategorie *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedCategory === category.id
                      ? `border-2 text-white`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  style={selectedCategory === category.id ? {
                    backgroundColor: category.color,
                    borderColor: category.color
                  } : {}}
                >
                  {(() => {
                    const IconComponent = getIconComponent(category.icon || 'Tag');
                    return (
                      <IconComponent 
                        className={`w-6 h-6 mb-2 ${
                          selectedCategory === category.id ? 'text-white' : ''
                        }`}
                        style={selectedCategory === category.id ? {} : { color: category.color }}
                      />
                    );
                  })()}
                  <div className="font-medium text-sm">{category.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Severity Level Selection - Only show if category is selected */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Ernst niveau *
              </label>
              <div className="grid grid-cols-5 gap-3">
                {severityLevels.filter(level => level.is_active).map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => handleSeveritySelect(level.id)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                      selectedSeverityLevel === level.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-2"
                      style={{ backgroundColor: level.color }}
                    >
                      {level.level}
                    </div>
                    <div className="font-medium text-xs">{level.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Behavior Item Selection - Only show if both category and severity are selected */}
          {selectedCategory && selectedSeverityLevel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gedragsitem *
              </label>
              {filteredBehaviorItems.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                  Geen gedragsitems gevonden voor deze combinatie
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                  {filteredBehaviorItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedBehaviorItem(item.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedBehaviorItem === item.id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-900'
                      }`}
                    >
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Datum *"
                type="date"
                value={incidentDateOnly}
                onChange={(e) => setIncidentDateOnly(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wanneer is het gebeurd? *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="timeMode"
                      value="manual"
                      checked={timeSelectionMode === 'manual'}
                      onChange={(e) => setTimeSelectionMode(e.target.value as 'manual' | 'lesson')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Handmatig</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="timeMode"
                      value="lesson"
                      checked={timeSelectionMode === 'lesson'}
                      onChange={(e) => setTimeSelectionMode(e.target.value as 'manual' | 'lesson')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Lesblok</span>
                  </label>
                </div>
              </div>
            </div>

            {timeSelectionMode === 'manual' ? (
              <Input
                label="Tijd *"
                type="time"
                value={incidentTimeOnly}
                onChange={(e) => setIncidentTimeOnly(e.target.value)}
                required
              />
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesblok *
                </label>
                {availableLessonBlocks.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-500">Geen lesblokken gevonden voor vandaag</p>
                    <p className="text-sm text-gray-400 mt-1">Stel zelf de tijd in</p>
                  </div>
                ) : (
                  <select
                    value={selectedLessonBlock}
                    onChange={(e) => setSelectedLessonBlock(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Selecteer lesblok</option>
                    {availableLessonBlocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.start_time} - {block.end_time}: {block.title}
                        {block.school_subjects && ` (${block.school_subjects.title})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div>
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
              Consequentie *
            </label>
            <select
              value={actionTakenConsequenceId}
              onChange={(e) => setActionTakenConsequenceId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecteer actie</option>
              {consequences.map((consequence) => (
                <option key={consequence.id} value={consequence.id}>
                  {consequence.name}
                </option>
              ))}
              <option value="other">Andere...</option>
            </select>
            
            {actionTakenConsequenceId === 'other' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschrijf de actie
                </label>
                <textarea
                  value={actionTakenOther}
                  onChange={(e) => setActionTakenOther(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Beschrijf welke actie je hebt ondernomen..."
                  required
                />
              </div>
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

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bijlagen (optioneel)
            </label>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Toegestane bestanden: afbeeldingen, PDF, tekstbestanden (max 10MB per bestand)
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Geselecteerde bestanden:</h4>
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {attachment.preview && (
                          <img 
                            src={attachment.preview} 
                            alt="Preview" 
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
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
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
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

          {/* Teacher Notifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leerkrachten op de hoogte brengen (optioneel)
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Specifieke leerkrachten</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addNotification('teacher', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecteer leerkracht om toe te voegen</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name && teacher.last_name 
                        ? `${teacher.first_name} ${teacher.last_name}` 
                        : teacher.email || 'Onbekende docent'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leerkrachten van groepen</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addNotification('group', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecteer groep om leerkrachten toe te voegen</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedNotifications.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Geselecteerde notificaties:</label>
                  {selectedNotifications.map((notification, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                      <span className="text-sm">
                        {notification.type === 'teacher' 
                          ? `Docent: ${teachers.find(t => t.id === notification.id)?.first_name} ${teachers.find(t => t.id === notification.id)?.last_name}`
                          : `Groep: ${groups.find(g => g.id === notification.id)?.name}`
                        }
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotification(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuleren
            </Button>
            <Button type="submit" loading={loading}>
              Incident melden
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}