import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Clock,
  CheckCircle,
  Filter,
  BookOpen,
  HelpCircle,
  Video,
  Newspaper,
  Link,
  Grid,
  BookMarked,
  Search
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
    profile_picture_url: string | null;
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

interface BehaviorIncident {
  id: string;
  incident_date: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
  behavior_items: {
    name: string;
    behavior_categories: {
      name: string;
      color: string;
    };
  };
  behavior_incident_students: Array<{
    student_id: string;
    students: {
      first_name: string;
      last_name: string;
    };
  }>;
}

interface DashboardTabProps {
  onNavigateToStudent: (schoolId: string, studentId: string) => void;
  onNavigateToGroup: (schoolId: string, groupId: string) => void;
  onNavigateToSchools: () => void;
  onNavigateToBehaviorWithStudent: (schoolId: string, studentId: string) => void;
  onNavigateToBehavior: (filter?: 'all' | 'today' | 'open' | 'followup') => void;
  onNavigateToTeaching?: () => void;
  onNavigateToTeachingFAQ?: () => void;
  onNavigateToTeachingVormingen?: () => void;
  onNavigateToNieuwsbrief?: () => void;
  onNavigateToEDI?: () => void;
  onNavigateToWebWijzer?: () => void;
  onNavigateToActivityBoards?: () => void;
  onNavigateToBoeker?: () => void;
  onNavigateToZoeker?: () => void;
  userSchools: { id: string; name: string }[];
  focusSchool: { id: string; name: string } | null;
  onFocusSchoolChange: (school: { id: string; name: string }) => void;
}

