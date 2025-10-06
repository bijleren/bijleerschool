import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Users, Eye, TrendingUp, Clock, BarChart3, User, Video, FileText, ExternalLink, UserCheck } from 'lucide-react';
import { StudentAccessAnalytics } from './StudentAccessAnalytics';

interface WebWijzerContent {
  id: string;
  title: string;
  symbol: string;
  color: string;
  content_type: 'video' | 'file' | 'link';
}

interface AnalyticsData {
  content: WebWijzerContent;
  totalViews: number;
  uniqueStudents: number;
  totalStudentsWithAccess: number;
  recentViews: Array<{
    student_name: string;
    viewed_at: string;
  }>;
  viewsByStudent: Array<{
    student_id: string;
    student_name: string;
    view_count: number;
    last_viewed: string;
  }>;
}

export function WebWijzerAnalytics({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<AnalyticsData | null>(null);
  const [showStudentAccess, setShowStudentAccess] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: contents, error } = await supabase
        .from('webwijzer_content')
        .select('id, title, symbol, color, content_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const analyticsPromises = (contents || []).map(async (content) => {
        const { data: assignments } = await supabase
          .from('webwijzer_assignments')
          .select('assignable_id, assignable_type')
          .eq('content_id', content.id);

        const studentIds = new Set<string>();
        for (const assignment of assignments || []) {
          if (assignment.assignable_type === 'student') {
            studentIds.add(assignment.assignable_id);
          } else if (assignment.assignable_type === 'group') {
            const { data: groupStudents } = await supabase
              .from('student_groups')
              .select('student_id')
              .eq('group_id', assignment.assignable_id)
              .eq('is_active', true);
            groupStudents?.forEach(gs => studentIds.add(gs.student_id));
          }
        }

        const { data: usageData } = await supabase
          .from('webwijzer_usage')
          .select(`
            id,
            viewed_at,
            student_id,
            students (
              first_name,
              last_name
            )
          `)
          .eq('assignment_id', content.id)
          .order('viewed_at', { ascending: false });

        const viewsByStudent = new Map<string, { count: number; lastViewed: string; name: string }>();

        for (const usage of usageData || []) {
          const studentName = usage.students
            ? `${usage.students.first_name} ${usage.students.last_name}`
            : 'Unknown Student';

          if (!viewsByStudent.has(usage.student_id)) {
            viewsByStudent.set(usage.student_id, {
              count: 0,
              lastViewed: usage.viewed_at,
              name: studentName,
            });
          }
          viewsByStudent.get(usage.student_id)!.count++;
        }

        const viewsByStudentArray = Array.from(viewsByStudent.entries()).map(([studentId, data]) => ({
          student_id: studentId,
          student_name: data.name,
          view_count: data.count,
          last_viewed: data.lastViewed,
        })).sort((a, b) => b.view_count - a.view_count);

        const recentViews = (usageData || []).slice(0, 10).map(usage => ({
          student_name: usage.students
            ? `${usage.students.first_name} ${usage.students.last_name}`
            : 'Unknown Student',
          viewed_at: usage.viewed_at,
        }));

        return {
          content,
          totalViews: usageData?.length || 0,
          uniqueStudents: viewsByStudent.size,
          totalStudentsWithAccess: studentIds.size,
          recentViews,
          viewsByStudent: viewsByStudentArray,
        };
      });

      const analytics = await Promise.all(analyticsPromises);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'file':
        return <FileText className="w-5 h-5" />;
      case 'link':
        return <ExternalLink className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (showStudentAccess) {
    return <StudentAccessAnalytics onBack={() => setShowStudentAccess(false)} />;
  }

  if (selectedContent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => setSelectedContent(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: selectedContent.content.color + '20' }}
          >
            {selectedContent.content.symbol}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedContent.content.title}</h1>
            <p className="text-gray-600 mt-1">Detailed Analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{selectedContent.totalViews}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Students</p>
                <p className="text-2xl font-bold text-gray-900">{selectedContent.uniqueStudents}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Access</p>
                <p className="text-2xl font-bold text-gray-900">{selectedContent.totalStudentsWithAccess}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Engagement</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedContent.totalStudentsWithAccess > 0
                    ? Math.round((selectedContent.uniqueStudents / selectedContent.totalStudentsWithAccess) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Views by Student</h3>
            {selectedContent.viewsByStudent.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No views yet</p>
            ) : (
              <div className="space-y-3">
                {selectedContent.viewsByStudent.map((student, idx) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.student_name}</p>
                        <p className="text-sm text-gray-500">Last viewed {formatDate(student.last_viewed)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{student.view_count}</p>
                      <p className="text-xs text-gray-500">views</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {selectedContent.recentViews.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {selectedContent.recentViews.map((view, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border-l-4 border-blue-500 bg-blue-50">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{view.student_name}</p>
                      <p className="text-sm text-gray-600">{formatDate(view.viewed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WebWijzer Analytics</h1>
            <p className="text-gray-600 mt-1">Overview of all content performance</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.open('/webwijzer', '_blank')}
            variant="secondary"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Open Student Access
          </Button>
          <Button onClick={() => setShowStudentAccess(true)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Access Analytics
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      ) : analyticsData.length === 0 ? (
        <Card className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-600">Create content to see analytics</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyticsData.map((data) => (
            <Card
              key={data.content.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedContent(data)}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: data.content.color + '20' }}
                >
                  {data.content.symbol}
                </div>
                {getContentIcon(data.content.content_type)}
              </div>

              <h3 className="font-semibold text-gray-900 mb-4">{data.content.title}</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Eye className="w-4 h-4" />
                    <span>Views</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{data.totalViews}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span>Students</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.uniqueStudents}/{data.totalStudentsWithAccess}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Engagement</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {data.totalStudentsWithAccess > 0
                      ? Math.round((data.uniqueStudents / data.totalStudentsWithAccess) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${data.totalStudentsWithAccess > 0
                        ? Math.round((data.uniqueStudents / data.totalStudentsWithAccess) * 100)
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
