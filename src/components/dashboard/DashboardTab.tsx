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

  useEffect(() => {
    if (user && focusSchool) {
      fetchDashboardData();
    }
  }, [user, focusSchool]);

  const fetchDashboardData = async () => {
    if (!user || !focusSchool) return;

    try {
      // Fetch favorite student IDs for the selected school
      const { data: favStudentIds, error: studentsError } = await supabase
        .from('user_favorites')
        .select('id, favoritable_id')
        .eq('user_id', user.id)
        .eq('favoritable_type', 'student');

      if (studentsError) throw studentsError;

      // Fetch favorite group IDs for the selected school
      const { data: favGroupIds, error: groupsError } = await supabase
        .from('user_favorites')
        .select('id, favoritable_id')
        .eq('user_id', user.id)
        .eq('favoritable_type', 'group');

      if (groupsError) throw groupsError;

      // Fetch actual student data for favorites
      let favoriteStudentsData: FavoriteStudent[] = [];
      if (favStudentIds && favStudentIds.length > 0) {
        const studentIds = favStudentIds.map(fav => fav.favoritable_id);
        const { data: studentsData, error: studentsDataError } = await supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            student_number,
            grade_level,
            school_id,
            schools (name)
          `)
          .in('id', studentIds)
          .eq('school_id', focusSchool.id);

        if (studentsDataError) throw studentsDataError;

        // Map back to FavoriteStudent structure
        favoriteStudentsData = favStudentIds.map(fav => {
          const studentData = studentsData?.find(s => s.id === fav.favoritable_id);
          return {
            id: fav.id,
            favoritable_id: fav.favoritable_id,
            students: studentData!
          };
        }).filter(fav => fav.students); // Filter out any missing students
      }

      // Fetch actual group data for favorites
      let favoriteGroupsData: FavoriteGroup[] = [];
      if (favGroupIds && favGroupIds.length > 0) {
        const groupIds = favGroupIds.map(fav => fav.favoritable_id);
        const { data: groupsData, error: groupsDataError } = await supabase
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
          .eq('school_id', focusSchool.id);

        if (groupsDataError) throw groupsDataError;

        // Get student counts for each favorite group
        const groupsWithCounts = await Promise.all(
          groupIds.map(async (groupId) => {
            const { count } = await supabase
              .from('student_groups')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', groupId)
              .eq('is_active', true);

            const groupData = groupsData?.find(g => g.id === groupId);
            return {
              groupId,
              groupData,
              studentCount: count || 0
            };
          })
        );

        // Map back to FavoriteGroup structure
        favoriteGroupsData = favGroupIds.map(fav => {
          const groupWithCount = groupsWithCounts.find(g => g.groupId === fav.favoritable_id);
          if (!groupWithCount?.groupData) return null;

          return {
            id: fav.id,
            favoritable_id: fav.favoritable_id,
            groups: {
              ...groupWithCount.groupData,
              _count: { student_groups: groupWithCount.studentCount }
            }
          };
        }).filter(fav => fav !== null) as FavoriteGroup[];
      }

      setFavoriteStudents(favoriteStudentsData);
      setFavoriteGroups(favoriteGroupsData);

      // Fetch dashboard stats
      await fetchStats();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user || !focusSchool) return;

    try {
      // Count students in selected school
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', focusSchool.id)
        .eq('is_active', true);

      // Count groups in selected school
      const { count: groupCount } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', focusSchool.id)
        .eq('is_active', true);

      // Count user's favorites for selected school
      const { data: favStudents } = await supabase
        .from('user_favorites')
        .select('favoritable_id')
        .eq('user_id', user.id)
        .eq('favoritable_type', 'student');

      const { data: favGroups } = await supabase
        .from('user_favorites')
        .select('favoritable_id')
        .eq('user_id', user.id)
        .eq('favoritable_type', 'group');

      // Filter favorites that belong to selected school
      let favStudentCount = 0;
      let favGroupCount = 0;

      if (favStudents && favStudents.length > 0) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('id', favStudents.map(f => f.favoritable_id))
          .eq('school_id', focusSchool.id);
        favStudentCount = count || 0;
      }

      if (favGroups && favGroups.length > 0) {
        const { count } = await supabase
          .from('groups')
          .select('*', { count: 'exact', head: true })
          .in('id', favGroups.map(f => f.favoritable_id))
          .eq('school_id', focusSchool.id);
        favGroupCount = count || 0;
      }

      setStats({
        totalSchools: 1, // Always 1 since we're showing data for selected school
        totalStudents: studentCount || 0,
        totalGroups: groupCount || 0,
        favoriteStudents: favStudentCount,
        favoriteGroups: favGroupCount,
        reportsToday: 0,
        openReports: 0,
        notifications: 0,
      });

      // Fetch behavior statistics
      await fetchBehaviorStats();
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBehaviorStats = async () => {
    if (!user || !focusSchool) return;

    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Count reports today
      const { count: reportsToday } = await supabase
        .from('behavior_incidents')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', focusSchool.id)
        .gte('incident_date', startOfDay.toISOString())
        .lt('incident_date', endOfDay.toISOString());

      // Count open reports (pending and in_progress)
      const { count: openReports } = await supabase
        .from('behavior_incidents')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', focusSchool.id)
        .in('status', ['pending', 'in_progress']);

      // Update stats with behavior data
      setStats(prev => ({
        ...prev,
        reportsToday: reportsToday || 0,
        openReports: openReports || 0,
        notifications: 0, // Set to 0 until behavior_incident_notifications table is created
      }));
    } catch (error) {
      console.error('Error fetching behavior stats:', error);
    }
  };

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
    onNavigateToStudent(student.school_id, student.id);
  };

  const handleGroupClick = (group: FavoriteGroup['groups']) => {
    onNavigateToGroup(group.school_id, group.id);
  };

  const handleQuickIncidentReport = (student: FavoriteStudent['students']) => {
    onNavigateToBehaviorWithStudent(student.school_id, student.id);
  };

  const selectedSchool = userSchools.find(school => school.id === focusSchool?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!focusSchool || !selectedSchool) {
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
              value={focusSchool.id}
              onChange={(e) => {
                const school = userSchools.find(s => s.id === e.target.value);
                if (school) onFocusSchoolChange(school);
              }}
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
            Gedrag Overzicht
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
                  <p className="text-sm font-medium text-gray-600">Notificaties</p>
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
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <button
                          onClick={() => handleStudentClick(favorite.students)}
                          className="font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {favorite.students.first_name} {favorite.students.last_name}
                        </button>
                        {favorite.students.student_number && (
                          <p className="text-sm text-gray-600">#{favorite.students.student_number}</p>
                        )}
                        {favorite.students.grade_level && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            Klas: {favorite.students.grade_level}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickIncidentReport(favorite.students)}
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
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <button
                          onClick={() => handleGroupClick(favorite.groups)}
                          className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {favorite.groups.name}
                        </button>
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
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGroupClick(favorite.groups)}
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
    </div>
  );
}