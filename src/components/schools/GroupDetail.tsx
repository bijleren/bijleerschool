import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { GroupStudentImport } from './GroupStudentImport';
import { ArrowLeft, CreditCard as Edit, Save, X, Plus, Users, GraduationCap, UserPlus, Trash2, Search, Heart, Star, AlertTriangle, Calendar, Clock, Upload } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  school_year: string | null;
  is_active: boolean;
  created_at: string;
}

interface SchoolGrade {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface GroupGrade {
  id: string;
  group_id: string;
  grade_id: string;
  school_grades: SchoolGrade;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
}

interface Teammember {
  id: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface StudentGroup {
  id: string;
  student_id: string;
  students: Student;
}

interface TeammemberGroup {
  id: string;
  teammember_id: string;
  role: string;
  teammembers: Teammember;
}

interface GroupIncident {
  id: string;
  incident_date: string;
  location: string;
  description: string;
  status: string;
  behavior_items: {
    name: string;
    behavior_categories: {
      name: string;
      color: string;
    };
    behavior_severity_levels: {
      name: string;
      level: number;
      color: string;
    };
  };
  profiles: {
    first_name: string;
    last_name: string;
  };
  involved_students: Array<{
    student_id: string;
    student_name: string;
    role_name: string;
    role_color: string;
  }>;
}

interface GroupDetailProps {
  group: Group;
  schoolId: string;
  onBack: () => void;
  onGroupUpdated: (group: Group) => void;
}

export function GroupDetail({ group, schoolId, onBack, onGroupUpdated }: GroupDetailProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Group editing states
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description || '');
  const [editGradeLevel, setEditGradeLevel] = useState(group.grade_level || '');
  const [editSchoolYear, setEditSchoolYear] = useState(group.school_year || '');

  // Students and teammembers
  const [groupStudents, setGroupStudents] = useState<StudentGroup[]>([]);
  const [groupTeammembers, setGroupTeammembers] = useState<TeammemberGroup[]>([]);
  const [groupGrades, setGroupGrades] = useState<GroupGrade[]>([]);
  const [schoolGrades, setSchoolGrades] = useState<SchoolGrade[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [availableTeammembers, setAvailableTeammembers] = useState<Teammember[]>([]);

  // Add member states
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddTeammember, setShowAddTeammember] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [showImportStudents, setShowImportStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [teammemberSearch, setTeammemberSearch] = useState('');

  // Group incidents
  const [groupIncidents, setGroupIncidents] = useState<GroupIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [studentIncidentCounts, setStudentIncidentCounts] = useState<Record<string, number>>({});
  const [hasBehaviorItems, setHasBehaviorItems] = useState(false);

  // Confirmation modal states
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
  
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isGroupFavorite, setIsGroupFavorite] = useState(false);

  useEffect(() => {
    fetchGroupMembers();
    fetchAvailableMembers();
    fetchGroupGrades();
    fetchSchoolGrades();
    checkIfGroupIsFavorite();
    checkBehaviorItemsAvailable();
  }, [group.id, schoolId, user]);

  useEffect(() => {
    if (groupStudents.length > 0) {
      fetchGroupIncidents();
      fetchStudentIncidentCounts();
    }
  }, [groupStudents]);

  const checkIfGroupIsFavorite = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('favoritable_id', group.id)
        .eq('favoritable_type', 'group')
        .maybeSingle();

      if (error) throw error;
      setIsGroupFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const checkBehaviorItemsAvailable = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_items')
        .select('id')
        .eq('school_id', schoolId)
        .limit(1);

      if (error) throw error;
      setHasBehaviorItems((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking behavior items:', error);
      setHasBehaviorItems(false);
    }
  };

