import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { StudentSelector } from './StudentSelector';
import { FeedbackModal } from './FeedbackModal';
import { BoardOptionsModal } from './BoardOptionsModal';
import { ActivitySelectionModal } from './ActivitySelectionModal';
import { UnassignedStudentsPanel } from './UnassignedStudentsPanel';
import { QRScanner } from './QRScanner';
import { ArrowLeft, Settings, Clock, Users, Plus, X, Grid, Book, Palette, Music, Pencil, Calculator, Gamepad2, Puzzle, Building, Trees, Scissors, Play, User, GraduationCap } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityBoard {
  id: string;
  name: string;
  description: string | null;
  school_id: string;
  is_active: boolean;
}

interface ActivityOption {
  id: string;
  board_id: string;
  name: string;
  description: string | null;
  max_students: number | null;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface ActivitySession {
  id: string;
  board_id: string;
  activity_option_id: string;
  student_id: string;
  start_time: string;
  end_time: string | null;
  students: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    color: string | null;
    symbol_url: string | null;
  };
}

interface ActivityBoardViewProps {
  board: ActivityBoard;
  onBack: () => void;
  onEdit: () => void;
}

const ICON_MAP: Record<string, any> = {
  Grid, Book, Palette, Music, Pencil, Calculator,
  Gamepad2, Puzzle, Building, Trees, Scissors, Play
};

