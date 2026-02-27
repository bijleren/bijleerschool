import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import {
  Plus,
  BarChart3,
  Settings,
  List,
  Grid,
  Search,
  Calendar,
  Book,
  User
} from 'lucide-react';
import { SessionDetailsModal } from './SessionDetailsModal';

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
  students: {
    id: string;
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
    };
  }>;
  reading_session_interventions: Array<{
    reading_interventions: {
      title: string;
    };
  }>;
}

interface StudentWithLastSession {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  grade_level: string | null;
  last_session_date: string | null;
  next_session_date: string | null;
}

interface LeescoachOverviewProps {
  schoolId: string;
  onNavigateToCreate: () => void;
  onNavigateToAnalytics: () => void;
  onNavigateToSettings: () => void;
  onNavigateToStudentProfile: (studentId: string) => void;
}

type ViewMode = 'list' | 'grid';

export function LeescoachOverview({
  schoolId,
  onNavigateToCreate,
  onNavigateToAnalytics,
  onNavigateToSettings,
  onNavigateToStudentProfile,
}: LeescoachOverviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studentsWithSessions, setStudentsWithSessions] = useState<StudentWithLastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [schoolId, dateRange]);

  const loadData = async () => {
    setLoading(true);

    if (viewMode === 'list') {
      await loadSessions();
    } else {
      await loadStudentsWithSessions();
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [viewMode]);

  const loadSessions = async () => {
    let query = supabase
      .from('reading_coach_sessions')
      .select(`
        *,
        students!inner (id, first_name, last_name, profile_picture_url),
        books (title, author),
        reading_session_techniques (
          reading_techniques (title)
        ),
        reading_session_interventions (
          reading_interventions (title)
        )
      `)
      .eq('school_id', schoolId)
      .order('session_date', { ascending: false });

    if (dateRange !== 'all') {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
      query = query.gte('session_date', daysAgo.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading sessions:', error);
      return;
    }

    setSessions(data || []);
  };

  const loadStudentsWithSessions = async () => {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, profile_picture_url, grade_level')
      .eq('school_id', schoolId)
      .order('last_name');

    if (error || !students) {
      console.error('Error loading students:', error);
      return;
    }

    const studentsWithData: StudentWithLastSession[] = await Promise.all(
      students.map(async (student) => {
        const { data: lastSession } = await supabase
          .from('reading_coach_sessions')
          .select('session_date, next_session_date')
          .eq('student_id', student.id)
          .order('session_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...student,
          last_session_date: lastSession?.session_date || null,
          next_session_date: lastSession?.next_session_date || null,
        };
      })
    );

    setStudentsWithSessions(studentsWithData);
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

  const getDaysSinceSession = (date: string | null) => {
    if (!date) return null;
    const sessionDate = new Date(date);
    const today = new Date();
    const diffTime = today.getTime() - sessionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredSessions = sessions.filter(session =>
    `${session.students.first_name} ${session.students.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (session.manual_book_title && session.manual_book_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (session.books?.title && session.books.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredStudents = studentsWithSessions.filter(student =>
    `${student.first_name} ${student.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leescoach</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNavigateToSettings}>
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="outline" onClick={onNavigateToAnalytics}>
            <BarChart3 className="w-5 h-5 mr-2" />
            Analytics
          </Button>
          <Button onClick={onNavigateToCreate}>
            <Plus className="w-5 h-5 mr-2" />
            Nieuwe Sessie
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Zoek leerling of boek..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Laatste 7 dagen</option>
            <option value="30">Laatste 30 dagen</option>
            <option value="90">Laatste 90 dagen</option>
            <option value="all">Alle tijd</option>
          </select>

          <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Laden...</div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                Geen sessies gevonden
              </Card>
            ) : (
              filteredSessions.map(session => (
                <Card
                  key={session.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedSessionId(session.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {session.students.profile_picture_url ? (
                        <img src={session.students.profile_picture_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {session.students.first_name} {session.students.last_name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
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
                        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
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

                      <div className="flex gap-3 mb-2">
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
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {session.general_observations}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map(student => {
              const daysSince = getDaysSinceSession(student.last_session_date);
              return (
                <Card
                  key={student.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onNavigateToStudentProfile(student.id)}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-3">
                      {student.profile_picture_url ? (
                        <img src={student.profile_picture_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-gray-400" />
                      )}
                    </div>

                    <h3 className="font-semibold text-lg mb-1">
                      {student.first_name} {student.last_name}
                    </h3>

                    {student.grade_level && (
                      <p className="text-sm text-gray-600 mb-3">{student.grade_level}</p>
                    )}

                    {student.last_session_date ? (
                      <div className="text-sm">
                        <p className="text-gray-600 mb-1">
                          Laatste sessie: {daysSince === 0 ? 'Vandaag' : `${daysSince} dagen geleden`}
                        </p>
                        {student.next_session_date && (
                          <p className="text-blue-600 font-medium">
                            Volgende: {new Date(student.next_session_date).toLocaleDateString('nl-NL')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nog geen sessies</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
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
