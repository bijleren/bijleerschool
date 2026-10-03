import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StudentImport } from './StudentImport';
import { GradeManagement } from '../schoolday/GradeManagement';
import { SubjectsManagement } from '../schoolday/SubjectsManagement';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ArrowLeft, CreditCard as Edit, Save, X, Plus, Users, GraduationCap, UserPlus, Trash2, Search, Heart, Star, Upload, Clock, CheckCircle, XCircle, AlertTriangle, BookOpen, Eye, HardDrive, Calendar, LogOut, Tag, Image as ImageIcon, Zap, Download, Key, EyeOff, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { trackFileUpload } from '../../utils/storageTracking';
import { DataGebruikTab } from '../storage/DataGebruikTab';
import { DayTimeline } from '../schoolday/DayTimeline';
import { TemplateBuilder } from '../schoolday/TemplateBuilder';
import { TemplateConnections } from '../schoolday/TemplateConnections';
import { LessonTimingSettings } from '../schoolday/LessonTimingSettings';
import { SchoolTagsSettings } from './SchoolTagsSettings';

interface School {
  id: string;
  name: string;
  school_code: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
  date_of_birth: string | null;
  is_active: boolean;
  created_at: string;
  profile_picture_url?: string | null;
  symbol_url?: string | null;
  color?: string | null;
  pin_code?: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  school_year: string | null;
  is_active: boolean;
  created_at: string;
}

interface SchoolUser {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface PendingRequest {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface SchoolDetailProps {
  school: School;
  onBack: () => void;
  onSchoolUpdated: (school: School) => void;
  onNavigateToStudent: (studentId: string, schoolId: string) => void;
  onNavigateToGroup: (groupId: string, schoolId: string) => void;
}

export function SchoolDetail({ school, onBack, onSchoolUpdated, onNavigateToStudent, onNavigateToGroup }: SchoolDetailProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'groups' | 'grades' | 'subjects' | 'teamleden' | 'datagebruik' | 'schooldag' | 'tags'>('students');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // School editing states
  const [editName, setEditName] = useState(school.name);
  const [editAddress, setEditAddress] = useState(school.address || '');
  const [editCity, setEditCity] = useState(school.city || '');
  const [editPostalCode, setEditPostalCode] = useState(school.postal_code || '');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  // Form states
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showImportStudents, setShowImportStudents] = useState(false);
  const [gradesCount, setGradesCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // Tag filter state
  const [schoolTags, setSchoolTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR');
  const [studentTagMap, setStudentTagMap] = useState<Map<string, string[]>>(new Map());

  // Quick edit mode
  const [quickUploadMode, setQuickUploadMode] = useState(false);
  const [quickUploadingId, setQuickUploadingId] = useState<string | null>(null);
  const [schoolColors, setSchoolColors] = useState<string[]>([]);
  const [colorPickerOpenId, setColorPickerOpenId] = useState<string | null>(null);
  const [visiblePinIds, setVisiblePinIds] = useState<Set<string>>(new Set());
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editPinValue, setEditPinValue] = useState('');
  const [savingPinId, setSavingPinId] = useState<string | null>(null);
  const [isBulkDragging, setIsBulkDragging] = useState(false);
  const [bulkUploadStatus, setBulkUploadStatus] = useState<{ current: number; total: number; name: string } | null>(null);

  // Student form
  const [newStudentFirstName, setNewStudentFirstName] = useState('');
  const [newStudentLastName, setNewStudentLastName] = useState('');
  const [newStudentNumber, setNewStudentNumber] = useState('');
  const [newStudentDateOfBirth, setNewStudentDateOfBirth] = useState('');

  // Group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupGradeLevel, setNewGroupGradeLevel] = useState('');
  const [newGroupSchoolYear, setNewGroupSchoolYear] = useState('');

  // Schooldag state
  const [schooldagView, setSchooldagView] = useState<'timeline' | 'templates' | 'connections' | 'timing'>('timeline');
  const [schooldagTemplates, setSchooldagTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

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
    if (!colorPickerOpenId) return;
    const close = () => setColorPickerOpenId(null);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
    };
  }, [colorPickerOpenId]);

