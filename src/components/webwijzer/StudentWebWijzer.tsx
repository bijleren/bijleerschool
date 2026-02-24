import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Star, Zap, X, Archive, LogOut, BookOpen, Grid, Search, Clock } from 'lucide-react';
import { WebWijzerContentViewer } from './WebWijzerContentViewer';
import { StudentBibliotheekModal } from './StudentBibliotheekModal';
import { StudentActiviTijdModal } from './StudentActiviTijdModal';
import { StudentZoekerModal } from '../zoeker/StudentZoekerModal';
import { BoardSelectionModal } from '../activityboard/BoardSelectionModal';
import { SwitchBoardModal } from '../activityboard/SwitchBoardModal';
import { useFocusTrap } from '../../hooks/useFocusTrap';

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
  onStop?: () => void;
}

export function StudentWebWijzer({ studentId, studentName, onBackToDashboard, onStop }: StudentWebWijzerProps) {
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
  const [showBibliotheek, setShowBibliotheek] = useState(false);
  const [showActiviTijd, setShowActiviTijd] = useState(false);
  const [showZoeker, setShowZoeker] = useState(false);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [availableBoards, setAvailableBoards] = useState<any[]>([]);
  const [showBoardSelection, setShowBoardSelection] = useState(false);
  const [switchingToBoard, setSwitchingToBoard] = useState<{id: string; name: string} | null>(null);
  const [currentBoardName, setCurrentBoardName] = useState<string>('');
  const [showDeactivationNotice, setShowDeactivationNotice] = useState(false);
  const [deactivationCountdown, setDeactivationCountdown] = useState(5);

  useEffect(() => {
    fetchAssignments();
    fetchStudentSchool();
    checkActiveBoard();

    const interval = setInterval(() => {
      fetchAssignments();
      checkActiveBoard();
    }, 15000);

    const subscription = supabase
      .channel('board_deactivation')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'activity_boards',
        filter: `id=eq.${activeBoard}`
      }, (payload) => {
        if (payload.new && !payload.new.is_active && activeBoard) {
          setShowDeactivationNotice(true);
          setDeactivationCountdown(5);
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [studentId, activeBoard]);

  const fetchStudentSchool = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', studentId)
        .maybeSingle();

      if (error) throw error;
      if (data) setSchoolId(data.school_id);
    } catch (error) {
      console.error('Error fetching student school:', error);
    }
  };

  const checkActiveBoard = async () => {
    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!student) return;

      const { data: studentGroups, error: groupsError } = await supabase
        .from('student_groups')
        .select('group_id')
        .eq('student_id', studentId)
        .eq('is_active', true);

      if (groupsError) throw groupsError;

      const studentGroupIds = studentGroups?.map(sg => sg.group_id) || [];

      const { data: currentSession, error: sessionError } = await supabase
        .from('activity_sessions')
        .select('board_id, activity_boards!inner(id, name, is_active, active_until)')
        .eq('student_id', studentId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      if (currentSession && currentSession.length > 0) {
        const session = currentSession[0];
        if (session.activity_boards?.is_active &&
            session.activity_boards?.active_until &&
            new Date(session.activity_boards.active_until) > new Date()) {
          setActiveBoard(session.board_id);
          setCurrentBoardName(session.activity_boards.name);
          return;
        }
      }

      const query = supabase
        .from('activity_boards')
        .select('id, name, description, active_until, board_icon, icon_url, student_group_ids, student_ids')
        .eq('is_active', true)
        .not('active_until', 'is', null)
        .gt('active_until', new Date().toISOString());

      const { data: boards, error: boardsError } = await query;
      if (boardsError) throw boardsError;

      const accessibleBoards = (boards || []).filter(board => {
        const hasGroupAccess = studentGroupIds.length > 0 &&
          board.student_group_ids &&
          board.student_group_ids.some(groupId => studentGroupIds.includes(groupId));

        const hasDirectAccess = board.student_ids &&
          board.student_ids.includes(studentId);

        return hasGroupAccess || hasDirectAccess;
      }).filter(board => {
        if (!board.active_until) return false;
        const remaining = new Date(board.active_until).getTime() - Date.now();
        return remaining > 300000;
      });

      setAvailableBoards(accessibleBoards);

      if (accessibleBoards.length === 1) {
        setActiveBoard(accessibleBoards[0].id);
        setCurrentBoardName(accessibleBoards[0].name);
      } else if (accessibleBoards.length > 1) {
        setActiveBoard(null);
      } else {
        setActiveBoard(null);
      }
    } catch (error) {
      console.error('Error checking active board:', error);
      setActiveBoard(null);
    }
  };

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
    if (onStop) {
      onStop();
    } else if (onBackToDashboard) {
      onBackToDashboard();
    }
  };

  useEffect(() => {
    if (showDeactivationNotice && deactivationCountdown > 0) {
      const timer = setTimeout(() => {
        setDeactivationCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showDeactivationNotice && deactivationCountdown === 0) {
      setShowDeactivationNotice(false);
      setActiveBoard(null);
      setShowActiviTijd(false);
      checkActiveBoard();
    }
  }, [showDeactivationNotice, deactivationCountdown]);

  const handleBoardSelect = (boardId: string) => {
    const selectedBoard = availableBoards.find(b => b.id === boardId);
    if (!selectedBoard) return;

    if (activeBoard && activeBoard !== boardId) {
      setSwitchingToBoard({ id: selectedBoard.id, name: selectedBoard.name });
      setShowBoardSelection(false);
    } else {
      setActiveBoard(boardId);
      setCurrentBoardName(selectedBoard.name);
      setShowBoardSelection(false);
      setShowActiviTijd(true);
    }
  };

  const handleStopAndSwitch = async () => {
    if (!switchingToBoard) return;

    try {
      await supabase
        .from('activity_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('board_id', activeBoard)
        .is('end_time', null);

      setActiveBoard(switchingToBoard.id);
      setCurrentBoardName(switchingToBoard.name);
      setSwitchingToBoard(null);
      setShowActiviTijd(true);
    } catch (error) {
      console.error('Error switching boards:', error);
    }
  };

  const handleActiviTijdClick = () => {
    if (availableBoards.length > 1 && !activeBoard) {
      setShowBoardSelection(true);
    } else if (activeBoard || availableBoards.length === 1) {
      setShowActiviTijd(true);
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
      console.log('Fetching assignments for student:', studentId);

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
      console.log('Direct assignments:', directAssignments);

      const { data: studentGroups, error: groupsError } = await supabase
        .from('student_groups')
        .select('group_id')
        .eq('student_id', studentId);

      if (groupsError) throw groupsError;
      console.log('Student groups:', studentGroups);

      const groupIds = studentGroups?.map(sg => sg.group_id) || [];
      console.log('Group IDs:', groupIds);

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
        console.log('Group assignments:', groupAssignments);
      }

      const allAssignments = [...(directAssignments || []), ...groupAssignments];
      console.log('All assignments combined:', allAssignments);

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
      console.log('Unique assignments:', uniqueAssignments);

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

      console.log('Active assignments:', activeAssignments);
      console.log('Archived assignments:', archived);

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

  const timeoutModalRef = useFocusTrap(showTimeoutWarning);
  const pushModalRef = useFocusTrap(showPushModal);
  const archiveModalRef = useFocusTrap(showArchive);
  const deactivationModalRef = useFocusTrap(showDeactivationNotice);

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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeout-modal-title"
          aria-describedby="timeout-modal-description"
        >
          <div ref={timeoutModalRef}>
            <Card className="max-w-md w-full">
              <div className="text-center">
                <h2 id="timeout-modal-title" className="text-2xl font-bold text-gray-900 mb-4">
                  Sessie verloopt bijna
                </h2>
                <p id="timeout-modal-description" className="text-gray-600 mb-6">
                  Je sessie verloopt over 10 seconden. Wil je doorgaan?
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={handleLogout}
                    variant="secondary"
                    className="flex-1"
                    aria-label="Sessie stoppen"
                  >
                    Stoppen
                  </Button>
                  <Button
                    onClick={handleExtendSession}
                    className="flex-1"
                    aria-label="Sessie verlengen met 30 minuten"
                  >
                    Doorgaan
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showPushModal && pushQueue.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="push-modal-title"
          aria-describedby="push-modal-description"
        >
          <div ref={pushModalRef}>
            <Card className="max-w-md w-full">
              <div className="text-center">
                <div
                  className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl"
                  style={{ backgroundColor: pushQueue[0].webwijzer_content.color + '20' }}
                  role="img"
                  aria-label={`Icoon voor ${pushQueue[0].webwijzer_content.title}`}
                >
                  {pushQueue[0].webwijzer_content.symbol}
                </div>
                <h2 id="push-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
                  {pushQueue[0].webwijzer_content.title}
                </h2>
                <p id="push-modal-description" className="text-gray-600 mb-6" aria-live="polite" aria-atomic="true">
                  Opent over {pushCountdown} seconden
                </p>
                <Button
                  onClick={handlePushCancel}
                  variant="secondary"
                  className="w-full"
                  data-close-modal="true"
                  aria-label="Push inhoud annuleren"
                >
                  Annuleren
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showArchive && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
        >
          <div ref={archiveModalRef}>
            <Card className="max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 id="archive-modal-title" className="text-2xl font-bold text-gray-900">
                  Gearchiveerde inhoud
                </h2>
                <Button
                  variant="secondary"
                  onClick={() => setShowArchive(false)}
                  data-close-modal="true"
                  aria-label="Archief sluiten"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">Sluiten</span>
                </Button>
              </div>
            {archivedAssignments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Geen gearchiveerde inhoud</p>
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
                        ? 'Limiet bereikt'
                        : 'Niet meer beschikbaar'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <nav aria-label="Hoofdnavigatie" className="flex justify-between items-center mb-4">
          <div className="flex gap-2" role="group" aria-label="Aanvullende functies">
            {schoolId && (
              <>
                <Button
                  onClick={() => setShowBibliotheek(true)}
                  variant="secondary"
                  className="flex items-center gap-2"
                  aria-label="Open bibliotheek voor boeken en materialen"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  Bibliotheek
                </Button>
                <Button
                  onClick={() => setShowZoeker(true)}
                  variant="secondary"
                  className="flex items-center gap-2"
                  aria-label="Open zoeker voor informatie zoeken"
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  Zoeker
                </Button>
              </>
            )}
            {(activeBoard || availableBoards.length > 0) && (
              <Button
                onClick={handleActiviTijdClick}
                variant="secondary"
                className="flex items-center gap-2"
                aria-label="Open Activi-tijd om activiteiten te kiezen"
              >
                <Grid className="w-4 h-4" aria-hidden="true" />
                Activi-tijd
              </Button>
            )}
          </div>
          <Button
            onClick={handleLogout}
            variant="secondary"
            className="flex items-center gap-2"
            aria-label="WebWijzer stoppen en uitloggen"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Stop
          </Button>
        </nav>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hallo, {studentName}! 👋
          </h1>
          <p className="text-gray-600">Je leerinhoud staat klaar</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {pushAssignments.length > 0 && (
              <section aria-labelledby="push-content-heading">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-6 h-6 text-orange-500" aria-hidden="true" />
                  <h2 id="push-content-heading" className="text-2xl font-bold text-gray-900">
                    Push inhoud
                  </h2>
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium" aria-label={`${pushAssignments.length} push items`}>
                    {pushAssignments.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" role="list">
                  {pushAssignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      onClick={() => handleContentClick(assignment)}
                      className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 focus:ring-4 focus:ring-orange-300 focus:outline-none"
                      style={{ borderTop: `6px solid ${assignment.webwijzer_content.color}` }}
                      aria-label={`Open ${assignment.webwijzer_content.title}`}
                      role="listitem"
                    >
                      <div
                        className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                        style={{ backgroundColor: assignment.webwijzer_content.color + '20' }}
                        aria-hidden="true"
                      >
                        {assignment.webwijzer_content.symbol}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 text-center">
                        {assignment.webwijzer_content.title}
                      </h3>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section aria-labelledby="active-content-heading">
                <h2 id="active-content-heading" className="text-2xl font-bold text-gray-900 mb-4">
                  Actieve inhoud
                </h2>
                {activeContent.length === 0 ? (
                  <Card className="text-center py-12">
                    <p className="text-xl text-gray-600">Geen inhoud beschikbaar</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-4" role="list">
                    {activeContent.map((assignment) => (
                      <button
                        key={assignment.id}
                        onClick={() => handleContentClick(assignment)}
                        className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 focus:ring-4 focus:ring-blue-300 focus:outline-none"
                        style={{ borderTop: `6px solid ${assignment.webwijzer_content.color}` }}
                        aria-label={`Open ${assignment.webwijzer_content.title}`}
                        role="listitem"
                      >
                        <div
                          className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                          style={{ backgroundColor: assignment.webwijzer_content.color + '20' }}
                          aria-hidden="true"
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
              </section>

              <section aria-labelledby="favorites-heading">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-6 h-6 text-yellow-500" aria-hidden="true" />
                  <h2 id="favorites-heading" className="text-2xl font-bold text-gray-900">
                    Favorieten
                  </h2>
                </div>
                {favoriteAssignments.length === 0 ? (
                  <Card className="text-center py-12">
                    <p className="text-xl text-gray-600">Geen favoriete inhoud</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-4" role="list">
                    {favoriteAssignments.map((assignment) => (
                      <button
                        key={assignment.id}
                        onClick={() => handleContentClick(assignment)}
                        className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 relative focus:ring-4 focus:ring-yellow-300 focus:outline-none"
                        style={{ borderTop: `6px solid ${assignment.webwijzer_content.color}` }}
                        aria-label={`Open favoriet ${assignment.webwijzer_content.title}`}
                        role="listitem"
                      >
                        <Star className="w-5 h-5 text-yellow-500 absolute top-2 right-2 fill-yellow-500" aria-hidden="true" />
                        <div
                          className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                          style={{ backgroundColor: assignment.webwijzer_content.color + '20' }}
                          aria-hidden="true"
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
              </section>
            </div>
          </div>
        )}

        {archivedAssignments.length > 0 && (
          <div className="fixed bottom-6 right-6">
            <Button
              onClick={() => setShowArchive(true)}
              variant="secondary"
              className="flex items-center gap-2 shadow-lg"
              aria-label={`Open archief met ${archivedAssignments.length} gearchiveerde items`}
            >
              <Archive className="w-4 h-4" aria-hidden="true" />
              Archief ({archivedAssignments.length})
            </Button>
          </div>
        )}

        {user && onBackToDashboard && (
          <div className="fixed bottom-6 left-6">
            <Button
              onClick={onBackToDashboard}
              variant="secondary"
              aria-label="Terug naar leerkracht dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Terug naar Dashboard
            </Button>
          </div>
        )}
      </div>

      {showBibliotheek && schoolId && (
        <StudentBibliotheekModal
          studentId={studentId}
          schoolId={schoolId}
          onClose={() => setShowBibliotheek(false)}
        />
      )}

      {showActiviTijd && activeBoard && (
        <StudentActiviTijdModal
          studentId={studentId}
          boardId={activeBoard}
          onClose={() => setShowActiviTijd(false)}
        />
      )}

      {showBoardSelection && (
        <BoardSelectionModal
          boards={availableBoards}
          onSelectBoard={handleBoardSelect}
          onClose={() => setShowBoardSelection(false)}
        />
      )}

      {switchingToBoard && (
        <SwitchBoardModal
          currentBoardName={currentBoardName}
          newBoardName={switchingToBoard.name}
          onClose={() => setSwitchingToBoard(null)}
          onStopAndSwitch={handleStopAndSwitch}
        />
      )}

      {showDeactivationNotice && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivation-modal-title"
          aria-describedby="deactivation-modal-description"
        >
          <div ref={deactivationModalRef}>
            <Card className="max-w-md w-full">
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-orange-600" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="deactivation-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
                    Les Beëindigd
                  </h2>
                  <p id="deactivation-modal-description" className="text-gray-600">
                    Dit activiteitenbord is beëindigd door je leerkracht
                  </p>
                </div>
                <div className="text-4xl font-bold text-blue-600" aria-live="polite" aria-atomic="true">
                  {deactivationCountdown}
                </div>
                <Button
                  onClick={() => {
                    setShowDeactivationNotice(false);
                    setActiveBoard(null);
                    setShowActiviTijd(false);
                    checkActiveBoard();
                  }}
                  className="w-full"
                  aria-label="Terug naar overzicht gaan"
                >
                  Terug naar Overzicht
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showZoeker && schoolId && (
        <StudentZoekerModal
          studentId={studentId}
          schoolId={schoolId}
          studentName={studentName}
          onClose={() => setShowZoeker(false)}
        />
      )}
    </div>
  );
}
