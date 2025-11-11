import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { X, Clock, Grid } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface ActivityOption {
  id: string;
  name: string;
  description: string;
  max_students: number;
  color: string;
  icon: string;
  current_students: number;
}

interface CurrentActivity {
  session_id: string;
  activity_option_id: string;
  activity_name: string;
  activity_color: string;
  activity_icon: string;
  start_time: string;
}

interface StudentActiviTijdModalProps {
  studentId: string;
  boardId: string;
  onClose: () => void;
}

export function StudentActiviTijdModal({ studentId, boardId, onClose }: StudentActiviTijdModalProps) {
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, [boardId, studentId]);

  useEffect(() => {
    if (currentActivity) {
      const timer = setInterval(() => {
        const start = new Date(currentActivity.start_time).getTime();
        const now = Date.now();
        setDuration(Math.floor((now - start) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentActivity]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      const { data: currentSession, error: sessionError } = await supabase
        .from('activity_sessions')
        .select(`
          id,
          activity_option_id,
          start_time,
          activity_options (
            name,
            color,
            icon
          )
        `)
        .eq('student_id', studentId)
        .eq('board_id', boardId)
        .is('end_time', null)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (currentSession && currentSession.activity_options) {
        setCurrentActivity({
          session_id: currentSession.id,
          activity_option_id: currentSession.activity_option_id,
          activity_name: currentSession.activity_options.name,
          activity_color: currentSession.activity_options.color,
          activity_icon: currentSession.activity_options.icon,
          start_time: currentSession.start_time
        });
      } else {
        setCurrentActivity(null);
      }

      const { data: options, error: optionsError } = await supabase
        .from('activity_options')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_active', true)
        .order('sort_order');

      if (optionsError) throw optionsError;

      const { data: sessions, error: sessionsError } = await supabase
        .from('activity_sessions')
        .select('activity_option_id')
        .eq('board_id', boardId)
        .is('end_time', null);

      if (sessionsError) throw sessionsError;

      const studentCounts = sessions.reduce((acc, session) => {
        acc[session.activity_option_id] = (acc[session.activity_option_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const activitiesWithCounts = (options || []).map(option => ({
        id: option.id,
        name: option.name,
        description: option.description,
        max_students: option.max_students,
        color: option.color,
        icon: option.icon,
        current_students: studentCounts[option.id] || 0
      }));

      setActivities(activitiesWithCounts);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartActivity = async (activityId: string) => {
    try {
      if (currentActivity) {
        await supabase
          .from('activity_sessions')
          .update({ end_time: new Date().toISOString() })
          .eq('id', currentActivity.session_id);
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('activity_sessions')
        .insert({
          board_id: boardId,
          activity_option_id: activityId,
          student_id: studentId,
          start_time: new Date().toISOString(),
          added_by: userData.user?.id
        });

      if (error) throw error;

      fetchActivities();
    } catch (error) {
      console.error('Error starting activity:', error);
    }
  };

  const handleStopActivity = async () => {
    if (!currentActivity) return;

    try {
      const { error } = await supabase
        .from('activity_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('id', currentActivity.session_id);

      if (error) throw error;

      setCurrentActivity(null);
      fetchActivities();
    } catch (error) {
      console.error('Error stopping activity:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Grid;
    return Icon;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Activi-tijd</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          {currentActivity && (
            <div
              className="mb-6 p-6 rounded-lg"
              style={{ backgroundColor: currentActivity.activity_color + '20' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: currentActivity.activity_color }}
                  >
                    {React.createElement(getIcon(currentActivity.activity_icon), {
                      className: 'w-8 h-8 text-white'
                    })}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {currentActivity.activity_name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-lg font-mono">{formatDuration(duration)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleStopActivity}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Stop activiteit
                </Button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {currentActivity ? 'Wissel van activiteit' : 'Kies een activiteit'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {activities.map((activity) => {
                const Icon = getIcon(activity.icon);
                const isFull = activity.max_students && activity.current_students >= activity.max_students;
                const isCurrentActivity = currentActivity?.activity_option_id === activity.id;

                return (
                  <button
                    key={activity.id}
                    onClick={() => !isFull && !isCurrentActivity && handleStartActivity(activity.id)}
                    disabled={isFull || isCurrentActivity}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      isCurrentActivity
                        ? 'border-blue-500 bg-blue-50 cursor-default'
                        : isFull
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                        : 'border-gray-300 hover:border-blue-500 hover:shadow-lg cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                        style={{ backgroundColor: activity.color + '40' }}
                      >
                        <Icon className="w-8 h-8" style={{ color: activity.color }} />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{activity.name}</h4>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        {activity.current_students}
                        {activity.max_students && ` / ${activity.max_students}`} student
                        {activity.current_students !== 1 ? 'en' : ''}
                      </div>
                      {isFull && (
                        <span className="text-xs text-red-600 font-medium mt-2">Vol</span>
                      )}
                      {isCurrentActivity && (
                        <span className="text-xs text-blue-600 font-medium mt-2">Huidige activiteit</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