  useEffect(() => {
    fetchUserRole();
    fetchStudents();
    fetchGroups();
    fetchSchoolUsers();
    fetchSchoolTagsForFilter();

    const searchQuery = sessionStorage.getItem('studentSearchQuery');
    if (searchQuery) {
      setStudentSearch(searchQuery);
      sessionStorage.removeItem('studentSearchQuery');
    }
  }, []);

  const fetchSchoolTagsForFilter = async () => {
    try {
      const { data: tagDefs } = await supabase
        .from('student_tag_definitions')
        .select('id, name, color')
        .eq('school_id', school.id)
        .order('name', { ascending: true });

      setSchoolTags(tagDefs || []);

      const { data: assignments } = await supabase
        .from('student_tag_assignments')
        .select('student_id, tag_definition_id')
        .in('tag_definition_id', (tagDefs || []).map(t => t.id));

      const map = new Map<string, string[]>();
      (assignments || []).forEach(a => {
        const existing = map.get(a.student_id) || [];
        map.set(a.student_id, [...existing, a.tag_definition_id]);
      });
      setStudentTagMap(map);
    } catch (err) {
      console.error('Error fetching tags for filter:', err);
    }
  };

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select('role')
        .eq('user_id', user.id)
        .eq('school_id', school.id)
        .eq('status', 'approved')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', school.id)
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
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchSchoolUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email
          )
        `)
        .eq('school_id', school.id)
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('role')
        .order('profiles(first_name)');

      if (error) throw error;
      setSchoolUsers(data || []);
    } catch (error) {
      console.error('Error fetching school users:', error);
    }
  };

  const disconnectUser = async (schoolUserId: string, targetUserId: string) => {
    const isSelf = targetUserId === user?.id;
    setConfirmModal({
      isOpen: true,
      title: isSelf ? 'School verlaten' : 'Teammember verwijderen',
      message: isSelf
        ? 'Weet je zeker dat je jezelf wilt loskoppelen van deze school? Je verliest toegang tot alle gegevens van deze school.'
        : 'Weet je zeker dat je dit teammember wilt loskoppelen van deze school?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('user_schools')
            .update({ is_active: false })
            .eq('id', schoolUserId);

          if (error) throw error;

          setSchoolUsers(prev => prev.filter(u => u.id !== schoolUserId));

          if (isSelf) {
            onBack();
          }
        } catch (error) {
          console.error('Error disconnecting user:', error);
          setMessage('Er is een fout opgetreden bij het loskoppelen.');
        }
      },
    });
  };

  const updateSchool = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('schools')
        .update({
          name: editName,
          address: editAddress || null,
          city: editCity || null,
          postal_code: editPostalCode || null,
        })
        .eq('id', school.id)
        .select()
        .single();

      if (error) throw error;

      onSchoolUpdated(data);
      setIsEditing(false);
      setMessage('School succesvol bijgewerkt!');
    } catch (error) {
      console.error('Error updating school:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van de school.');
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('students')
        .insert({
          school_id: school.id,
          first_name: newStudentFirstName,
          last_name: newStudentLastName,
          student_number: newStudentNumber || null,
          date_of_birth: newStudentDateOfBirth || null,
          color: '#3B82F6',
        });

      if (error) throw error;

      setMessage('Student succesvol toegevoegd!');
      setShowAddStudent(false);
      resetStudentForm();
      fetchStudents();
    } catch (error) {
      console.error('Error adding student:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen van de student.');
    } finally {
      setLoading(false);
    }
  };

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('groups')
        .insert({
          school_id: school.id,
          name: newGroupName,
          description: newGroupDescription || null,
          grade_level: newGroupGradeLevel || null,
          school_year: newGroupSchoolYear || null,
        });

      if (error) throw error;

      setMessage('Groep succesvol toegevoegd!');
      setShowAddGroup(false);
      resetGroupForm();
      fetchGroups();
    } catch (error) {
      console.error('Error adding group:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen van de groep.');
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', studentId);

      if (error) throw error;

      setMessage('Student succesvol verwijderd!');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de student.');
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({ is_active: false })
        .eq('id', groupId);

      if (error) throw error;

      setMessage('Groep succesvol verwijderd!');
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de groep.');
    }
  };

  const fetchSchooldagTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('day_templates')
        .select('*')
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchooldagTemplates(data || []);
    } catch (error) {
      console.error('Error fetching day templates:', error);
    }
  };

  const resetStudentForm = () => {
    setNewStudentFirstName('');
    setNewStudentLastName('');
    setNewStudentNumber('');
    setNewStudentDateOfBirth('');
  };

  const resetGroupForm = () => {
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupGradeLevel('');
    setNewGroupSchoolYear('');
  };

  const handleQuickUpload = async (studentId: string, file: File, type: 'profile' | 'symbol') => {
    if (file.size > 10485760) {
      setMessage('De afbeelding is te groot (max 10 MB). Kies een kleinere foto of verklein hem eerst.');
      return;
    }
    setQuickUploadingId(studentId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `${school.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(filePath, file, { cacheControl: '3600' });

      if (uploadError) throw uploadError;

      if (user) {
        await trackFileUpload(school.id, 'student_photo', `student-files/${filePath}`, file.size, user.id);
      }

      const { data: { publicUrl } } = supabase.storage.from('student-files').getPublicUrl(filePath);

      const updateField = type === 'profile' ? { profile_picture_url: publicUrl } : { symbol_url: publicUrl };
      const { error: updateError } = await supabase.from('students').update(updateField).eq('id', studentId);
      if (updateError) throw updateError;

      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updateField } : s));
    } catch (err) {
      console.error('Quick upload error:', err);
    } finally {
      setQuickUploadingId(null);
    }
  };

  const normalizeName = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const matchFileToStudent = (fileName: string, studentList: Student[]): Student | null => {
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const normalizedFile = normalizeName(baseName);
    if (!normalizedFile) return null;

    // Try exact full name match first (firstname + lastname concatenated)
    for (const s of studentList) {
      const fullName = normalizeName(`${s.first_name}${s.last_name}`);
      if (fullName === normalizedFile) return s;
    }
    // Try firstname only
    for (const s of studentList) {
      if (normalizeName(s.first_name) === normalizedFile) return s;
    }
    // Try lastname only
    for (const s of studentList) {
      if (normalizeName(s.last_name) === normalizedFile) return s;
    }
    // Try partial: filename starts with firstname
    for (const s of studentList) {
      const fn = normalizeName(s.first_name);
      if (fn && normalizedFile.startsWith(fn)) return s;
    }
    return null;
  };

  const handleBulkUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
    if (fileArray.length === 0) return;

    const matched: Array<{ file: File; student: Student }> = [];
    const unmatched: string[] = [];

    for (const file of fileArray) {
      const student = matchFileToStudent(file.name, students);
      if (student) {
        matched.push({ file, student });
      } else {
        unmatched.push(file.name);
      }
    }

    if (matched.length === 0) {
      setMessage(`Geen leerlingen gevonden die overeenkomen met de bestandsnamen. ${unmatched.length} bestand(en) niet gematched.`);
      return;
    }

    for (let i = 0; i < matched.length; i++) {
      const { file, student } = matched[i];
      setBulkUploadStatus({ current: i + 1, total: matched.length, name: `${student.first_name} ${student.last_name}` });
      await handleQuickUpload(student.id, file, 'profile');
    }

    setBulkUploadStatus(null);

    if (unmatched.length > 0) {
      setMessage(`${matched.length} foto('s) geupload. ${unmatched.length} niet gematched: ${unmatched.slice(0, 5).join(', ')}${unmatched.length > 5 ? '...' : ''}`);
    } else {
      setMessage(`${matched.length} foto('s) succesvol geupload!`);
    }
  };

  const handleQuickColorUpdate = async (studentId: string, color: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, color } : s));
    setColorPickerOpenId(null);
    await supabase.from('students').update({ color }).eq('id', studentId);
    // Refresh palette of used colors
    const used = [...new Set(students.map(s => s.id === studentId ? color : s.color).filter(Boolean))] as string[];
    setSchoolColors(used);
  };

  const handleQuickRemove = async (studentId: string, type: 'profile' | 'symbol') => {
    setQuickUploadingId(studentId);
    try {
      const updateField = type === 'profile' ? { profile_picture_url: null } : { symbol_url: null };
      const { error } = await supabase.from('students').update(updateField).eq('id', studentId);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updateField } : s));
    } catch (err) {
      console.error('Quick remove error:', err);
    } finally {
      setQuickUploadingId(null);
    }
  };

  const togglePinVisibility = (studentId: string) => {
    setVisiblePinIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const startEditPin = (student: Student) => {
    setEditingPinId(student.id);
    setEditPinValue(student.pin_code || '');
  };

  const cancelEditPin = () => {
    setEditingPinId(null);
    setEditPinValue('');
  };

  const saveQuickPin = async (studentId: string) => {
    const trimmed = editPinValue.trim();
    setSavingPinId(studentId);
    try {
      const { error } = await supabase
        .from('students')
        .update({ pin_code: trimmed || null })
        .eq('id', studentId);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, pin_code: trimmed || null } : s));
      setEditingPinId(null);
      setEditPinValue('');
    } catch (err) {
      console.error('Error updating pin code:', err);
    } finally {
      setSavingPinId(null);
    }
  };

  const handleStudentClick = (student: Student) => {
    console.log('SchoolDetail: Student clicked:', student.id, school.id);
    // Dispatch custom event for navigation
    window.dispatchEvent(new CustomEvent('navigateToStudentDetail', {
      detail: { studentId: student.id, schoolId: school.id }
    }));
  };

  const handleGroupClick = (group: Group) => {
    console.log('SchoolDetail: Group clicked:', group.id, school.id);
    // Dispatch custom event for navigation
    window.dispatchEvent(new CustomEvent('navigateToGroupDetail', {
      detail: { groupId: group.id, schoolId: school.id }
    }));
  };

  const showDeleteStudentConfirmation = (student: Student) => {
    setConfirmModal({
      isOpen: true,
      title: 'Student verwijderen',
      message: `Weet je zeker dat je ${student.first_name} ${student.last_name} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
      onConfirm: () => {
        deleteStudent(student.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const showDeleteGroupConfirmation = (group: Group) => {
    setConfirmModal({
      isOpen: true,
      title: 'Groep verwijderen',
      message: `Weet je zeker dat je "${group.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
      onConfirm: () => {
        deleteGroup(group.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Filter functions
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      studentSearch === '' ||
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (student.student_number && student.student_number.includes(studentSearch));

    if (!matchesSearch) return false;
    if (selectedTagIds.length === 0) return true;

    const studentTags = studentTagMap.get(student.id) || [];
    if (tagFilterMode === 'OR') {
      return selectedTagIds.some(tid => studentTags.includes(tid));
    } else {
      return selectedTagIds.every(tid => studentTags.includes(tid));
    }
  });

  useEffect(() => {
    if (studentSearch && filteredStudents.length === 1 && students.length > 0) {
      const autoNavigateTimeout = setTimeout(() => {
        handleStudentClick(filteredStudents[0]);
      }, 500);

      return () => clearTimeout(autoNavigateTimeout);
    }
  }, [filteredStudents.length, studentSearch, students.length]);

  const filteredGroups = groups.filter(group =>
    groupSearch === '' ||
    group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(groupSearch.toLowerCase()))
  );

  const filteredUsers = schoolUsers.filter(schoolUser =>
    userSearch === '' ||
    `${schoolUser.profiles?.first_name || ''} ${schoolUser.profiles?.last_name || ''}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    (schoolUser.profiles?.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    schoolUser.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  const isAdmin = userRole === 'admin';

  const exportStudentsToExcel = () => {
    const rows = students.map(s => ({
      Voornaam: s.first_name,
      Achternaam: s.last_name,
      Leerlingnummer: s.student_number ?? '',
      Geboortedatum: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('nl-BE') : '',
      Status: s.is_active ? 'Actief' : 'Inactief',
      'Toegevoegd op': new Date(s.created_at).toLocaleDateString('nl-BE'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leerlingen');
    XLSX.writeFile(wb, `leerlingen_${school.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar scholen
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
            <p className="text-gray-600">Code: {school.school_code}</p>
            {school.city && (
              <p className="text-sm text-gray-500">{school.city}</p>
            )}
          </div>
        </div>
        {isAdmin && !isEditing ? (
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            School bewerken
          </Button>
        ) : isAdmin && isEditing ? (
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 mr-2" />
              Annuleren
            </Button>
            <Button onClick={updateSchool} loading={loading}>
              <Save className="w-4 h-4 mr-2" />
              Opslaan
            </Button>
          </div>
        ) : null}
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

      {/* School Info */}
      {isEditing && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">School Informatie</h3>
          <div className="space-y-4">
            <Input
              label="Schoolnaam"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Adres"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Postcode"
                value={editPostalCode}
                onChange={(e) => setEditPostalCode(e.target.value)}
              />
              <Input
                label="Plaats"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('students')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'students'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Leerlingen ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'groups'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Klassen ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'grades'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Leerjaren ({gradesCount})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'subjects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Vakken ({subjectsCount})
          </button>
          <button
            onClick={() => setActiveTab('teamleden')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'teamleden'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Teamleden ({schoolUsers.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('datagebruik');
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'datagebruik'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <HardDrive className="w-4 h-4 mr-2" />
            Data-gebruik
          </button>
          <button
            onClick={() => {
              setActiveTab('schooldag');
              fetchSchooldagTemplates();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'schooldag'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schooldag
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'tags'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tag className="w-4 h-4 mr-2" />
            Tags ({schoolTags.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Zoek leerlingen..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={exportStudentsToExcel}
                  disabled={students.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowImportStudents(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importeren
                </Button>
                <Button
                  variant={quickUploadMode ? 'primary' : 'secondary'}
                  onClick={() => {
                    const next = !quickUploadMode;
                    setQuickUploadMode(next);
                    if (next) {
                      const used = [...new Set(students.map(s => s.color).filter(Boolean))] as string[];
                      setSchoolColors(used);
                    } else {
                      setColorPickerOpenId(null);
                    }
                  }}
                  title="Snel foto, symbool en kleur aanpassen per leerling"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Snel aanpassen
                </Button>
                <Button onClick={() => setShowAddStudent(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Student toevoegen
                </Button>
              </div>
            </div>

            {/* Tag filter row */}
            {schoolTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium flex-shrink-0">Filter op tag:</span>
                {schoolTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagIds(prev =>
                      prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                    )}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedTagIds.includes(tag.id)
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedTagIds.includes(tag.id) ? 'rgba(255,255,255,0.6)' : tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
                {selectedTagIds.length > 1 && (
                  <div className="flex items-center gap-1 ml-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setTagFilterMode('OR')}
                      className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                        tagFilterMode === 'OR' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500'
                      }`}
                    >
                      OF
                    </button>
                    <button
                      onClick={() => setTagFilterMode('AND')}
                      className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                        tagFilterMode === 'AND' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                )}
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={() => setSelectedTagIds([])}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-1 transition-colors"
                  >
                    Wis filter
                  </button>
                )}
              </div>
            )}
          </div>

          {showAddStudent && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe student toevoegen</h3>
              <form onSubmit={addStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Voornaam"
                    value={newStudentFirstName}
                    onChange={(e) => setNewStudentFirstName(e.target.value)}
                    required
                  />
                  <Input
                    label="Achternaam"
                    value={newStudentLastName}
                    onChange={(e) => setNewStudentLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Studentnummer"
                    value={newStudentNumber}
                    onChange={(e) => setNewStudentNumber(e.target.value)}
                  />
                  <Input
                    label="Geboortedatum"
                    type="date"
                    value={newStudentDateOfBirth}
                    onChange={(e) => setNewStudentDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="secondary" onClick={() => setShowAddStudent(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" loading={loading}>
                    Student toevoegen
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {quickUploadMode && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsBulkDragging(true); }}
              onDragLeave={() => setIsBulkDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsBulkDragging(false);
                if (e.dataTransfer.files.length > 0) {
                  handleBulkUpload(e.dataTransfer.files);
                }
              }}
              className={`mb-4 rounded-xl border-2 border-dashed transition-all p-6 text-center ${
                isBulkDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              {bulkUploadStatus ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-gray-700">
                    Uploaden {bulkUploadStatus.current}/{bulkUploadStatus.total}: {bulkUploadStatus.name}
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    Sleep foto's hierheen om in bulk te uploaden
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Bestandsnaam moet overeenkomen met de naam van de leerling (bijv. "Jan Janssens.jpg" of "janjanssens.png"). Accenten en hoofdletters worden genegeerd.
                  </p>
                  <label className="mt-3 inline-flex items-center space-x-2 cursor-pointer px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Of selecteer bestanden</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleBulkUpload(e.target.files);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4">
            {filteredStudents.length === 0 ? (
              <Card className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {students.length === 0 ? 'Geen leerlingen gevonden' : 'Geen leerlingen gevonden met deze zoekopdracht'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {students.length === 0 
                    ? 'Voeg leerlingen toe om te beginnen met het beheren van je school.'
                    : 'Probeer een andere zoekopdracht.'
                  }
                </p>
                {students.length === 0 && (
                  <Button onClick={() => setShowAddStudent(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Eerste leerling toevoegen
                  </Button>
                )}
              </Card>
            ) : (
              filteredStudents.map((student) => (
                <Card key={student.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {quickUploadMode ? (
                          <label
                            className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer group ${quickUploadingId === student.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title="Klik om profielfoto te uploaden"
                          >
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                              {student.profile_picture_url ? (
                                <img src={student.profile_picture_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <GraduationCap className="w-6 h-6 text-blue-600" />
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                              <Upload className="w-4 h-4 text-white" />
                            </div>
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              disabled={quickUploadingId === student.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleQuickUpload(student.id, f, 'profile');
                                e.target.value = '';
                              }}
                            />
                          </label>
                        ) : (
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {student.profile_picture_url ? (
                              <img
                                src={student.profile_picture_url}
                                alt={`${student.first_name} ${student.last_name}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <GraduationCap className="w-6 h-6 text-blue-600" />
                            )}
                          </div>
                        )}
                        {quickUploadMode && student.profile_picture_url && (
                          <button
                            type="button"
                            disabled={quickUploadingId === student.id}
                            onClick={() => handleQuickRemove(student.id, 'profile')}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Profielfoto verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {quickUploadMode && (
                          <label
                            className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group border border-gray-200 ${quickUploadingId === student.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title="Klik om symbool te uploaden"
                          >
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              {student.symbol_url ? (
                                <img src={student.symbol_url} alt="Symbool" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <Upload className="w-4 h-4 text-white" />
                            </div>
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              disabled={quickUploadingId === student.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleQuickUpload(student.id, f, 'symbol');
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                        {quickUploadMode && student.symbol_url && (
                          <button
                            type="button"
                            disabled={quickUploadingId === student.id}
                            onClick={() => handleQuickRemove(student.id, 'symbol')}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Symbool verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {quickUploadMode && (
                          <div className="relative flex-shrink-0">
                            <button
                              className="w-8 h-8 rounded-lg border-2 border-white shadow ring-1 ring-gray-200 transition-transform hover:scale-110"
                              style={{ backgroundColor: student.color || '#3B82F6' }}
                              title="Kleur aanpassen"
                              onClick={(e) => {
                                e.stopPropagation();
                                setColorPickerOpenId(colorPickerOpenId === student.id ? null : student.id);
                              }}
                            />
                            {colorPickerOpenId === student.id && (
                              <div
                                className="absolute left-0 top-10 z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52"
                                onClick={e => e.stopPropagation()}
                              >
                                <p className="text-xs font-semibold text-gray-500 mb-2">Kleur kiezen</p>
                                {schoolColors.length > 0 && (
                                  <>
                                    <p className="text-xs text-gray-400 mb-1.5">Gebruikt in school</p>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {schoolColors.map(c => (
                                        <button
                                          key={c}
                                          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                                          style={{ backgroundColor: c, borderColor: student.color === c ? '#1d4ed8' : 'white' }}
                                          onClick={() => handleQuickColorUpdate(student.id, c)}
                                        />
                                      ))}
                                    </div>
                                  </>
                                )}
                                <p className="text-xs text-gray-400 mb-1.5">Eigen kleur</p>
                                <input
                                  type="color"
                                  defaultValue={student.color || '#3B82F6'}
                                  className="w-full h-8 rounded cursor-pointer border border-gray-200"
                                  onChange={e => handleQuickColorUpdate(student.id, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {quickUploadingId === student.id && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {quickUploadMode && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Key className="w-4 h-4 text-gray-400" />
                            {editingPinId === student.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editPinValue}
                                  onChange={e => setEditPinValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveQuickPin(student.id);
                                    if (e.key === 'Escape') cancelEditPin();
                                  }}
                                  autoFocus
                                  maxLength={10}
                                  placeholder="Pincode"
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                  onClick={() => saveQuickPin(student.id)}
                                  disabled={savingPinId === student.id}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                  title="Opslaan"
                                >
                                  {savingPinId === student.id
                                    ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                    : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={cancelEditPin}
                                  className="p-1 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Annuleren"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditPin(student)}
                                  className="px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors min-w-[3rem] text-center"
                                  title="Klik om pincode aan te passen"
                                >
                                  {student.pin_code
                                    ? (visiblePinIds.has(student.id) ? student.pin_code : '••••')
                                    : <span className="text-gray-400 italic">geen</span>}
                                </button>
                                {student.pin_code && (
                                  <button
                                    onClick={() => togglePinVisibility(student.id)}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    title={visiblePinIds.has(student.id) ? 'Verberg pincode' : 'Toon pincode'}
                                  >
                                    {visiblePinIds.has(student.id)
                                      ? <EyeOff className="w-3.5 h-3.5" />
                                      : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => handleStudentClick(student)}
                          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {student.first_name} {student.last_name}
                        </button>
                        {student.student_number && (
                          <p className="text-sm text-gray-600">#{student.student_number}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {student.date_of_birth && (
                            <span>Geboren: {formatDate(student.date_of_birth)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStudentClick(student)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Bekijken
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => showDeleteStudentConfirmation(student)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Zoek klassen..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
            <Button onClick={() => setShowAddGroup(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Klas toevoegen
            </Button>
          </div>

          {showAddGroup && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe klas toevoegen</h3>
              <form onSubmit={addGroup} className="space-y-4">
                <Input
                  label="Klasnaam"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  placeholder="Bijv. 3A, Bovenbouw"
                />
                <Input
                  label="Beschrijving"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Klas/Niveau"
                    value={newGroupGradeLevel}
                    onChange={(e) => setNewGroupGradeLevel(e.target.value)}
                  />
                  <Input
                    label="Schooljaar"
                    value={newGroupSchoolYear}
                    onChange={(e) => setNewGroupSchoolYear(e.target.value)}
                    placeholder="2024-2025"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="secondary" onClick={() => setShowAddGroup(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" loading={loading}>
                    Klas toevoegen
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-4">
            {filteredGroups.length === 0 ? (
              <Card className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {groups.length === 0 ? 'Geen klassen gevonden' : 'Geen klassen gevonden met deze zoekopdracht'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {groups.length === 0 
                    ? 'Voeg klassen toe om leerlingen te organiseren.'
                    : 'Probeer een andere zoekopdracht.'
                  }
                </p>
                {groups.length === 0 && (
                  <Button onClick={() => setShowAddGroup(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Eerste klas toevoegen
                  </Button>
                )}
              </Card>
            ) : (
              filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <button
                          onClick={() => handleGroupClick(group)}
                          className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {group.name}
                        </button>
                        {group.description && (
                          <p className="text-sm text-gray-600">{group.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {group.grade_level && (
                            <span>Niveau: {group.grade_level}</span>
                          )}
                          {group.school_year && (
                            <span>Schooljaar: {group.school_year}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleGroupClick(group)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Beheren
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => showDeleteGroupConfirmation(group)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'grades' && (
        <GradeManagement
          schoolId={school.id}
          onClose={() => {}}
          inline
          onCountChange={setGradesCount}
        />
      )}

      {activeTab === 'subjects' && (
        <SubjectsManagement
          schoolId={school.id}
          onClose={() => {}}
          inline
          onCountChange={setSubjectsCount}
        />
      )}

      {activeTab === 'teamleden' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Zoek teamleden..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredUsers.length === 0 ? (
              <Card className="text-center py-12">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {schoolUsers.length === 0 ? 'Geen teamleden gevonden' : 'Geen teamleden gevonden met deze zoekopdracht'}
                </h3>
                <p className="text-gray-600">
                  {schoolUsers.length === 0 
                    ? 'Er zijn nog geen teamleden verbonden met deze school.'
                    : 'Probeer een andere zoekopdracht.'
                  }
                </p>
              </Card>
            ) : (
              filteredUsers.map((schoolUser) => {
                const isSelf = schoolUser.user_id === user?.id;
                const canDisconnect = isAdmin || isSelf;
                return (
                  <Card key={schoolUser.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserPlus className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">
                              {schoolUser.profiles?.first_name} {schoolUser.profiles?.last_name}
                            </h3>
                            {isSelf && (
                              <span className="text-xs text-gray-400 font-normal">(jij)</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{schoolUser.profiles?.email}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              schoolUser.role === 'admin'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {schoolUser.role === 'admin' ? 'Beheerder' : 'Teammember'}
                            </span>
                            <span>Toegevoegd: {formatDate(schoolUser.joined_at)}</span>
                          </div>
                        </div>
                      </div>
                      {canDisconnect && (
                        <button
                          onClick={() => disconnectUser(schoolUser.id, schoolUser.user_id)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isSelf
                              ? 'text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300'
                              : 'text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200'
                          }`}
                          title={isSelf ? 'School verlaten' : 'Loskoppelen van school'}
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{isSelf ? 'Verlaten' : 'Loskoppelen'}</span>
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'datagebruik' && (
        <DataGebruikTab schoolId={school.id} />
      )}

      {activeTab === 'schooldag' && (
        <>
          {schooldagView === 'templates' && (
            <TemplateBuilder
              schoolId={school.id}
              onBack={() => {
                setSelectedTemplate(null);
                setSchooldagView('timeline');
              }}
              onTemplateCreated={() => {
                fetchSchooldagTemplates();
                setSchooldagView('timeline');
              }}
              editingTemplate={selectedTemplate}
              onTemplateUpdated={() => {
                fetchSchooldagTemplates();
                setSelectedTemplate(null);
                setSchooldagView('timeline');
              }}
            />
          )}
          {schooldagView === 'connections' && (
            <TemplateConnections
              schoolId={school.id}
              onBack={() => setSchooldagView('timeline')}
              templates={schooldagTemplates}
            />
          )}
          {schooldagView === 'timing' && (
            <LessonTimingSettings
              schoolId={school.id}
              onClose={() => setSchooldagView('timeline')}
              onSettingsUpdated={() => setSchooldagView('timeline')}
            />
          )}
          {schooldagView === 'timeline' && (
            <div>
              <div className="flex justify-end space-x-3 mb-6">
                <Button
                  variant="secondary"
                  onClick={() => setSchooldagView('connections')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Verbindingen
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSchooldagView('timing')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Timing
                </Button>
                <Button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setSchooldagView('templates');
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Template
                </Button>
              </div>

              {schooldagTemplates.length > 0 && (
                <Card className="mb-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Alle templates</h3>
                  <div className="divide-y divide-gray-100">
                    {schooldagTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="font-medium text-gray-900">{template.name}</p>
                          {template.description && (
                            <p className="text-sm text-gray-500">{template.description}</p>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setSchooldagView('templates');
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Bewerken
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <DayTimeline
                schoolId={school.id}
                templates={schooldagTemplates}
                onEditTemplate={(template) => {
                  setSelectedTemplate(template);
                  setSchooldagView('templates');
                }}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'tags' && (
        <SchoolTagsSettings
          schoolId={school.id}
          onTagsChanged={fetchSchoolTagsForFilter}
        />
      )}

      {/* Import Students Modal */}
      {showImportStudents && (
        <StudentImport
          schoolId={school.id}
          onImportComplete={fetchStudents}
          onClose={() => setShowImportStudents(false)}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Bevestigen"
        cancelText="Annuleren"
        variant="danger"
      />
    </div>
  );
}