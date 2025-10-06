import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Link, Plus, Video, FileText, ExternalLink, Trash2, CreditCard as Edit2, Users, BarChart3, Eye, Zap, Star } from 'lucide-react';
import { WebWijzerContentForm } from './WebWijzerContentForm';
import { WebWijzerAssignments } from './WebWijzerAssignments';

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

export function WebWijzerTab() {
  const { user } = useAuth();
  const [contents, setContents] = useState<WebWijzerContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<WebWijzerContent | null>(null);
  const [selectedContent, setSelectedContent] = useState<WebWijzerContent | null>(null);
  const [viewMode, setViewMode] = useState<'assign' | 'analytics'>('assign');

  useEffect(() => {
    if (user) {
      fetchContents();
    }
  }, [user]);

  const fetchContents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('webwijzer_content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch statistics for each content item
      const contentsWithStats = await Promise.all(
        (data || []).map(async (content) => {
          // Count unique students who have access (through direct assignment and groups)
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

          // Count total views
          const { count: viewCount } = await supabase
            .from('webwijzer_usage')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', content.id);

          // Count push and favorite assignments
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

  if (selectedContent && viewMode === 'analytics') {
    // Show analytics view - you can create a separate component for this later
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => {
            setSelectedContent(null);
            setViewMode('assign');
          }}>
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Analytics</h1>
            <p className="text-gray-600 mt-1">{selectedContent.title}</p>
          </div>
        </div>
        <Card className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Coming Soon</h3>
          <p className="text-gray-600">Detailed analytics for this content will be available here</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WebWijzer</h1>
          <p className="text-gray-600 mt-1">Share content with students using QR codes</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Content
        </Button>
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
