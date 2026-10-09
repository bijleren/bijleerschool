import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Star, Zap, X, Archive, LogOut, BookOpen, Grid2x2 as Grid, Search, Clock, LogIn, FileText, Clapperboard } from 'lucide-react';
import { WebWijzerContentViewer } from './WebWijzerContentViewer';
import { StudentBibliotheekModal } from './StudentBibliotheekModal';
import { StudentActiviTijdModal } from './StudentActiviTijdModal';
import { StudentLoginModal } from './StudentLoginModal';
import { StudentZoekerModal } from '../zoeker/StudentZoekerModal';
import { BoardSelectionModal } from '../activityboard/BoardSelectionModal';
import { SwitchBoardModal } from '../activityboard/SwitchBoardModal';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { VideolerenFrame } from '../videoleren/VideolerenFrame';

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
  /** Set when the student logged in on the public WebWijzer. Data then comes through
   *  the hash-checked webwijzer_* functions; without it (teacher preview) the direct
   *  queries below are used, as before. */
  accessHash?: string;
  /** share_code from a printed Videoleren worksheet (?vl=…): open that task right away. */
  openVideoleerCode?: string;
  onBackToDashboard?: () => void;
  onStop?: () => void;
}

interface StudentLogin {
  id: string;
  label: string;
  url: string;
  username: string;
}

interface VideoleerTask { id: string; title: string; deadline: string; werkvormen: number; klaar: number }

