import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Calendar, Clock, BookOpen, Coffee, Utensils, MoreHorizontal, ChevronLeft, ChevronRight, Plus, AlertTriangle, Target, CreditCard as Edit, X, Search, BookOpen as BookOpenIcon } from 'lucide-react';
import { BehaviorIncidentForm } from '../behavior/BehaviorIncidentForm';

interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
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
  school_subjects?: {
    id: string;
    title: string;
    icon: string;
    color: string;
  };
}

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
}

interface SchoolGrade {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface BlockActivity {
  id: string;
  activity_type: 'technique_used' | 'behavior_incident' | 'note';
  technique_id: string | null;
  behavior_incident_id: string | null;
  notes: string | null;
  created_at: string;
  teaching_techniques?: {
    title: string;
  };
}

interface TeachingTechnique {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  teaching_technique_categories: {
    technique_categories: {
      name: string;
      color: string;
    };
  }[];
}

interface DayTimelineProps {
  schoolId: string;
  templates: DayTemplate[];
  onEditTemplate: (template: DayTemplate) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Maandag', short: 'Ma' },
  { value: 2, label: 'Dinsdag', short: 'Di' },
  { value: 3, label: 'Woensdag', short: 'Wo' },
  { value: 4, label: 'Donderdag', short: 'Do' },
  { value: 5, label: 'Vrijdag', short: 'Vr' },
  { value: 6, label: 'Zaterdag', short: 'Za' },
  { value: 0, label: 'Zondag', short: 'Zo' },
];

const BLOCK_TYPE_ICONS = {
  lesson: BookOpen,
  break: Coffee,
  lunch: Utensils,
  other: MoreHorizontal,
};

const BLOCK_TYPE_COLORS = {
  lesson: 'bg-blue-100 text-blue-800 border-blue-200',
  break: 'bg-green-100 text-green-800 border-green-200',
  lunch: 'bg-orange-100 text-orange-800 border-orange-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function DayTimeline({ schoolId, templates, onEditTemplate }: DayTimelineProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTemplate, setCurrentTemplate] = useState<DayTemplate | null>(null);
  const [templateBlocks, setTemplateBlocks] = useState<TemplateBlock[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [blockActivities, setBlockActivities] = useState<{ [blockId: string]: BlockActivity[] }>({});
  const [selectedBlock, setSelectedBlock] = useState<TemplateBlock | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showTechniqueSelector, setShowTechniqueSelector] = useState(false);
  const [techniques, setTechniques] = useState<TeachingTechnique[]>([]);
  const [filteredTechniques, setFilteredTechniques] = useState<TeachingTechnique[]>([]);
  const [techniqueSearch, setTechniqueSearch] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState<TeachingTechnique | null>(null);
  const [techniqueNotes, setTechniqueNotes] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [schoolGrades, setSchoolGrades] = useState<SchoolGrade[]>([]);
  const [showGradeSelector, setShowGradeSelector] = useState(false);
  const [groupGrades, setGroupGrades] = useState<SchoolGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentFormData, setIncidentFormData] = useState<any>(null);
  const [lessonSettings, setLessonSettings] = useState({
    start_block_duration: 5,
    main_block_duration: 10,
    end_block_duration: 5
  });

  useEffect(() => {
    fetchGroups();
    fetchLessonSettings();
  }, []);

  useEffect(() => {
    if (selectedGroup || templates.length > 0) {
      findActiveTemplate();
    }
  }, [selectedDate, selectedGroup, templates]);

  useEffect(() => {
    if (currentTemplate) {
      fetchTemplateBlocks();
    }
  }, [currentTemplate, selectedGroup]);

  useEffect(() => {
    if (templateBlocks.length > 0) {
      fetchBlockActivities();
    }
  }, [templateBlocks, selectedDate, selectedGroup]);

  useEffect(() => {
    fetchTechniques();
    fetchSchoolGrades();
    if (selectedGroup) {
      fetchGroupGrades();
    }
  }, []);

