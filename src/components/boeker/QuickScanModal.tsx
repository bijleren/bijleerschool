import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { UniversalScanner } from '../ui/UniversalScanner';
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

interface Material {
  id: string;
  blink_code: string;
  name: string;
  description: string | null;
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

interface ScannedItem {
  id: string;
  title: string;
  subtitle: string | null;
  code: string;
  type: 'book' | 'material';
  timestamp: Date;
  success: boolean;
  message: string;
}

interface PendingItem {
  item: Book | Material;
  type: 'book' | 'material';
  currentHolder?: { id: string; first_name: string; last_name: string; access_hash?: string };
  autoReturn?: boolean;
}

interface PendingStudentSwitch {
  student: Student;
}

export function QuickScanModal({ schoolId, onClose, onBookProcessed }: QuickScanModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionState, setActionState] = useState<Action | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [pendingStudentSwitch, setPendingStudentSwitch] = useState<PendingStudentSwitch | null>(null);

  const action = actionState;
  const setAction = (newAction: Action | null) => {
    console.log('ACTION CHANGED:', { from: actionState, to: newAction, stack: new Error().stack });
    setActionState(newAction);
  };

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
    console.log('Student scan attempt:', accessHash);
    const student = students.find(s => s.access_hash === accessHash);
    if (student) {
      console.log('Student found:', student.first_name, student.last_name);
      if (selectedStudent) {
        console.log('Student already selected, showing switch confirmation');
        setPendingStudentSwitch({ student });
      } else {
        console.log('No student selected, selecting this one and setting action to lend');
        setSelectedStudent(student);
        setAction('lend');
        setShowScanner(true);
      }
    } else {
      console.log('Student not found for hash:', accessHash);
      setToast({ message: 'Leerling niet gevonden', type: 'error' });
    }
  };

  const confirmStudentSwitch = () => {
    if (pendingStudentSwitch) {
      setSelectedStudent(pendingStudentSwitch.student);
      setPendingStudentSwitch(null);
      setAction('lend');
      setScannedItems([]);
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
    if (processing) {
      console.log('Scan blocked: processing');
      return;
    }

    console.log('Book scan started. Current action:', action, 'Student:', !!selectedStudent);
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

      console.log('Book found. Setting pending item. Current action:', action);

      const { data: currentLoan } = await supabase
        .from('book_loans')
        .select('student_id, student:students(id, first_name, last_name, access_hash)')
        .eq('book_id', book.id)
        .is('returned_at', null)
        .maybeSingle();

      if (!selectedStudent && currentLoan) {
        const studentWithLoan = currentLoan.student as any;
        setPendingItem({
          item: book,
          type: 'book',
          currentHolder: studentWithLoan,
          autoReturn: true
        });
        setProcessing(false);
        return;
      }

      if (!selectedStudent && !currentLoan) {
        setToast({ message: 'Selecteer eerst een leerling om een boek uit te lenen', type: 'error' });
        setProcessing(false);
        return;
      }

      if (action === 'lend' && book.available_copies <= 0) {
        setPendingItem({
          item: book,
          type: 'book',
          currentHolder: currentLoan?.student as any
        });
        setProcessing(false);
        return;
      }

      setPendingItem({ item: book, type: 'book' });
      setProcessing(false);
    } catch (error) {
      console.error('Error scanning book:', error);
      setToast({ message: 'Fout bij scannen boek', type: 'error' });
      setProcessing(false);
    }
  };

  const handleMaterialScan = async (blinkCode: string) => {
    if (processing) {
      console.log('Scan blocked: processing');
      return;
    }

    console.log('Material scan started. Current action:', action, 'Student:', !!selectedStudent);
    setProcessing(true);
    try {
      const { data: material, error: materialError } = await supabase
        .from('school_materials')
        .select('*')
        .eq('school_id', schoolId)
        .eq('blink_code', blinkCode)
        .maybeSingle();

      if (materialError) throw materialError;

      if (!material) {
        setToast({ message: 'Materiaal niet gevonden', type: 'error' });
        setProcessing(false);
        return;
      }

      console.log('Material found. Setting pending item. Current action:', action);

      const { data: currentLoan } = await supabase
        .from('school_material_loans')
        .select('student_id, students(id, first_name, last_name)')
        .eq('material_id', material.id)
        .is('returned_at', null)
        .maybeSingle();

      if (!selectedStudent && currentLoan) {
        const studentWithLoan = currentLoan.students as any;
        setPendingItem({
          item: material,
          type: 'material',
          currentHolder: studentWithLoan,
          autoReturn: true
        });
        setProcessing(false);
        return;
      }

      if (!selectedStudent && !currentLoan) {
        setToast({ message: 'Selecteer eerst een leerling om materiaal uit te lenen', type: 'error' });
        setProcessing(false);
        return;
      }

      if (action === 'lend' && material.available_copies <= 0) {
        setPendingItem({
          item: material,
          type: 'material',
          currentHolder: currentLoan?.students as any
        });
        setProcessing(false);
        return;
      }

      setPendingItem({ item: material, type: 'material' });
      setProcessing(false);
    } catch (error) {
      console.error('Error scanning material:', error);
      setToast({ message: 'Fout bij scannen materiaal', type: 'error' });
      setProcessing(false);
    }
  };

  const handleAutoReturn = async () => {
    if (!pendingItem || !pendingItem.currentHolder) return;

    setProcessing(true);
    try {
      const item = pendingItem.item;
      const holder = pendingItem.currentHolder;
      const isBook = pendingItem.type === 'book';

      const table = isBook ? 'book_loans' : 'school_material_loans';
      const idField = isBook ? 'book_id' : 'material_id';

      const { data: loan, error: loanFetchError } = await supabase
        .from(table)
        .select('id')
        .eq(idField, item.id)
        .eq('student_id', holder.id)
        .is('returned_at', null)
        .maybeSingle();

      if (loanFetchError) throw loanFetchError;

      if (!loan) {
        setToast({ message: 'Geen actieve lening gevonden', type: 'error' });
        setPendingItem(null);
        setProcessing(false);
        return;
      }

      const { error: returnError } = await supabase
        .from(table)
        .update({ returned_at: new Date().toISOString() })
        .eq('id', loan.id);

      if (returnError) throw returnError;

      const updateTable = isBook ? 'books' : 'school_materials';
      const { error: updateError } = await supabase
        .from(updateTable)
        .update({ available_copies: item.available_copies + 1 })
        .eq('id', item.id);

      if (updateError) throw updateError;

      const title = isBook ? (item as Book).title : (item as Material).name;
      const subtitle = isBook ? (item as Book).author : (item as Material).description;
      const code = isBook ? (item as Book).isbn : (item as Material).blink_code;

      const scannedItem: ScannedItem = {
        id: item.id,
        title,
        subtitle,
        code,
        type: pendingItem.type,
        timestamp: new Date(),
        success: true,
        message: `Ingeleverd door ${holder.first_name} ${holder.last_name}`
      };
      setScannedItems(prev => [scannedItem, ...prev]);
      setToast({ message: `${title} ingeleverd door ${holder.first_name} ${holder.last_name}`, type: 'success' });

      onBookProcessed();
      setPendingItem(null);
      setProcessing(false);
    } catch (error) {
      console.error('Error processing auto-return:', error);
      setToast({ message: 'Fout bij verwerken', type: 'error' });
      setPendingItem(null);
      setProcessing(false);
    }
  };

  const confirmItemAction = async () => {
    if (!pendingItem) return;

    if (pendingItem.autoReturn && pendingItem.currentHolder) {
      await handleAutoReturn();
      return;
    }

    if (!selectedStudent || !action) return;

    setProcessing(true);
    try {
      const item = pendingItem.item;
      const isBook = pendingItem.type === 'book';
      const table = isBook ? 'book_loans' : 'school_material_loans';
      const idField = isBook ? 'book_id' : 'material_id';
      const updateTable = isBook ? 'books' : 'school_materials';

      const title = isBook ? (item as Book).title : (item as Material).name;
      const subtitle = isBook ? (item as Book).author : (item as Material).description;
      const code = isBook ? (item as Book).isbn : (item as Material).blink_code;

      if (action === 'lend') {
        const { data: existingLoan } = await supabase
          .from(table)
          .select('id')
          .eq(idField, item.id)
          .eq('student_id', selectedStudent.id)
          .is('returned_at', null)
          .maybeSingle();

        if (existingLoan) {
          const scannedItem: ScannedItem = {
            id: item.id,
            title,
            subtitle,
            code,
            type: pendingItem.type,
            timestamp: new Date(),
            success: false,
            message: 'Leerling heeft dit al geleend'
          };
          setScannedItems(prev => [scannedItem, ...prev]);
          setToast({ message: 'Leerling heeft dit al geleend', type: 'error' });
          setPendingItem(null);
          setProcessing(false);
          return;
        }

        const loanData: any = {
          [idField]: item.id,
          student_id: selectedStudent.id,
          school_id: schoolId,
          loaned_at: new Date().toISOString(),
        };

        if (isBook) {
          loanData.borrowed_at = loanData.loaned_at;
          delete loanData.loaned_at;
        }

        const { error: loanError } = await supabase
          .from(table)
          .insert(loanData);

        if (loanError) throw loanError;

        const { error: updateError } = await supabase
          .from(updateTable)
          .update({ available_copies: item.available_copies - 1 })
          .eq('id', item.id);

        if (updateError) throw updateError;

        const scannedItem: ScannedItem = {
          id: item.id,
          title,
          subtitle,
          code,
          type: pendingItem.type,
          timestamp: new Date(),
          success: true,
          message: 'Succesvol uitgeleend'
        };
        setScannedItems(prev => [scannedItem, ...prev]);
        setToast({ message: `${title} uitgeleend`, type: 'success' });
      } else {
        const { data: loan, error: loanFetchError } = await supabase
          .from(table)
          .select('id')
          .eq(idField, item.id)
          .eq('student_id', selectedStudent.id)
          .is('returned_at', null)
          .maybeSingle();

        if (loanFetchError) throw loanFetchError;

        if (!loan) {
          const scannedItem: ScannedItem = {
            id: item.id,
            title,
            subtitle,
            code,
            type: pendingItem.type,
            timestamp: new Date(),
            success: false,
            message: 'Geen actieve lening gevonden'
          };
          setScannedItems(prev => [scannedItem, ...prev]);
          setToast({ message: 'Geen actieve lening gevonden', type: 'error' });
          setPendingItem(null);
          setProcessing(false);
          return;
        }

        const { error: returnError } = await supabase
          .from(table)
          .update({ returned_at: new Date().toISOString() })
          .eq('id', loan.id);

        if (returnError) throw returnError;

        const { error: updateError } = await supabase
          .from(updateTable)
          .update({ available_copies: item.available_copies + 1 })
          .eq('id', item.id);

        if (updateError) throw updateError;

        const scannedItem: ScannedItem = {
          id: item.id,
          title,
          subtitle,
          code,
          type: pendingItem.type,
          timestamp: new Date(),
          success: true,
          message: 'Succesvol ingeleverd'
        };
        setScannedItems(prev => [scannedItem, ...prev]);
        setToast({ message: `${title} ingeleverd`, type: 'success' });
      }

      onBookProcessed();
      setPendingItem(null);
      setProcessing(false);
    } catch (error) {
      console.error('Error processing item:', error);
      setToast({ message: 'Fout bij verwerken', type: 'error' });
      setPendingItem(null);
      setProcessing(false);
    }
  };

  const cancelItemAction = () => {
    setPendingItem(null);
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setAction(null);
    setScannedItems([]);
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecteer leerling of scan boek/materiaal om in te leveren</h3>

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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Scan een boek of materiaal om deze direct in te leveren, of scan een leerling om uit te lenen.
                  </p>
                </div>
              )}

              {showScanner && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Scan leerling QR, boek barcode of materiaal BlinkQR</p>
                    <button
                      onClick={() => setShowScanner(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <UniversalScanner
                    onStudentScan={handleStudentScan}
                    onBookScan={handleBookScan}
                    onMaterialScan={handleMaterialScan}
                    onError={(error) => setToast({ message: error, type: 'error' })}
                    scanningFor="all"
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
                  Uitlenen
                </Button>
                <Button
                  onClick={() => handleActionSelect('return')}
                  variant={action === 'return' ? 'primary' : 'secondary'}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Inleveren
                </Button>
              </div>

              {action && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      {processing ? 'Item verwerken...' : 'Scan boek barcode of materiaal BlinkQR'}
                    </p>
                  </div>
                  <UniversalScanner
                    onStudentScan={handleStudentScan}
                    onBookScan={handleBookScan}
                    onMaterialScan={handleMaterialScan}
                    onError={(error) => setToast({ message: error, type: 'error' })}
                    scanningFor="all"
                  />
                </div>
              )}

              {scannedItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Gescande items ({scannedItems.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {scannedItems.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className={`p-3 rounded-lg border-2 ${
                          item.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                                {item.type === 'book' ? 'Boek' : 'Materiaal'}
                              </span>
                            </div>
                            {item.subtitle && (
                              <p className="text-xs text-gray-600">{item.subtitle}</p>
                            )}
                            <p className={`text-xs mt-1 ${
                              item.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {item.message}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {item.timestamp.toLocaleTimeString('nl-NL', {
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

      {pendingItem && (() => {
        const item = pendingItem.item;
        const isBook = pendingItem.type === 'book';
        const title = isBook ? (item as Book).title : (item as Material).name;
        const subtitle = isBook ? (item as Book).author : (item as Material).description;
        const itemType = isBook ? 'boek' : 'materiaal';

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {pendingItem.autoReturn ? `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} inleveren` : (action === 'lend' ? `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} uitlenen` : `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} inleveren`)}
              </h3>

              {pendingItem.autoReturn && pendingItem.currentHolder ? (
                <div className="mb-4">
                  <p className="text-gray-700 mb-2">
                    <strong>{title}</strong>
                  </p>
                  {subtitle && (
                    <p className="text-sm text-gray-600 mb-3">
                      {subtitle}
                    </p>
                  )}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                    <div className="flex items-start">
                      <BookOpen className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Momenteel uitgeleend aan</p>
                        <p className="text-sm text-blue-700 mt-1">
                          <strong>{pendingItem.currentHolder.first_name} {pendingItem.currentHolder.last_name}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Wil je dit {itemType} inleveren?
                  </p>
                </div>
              ) : pendingItem.currentHolder && !pendingItem.autoReturn ? (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Geen exemplaren beschikbaar</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Dit {itemType} is momenteel uitgeleend aan <strong>{pendingItem.currentHolder.first_name} {pendingItem.currentHolder.last_name}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-gray-700 mb-2">
                    <strong>{title}</strong>
                  </p>
                  {subtitle && (
                    <p className="text-sm text-gray-600 mb-3">
                      {subtitle}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    {action === 'lend'
                      ? `Wil je dit ${itemType} uitlenen aan ${selectedStudent?.first_name} ${selectedStudent?.last_name}?`
                      : `Wil je dit ${itemType} inleveren voor ${selectedStudent?.first_name} ${selectedStudent?.last_name}?`
                    }
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {(!pendingItem.currentHolder || pendingItem.autoReturn) && (
                  <Button
                    onClick={confirmItemAction}
                    disabled={processing}
                    className="flex-1"
                  >
                    {processing ? 'Bezig...' : 'Ja, bevestigen'}
                  </Button>
                )}
                <Button
                  onClick={cancelItemAction}
                  variant="secondary"
                  className="flex-1"
                >
                  {(pendingItem.currentHolder && !pendingItem.autoReturn) ? 'Sluiten' : 'Nee, annuleren'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

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
