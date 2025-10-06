import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Star, Zap, X, Archive, LogOut } from 'lucide-react';
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
    has_date_limit: boolean;
    available_from: string | null;
    available_until: string | null;
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
  const [archivedAssignments, setArchivedAssignments] = useState<ContentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentAssignment | null>(null);
  const [pushQueue, setPushQueue] = useState<ContentAssignment[]>([]);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushCountdown, setPushCountdown] = useState(5);
  const [pushCancelled, setPushCancelled] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(30 * 60);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 15000);
    return () => clearInterval(interval);
  }, [studentId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimer((prev) => {
        if (prev <= 1) {
          handleLogout();
          return 0;
        }
        if (prev === 11 && !showTimeoutWarning) {
          setShowTimeoutWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showTimeoutWarning]);

  const handleExtendSession = () => {
    setSessionTimer(30 * 60);
    setShowTimeoutWarning(false);
  };

  const handleLogout = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    }
  };

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

  const isContentAvailable = (content: ContentAssignment['webwijzer_content']): boolean => {
    if (!content.has_date_limit) return true;

    const now = new Date();
    if (content.available_from && new Date(content.available_from) > now) return false;
    if (content.available_until && new Date(content.available_until) < now) return false;

    return true;
  };

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
            color,
            has_date_limit,
            available_from,
            available_until
          )
        `)
        .eq('assignable_type', 'student')
        .eq('assignable_id', studentId);

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
              color,
              has_date_limit,
              available_from,
              available_until
            )
          `)
          .eq('assignable_type', 'group')
          .in('assignable_id', groupIds);

        if (error) throw error;
        groupAssignments = data || [];
      }

      const allAssignments = [...(directAssignments || []), ...groupAssignments];

      const contentMap = new Map<string, ContentAssignment>();
      allAssignments.forEach(assignment => {
        const contentId = assignment.webwijzer_content.id;
        if (!contentMap.has(contentId)) {
          contentMap.set(contentId, assignment);
        } else {
          const existing = contentMap.get(contentId)!;
          existing.is_push = existing.is_push || assignment.is_push;
          existing.is_favorite = existing.is_favorite || assignment.is_favorite;
          existing.push_completed = existing.push_completed && assignment.push_completed;
        }
      });

      const uniqueAssignments = Array.from(contentMap.values());

      const activeAssignments = uniqueAssignments.filter(a => {
        if (a.is_archived) return false;
        const isAvailable = isContentAvailable(a.webwijzer_content);
        const hasReachedLimit = a.click_limit && a.clicks_used >= a.click_limit;
        return isAvailable && !hasReachedLimit;
      });

      const archived = uniqueAssignments.filter(a => {
        if (a.is_archived) return true;
        const isAvailable = isContentAvailable(a.webwijzer_content);
        const hasReachedLimit = a.click_limit && a.clicks_used >= a.click_limit;
        return !isAvailable || hasReachedLimit;
      });

      setAssignments(activeAssignments);
      setArchivedAssignments(archived);

      const newPushItems = activeAssignments.filter(
        a => a.is_push && !a.push_completed && !a.is_archived
      );
      setPushQueue(newPushItems);

      setLoading(false);
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

  const pushAssignments = assignments.filter(a => a.is_push && !a.push_completed);
  const favoriteAssignments = assignments.filter(a => a.is_favorite).sort((a, b) => {
    return new Date(b.webwijzer_content.id).getTime() - new Date(a.webwijzer_content.id).getTime();
  });
  const activeContent = assignments
    .filter(a => (!a.is_push || a.push_completed) && !a.is_favorite)
    .sort((a, b) => {
      return new Date(b.webwijzer_content.id).getTime() - new Date(a.webwijzer_content.id).getTime();
    });

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
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Session Timeout Warning
              </h2>
              <p className="text-gray-600 mb-6">
                Your session will expire in 10 seconds. Would you like to continue?
              </p>
              <div className="flex gap-4">
                <Button onClick={handleLogout} variant="secondary" className="flex-1">
                  Log Out
                </Button>
                <Button onClick={handleExtendSession} className="flex-1">
                  Continue Session
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

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

      {showArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Archived Content</h2>
              <Button variant="secondary" onClick={() => setShowArchive(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {archivedAssignments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No archived content</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {archivedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-6 bg-gray-50 rounded-2xl opacity-60"
                    style={{ borderTop: `6px solid ${assignment.webwijzer_content.color}` }}
                  >
                    <div
                      className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                      style={{ backgroundColor: assignment.webwijzer_content.color + '20' }}
                    >
                      {assignment.webwijzer_content.symbol}
                    </div>
                    <h3 className="text-xl font-bold text-gray-600 text-center">
                      {assignment.webwijzer_content.title}
                    </h3>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      {assignment.click_limit && assignment.clicks_used >= assignment.click_limit
                        ? 'View limit reached'
                        : 'No longer available'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleLogout}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Stop
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hello, {studentName}! 👋
          </h1>
          <p className="text-gray-600">Your learning content is ready</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {pushAssignments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-6 h-6 text-orange-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Push Content</h2>
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {pushAssignments.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {pushAssignments.map((assignment) => (
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
                      <h3 className="text-lg font-bold text-gray-900 text-center">
                        {assignment.webwijzer_content.title}
                      </h3>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Content</h2>
                {activeContent.length === 0 ? (
                  <Card className="text-center py-12">
                    <p className="text-xl text-gray-600">No content available</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {activeContent.map((assignment) => (
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
                        <h3 className="text-lg font-bold text-gray-900 text-center">
                          {assignment.webwijzer_content.title}
                        </h3>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Favorites</h2>
                </div>
                {favoriteAssignments.length === 0 ? (
                  <Card className="text-center py-12">
                    <p className="text-xl text-gray-600">No favorite content</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {favoriteAssignments.map((assignment) => (
                      <button
                        key={assignment.id}
                        onClick={() => handleContentClick(assignment)}
                        className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 relative"
                        style={{ borderTop: `6px solid ${assignment.webwijzer_content.color}` }}
                      >
                        <Star className="w-5 h-5 text-yellow-500 absolute top-2 right-2 fill-yellow-500" />
                        <div
                          className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                          style={{ backgroundColor: assignment.webwijzer_content.color + '20' }}
                        >
                          {assignment.webwijzer_content.symbol}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 text-center">
                          {assignment.webwijzer_content.title}
                        </h3>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {archivedAssignments.length > 0 && (
          <div className="fixed bottom-6 right-6">
            <Button
              onClick={() => setShowArchive(true)}
              variant="secondary"
              className="flex items-center gap-2 shadow-lg"
            >
              <Archive className="w-4 h-4" />
              Archive ({archivedAssignments.length})
            </Button>
          </div>
        )}

        {user && onBackToDashboard && (
          <div className="fixed bottom-6 left-6">
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