  const fetchLessonSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('school_lesson_settings')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLessonSettings({
          start_block_duration: data.start_block_duration,
          main_block_duration: data.main_block_duration,
          end_block_duration: data.end_block_duration
        });
      }
    } catch (error) {
      console.error('Error fetching lesson settings:', error);
    }
  };
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupGrades();
    } else {
      setGroupGrades([]);
    }
  }, [selectedGroup]);

  useEffect(() => {
    // Filter techniques based on search
    const filtered = techniques.filter(technique =>
      technique.title.toLowerCase().includes(techniqueSearch.toLowerCase()) ||
      technique.description.toLowerCase().includes(techniqueSearch.toLowerCase()) ||
      (technique.subtitle && technique.subtitle.toLowerCase().includes(techniqueSearch.toLowerCase()))
    );
    setFilteredTechniques(filtered);
  }, [techniques, techniqueSearch]);

  const fetchSchoolGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('school_grades')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setSchoolGrades(data || []);
    } catch (error) {
      console.error('Error fetching school grades:', error);
    }
  };

  const fetchGroupGrades = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('group_grades')
        .select(`
          school_grades (*)
        `)
        .eq('group_id', selectedGroup.id);

      if (error) throw error;
      
      const grades = data?.map(gg => gg.school_grades).filter(Boolean) || [];
      setGroupGrades(grades);
    } catch (error) {
      console.error('Error fetching group grades:', error);
    }
  };

  const fetchTechniques = async () => {
    try {
      const { data, error } = await supabase
        .from('teaching_techniques')
        .select(`
          id,
          title,
          subtitle,
          description,
          teaching_technique_categories (
            technique_categories (
              name,
              color
            )
          )
        `)
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setTechniques(data || []);
    } catch (error) {
      console.error('Error fetching techniques:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, grade_level')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const findActiveTemplate = async () => {
    try {
      // If a group is selected, try to find group-specific template
      if (selectedGroup) {
        const { data: groupTemplate } = await supabase
          .from('group_day_templates')
          .select('template_id, day_templates(*)')
          .eq('group_id', selectedGroup.id)
          .lte('effective_from', selectedDate.toISOString().split('T')[0])
          .or(`effective_until.is.null,effective_until.gte.${selectedDate.toISOString().split('T')[0]}`)
          .order('is_default', { ascending: false })
          .order('effective_from', { ascending: false })
          .maybeSingle();

        if (groupTemplate?.day_templates) {
          setCurrentTemplate(groupTemplate.day_templates);
          return;
        }
      }

      // If no group is selected OR no group template found, use school default template
      const { data: schoolTemplate } = await supabase
        .from('school_day_templates')
        .select('template_id, day_templates(*)')
        .eq('school_id', schoolId)
        .lte('effective_from', selectedDate.toISOString().split('T')[0])
        .or(`effective_until.is.null,effective_until.gte.${selectedDate.toISOString().split('T')[0]}`)
        .order('is_default', { ascending: false })
        .order('effective_from', { ascending: false })
        .maybeSingle();

      if (schoolTemplate?.day_templates) {
        setCurrentTemplate(schoolTemplate.day_templates);
        return;
      }

      // Final fallback to first available template
      if (templates.length > 0) {
        setCurrentTemplate(templates[0]);
      } else {
        setCurrentTemplate(null);
      }
    } catch (error) {
      console.error('Error finding active template:', error);
      setCurrentTemplate(null);
    }
  };

  const fetchTemplateBlocks = async () => {
    if (!currentTemplate) return;

    try {
      const dayOfWeek = selectedDate.getDay();
      
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
        .eq('template_id', currentTemplate.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;
      setTemplateBlocks(data || []);
    } catch (error) {
      console.error('Error fetching template blocks:', error);
    }
  };

  const fetchBlockActivities = async () => {
    if (!user || templateBlocks.length === 0) return;

    try {
      const blockIds = templateBlocks.map(block => block.id);
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Build query with group/school filtering
      let query = supabase
        .from('day_block_activities')
        .select(`
          *,
          teaching_techniques (title)
        `)
        .in('template_block_id', blockIds)
        .eq('user_id', user.id)
        .eq('activity_date', dateStr);

      const { data, error } = await query;

      if (error) throw error;

      // Group activities by block ID
      const grouped: { [blockId: string]: BlockActivity[] } = {};
      (data || []).forEach(activity => {
        if (!grouped[activity.template_block_id]) {
          grouped[activity.template_block_id] = [];
        }
        grouped[activity.template_block_id].push(activity);
      });

      setBlockActivities(grouped);
    } catch (error) {
      console.error('Error fetching block activities:', error);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const isBlockActive = (block: TemplateBlock) => {
    const now = getCurrentTime();
    const today = new Date().toDateString();
    const selectedDay = selectedDate.toDateString();
    
    // Only check if it's today
    if (today !== selectedDay) return false;
    
    return now >= block.start_time && now <= block.end_time;
  };

  const isBlockPast = (block: TemplateBlock) => {
    const now = getCurrentTime();
    const today = new Date().toDateString();
    const selectedDay = selectedDate.toDateString();
    
    // If it's not today, check if the selected date is in the past
    if (today !== selectedDay) {
      return selectedDate < new Date();
    }
    
    return now > block.end_time;
  };

  const getBlockProgress = (block: TemplateBlock) => {
    if (!isBlockActive(block)) return 0;
    
    const now = getCurrentTime();
    const [startHour, startMin] = block.start_time.split(':').map(Number);
    const [endHour, endMin] = block.end_time.split(':').map(Number);
    const [nowHour, nowMin] = now.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const nowMinutes = nowHour * 60 + nowMin;
    
    const progress = ((nowMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const parseTime = (timeString: string) => {
    // Handle null, undefined, or non-string values
    if (!timeString || typeof timeString !== 'string') {
      return { hours: 0, minutes: 0 };
    }
    
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateProgress = (startTime: string, endTime: string, currentTime: Date) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const current = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    if (current < start) return 0;
    if (current > end) return 100;
    
    return ((current - start) / (end - start)) * 100;
  };

  const calculateSubblocks = (startTime: string, endTime: string) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const totalDuration = end - start;
    
    // Use lesson settings or defaults
    const startBlockDuration = lessonSettings?.start_block_duration || 5;
    const mainBlockDuration = lessonSettings?.main_block_duration || 10;
    const endBlockDuration = lessonSettings?.end_block_duration || 5;
    
    const subblocks = [];
    let currentTime = start;
    
    // Start block
    if (totalDuration > startBlockDuration + endBlockDuration) {
      subblocks.push({
        name: 'Start',
        start_time: formatTime(currentTime),
        end_time: formatTime(currentTime + startBlockDuration),
        duration: startBlockDuration
      });
      currentTime += startBlockDuration;
    }
    
    // Calculate available time for main blocks
    const availableTime = totalDuration - (subblocks.length > 0 ? startBlockDuration : 0) - endBlockDuration;
    const mainBlocks = Math.floor(availableTime / mainBlockDuration);
    const remainder = availableTime % mainBlockDuration;
    
    // Main blocks
    for (let i = 0; i < mainBlocks; i++) {
      const blockDuration = i === mainBlocks - 1 ? mainBlockDuration + remainder : mainBlockDuration;
      subblocks.push({
        name: mainBlocks === 1 ? 'Main' : `Main ${i + 1}`,
        start_time: formatTime(currentTime),
        end_time: formatTime(currentTime + blockDuration),
        duration: blockDuration
      });
      currentTime += blockDuration;
    }
    
    // End block
    if (totalDuration > startBlockDuration + endBlockDuration && currentTime < end) {
      subblocks.push({
        name: 'End',
        start_time: formatTime(currentTime),
        end_time: formatTime(end),
        duration: end - currentTime
      });
    }
    
    return subblocks;
  };

  const calculateSubblockProgress = (subblock: any, currentTime: Date) => {
    const start = parseTime(subblock.start_time);
    const end = parseTime(subblock.end_time);
    const current = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    if (current < start) return 0;
    if (current > end) return 100;
    
    return ((current - start) / (end - start)) * 100;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateSubblocksForBlock = (block: TemplateBlock) => {
    const [startHour, startMin] = block.start_time.split(':').map(Number);
    const [endHour, endMin] = block.end_time.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(startHour, startMin, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0, 0);
    
    const totalDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // in minutes
    
    const startBlockDuration = lessonSettings.start_block_duration;
    const endBlockDuration = lessonSettings.end_block_duration;
    const mainBlockDuration = lessonSettings.main_block_duration;
    
    const availableForMain = totalDuration - startBlockDuration - endBlockDuration;
    const mainBlocks = Math.floor(availableForMain / mainBlockDuration);
    const remainder = availableForMain % mainBlockDuration;
    
    const subblocks = [];
    let currentTime = new Date(startTime);
    
    // Start block
    const startBlockEnd = new Date(currentTime.getTime() + startBlockDuration * 60 * 1000);
    subblocks.push({
      name: 'Start',
      startTime: new Date(currentTime),
      endTime: startBlockEnd,
      duration: startBlockDuration
    });
    currentTime = startBlockEnd;
    
    // Main blocks
    for (let i = 0; i < mainBlocks; i++) {
      const isLastMainBlock = i === mainBlocks - 1;
      const blockDuration = isLastMainBlock ? mainBlockDuration + remainder : mainBlockDuration;
      const mainBlockEnd = new Date(currentTime.getTime() + blockDuration * 60 * 1000);
      
      subblocks.push({
        name: mainBlocks > 1 ? `Main ${i + 1}` : 'Main',
        startTime: new Date(currentTime),
        endTime: mainBlockEnd,
        duration: blockDuration
      });
      currentTime = mainBlockEnd;
    }
    
    // End block
    const endBlockEnd = new Date(currentTime.getTime() + endBlockDuration * 60 * 1000);
    subblocks.push({
      name: 'End',
      startTime: new Date(currentTime),
      endTime: endBlockEnd,
      duration: endBlockDuration
    });
    
    return subblocks;
  };

  const formatMinutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleTechniqueButtonClick = (block: TemplateBlock) => {
    setSelectedBlock(block);
    setShowTechniqueSelector(true);
    setTechniqueSearch('');
    setSelectedTechnique(null);
    setTechniqueNotes('');
    setSelectedGradeId('');
    setShowGradeSelector(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleBlockClick = (block: TemplateBlock) => {
    setSelectedBlock(block);
    setShowActivityForm(true);
  };

  const addTechniqueUsage = async () => {
    if (!user || !selectedBlock || !selectedTechnique) return;

    setLoading(true);
    try {
      // Determine grade ID - prioritize group grades if available
      let gradeId = selectedGradeId;
      
      // If group is selected and has connected grades, use the first one as primary
      if (selectedGroup && groupGrades.length > 0) {
        gradeId = groupGrades[0].id;
      }

      // Get current time
      const now = new Date();
      const timeOfDay = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Add to day block activities
      const { error: activityError } = await supabase
        .from('day_block_activities')
        .insert({
          template_block_id: selectedBlock.id,
          user_id: user.id,
          activity_date: selectedDate.toISOString().split('T')[0],
          activity_type: 'technique_used',
          technique_id: selectedTechnique.id,
          notes: techniqueNotes || null,
        });

      if (activityError) throw activityError;

      // Log in technique usage logs for analytics - create one entry per connected grade
      if (selectedGroup && groupGrades.length > 0) {
        // Create a log entry for each grade connected to the group
        const logInserts = groupGrades.map(grade => ({
          technique_id: selectedTechnique.id,
          user_id: user.id,
          school_id: schoolId,
          group_id: selectedGroup.id,
          grade_id: grade.id,
          block_title: selectedBlock.title,
          time_of_day: timeOfDay,
          used_at: new Date().toISOString(),
          notes: techniqueNotes || `Gebruikt tijdens ${selectedBlock.title} op ${formatDate(selectedDate)} met groep ${selectedGroup.name} (${grade.name})`
        }));

        const { error: logError } = await supabase
          .from('technique_usage_logs')
          .insert(logInserts);

        if (logError) throw logError;
      } else {
        // Fallback: single log entry without group grades
        const { error: logError } = await supabase
          .from('technique_usage_logs')
          .insert({
            technique_id: selectedTechnique.id,
            user_id: user.id,
            school_id: schoolId,
            group_id: selectedGroup?.id || null,
            grade_id: gradeId || null,
            block_title: selectedBlock.title,
            time_of_day: timeOfDay,
            used_at: new Date().toISOString(),
            notes: techniqueNotes || `Gebruikt tijdens ${selectedBlock.title} op ${formatDate(selectedDate)}`
          });

        if (logError) throw logError;
      }

      setMessage(`Techniek "${selectedTechnique.title}" geregistreerd voor ${selectedBlock.title}!`);
      fetchBlockActivities();
      setShowTechniqueSelector(false);
      setShowGradeSelector(false);
      setSelectedTechnique(null);
      setTechniqueNotes('');
      setSelectedGradeId('');
    } catch (error) {
      console.error('Error adding technique usage:', error);
      setMessage('Er is een fout opgetreden bij het registreren van techniek gebruik.');
    } finally {
      setLoading(false);
    }
  };

  const addTechniqueUsageOld = async (techniqueId: string, notes: string) => {
    if (!user || !selectedBlock) return;

    try {
      const { error } = await supabase
        .from('day_block_activities')
        .insert({
          template_block_id: selectedBlock.id,
          user_id: user.id,
          activity_date: selectedDate.toISOString().split('T')[0],
          activity_type: 'technique_used',
          technique_id: techniqueId,
          notes: notes || null,
        });

      if (error) throw error;

      setMessage('Techniek gebruik geregistreerd!');
      fetchBlockActivities();
      setShowActivityForm(false);
    } catch (error) {
      console.error('Error adding technique usage:', error);
      setMessage('Er is een fout opgetreden bij het registreren van techniek gebruik.');
    }
  };

  const handleAddIncident = (block: TemplateBlock) => {
    // Create incident date/time from selected date and block start time
    const incidentDateTime = new Date(selectedDate);
    const [hours, minutes] = block.start_time.split(':');
    incidentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Build description with context information
    let description = 'Incident tijdens ';
    if (selectedGroup) {
      description += `groep ${selectedGroup.name}`;
      if (selectedGroup.grade_level) {
        description += ` (${selectedGroup.grade_level})`;
      }
    } else {
      description += 'les';
    }
    
    if (block.school_subjects) {
      description += `, vak: ${block.school_subjects.title}`;
    }
    
    if (user) {
      description += `, gemeld door: ${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
    }
    
    description += '.';
    
    // Set form data and show form
    setIncidentFormData({
      incidentDateTime: incidentDateTime.toISOString().slice(0, 16),
      location: block.school_subjects?.title || block.title,
      groupId: selectedGroup?.id || null,
      description: description,
      blockTitle: block.title,
      subjectTitle: block.school_subjects?.title || null
    });
    setShowIncidentForm(true);
  };

  const navigateToBehaviorReport = (block: TemplateBlock) => {
    // Create incident date/time from selected date and block start time
    const incidentDateTime = new Date(selectedDate);
    const [hours, minutes] = block.start_time.split(':');
    incidentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Build description with context information
    let description = 'Incident tijdens ';
    if (selectedGroup) {
      description += `groep ${selectedGroup.name}`;
      if (selectedGroup.grade_level) {
        description += ` (${selectedGroup.grade_level})`;
      }
    } else {
      description += 'les';
    }
    
    if (block.school_subjects) {
      description += `, vak: ${block.school_subjects.title}`;
    }
    
    if (user) {
      description += `, gemeld door: ${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
    }
    
    description += '.';
    
    // Navigate to behavior tab - this will be handled by the parent Dashboard component
    window.dispatchEvent(new CustomEvent('navigateToBehavior', {
      detail: { 
        schoolId: schoolId,
        preloadData: {
          incidentDateTime: incidentDateTime.toISOString().slice(0, 16),
          location: block.school_subjects?.title || block.title,
          groupId: selectedGroup?.id || null,
          description: description,
          blockTitle: block.title,
          subjectTitle: block.school_subjects?.title || null
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('succesvol') || message.includes('geregistreerd')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {message}
        </div>
      )}

      {/* Date Navigation */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {formatDate(selectedDate)}
              </h2>
              <p className="text-sm text-gray-600">
                {selectedDate.toDateString() === new Date().toDateString() ? 'Vandaag' : ''}
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigateDate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={goToToday}>
              Vandaag
            </Button>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {groups.length > 0 && (
              <select
                value={selectedGroup?.id || ''}
                onChange={(e) => {
                  const group = groups.find(g => g.id === e.target.value);
                  setSelectedGroup(group || null);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">School algemeen</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Card>

      {/* Timeline */}
      {templateBlocks.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen schema gevonden</h3>
          <p className="text-gray-600 mb-6">
            {currentTemplate 
              ? 'Er zijn geen tijdblokken gedefinieerd voor deze dag.'
              : 'Er is geen template verbonden aan deze school/groep.'
            }
          </p>
          {currentTemplate && (
            <Button onClick={() => onEditTemplate(currentTemplate)}>
              <Plus className="w-4 h-4 mr-2" />
              Tijdblokken toevoegen
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {templateBlocks.map((block, index) => {
            const Icon = BLOCK_TYPE_ICONS[block.block_type];
            const isActive = isBlockActive(block);
            const isPast = isBlockPast(block);
            const progress = getBlockProgress(block);
            const activities = blockActivities[block.id] || [];
            const isLast = index === templateBlocks.length - 1;

            return (
              <div key={block.id} className="relative flex items-start">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200 -z-10" />
                )}
                
                {/* Timeline node */}
                <div className="flex flex-col items-center mr-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    isPast ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-blue-500 border-blue-500 text-white' :
                    'bg-gray-200 border-gray-300 text-gray-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Block content */}
                <div 
                  className={`flex-1 bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md mb-4 ${
                    isActive ? 'border-blue-300 bg-blue-50' : 
                    isPast ? 'border-green-200' : 'border-gray-200'
                  }`}
                  onClick={() => handleBlockClick(block)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{block.title}</h3>
                        <span className="text-sm text-gray-500">
                          {block.start_time} - {block.end_time}
                        </span>
                      </div>
                      
                      {/* Progress bar for active block */}
                      {isActive && (
                        <div className="mb-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden">
                            {calculateSubblocks(block.start_time, block.end_time).map((subblock, index) => {
                              const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
                              const subblockStartMinutes = parseTime(subblock.start_time);
                              const subblockEndMinutes = parseTime(subblock.end_time);
                              const subblockProgress = Math.max(0, Math.min(100, 
                                ((currentMinutes - subblockStartMinutes) / subblock.duration) * 100
                              ));
                              
                              const isCompleted = currentMinutes >= subblockEndMinutes;
                              const isActiveSubblock = currentMinutes >= subblockStartMinutes && 
                                             currentMinutes < subblockEndMinutes;
                              
                              let bgColor = 'bg-gray-300';
                              if (subblock.name === 'Start') bgColor = 'bg-green-500';
                              else if (subblock.name.includes('Main')) bgColor = 'bg-blue-500';
                              else if (subblock.name === 'End') bgColor = 'bg-purple-500';
                              
                              return (
                                <div
                                  key={index}
                                  className="relative bg-gray-300 h-1.5"
                                  style={{ width: `${(subblock.duration / (parseTime(block.end_time) - parseTime(block.start_time))) * 100}%` }}
                                >
                                  <div
                                    className={`h-1.5 transition-all duration-300 ${bgColor}`}
                                    style={{ 
                                      width: isCompleted ? '100%' : isActiveSubblock ? `${subblockProgress}%` : '0%'
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Block description */}
                      {block.description && (
                        <p className="text-sm text-gray-600 mb-2">{block.description}</p>
                      )}
                      
                      {/* Subblock Progress Bars for Active Lessons */}
                      {isActive && block.block_type === 'lesson' && (
                        <div className="mt-4 space-y-2">
                          {calculateSubblocksForBlock(block).map((subblock, index) => {
                            const currentTime = new Date();
                            const subblockProgress = calculateProgress(
                              subblock.startTime.toTimeString().slice(0, 5),
                              subblock.endTime.toTimeString().slice(0, 5),
                              currentTime
                            );
                            return (
                              <div key={index} className="flex items-center space-x-3 py-2 px-3 bg-white rounded-lg border border-gray-200">
                                <div className="w-16 text-xs font-medium text-gray-700">
                                  {subblock.name}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-600">
                                      {subblock.startTime.toTimeString().slice(0, 5)} - {subblock.endTime.toTimeString().slice(0, 5)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {subblock.duration} min
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        subblockProgress >= 100 
                                          ? 'bg-green-500' 
                                          : subblockProgress > 0 
                                          ? 'bg-blue-500' 
                                          : 'bg-gray-300'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, subblockProgress))}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTechniqueButtonClick(block);
                                    }}
                                    className="p-1 h-6 w-6"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddIncident(block);
                                    }}
                                    className="p-1 h-6 w-6"
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Activities */}
                      {activities.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {activities.map((activity) => (
                            <div key={activity.id} className="flex items-center space-x-2 text-xs">
                              {activity.activity_type === 'technique_used' && (
                                <div className="flex items-center space-x-1 text-green-700">
                                  <Target className="w-3 h-3" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activity.technique_id) {
                                        // Navigate to technique detail - this will be handled by parent components
                                        window.dispatchEvent(new CustomEvent('navigateToTechnique', {
                                          detail: { techniqueId: activity.technique_id }
                                        }));
                                      }
                                    }}
                                    className="text-green-700 hover:text-green-900 hover:underline transition-colors"
                                  >
                                    {activity.teaching_techniques?.title}
                                  </button>
                                </div>
                              )}
                              {activity.activity_type === 'behavior_incident' && (
                                <div className="flex items-center space-x-1 text-red-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Gedragsincident</span>
                                </div>
                              )}
                              {activity.activity_type === 'note' && (
                                <div className="flex items-center space-x-1 text-blue-700">
                                  <Clock className="w-3 h-3" />
                                  <span>{activity.notes}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons for current/future blocks */}
                      {!isPast && (
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTechniqueButtonClick(block);
                            }}
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Techniek
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddIncident(block);
                            }}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Add Incident
                          </Button>
                        </div>
                      )}

                      {/* Subblocks for active lesson blocks */}
                      {isActive && block.block_type === 'lesson' && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Les onderdelen:</h4>
                          {calculateSubblocksForBlock(block).map((subblock, subIndex) => {
                            const currentTime = new Date();
                            const subblockProgress = calculateProgress(
                              subblock.startTime.toTimeString().slice(0, 5),
                              subblock.endTime.toTimeString().slice(0, 5),
                              currentTime
                            );
                            const isSubblockActive = subblockProgress > 0 && subblockProgress < 100;
                            const isSubblockComplete = subblockProgress === 100;
                            
                            return (
                              <div key={subIndex} className="flex items-center space-x-3 p-2 bg-white rounded border">
                                <div className="w-12 text-xs font-medium text-gray-600">
                                  {subblock.name}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">
                                      {subblock.startTime.toTimeString().slice(0, 5)} - {subblock.endTime.toTimeString().slice(0, 5)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {subblock.duration} min
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-1000 ${
                                        isSubblockComplete ? 'bg-green-500' :
                                        isSubblockActive ? 'bg-blue-500' : 'bg-gray-300'
                                      }`}
                                      style={{ width: `${subblockProgress}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTechniqueButtonClick(block);
                                    }}
                                    className="p-1"
                                  >
                                    <Target className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddIncident(block);
                                    }}
                                    className="p-1"
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Subject badge - top right */}
                    <div className="ml-4">
                      {block.school_subjects && (
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: block.school_subjects.color }}
                        >
                          {block.school_subjects.title}
                        </span>
                      )}
                      {isActive && (
                        <div className="mt-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Actief
                          </span>
                        </div>
                      )}
                      {activities.length > 0 && (
                        <div className="mt-1">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                            {activities.length} activiteit{activities.length !== 1 ? 'en' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Form Modal */}
      {showActivityForm && selectedBlock && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowActivityForm(false)}
            />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedBlock.title}
                </h3>
                <Button variant="ghost" onClick={() => setShowActivityForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {selectedBlock.start_time} - {selectedBlock.end_time}
                  {selectedBlock.school_subjects && ` • ${selectedBlock.school_subjects.title}`}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      handleTechniqueButtonClick(selectedBlock);
                      setShowActivityForm(false);
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Techniek gebruiken
                  </Button>
                  <Button 
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      handleAddIncident(selectedBlock);
                      setShowActivityForm(false);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Add Incident
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Activiteiten vandaag:</h4>
                  <div className="space-y-2">
                    {(blockActivities[selectedBlock.id] || []).map((activity) => (
                      <div key={activity.id} className="text-sm text-gray-600">
                        {activity.activity_type === 'technique_used' && (
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-green-600" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activity.technique_id) {
                                  // Navigate to technique detail
                                  window.dispatchEvent(new CustomEvent('navigateToTechnique', {
                                    detail: { techniqueId: activity.technique_id }
                                  }));
                                }
                              }}
                              className="text-green-600 hover:text-green-800 hover:underline transition-colors"
                            >
                              {activity.teaching_techniques?.title}
                            </button>
                          </div>
                        )}
                        {activity.activity_type === 'behavior_incident' && (
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span>Gedragsincident</span>
                          </div>
                        )}
                        {activity.notes && (
                          <p className="text-xs text-gray-500 ml-6">{activity.notes}</p>
                        )}
                      </div>
                    ))}
                    {(blockActivities[selectedBlock.id] || []).length === 0 && (
                      <p className="text-sm text-gray-500">Nog geen activiteiten geregistreerd</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technique Selector Modal */}
      {showTechniqueSelector && selectedBlock && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowTechniqueSelector(false)}
            />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Techniek selecteren voor {selectedBlock.title}
                </h3>
                <Button variant="ghost" onClick={() => setShowTechniqueSelector(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Zoek technieken..."
                    value={techniqueSearch}
                    onChange={(e) => setTechniqueSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredTechniques.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      {techniqueSearch ? 'Geen technieken gevonden' : 'Geen technieken beschikbaar'}
                    </p>
                  ) : (
                    filteredTechniques.map((technique) => (
                      <button
                        key={technique.id}
                        onClick={() => setSelectedTechnique(technique)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTechnique?.id === technique.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <BookOpenIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{technique.title}</h4>
                            {technique.subtitle && (
                              <p className="text-sm text-gray-600">{technique.subtitle}</p>
                            )}
                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                              {technique.description}
                            </p>
                            {technique.teaching_technique_categories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {technique.teaching_technique_categories
                                  .filter(tc => tc.technique_categories)
                                  .slice(0, 3)
                                  .map((tc, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 text-xs rounded-full text-white"
                                    style={{ backgroundColor: tc.technique_categories.color }}
                                  >
                                    {tc.technique_categories.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Subblocks for active lessons */}
                {selectedBlock.block_type === 'lesson' && isBlockActive(selectedBlock) && (
                  <div className="mt-4 space-y-2">
                    {calculateSubblocks(selectedBlock.start_time, selectedBlock.end_time).map((subblock, index) => {
                      const now = new Date();
                      const subblockProgress = calculateSubblockProgress(subblock, now);
                      const isSubblockActive = subblockProgress > 0 && subblockProgress < 100;
                      
                      return (
                        <div key={index} className="flex items-center space-x-3 py-2 px-3 bg-gray-50 rounded-lg">
                          <div className="w-16 text-xs font-medium text-gray-600">
                            {subblock.name}
                          </div>
                          <div className="w-20 text-xs text-gray-500">
                            {subblock.start_time} - {subblock.end_time}
                          </div>
                          <div className="flex-1 relative">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  subblockProgress >= 100 
                                    ? 'bg-green-500' 
                                    : isSubblockActive 
                                    ? 'bg-blue-500' 
                                    : 'bg-gray-300'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, subblockProgress))}%` }}
                              />
                            </div>
                            <div className="absolute -top-1 text-xs text-gray-500" style={{ left: `${Math.min(100, Math.max(0, subblockProgress))}%` }}>
                              {isSubblockActive && (
                                <div className="w-1 h-4 bg-blue-600 rounded-full transform -translate-x-1/2" />
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 w-12 text-right">
                            {subblock.duration}min
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Add technique to subblock
                                setSelectedBlock({ ...selectedBlock, subblock });
                                setShowActivityForm(true);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Techniek toevoegen"
                            >
                              <Target className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Add incident to subblock
                                handleAddIncident({ ...selectedBlock, subblock });
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Incident melden"
                            >
                              <AlertTriangle className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedTechnique && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Geselecteerd: {selectedTechnique.title}
                    </h4>
                    <div className="space-y-3">
                     {/* Grade Selection - Show when no group is selected OR when group has no connected grades */}
                     {(!selectedGroup || (selectedGroup && groupGrades.length === 0)) && schoolGrades.length > 0 && (
                       <div>
                         {!selectedGroup ? (
                           <h5 className="font-medium text-gray-900 mb-3">
                             Met welk leerjaar/niveau heb je deze techniek gebruikt?
                           </h5>
                         ) : (
                           <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                             <p className="text-sm text-yellow-800">
                               <strong>Let op:</strong> Deze groep heeft geen leerjaren gekoppeld. 
                               Selecteer handmatig een leerjaar voor deze registratie.
                             </p>
                           </div>
                         )}
                         <div className="space-y-2 max-h-32 overflow-y-auto mb-4">
                           {schoolGrades.map((grade) => (
                             <button
                               key={grade.id}
                               onClick={() => setSelectedGradeId(grade.id)}
                               className={`w-full text-left p-3 rounded border transition-colors ${
                                 selectedGradeId === grade.id
                                   ? 'border-indigo-500 bg-indigo-50'
                                   : 'border-gray-200 hover:bg-gray-50'
                               }`}
                             >
                               <div className="font-medium text-gray-900">{grade.name}</div>
                               {grade.description && (
                                 <div className="text-sm text-gray-600">{grade.description}</div>
                               )}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {/* Show connected grades when group is selected and has grades */}
                     {selectedGroup && groupGrades.length > 0 && (
                       <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                         <h5 className="font-medium text-green-900 mb-2">
                           Gekoppelde leerjaren voor groep "{selectedGroup.name}":
                         </h5>
                         <div className="flex flex-wrap gap-2">
                           {groupGrades.map((grade) => (
                             <span
                               key={grade.id}
                               className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                             >
                               {grade.name}
                             </span>
                           ))}
                         </div>
                         <p className="text-sm text-green-700 mt-2">
                           Deze techniek wordt geregistreerd voor alle bovenstaande leerjaren.
                         </p>
                       </div>
                     )}
                     
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notities (optioneel)
                        </label>
                        <textarea
                          value={techniqueNotes}
                          onChange={(e) => setTechniqueNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Hoe ging het? Wat werkte goed?"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button 
                          variant="secondary" 
                          onClick={() => setShowTechniqueSelector(false)}
                        >
                          Annuleren
                        </Button>
                        <Button 
                          onClick={addTechniqueUsage}
                         disabled={(!selectedGroup || groupGrades.length === 0) && schoolGrades.length > 0 && !selectedGradeId}
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Techniek registreren
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Behavior Incident Form Modal */}
      {showIncidentForm && incidentFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowIncidentForm(false)}
            />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
              <BehaviorIncidentForm
                schoolId={schoolId}
                onIncidentCreated={() => {
                  setShowIncidentForm(false);
                  setMessage('Incident succesvol gemeld!');
                }}
                onCancel={() => setShowIncidentForm(false)}
                preloadData={incidentFormData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}