export function DashboardTab({ onNavigateToStudent, onNavigateToGroup, onNavigateToSchools, onNavigateToBehaviorWithStudent, onNavigateToBehavior, onNavigateToTeaching, onNavigateToTeachingFAQ, onNavigateToTeachingVormingen, onNavigateToNieuwsbrief, onNavigateToEDI, onNavigateToWebWijzer, onNavigateToActivityBoards, onNavigateToBoeker, onNavigateToZoeker, userSchools, focusSchool, onFocusSchoolChange }: DashboardTabProps) {
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
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>(['pending', 'in_progress']);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Array<{ id: string; first_name: string; last_name: string; school_id: string }>>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && focusSchool) {
      setSelectedSchoolId(focusSchool.id);
    }
  }, [user, focusSchool]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchDashboardData();
      fetchAllStudents();
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
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
            profile_picture_url,
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

  useEffect(() => {
    if (selectedSchoolId && statusFilters.length > 0) {
      fetchIncidents();
    }
  }, [selectedSchoolId, statusFilters]);

  const fetchIncidents = async () => {
    if (!selectedSchoolId) return;

    setIncidentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('behavior_incidents')
        .select(`
          id,
          incident_date,
          description,
          status,
          created_at,
          profiles!behavior_incidents_reported_by_fkey(first_name, last_name),
          behavior_items(
            name,
            behavior_categories(name, color)
          ),
          behavior_incident_students(
            student_id,
            students(first_name, last_name)
          )
        `)
        .eq('school_id', selectedSchoolId)
        .in('status', statusFilters)
        .order('incident_date', { ascending: false })
        .limit(20);

      if (error) throw error;

      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const handleIncidentClick = (incidentId: string) => {
    sessionStorage.setItem('highlightIncidentId', incidentId);
    onNavigateToBehavior();
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
    onNavigateToStudent(selectedSchoolId, student.id);
  };

  const handleGroupClick = (group: FavoriteGroup['groups']) => {
    onNavigateToGroup(group.school_id, group.id);
  };

  const handleQuickIncidentReport = (student: FavoriteStudent['students']) => {
    onNavigateToBehaviorWithStudent(selectedSchoolId, student.id);
  };

  const fetchAllStudents = async () => {
    if (!selectedSchoolId) return;

    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, school_id')
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setAllStudents(students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setAllStudents([]);
    }
  };

  const filteredStudentResults = studentSearchQuery.trim()
    ? allStudents.filter(student => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        const searchTerm = studentSearchQuery.toLowerCase();
        return fullName.includes(searchTerm);
      }).slice(0, 5)
    : [];

  const handleStudentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStudentSearchQuery(value);
    setShowStudentDropdown(value.trim().length > 0);
  };

  const handleStudentSelect = (student: { id: string; first_name: string; last_name: string; school_id: string }) => {
    onNavigateToStudent(student.school_id, student.id);
    setStudentSearchQuery('');
    setShowStudentDropdown(false);
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

      {/* Quick Access Buttons - Row 1: Didactiek */}
      <div className="mb-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={onNavigateToTeaching}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Technieken</span>
          </button>

          <button
            onClick={onNavigateToTeachingFAQ}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">FAQ</span>
          </button>

          <button
            onClick={onNavigateToTeachingVormingen}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <Video className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Vormingen</span>
          </button>

          <button
            onClick={onNavigateToNieuwsbrief}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <Newspaper className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Nieuwsbrief</span>
          </button>
        </div>
      </div>

      {/* Quick Access Buttons - Row 2: Apps */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={onNavigateToEDI}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <School className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">EDI</span>
          </button>

          <button
            onClick={onNavigateToWebWijzer}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <Link className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">WebWijzer</span>
          </button>

          <button
            onClick={onNavigateToActivityBoards}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <Grid className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Activi-tijd</span>
          </button>

          <button
            onClick={onNavigateToBoeker}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <BookMarked className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Boeker</span>
          </button>

          <button
            onClick={onNavigateToZoeker}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <Search className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Zoeker</span>
          </button>
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
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigateToBehavior('today')}>
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
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigateToBehavior('open')}>
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
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigateToBehavior('followup')}>
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
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Je Leerlingen
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative flex-1" ref={studentDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Zoek een leerling..."
                    value={studentSearchQuery}
                    onChange={handleStudentInputChange}
                    onFocus={() => studentSearchQuery.trim().length > 0 && setShowStudentDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {showStudentDropdown && filteredStudentResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredStudentResults.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.first_name} {student.last_name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showStudentDropdown && studentSearchQuery.trim() && filteredStudentResults.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                    Geen leerlingen gevonden
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateToSchools()}
              >
                Alle leerlingen
              </Button>
            </div>
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
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {favorite.students.profile_picture_url ? (
                          <img
                            src={favorite.students.profile_picture_url}
                            alt={`${favorite.students.first_name} ${favorite.students.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        )}
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

      {/* Behavior Incidents List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            Gedragsincidenten ({incidents.length})
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => toggleStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilters.includes('pending')
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              Onderzoek
            </button>
            <button
              onClick={() => toggleStatusFilter('in_progress')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilters.includes('in_progress')
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              In behandeling
            </button>
            <button
              onClick={() => toggleStatusFilter('resolved')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilters.includes('resolved')
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              Afgerond
            </button>
          </div>
        </div>

        {incidentsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : incidents.length === 0 ? (
          <Card className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen incidenten gevonden</h3>
            <p className="text-gray-600">
              Er zijn geen incidenten met de geselecteerde filters.
            </p>
          </Card>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => handleIncidentClick(incident.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderLeftWidth: '4px', borderLeftColor: incident.behavior_items.behavior_categories.color }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: incident.behavior_items.behavior_categories.color + '20',
                            color: incident.behavior_items.behavior_categories.color
                          }}
                        >
                          {incident.behavior_items.behavior_categories.name}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.status === 'pending'
                              ? 'bg-red-100 text-red-700'
                              : incident.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {incident.status === 'pending' ? 'Niveau' : incident.status === 'in_progress' ? 'Niveau' : 'Niveau'}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.status === 'pending'
                              ? 'bg-red-50 text-red-700'
                              : incident.status === 'in_progress'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {incident.status === 'pending' ? 'Onderzoek' : incident.status === 'in_progress' ? 'In behandeling' : 'Afgerond'}
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-1">{incident.description}</h3>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span>{incident.behavior_items.name}</span>
                      </div>

                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Betrokken leerlingen:</span>{' '}
                        {incident.behavior_incident_students.map((bis, idx) => (
                          <span key={bis.student_id}>
                            {bis.students.first_name} {bis.students.last_name}
                            {idx < incident.behavior_incident_students.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(incident.incident_date).toLocaleDateString('nl-NL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(incident.incident_date).toLocaleTimeString('nl-NL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Gemeld door: {incident.profiles.first_name} {incident.profiles.last_name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}