export function StudentWebWijzer({ studentId, studentName, accessHash, openVideoleerCode, onBackToDashboard, onStop }: StudentWebWijzerProps) {
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
  const [studentLogins, setStudentLogins] = useState<StudentLogin[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [schoolHasBooks, setSchoolHasBooks] = useState(false);
  const [schoolHasZoeker, setSchoolHasZoeker] = useState(false); // schools.zoeker_enabled
  const [showFiches, setShowFiches] = useState(false);
  const [videoleerTasks, setVideoleerTasks] = useState<VideoleerTask[]>([]);
  const [showVideoleerList, setShowVideoleerList] = useState(false);
  const [videoleerOpen, setVideoleerOpen] = useState<{ taskId?: string; shareCode?: string } | null>(
    accessHash && openVideoleerCode ? { shareCode: openVideoleerCode } : null
  );
  const schoolIdRef = React.useRef<string | null>(null);
  const [studentFiches, setStudentFiches] = useState<{ id: string; title: string; description: string | null; file_url: string | null; file_name: string | null; file_type: string | null; hulpfiche_vakken: { vak_name: string }[]; hulpfiche_leerjaren: { leerjaar: string }[] }[]>([]);

  useEffect(() => {
    fetchStudentLogins();
  }, [studentId]);

  useEffect(() => {
    fetchAssignments();
    fetchStudentSchool();
    fetchStudentFiches();
    checkActiveBoard();
    fetchVideoleerTasks();

    const interval = setInterval(() => {
      fetchAssignments();
      checkActiveBoard();
      fetchVideoleerTasks();
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

  const fetchVideoleerTasks = async () => {
    if (!accessHash) return;
    const { data, error } = await supabase.rpc('videoleren_student_tasks', { p_hash: accessHash });
    if (!error && Array.isArray(data)) setVideoleerTasks(data as VideoleerTask[]);
  };

  // School id via the hash-checked profile (public login) or directly (teacher preview).
  const getSchoolId = async (): Promise<string | null> => {
    if (schoolIdRef.current) return schoolIdRef.current;
    if (accessHash) {
      const { data } = await supabase.rpc('webwijzer_student_profile', { p_hash: accessHash });
      schoolIdRef.current = (data as { school_id?: string } | null)?.school_id ?? null;
    } else {
      const { data } = await supabase.from('students').select('school_id').eq('id', studentId).maybeSingle();
      schoolIdRef.current = data?.school_id ?? null;
    }
    return schoolIdRef.current;
  };

  const fetchStudentLogins = async () => {
    if (accessHash) {
      const { data, error } = await supabase.rpc('webwijzer_student_logins', { p_hash: accessHash });
      if (error) console.error('Error fetching student logins:', error);
      else setStudentLogins((data as StudentLogin[]) || []);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('student_logins')
        .select('id, label, url, username')
        .eq('student_id', studentId)
        .order('created_at');
      if (error) {
        console.error('Error fetching student logins:', error);
      } else {
        setStudentLogins(data || []);
      }
    } catch (err) {
      console.error('Student logins fetch failed:', err);
    }
  };

  const fetchStudentSchool = async () => {
    if (accessHash) {
      const { data, error } = await supabase.rpc('webwijzer_student_profile', { p_hash: accessHash });
      if (error || !data) { console.error('Error fetching student school:', error); return; }
      const profile = data as { school_id: string | null; zoeker_enabled?: boolean; has_books: boolean };
      if (profile.school_id) {
        schoolIdRef.current = profile.school_id;
        setSchoolId(profile.school_id);
        setSchoolHasBooks(!!profile.has_books);
        setSchoolHasZoeker(!!profile.zoeker_enabled);
      }
      return;
    }
    try {
      const { data, error } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', studentId)
        .maybeSingle();

      if (error) throw error;
      if (data?.school_id) {
        setSchoolId(data.school_id);

        const [booksResult, schoolResult] = await Promise.all([
          supabase
            .from('books')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', data.school_id),
          supabase
            .from('schools')
            .select('zoeker_enabled')
            .eq('id', data.school_id)
            .maybeSingle(),
        ]);

        setSchoolHasBooks((booksResult.count ?? 0) > 0);
        setSchoolHasZoeker(!!schoolResult.data?.zoeker_enabled);
      }
    } catch (error) {
      console.error('Error fetching student school:', error);
    }
  };

  const fetchStudentFiches = async () => {
    try {
      // Get groups the student belongs to
      const { data: groupData } = await supabase
        .from('student_groups')
        .select('group_id')
        .eq('student_id', studentId)
        .eq('is_active', true);
      const groupIds = (groupData || []).map((g: { group_id: string }) => g.group_id);

      // Fetch fiches assigned to this student or their groups, that are visible
      const studentAssigned = await supabase
        .from('hulpfiche_assignments')
        .select('fiche_id')
        .eq('assignable_type', 'student')
        .eq('assignable_id', studentId);

      const groupAssigned = groupIds.length > 0
        ? await supabase
            .from('hulpfiche_assignments')
            .select('fiche_id')
            .eq('assignable_type', 'group')
            .in('assignable_id', groupIds)
        : { data: [] };

      const ficheIds = [
        ...((studentAssigned.data || []).map((r: { fiche_id: string }) => r.fiche_id)),
        ...((groupAssigned.data || []).map((r: { fiche_id: string }) => r.fiche_id)),
      ];
      const uniqueIds = [...new Set(ficheIds)];

      if (uniqueIds.length === 0) { setStudentFiches([]); return; }

      const { data: fichesData } = await supabase
        .from('hulpfiches')
        .select('id, title, description, file_url, file_name, file_type, hulpfiche_vakken(vak_name), hulpfiche_leerjaren(leerjaar)')
        .in('id', uniqueIds)
        .eq('is_visible_to_students', true);

      setStudentFiches(fichesData || []);
    } catch {
      // non-critical
    }
  };

  const checkActiveBoard = async () => {
    try {
      if (!accessHash) {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('id', studentId)
          .maybeSingle();

        if (studentError) throw studentError;
        if (!student) return;
      }

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

      const studentSchoolId = await getSchoolId();

      const boardQuery = supabase
        .from('activity_boards')
        .select('id, name, description, active_until, board_icon, icon_url, student_group_ids, student_ids')
        .eq('is_active', true)
        .not('active_until', 'is', null)
        .gt('active_until', new Date().toISOString());

      if (studentSchoolId) {
        boardQuery.eq('school_id', studentSchoolId);
      }

      const { data: boards, error: boardsError } = await boardQuery;
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
      if (videoleerOpenRef.current) return; // working in Videoleren counts as active
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

  const videoleerOpenRef = React.useRef(false);
  videoleerOpenRef.current = !!videoleerOpen;

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
      let allAssignments: ContentAssignment[];
      if (accessHash) {
        const { data, error } = await supabase.rpc('webwijzer_student_assignments', { p_hash: accessHash });
        if (error) throw error;
        allAssignments = (data as ContentAssignment[] | null) || [];
      } else {
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

      allAssignments = [...(directAssignments || []), ...groupAssignments];
      console.log('All assignments combined:', allAssignments);
      }

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
    if (accessHash) {
      const { error } = await supabase.rpc('webwijzer_complete_push', { p_hash: accessHash, p_assignment_id: assignmentId });
      if (error) console.error('Error marking push as completed:', error);
      return;
    }
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
    if (accessHash) {
      const { error } = await supabase.rpc('webwijzer_track_usage', { p_hash: accessHash, p_assignment_id: assignmentId });
      if (error) console.error('Error tracking usage:', error);
      fetchAssignments();
      return;
    }
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

  if (videoleerOpen && accessHash) {
    return (
      <VideolerenFrame
        mode="student"
        hash={accessHash}
        taskId={videoleerOpen.taskId}
        shareCode={videoleerOpen.shareCode}
        onClose={() => { setVideoleerOpen(null); fetchVideoleerTasks(); }}
      />
    );
  }

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
                  {schoolHasBooks && (
                  <Button
                    onClick={() => setShowBibliotheek(true)}
                    variant="secondary"
                    className="flex items-center gap-2"
                    aria-label="Open bibliotheek voor boeken en materialen"
                  >
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    Bibliotheek
                  </Button>
                )}
                {schoolHasZoeker && (
                  <Button
                    onClick={() => setShowZoeker(true)}
                    variant="secondary"
                    className="flex items-center gap-2"
                    aria-label="Open zoeker voor informatie zoeken"
                  >
                    <Search className="w-4 h-4" aria-hidden="true" />
                    Zoeker
                  </Button>
                )}
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
            {videoleerTasks.length > 0 && (
              <Button
                onClick={() => videoleerTasks.length === 1 ? setVideoleerOpen({ taskId: videoleerTasks[0].id }) : setShowVideoleerList(true)}
                variant="secondary"
                className="flex items-center gap-2"
                aria-label="Open je videoleertaken"
              >
                <Clapperboard className="w-4 h-4" aria-hidden="true" />
                Videoleren
                <span className="bg-blue-600 text-white rounded-full text-xs px-2 py-0.5">{videoleerTasks.length}</span>
              </Button>
            )}
            {studentFiches.length > 0 && (
              <Button
                onClick={() => setShowFiches(true)}
                variant="secondary"
                className="flex items-center gap-2"
                aria-label="Open fiches"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                Fiches
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {studentLogins.length > 0 && (
              <Button
                onClick={() => setShowLoginModal(true)}
                variant="secondary"
                className="flex items-center gap-2"
                aria-label="Open logins overzicht"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Logins
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="secondary"
              className="flex items-center gap-2"
              aria-label="WebWijzer stoppen en uitloggen"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Stop
            </Button>
          </div>
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

      {showLoginModal && (
        <StudentLoginModal
          logins={studentLogins}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {showVideoleerList && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="videoleren-modal-title">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 id="videoleren-modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clapperboard className="w-5 h-5 text-gray-600" />
                Mijn videoleertaken
              </h2>
              <button onClick={() => setShowVideoleerList(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Sluiten">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {videoleerTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setShowVideoleerList(false); setVideoleerOpen({ taskId: t.id }); }}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <p className="font-bold text-gray-900">{t.title}</p>
                  <p className="text-sm text-gray-500">
                    {t.klaar} van {t.werkvormen} taken klaar · inleveren tegen {new Date(t.deadline).toLocaleString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showFiches && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fiches-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 id="fiches-modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Mijn Fiches
              </h2>
              <button
                onClick={() => setShowFiches(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Sluiten"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {Object.entries(
                studentFiches.reduce((acc, f) => {
                  const vakken = f.hulpfiche_vakken.map(v => v.vak_name);
                  const keys = vakken.length > 0 ? vakken : ['Algemeen'];
                  keys.forEach(vak => {
                    if (!acc[vak]) acc[vak] = [];
                    acc[vak].push(f);
                  });
                  return acc;
                }, {} as Record<string, typeof studentFiches>)
              ).sort(([a], [b]) => a.localeCompare(b)).map(([vak, vakFiches]) => (
                <div key={vak}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 py-2">{vak}</p>
                  {vakFiches.map(fiche => (
                    <div key={fiche.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {fiche.file_type?.includes('image') && fiche.file_url ? (
                          <img src={fiche.file_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{fiche.title}</p>
                        {fiche.description && (
                          <p className="text-xs text-gray-500 truncate">{fiche.description}</p>
                        )}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {fiche.hulpfiche_leerjaren.map(l => (
                            <span key={l.leerjaar} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                              {l.leerjaar}
                            </span>
                          ))}
                        </div>
                      </div>
                      {fiche.file_url && (
                        <a
                          href={fiche.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          aria-label={`Open ${fiche.title}`}
                        >
                          Openen
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowFiches(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
