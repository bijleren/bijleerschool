import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { BarcodeScanner } from './BarcodeScanner';
import { ReadingSession } from './ReadingSession';
import { BookOpen, Camera, Clock, Star, ArrowLeft, ArrowLeftToLine } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
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
  borrowed_at: string;
  status: string;
  books: Book;
}

interface StudentBoekerViewProps {
  studentAccessHash: string;
  onBack: () => void;
}

export function StudentBoekerView({ studentAccessHash, onBack }: StudentBoekerViewProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [currentBooks, setCurrentBooks] = useState<StudentBook[]>([]);
  const [readBooks, setReadBooks] = useState<StudentBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedBook, setSelectedBook] = useState<StudentBook | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchStudent();
  }, [studentAccessHash]);

  useEffect(() => {
    if (student) {
      fetchStudentBooks();
    }
  }, [student]);

  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('access_hash', studentAccessHash)
        .single();

      if (error) throw error;
      setStudent(data);
    } catch (error) {
      console.error('Error fetching student:', error);
      setToast({ message: 'Leerling niet gevonden', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentBooks = async () => {
    if (!student) return;

    try {
      const { data, error } = await supabase
        .from('student_books')
        .select(`
          *,
          books (*)
        `)
        .eq('student_id', student.id)
        .order('borrowed_at', { ascending: false });

      if (error) throw error;

      const current = (data || []).filter(sb => sb.status === 'current');
      const returned = (data || []).filter(sb => sb.status === 'returned');

      setCurrentBooks(current);
      setReadBooks(returned);
    } catch (error) {
      console.error('Error fetching student books:', error);
    }
  };

  const handleIsbnScan = async (isbn: string) => {
    setShowScanner(false);

    if (!student) return;

    try {
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('school_id', student.school_id)
        .eq('isbn', isbn)
        .single();

      if (bookError || !book) {
        setToast({ message: 'Dit boek is niet beschikbaar in de bibliotheek', type: 'error' });
        return;
      }

      const existingCurrent = currentBooks.find(sb => sb.book_id === book.id);
      if (existingCurrent) {
        setSelectedBook(existingCurrent);
        return;
      }

      if (book.available_copies <= 0) {
        setToast({ message: 'Dit boek is momenteel niet beschikbaar', type: 'error' });
        return;
      }

      const { data: studentBook, error: borrowError } = await supabase
        .from('student_books')
        .insert({
          student_id: student.id,
          book_id: book.id,
          status: 'current'
        })
        .select(`
          *,
          books (*)
        `)
        .single();

      if (borrowError) throw borrowError;

      await supabase
        .from('books')
        .update({ available_copies: book.available_copies - 1 })
        .eq('id', book.id);

      setToast({ message: `${book.title} toegevoegd aan je boeken!`, type: 'success' });
      fetchStudentBooks();
    } catch (error) {
      console.error('Error handling ISBN scan:', error);
      setToast({ message: 'Fout bij toevoegen boek', type: 'error' });
    }
  };

  const handleReturnBook = async (studentBook: StudentBook) => {
    if (!confirm(`Weet je zeker dat je "${studentBook.books.title}" wilt inleveren?`)) return;

    try {
      const { error } = await supabase
        .from('student_books')
        .update({ status: 'returned', returned_at: new Date().toISOString() })
        .eq('id', studentBook.id);

      if (error) throw error;

      const { error: bookError } = await supabase
        .from('books')
        .update({
          available_copies: supabase.raw('available_copies + 1')
        })
        .eq('id', studentBook.book_id);

      if (bookError) throw bookError;

      setToast({ message: 'Boek ingeleverd', type: 'success' });
      fetchStudentBooks();
    } catch (error) {
      console.error('Error returning book:', error);
      setToast({ message: 'Fout bij inleveren boek', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-gray-600">Leerling niet gevonden</p>
        </div>
      </Card>
    );
  }

  if (selectedBook) {
    return (
      <ReadingSession
        studentBook={selectedBook}
        student={student}
        onClose={() => {
          setSelectedBook(null);
          fetchStudentBooks();
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="secondary" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">
            Hallo {student.first_name}!
          </h1>
          <p className="text-gray-600">Welkom bij Boeker</p>
        </div>
        <Button onClick={() => setShowScanner(true)}>
          <Camera className="w-4 h-4 mr-2" />
          Scan Boek
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Mijn Boeken</h2>
          </div>

          {currentBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Je hebt nog geen boeken</p>
              <Button onClick={() => setShowScanner(true)}>
                <Camera className="w-4 h-4 mr-2" />
                Scan je eerste boek
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentBooks.map((studentBook) => (
                <div
                  key={studentBook.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div
                    className="aspect-[2/3] bg-gray-100 relative cursor-pointer"
                    onClick={() => setSelectedBook(studentBook)}
                  >
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
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                      {studentBook.books.title}
                    </h3>
                    {studentBook.books.author && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                        {studentBook.books.author}
                      </p>
                    )}
                    {studentBook.books.page_count && (
                      <p className="text-xs text-gray-500 mb-3">
                        {studentBook.books.page_count} pagina's
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedBook(studentBook)}
                      >
                        <Clock className="w-3 h-3 mr-2" />
                        Start Lezen
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReturnBook(studentBook);
                        }}
                        title="Inleveren"
                      >
                        <ArrowLeftToLine className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {readBooks.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900">Gelezen Boeken</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {readBooks.map((studentBook) => (
                <div
                  key={studentBook.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[2/3] bg-gray-100 relative">
                    {(studentBook.books.cover_image_url || studentBook.books.custom_cover_url) ? (
                      <img
                        src={studentBook.books.cover_image_url || studentBook.books.custom_cover_url || ''}
                        alt={studentBook.books.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs font-medium text-gray-900 line-clamp-2">
                      {studentBook.books.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleIsbnScan}
          onClose={() => setShowScanner(false)}
        />
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
