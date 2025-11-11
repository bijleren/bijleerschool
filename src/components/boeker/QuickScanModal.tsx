import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { UnifiedScanner } from './UnifiedScanner';
import { X, Search, Camera, BookOpen, User, Check, ArrowLeft, AlertCircle } from 'lucide-react';

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
  total_copies: number;
}

interface Loan {
  student_id: string;
  student: {
    first_name: string;
    last_name: string;
  };
}

interface QuickScanModalProps {
  schoolId: string;
  onClose: () => void;
  onBookProcessed: () => void;
}

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

interface PendingBook {
  book: Book;
  currentHolder?: { first_name: string; last_name: string };
}

interface PendingStudentSwitch {
  student: Student;
}

export function QuickScanModal({ schoolId, onClose, onBookProcessed }: QuickScanModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pendingBook, setPendingBook] = useState<PendingBook | null>(null);
  const [pendingStudentSwitch, setPendingStudentSwitch] = useState<PendingStudentSwitch | null>(null);

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
      if (selectedStudent) {
        setPendingStudentSwitch({ student });
      } else {
        setSelectedStudent(student);
        setAction('lend');
        setShowScanner(true);
      }
    } else {
      setToast({ message: 'Leerling niet gevonden', type: 'error' });
    }
  };

  const confirmStudentSwitch = () => {
    if (pendingStudentSwitch) {
      setSelectedStudent(pendingStudentSwitch.student);
      setPendingStudentSwitch(null);
      setAction('lend');
      setScannedBooks([]);
    }
  };

  const cancelStudentSwitch = () => {
    setPendingStudentSwitch(null);
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setAction('lend');
    setShowScanner(true);
  };

  const handleActionSelect = (selectedAction: Action) => {
    setAction(selectedAction);
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
        setToast({ message: 'Boek niet gevonden in bibliotheek', type: 'error' });
        setProcessing(false);
        return;
      }

      if (action === 'lend' && book.available_copies <= 0) {
        const { data: currentLoans } = await supabase
          .from('book_loans')
          .select('student_id, student:students(first_name, last_name)')
          .eq('book_id', book.id)
          .is('returned_at', null)
          .limit(1)
          .single();

        setPendingBook({
          book,
          currentHolder: currentLoans?.student as any
        });
        setProcessing(false);
        return;
      }

      setPendingBook({ book });
      setProcessing(false);
    } catch (error) {
      console.error('Error scanning book:', error);
      setToast({ message: 'Fout bij scannen boek', type: 'error' });
      setProcessing(false);
    }
  };

  const confirmBookAction = async () => {
    if (!pendingBook || !selectedStudent || !action) return;

    setProcessing(true);
    try {
      const book = pendingBook.book;

      if (action === 'lend') {
        const { data: existingLoan } = await supabase
          .from('book_loans')
          .select('id')
          .eq('book_id', book.id)
          .eq('student_id', selectedStudent.id)
          .is('returned_at', null)
          .maybeSingle();

        if (existingLoan) {
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
          setPendingBook(null);
          setProcessing(false);
          return;
        }

        const { error: loanError } = await supabase
          .from('book_loans')
          .insert({
            book_id: book.id,
            student_id: selectedStudent.id,
            school_id: schoolId,
            borrowed_at: new Date().toISOString(),
          });

        if (loanError) throw loanError;

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
          message: 'Succesvol uitgeleend'
        };
        setScannedBooks(prev => [scannedBook, ...prev]);
        setToast({ message: `${book.title} uitgeleend`, type: 'success' });
      } else {
        const { data: loan, error: loanFetchError } = await supabase
          .from('book_loans')
          .select('id')
          .eq('book_id', book.id)
          .eq('student_id', selectedStudent.id)
          .is('returned_at', null)
          .maybeSingle();

        if (loanFetchError) throw loanFetchError;

        if (!loan) {
          const scannedBook: ScannedBook = {
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            timestamp: new Date(),
            success: false,
            message: 'Geen actieve lening gevonden'
          };
          setScannedBooks(prev => [scannedBook, ...prev]);
          setToast({ message: 'Geen actieve lening gevonden', type: 'error' });
          setPendingBook(null);
          setProcessing(false);
          return;
        }

        const { error: returnError } = await supabase
          .from('book_loans')
          .update({ returned_at: new Date().toISOString() })
          .eq('id', loan.id);

        if (returnError) throw returnError;

        const { error: updateError } = await supabase
          .from('books')
          .update({ available_copies: book.available_copies + 1 })
          .eq('id', book.id);

        if (updateError) throw updateError;

        const scannedBook: ScannedBook = {
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          timestamp: new Date(),
          success: true,
          message: 'Succesvol ingeleverd'
        };
        setScannedBooks(prev => [scannedBook, ...prev]);
        setToast({ message: `${book.title} ingeleverd`, type: 'success' });
      }

      onBookProcessed();
      setPendingBook(null);
      setProcessing(false);
      setShowScanner(true);
    } catch (error) {
      console.error('Error processing book:', error);
      setToast({ message: 'Fout bij verwerken boek', type: 'error' });
      setPendingBook(null);
      setProcessing(false);
    }
  };

  const cancelBookAction = () => {
    setPendingBook(null);
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setAction(null);
    setScannedBooks([]);
    setSearchQuery('');
    setShowScanner(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Snel Scannen</h2>
            {selectedStudent && (
              <p className="text-sm text-gray-600 mt-1">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!selectedStudent ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecteer leerling</h3>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowScanner(!showScanner)}
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
                    <p className="text-sm font-medium text-gray-700">Scan leerling QR-code</p>
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
                    scanningFor="both"
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
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => handleActionSelect('lend')}
                  variant={action === 'lend' ? 'primary' : 'secondary'}
                  className="flex-1"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Boek uitlenen
                </Button>
                <Button
                  onClick={() => handleActionSelect('return')}
                  variant={action === 'return' ? 'primary' : 'secondary'}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Boek inleveren
                </Button>
              </div>

              {action && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      {processing ? 'Boek verwerken...' : 'Scan boek barcode (ISBN)'}
                    </p>
                  </div>
                  <UnifiedScanner
                    onStudentScan={handleStudentScan}
                    onBookScan={handleBookScan}
                    onError={(error) => setToast({ message: error, type: 'error' })}
                    scanningFor="both"
                  />
                </div>
              )}

              {scannedBooks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Gescande boeken ({scannedBooks.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {scannedBooks.map((book, index) => (
                      <div
                        key={`${book.id}-${index}`}
                        className={`p-3 rounded-lg border-2 ${
                          book.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{book.title}</p>
                            {book.author && (
                              <p className="text-xs text-gray-600">{book.author}</p>
                            )}
                            <p className={`text-xs mt-1 ${
                              book.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {book.message}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {book.timestamp.toLocaleTimeString('nl-NL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          {selectedStudent ? (
            <Button onClick={handleReset} variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Andere leerling
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={onClose} variant="secondary">
            Sluiten
          </Button>
        </div>
      </div>

      {pendingBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {action === 'lend' ? 'Boek uitlenen' : 'Boek inleveren'}
            </h3>

            {pendingBook.currentHolder ? (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Geen exemplaren beschikbaar</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Dit boek is momenteel uitgeleend aan <strong>{pendingBook.currentHolder.first_name} {pendingBook.currentHolder.last_name}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>{pendingBook.book.title}</strong>
                </p>
                {pendingBook.book.author && (
                  <p className="text-sm text-gray-600 mb-3">
                    door {pendingBook.book.author}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  {action === 'lend'
                    ? `Wil je dit boek uitlenen aan ${selectedStudent?.first_name} ${selectedStudent?.last_name}?`
                    : `Wil je dit boek inleveren voor ${selectedStudent?.first_name} ${selectedStudent?.last_name}?`
                  }
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {!pendingBook.currentHolder && (
                <Button
                  onClick={confirmBookAction}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? 'Bezig...' : 'Ja, bevestigen'}
                </Button>
              )}
              <Button
                onClick={cancelBookAction}
                variant="secondary"
                className="flex-1"
              >
                {pendingBook.currentHolder ? 'Sluiten' : 'Nee, annuleren'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingStudentSwitch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Leerling wisselen
            </h3>

            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Wil je wisselen naar:
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-gray-900">
                  {pendingStudentSwitch.student.first_name} {pendingStudentSwitch.student.last_name}
                </p>
                {pendingStudentSwitch.student.student_number && (
                  <p className="text-sm text-gray-600">
                    {pendingStudentSwitch.student.student_number}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={confirmStudentSwitch}
                className="flex-1"
              >
                Ja, wisselen
              </Button>
              <Button
                onClick={cancelStudentSwitch}
                variant="secondary"
                className="flex-1"
              >
                Nee, annuleren
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
