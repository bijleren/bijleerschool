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
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Users, 
  GraduationCap,
  UserPlus,
  Trash2,
  Search,
  Heart,
  Star,
  Upload,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  Eye,
  Info
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'students' | 'groups' | 'grades' | 'teamleden'>('students');
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
  const [showGradeManagement, setShowGradeManagement] = useState(false);
  const [showSubjectsManagement, setShowSubjectsManagement] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // Student form
  const [newStudentFirstName, setNewStudentFirstName] = useState('');
  const [newStudentLastName, setNewStudentLastName] = useState('');
  const [newStudentNumber, setNewStudentNumber] = useState('');
  const [newStudentGradeLevel, setNewStudentGradeLevel] = useState('');
  const [newStudentDateOfBirth, setNewStudentDateOfBirth] = useState('');

  // Group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupGradeLevel, setNewGroupGradeLevel] = useState('');
  const [newGroupSchoolYear, setNewGroupSchoolYear] = useState('');

  // Teammember management states
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'teacher' | 'admin'>('teacher');
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

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
    fetchUserRole();
    fetchStudents();
    fetchGroups();
    fetchSchoolUsers();
    fetchPendingInvites();
  }, []);

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
        .eq('is_active', true)
        .order('role');

      if (error) throw error;
      
      // Sort client-side to avoid complex ordering syntax
      const sortedData = (data || []).sort((a, b) => {
        // First sort by role (admin first)
        if (a.role !== b.role) {
          return a.role === 'admin' ? -1 : 1;
        }
        // Then sort by first name
        const aName = a.profiles?.first_name || '';
        const bName = b.profiles?.first_name || '';
        return aName.localeCompare(bName);
      });
      
      setSchoolUsers(sortedData);
    } catch (error) {
      console.error('Error fetching school users:', error);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          status,
          profiles (
            first_name,
            last_name,
            email
          )
        `)
        .eq('school_id', school.id)
        .eq('status', 'pending')
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setPendingInvites(data || []);
    } catch (error) {
      console.error('Error fetching pending invites:', error);
    }
  };

  const inviteTeammember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Check if user already exists in the system
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', inviteEmail.trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (existingProfile) {
        // User exists, check if already connected to school
        const { data: existingConnection, error: connectionError } = await supabase
          .from('user_schools')
          .select('*')
          .eq('user_id', existingProfile.id)
          .eq('school_id', school.id)
          .maybeSingle();

        if (connectionError) throw connectionError;

        if (existingConnection) {
          setMessage('Deze gebruiker is al verbonden met de school.');
          setLoading(false);
          return;
        }

        // Add existing user to school
        const { error: userSchoolError } = await supabase
          .from('user_schools')
          .insert({
            user_id: existingProfile.id,
            school_id: school.id,
            role: inviteRole,
            status: 'approved'
          });

        if (userSchoolError) throw userSchoolError;

        // Add to teammembers table
        const { error: teammemberError } = await supabase
          .from('teammembers')
          .insert({
            user_id: existingProfile.id,
            is_active: true
          });

        // Don't throw error if teammember already exists
        if (teammemberError && !teammemberError.message?.includes('duplicate')) {
          console.warn('Error creating teammember profile:', teammemberError);
        }

        setMessage('Teammember succesvol toegevoegd!');
      } else {
        // User doesn't exist yet - create a pending invitation
        const { error: userSchoolError } = await supabase
          .from('user_schools')
          .insert({
            user_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID for pending invites
            school_id: school.id,
            role: inviteRole,
            status: 'pending'
          });

        if (userSchoolError) throw userSchoolError;

        setMessage(`Uitnodiging verstuurd naar ${inviteEmail}. Ze kunnen de schoolcode ${school.school_code} gebruiken om zich aan te sluiten.`);
      }

      setInviteEmail('');
      setInviteRole('teacher');
      setShowInviteForm(false);
      fetchSchoolUsers();
      fetchPendingInvites();
    } catch (error) {
      console.error('Error inviting teammember:', error);
      setMessage('Er is een fout opgetreden bij het uitnodigen van de teammember.');
    } finally {
      setLoading(false);
    }
  };

  const updateTeammemberRole = async (userSchoolId: string, newRole: 'teacher' | 'admin') => {
    try {
      const { error } = await supabase
        .from('user_schools')
        .update({ role: newRole })
        .eq('id', userSchoolId);

      if (error) throw error;

      setMessage('Rol succesvol bijgewerkt!');
      fetchSchoolUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van de rol.');
    }
  };

  const removeTeammember = async (userSchoolId: string, isCurrentUser: boolean = false) => {
    try {
      const { error } = await supabase
        .from('user_schools')
        .update({ is_active: false })
        .eq('id', userSchoolId);

      if (error) throw error;

      if (isCurrentUser) {
        setMessage('Je hebt jezelf succesvol verwijderd uit de school.');
        // Redirect back to schools list after removing self
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        setMessage('Teammember succesvol verwijderd uit school.');
        fetchSchoolUsers();
        fetchPendingInvites();
      }
    } catch (error) {
      console.error('Error removing teammember:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de teammember.');
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('user_schools')
        .update({ is_active: false })
        .eq('id', inviteId);

      if (error) throw error;

      setMessage('Uitnodiging succesvol ingetrokken.');
      fetchPendingInvites();
    } catch (error) {
      console.error('Error canceling invite:', error);
      setMessage('Er is een fout opgetreden bij het intrekken van de uitnodiging.');
    }
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
          grade_level: newStudentGradeLevel || null,
          date_of_birth: newStudentDateOfBirth || null,
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

  const resetStudentForm = () => {
    setNewStudentFirstName('');
    setNewStudentLastName('');
    setNewStudentNumber('');
    setNewStudentGradeLevel('');
    setNewStudentDateOfBirth('');
  };

  const resetGroupForm = () => {
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupGradeLevel('');
    setNewGroupSchoolYear('');
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
  const filteredStudents = students.filter(student =>
    studentSearch === '' ||
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (student.student_number && student.student_number.includes(studentSearch))
  );

  const filteredGroups = groups.filter(group =>
    groupSearch === '' ||
    group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(groupSearch.toLowerCase()))
  );

  const filteredUsers = schoolUsers.filter(schoolUser =>
    userSearch === '' ||
    `${schoolUser.profiles.first_name} ${schoolUser.profiles.last_name}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    schoolUser.profiles.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    schoolUser.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  const isAdmin = userRole === 'admin';

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
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Leerjaren (13)
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
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'students' && (
        <div className="space-y-6">
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
                onClick={() => setShowImportStudents(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importeren
              </Button>
              <Button onClick={() => setShowAddStudent(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Student toevoegen
              </Button>
            </div>
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
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Studentnummer"
                    value={newStudentNumber}
                    onChange={(e) => setNewStudentNumber(e.target.value)}
                  />
                  <Input
                    label="Klas/Niveau"
                    value={newStudentGradeLevel}
                    onChange={(e) => setNewStudentGradeLevel(e.target.value)}
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
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <button
                          onClick={() => handleStudentClick(student)}
                          className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {student.first_name} {student.last_name}
                        </button>
                        {student.student_number && (
                          <p className="text-sm text-gray-600">#{student.student_number}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {student.grade_level && (
                            <span>Klas: {student.grade_level}</span>
                          )}
                          {student.date_of_birth && (
                            <span>Geboren: {formatDate(student.date_of_birth)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Leerjaren en Niveaus</h3>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowSubjectsManagement(true)}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Vakken beheren
              </Button>
              <Button onClick={() => setShowGradeManagement(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Leerjaren beheren
              </Button>
            </div>
          </div>

          <Card className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Leerjaar beheer</h3>
            <p className="text-gray-600 mb-6">
              Beheer de leerjaren en vakken voor je school. Deze worden gebruikt bij het maken van schema's en het registreren van technieken.
            </p>
            <div className="flex justify-center space-x-3">
              <Button onClick={() => setShowGradeManagement(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Leerjaren beheren
              </Button>
              <Button variant="secondary" onClick={() => setShowSubjectsManagement(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                Vakken beheren
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'teamleden' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Teammembers</h3>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowInviteForm(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Teammember uitnodigen
              </Button>
            </div>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <Card>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Teammember uitnodigen</h4>
              <form onSubmit={inviteTeammember} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="E-mailadres"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="naam@school.nl"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rol
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'teacher' | 'admin')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="teacher">Teammember</option>
                      <option value="admin">Beheerder</option>
                    </select>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Schoolcode delen</p>
                      <p>Je kunt ook de schoolcode <strong>{school.school_code}</strong> delen met collega's zodat zij zich kunnen aansluiten.</p>
                      <p className="mt-1">Zij krijgen direct toegang na het invoeren van de code - geen goedkeuring nodig.</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="secondary" onClick={() => setShowInviteForm(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" loading={loading}>
                    Uitnodigen
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Zoek teamleden..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <Card>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Uitstaande uitnodigingen ({pendingInvites.length})
              </h4>
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{invite.profiles?.email || 'Onbekend e-mailadres'}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invite.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {invite.role === 'admin' ? 'Beheerder' : 'Teammember'}
                          </span>
                          <span>Uitgenodigd: {formatDate(invite.joined_at)}</span>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmModal({
                          isOpen: true,
                          title: 'Uitnodiging intrekken',
                          message: `Weet je zeker dat je de uitnodiging voor ${invite.profiles?.email} wilt intrekken?`,
                          onConfirm: () => {
                            cancelInvite(invite.id);
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          },
                        })}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Intrekken
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

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
              filteredUsers.map((schoolUser) => (
                <Card key={schoolUser.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {schoolUser.profiles.first_name} {schoolUser.profiles.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{schoolUser.profiles.email}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            schoolUser.status === 'approved' 
                              ? (schoolUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800')
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {schoolUser.status === 'approved' 
                              ? (schoolUser.role === 'admin' ? 'Beheerder' : 'Teammember')
                              : 'In afwachting'
                            }
                          </span>
                          {isAdmin && schoolUser.user_id !== user?.id && schoolUser.status === 'approved' ? (
                            <select
                              value={schoolUser.role}
                              onChange={(e) => updateTeammemberRole(schoolUser.id, e.target.value as 'teacher' | 'admin')}
                              className="px-2 py-1 text-xs border border-gray-300 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="teacher">Teammember</option>
                              <option value="admin">Beheerder</option>
                            </select>
                          )}
                          <span>Toegevoegd: {formatDate(schoolUser.joined_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {schoolUser.status === 'pending' && isAdmin ? (
                        <div className="flex space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => approveTeammember(schoolUser.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Goedkeuren
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              title: 'Aanvraag afwijzen',
                              message: `Weet je zeker dat je de aanvraag van ${schoolUser.profiles.first_name} ${schoolUser.profiles.last_name} wilt afwijzen?`,
                              onConfirm: () => {
                                rejectTeammember(schoolUser.id);
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              },
                            })}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Afwijzen
                          </Button>
                        </div>
                      ) : schoolUser.user_id === user?.id ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: 'Jezelf verwijderen',
                            message: 'Weet je zeker dat je jezelf uit deze school wilt verwijderen? Je verliest toegang tot alle schooldata.',
                            onConfirm: () => {
                              removeTeammember(schoolUser.id, true);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            },
                          })}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Jezelf verwijderen
                        </Button>
                      ) : isAdmin ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: 'Teammember verwijderen',
                            message: `Weet je zeker dat je ${schoolUser.profiles.first_name} ${schoolUser.profiles.last_name} uit de school wilt verwijderen?`,
                            onConfirm: () => {
                              removeTeammember(schoolUser.id);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            },
                          })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Import Students Modal */}
      {showImportStudents && (
        <StudentImport
          schoolId={school.id}
          onImportComplete={fetchStudents}
          onClose={() => setShowImportStudents(false)}
        />
      )}

      {/* Grade Management Modal */}
      {showGradeManagement && (
        <GradeManagement
          schoolId={school.id}
          onClose={() => setShowGradeManagement(false)}
        />
      )}

      {/* Subjects Management Modal */}
      {showSubjectsManagement && (
        <SubjectsManagement
          schoolId={school.id}
          onClose={() => setShowSubjectsManagement(false)}
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