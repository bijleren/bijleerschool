import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { UnifiedScanner } from './UnifiedScanner';
import { X, Search, Camera, BookOpen, User, Check, ArrowLeft, Scan } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  access_hash: string | null;
}

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  available_copies: number;
}

interface QuickScanModalProps {
  schoolId: string;
  onClose: () => void;
  onBookProcessed: () => void;
}

type Step = 'student-selection' | 'action-selection' | 'book-scanning';
type Action = 'lend' | 'return';

interface ScannedBook {
  id: string;
  title: string;
  author: string | null;
  isbn: string;
  timestamp: Date;
  success: boolean;
  message: string;
}

export function QuickScanModal({ schoolId, onClose, onBookProcessed }: QuickScanModalProps) {
  const [step, setStep] = useState<Step>('student-selection');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanningFor, setScanningFor] = useState<'student' | 'book'>('student');
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredStudents(
        students.filter(
          (student) =>
            student.first_name.toLowerCase().includes(query) ||
            student.last_name.toLowerCase().includes(query) ||
            student.student_number?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, access_hash')
        .eq('school_id', schoolId)
        .order('last_name')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setToast({ message: 'Fout bij ophalen leerlingen', type: 'error' });
    }
  };

  const handleStudentScan = async (accessHash: string) => {
    const student = students.find(s => s.access_hash === accessHash);
    if (student) {
      setSelectedStudent(student);
      setShowScanner(false);
      setStep('action-selection');
    } else {
      setToast({ message: 'Leerling niet gevonden', type: 'error' });
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setStep('action-selection');
  };

  const handleActionSelect = (selectedAction: Action) => {
    setAction(selectedAction);
    setStep('book-scanning');
    setScanningFor('book');
    setShowScanner(true);
  };

  const handleBookScan = async (isbn: string) => {
    if (!selectedStudent || !action || processing) return;

    setProcessing(true);
    try {
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('school_id', schoolId)
        .eq('isbn', isbn)
        .maybeSingle();

      if (bookError) throw bookError;

      if (!book) {
        const scannedBook: ScannedBook = {
          id: isbn,
          title: 'Onbekend boek',
          author: null,
          isbn,
          timestamp: new Date(),
          success: false,
          message: 'Boek niet gevonden in bibliotheek'
        };
        setScannedBooks(prev => [scannedBook, ...prev]);
        setToast({ message: 'Boek niet gevonden in bibliotheek', type: 'error' });
        setProcessing(false);
        return;
      }

      if (action === 'lend') {
        if (book.available_copies <= 0) {
          const scannedBook: ScannedBook = {
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            timestamp: new Date(),
            success: false,
            message: 'Geen exemplaren beschikbaar'
          };
          setScannedBooks(prev => [scannedBook, ...prev]);
          setToast({ message: 'Geen exemplaren beschikbaar', type: 'error' });
          setProcessing(false);
          return;
        }

        const { data: existingBorrow } = await supabase
          .from('student_books')
          .select('id')
          .eq('student_id', selectedStudent.id)
          .eq('book_id', book.id)
          .eq('status', 'current')
          .maybeSingle();

        if (existingBorrow) {
          const scannedBook: ScannedBook = {
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            timestamp: new Date(),
            success: false,
            message: 'Leerling heeft dit boek al geleend'
          };
          setScannedBooks(prev => [scannedBook, ...prev]);
          setToast({ message: 'Leerling heeft dit boek al geleend', type: 'error' });
          setProcessing(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('student_books')
          .insert({
            student_id: selectedStudent.id,
            book_id: book.id,
            borrowed_at: new Date().toISOString(),
            status: 'current'
          });

        if (insertError) throw insertError;

        const { error: updateError } = await supabase
          .from('books')
          .update({ available_copies: book.available_copies - 1 })
          .eq('id', book.id);

        if (updateError) throw updateError;

        const scannedBook: ScannedBook = {
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          timestamp: new Date(),
          success: true,
          message: 'Boek uitgeleend'
        };
        setScannedBooks(prev => [scannedBook, ...prev]);
        setToast({ message: `${book.title} uitgeleend aan ${selectedStudent.first_name}`, type: 'success' });
        onBookProcessed();
      } else {
        const { data: borrowRecord, error: borrowError } = await supabase
          .from('student_books')
          .select('id')
          .eq('student_id', selectedStudent.id)
          .eq('book_id', book.id)
          .eq('status', 'current')
          .maybeSingle();

        if (borrowError) throw borrowError;

        if (!borrowRecord) {
          const scannedBook: ScannedBook = {
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            timestamp: new Date(),
            success: false,
            message: 'Dit boek is niet geleend door deze leerling'
          };
          setScannedBooks(prev => [scannedBook, ...prev]);
          setToast({ message: 'Dit boek is niet geleend door deze leerling', type: 'error' });
          setProcessing(false);
          return;
        }

        const { error: updateBorrowError } = await supabase
          .from('student_books')
          .update({
            status: 'returned',
            returned_at: new Date().toISOString()
          })
          .eq('id', borrowRecord.id);

        if (updateBorrowError) throw updateBorrowError;

        const { error: updateBookError } = await supabase
          .from('books')
          .update({ available_copies: book.available_copies + 1 })
          .eq('id', book.id);

        if (updateBookError) throw updateBookError;

        const scannedBook: ScannedBook = {
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          timestamp: new Date(),
          success: true,
          message: 'Boek ingeleverd'
        };
        setScannedBooks(prev => [scannedBook, ...prev]);
        setToast({ message: `${book.title} ingeleverd door ${selectedStudent.first_name}`, type: 'success' });
        onBookProcessed();
      }
    } catch (error) {
      console.error('Error processing book:', error);
      setToast({ message: 'Fout bij verwerken boek', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('student-selection');
    setSelectedStudent(null);
    setAction(null);
    setScannedBooks([]);
    setSearchQuery('');
    setScanningFor('student');
    setShowScanner(false);
  };

  const handleBack = () => {
    if (step === 'action-selection') {
      setStep('student-selection');
      setSelectedStudent(null);
      setScanningFor('student');
    } else if (step === 'book-scanning') {
      setStep('action-selection');
      setAction(null);
      setScannedBooks([]);
      setShowScanner(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step !== 'student-selection' && (
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Scan className="w-6 h-6 text-blue-600" />
                Quick Scan
              </h2>
              {selectedStudent && (
                <p className="text-sm text-gray-600">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                  {action && ` - ${action === 'lend' ? 'Uitlenen' : 'Inleveren'}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === 'book-scanning' && (
              <Button
                onClick={handleReset}
                variant="secondary"
                className="text-sm"
              >
                Nieuwe leerling
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === 'student-selection' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecteer leerling</h3>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowScanner(!showScanner);
                    setScanningFor('student');
                  }}
                  variant={showScanner ? 'primary' : 'secondary'}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {showScanner ? 'Scanner actief' : 'Start Scanner'}
                </Button>
              </div>

              {showScanner && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Scan leerling QR code</p>
                    <button
                      onClick={() => setShowScanner(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <UnifiedScanner
                    onStudentScan={handleStudentScan}
                    onError={(error) => setToast({ message: error, type: 'error' })}
                    scanningFor="student"
                  />
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Zoek leerling op naam of nummer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Geen leerlingen gevonden
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </p>
                            {student.student_number && (
                              <p className="text-sm text-gray-500">{student.student_number}</p>
                            )}
                          </div>
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'action-selection' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Kies actie</h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleActionSelect('lend')}
                  className="p-8 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all group"
                >
                  <BookOpen className="w-12 h-12 text-gray-400 group-hover:text-blue-600 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    Boek uitlenen
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Scan boeken om uit te lenen
                  </p>
                </button>

                <button
                  onClick={() => handleActionSelect('return')}
                  className="p-8 border-2 border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-all group"
                >
                  <Check className="w-12 h-12 text-gray-400 group-hover:text-green-600 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                    Boek inleveren
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Scan boeken om in te leveren
                  </p>
                </button>
              </div>
            </div>
          )}

          {step === 'book-scanning' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Scan boeken om te {action === 'lend' ? 'lenen' : 'inleveren'}
              </h3>

              {showScanner && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      {processing ? 'Boek verwerken...' : 'Scan boek barcode'}
                    </p>
                  </div>
                  <UnifiedScanner
                    onBookScan={handleBookScan}
                    onError={(error) => setToast({ message: error, type: 'error' })}
                    scanningFor="book"
                  />
                </div>
              )}

              {scannedBooks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Gescande boeken ({scannedBooks.length})
                  </h4>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {scannedBooks.map((book, index) => (
                      <div
                        key={`${book.id}-${index}`}
                        className={`p-4 rounded-lg border-2 ${
                          book.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {book.success ? (
                                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                              )}
                              <div>
                                <p className={`font-semibold ${
                                  book.success ? 'text-green-900' : 'text-red-900'
                                }`}>
                                  {book.title}
                                </p>
                                {book.author && (
                                  <p className="text-sm text-gray-600">{book.author}</p>
                                )}
                                <p className={`text-sm ${
                                  book.success ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {book.message}
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {book.timestamp.toLocaleTimeString('nl-NL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
