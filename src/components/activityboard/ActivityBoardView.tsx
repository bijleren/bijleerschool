import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StudentSelector } from './StudentSelector';
import { FeedbackModal } from './FeedbackModal';
import { ArrowLeft, Settings, Plus, X, Clock, Users } from 'lucide-react';

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
  };
}

interface ActivityBoardViewProps {
  board: ActivityBoard;
  onBack: () => void;
  onEdit: () => void;
}

export function ActivityBoardView({ board, onBack, onEdit }: ActivityBoardViewProps) {
  const { user } = useAuth();
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [showSelector, setShowSelector] = useState<ActivityOption | null>(null);
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
        () => {
          fetchActiveSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
            color
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
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Fout bij opslaan van feedback');
    }
  };

  const getSessionsForActivity = (activityId: string) => {
    return sessions.filter(s => s.activity_option_id === activityId);
  };

  const getActivityDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}u ${mins}m`;
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => {
            const activitySessions = getSessionsForActivity(option.id);
            const isUnlimited = option.max_students === null;
            const availableSpots = isUnlimited
              ? null
              : option.max_students - activitySessions.length;

            return (
              <Card key={option.id} className="flex flex-col">
                <div
                  className="h-3 rounded-t-lg"
                  style={{ backgroundColor: option.color }}
                />
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {option.name}
                      </h3>
                      {option.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {!isUnlimited && (
                      <div className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700 whitespace-nowrap">
                        {activitySessions.length}/{option.max_students}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 mb-4">
                    {isUnlimited ? (
                      <div className="space-y-2">
                        {activitySessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                style={{
                                  backgroundColor: session.students.color || '#6B7280'
                                }}
                              >
                                {session.students.first_name[0]}
                                {session.students.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {session.students.first_name} {session.students.last_name}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {getActivityDuration(session.start_time)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveStudent(session)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: option.max_students }).map((_, index) => {
                          const session = activitySessions[index];
                          return (
                            <div
                              key={index}
                              className={`aspect-square rounded-lg border-2 flex items-center justify-center ${
                                session
                                  ? 'border-gray-300 bg-gray-50'
                                  : 'border-dashed border-gray-300'
                              }`}
                            >
                              {session ? (
                                <div className="relative group w-full h-full p-2">
                                  <div
                                    className="w-full h-full rounded flex items-center justify-center text-white text-xs font-medium"
                                    style={{
                                      backgroundColor: session.students.color || '#6B7280'
                                    }}
                                  >
                                    {session.students.first_name[0]}
                                    {session.students.last_name[0]}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveStudent(session)}
                                    className="absolute top-0 right-0 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3 text-gray-600" />
                                  </button>
                                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-black bg-opacity-50 text-white text-[10px] text-center rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                    {session.students.first_name}
                                    <div className="text-[8px]">
                                      {getActivityDuration(session.start_time)}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {(isUnlimited || (availableSpots !== null && availableSpots > 0)) && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowSelector(option)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Leerling toevoegen
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showSelector && (
        <StudentSelector
          boardId={board.id}
          activityOption={showSelector}
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
