import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { BookOpen, Users, Clock, TrendingUp, Award, Calendar, Package } from 'lucide-react';

interface AnalyticsData {
  totalBooks: number;
  totalStudents: number;
  activeBorrowers: number;
  totalReadingMinutes: number;
  totalPagesRead: number;
  averageReadingTime: number;
  totalMaterials: number;
  activeMaterialLoans: number;
  totalMaterialLoans: number;
  mostPopularBooks: Array<{
    id: string;
    title: string;
    author: string | null;
    borrow_count: number;
  }>;
  mostPopularMaterials: Array<{
    id: string;
    title: string;
    blink_code: string;
    loan_count: number;
  }>;
  topReaders: Array<{
    id: string;
    first_name: string;
    last_name: string;
    total_minutes: number;
    total_pages: number;
    books_read: number;
  }>;
  recentActivity: Array<{
    student_name: string;
    book_title: string;
    action: string;
    date: string;
  }>;
}

interface BoekerAnalyticsProps {
  schoolId: string;
}

export function BoekerAnalytics({ schoolId }: BoekerAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [schoolId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: books } = await supabase
        .from('books')
        .select('id')
        .eq('school_id', schoolId);

      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('school_id', schoolId);

      const { data: currentBorrows } = await supabase
        .from('student_books')
        .select('student_id')
        .eq('status', 'current')
        .in('book_id', (books || []).map(b => b.id));

      const uniqueBorrowers = new Set(currentBorrows?.map(b => b.student_id) || []);

      const { data: allSessions } = await supabase
        .from('reading_sessions')
        .select('duration_minutes, pages_read, student_id, book_id')
        .in('book_id', (books || []).map(b => b.id));

      const totalMinutes = allSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
      const totalPages = allSessions?.reduce((sum, s) => sum + (s.pages_read || 0), 0) || 0;
      const averageTime = allSessions && allSessions.length > 0 ? Math.round(totalMinutes / allSessions.length) : 0;

      const { data: bookBorrows } = await supabase
        .from('student_books')
        .select(`
          book_id,
          books (
            id,
            title,
            author
          )
        `)
        .in('book_id', (books || []).map(b => b.id));

      const bookCounts = new Map<string, { title: string; author: string | null; count: number; id: string }>();
      bookBorrows?.forEach((borrow: any) => {
        const bookId = borrow.book_id;
        if (bookCounts.has(bookId)) {
          bookCounts.get(bookId)!.count++;
        } else {
          bookCounts.set(bookId, {
            id: bookId,
            title: borrow.books?.title || 'Unknown',
            author: borrow.books?.author || null,
            count: 1
          });
        }
      });

      const popularBooks = Array.from(bookCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          borrow_count: book.count
        }));

      const studentStats = new Map<string, {
        name: string;
        minutes: number;
        pages: number;
        books: Set<string>;
      }>();

      allSessions?.forEach(session => {
        const studentId = session.student_id;
        const student = students?.find(s => s.id === studentId);
        if (student) {
          if (!studentStats.has(studentId)) {
            studentStats.set(studentId, {
              name: `${student.first_name} ${student.last_name}`,
              minutes: 0,
              pages: 0,
              books: new Set()
            });
          }
          const stats = studentStats.get(studentId)!;
          stats.minutes += session.duration_minutes || 0;
          stats.pages += session.pages_read || 0;
          if (session.book_id) {
            stats.books.add(session.book_id);
          }
        }
      });

      const topReaders = Array.from(studentStats.entries())
        .map(([id, stats]) => ({
          id,
          first_name: stats.name.split(' ')[0],
          last_name: stats.name.split(' ').slice(1).join(' '),
          total_minutes: stats.minutes,
          total_pages: stats.pages,
          books_read: stats.books.size
        }))
        .sort((a, b) => b.total_minutes - a.total_minutes)
        .slice(0, 5);

      const { data: recentBorrows } = await supabase
        .from('student_books')
        .select(`
          borrowed_at,
          students (first_name, last_name),
          books (title)
        `)
        .in('book_id', (books || []).map(b => b.id))
        .order('borrowed_at', { ascending: false })
        .limit(10);

      const recentActivity = (recentBorrows || []).map((borrow: any) => ({
        student_name: `${borrow.students?.first_name} ${borrow.students?.last_name}`,
        book_title: borrow.books?.title || 'Unknown',
        action: 'geleend',
        date: borrow.borrowed_at
      }));

      const { data: materials } = await supabase
        .from('school_materials')
        .select('id, title, blink_code')
        .eq('school_id', schoolId);

      const { data: materialLoans } = await supabase
        .from('school_material_loans')
        .select(`
          id,
          material_id,
          returned_at,
          school_materials (
            id,
            title,
            blink_code
          )
        `)
        .in('material_id', (materials || []).map(m => m.id));

      const activeMaterialLoans = materialLoans?.filter(loan => !loan.returned_at).length || 0;

      const materialCounts = new Map<string, { title: string; blink_code: string; count: number; id: string }>();
      materialLoans?.forEach((loan: any) => {
        const materialId = loan.material_id;
        if (materialCounts.has(materialId)) {
          materialCounts.get(materialId)!.count++;
        } else {
          materialCounts.set(materialId, {
            id: materialId,
            title: loan.school_materials?.title || 'Unknown',
            blink_code: loan.school_materials?.blink_code || '',
            count: 1
          });
        }
      });

      const popularMaterials = Array.from(materialCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(material => ({
          id: material.id,
          title: material.title,
          blink_code: material.blink_code,
          loan_count: material.count
        }));

      setAnalytics({
        totalBooks: books?.length || 0,
        totalStudents: students?.length || 0,
        activeBorrowers: uniqueBorrowers.size,
        totalReadingMinutes: totalMinutes,
        totalPagesRead: totalPages,
        averageReadingTime: averageTime,
        totalMaterials: materials?.length || 0,
        activeMaterialLoans,
        totalMaterialLoans: materialLoans?.length || 0,
        mostPopularBooks: popularBooks,
        mostPopularMaterials: popularMaterials,
        topReaders,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setToast({ message: 'Fout bij ophalen statistieken', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-gray-600">Geen statistieken beschikbaar</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Totaal boeken</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalBooks}</p>
              </div>
              <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Leerlingen</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalStudents}</p>
              </div>
              <Users className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Actieve lezers</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.activeBorrowers}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Totaal minuten</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.totalReadingMinutes.toLocaleString()}
                </p>
              </div>
              <Clock className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Totaal pagina's</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.totalPagesRead.toLocaleString()}
                </p>
              </div>
              <BookOpen className="w-12 h-12 text-teal-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Gem. sessie</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.averageReadingTime} min</p>
              </div>
              <Award className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Totaal materialen</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalMaterials}</p>
              </div>
              <Package className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Actieve leningen</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.activeMaterialLoans}</p>
              </div>
              <Package className="w-12 h-12 text-red-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Totale leningen</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalMaterialLoans}</p>
              </div>
              <Package className="w-12 h-12 text-gray-600 opacity-20" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
              Populairste Boeken
            </h3>
            {analytics.mostPopularBooks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nog geen data beschikbaar</p>
            ) : (
              <div className="space-y-3">
                {analytics.mostPopularBooks.map((book, index) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{book.title}</p>
                        {book.author && (
                          <p className="text-xs text-gray-600">{book.author}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {book.borrow_count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-orange-600" />
              Populairste Materialen
            </h3>
            {analytics.mostPopularMaterials.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nog geen data beschikbaar</p>
            ) : (
              <div className="space-y-3">
                {analytics.mostPopularMaterials.map((material, index) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{material.title}</p>
                        <p className="text-xs text-gray-600">{material.blink_code}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      {material.loan_count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-600" />
              Top Lezers
            </h3>
            {analytics.topReaders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nog geen data beschikbaar</p>
            ) : (
              <div className="space-y-3">
                {analytics.topReaders.map((reader, index) => (
                  <div
                    key={reader.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-yellow-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {reader.first_name} {reader.last_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {reader.books_read} boek{reader.books_read !== 1 ? 'en' : ''} · {reader.total_pages} pagina's
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {reader.total_minutes} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-gray-600" />
            Recente Activiteit
          </h3>
          {analytics.recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nog geen activiteit</p>
          ) : (
            <div className="space-y-2">
              {analytics.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.student_name}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium">{activity.book_title}</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 ml-4">
                    {new Date(activity.date).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

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