  const fetchStudentIncidentCounts = async () => {
    try {
      const studentIds = groupStudents.map(sg => sg.students.id);
      if (studentIds.length === 0) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('behavior_incident_students')
        .select(`
          student_id,
          behavior_incidents!inner(incident_date)
        `)
        .in('student_id', studentIds)
        .gte('behavior_incidents.incident_date', sevenDaysAgo.toISOString());

      if (error) throw error;

      const counts: Record<string, number> = {};
      studentIds.forEach(id => counts[id] = 0);

      data?.forEach((item: any) => {
        counts[item.student_id] = (counts[item.student_id] || 0) + 1;
      });

      setStudentIncidentCounts(counts);
    } catch (error) {
      console.error('Error fetching student incident counts:', error);
    }
  };

  const toggleGroupFavorite = async () => {
    if (!user) return;

    setFavoriteLoading(true);

    try {
      if (isGroupFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('favoritable_id', group.id)
          .eq('favoritable_type', 'group');

        if (error) throw error;
        setIsGroupFavorite(false);
        setMessage('Groep verwijderd uit favorieten');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            favoritable_id: group.id,
            favoritable_type: 'group'
          });

        if (error) throw error;
        setIsGroupFavorite(true);
        setMessage('Groep toegevoegd aan favorieten');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van favorieten.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const fetchGroupGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('group_grades')
        .select(`
          *,
          school_grades (*)
        `)
        .eq('group_id', group.id);

      if (error) throw error;
      setGroupGrades(data || []);
    } catch (error) {
      console.error('Error fetching group grades:', error);
    }
  };

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

