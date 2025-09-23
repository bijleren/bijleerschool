import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TechniqueUsageByGradeTable } from './TeachniqueUsageByGradeTable';
import { ArrowLeft, BarChart3, TrendingUp, Users, Award, MessageCircle, Calendar, Eye } from 'lucide-react';

interface TeachingAnalyticsProps {
  onBack: () => void;
  userSchools: { id: string; name: string }[];
}

interface TechniqueUsageStats {
  technique_id: string;
  technique_title: string;
  usage_count: number;
  unique_teachers: number;
  unique_groups: number;
  latest_usage: string;
  categories: string[];
  category_colors: string[];
}

interface TeacherUsageStats {
  user_id: string;
  teacher_name: string;
  usage_count: number;
  unique_techniques: number;
  latest_usage: string;
}

interface CoachingStats {
  technique_id: string;
  technique_title: string;
  coach_count: number;
  experience_breakdown: { [key: string]: number };
}

interface OverallStats {
  total_techniques: number;
  total_usage_logs: number;
  active_teachers: number;
  total_coaches: number;
  total_comments: number;
  techniques_with_usage: number;
}

export function TeachingAnalytics({ onBack, userSchools }: TeachingAnalyticsProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState(userSchools[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [overallStats, setOverallStats] = useState<OverallStats>({
    total_techniques: 0,
    total_usage_logs: 0,
    active_teachers: 0,
    total_coaches: 0,
    total_comments: 0,
    techniques_with_usage: 0,
  });
  const [techniqueUsageStats, setTechniqueUsageStats] = useState<TechniqueUsageStats[]>([]);
  const [teacherUsageStats, setTeacherUsageStats] = useState<TeacherUsageStats[]>([]);
  const [coachingStats, setCoachingStats] = useState<CoachingStats[]>([]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchAnalytics();
    }
  }, [selectedSchoolId, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Fetch overall statistics
      await fetchOverallStats();
      
      // Fetch technique usage statistics
      await fetchTechniqueUsageStats(startDate);
      
      // Fetch teacher usage statistics
      await fetchTeacherUsageStats(startDate);
      
      // Fetch coaching statistics
      await fetchCoachingStats();
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverallStats = async () => {
    try {
      // Count total active techniques
      const { count: totalTechniques } = await supabase
        .from('teaching_techniques')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Count total usage logs for school
      const { count: totalUsageLogs } = await supabase
        .from('technique_usage_logs')
        .select('*', { count: 'exact', head: true })
        .in('user_id', await getSchoolUserIds());

      // Count active teachers (users who have used techniques)
      const { data: activeTeachersData } = await supabase
        .from('technique_usage_logs')
        .select('user_id')
        .in('user_id', await getSchoolUserIds());
      
      const activeTeachers = new Set(activeTeachersData?.map(log => log.user_id)).size;

      // Count total coaches in school
      const { count: totalCoaches } = await supabase
        .from('technique_coaches')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true);

      // Count total comments in school
      const { count: totalComments } = await supabase
        .from('technique_comments')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true);

      // Count techniques with usage
      const { data: usedTechniques } = await supabase
        .from('technique_usage_logs')
        .select('technique_id')
        .in('user_id', await getSchoolUserIds());
      
      const techniquesWithUsage = new Set(usedTechniques?.map(log => log.technique_id)).size;

      setOverallStats({
        total_techniques: totalTechniques || 0,
        total_usage_logs: totalUsageLogs || 0,
        active_teachers: activeTeachers,
        total_coaches: totalCoaches || 0,
        total_comments: totalComments || 0,
        techniques_with_usage: techniquesWithUsage,
      });
    } catch (error) {
      console.error('Error fetching overall stats:', error);
    }
  };

  const fetchTechniqueUsageStats = async (startDate: Date) => {
    try {
      const schoolUserIds = await getSchoolUserIds();
      
      const { data: usageLogs } = await supabase
        .from('technique_usage_logs')
        .select(`
          technique_id,
          user_id,
          group_id,
          used_at,
          teaching_techniques (
            title,
            teaching_technique_categories (
              technique_categories (name, color)
            )
          )
        `)
        .in('user_id', schoolUserIds)
        .gte('used_at', startDate.toISOString());

      // Group by technique and calculate stats
      const techniqueMap = new Map<string, any>();
      
      usageLogs?.forEach((log: any) => {
        const techniqueId = log.technique_id;
        
        if (!techniqueMap.has(techniqueId)) {
          techniqueMap.set(techniqueId, {
            technique_id: techniqueId,
            technique_title: log.teaching_techniques.title,
            usage_count: 0,
            unique_teachers: new Set(),
            unique_groups: new Set(),
            latest_usage: log.used_at,
            categories: log.teaching_techniques.teaching_technique_categories
              .filter((tc: any) => tc.technique_categories)
              .map((tc: any) => tc.technique_categories.name),
            category_colors: log.teaching_techniques.teaching_technique_categories
              .filter((tc: any) => tc.technique_categories)
              .map((tc: any) => tc.technique_categories.color),
          });
        }

        const stats = techniqueMap.get(techniqueId);
        stats.usage_count++;
        stats.unique_teachers.add(log.user_id);
        if (log.group_id) stats.unique_groups.add(log.group_id);
        
        if (new Date(log.used_at) > new Date(stats.latest_usage)) {
          stats.latest_usage = log.used_at;
        }
      });

      // Convert to array and format
      const techniqueStats = Array.from(techniqueMap.values()).map(stats => ({
        ...stats,
        unique_teachers: stats.unique_teachers.size,
        unique_groups: stats.unique_groups.size,
      })).sort((a, b) => b.usage_count - a.usage_count);

      setTechniqueUsageStats(techniqueStats);
    } catch (error) {
      console.error('Error fetching technique usage stats:', error);
    }
  };

  const fetchTeacherUsageStats = async (startDate: Date) => {
    try {
      const schoolUserIds = await getSchoolUserIds();
      
      const { data: usageLogs } = await supabase
        .from('technique_usage_logs')
        .select(`
          user_id,
          technique_id,
          used_at,
          profiles (first_name, last_name)
        `)
        .in('user_id', schoolUserIds)
        .gte('used_at', startDate.toISOString());

      // Group by teacher and calculate stats
      const teacherMap = new Map<string, any>();
      
      usageLogs?.forEach((log: any) => {
        const userId = log.user_id;
        
        if (!teacherMap.has(userId)) {
          teacherMap.set(userId, {
            user_id: userId,
            teacher_name: `${log.profiles.first_name} ${log.profiles.last_name}`,
            usage_count: 0,
            unique_techniques: new Set(),
            latest_usage: log.used_at,
          });
        }

        const stats = teacherMap.get(userId);
        stats.usage_count++;
        stats.unique_techniques.add(log.technique_id);
        
        if (new Date(log.used_at) > new Date(stats.latest_usage)) {
          stats.latest_usage = log.used_at;
        }
      });

      // Convert to array and format
      const teacherStats = Array.from(teacherMap.values()).map(stats => ({
        ...stats,
        unique_techniques: stats.unique_techniques.size,
      })).sort((a, b) => b.usage_count - a.usage_count);

      setTeacherUsageStats(teacherStats);
    } catch (error) {
      console.error('Error fetching teacher usage stats:', error);
    }
  };

  const fetchCoachingStats = async () => {
    try {
      const { data: coaches } = await supabase
        .from('technique_coaches')
        .select(`
          technique_id,
          experience_level,
          teaching_techniques (title)
        `)
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true);

      // Group by technique and calculate coaching stats
      const coachingMap = new Map<string, any>();
      
      coaches?.forEach((coach: any) => {
        const techniqueId = coach.technique_id;
        
        if (!coachingMap.has(techniqueId)) {
          coachingMap.set(techniqueId, {
            technique_id: techniqueId,
            technique_title: coach.teaching_techniques.title,
            coach_count: 0,
            experience_breakdown: { beginner: 0, intermediate: 0, expert: 0 },
          });
        }

        const stats = coachingMap.get(techniqueId);
        stats.coach_count++;
        stats.experience_breakdown[coach.experience_level]++;
      });

      const coachingStatsArray = Array.from(coachingMap.values())
        .sort((a, b) => b.coach_count - a.coach_count);

      setCoachingStats(coachingStatsArray);
    } catch (error) {
      console.error('Error fetching coaching stats:', error);
    }
  };

  const getSchoolUserIds = async (): Promise<string[]> => {
    const { data } = await supabase
      .from('user_schools')
      .select('user_id')
      .eq('school_id', selectedSchoolId)
      .eq('status', 'approved')
      .eq('is_active', true);
    
    return data?.map(us => us.user_id) || [];
  };

  const selectedSchool = userSchools.find(school => school.id === selectedSchoolId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar technieken
          </Button>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-900">Didactiek Analyses</h1>
            <p className="text-gray-600">
              Inzicht in het gebruik van didactische technieken
              {selectedSchool && ` - ${selectedSchool.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {userSchools.length > 1 && (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {userSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="7">Laatste 7 dagen</option>
            <option value="30">Laatste 30 dagen</option>
            <option value="90">Laatste 90 dagen</option>
            <option value="365">Laatste jaar</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Technieken</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.total_techniques}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totaal gebruik</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.total_usage_logs}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actieve docenten</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.active_teachers}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Coaches</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.total_coaches}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MessageCircle className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Reacties</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.total_comments}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Eye className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gebruikte technieken</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.techniques_with_usage}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Used Techniques */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Meest gebruikte technieken
          </h3>
          <div className="space-y-3">
            {techniqueUsageStats.slice(0, 10).map((technique, index) => (
              <div key={technique.technique_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{technique.technique_title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {technique.categories.map((category, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded-full text-white"
                          style={{ backgroundColor: technique.category_colors[idx] }}
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {technique.unique_teachers} docenten • {technique.unique_groups} groepen
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{technique.usage_count}</p>
                  <p className="text-xs text-gray-500">keer gebruikt</p>
                </div>
              </div>
            ))}
            {techniqueUsageStats.length === 0 && (
              <p className="text-gray-500 text-center py-8">Geen gebruiksdata beschikbaar</p>
            )}
          </div>
        </Card>

        {/* Most Active Teachers */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Meest actieve docenten
          </h3>
          <div className="space-y-3">
            {teacherUsageStats.slice(0, 10).map((teacher, index) => (
              <div key={teacher.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{teacher.teacher_name}</p>
                    <p className="text-xs text-gray-500">
                      {teacher.unique_techniques} verschillende technieken
                    </p>
                    <p className="text-xs text-gray-500">
                      Laatste gebruik: {new Date(teacher.latest_usage).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{teacher.usage_count}</p>
                  <p className="text-xs text-gray-500">keer gebruikt</p>
                </div>
              </div>
            ))}
            {teacherUsageStats.length === 0 && (
              <p className="text-gray-500 text-center py-8">Geen gebruiksdata beschikbaar</p>
            )}
          </div>
        </Card>

        {/* Coaching Statistics */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Coaching beschikbaarheid
          </h3>
          <div className="space-y-3">
            {coachingStats.slice(0, 10).map((coaching) => (
              <div key={coaching.technique_id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{coaching.technique_title}</p>
                  <span className="text-sm font-bold text-gray-900">{coaching.coach_count} coaches</span>
                </div>
                <div className="flex items-center space-x-2">
                  {coaching.experience_breakdown.expert > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {coaching.experience_breakdown.expert} Expert
                    </span>
                  )}
                  {coaching.experience_breakdown.intermediate > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {coaching.experience_breakdown.intermediate} Gemiddeld
                    </span>
                  )}
                  {coaching.experience_breakdown.beginner > 0 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {coaching.experience_breakdown.beginner} Beginner
                    </span>
                  )}
                </div>
              </div>
            ))}
            {coachingStats.length === 0 && (
              <p className="text-gray-500 text-center py-8">Geen coaches beschikbaar</p>
            )}
          </div>
        </Card>

        {/* Usage Trends */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Trends en inzichten
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Adoptie rate</h4>
              <p className="text-blue-800">
                {overallStats.total_techniques > 0 
                  ? `${Math.round((overallStats.techniques_with_usage / overallStats.total_techniques) * 100)}%`
                  : '0%'
                } van de technieken wordt actief gebruikt
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Gemiddeld gebruik</h4>
              <p className="text-green-800">
                {overallStats.active_teachers > 0 
                  ? `${Math.round(overallStats.total_usage_logs / overallStats.active_teachers)}`
                  : '0'
                } technieken per actieve docent
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Coaching dekking</h4>
              <p className="text-yellow-800">
                {overallStats.techniques_with_usage > 0 
                  ? `${Math.round((coachingStats.length / overallStats.techniques_with_usage) * 100)}%`
                  : '0%'
                } van gebruikte technieken heeft coaches
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Engagement</h4>
              <p className="text-purple-800">
                {overallStats.total_usage_logs > 0 
                  ? `${Math.round(overallStats.total_comments / overallStats.total_usage_logs * 100)}%`
                  : '0%'
                } van het gebruik resulteert in reacties
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Technique Usage by Grade Table */}
      <Card className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Techniek Gebruik per Leerjaar/Niveau
        </h3>
        <TechniqueUsageByGradeTable 
          schoolId={selectedSchoolId}
          dateRange={dateRange}
        />
      </Card>
    </div>
  );
}