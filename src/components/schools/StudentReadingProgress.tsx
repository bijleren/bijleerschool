import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { BookOpen, Clock, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

interface ReadingSession {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  start_page: number | null;
  end_page: number | null;
  pages_read: number | null;
  notes: string | null;
  emotion: string | null;
  books: {
    id: string;
    title: string;
    author: string | null;
    cover_image_url: string | null;
  };
}

interface BookProgress {
  book_id: string;
  book_title: string;
  book_author: string | null;
  cover_image_url: string | null;
  total_sessions: number;
  total_duration_minutes: number;
  total_pages_read: number;
  last_read: string;
  first_read: string;
}

interface StudentReadingProgressProps {
  studentId: string;
  schoolId: string;
}

export function StudentReadingProgress({ studentId, schoolId }: StudentReadingProgressProps) {
  const [viewMode, setViewMode] = useState<'time' | 'book'>('time');
  const [loading, setLoading] = useState(true);
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [bookProgress, setBookProgress] = useState<BookProgress[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    totalPages: 0,
    uniqueBooks: 0,
    averageSessionMinutes: 0
  });

  useEffect(() => {
    fetchReadingData();
  }, [studentId]);

  const fetchReadingData = async () => {
    try {
      setLoading(true);

      const { data: sessions, error: sessionsError } = await supabase
        .from('reading_sessions')
        .select(`
          id,
          start_time,
          end_time,
          duration_minutes,
          start_page,
          end_page,
          pages_read,
          notes,
          emotion,
          books (
            id,
            title,
            author,
            cover_image_url
          )
        `)
        .eq('student_id', studentId)
        .order('start_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      setReadingSessions(sessions || []);

      const bookMap = new Map<string, BookProgress>();
      let totalMinutes = 0;
      let totalPages = 0;

      sessions?.forEach(session => {
        const bookId = session.books.id;
        const duration = session.duration_minutes || 0;
        const pages = session.pages_read || 0;

        totalMinutes += duration;
        totalPages += pages;

        if (!bookMap.has(bookId)) {
          bookMap.set(bookId, {
            book_id: bookId,
            book_title: session.books.title,
            book_author: session.books.author,
            cover_image_url: session.books.cover_image_url,
            total_sessions: 0,
            total_duration_minutes: 0,
            total_pages_read: 0,
            last_read: session.start_time,
            first_read: session.start_time
          });
        }

        const bookData = bookMap.get(bookId)!;
        bookData.total_sessions += 1;
        bookData.total_duration_minutes += duration;
        bookData.total_pages_read += pages;

        if (new Date(session.start_time) > new Date(bookData.last_read)) {
          bookData.last_read = session.start_time;
        }
        if (new Date(session.start_time) < new Date(bookData.first_read)) {
          bookData.first_read = session.start_time;
        }
      });

      const booksArray = Array.from(bookMap.values()).sort(
        (a, b) => new Date(b.last_read).getTime() - new Date(a.last_read).getTime()
      );

      setBookProgress(booksArray);

      setStats({
        totalSessions: sessions?.length || 0,
        totalMinutes: totalMinutes,
        totalPages: totalPages,
        uniqueBooks: bookMap.size,
        averageSessionMinutes: sessions?.length ? Math.round(totalMinutes / sessions.length) : 0
      });

    } catch (error) {
      console.error('Error fetching reading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}u ${mins}m` : `${hours}u`;
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-#946B29"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          Leesvoortgang
        </h3>
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('time')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'time'
                ? 'bg-white text-#946B29 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Tijdlijn
          </button>
          <button
            onClick={() => setViewMode('book')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'book'
                ? 'bg-white text-#946B29 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Per boek
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen className="w-4 h-4 text-#946B29" />
            <p className="text-xs text-#946B29 font-medium">Sessies</p>
          </div>
          <p className="text-2xl font-bold text-#3D2B10">{stats.totalSessions}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-600 font-medium">Totale tijd</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{formatDuration(stats.totalMinutes)}</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-orange-600 font-medium">Pagina's</p>
          </div>
          <p className="text-2xl font-bold text-orange-900">{stats.totalPages}</p>
        </div>

        <div className="bg-pink-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen className="w-4 h-4 text-pink-600" />
            <p className="text-xs text-pink-600 font-medium">Boeken</p>
          </div>
          <p className="text-2xl font-bold text-pink-900">{stats.uniqueBooks}</p>
        </div>

        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-4 h-4 text-#946B29" />
            <p className="text-xs text-#946B29 font-medium">Gem. sessie</p>
          </div>
          <p className="text-2xl font-bold text-#3D2B10">{formatDuration(stats.averageSessionMinutes)}</p>
        </div>
      </div>

      {viewMode === 'time' ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Recente leessessies</h4>
          {readingSessions.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Nog geen leessessies geregistreerd</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readingSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="flex items-start space-x-4">
                    {session.books.cover_image_url && (
                      <img
                        src={session.books.cover_image_url}
                        alt={session.books.title}
                        className="w-12 h-16 object-cover rounded shadow-sm"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{session.books.title}</h5>
                          {session.books.author && (
                            <p className="text-sm text-gray-600">{session.books.author}</p>
                          )}
                        </div>
                        {session.duration_minutes && (
                          <span className="px-3 py-1 bg-amber-100 text-#74531F rounded-full text-sm font-medium">
                            {formatDuration(session.duration_minutes)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(session.start_time)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(session.start_time)}
                          {session.end_time && ` - ${formatTime(session.end_time)}`}
                        </div>
                        {session.pages_read && session.pages_read > 0 && (
                          <div className="flex items-center">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {session.pages_read} pagina's
                            {session.start_page && session.end_page && (
                              <span className="ml-1">(p. {session.start_page}-{session.end_page})</span>
                            )}
                          </div>
                        )}
                      </div>

                      {session.emotion && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">Gevoel: </span>
                          <span className="text-2xl">{session.emotion}</span>
                        </div>
                      )}

                      {session.notes && (
                        <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Voortgang per boek</h4>
          {bookProgress.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Nog geen boeken gelezen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookProgress.map((book) => (
                <div
                  key={book.book_id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="flex items-start space-x-4">
                    {book.cover_image_url && (
                      <img
                        src={book.cover_image_url}
                        alt={book.book_title}
                        className="w-16 h-20 object-cover rounded shadow-sm"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{book.book_title}</h5>
                          {book.book_author && (
                            <p className="text-sm text-gray-600">{book.book_author}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-amber-50 rounded p-3">
                          <p className="text-xs text-#946B29 mb-1">Sessies</p>
                          <p className="text-lg font-bold text-#3D2B10">{book.total_sessions}</p>
                        </div>

                        <div className="bg-green-50 rounded p-3">
                          <p className="text-xs text-green-600 mb-1">Totale tijd</p>
                          <p className="text-lg font-bold text-green-900">
                            {formatDuration(book.total_duration_minutes)}
                          </p>
                        </div>

                        <div className="bg-orange-50 rounded p-3">
                          <p className="text-xs text-orange-600 mb-1">Pagina's</p>
                          <p className="text-lg font-bold text-orange-900">{book.total_pages_read}</p>
                        </div>

                        <div className="bg-amber-50 rounded p-3">
                          <p className="text-xs text-#946B29 mb-1">Gem. per sessie</p>
                          <p className="text-lg font-bold text-#3D2B10">
                            {formatDuration(Math.round(book.total_duration_minutes / book.total_sessions))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Laatste: {formatDate(book.last_read)}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Eerste: {formatDate(book.first_read)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
