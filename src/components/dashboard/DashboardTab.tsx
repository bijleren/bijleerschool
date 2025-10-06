import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Heart, 
  Users, 
  GraduationCap, 
  Star,
  TrendingUp,
  Calendar,
  MapPin,
  School,
  AlertTriangle
} from 'lucide-react';

interface FavoriteStudent {
  id: string;
  favoritable_id: string;
  students: {
    id: string;
    first_name: string;
    last_name: string;
    student_number: string | null;
    grade_level: string | null;
    schools: {
      name: string;
    };
  };
}

interface FavoriteGroup {
  id: string;
  favoritable_id: string;
  groups: {
    id: string;
    name: string;
    description: string | null;
    grade_level: string | null;
    school_year: string | null;
    school_id: string;
    schools: {
      name: string;
    };
    _count?: {
      student_groups: number;
    };
  };
}

interface DashboardStats {
  totalSchools: number;
  totalStudents: number;
  totalGroups: number;
  favoriteStudents: number;
  favoriteGroups: number;
  reportsToday: number;
  openReports: number;
  notifications: number;
}

interface DashboardTabProps {
  onNavigateToStudent: (schoolId: string, studentId: string) => void;
  onNavigateToGroup: (schoolId: string, groupId: string) => void;
  onNavigateToSchools: () => void;
  onNavigateToBehaviorWithStudent: (schoolId: string, studentId: string) => void;
  onNavigateToBehavior: () => void;
  userSchools: { id: string; name: string }[];
  focusSchool: { id: string; name: string } | null;
  onFocusSchoolChange: (school: { id: string; name: string }) => void;
}

