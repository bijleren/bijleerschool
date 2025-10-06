import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Link, Plus, Video, FileText, ExternalLink, Trash2, Edit2 } from 'lucide-react';
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
}

export function WebWijzerTab() {
  const { user } = useAuth();
  const [contents, setContents] = useState<WebWijzerContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<WebWijzerContent | null>(null);
  const [selectedContent, setSelectedContent] = useState<WebWijzerContent | null>(null);

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
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content? This will also remove all assignments.')) {
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

  if (selectedContent) {
    return (
      <WebWijzerAssignments
        content={selectedContent}
        onBack={() => setSelectedContent(null)}
      />
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
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(content.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
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

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setSelectedContent(content)}
              >
                Assign to Students/Groups
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
