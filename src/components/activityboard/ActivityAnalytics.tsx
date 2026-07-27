import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Users, Clock, BarChart3, TrendingUp, User, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ActivityBoard {
  id: string;
  name: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface ActivityAnalyticsProps {
  schoolId: string;
  boards: ActivityBoard[];
  onBack: () => void;
  initialBoardId?: string;
}

interface ActivityStats {
  activityName: string;
  totalSessions: number;
  totalMinutes: number;
  averageMinutes: number;
  uniqueStudents: number;
}

interface StudentActivityStats {
  studentId: string;
  studentName: string;
  totalSessions: number;
  totalMinutes: number;
  activities: Array<{ name: string; count: number; minutes: number }>;
}

interface CollaborationPartner {
  studentId: string;
  studentName: string;
  totalMinutes: number;
  sessions: number;
}

interface ActivityLogEntry {
  id: string;
  activityName: string;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
  feedbackRating: number | null;
  teacherNotes: string | null;
}

export function ActivityAnalytics({ schoolId, boards, onBack, initialBoardId }: ActivityAnalyticsProps) {
  const [selectedBoard, setSelectedBoard] = useState<string>(initialBoardId || 'all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [studentStats, setStudentStats] = useState<StudentActivityStats[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [collaborationPartners, setCollaborationPartners] = useState<CollaborationPartner[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedBoard, selectedStudent, dateRange]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

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
        selectedStudent !== 'all' && fetchCollaborationData(),
        selectedStudent !== 'all' && fetchActivityLog()
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
          board_id,
          activity_options!inner (
            name
          )
        `)
        .not('end_time', 'is', null);

      if (selectedBoard !== 'all') {
        query = query.eq('board_id', selectedBoard);
      } else if (boards.length > 0) {
        query = query.in('board_id', boards.map(b => b.id));
      }

      if (selectedStudent !== 'all') {
        query = query.eq('student_id', selectedStudent);
      }

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

      stats.sort((a, b) => b.totalMinutes - a.totalMinutes);
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
          student_id,
          students!inner (
            id,
            first_name,
            last_name
          ),
          activity_options!inner (
            name
          )
        `)
        .not('end_time', 'is', null);

      if (selectedBoard !== 'all') {
        query = query.eq('board_id', selectedBoard);
      } else if (boards.length > 0) {
        query = query.in('board_id', boards.map(b => b.id));
      }

      if (selectedStudent !== 'all') {
        query = query.eq('student_id', selectedStudent);
      }

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('start_time', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const studentMap = new Map<string, {
        id: string;
        sessions: number;
        totalMinutes: number;
        activities: Map<string, { count: number; minutes: number }>;
      }>();

      data?.forEach((session: any) => {
        const studentId = session.students.id;
        const studentName = `${session.students.first_name} ${session.students.last_name}`;
        const activityName = session.activity_options.name;
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);

        if (!studentMap.has(studentName)) {
          studentMap.set(studentName, {
            id: studentId,
            sessions: 0,
            totalMinutes: 0,
            activities: new Map()
          });
        }

        const stats = studentMap.get(studentName)!;
        stats.sessions++;
        stats.totalMinutes += minutes;

        const activityStats = stats.activities.get(activityName) || { count: 0, minutes: 0 };
        activityStats.count++;
        activityStats.minutes += minutes;
        stats.activities.set(activityName, activityStats);
      });

      const stats: StudentActivityStats[] = Array.from(studentMap.entries())
        .map(([name, data]) => ({
          studentId: data.id,
          studentName: name,
          totalSessions: data.sessions,
          totalMinutes: data.totalMinutes,
          activities: Array.from(data.activities.entries())
            .map(([name, stats]) => ({ name, count: stats.count, minutes: stats.minutes }))
            .sort((a, b) => b.minutes - a.minutes)
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

      setStudentStats(stats);
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const fetchCollaborationData = async () => {
    if (selectedStudent === 'all') {
      setCollaborationPartners([]);
      return;
    }

    try {
      const { data: collaborationData, error } = await supabase
        .from('activity_collaboration_logs')
        .select(`
          duration_minutes,
          session_id_1,
          session_id_2,
          start_time
        `);

      if (error) throw error;

      const dateFilter = getDateFilter();
      const filteredData = collaborationData?.filter(log => {
        if (dateFilter && new Date(log.start_time) < new Date(dateFilter)) {
          return false;
        }
        return true;
      });

      const { data: sessions, error: sessionError } = await supabase
        .from('activity_sessions')
        .select(`
          id,
          student_id,
          students!inner (
            id,
            first_name,
            last_name
          )
        `)
        .in('id', [...new Set(filteredData?.flatMap(log => [log.session_id_1, log.session_id_2]) || [])]);

      if (sessionError) throw sessionError;

      const sessionMap = new Map(sessions?.map(s => [
        s.id,
        {
          studentId: s.students.id,
          studentName: `${s.students.first_name} ${s.students.last_name}`
        }
      ]));

      const partnerMap = new Map<string, { name: string; minutes: number; sessions: number }>();

      filteredData?.forEach((log: any) => {
        const session1 = sessionMap.get(log.session_id_1);
        const session2 = sessionMap.get(log.session_id_2);

        if (!session1 || !session2) return;

        let partnerId: string | null = null;
        let partnerName: string | null = null;

        if (session1.studentId === selectedStudent) {
          partnerId = session2.studentId;
          partnerName = session2.studentName;
        } else if (session2.studentId === selectedStudent) {
          partnerId = session1.studentId;
          partnerName = session1.studentName;
        }

        if (partnerId && partnerName) {
          const existing = partnerMap.get(partnerId) || { name: partnerName, minutes: 0, sessions: 0 };
          existing.minutes += log.duration_minutes || 0;
          existing.sessions++;
          partnerMap.set(partnerId, existing);
        }
      });

      const partners: CollaborationPartner[] = Array.from(partnerMap.entries())
        .map(([id, data]) => ({
          studentId: id,
          studentName: data.name,
          totalMinutes: data.minutes,
          sessions: data.sessions
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

      setCollaborationPartners(partners);
    } catch (error) {
      console.error('Error fetching collaboration data:', error);
      setCollaborationPartners([]);
    }
  };

  const fetchActivityLog = async () => {
    if (selectedStudent === 'all') {
      setActivityLog([]);
      return;
    }

    try {
      let query = supabase
        .from('activity_sessions')
        .select(`
          id,
          start_time,
          end_time,
          feedback_rating,
          teacher_notes,
          activity_options!inner (
            name
          )
        `)
        .eq('student_id', selectedStudent)
        .order('start_time', { ascending: false });

      if (selectedBoard !== 'all') {
        query = query.eq('board_id', selectedBoard);
      }

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('start_time', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const logs: ActivityLogEntry[] = (data || []).map((session: any) => {
        const start = new Date(session.start_time);
        const end = session.end_time ? new Date(session.end_time) : null;
        const minutes = end ? Math.floor((end.getTime() - start.getTime()) / 60000) : 0;

        return {
          id: session.id,
          activityName: session.activity_options.name,
          startTime: start,
          endTime: end,
          durationMinutes: minutes,
          feedbackRating: session.feedback_rating,
          teacherNotes: session.teacher_notes
        };
      });

      setActivityLog(logs);
    } catch (error) {
      console.error('Error fetching activity log:', error);
      setActivityLog([]);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}u ${mins}m`;
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const activityData = activityStats.map(stat => ({
      'Activiteit': stat.activityName,
      'Sessies': stat.totalSessions,
      'Totale tijd': `${stat.totalMinutes}m`,
      'Gem. tijd': `${stat.averageMinutes}m`
    }));
    const activitySheet = XLSX.utils.json_to_sheet(activityData);
    XLSX.utils.book_append_sheet(workbook, activitySheet, 'Activiteitstijd');

    if (selectedStudent !== 'all' && collaborationPartners.length > 0) {
      const collaborationData = collaborationPartners.map(partner => ({
        'Leerling': partner.studentName,
        'Aantal keer samengewerkt': `${partner.sessions}x`,
        'Totale tijd samengewerkt': `${partner.totalMinutes}m`
      }));
      const collaborationSheet = XLSX.utils.json_to_sheet(collaborationData);
      XLSX.utils.book_append_sheet(workbook, collaborationSheet, 'Samenwerking');
    }

    const logData = activityLog.map(entry => ({
      'Activiteit': entry.activityName,
      'Datum': formatDateTime(entry.startTime),
      'Duur': `${entry.durationMinutes}m`,
      'Beoordeling': entry.feedbackRating ? '⭐'.repeat(entry.feedbackRating) : '',
      'Notities': entry.teacherNotes || ''
    }));
    const logSheet = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(workbook, logSheet, 'Gedetailleerd logboek');

    const boardName = selectedBoard === 'all' ? 'alle_borden' : boards.find(b => b.id === selectedBoard)?.name || 'board';
    const studentName = selectedStudent === 'all' ? 'alle_leerlingen' : students.find(s => s.id === selectedStudent)?.first_name + '_' + students.find(s => s.id === selectedStudent)?.last_name || 'student';
    const fileName = `activitijd_analyses_${boardName}_${studentName}_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29"></div>
      </div>
    );
  }

  const selectedStudentData = studentStats.find(s => s.studentId === selectedStudent);

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
          <Button variant="primary" onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exporteren naar Excel
          </Button>
          <select
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">Alle borden</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">Alle leerlingen</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
              <BarChart3 className="w-5 h-5 text-#946B29" />
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedStudent !== 'all' ? 'Activiteitstijd per activiteit' : 'Activiteitsstatistieken'}
              </h2>
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
                      {selectedStudent === 'all' && (
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                          Unieke leerlingen
                        </th>
                      )}
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
                        {selectedStudent === 'all' && (
                          <td className="py-3 px-4 text-sm text-gray-600 text-right">
                            {stat.uniqueStudents}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {selectedStudent !== 'all' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="w-5 h-5 text-#946B29" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Samenwerking met andere leerlingen
                </h2>
              </div>

              {collaborationPartners.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Geen samenwerkingsgegevens voor deze periode
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Leerling
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                          Aantal keer samengewerkt
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                          Totale tijd samengewerkt
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {collaborationPartners.map((partner, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                            {partner.studentName}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-right">
                            {partner.sessions}x
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-right">
                            {formatDuration(partner.totalMinutes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}

        {selectedStudent !== 'all' && activityLog.length > 0 && (
          <Card>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Clock className="w-5 h-5 text-#946B29" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Gedetailleerd logboek
                </h2>
              </div>

              <div className="space-y-3">
                {activityLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{log.activityName}</p>
                        <p className="text-xs text-gray-600">
                          {formatDateTime(log.startTime)}
                          {log.endTime && ` - ${formatDateTime(log.endTime)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-#946B29">
                          {log.endTime ? formatDuration(log.durationMinutes) : 'Bezig'}
                        </p>
                        {log.feedbackRating && (
                          <p className="text-xs text-gray-600">
                            {'⭐'.repeat(log.feedbackRating)}
                          </p>
                        )}
                      </div>
                    </div>
                    {log.teacherNotes && (
                      <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-gray-200">
                        {log.teacherNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {selectedStudent === 'all' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <User className="w-5 h-5 text-#946B29" />
                <h2 className="text-lg font-semibold text-gray-900">Leerlingoverzicht</h2>
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
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-#946B29 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{stat.studentName}</p>
                            <p className="text-xs text-gray-600">
                              {stat.totalSessions} sessies • {formatDuration(stat.totalMinutes)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedStudent(stat.studentId)}
                        >
                          Bekijk details
                        </Button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">Meest gebruikte activiteiten:</p>
                        <div className="space-y-1">
                          {stat.activities.slice(0, 3).map((activity, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-700">{activity.name}</span>
                              <span className="text-gray-600">
                                {activity.count}x • {formatDuration(activity.minutes)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