  const fetchGroupMembers = async () => {
    try {
      // Fetch students in this group
      const { data: studentData, error: studentError } = await supabase
        .from('student_groups')
        .select(`
          *,
          students (*)
        `)
        .eq('group_id', group.id)
        .eq('is_active', true);

      if (studentError) throw studentError;
      setGroupStudents(studentData || []);

      // Fetch teammembers in this group
      const { data: teammemberData, error: teammemberError } = await supabase
        .from('teammember_groups')
        .select(`
          *,
          teammembers (
            *,
            profiles (*)
          )
        `)
        .eq('group_id', group.id);

      if (teammemberError) throw teammemberError;
      setGroupTeammembers(teammemberData || []);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      // Fetch all students in the school
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true);

      if (studentError) throw studentError;
      setAvailableStudents(studentData || []);

      // Fetch all approved teammembers for this school from user_schools
      const { data: teammemberData, error: teammemberError } = await supabase
        .from('user_schools')
        .select(`
          id,
          user_id,
          role,
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'approved')
        .eq('is_active', true);


      if (teammemberError) throw teammemberError;
      
      // Transform the data to match the expected structure
      const transformedTeammembers = teammemberData?.map(userSchool => ({
        id: userSchool.id, // Use user_school id as teammember id
        user_id: userSchool.user_id,
        profiles: userSchool.profiles
      })) || [];
      
      setAvailableTeammembers(transformedTeammembers);
    } catch (error) {
      console.error('Error fetching available members:', error);
    }
  };

  const updateGroup = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('groups')
        .update({
          name: editName,
          description: editDescription || null,
          grade_level: editGradeLevel || null,
          school_year: editSchoolYear || null,
        })
        .eq('id', group.id)
        .select()
        .single();

      if (error) throw error;

      onGroupUpdated(data);
      setIsEditing(false);
      setMessage('Groep succesvol bijgewerkt!');
    } catch (error) {
      console.error('Error updating group:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van de groep.');
    } finally {
      setLoading(false);
    }
  };

  const addStudentToGroup = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('student_groups')
        .insert({
          student_id: studentId,
          group_id: group.id,
        });

      if (error) throw error;

      fetchGroupMembers();
      setMessage('Student succesvol toegevoegd aan groep!');
      // Keep the form open but clear search to refresh the list
      setStudentSearch('');
    } catch (error) {
      console.error('Error adding student to group:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen van de student.');
    }
  };

  const addTeammemberToGroup = async (teammemberId: string) => {
    // Find the user_school record to get the user_id
    const userSchool = availableTeammembers.find(tm => tm.id === teammemberId);
    if (!userSchool) {
      setMessage('Teammember niet gevonden.');
      return;
    }

    try {
      // Check if this user is already in the group
      const isAlreadyInGroup = groupTeammembers.some(gt => 
        gt.teammembers?.user_id === userSchool.user_id
      );
      
      if (isAlreadyInGroup) {
        setMessage('Dit teammember is al toegevoegd aan de groep.');
        return;
      }

      // First ensure the user has a teammember profile
      let teammemberProfileId;
      
      // Check if teammember profile exists
      const { data: existingTeammembers, error: checkError } = await supabase
        .from('teammembers')
        .select('id')
        .eq('user_id', userSchool.user_id)
        .eq('is_active', true)
        .limit(1);

      if (checkError) {
        console.error('Error checking teammember profile:', checkError);
        setMessage('Er is een fout opgetreden bij het controleren van het teammember profiel.');
        return;
      }

      if (existingTeammembers && existingTeammembers.length > 0) {
        teammemberProfileId = existingTeammembers[0].id;
      } else {
        // Create teammember profile
        const { data: newTeammember, error: createError } = await supabase
          .from('teammembers')
          .insert({
            user_id: userSchool.user_id,
            is_active: true
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating teammember profile:', createError);
          setMessage('Er is een fout opgetreden bij het aanmaken van het teammember profiel.');
          return;
        }

        teammemberProfileId = newTeammember.id;
      }

      // Now add to the group using the teammember profile ID
      const { error } = await supabase
        .from('teammember_groups')
        .insert({
          teammember_id: teammemberProfileId,
          group_id: group.id,
          role: 'teacher',
        });

      if (error) throw error;

      fetchGroupMembers();
      setMessage('Teammember succesvol toegevoegd aan groep!');
      setTeammemberSearch('');
    } catch (error) {
      console.error('Error adding teammember to group:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen van het teammember.');
    }
  };

  const removeStudentFromGroup = async (studentGroupId: string) => {
    try {
      const { error } = await supabase
        .from('student_groups')
        .update({ is_active: false })
        .eq('id', studentGroupId);

      if (error) throw error;

      fetchGroupMembers();
      setMessage('Student succesvol verwijderd uit groep!');
    } catch (error) {
      console.error('Error removing student from group:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de student.');
    }
  };

  const removeTeammemberFromGroup = async (teammemberGroupId: string) => {
    try {
      const { error } = await supabase
        .from('teammember_groups')
        .delete()
        .eq('id', teammemberGroupId);

      if (error) throw error;

      fetchGroupMembers();
      setMessage('Teammember succesvol verwijderd uit groep!');
    } catch (error) {
      console.error('Error removing teammember from group:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van het teammember.');
    }
  };

  const addGradeToGroup = async (gradeId: string) => {
    try {
      const { error } = await supabase
        .from('group_grades')
        .insert({
          group_id: group.id,
          grade_id: gradeId,
        });

      if (error) throw error;

      fetchGroupGrades();
      setMessage('Leerjaar succesvol toegevoegd aan groep!');
      setShowAddGrade(false);
    } catch (error) {
      console.error('Error adding grade to group:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen van het leerjaar.');
    }
  };

  const removeGradeFromGroup = async (groupGradeId: string) => {
    try {
      const { error } = await supabase
        .from('group_grades')
        .delete()
        .eq('id', groupGradeId);

      if (error) throw error;

      fetchGroupGrades();
      setMessage('Leerjaar succesvol verwijderd uit groep!');
    } catch (error) {
      console.error('Error removing grade from group:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van het leerjaar.');
    }
  };

  const fetchGroupIncidents = async () => {
    try {
      setIncidentsLoading(true);

      // Get all student IDs in this group
      const studentIds = groupStudents.map(sg => sg.students.id);

      if (studentIds.length === 0) {
        setGroupIncidents([]);
        setIncidentsLoading(false);
        return;
      }

      // Fetch all incidents involving any student from this group
      const { data: incidentStudents, error } = await supabase
        .from('behavior_incident_students')
        .select(`
          incident_id,
          student_id,
          students (
            first_name,
            last_name
          ),
          student_roles (
            name,
            color
          ),
          behavior_incidents (
            id,
            incident_date,
            location,
            description,
            status,
            behavior_items (
              name,
              behavior_categories (
                name,
                color
              ),
              behavior_severity_levels (
                name,
                level,
                color
              )
            ),
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by incident and collect all involved students
      const incidentMap = new Map<string, GroupIncident>();

      incidentStudents?.forEach((is: any) => {
        const incidentId = is.behavior_incidents.id;

        if (!incidentMap.has(incidentId)) {
          incidentMap.set(incidentId, {
            id: is.behavior_incidents.id,
            incident_date: is.behavior_incidents.incident_date,
            location: is.behavior_incidents.location,
            description: is.behavior_incidents.description,
            status: is.behavior_incidents.status,
            behavior_items: is.behavior_incidents.behavior_items,
            profiles: is.behavior_incidents.profiles,
            involved_students: []
          });
        }

        const incident = incidentMap.get(incidentId)!;
        incident.involved_students.push({
          student_id: is.student_id,
          student_name: `${is.students.first_name} ${is.students.last_name}`,
          role_name: is.student_roles.name,
          role_color: is.student_roles.color
        });
      });

      const incidents = Array.from(incidentMap.values())
        .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime());

      setGroupIncidents(incidents);
    } catch (error) {
      console.error('Error fetching group incidents:', error);
      setGroupIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Melding';
      case 'open': return 'Open';
      case 'in_progress': return 'Onderzoek';
      case 'resolved': return 'Afgerond';
      case 'closed': return 'Gesloten';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleIncidentClick = (incidentId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-behavior', { detail: { incidentId } }));
  };

  const handleStudentClick = (studentId: string) => {
    window.dispatchEvent(new CustomEvent('navigateToStudentDetail', { detail: { studentId, schoolId } }));
  };

  const handleStudentIncidentsClick = (studentId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-behavior', {
      detail: { schoolId, studentId }
    }));
  };

  const showRemoveStudentConfirmation = (studentGroup: StudentGroup) => {
    setConfirmModal({
      isOpen: true,
      title: 'Student verwijderen',
      message: `Weet je zeker dat je ${studentGroup.students.first_name} ${studentGroup.students.last_name} uit de groep wilt verwijderen?`,
      onConfirm: () => {
        removeStudentFromGroup(studentGroup.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const showRemoveTeammemberConfirmation = (teammemberGroup: TeammemberGroup) => {
    setConfirmModal({
      isOpen: true,
      title: 'Teammember verwijderen',
      message: `Weet je zeker dat je ${teammemberGroup.teammembers.profiles.first_name} ${teammemberGroup.teammembers.profiles.last_name} uit de groep wilt verwijderen?`,
      onConfirm: () => {
        removeTeammemberFromGroup(teammemberGroup.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Filter available members that are not already in the group
  const filteredAvailableStudents = availableStudents
    .filter(student => !groupStudents.some(gs => gs.students.id === student.id))
    .filter(student => 
      studentSearch === '' || 
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())
    );

  const filteredAvailableTeammembers = availableTeammembers
    .filter(userSchool => {
      // Check if this user is already in the group
      const isAlreadyInGroup = groupTeammembers.some(gt => 
        gt.teammembers?.user_id === userSchool.user_id
      );
      return !isAlreadyInGroup;
    })
    .filter(userSchool => 
      teammemberSearch === '' || 
      `${userSchool.profiles.first_name} ${userSchool.profiles.last_name}`.toLowerCase().includes(teammemberSearch.toLowerCase())
    )
    .filter((userSchool, index, self) => 
      // Remove duplicates based on user_id
      index === self.findIndex(t => t.user_id === userSchool.user_id)
    );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar groepen
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-gray-600">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={toggleGroupFavorite}
            loading={favoriteLoading}
            className={isGroupFavorite 
              ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' 
              : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
            }
          >
            <Star className={`w-4 h-4 mr-2 ${isGroupFavorite ? 'fill-current' : ''}`} />
            {isGroupFavorite ? 'Favoriet' : 'Favoriet maken'}
          </Button>
          {!isEditing ? (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Bewerken
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Annuleren
              </Button>
              <Button onClick={updateGroup} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          )}
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

      {/* Group Info */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Groep Informatie</h3>
        
        {isEditing ? (
          <div className="space-y-4">
            <Input
              label="Groepsnaam"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              helperText="Vrije tekst voor klas/niveau (bijv. 3A, Bovenbouw)"
            />
            <Input
              label="Beschrijving"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Klas/Niveau"
                value={editGradeLevel}
                onChange={(e) => setEditGradeLevel(e.target.value)}
              />
              <Input
                label="Schooljaar"
                value={editSchoolYear}
                onChange={(e) => setEditSchoolYear(e.target.value)}
                placeholder="2024-2025"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groepsnaam</label>
              <p className="text-gray-900">{group.name}</p>
            </div>
            {group.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <p className="text-gray-900">{group.description}</p>
              </div>
            )}
            {group.grade_level && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Klas/Niveau</label>
                <p className="text-gray-900">{group.grade_level}</p>
              </div>
            )}
            {group.school_year && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schooljaar</label>
                <p className="text-gray-900">{group.school_year}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Leerjaren Section */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Leerjaren ({groupGrades.length})
          </h3>
          <Button variant="secondary" onClick={() => setShowAddGrade(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Leerjaar toevoegen
          </Button>
        </div>

        {showAddGrade && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Beschikbare leerjaren</h4>
              <Button variant="secondary" onClick={() => setShowAddGrade(false)}>
                Annuleren
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {schoolGrades
                .filter(grade => !groupGrades.some(gg => gg.school_grades.id === grade.id))
                .map((grade) => (
                <div key={grade.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{grade.name}</span>
                    {grade.description && (
                      <p className="text-sm text-gray-600">{grade.description}</p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => addGradeToGroup(grade.id)}>
                    Toevoegen
                  </Button>
                </div>
              ))}
              {schoolGrades.filter(grade => !groupGrades.some(gg => gg.school_grades.id === grade.id)).length === 0 && (
                <p className="text-gray-500 text-center py-4">Alle leerjaren zijn al toegevoegd</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {groupGrades.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Geen leerjaren gekoppeld aan deze groep</p>
          ) : (
            groupGrades.map((groupGrade) => (
              <div key={groupGrade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{groupGrade.school_grades.name}</span>
                  {groupGrade.school_grades.description && (
                    <p className="text-sm text-gray-600">{groupGrade.school_grades.description}</p>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmModal({
                    isOpen: true,
                    title: 'Leerjaar verwijderen',
                    message: `Weet je zeker dat je "${groupGrade.school_grades.name}" uit de groep wilt verwijderen?`,
                    onConfirm: () => {
                      removeGradeFromGroup(groupGrade.id);
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    },
                  })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Students Section */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Leerlingen ({groupStudents.length})
          </h3>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImportStudents(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importeren
            </Button>
            <Button variant="secondary" onClick={() => setShowAddStudent(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Student toevoegen
            </Button>
          </div>
        </div>

        {showAddStudent && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Zoek student..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={() => setShowAddStudent(false)}>
                Annuleren
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredAvailableStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{student.first_name} {student.last_name}</span>
                    {student.student_number && (
                      <span className="text-sm text-gray-500 ml-2">#{student.student_number}</span>
                    )}
                    {student.grade_level && (
                      <span className="text-sm text-gray-500 ml-2">Klas: {student.grade_level}</span>
                    )}
                  </div>
                  <Button size="sm" onClick={() => addStudentToGroup(student.id)}>
                    Toevoegen
                  </Button>
                </div>
              ))}
              {filteredAvailableStudents.length === 0 && (
                <p className="text-gray-500 text-center py-4">Geen beschikbare studenten gevonden</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {groupStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Geen leerlingen in deze groep</p>
          ) : (
            groupStudents.map((studentGroup) => (
              <div key={studentGroup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleStudentClick(studentGroup.students.id)}
                >
                  <span className="font-medium text-blue-600 hover:text-blue-700">
                    {studentGroup.students.first_name} {studentGroup.students.last_name}
                  </span>
                  {studentGroup.students.student_number && (
                    <span className="text-sm text-gray-500 ml-2">#{studentGroup.students.student_number}</span>
                  )}
                  {studentGroup.students.grade_level && (
                    <span className="text-sm text-gray-500 ml-2">Klas: {studentGroup.students.grade_level}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasBehaviorItems && studentIncidentCounts[studentGroup.students.id] > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStudentIncidentsClick(studentGroup.students.id);
                      }}
                      className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
                      title={`${studentIncidentCounts[studentGroup.students.id]} incidenten laatste 7 dagen`}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {studentIncidentCounts[studentGroup.students.id]}
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      showRemoveStudentConfirmation(studentGroup);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Teammembers Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Teammembers ({groupTeammembers.length})
          </h3>
          <Button variant="secondary" onClick={() => setShowAddTeammember(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Teammember toevoegen
          </Button>
        </div>

        {showAddTeammember && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Zoek teammember..."
                  value={teammemberSearch}
                  onChange={(e) => setTeammemberSearch(e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={() => setShowAddTeammember(false)}>
                Annuleren
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredAvailableTeammembers.map((userSchool) => (
                <div key={userSchool.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">
                      {userSchool.profiles.first_name} {userSchool.profiles.last_name}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">{userSchool.profiles.email}</span>
                  </div>
                  <Button size="sm" onClick={() => addTeammemberToGroup(userSchool.id)}>
                    Toevoegen
                  </Button>
                </div>
              ))}
              {filteredAvailableTeammembers.length === 0 && (
                <p className="text-gray-500 text-center py-4">Geen beschikbare teammembers gevonden</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {groupTeammembers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Geen teammembers in deze groep</p>
          ) : (
            groupTeammembers.map((teammemberGroup) => (
              <div key={teammemberGroup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">
                    {teammemberGroup.teammembers.profiles.first_name} {teammemberGroup.teammembers.profiles.last_name}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">{teammemberGroup.teammembers.profiles.email}</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    teammemberGroup.role === 'lead_teacher' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {teammemberGroup.role === 'lead_teacher' ? 'Hoofddocent' : 'Docent'}
                  </span>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => showRemoveTeammemberConfirmation(teammemberGroup)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Group Incidents Section */}
      <Card className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Gedragsincidenten ({groupIncidents.length})
          </h3>
        </div>

        {incidentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : groupIncidents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Geen incidenten voor deze groep</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupIncidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleIncidentClick(incident.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: incident.behavior_items.behavior_categories.color }}
                    >
                      {incident.behavior_items.behavior_categories.name}
                    </span>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: incident.behavior_items.behavior_severity_levels.color }}
                    >
                      Niveau {incident.behavior_items.behavior_severity_levels.level}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                    {getStatusText(incident.status)}
                  </span>
                </div>

                <h4 className="font-medium text-gray-900 mb-2">
                  {incident.behavior_items.name}
                </h4>

                <p className="text-gray-700 text-sm mb-3">{incident.description}</p>

                {/* Involved Students */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-1">Betrokken leerlingen:</p>
                  <div className="flex flex-wrap gap-2">
                    {incident.involved_students.map((student, idx) => (
                      <span
                        key={`${student.student_id}-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStudentClick(student.student_id);
                        }}
                        className="px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: student.role_color + '20',
                          color: student.role_color
                        }}
                      >
                        {student.student_name} ({student.role_name})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(incident.incident_date).toLocaleDateString('nl-NL')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(incident.incident_date).toLocaleTimeString('nl-NL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {incident.location && (
                    <div className="flex items-center">
                      <span>{incident.location}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    Gemeld door: {incident.profiles.first_name} {incident.profiles.last_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Student Import Modal */}
      {showImportStudents && (
        <GroupStudentImport
          schoolId={schoolId}
          groupId={group.id}
          onImportComplete={() => {
            fetchGroupMembers();
            setMessage('Studenten succesvol geïmporteerd!');
          }}
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
        confirmText="Verwijderen"
        cancelText="Annuleren"
        variant="danger"
      />
    </div>
  );
}