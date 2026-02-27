import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Book, User, Tag } from 'lucide-react';

interface SessionDetails {
  id: string;
  session_date: string;
  general_observations: string | null;
  leesniveau_scale: string | null;
  leesniveau_observations: string | null;
  begrip_scale: string | null;
  begrip_observations: string | null;
  motivatie_scale: string | null;
  motivatie_observations: string | null;
  smaakontwikkeling_scale: string | null;
  smaakontwikkeling_observations: string | null;
  manual_book_title: string | null;
  manual_book_author: string | null;
  custom_intervention_notes: string | null;
  next_session_date: string | null;
  students: {
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  };
  books: {
    title: string;
    author: string | null;
  } | null;
  reading_session_techniques: Array<{
    reading_techniques: {
      title: string;
      description: string | null;
    };
  }>;
  reading_session_interventions: Array<{
    reading_interventions: {
      title: string;
    };
  }>;
}

interface SessionDetailsModalProps {
  sessionId: string;
  onClose: () => void;
}

export function SessionDetailsModal({ sessionId, onClose }: SessionDetailsModalProps) {
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    const { data, error } = await supabase
      .from('reading_coach_sessions')
      .select(`
        *,
        students (first_name, last_name, profile_picture_url),
        books (title, author),
        reading_session_techniques (
          reading_techniques (title, description)
        ),
        reading_session_interventions (
          reading_interventions (title)
        )
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error loading session:', error);
      setLoading(false);
      return;
    }

    setSession(data);
    setLoading(false);
  };

  const getScaleLabel = (scale: string | null) => {
    if (!scale) return '-';
    switch (scale) {
      case 'very_poor': return '--';
      case 'poor': return '-';
      case 'good': return '+';
      case 'excellent': return '++';
      default: return '-';
    }
  };

  const getScaleText = (scale: string | null) => {
    if (!scale) return 'Niet beoordeeld';
    switch (scale) {
      case 'very_poor': return 'Zeer zwak';
      case 'poor': return 'Zwak';
      case 'good': return 'Goed';
      case 'excellent': return 'Uitstekend';
      default: return 'Niet beoordeeld';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Sessiedetails</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {session.students.profile_picture_url ? (
                <img src={session.students.profile_picture_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {session.students.first_name} {session.students.last_name}
              </h3>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                {new Date(session.session_date).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {(session.books?.title || session.manual_book_title) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Book className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold">Boek</h4>
              </div>
              <p className="text-lg">{session.books?.title || session.manual_book_title}</p>
              {(session.books?.author || session.manual_book_author) && (
                <p className="text-gray-600">door {session.books?.author || session.manual_book_author}</p>
              )}
            </div>
          )}

          {session.general_observations && (
            <div>
              <h4 className="font-semibold mb-2">Algemene Observaties</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{session.general_observations}</p>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-4">Beoordeling</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {session.leesniveau_scale && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Leesniveau</span>
                    <span className="text-lg font-bold">{getScaleLabel(session.leesniveau_scale)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{getScaleText(session.leesniveau_scale)}</p>
                  {session.leesniveau_observations && (
                    <p className="text-sm text-gray-700">{session.leesniveau_observations}</p>
                  )}
                </div>
              )}

              {session.begrip_scale && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Begrip</span>
                    <span className="text-lg font-bold">{getScaleLabel(session.begrip_scale)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{getScaleText(session.begrip_scale)}</p>
                  {session.begrip_observations && (
                    <p className="text-sm text-gray-700">{session.begrip_observations}</p>
                  )}
                </div>
              )}

              {session.motivatie_scale && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Motivatie</span>
                    <span className="text-lg font-bold">{getScaleLabel(session.motivatie_scale)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{getScaleText(session.motivatie_scale)}</p>
                  {session.motivatie_observations && (
                    <p className="text-sm text-gray-700">{session.motivatie_observations}</p>
                  )}
                </div>
              )}

              {session.smaakontwikkeling_scale && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Smaakontwikkeling</span>
                    <span className="text-lg font-bold">{getScaleLabel(session.smaakontwikkeling_scale)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{getScaleText(session.smaakontwikkeling_scale)}</p>
                  {session.smaakontwikkeling_observations && (
                    <p className="text-sm text-gray-700">{session.smaakontwikkeling_observations}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {session.reading_session_techniques.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold">Gebruikte Leestechnieken</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.reading_session_techniques.map((st, idx) => (
                  <div key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {st.reading_techniques.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.reading_session_interventions.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Interventies</h4>
              <div className="flex flex-wrap gap-2">
                {session.reading_session_interventions.map((si, idx) => (
                  <div key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    {si.reading_interventions.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.custom_intervention_notes && (
            <div>
              <h4 className="font-semibold mb-2">Aanvullende Interventies</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{session.custom_intervention_notes}</p>
            </div>
          )}

          {session.next_session_date && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Volgende Sessie Gepland</h4>
              <p className="text-gray-700">
                {new Date(session.next_session_date).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
