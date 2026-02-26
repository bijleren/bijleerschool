import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Plus, Calendar, Book, User } from 'lucide-react';
import { SessionDetailsModal } from './SessionDetailsModal';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
  photo_url: string | null;
}

interface Session {
  id: string;
  session_date: string;
  general_observations: string | null;
  leesniveau_scale: string | null;
  begrip_scale: string | null;
  motivatie_scale: string | null;
  smaakontwikkeling_scale: string | null;
  manual_book_title: string | null;
  manual_book_author: string | null;
  next_session_date: string | null;
  books: {
    title: string;
    author: string | null;
  } | null;
  reading_session_techniques: Array<{
    reading_techniques: {
      title: string;
    };
  }>;
  reading_session_interventions: Array<{
    reading_interventions: {
      title: string;
    };
  }>;
}

interface LeescoachStudentProfileProps {
  schoolId: string;
  studentId: string;
  onNavigateBack: () => void;
  onNavigateToCreate: () => void;
}

export function LeescoachStudentProfile({
  schoolId,
  studentId,
  onNavigateBack,
  onNavigateToCreate,
}: LeescoachStudentProfileProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    const [studentRes, sessionsRes] = await Promise.all([
      supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single(),
      supabase
        .from('reading_coach_sessions')
        .select(`
          *,
          books (title, author),
          reading_session_techniques (
            reading_techniques (title)
          ),
          reading_session_interventions (
            reading_interventions (title)
          )
        `)
        .eq('student_id', studentId)
        .order('session_date', { ascending: false }),
    ]);

    if (studentRes.data) setStudent(studentRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  const latestSession = sessions[0];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onNavigateBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Leerlingprofiel</h1>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {student.photo_url ? (
                <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                {student.first_name} {student.last_name}
              </h2>
              <div className="flex gap-4 text-gray-600">
                {student.student_number && <div>Nr: {student.student_number}</div>}
                {student.grade_level && <div>{student.grade_level}</div>}
              </div>
            </div>
            <Button onClick={onNavigateToCreate}>
              <Plus className="w-5 h-5 mr-2" />
              Nieuwe Sessie
            </Button>
          </div>
        </Card>

        {latestSession && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Leesniveau</div>
              <div className="text-2xl font-bold">{getScaleLabel(latestSession.leesniveau_scale)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Begrip</div>
              <div className="text-2xl font-bold">{getScaleLabel(latestSession.begrip_scale)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Motivatie</div>
              <div className="text-2xl font-bold">{getScaleLabel(latestSession.motivatie_scale)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Smaak</div>
              <div className="text-2xl font-bold">{getScaleLabel(latestSession.smaakontwikkeling_scale)}</div>
            </Card>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Sessiegeschiedenis</h3>
          <div className="text-gray-600 mb-2">
            Totaal {sessions.length} {sessions.length === 1 ? 'sessie' : 'sessies'}
          </div>
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              Nog geen sessies voor deze leerling
            </Card>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="flex items-center justify-between mb-3">
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

                {(session.books?.title || session.manual_book_title) && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                    <Book className="w-4 h-4" />
                    <span className="font-medium">
                      {session.books?.title || session.manual_book_title}
                    </span>
                    {(session.books?.author || session.manual_book_author) && (
                      <span className="text-gray-500">
                        - {session.books?.author || session.manual_book_author}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mb-3">
                  {session.leesniveau_scale && (
                    <div className="px-3 py-1 bg-gray-100 rounded text-sm">
                      <span className="font-medium">Leesniveau:</span> {getScaleLabel(session.leesniveau_scale)}
                    </div>
                  )}
                  {session.begrip_scale && (
                    <div className="px-3 py-1 bg-gray-100 rounded text-sm">
                      <span className="font-medium">Begrip:</span> {getScaleLabel(session.begrip_scale)}
                    </div>
                  )}
                  {session.motivatie_scale && (
                    <div className="px-3 py-1 bg-gray-100 rounded text-sm">
                      <span className="font-medium">Motivatie:</span> {getScaleLabel(session.motivatie_scale)}
                    </div>
                  )}
                  {session.smaakontwikkeling_scale && (
                    <div className="px-3 py-1 bg-gray-100 rounded text-sm">
                      <span className="font-medium">Smaak:</span> {getScaleLabel(session.smaakontwikkeling_scale)}
                    </div>
                  )}
                </div>

                {session.general_observations && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {session.general_observations}
                  </p>
                )}

                {session.reading_session_techniques.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {session.reading_session_techniques.map((st, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {st.reading_techniques.title}
                      </span>
                    ))}
                  </div>
                )}

                {session.reading_session_interventions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {session.reading_session_interventions.map((si, idx) => (
                      <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        {si.reading_interventions.title}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {selectedSessionId && (
        <SessionDetailsModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
