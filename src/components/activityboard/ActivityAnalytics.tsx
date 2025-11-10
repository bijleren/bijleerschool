import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Users, Clock, BarChart3, TrendingUp } from 'lucide-react';

interface ActivityBoard {
  id: string;
  name: string;
}

interface ActivityAnalyticsProps {
  schoolId: string;
  boards: ActivityBoard[];
  onBack: () => void;
}

interface ActivityStats {
  activityName: string;
  totalSessions: number;
  totalMinutes: number;
  averageMinutes: number;
  uniqueStudents: number;
}

interface StudentActivityStats {
  studentName: string;
  totalSessions: number;
  totalMinutes: number;
  activities: Array<{ name: string; count: number }>;
}

interface CollaborationStats {
  student1: string;
  student2: string;
  totalMinutes: number;
  sessions: number;
}

export function ActivityAnalytics({ schoolId, boards, onBack }: ActivityAnalyticsProps) {
  const [selectedBoard, setSelectedBoard] = useState<string>(boards[0]?.id || '');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [studentStats, setStudentStats] = useState<StudentActivityStats[]>([]);
  const [collaborationStats, setCollaborationStats] = useState<CollaborationStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedBoard) {
      fetchAnalytics();
    }
  }, [selectedBoard, dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return today.toISOString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return monthAgo.toISOString();
      default:
        return null;
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchActivityStats(),
        fetchStudentStats(),
        fetchCollaborationStats()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      let query = supabase
        .from('activity_sessions')
        .select(`
          id,
          start_time,
          end_time,
          student_id,
          activity_options!inner (
            name
          )
        `)
        .eq('board_id', selectedBoard)
        .not('end_time', 'is', null);

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('start_time', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const statsMap = new Map<string, {
        sessions: number;
        totalMinutes: number;
        students: Set<string>;
      }>();

      data?.forEach((session: any) => {
        const activityName = session.activity_options.name;
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);

        if (!statsMap.has(activityName)) {
          statsMap.set(activityName, {
            sessions: 0,
            totalMinutes: 0,
            students: new Set()
          });
        }

        const stats = statsMap.get(activityName)!;
        stats.sessions++;
        stats.totalMinutes += minutes;
        stats.students.add(session.student_id);
      });

      const stats: ActivityStats[] = Array.from(statsMap.entries()).map(
        ([name, data]) => ({
          activityName: name,
          totalSessions: data.sessions,
          totalMinutes: data.totalMinutes,
          averageMinutes: Math.round(data.totalMinutes / data.sessions),
          uniqueStudents: data.students.size
        })
      );

      stats.sort((a, b) => b.totalSessions - a.totalSessions);
      setActivityStats(stats);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  const fetchStudentStats = async () => {
    try {
      let query = supabase
        .from('activity_sessions')
        .select(`
          id,
          start_time,
          end_time,
          students!inner (
            first_name,
            last_name
          ),
          activity_options!inner (
            name
          )
        `)
        .eq('board_id', selectedBoard)
        .not('end_time', 'is', null);

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('start_time', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const studentMap = new Map<string, {
        sessions: number;
        totalMinutes: number;
        activities: Map<string, number>;
      }>();

      data?.forEach((session: any) => {
        const studentName = `${session.students.first_name} ${session.students.last_name}`;
        const activityName = session.activity_options.name;
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);

        if (!studentMap.has(studentName)) {
          studentMap.set(studentName, {
            sessions: 0,
            totalMinutes: 0,
            activities: new Map()
          });
        }

        const stats = studentMap.get(studentName)!;
        stats.sessions++;
        stats.totalMinutes += minutes;
        stats.activities.set(activityName, (stats.activities.get(activityName) || 0) + 1);
      });

      const stats: StudentActivityStats[] = Array.from(studentMap.entries())
        .map(([name, data]) => ({
          studentName: name,
          totalSessions: data.sessions,
          totalMinutes: data.totalMinutes,
          activities: Array.from(data.activities.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
        }))
        .sort((a, b) => b.totalSessions - a.totalSessions)
        .slice(0, 10);

      setStudentStats(stats);
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const fetchCollaborationStats = async () => {
    try {
      let query = supabase
        .from('activity_collaboration_logs')
        .select(`
          duration_minutes,
          session_id_1,
          session_id_2
        `)
        .eq('activity_option_id', selectedBoard);

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('start_time', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setCollaborationStats([]);
    } catch (error) {
      console.error('Error fetching collaboration stats:', error);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}u ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Analyses</h1>
        </div>

        <div className="flex items-center gap-3">
          {boards.length > 1 && (
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Vandaag</option>
            <option value="week">Afgelopen week</option>
            <option value="month">Afgelopen maand</option>
            <option value="all">Alle tijd</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Activiteitsstatistieken</h2>
            </div>

            {activityStats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Geen gegevens voor deze periode
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Activiteit
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Sessies
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Totale tijd
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Gem. tijd
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Unieke leerlingen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityStats.map((stat, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                          {stat.activityName}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {stat.totalSessions}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {formatDuration(stat.totalMinutes)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {formatDuration(stat.averageMinutes)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {stat.uniqueStudents}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Top 10 Actieve Leerlingen</h2>
            </div>

            {studentStats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Geen gegevens voor deze periode
              </p>
            ) : (
              <div className="space-y-3">
                {studentStats.map((stat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{stat.studentName}</p>
                        <p className="text-xs text-gray-600">
                          {stat.activities.map(a => a.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {stat.totalSessions} sessies
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDuration(stat.totalMinutes)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
