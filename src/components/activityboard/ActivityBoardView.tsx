import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StudentSelector } from './StudentSelector';
import { FeedbackModal } from './FeedbackModal';
import { ArrowLeft, Settings, Clock, Users, Plus, X, Grid, Book, Palette, Music, Pencil, Calculator, Gamepad2, Puzzle, Building, Trees, Scissors, Play } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
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

function StudentSpot({
  session,
  activityColor,
  onClick,
  onRemove
}: {
  session: ActivitySession | null;
  activityColor: string;
  onClick: () => void;
  onRemove?: (session: ActivitySession) => void;
}) {
  const getActivityDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}u ${mins}m`;
  };

  if (!session) {
    return (
      <button
        onClick={onClick}
        className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center group"
      >
        <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
      </button>
    );
  }

  return (
    <div className="relative group">
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
  const [loading, setLoading] = useState(true);

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

  const handleAddStudent = async (studentId: string, activityOptionId: string) => {
    if (!user) return;

    try {
      const existingSession = sessions.find(s => s.student_id === studentId);
      if (existingSession) {
        if (existingSession.activity_option_id === activityOptionId) {
          alert('Deze leerling zit al in deze activiteit');
          setShowSelector(null);
          return;
        }
        setFeedbackSession(existingSession);
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
      setShowSelector(null);
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Fout bij toevoegen van leerling');
    }
  };

  const handleRemoveStudent = async (session: ActivitySession) => {
    setFeedbackSession(session);
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
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Fout bij opslaan van feedback');
    }
  };

  const getSessionsForActivity = (activityId: string) => {
    return sessions.filter(s => s.activity_option_id === activityId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
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
        <Button variant="secondary" onClick={onEdit}>
          <Settings className="w-4 h-4 mr-2" />
          Instellingen
        </Button>
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
        <div className="flex flex-wrap gap-4">
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
                        {activitySessions.map((session) => (
                          <StudentSpot
                            key={session.id}
                            session={session}
                            activityColor={option.color}
                            onClick={() => setShowSelector({ option })}
                            onRemove={handleRemoveStudent}
                          />
                        ))}
                        <StudentSpot
                          session={null}
                          activityColor={option.color}
                          onClick={() => setShowSelector({ option })}
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
          onClose={() => setFeedbackSession(null)}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
}
