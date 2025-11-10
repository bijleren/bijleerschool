import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { Search, BookOpen, Clock, X, ArrowLeft } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
}

interface StudentWithStats {
  student: Student;
  current_books: number;
  total_books: number;
  total_minutes: number;
  total_pages: number;
  current_books_details: Array<{
    id: string;
    book_title: string;
    book_author: string | null;
    borrowed_at: string;
    current_page: number | null;
    total_pages: number | null;
    progress_percentage: number | null;
  }>;
}

interface StudentBookManagementProps {
  schoolId: string;
  initialStudentId?: string | null;
  onClearStudent?: () => void;
}

export function StudentBookManagement({ schoolId, initialStudentId, onClearStudent }: StudentBookManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  useEffect(() => {
    if (initialStudentId && filteredStudents.length > 0) {
      const student = filteredStudents.find(s => s.student.id === initialStudentId);
      if (student) {
        setSelectedStudent(student);
      }
    }
  }, [initialStudentId, filteredStudents]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .order('last_name')
        .order('first_name');

      if (error) throw error;

      const studentsWithStats = await Promise.all(
        (studentsData || []).map(async (student) => {
          const { data: currentBooks } = await supabase
            .from('student_books')
            .select(`
              id,
              borrowed_at,
              books (
                id,
                title,
                author,
                page_count
              )
            `)
            .eq('student_id', student.id)
            .eq('status', 'current');

          const { data: allBooks } = await supabase
            .from('student_books')
            .select('id')
            .eq('student_id', student.id);

          const { data: sessions } = await supabase
            .from('reading_sessions')
            .select('duration_minutes, pages_read')
            .eq('student_id', student.id);

          const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
          const totalPages = sessions?.reduce((sum, s) => sum + (s.pages_read || 0), 0) || 0;

          const currentBooksDetails = await Promise.all(
            (currentBooks || []).map(async (sb: any) => {
              const { data: lastSession } = await supabase
                .from('reading_sessions')
                .select('end_page')
                .eq('student_book_id', sb.id)
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();

              const currentPage = lastSession?.end_page || null;
              const progressPercentage = sb.books.page_count && currentPage
                ? Math.round((currentPage / sb.books.page_count) * 100)
                : null;

              return {
                id: sb.id,
                book_title: sb.books.title,
                book_author: sb.books.author,
                borrowed_at: sb.borrowed_at,
                current_page: currentPage,
                total_pages: sb.books.page_count,
                progress_percentage: progressPercentage
              };
            })
          );

          return {
            student,
            current_books: currentBooks?.length || 0,
            total_books: allBooks?.length || 0,
            total_minutes: totalMinutes,
            total_pages: totalPages,
            current_books_details: currentBooksDetails
          };
        })
      );

      setStudents(studentsData || []);
      setFilteredStudents(studentsWithStats);
    } catch (error) {
      console.error('Error fetching students:', error);
      setToast({ message: 'Fout bij ophalen leerlingen', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = filteredStudents.filter(
      (item) =>
        item.student.first_name.toLowerCase().includes(query) ||
        item.student.last_name.toLowerCase().includes(query) ||
        item.student.student_number?.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedStudent(null);
              if (onClearStudent) onClearStudent();
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedStudent.student.first_name} {selectedStudent.student.last_name}
            </h2>
            {selectedStudent.student.student_number && (
              <p className="text-sm text-gray-500">Leerlingnummer: {selectedStudent.student.student_number}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-1">Huidige boeken</p>
              <p className="text-3xl font-bold text-blue-600">{selectedStudent.current_books}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-1">Totaal geleend</p>
              <p className="text-3xl font-bold text-gray-900">{selectedStudent.total_books}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-1">Minuten gelezen</p>
              <p className="text-3xl font-bold text-green-600">{selectedStudent.total_minutes}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-1">Pagina's gelezen</p>
              <p className="text-3xl font-bold text-purple-600">{selectedStudent.total_pages}</p>
            </div>
          </Card>
        </div>

        {selectedStudent.current_books_details.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Huidige boeken</h3>
              <div className="space-y-4">
                {selectedStudent.current_books_details.map((book) => (
                  <div key={book.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{book.book_title}</h4>
                        {book.book_author && (
                          <p className="text-sm text-gray-600">{book.book_author}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Begonnen op {new Date(book.borrowed_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      {book.current_page && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">
                            Pagina {book.current_page}
                            {book.total_pages && ` / ${book.total_pages}`}
                          </p>
                        </div>
                      )}
                    </div>

                    {book.progress_percentage !== null && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Voortgang</span>
                          <span className="font-semibold">{book.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${book.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Leerlingen</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Zoek leerling..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'Geen leerlingen gevonden' : 'Geen leerlingen'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Naam
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leerlingnummer
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Huidige boeken
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Totaal geleend
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Minuten
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pagina's
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((item) => (
                    <tr
                      key={item.student.id}
                      onClick={() => setSelectedStudent(item)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {item.student.first_name} {item.student.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-500">{item.student.student_number || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                          {item.current_books}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900">{item.total_books}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center text-sm text-gray-900">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {item.total_minutes}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center text-sm text-gray-900">
                          <BookOpen className="w-4 h-4 mr-1 text-gray-400" />
                          {item.total_pages}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
