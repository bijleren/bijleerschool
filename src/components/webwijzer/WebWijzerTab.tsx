import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Link, Plus, Video, FileText, ExternalLink, Trash2, CreditCard as Edit2, Users, BarChart3, Eye, Zap, Star, X, Filter } from 'lucide-react';
import { WebWijzerContentForm } from './WebWijzerContentForm';
import { WebWijzerAssignments } from './WebWijzerAssignments';
import { WebWijzerAnalytics } from './WebWijzerAnalytics';

interface WebWijzerContent {
  id: string;
  title: string;
  content_type: 'video' | 'file' | 'link';
  content_url: string;
  symbol: string;
  color: string;
  created_at: string;
  student_count?: number;
  total_views?: number;
  push_count?: number;
  favorite_count?: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
}

export function WebWijzerTab() {
  const { user } = useAuth();
  const [contents, setContents] = useState<WebWijzerContent[]>([]);
  const [allContents, setAllContents] = useState<WebWijzerContent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<WebWijzerContent | null>(null);
  const [selectedContent, setSelectedContent] = useState<WebWijzerContent | null>(null);
  const [viewMode, setViewMode] = useState<'assign' | 'analytics'>('assign');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showOnlyMyContent, setShowOnlyMyContent] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContents();
      fetchStudents();
    }
  }, [user]);

  useEffect(() => {
    const handleCreate = () => setShowForm(true);
    const handleAnalytics = () => setViewMode('analytics');

    window.addEventListener('navigateToWebWijzerCreate', handleCreate);
    window.addEventListener('navigateToWebWijzerAnalytics', handleAnalytics);

    return () => {
      window.removeEventListener('navigateToWebWijzerCreate', handleCreate);
      window.removeEventListener('navigateToWebWijzerAnalytics', handleAnalytics);
    };
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      filterContentsByStudent(selectedStudent.id);
    } else {
      setContents(allContents);
    }
  }, [selectedStudent, allContents]);

  const fetchStudents = async () => {
    if (!user) return;

    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .in('school_id', schoolIds)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const filterContentsByStudent = async (studentId: string) => {
    setLoading(true);
    try {
      const { data: directAssignments } = await supabase
        .from('webwijzer_assignments')
        .select('content_id')
        .eq('assignable_type', 'student')
        .eq('assignable_id', studentId);

      const { data: studentGroups } = await supabase
        .from('student_groups')
        .select('group_id')
        .eq('student_id', studentId)
        .eq('is_active', true);

      const groupIds = studentGroups?.map(sg => sg.group_id) || [];

      let groupAssignments: any[] = [];
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from('webwijzer_assignments')
          .select('content_id')
          .eq('assignable_type', 'group')
          .in('assignable_id', groupIds);
        groupAssignments = data || [];
      }

      const contentIds = new Set([
        ...(directAssignments?.map(a => a.content_id) || []),
        ...(groupAssignments?.map(a => a.content_id) || []),
      ]);

      const filtered = allContents.filter(c => contentIds.has(c.id));
      setContents(filtered);
    } catch (error) {
      console.error('Error filtering contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      let query = supabase
        .from('webwijzer_content')
        .select('*');

      if (showOnlyMyContent) {
        query = query.eq('user_id', user.id);
      } else if (schoolIds.length > 0) {
        const { data: schoolUsers } = await supabase
          .from('user_schools')
          .select('user_id')
          .in('school_id', schoolIds);

        const userIds = schoolUsers?.map(su => su.user_id) || [];
        query = query.in('user_id', userIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const contentsWithStats = await Promise.all(
        (data || []).map(async (content) => {
          const { data: directAssignments } = await supabase
            .from('webwijzer_assignments')
            .select('assignable_id, assignable_type')
            .eq('content_id', content.id);

          const studentIds = new Set<string>();

          for (const assignment of directAssignments || []) {
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

          const { count: viewCount } = await supabase
            .from('webwijzer_usage')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', content.id);

          const { data: settingsCounts } = await supabase
            .from('webwijzer_assignments')
            .select('is_push, is_favorite')
            .eq('content_id', content.id);

          const pushCount = settingsCounts?.filter(s => s.is_push).length || 0;
          const favoriteCount = settingsCounts?.filter(s => s.is_favorite).length || 0;

          return {
            ...content,
            student_count: studentIds.size,
            total_views: viewCount || 0,
            push_count: pushCount,
            favorite_count: favoriteCount,
          };
        })
      );

      setAllContents(contentsWithStats);
      setContents(contentsWithStats);
    } catch (error) {
      console.error('Error fetching contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content? This will also remove all assignments.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('webwijzer_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingContent(null);
    fetchContents();
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
        return <Link className="w-5 h-5" />;
    }
  };

  if (showForm || editingContent) {
    return (
      <WebWijzerContentForm
        content={editingContent}
        onClose={handleFormClose}
      />
    );
  }

  if (selectedContent && viewMode === 'assign') {
    return (
      <WebWijzerAssignments
        content={selectedContent}
        onBack={() => {
          setSelectedContent(null);
          fetchContents();
        }}
      />
    );
  }

  if (viewMode === 'analytics') {
    return (
      <WebWijzerAnalytics
        onBack={() => {
          setViewMode('assign');
          setSelectedContent(null);
        }}
      />
    );
  }

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.student_number || ''}`
      .toLowerCase()
      .includes(studentSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WebWijzer</h1>
          <p className="text-gray-600 mt-1">Share content with students using QR codes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setViewMode('analytics')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyMyContent}
                onChange={(e) => {
                  setShowOnlyMyContent(e.target.checked);
                  fetchContents();
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show only my content
              </span>
            </label>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex-1 relative">
            <Input
              placeholder="Filter by student..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
            />
            {studentSearchTerm && filteredStudents.length > 0 && !selectedStudent && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setStudentSearchTerm('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.student_number && (
                        <p className="text-sm text-gray-500">#{student.student_number}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedStudent && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </span>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 hover:bg-blue-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-blue-700" />
              </button>
            </div>
          )}
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading content...</p>
        </div>
      ) : contents.length === 0 ? (
        <Card className="text-center py-12">
          <Link className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-600 mb-6">Create your first content item to share with students</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((content) => (
            <Card key={content.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: content.color + '20' }}
                >
                  {content.symbol}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingContent(content)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit content"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(content.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete content"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{content.title}</h3>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                {getContentIcon(content.content_type)}
                <span className="capitalize">{content.content_type}</span>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{content.student_count || 0}</span>
                  <span className="text-gray-600">students</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{content.total_views || 0}</span>
                  <span className="text-gray-600">views</span>
                </div>
              </div>

              {/* Badges */}
              {(content.push_count! > 0 || content.favorite_count! > 0) && (
                <div className="flex gap-2 mb-4">
                  {content.push_count! > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                      <Zap className="w-3 h-3" />
                      {content.push_count} Push
                    </span>
                  )}
                  {content.favorite_count! > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">
                      <Star className="w-3 h-3" />
                      {content.favorite_count} Favorite
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedContent(content);
                    setViewMode('assign');
                  }}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Assign
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedContent(content);
                    setViewMode('analytics');
                  }}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Analytics
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