function DroppableUnassignedPanel({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-panel',
    data: { type: 'unassigned-panel' }
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? 'ring-2 ring-blue-500' : ''}`}
    >
      {children}
    </div>
  );
}

function StudentSpot({
  session,
  activityColor,
  onClick,
  onRemove,
  activityId,
  spotIndex
}: {
  session: ActivitySession | null;
  activityColor: string;
  onClick: () => void;
  onRemove?: (session: ActivitySession) => void;
  activityId: string;
  spotIndex: number;
}) {
  if (!session) {
    return (
      <EmptySpot
        activityColor={activityColor}
        onClick={onClick}
        activityId={activityId}
        spotIndex={spotIndex}
      />
    );
  }

  return (
    <DraggableStudentSpot
      session={session}
      activityColor={activityColor}
      onClick={onClick}
      onRemove={onRemove}
      activityId={activityId}
    />
  );
}

function EmptySpot({
  activityColor,
  onClick,
  activityId,
  spotIndex
}: {
  activityColor: string;
  onClick: () => void;
  activityId: string;
  spotIndex: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-spot-${activityId}-${spotIndex}`,
    data: {
      type: 'empty-spot',
      activityId,
      spotIndex
    }
  });

  return (
    <div ref={setNodeRef}>
      <button
        onClick={onClick}
        className={`w-16 h-16 rounded-lg border-2 border-dashed transition-all flex items-center justify-center group ${
          isOver
            ? 'border-blue-500 bg-blue-100 scale-105'
            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
        }`}
      >
        <Plus className={`w-5 h-5 ${isOver ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
      </button>
    </div>
  );
}

function DraggableStudentSpot({
  session,
  activityColor,
  onClick,
  onRemove,
  activityId
}: {
  session: ActivitySession;
  activityColor: string;
  onClick: () => void;
  onRemove?: (session: ActivitySession) => void;
  activityId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `session-${session.id}`,
    data: {
      type: 'student-spot',
      session,
      activityId
    }
  });

  const getActivityDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}u ${mins}m`;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group cursor-grab active:cursor-grabbing"
    >
      <button
        onClick={onClick}
        className="w-16 h-16 rounded-lg border-2 border-gray-300 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: session.students.color || '#6B7280' }}
      >
        {session.students.profile_picture_url ? (
          <img
            src={session.students.profile_picture_url}
            alt={`${session.students.first_name}`}
            className="w-full h-full object-cover"
          />
        ) : session.students.symbol_url ? (
          <img
            src={session.students.symbol_url}
            alt={`${session.students.first_name}`}
            className="w-10 h-10 object-contain"
          />
        ) : (
          <span className="text-white text-sm font-bold">
            {session.students.first_name[0]}
            {session.students.last_name[0]}
          </span>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.(session);
        }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="absolute -bottom-1 left-0 right-0 bg-black bg-opacity-70 text-white text-[9px] text-center py-0.5 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
        {getActivityDuration(session.start_time)}
      </div>
    </div>
  );
}

export function ActivityBoardView({ board, onBack, onEdit }: ActivityBoardViewProps) {
  const { user } = useAuth();
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [showSelector, setShowSelector] = useState<{ option: ActivityOption; spotIndex?: number } | null>(null);
  const [feedbackSession, setFeedbackSession] = useState<ActivitySession | null>(null);
  const [switchToActivityId, setSwitchToActivityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'teacher' | 'student'>('teacher');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showUnassignedPanel, setShowUnassignedPanel] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<any | null>(null);
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchOptions();
    fetchActiveSessions();

    const channel = supabase
      .channel(`board-${board.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_sessions',
          filter: `board_id=eq.${board.id}`
        },
        (payload) => {
          console.log('Session change detected:', payload);
          fetchActiveSessions();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchActiveSessions();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [board.id]);

  useEffect(() => {
    fetchUnassignedStudents();
  }, [sessions]);

  const fetchOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_options')
        .select('*')
        .eq('board_id', board.id)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_sessions')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            profile_picture_url,
            color,
            symbol_url
          )
        `)
        .eq('board_id', board.id)
        .is('end_time', null)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchUnassignedStudents = async () => {
    try {
      const assignedStudentIds = sessions.map(s => s.student_id);

      const { data: students, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, profile_picture_url')
        .eq('school_id', board.school_id)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;

      const unassigned = (students || []).filter(
        student => !assignedStudentIds.includes(student.id)
      );

      setUnassignedStudents(unassigned);
    } catch (error) {
      console.error('Error fetching unassigned students:', error);
    }
  };

  const handleQRScan = async (url: string) => {
    try {
      const urlObj = new URL(url);
      const accessCode = urlObj.searchParams.get('code');

      if (!accessCode) {
        setToast({ message: 'Ongeldige QR-code', type: 'error' });
        return;
      }

      const { data, error } = await supabase
        .from('webwijzer_student_assignments')
        .select('student:students(id, first_name, last_name, photo_url)')
        .eq('access_code', accessCode)
        .maybeSingle();

      if (error) throw error;

      if (!data || !data.student) {
        setToast({ message: 'Leerling niet gevonden', type: 'error' });
        return;
      }

      const existingSession = sessions.find(s => s.student_id === data.student.id);
      if (existingSession) {
        setToast({ message: `${data.student.first_name} heeft al een activiteit`, type: 'info' });
        return;
      }

      setScannedStudent(data.student);
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setToast({ message: 'Fout bij verwerken QR-code', type: 'error' });
    }
  };

  const handleActivitySelection = async (activityId: string) => {
    if (!scannedStudent || !user) return;

    try {
      const { error } = await supabase
        .from('activity_sessions')
        .insert({
          board_id: board.id,
          activity_option_id: activityId,
          student_id: scannedStudent.id,
          added_by: user.id
        });

      if (error) throw error;

      setToast({
        message: `${scannedStudent.first_name} toegevoegd aan activiteit`,
        type: 'success'
      });
      setScannedStudent(null);
      await fetchActiveSessions();
    } catch (error) {
      console.error('Error adding student:', error);
      setToast({ message: 'Fout bij toevoegen leerling', type: 'error' });
    }
  };

  const handleAddStudent = async (studentId: string, activityOptionId: string) => {
    if (!user) return;

    try {
      const existingSession = sessions.find(s => s.student_id === studentId);
      if (existingSession) {
        if (existingSession.activity_option_id === activityOptionId) {
          setToast({ message: 'Deze leerling zit al in deze activiteit', type: 'info' });
          setShowSelector(null);
          return;
        }
        setSwitchToActivityId(activityOptionId);
        setFeedbackSession(existingSession);
        setShowSelector(null);
        return;
      }

      const { error } = await supabase
        .from('activity_sessions')
        .insert({
          board_id: board.id,
          activity_option_id: activityOptionId,
          student_id: studentId,
          added_by: user.id
        });

      if (error) throw error;
      await fetchActiveSessions();
      setShowSelector(null);
    } catch (error) {
      console.error('Error adding student:', error);
      setToast({ message: 'Fout bij toevoegen van leerling', type: 'error' });
    }
  };

  const handleRemoveStudent = async (session: ActivitySession) => {
    setFeedbackSession(session);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    console.log('Drag ended:', { active: activeData, over: overData });

    if (activeData?.type === 'unassigned-student') {
      if (overData?.type === 'empty-spot' || overData?.type === 'student-spot') {
        await handleAddStudent(activeData.student, overData.activityId);
      }
    } else if (activeData?.type === 'student-spot' && activeData.session) {
      if (overData?.type === 'empty-spot') {
        if (overData.activityId === activeData.activityId) {
          return;
        }
        await handleSwitchActivity(activeData.session, overData.activityId);
      } else if (overData?.type === 'student-spot' && overData.session) {
        if (overData.activityId !== activeData.activityId) {
          await handleSwitchActivity(activeData.session, overData.activityId);
        }
      } else if (over.id === 'unassigned-panel') {
        await handleRemoveStudent(activeData.session);
      }
    }
  };

  const handleSwitchActivity = async (session: ActivitySession, newActivityId: string) => {
    try {
      const { error: endError } = await supabase
        .from('activity_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('id', session.id);

      if (endError) throw endError;

      const { error: insertError } = await supabase
        .from('activity_sessions')
        .insert({
          board_id: board.id,
          activity_option_id: newActivityId,
          student_id: session.student_id,
          start_time: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setToast({ message: 'Leerling verplaatst', type: 'success' });
      fetchActiveSessions();
    } catch (error) {
      console.error('Error switching activity:', error);
      setToast({ message: 'Fout bij verplaatsen', type: 'error' });
    }
  };

  const handleFeedbackSubmit = async (
    sessionId: string,
    rating: number | null,
    notes: string | null,
    switchToActivity: string | null
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('activity_sessions')
        .update({
          end_time: new Date().toISOString(),
          feedback_rating: rating,
          teacher_notes: notes
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      setToast({ message: 'Activiteit afgesloten', type: 'success' });

      if (switchToActivity && feedbackSession) {
        const { error: insertError } = await supabase
          .from('activity_sessions')
          .insert({
            board_id: board.id,
            activity_option_id: switchToActivity,
            student_id: feedbackSession.student_id,
            added_by: user!.id
          });

        if (insertError) throw insertError;
      }

      setFeedbackSession(null);
      setShowSelector(null);
      setSwitchToActivityId(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setToast({ message: 'Fout bij opslaan feedback', type: 'error' });
    }
  };

  const getSessionsForActivity = (activityId: string) => {
    return sessions.filter(s => s.activity_option_id === activityId);
  };

  const allDragIds = [
    ...unassignedStudents.map(s => `unassigned-${s.id}`),
    ...sessions.map(s => `session-${s.id}`)
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allDragIds} strategy={rectSortingStrategy}>
        <div className="flex h-full">
          <div className="flex-1 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
            {board.description && (
              <p className="text-gray-600">{board.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowOptionsModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all bg-white text-gray-700"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Instellingen</span>
          </button>
          <Button variant="secondary" onClick={onEdit}>
            Bord bewerken
          </Button>
        </div>
      </div>

      {options.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen activiteiten</h3>
          <p className="text-gray-600 mb-6">
            Voeg activiteiten toe aan dit bord via de instellingen.
          </p>
          <Button onClick={onEdit}>
            <Settings className="w-4 h-4 mr-2" />
            Ga naar Instellingen
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-w-4xl">
          {options.map((option) => {
            const activitySessions = getSessionsForActivity(option.id);
            const isUnlimited = option.max_students === null;
            const IconComponent = ICON_MAP[option.icon] || Grid;

            const numSpots = isUnlimited ? activitySessions.length + 1 : option.max_students;
            const minWidth = Math.max(200, Math.ceil(numSpots / 4) * 80 + 80);

            return (
              <Card key={option.id} className="overflow-hidden" style={{ minWidth: `${minWidth}px`, maxWidth: '400px' }}>
                <div
                  className="h-2"
                  style={{ backgroundColor: option.color }}
                />
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      >
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {option.name}
                        </h3>
                        {!isUnlimited && (
                          <p className="text-xs text-gray-500">
                            {activitySessions.length}/{option.max_students}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isUnlimited ? (
                      <>
                        {activitySessions.map((session, index) => (
                          <StudentSpot
                            key={session.id}
                            session={session}
                            activityColor={option.color}
                            onClick={() => setShowSelector({ option })}
                            onRemove={handleRemoveStudent}
                            activityId={option.id}
                            spotIndex={index}
                          />
                        ))}
                        <StudentSpot
                          session={null}
                          activityColor={option.color}
                          onClick={() => setShowSelector({ option })}
                          activityId={option.id}
                          spotIndex={activitySessions.length}
                        />
                      </>
                    ) : (
                      Array.from({ length: option.max_students }).map((_, index) => {
                        const session = activitySessions[index];
                        return (
                          <StudentSpot
                            key={index}
                            session={session}
                            activityColor={option.color}
                            onClick={() => setShowSelector({ option, spotIndex: index })}
                            onRemove={session ? handleRemoveStudent : undefined}
                            activityId={option.id}
                            spotIndex={index}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showSelector && (
        <StudentSelector
          boardId={board.id}
          activityOption={showSelector.option}
          onClose={() => setShowSelector(null)}
          onSelectStudent={handleAddStudent}
        />
      )}

      {feedbackSession && (
        <FeedbackModal
          session={feedbackSession}
          options={options}
          onClose={() => {
            setFeedbackSession(null);
            setSwitchToActivityId(null);
          }}
          onSubmit={handleFeedbackSubmit}
          mode={mode}
          prefilledSwitchTo={switchToActivityId}
        />
      )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <BoardOptionsModal
          isOpen={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          mode={mode}
          onModeChange={setMode}
          showUnassignedPanel={showUnassignedPanel}
          onToggleUnassignedPanel={() => setShowUnassignedPanel(!showUnassignedPanel)}
          onQRScan={handleQRScan}
          showScanner={showScanner}
          onToggleScanner={() => setShowScanner(!showScanner)}
        />

        {scannedStudent && (
          <ActivitySelectionModal
            student={scannedStudent}
            activities={options.map(opt => ({
              ...opt,
              current_count: getSessionsForActivity(opt.id).length
            }))}
            onSelect={handleActivitySelection}
            onClose={() => setScannedStudent(null)}
          />
        )}

        {showScanner && !showOptionsModal && (
          <QRScanner
            onScanSuccess={handleQRScan}
            isVisible={false}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>

      {showUnassignedPanel && (
        <DroppableUnassignedPanel>
          <UnassignedStudentsPanel
            students={unassignedStudents}
            onSelectStudent={(student) => setScannedStudent(student)}
          />
        </DroppableUnassignedPanel>
      )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
