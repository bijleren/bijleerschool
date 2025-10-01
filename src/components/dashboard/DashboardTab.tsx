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
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');

  useEffect(() => {
    if (user && selectedSchoolId) {
      setSelectedSchoolId(focusSchool.id);
      fetchDashboardData();
    }
  }, [user, selectedSchoolId]);

  const fetchDashboardData = async () => {
    if (!user || !selectedSchoolId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch data in parallel for better performance
      const [favoritesResult, statsResult] = await Promise.all([
        fetchFavorites(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user || !selectedSchoolId) return;

    try {
      // Fetch favorites with a single optimized query
      const { data: favoriteStudentsData, error: studentsError } = await supabase
        .from('user_favorites')
        .select(`
          id,
          favoritable_id,
          students!inner (
            id,
            first_name,
            last_name,
            student_number,
            grade_level,
            school_id,
            schools (name)
          )
        `)
        .eq('user_id', user.id)
        .eq('favoritable_type', 'student')
        .eq('students.school_id', selectedSchoolId)
        .eq('students.is_active', true);

      if (studentsError) throw studentsError;

      const { data: favoriteGroupsData, error: groupsError } = await supabase
        .from('user_favorites')
        .select(`
          id,
          favoritable_id,
          groups!inner (
            id,
            name,
            description,
            grade_level,
            school_year,
            school_id,
            schools (name)
          )
        `)
        .eq('user_id', user.id)
        .eq('favoritable_type', 'group')
        .eq('groups.school_id', selectedSchoolId)
        .eq('groups.is_active', true);

      if (groupsError) throw groupsError;

      setFavoriteStudents(favoriteStudentsData || []);
      setFavoriteGroups(favoriteGroupsData || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavoriteStudents([]);
      setFavoriteGroups([]);
    }
  };

  const fetchStats = async () => {
    if (!user || !selectedSchoolId) return;

    try {
      // Fetch basic stats in parallel
      const [
        { count: studentCount },
        { count: groupCount },
        behaviorStats
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
          .eq('is_active', true),
        fetchBehaviorStats()
      ]);

      setStats(prev => ({
        ...prev,
        totalSchools: 1,
        totalStudents: studentCount || 0,
        totalGroups: groupCount || 0,
        favoriteStudents: favoriteStudents.length,
        favoriteGroups: favoriteGroups.length,
        ...behaviorStats
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBehaviorStats = async () => {
    if (!user || !selectedSchoolId) return;

    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch behavior stats in parallel
      const [
        { count: reportsToday },
        { count: openReports }
      ] = await Promise.all([
        supabase
          .from('behavior_incidents')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', selectedSchoolId)
          .gte('incident_date', startOfDay.toISOString())
          .lt('incident_date', endOfDay.toISOString()),
        supabase
          .from('behavior_incidents')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', selectedSchoolId)
          .in('status', ['pending', 'in_progress'])
      ]);

      return {
        reportsToday: reportsToday || 0,
        openReports: openReports || 0,
        notifications: 0
      };
    } catch (error) {
      console.error('Error fetching behavior stats:', error);
      return {
        reportsToday: 0,
        openReports: 0,
        notifications: 0
      };
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

  const handleQuickIncidentReport = (student: FavoriteStudent['students'])