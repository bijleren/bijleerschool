import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { ArrowLeft, Play, Pause, StopCircle, Clock, BookOpen, Star } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  custom_cover_url: string | null;
  page_count: number | null;
}

interface StudentBook {
  id: string;
  book_id: string;
  books: Book;
}

interface ReadingSessionProps {
  studentBook: StudentBook;
  student: Student;
  onClose: () => void;
}

interface SessionData {
  id: string;
  start_time: string;
  end_time: string | null;
  start_page: number | null;
  end_page: number | null;
  duration_minutes: number | null;
  pages_read: number | null;
}

export function ReadingSession({ studentBook, student, onClose }: ReadingSessionProps) {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [timerMinutes, setTimerMinutes] = useState<number>(30);
  const [useTimer, setUseTimer] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [pastSessions, setPastSessions] = useState<SessionData[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchPastSessions();
  }, []);

  useEffect(() => {
    if (pastSessions.length > 0) {
      const lastSession = pastSessions[0];
      if (lastSession.end_page && !startPage) {
        setStartPage(lastSession.end_page.toString());
      }
    }
  }, [pastSessions]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newValue = prev + 1;
          if (useTimer && timerMinutes > 0 && newValue >= timerMinutes * 60) {
            handleTimerComplete();
            return timerMinutes * 60;
          }
          return newValue;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, useTimer, timerMinutes]);

  const fetchPastSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('student_book_id', studentBook.id)
        .eq('student_id', student.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setPastSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleTimerComplete = () => {
    setToast({ message: 'Timer afgelopen! Goed gedaan!', type: 'success' });
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleStartReading = async () => {
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .insert({
          student_book_id: studentBook.id,
          student_id: student.id,
          book_id: studentBook.book_id,
          start_page: startPage ? parseInt(startPage) : null,
          timer_duration_minutes: useTimer ? timerMinutes : null
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data.id);
      setSessionStartTime(new Date());
      setIsRunning(true);
      setElapsedSeconds(0);
      setToast({ message: 'Veel leesplezier!', type: 'success' });
    } catch (error) {
      console.error('Error starting session:', error);
      setToast({ message: 'Fout bij starten sessie', type: 'error' });
    }
  };

  const handlePauseResume = () => {
    setIsRunning(!isRunning);
  };

  const handleStopReading = async () => {
    if (!activeSession) return;

    if (!endPage) {
      setToast({ message: 'Voer de eindpagina in', type: 'error' });
      return;
    }

    try {
      const durationMinutes = Math.floor(elapsedSeconds / 60);
      const pagesRead = startPage && endPage ? parseInt(endPage) - parseInt(startPage) : null;

      const { error } = await supabase
        .from('reading_sessions')
        .update({
          end_time: new Date().toISOString(),
          end_page: parseInt(endPage),
          duration_minutes: durationMinutes,
          pages_read: pagesRead
        })
        .eq('id', activeSession);

      if (error) throw error;

      setToast({ message: 'Leessessie opgeslagen!', type: 'success' });
      setActiveSession(null);
      setIsRunning(false);
      setElapsedSeconds(0);
      setSessionStartTime(null);
      setStartPage('');
      setEndPage('');
      fetchPastSessions();
      setShowReview(true);
    } catch (error) {
      console.error('Error stopping session:', error);
      setToast({ message: 'Fout bij opslaan sessie', type: 'error' });
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setToast({ message: 'Geef een beoordeling', type: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('book_reviews')
        .upsert({
          student_id: student.id,
          book_id: studentBook.book_id,
          student_book_id: studentBook.id,
          rating: rating,
          review_text: reviewText || null
        }, {
          onConflict: 'student_id,book_id'
        });

      if (error) throw error;

      setToast({ message: 'Beoordeling opgeslagen!', type: 'success' });
      setShowReview(false);
      setRating(0);
      setReviewText('');
    } catch (error) {
      console.error('Error submitting review:', error);
      setToast({ message: 'Fout bij opslaan beoordeling', type: 'error' });
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const totalMinutesRead = pastSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
  const totalPagesRead = pastSessions.reduce((sum, session) => sum + (session.pages_read || 0), 0);

  const currentPage = pastSessions.length > 0 && pastSessions[0].end_page ? pastSessions[0].end_page : 0;
  const progressPercentage = studentBook.books.page_count && currentPage
    ? Math.round((currentPage / studentBook.books.page_count) * 100)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center space-x-4">
        <Button variant="secondary" onClick={onClose} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex gap-6">
            <div className="w-48 flex-shrink-0">
              <div className="aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden">
                {(studentBook.books.cover_image_url || studentBook.books.custom_cover_url) ? (
                  <img
                    src={studentBook.books.cover_image_url || studentBook.books.custom_cover_url || ''}
                    alt={studentBook.books.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {studentBook.books.title}
              </h1>
              {studentBook.books.author && (
                <p className="text-lg text-gray-600 mb-4">{studentBook.books.author}</p>
              )}

              {studentBook.books.page_count && (
                <p className="text-sm text-gray-500 mb-4">
                  {studentBook.books.page_count} pagina's
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Totaal gelezen</p>
                  <p className="text-2xl font-bold text-blue-900">{totalMinutesRead} min</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Pagina's gelezen</p>
                  <p className="text-2xl font-bold text-green-900">{totalPagesRead}</p>
                </div>
              </div>

              {progressPercentage !== null && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>Voortgang</span>
                    <span className="font-semibold">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pagina {currentPage} van {studentBook.books.page_count}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {!activeSession ? (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Start Leessessie</h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTimer}
                    onChange={(e) => setUseTimer(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Timer gebruiken</span>
                </label>
              </div>

              {useTimer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hoeveel minuten wil je lezen?
                  </label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTimerMinutes(mins)}
                        className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                          timerMinutes === mins
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bij welke pagina begin je?
                  {currentPage > 0 && (
                    <span className="text-gray-500 text-xs ml-2">
                      (Vorige keer gestopt op pagina {currentPage})
                    </span>
                  )}
                </label>
                <Input
                  type="number"
                  value={startPage}
                  onChange={(e) => setStartPage(e.target.value)}
                  placeholder={currentPage > 0 ? currentPage.toString() : "Bijv. 1"}
                  className="max-w-xs"
                />
              </div>
            </div>

            <Button onClick={handleStartReading} size="lg">
              <Play className="w-5 h-5 mr-2" />
              Start Lezen
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-6">
            <div className="text-center mb-8">
              <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <div className="text-6xl font-bold text-gray-900 mb-2">
                {formatTime(elapsedSeconds)}
              </div>
              {useTimer && timerMinutes > 0 && (
                <div className="text-sm text-gray-600">
                  Doel: {timerMinutes} minuten
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tot welke pagina ben je gekomen?
              </label>
              <Input
                type="number"
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                placeholder="Bijv. 58"
                className="max-w-xs"
              />
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={handlePauseResume}
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pauzeren
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Hervatten
                  </>
                )}
              </Button>
              <Button
                variant="primary"
                onClick={handleStopReading}
                size="lg"
              >
                <StopCircle className="w-5 h-5 mr-2" />
                Stoppen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {pastSessions.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Leessessies</h2>
            <div className="space-y-3">
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(session.start_time)}
                    </p>
                    {session.start_page && session.end_page && (
                      <p className="text-sm text-gray-600">
                        Pagina {session.start_page} - {session.end_page}
                        {session.pages_read && ` (${session.pages_read} pagina's)`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">
                      {session.duration_minutes} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {showReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Beoordeel dit boek</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hoeveel sterren geef je dit boek?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-3xl transition-colors"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wat vond je van het boek? (optioneel)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Schrijf wat je ervan vond..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmitReview}>Opslaan</Button>
              <Button variant="secondary" onClick={() => setShowReview(false)}>
                Later
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
