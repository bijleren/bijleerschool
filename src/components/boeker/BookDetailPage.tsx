import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import {
  ArrowLeft, BookOpen, Star, Users, Clock, BookMarked,
  Calendar, Hash, Globe, MapPin, TrendingUp, MessageSquare,
  Layers, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  description: string | null;
  cover_image_url: string | null;
  custom_cover_url: string | null;
  language: string | null;
  categories: string[] | null;
  total_copies: number;
  available_copies: number;
  location_id: string | null;
  book_locations?: { name: string } | null;
}

interface BorrowRecord {
  id: string;
  borrowed_at: string;
  returned_at: string | null;
  status: string;
  students: { id: string; first_name: string; last_name: string };
}

interface ReadingSession {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  pages_read: number | null;
  emotion: string | null;
  notes: string | null;
  students: { first_name: string; last_name: string };
}

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  students: { id: string; first_name: string; last_name: string };
}

interface MonthlyBorrowData {
  month: string;    // "Jan '25"
  key: string;      // "2025-01"
  borrows: number;
  returns: number;
}

interface WeeklyReadingData {
  week: string;
  minutes: number;
  pages: number;
}

interface Props {
  bookId: string;
  schoolId: string;
  isAdmin: boolean;
  onBack: () => void;
  onViewStudent?: (studentId: string) => void;
}

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', calm: '😌', tired: '😴', bored: '😐', frustrated: '😤', sad: '😢',
};

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sz} ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// Minimal inline bar chart — no external library needed
function BarChart({ data, valueKey, labelKey, color, emptyText }: {
  data: any[];
  valueKey: string;
  labelKey: string;
  color: string;
  emptyText: string;
}) {
  if (!data.length) {
    return <p className="text-sm text-gray-400 text-center py-8">{emptyText}</p>;
  }
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 4 : 0);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex items-end justify-center" style={{ height: '6rem' }}>
              {d[valueKey] > 0 && (
                <div
                  className="absolute bottom-0 left-0.5 right-0.5 rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                  style={{ height: `${pct}%`, backgroundColor: color }}
                  title={`${d[labelKey]}: ${d[valueKey]}`}
                />
              )}
              {d[valueKey] > 0 && (
                <span className="absolute -top-5 text-[9px] font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d[valueKey]}
                </span>
              )}
            </div>
            <span className="text-[8px] text-gray-400 truncate w-full text-center">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function getMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString('nl-BE', { month: 'short', year: '2-digit' });
}

function getWeekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function BookDetailPage({ bookId, schoolId, isAdmin, onBack, onViewStudent }: Props) {
  const [book, setBook] = useState<Book | null>(null);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllBorrows, setShowAllBorrows] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bookRes, borrowsRes, sessionsRes, reviewsRes] = await Promise.all([
        supabase
          .from('books')
          .select('*, book_locations(name)')
          .eq('id', bookId)
          .maybeSingle(),
        supabase
          .from('student_books')
          .select('id, borrowed_at, returned_at, status, students(id, first_name, last_name)')
          .eq('book_id', bookId)
          .order('borrowed_at', { ascending: false }),
        supabase
          .from('reading_sessions')
          .select('id, start_time, end_time, duration_minutes, pages_read, emotion, notes, students(first_name, last_name)')
          .eq('book_id', bookId)
          .order('start_time', { ascending: false }),
        supabase
          .from('book_reviews')
          .select('id, rating, review_text, created_at, students(id, first_name, last_name)')
          .eq('book_id', bookId)
          .order('created_at', { ascending: false }),
      ]);

      if (bookRes.data) setBook(bookRes.data as Book);
      setBorrowRecords((borrowsRes.data || []) as unknown as BorrowRecord[]);
      setSessions((sessionsRes.data || []) as unknown as ReadingSession[]);
      setReviews((reviewsRes.data || []) as unknown as Review[]);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteReview = async (reviewId: string) => {
    setDeletingReviewId(reviewId);
    await supabase.from('book_reviews').delete().eq('id', reviewId);
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setDeletingReviewId(null);
  };

  // --- Derived data ---

  // Monthly borrow activity (last 12 months)
  const monthlyData: MonthlyBorrowData[] = (() => {
    const months: MonthlyBorrowData[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: getMonthLabel(key), key, borrows: 0, returns: 0 });
    }
    borrowRecords.forEach(r => {
      const bKey = r.borrowed_at.slice(0, 7);
      const bMonth = months.find(m => m.key === bKey);
      if (bMonth) bMonth.borrows += 1;
      if (r.returned_at) {
        const rKey = r.returned_at.slice(0, 7);
        const rMonth = months.find(m => m.key === rKey);
        if (rMonth) rMonth.returns += 1;
      }
    });
    return months;
  })();

  // Weekly reading minutes (last 12 weeks)
  const weeklyData: WeeklyReadingData[] = (() => {
    const weeks: WeeklyReadingData[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      // Start of that week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      weeks.push({ week: getWeekLabel(weekStart.toISOString()), minutes: 0, pages: 0 });
    }
    sessions.forEach(s => {
      if (!s.start_time) return;
      const st = new Date(s.start_time);
      const day = st.getDay();
      const diff = st.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(st);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      const label = getWeekLabel(weekStart.toISOString());
      const week = weeks.find(w => w.week === label);
      if (week) {
        week.minutes += s.duration_minutes || 0;
        week.pages += s.pages_read || 0;
      }
    });
    return weeks;
  })();

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const totalReadingMinutes = sessions.reduce((s, r) => s + (r.duration_minutes || 0), 0);
  const totalPagesRead = sessions.reduce((s, r) => s + (r.pages_read || 0), 0);
  const currentBorrowers = borrowRecords.filter(r => r.status === 'current' || !r.returned_at);
  const displayedBorrows = showAllBorrows ? borrowRecords : borrowRecords.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-20 text-gray-500">Boek niet gevonden.</div>
    );
  }

  const cover = book.custom_cover_url || book.cover_image_url;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Terug naar bibliotheek
      </button>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row gap-0">
          {/* Cover panel */}
          <div className="md:w-56 flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6 md:p-8">
            {cover ? (
              <img
                src={cover}
                alt={book.title}
                className="w-36 md:w-44 rounded-lg shadow-lg object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-36 md:w-44 aspect-[2/3] bg-white rounded-lg shadow-lg flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-1">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{book.title}</h1>
                {book.author && (
                  <p className="text-base text-gray-500 mt-0.5">{book.author}</p>
                )}
              </div>
              {/* Availability badge */}
              <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${book.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {book.available_copies > 0 ? `${book.available_copies} beschikbaar` : 'Niet beschikbaar'}
              </span>
            </div>

            {/* Stars summary */}
            {avgRating !== null && (
              <div className="flex items-center gap-2 mb-4">
                <Stars rating={Math.round(avgRating)} size="sm" />
                <span className="text-sm text-gray-500">{avgRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'recensie' : 'recensies'})</span>
              </div>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm mt-4">
              {book.publisher && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Uitgeverij</span>
                  <p className="text-gray-800 font-medium">{book.publisher}</p>
                </div>
              )}
              {book.published_date && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Jaar</span>
                  <p className="text-gray-800 font-medium">{book.published_date.slice(0, 4)}</p>
                </div>
              )}
              {book.page_count && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Pagina's</span>
                  <p className="text-gray-800 font-medium">{book.page_count}</p>
                </div>
              )}
              {book.language && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Taal</span>
                  <p className="text-gray-800 font-medium uppercase">{book.language}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">Exemplaren</span>
                <p className="text-gray-800 font-medium">{book.available_copies}/{book.total_copies}</p>
              </div>
              {book.book_locations?.name && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Locatie</span>
                  <p className="text-gray-800 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    {book.book_locations.name}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">ISBN</span>
                <p className="text-gray-700 font-mono text-xs mt-0.5">{book.isbn}</p>
              </div>
            </div>

            {/* Categories */}
            {book.categories && book.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {book.categories.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-amber-50 text-#74531F rounded-full text-xs font-medium">
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div className="mt-4 border-t pt-4">
                <p className={`text-sm text-gray-600 leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>
                  {book.description}
                </p>
                {book.description.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(v => !v)}
                    className="mt-1 text-xs text-#946B29 hover:underline flex items-center gap-1"
                  >
                    {showFullDesc ? (<><ChevronUp className="w-3 h-3" /> Minder</>)
                      : (<><ChevronDown className="w-3 h-3" /> Meer lezen</>)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Uitleen (totaal)" value={borrowRecords.length} icon={BookMarked} color="bg-amber-50 text-#946B29" />
        <StatCard label="Nu uitgeleend" value={currentBorrowers.length} icon={Users} color="bg-amber-50 text-amber-600" />
        <StatCard label="Leesminuten" value={totalReadingMinutes >= 60 ? `${Math.round(totalReadingMinutes / 60)}u` : `${totalReadingMinutes}m`} icon={Clock} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Pagina's gelezen" value={totalPagesRead} icon={TrendingUp} color="bg-rose-50 text-rose-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Uitleen per maand</h2>
              <span className="text-xs text-gray-400 ml-auto">laatste 12 maanden</span>
            </div>
            <BarChart
              data={monthlyData}
              valueKey="borrows"
              labelKey="month"
              color="#3b82f6"
              emptyText="Nog geen uitleengeschiedenis"
            />
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Leesminuten per week</h2>
              <span className="text-xs text-gray-400 ml-auto">laatste 12 weken</span>
            </div>
            <BarChart
              data={weeklyData}
              valueKey="minutes"
              labelKey="week"
              color="#10b981"
              emptyText="Nog geen leessessies geregistreerd"
            />
          </div>
        </Card>
      </div>

      {/* Borrow history */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Uitleengeschiedenis</h2>
            <span className="ml-auto text-xs text-gray-400">{borrowRecords.length} records</span>
          </div>

          {borrowRecords.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Dit boek is nog nooit uitgeleend.</p>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {displayedBorrows.map(r => {
                  const isCurrent = !r.returned_at;
                  const borrowed = new Date(r.borrowed_at);
                  const returned = r.returned_at ? new Date(r.returned_at) : null;
                  const daysOut = returned
                    ? Math.round((returned.getTime() - borrowed.getTime()) / 86400000)
                    : Math.round((Date.now() - borrowed.getTime()) / 86400000);

                  return (
                    <div key={r.id} className="py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-600">
                          {r.students.first_name.charAt(0)}{r.students.last_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          className="text-sm font-medium text-gray-900 hover:text-#946B29 transition-colors"
                          onClick={() => onViewStudent?.(r.students.id)}
                        >
                          {r.students.first_name} {r.students.last_name}
                        </button>
                        <p className="text-xs text-gray-400">
                          {borrowed.toLocaleDateString('nl-BE')}
                          {returned ? ` → ${returned.toLocaleDateString('nl-BE')}` : ' → heden'}
                          <span className="ml-1 text-gray-300">({daysOut} dagen)</span>
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCurrent ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {isCurrent ? 'Uitgeleend' : 'Teruggegeven'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {borrowRecords.length > 5 && (
                <button
                  onClick={() => setShowAllBorrows(v => !v)}
                  className="mt-3 w-full text-xs text-#946B29 hover:underline flex items-center justify-center gap-1"
                >
                  {showAllBorrows
                    ? (<><ChevronUp className="w-3 h-3" /> Minder tonen</>)
                    : (<><ChevronDown className="w-3 h-3" /> Alle {borrowRecords.length} records tonen</>)}
                </button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Reading sessions */}
      {sessions.length > 0 && (
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Recente leessessies</h2>
              <span className="ml-auto text-xs text-gray-400">{sessions.length} sessies</span>
            </div>
            <div className="divide-y divide-gray-50">
              {sessions.slice(0, 10).map(s => (
                <div key={s.id} className="py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-base">
                    {s.emotion ? (EMOTION_EMOJI[s.emotion] || '📖') : '📖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {s.students.first_name} {s.students.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.start_time).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {s.notes && <span className="ml-2 italic text-gray-400">"{s.notes}"</span>}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500 flex-shrink-0">
                    {s.duration_minutes != null && <div>{s.duration_minutes} min</div>}
                    {s.pages_read != null && <div>{s.pages_read} pag.</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Reviews */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Recensies</h2>
            {avgRating !== null && (
              <div className="flex items-center gap-1.5 ml-2">
                <Stars rating={Math.round(avgRating)} size="sm" />
                <span className="text-xs text-gray-500">{avgRating.toFixed(1)}</span>
              </div>
            )}
            <span className="ml-auto text-xs text-gray-400">{reviews.length} {reviews.length === 1 ? 'recensie' : 'recensies'}</span>
          </div>

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nog geen recensies voor dit boek.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="bg-gray-50 rounded-xl p-4 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        className="text-sm font-semibold text-gray-900 hover:text-#946B29 transition-colors"
                        onClick={() => onViewStudent?.(r.students.id)}
                      >
                        {r.students.first_name} {r.students.last_name}
                      </button>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Stars rating={r.rating} size="sm" />
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('nl-BE')}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteReview(r.id)}
                        disabled={deletingReviewId === r.id}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {r.review_text && (
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed">{r.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