export function DashboardTab({ onNavigateToStudent, onNavigateToGroup, onNavigateToSchools, onNavigateToBehaviorWithStudent, onNavigateToBehavior, userSchools, focusSchool, onFocusSchoolChange }: DashboardTabProps) {
  const { user } = useAuth();
  const [favoriteStudents, setFavoriteStudents] = useState<FavoriteStudent[]>([]);
  const [favoriteGroups, setFavoriteGroups] = useState<FavoriteGroup[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSchools: 0,
    totalStudents: 0,
    totalGroups: 0,
    favoriteStudents: 0,
    favoriteGroups: 0,
    reportsToday: 0,
    openReports: 0,
    notifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [studentIncidentCounts, setStudentIncidentCounts] = useState<Record<string, { open: number; week: number }>>({});
  const [groupIncidentCounts, setGroupIncidentCounts] = useState<Record<string, { open: number; week: number }>>({});
  const [schoolOverviewPeriod, setSchoolOverviewPeriod] = useState<number>(7);
  const [schoolStats, setSchoolStats] = useState({ today: 0, open: 0, students: 0 });

  useEffect(() => {
    if (user && focusSchool) {
      setSelectedSchoolId(focusSchool.id);
    }
  }, [user, focusSchool]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchDashboardData();
    }
  }, [selectedSchoolId]);
  const fetchDashboardData = async () => {
    if (!user || !selectedSchoolId) return;

    setLoading(true);
    try {
      // First fetch favorite IDs
      const [favStudentIds, favGroupIds] = await Promise.all([
        supabase
          .from('user_favorites')
          .select('id, favoritable_id')
          .eq('user_id', user.id)
          .eq('favoritable_type', 'student'),
        supabase
          .from('user_favorites')
          .select('id, favoritable_id')
          .eq('user_id', user.id)
          .eq('favoritable_type', 'group')
      ]);

      if (favStudentIds.error) throw favStudentIds.error;
      if (favGroupIds.error) throw favGroupIds.error;

      // Fetch actual student and group data
      let favoriteStudentsData: FavoriteStudent[] = [];
      let favoriteGroupsData: FavoriteGroup[] = [];

      if (favStudentIds.data && favStudentIds.data.length > 0) {
        const studentIds = favStudentIds.data.map(fav => fav.favoritable_id);
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            student_number,
            grade_level,
            schools (name)
          `)
          .in('id', studentIds)
          .eq('school_id', selectedSchoolId)
          .eq('is_active', true);

        if (studentsError) throw studentsError;

        // Map back to FavoriteStudent structure
        favoriteStudentsData = favStudentIds.data
          .map(fav => {
            const studentData = studentsData?.find(s => s.id === fav.favoritable_id);
            if (!studentData) return null;
            return {
              id: fav.id,
              favoritable_id: fav.favoritable_id,
              students: studentData
            };
          })
          .filter(fav => fav !== null) as FavoriteStudent[];
      }

      if (favGroupIds.data && favGroupIds.data.length > 0) {
        const groupIds = favGroupIds.data.map(fav => fav.favoritable_id);
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select(`
            id,
            name,
            description,
            grade_level,
            school_year,
            school_id,
            schools (name)
          `)
          .in('id', groupIds)
          .eq('school_id', selectedSchoolId)
          .eq('is_active', true);

        if (groupsError) throw groupsError;

        // Map back to FavoriteGroup structure
        favoriteGroupsData = favGroupIds.data
          .map(fav => {
            const groupData = groupsData?.find(g => g.id === fav.favoritable_id);
            if (!groupData) return null;
            return {
              id: fav.id,
              favoritable_id: fav.favoritable_id,
              groups: groupData
            };
          })
          .filter(fav => fav !== null) as FavoriteGroup[];
      }

      setFavoriteStudents(favoriteStudentsData);
      setFavoriteGroups(favoriteGroupsData);

      // Fetch basic stats
      const statsResult = await fetchBasicStats();
      setStats({
        ...statsResult,
        favoriteStudents: favoriteStudentsData.length,
        favoriteGroups: favoriteGroupsData.length
      });

      // Fetch incident counts for favorites
      await fetchStudentIncidentCounts(favoriteStudentsData.map(f => f.students.id));
      await fetchGroupIncidentCounts(favoriteGroupsData.map(f => f.groups.id));
      await fetchSchoolOverview();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicStats = async () => {
    if (!user || !selectedSchoolId) return {
      totalSchools: 0,
      totalStudents: 0,
      totalGroups: 0,
      favoriteStudents: 0,
      favoriteGroups: 0,
      reportsToday: 0,
      openReports: 0,
      notifications: 0,
    };

    try {
      // Get today's date range for behavior stats
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch all stats in parallel
      const [
        { count: studentCount },
        { count: groupCount }
      ] = await Promise.all([
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', selectedSchoolId)
          .eq('is_active', true),
        supabase
          .from('groups')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', selectedSchoolId)
          .eq('is_active', true)
      ]);

      // Fetch teacher-connected incidents (via notifications table)
      // Get all incidents where teacher is directly notified OR their groups are notified
      const { data: teacherNotifications } = await supabase
        .from('behavior_incident_notifications')
        .select('incident_id')
        .eq('teacher_id', user.id);

      const { data: groupNotifications } = await supabase
        .from('behavior_incident_notifications')
        .select('incident_id, group_id');

      // Get unique incident IDs connected to this teacher
      const directIncidentIds = new Set(teacherNotifications?.map(n => n.incident_id) || []);
      const groupIncidentIds = new Set(groupNotifications?.map(n => n.incident_id) || []);
      const allIncidentIds = new Set([...directIncidentIds, ...groupIncidentIds]);

      // Count incidents for today
      const { data: todayIncidents } = await supabase
        .from('behavior_incidents')
        .select('id')
        .eq('school_id', selectedSchoolId)
        .in('id', Array.from(allIncidentIds))
        .gte('incident_date', startOfDay.toISOString())
        .lt('incident_date', endOfDay.toISOString());

      // Count open incidents (status 'pending' or 'in_progress')
      const { data: openIncidents } = await supabase
        .from('behavior_incidents')
        .select('id')
        .eq('school_id', selectedSchoolId)
        .in('id', Array.from(allIncidentIds))
        .in('status', ['pending', 'in_progress']);

      // Count incidents with follow-up actions added in the last day
      const { data: recentFollowupActions } = await supabase
        .from('behavior_incident_followup_acties')
        .select('incident_id')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      // Get unique incident IDs that have follow-up actions added today
      const incidentsWithFollowups = new Set(recentFollowupActions?.map(a => a.incident_id) || []);

      // Filter to only include incidents from this school
      const { data: schoolIncidentsWithFollowups } = await supabase
        .from('behavior_incidents')
        .select('id')
        .eq('school_id', selectedSchoolId)
        .in('id', Array.from(incidentsWithFollowups));

      return {
        totalSchools: 1,
        totalStudents: studentCount || 0,
        totalGroups: groupCount || 0,
        favoriteStudents: 0,
        favoriteGroups: 0,
        reportsToday: todayIncidents?.length || 0,
        openReports: openIncidents?.length || 0,
        notifications: schoolIncidentsWithFollowups?.length || 0,
      };
    } catch (error) {
      console.error('Error fetching basic stats:', error);
      return {
        totalSchools: 0,
        totalStudents: 0,
        totalGroups: 0,
        favoriteStudents: 0,
        favoriteGroups: 0,
        reportsToday: 0,
        openReports: 0,
        notifications: 0,
      };
    }
  };

  const fetchStudentIncidentCounts = async (studentIds: string[]) => {
    if (studentIds.length === 0) return;

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const counts: Record<string, { open: number; week: number }> = {};

      for (const studentId of studentIds) {
        // Count open incidents
        const { data: openIncidents } = await supabase
          .from('behavior_incident_students')
          .select(`
            behavior_incidents!inner(id, status)
          `)
          .eq('student_id', studentId)
          .in('behavior_incidents.status', ['pending', 'in_progress']);

        // Count incidents from last week
        const { data: weekIncidents } = await supabase
          .from('behavior_incident_students')
          .select(`
            behavior_incidents!inner(id, incident_date)
          `)
          .eq('student_id', studentId)
          .gte('behavior_incidents.incident_date', weekAgo.toISOString());

        counts[studentId] = {
          open: openIncidents?.length || 0,
          week: weekIncidents?.length || 0
        };
      }

      setStudentIncidentCounts(counts);
    } catch (error) {
      console.error('Error fetching student incident counts:', error);
    }
  };

  const fetchGroupIncidentCounts = async (groupIds: string[]) => {
    if (groupIds.length === 0) return;

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const counts: Record<string, { open: number; week: number }> = {};

      for (const groupId of groupIds) {
        // Get all students in this group
        const { data: groupStudents } = await supabase
          .from('student_groups')
          .select('student_id')
          .eq('group_id', groupId)
          .eq('is_active', true);

        if (!groupStudents || groupStudents.length === 0) {
          counts[groupId] = { open: 0, week: 0 };
          continue;
        }

        const studentIds = groupStudents.map(gs => gs.student_id);

        // Count open incidents for students in this group
        const { data: openIncidents } = await supabase
          .from('behavior_incident_students')
          .select(`
            behavior_incidents!inner(id, status)
          `)
          .in('student_id', studentIds)
          .in('behavior_incidents.status', ['pending', 'in_progress']);

        // Count incidents from last week
        const { data: weekIncidents } = await supabase
          .from('behavior_incident_students')
          .select(`
            behavior_incidents!inner(id, incident_date)
          `)
          .in('student_id', studentIds)
          .gte('behavior_incidents.incident_date', weekAgo.toISOString());

        counts[groupId] = {
          open: openIncidents?.length || 0,
          week: weekIncidents?.length || 0
        };
      }

      setGroupIncidentCounts(counts);
    } catch (error) {
      console.error('Error fetching group incident counts:', error);
    }
  };

  const fetchSchoolOverview = async () => {
    if (!selectedSchoolId) return;

    try {
      const periodAgo = new Date();
      periodAgo.setDate(periodAgo.getDate() - schoolOverviewPeriod);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Count today's incidents
      const { data: todayIncidents } = await supabase
        .from('behavior_incidents')
        .select('id')
        .eq('school_id', selectedSchoolId)
        .gte('incident_date', startOfDay.toISOString());

      // Count open incidents
      const { data: openIncidents } = await supabase
        .from('behavior_incidents')
        .select('id')
        .eq('school_id', selectedSchoolId)
        .in('status', ['pending', 'in_progress']);

      // Count unique students with incidents in the period
      const { data: incidentStudents } = await supabase
        .from('behavior_incident_students')
        .select(`
          student_id,
          behavior_incidents!inner(incident_date, school_id)
        `)
        .eq('behavior_incidents.school_id', selectedSchoolId)
        .gte('behavior_incidents.incident_date', periodAgo.toISOString());

      const uniqueStudents = new Set(incidentStudents?.map(is => is.student_id) || []);

      setSchoolStats({
        today: todayIncidents?.length || 0,
        open: openIncidents?.length || 0,
        students: uniqueStudents.size
      });
    } catch (error) {
      console.error('Error fetching school overview:', error);
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      fetchSchoolOverview();
    }
  }, [schoolOverviewPeriod, selectedSchoolId]);

  const removeFavorite = async (favoriteId: string, type: 'student' | 'group') => {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      // Update local state
      if (type === 'student') {
        setFavoriteStudents(prev => prev.filter(fav => fav.id !== favoriteId));
        setStats(prev => ({ ...prev, favoriteStudents: prev.favoriteStudents - 1 }));
      } else {
        setFavoriteGroups(prev => prev.filter(fav => fav.id !== favoriteId));
        setStats(prev => ({ ...prev, favoriteGroups: prev.favoriteGroups - 1 }));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleStudentClick = (student: FavoriteStudent['students']) => {
    onNavigateToStudent(selectedSchoolId, student.id);
  };

  const handleGroupClick = (group: FavoriteGroup['groups']) => {
    onNavigateToGroup(group.school_id, group.id);
  };

  const handleQuickIncidentReport = (student: FavoriteStudent['students']) => {
    onNavigateToBehaviorWithStudent(selectedSchoolId, student.id);
  };

  const selectedSchool = userSchools.find(school => school.id === selectedSchoolId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!selectedSchoolId || !selectedSchool) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Geen school geselecteerd</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overzicht van {selectedSchool.name}</p>
          </div>
          {userSchools.length > 1 && (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {userSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Behavior Statistics Row */}
        <div className="lg:col-span-2 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            Gedragsincidenten
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigateToBehavior()}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Meldingen vandaag</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.reportsToday}</p>
                </div>
              </div>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigateToBehavior()}>
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Open meldingen</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.openReports}</p>
                </div>
              </div>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigateToBehavior()}>
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Follow-up acties toegevoegd</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.notifications}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
        {/* Favorite Students */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Je Leerlingen
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateToSchools()}
            >
              Alle leerlingen
            </Button>
          </div>

          <div className="space-y-4">
            {favoriteStudents.length === 0 ? (
              <Card className="text-center py-8">
                <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen favoriete leerlingen</h3>
                <p className="text-gray-600">
                  Markeer leerlingen als favoriet om ze hier te zien verschijnen.
                </p>
              </Card>
            ) : (
              favoriteStudents.map((favorite) => (
                <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-start space-x-3 flex-1 cursor-pointer"
                      onClick={() => handleStudentClick(favorite.students)}
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                          {favorite.students.first_name} {favorite.students.last_name}
                        </div>
                        {favorite.students.student_number && (
                          <p className="text-sm text-gray-600">#{favorite.students.student_number}</p>
                        )}
                        {favorite.students.grade_level && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            Klas: {favorite.students.grade_level}
                          </div>
                        )}
                        {studentIncidentCounts[favorite.students.id] && (
                          <div className="flex items-center space-x-3 text-xs text-gray-500 mt-2">
                            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                              {studentIncidentCounts[favorite.students.id].open} open
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {studentIncidentCounts[favorite.students.id].week} deze week
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickIncidentReport(favorite.students);
                        }}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        title="Incident melden"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="ml-1">Incident</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Favorite Groups */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Je Klassen
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateToSchools()}
            >
              Alle klassen
            </Button>
          </div>

          <div className="space-y-4">
            {favoriteGroups.length === 0 ? (
              <Card className="text-center py-8">
                <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen favoriete klassen</h3>
                <p className="text-gray-600">
                  Markeer klassen als favoriet om ze hier te zien verschijnen.
                </p>
              </Card>
            ) : (
              favoriteGroups.map((favorite) => (
                <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-start space-x-3 flex-1 cursor-pointer"
                      onClick={() => handleGroupClick(favorite.groups)}
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                          {favorite.groups.name}
                        </div>
                        {favorite.groups.description && (
                          <p className="text-sm text-gray-600">{favorite.groups.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          {favorite.groups.grade_level && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {favorite.groups.grade_level}
                            </div>
                          )}
                        </div>
                        {groupIncidentCounts[favorite.groups.id] && (
                          <div className="flex items-center space-x-3 text-xs text-gray-500 mt-2">
                            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                              {groupIncidentCounts[favorite.groups.id].open} open
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {groupIncidentCounts[favorite.groups.id].week} deze week
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupClick(favorite.groups);
                      }}
                      className="flex-shrink-0"
                    >
                      Bekijk klas
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* School Overview Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <School className="w-5 h-5 text-blue-600 mr-2" />
            School overzicht
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Periode:</span>
            <select
              value={schoolOverviewPeriod}
              onChange={(e) => setSchoolOverviewPeriod(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={7}>Laatste 7 dagen</option>
              <option value={14}>Laatste 14 dagen</option>
              <option value={30}>Laatste 30 dagen</option>
              <option value={90}>Laatste 90 dagen</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Meldingen vandaag</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.today}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open meldingen</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.open}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Betrokken leerlingen</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.students}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}