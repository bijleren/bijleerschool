import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StudentImport } from './StudentImport';
import { GradeManagement } from '../schoolday/GradeManagement';
import { SubjectsManagement } from '../schoolday/SubjectsManagement';
import { TeammembersManagement } from './TeammembersManagement';
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
  Eye
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
  const [showTeammembersManagement, setShowTeammembersManagement] = useState(false);
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
  }, []);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('school_teammembers')
        .select('role')
        .eq('user_id', user.id)
        .eq('school_id', school.id)
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
        .from('school_teammembers')
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
        .order('role')
        .order('profiles(first_name)');

      if (error) throw error;
      setSchoolUsers(data || []);
    } catch (error) {
      console.error('Error fetching school users:', error);
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
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowTeammembersManagement(true)}
          >
            <Users className="w-4 h-4 mr-2" />
            Teammembers
          </Button>
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
              placeholder="Straatnaam en huisnummer"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Postcode"
                value={editPostalCode}
                onChange={(e) => setEditPostalCode(e.target.value)}
                placeholder="1234 AB"
              />
              <Input
                label="Plaats"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="Amsterdam"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Show teammembers management modal */}
      {showTeammembersManagement && (
        <TeammembersManagement
          school={school}
          onBack={() => setShowTeammembersManagement(false)}
        />
      )}

      {/* Show grade management modal */}
      {showGradeManagement && (
        <GradeManagement
          schoolId={school.id}
          onClose={() => setShowGradeManagement(false)}
        />
      )}

      {/* Show subjects management modal */}
      {showSubjectsManagement && (
        <SubjectsManagement
          schoolId={school.id}
          onClose={() => setShowSubjectsManagement(false)}
        />
      )}

      {/* Show student import modal */}
      {showImportStudents && (
        <StudentImport
          schoolId={school.id}
          onImportComplete={() => {
            fetchStudents();
            setShowImportStudents(false);
          }}
          onClose={() => setShowImportStudents(false)}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('students')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'students'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-2" />
            Studenten ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'groups'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Groepen ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'grades'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Instellingen
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Students Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Studenten ({filteredStudents.length})
            </h2>
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

          {/* Student Search */}
          <Card>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Zoek studenten..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {/* Add Student Form */}
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
                    label="Klas/Niveau"
                    value={newStudentGradeLevel}
                    onChange={(e) => setNewStudentGradeLevel(e.target.value)}
                  />
                </div>
                <Input
                  label="Geboortedatum"
                  type="date"
                  value={newStudentDateOfBirth}
                  onChange={(e) => setNewStudentDateOfBirth(e.target.value)}
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddStudent(false)}
                  >
                    Annuleren
                  </Button>
                  <Button type="submit" loading={loading}>
                    Student toevoegen
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Students List */}
          <div className="space-y-4">
            {filteredStudents.length === 0 ? (
              <Card className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {students.length === 0 ? 'Nog geen studenten' : 'Geen studenten gevonden'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {students.length === 0 
                    ? 'Voeg studenten toe om te beginnen.'
                    : 'Probeer een andere zoekopdracht.'
                  }
                </p>
                {students.length === 0 && (
                  <Button onClick={() => setShowAddStudent(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Eerste student toevoegen
                  </Button>
                )}
              </Card>
            ) : (
              filteredStudents.map((student) => (
                <Card key={student.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-indigo-600" />
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
                            <div className="flex items-center">
                              <GraduationCap className="w-4 h-4 mr-1" />
                              {student.grade_level}
                            </div>
                          )}
                          {student.date_of_birth && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(student.date_of_birth)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStudentClick(student)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Bekijken
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => showDeleteStudentConfirmation(student)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
          {/* Groups Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Groepen ({filteredGroups.length})
            </h2>
            <Button onClick={() => setShowAddGroup(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Groep toevoegen
            </Button>
          </div>

          {/* Group Search */}
          <Card>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Zoek groepen..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {/* Add Group Form */}
          {showAddGroup && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe groep toevoegen</h3>
              <form onSubmit={addGroup} className="space-y-4">
                <Input
                  label="Groepsnaam"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  placeholder="Bijv. 3A, Bovenbouw"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschrijving
                  </label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Beschrijf deze groep..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Klas/Niveau"
                    value={newGroupGradeLevel}
                    onChange={(e) => setNewGroupGradeLevel(e.target.value)}
                    placeholder="Bijv. 3, Bovenbouw"
                  />
                  <Input
                    label="Schooljaar"
                    value={newGroupSchoolYear}
                    onChange={(e) => setNewGroupSchoolYear(e.target.value)}
                    placeholder="2024-2025"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddGroup(false)}
                  >
                    Annuleren
                  </Button>
                  <Button type="submit" loading={loading}>
                    Groep toevoegen
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Groups List */}
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <Card className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {groups.length === 0 ? 'Nog geen groepen' : 'Geen groepen gevonden'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {groups.length === 0 
                    ? 'Voeg groepen toe om studenten te organiseren.'
                    : 'Probeer een andere zoekopdracht.'
                  }
                </p>
                {groups.length === 0 && (
                  <Button onClick={() => setShowAddGroup(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Eerste groep toevoegen
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
                            <div className="flex items-center">
                              <GraduationCap className="w-4 h-4 mr-1" />
                              {group.grade_level}
                            </div>
                          )}
                          {group.school_year && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {group.school_year}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleGroupClick(group)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Bekijken
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => showDeleteGroupConfirmation(group)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowGradeManagement(true)}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Leerjaren/Niveaus</h3>
                  <p className="text-gray-600">Beheer de leerjaren en niveaus voor je school</p>
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowSubjectsManagement(true)}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Vakken</h3>
                  <p className="text-gray-600">Beheer de vakken voor je school</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

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