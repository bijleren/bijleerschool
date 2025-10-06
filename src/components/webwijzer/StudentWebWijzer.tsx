import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Star, Zap, X } from 'lucide-react';
import { WebWijzerContentViewer } from './WebWijzerContentViewer';

interface ContentAssignment {
  id: string;
  is_push: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  push_completed: boolean;
  clicks_used: number;
  click_limit: number | null;
  webwijzer_content: {
    id: string;
    title: string;
    content_type: 'video' | 'file' | 'link';
    content_url: string;
    symbol: string;
    color: string;
  };
}

interface StudentWebWijzerProps {
  studentId: string;
  studentName: string;
  onBackToDashboard?: () => void;
}

export function StudentWebWijzer({ studentId, studentName, onBackToDashboard }: StudentWebWijzerProps) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ContentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'push' | 'favorites' | 'all'>('push');
  const [selectedContent, setSelectedContent] = useState<ContentAssignment | null>(null);
  const [pushQueue, setPushQueue] = useState<ContentAssignment[]>([]);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushCountdown, setPushCountdown] = useState(5);
  const [pushCancelled, setPushCancelled] = useState(false);

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 15000);
    return () => clearInterval(interval);
  }, [studentId]);

  useEffect(() => {
    if (pushQueue.length > 0 && !showPushModal && !pushCancelled) {
      setShowPushModal(true);
      setPushCountdown(5);
    }
  }, [pushQueue, showPushModal, pushCancelled]);

  useEffect(() => {
    if (showPushModal && pushCountdown > 0) {
      const timer = setTimeout(() => setPushCountdown(pushCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showPushModal && pushCountdown === 0 && !pushCancelled) {
      handlePushOpen();
    }
  }, [showPushModal, pushCountdown, pushCancelled]);

  const fetchAssignments = async () => {
    try {
      const { data: directAssignments, error: directError } = await supabase
        .from('webwijzer_assignments')
        .select(`
          id,
          is_push,
          is_favorite,
          is_archived,
          push_completed,
          clicks_used,
          click_limit,
          webwijzer_content (
            id,
            title,
            content_type,
            content_url,
            symbol,
            color
          )
        `)
        .eq('assignable_type', 'student')
        .eq('assignable_id', studentId)
        .eq('is_archived', false);

      if (directError) throw directError;

      const { data: studentGroups, error: groupsError } = await supabase
        .from('student_groups')
        .select('group_id')
        .eq('student_id', studentId);

      if (groupsError) throw groupsError;

      const groupIds = studentGroups?.map(sg => sg.group_id) || [];

      let groupAssignments: any[] = [];
      if (groupIds.length > 0) {
        const { data, error } = await supabase
          .from('webwijzer_assignments')
          .select(`
            id,
            is_push,
            is_favorite,
            is_archived,
            push_completed,
            clicks_used,
            click_limit,
            webwijzer_content (
              id,
              title,
              content_type,
              content_url,
              symbol,
              color
            )
          `)
          .eq('assignable_type', 'group')
          .in('assignable_id', groupIds)
          .eq('is_archived', false);

        if (error) throw error;
        groupAssignments = data || [];
      }

      const allAssignments = [...(directAssignments || []), ...groupAssignments];
      setAssignments(allAssignments);

      const newPushItems = allAssignments.filter(
        a => a.is_push && !a.push_completed && !a.is_archived
      );
      setPushQueue(newPushItems);

      if (allAssignments.length === 0) {
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setLoading(false);
    }
  };

  const handlePushOpen = async () => {
    if (pushQueue.length === 0) return;

    const currentPush = pushQueue[0];
    setShowPushModal(false);
    setPushCancelled(false);

    await markPushAsCompleted(currentPush.id);
    await trackUsage(currentPush.id);

    setSelectedContent(currentPush);
    setPushQueue(pushQueue.slice(1));
  };

  const handlePushCancel = () => {
    setPushCancelled(true);
    setShowPushModal(false);
    setPushCountdown(5);
  };

  const markPushAsCompleted = async (assignmentId: string) => {
    try {
      await supabase
        .from('webwijzer_assignments')
        .update({ push_completed: true })
        .eq('id', assignmentId);
    } catch (error) {
      console.error('Error marking push as completed:', error);
    }
  };

  const trackUsage = async (assignmentId: string) => {
    try {
      await supabase
        .from('webwijzer_usage')
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
        });

      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
        const newClicksUsed = assignment.clicks_used + 1;
        const updates: any = { clicks_used: newClicksUsed };

        if (assignment.click_limit && newClicksUsed >= assignment.click_limit) {
          updates.is_archived = true;
        }

        await supabase
          .from('webwijzer_assignments')
          .update(updates)
          .eq('id', assignmentId);

        fetchAssignments();
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  const handleContentClick = async (assignment: ContentAssignment) => {
    await trackUsage(assignment.id);
    setSelectedContent(assignment);
  };

  const filterAssignments = () => {
    switch (activeTab) {
      case 'push':
        return assignments.filter(a => a.is_push && !a.push_completed);
      case 'favorites':
        return assignments.filter(a => a.is_favorite);
      case 'all':
        return assignments;
      default:
        return assignments;
    }
  };

  const filteredAssignments = filterAssignments();

  if (selectedContent) {
    return (
      <WebWijzerContentViewer
        content={selectedContent.webwijzer_content}
        onClose={() => setSelectedContent(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      {showPushModal && pushQueue.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="text-center">
              <div
                className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl"
                style={{ backgroundColor: pushQueue[0].webwijzer_content.color + '20' }}
              >
                {pushQueue[0].webwijzer_content.symbol}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {pushQueue[0].webwijzer_content.title}
              </h2>
              <p className="text-gray-600 mb-6">Opening in {pushCountdown} seconds...</p>
              <Button onClick={handlePushCancel} variant="secondary" className="w-full">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hello, {studentName}! 👋
          </h1>
          <p className="text-gray-600">Your learning content is ready</p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={activeTab === 'push' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('push')}
            className="min-w-32"
          >
            <Zap className="w-4 h-4 mr-2" />
            Push
            {pushQueue.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
                {pushQueue.length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'favorites' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('favorites')}
            className="min-w-32"
          >
            <Star className="w-4 h-4 mr-2" />
            Favorites
          </Button>
          <Button
            variant={activeTab === 'all' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('all')}
            className="min-w-32"
          >
            All
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-2xl text-gray-600">No content available</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssignments.map((assignment) => (
              <button
                key={assignment.id}
                onClick={() => handleContentClick(assignment)}
                className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                style={{ borderTop: `6px solid ${assignment.webwijzer_content.color}` }}
              >
                <div
                  className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                  style={{ backgroundColor: assignment.webwijzer_content.color + '20' }}
                >
                  {assignment.webwijzer_content.symbol}
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center">
                  {assignment.webwijzer_content.title}
                </h3>
              </button>
            ))}
          </div>
        )}

        {user && onBackToDashboard && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
            <Button onClick={onBackToDashboard} variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
