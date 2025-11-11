import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { UniversalScanner } from '../ui/UniversalScanner';
import { X, Search, Camera, Package, User, Check, ArrowLeft, AlertCircle } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string | null;
  access_hash: string | null;
}

interface Material {
  id: string;
  blink_code: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  is_available: boolean;
}

interface MaterialLoan {
  id: string;
  material_id: string;
  student_id: string;
  loaned_at: string;
  loaned_by: string;
  returned_at: string | null;
  students: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface QuickScanMaterialModalProps {
  schoolId: string;
  userId: string;
  onClose: () => void;
  onMaterialProcessed: () => void;
}

type Action = 'lend' | 'return';

interface ScannedMaterial {
  id: string;
  title: string;
  blink_code: string;
  timestamp: Date;
  success: boolean;
  message: string;
}

interface PendingMaterial {
  material: Material;
  currentHolder?: { id: string; first_name: string; last_name: string };
  autoReturn?: boolean;
}

interface PendingStudentSwitch {
  student: Student;
}

export function QuickScanMaterialModal({ schoolId, userId, onClose, onMaterialProcessed }: QuickScanMaterialModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionState, setActionState] = useState<Action | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMaterials, setScannedMaterials] = useState<ScannedMaterial[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pendingMaterial, setPendingMaterial] = useState<PendingMaterial | null>(null);
  const [pendingStudentSwitch, setPendingStudentSwitch] = useState<PendingStudentSwitch | null>(null);

  const action = actionState;
  const setAction = (newAction: Action | null) => {
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
            student.student_code?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_code, access_hash')
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
      setScannedMaterials([]);
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

      console.log('Material found. Setting pending material. Current action:', action);

      const { data: currentLoan } = await supabase
        .from('school_material_loans')
        .select('student_id, students:students(id, first_name, last_name)')
        .eq('material_id', material.id)
        .is('returned_at', null)
        .maybeSingle();

      if (!selectedStudent && currentLoan) {
        const studentWithLoan = currentLoan.students as any;
        setPendingMaterial({
          material,
          currentHolder: studentWithLoan,
          autoReturn: true
        });
        setProcessing(false);
        return;
      }

      if (!selectedStudent && !currentLoan) {
        setToast({ message: 'Selecteer eerst een leerling om een materiaal uit te lenen', type: 'error' });
        setProcessing(false);
        return;
      }

      if (action === 'lend' && !material.is_available) {
        setPendingMaterial({
          material,
          currentHolder: currentLoan?.students as any
        });
        setProcessing(false);
        return;
      }

      setPendingMaterial({ material });
      setProcessing(false);
    } catch (error) {
      console.error('Error scanning material:', error);
      setToast({ message: 'Fout bij scannen materiaal', type: 'error' });
      setProcessing(false);
    }
  };

  const handleAutoReturn = async () => {
    if (!pendingMaterial || !pendingMaterial.currentHolder) return;

    setProcessing(true);
    try {
      const material = pendingMaterial.material;
      const holder = pendingMaterial.currentHolder;

      const { data: loan, error: loanFetchError } = await supabase
        .from('school_material_loans')
        .select('id')
        .eq('material_id', material.id)
        .eq('student_id', holder.id)
        .is('returned_at', null)
        .maybeSingle();

      if (loanFetchError) throw loanFetchError;

      if (!loan) {
        setToast({ message: 'Geen actieve lening gevonden', type: 'error' });
        setPendingMaterial(null);
        setProcessing(false);
        return;
      }

      const { error: returnError } = await supabase
        .from('school_material_loans')
        .update({
          returned_at: new Date().toISOString(),
          returned_by: userId
        })
        .eq('id', loan.id);

      if (returnError) throw returnError;

      const { error: updateError } = await supabase
        .from('school_materials')
        .update({ is_available: true })
        .eq('id', material.id);

      if (updateError) throw updateError;

      const scannedMaterial: ScannedMaterial = {
        id: material.id,
        title: material.title,
        blink_code: material.blink_code,
        timestamp: new Date(),
        success: true,
        message: `Ingeleverd door ${holder.first_name} ${holder.last_name}`
      };
      setScannedMaterials(prev => [scannedMaterial, ...prev]);
      setToast({ message: `${material.title} ingeleverd door ${holder.first_name} ${holder.last_name}`, type: 'success' });

      onMaterialProcessed();
      setPendingMaterial(null);
      setProcessing(false);
    } catch (error) {
      console.error('Error processing auto-return:', error);
      setToast({ message: 'Fout bij verwerken materiaal', type: 'error' });
      setPendingMaterial(null);
      setProcessing(false);
    }
  };

  const confirmMaterialAction = async () => {
    if (!pendingMaterial) return;

    if (pendingMaterial.autoReturn && pendingMaterial.currentHolder) {
      await handleAutoReturn();
      return;
    }

    if (!selectedStudent || !action) return;

    setProcessing(true);
    try {
      const material = pendingMaterial.material;

      if (action === 'lend') {
        const { data: existingLoan } = await supabase
          .from('school_material_loans')
          .select('id')
          .eq('material_id', material.id)
          .eq('student_id', selectedStudent.id)
          .is('returned_at', null)
          .maybeSingle();

        if (existingLoan) {
          const scannedMaterial: ScannedMaterial = {
            id: material.id,
            title: material.title,
            blink_code: material.blink_code,
            timestamp: new Date(),
            success: false,
            message: 'Leerling heeft dit materiaal al geleend'
          };
          setScannedMaterials(prev => [scannedMaterial, ...prev]);
          setToast({ message: 'Leerling heeft dit materiaal al geleend', type: 'error' });
          setPendingMaterial(null);
          setProcessing(false);
          return;
        }

        const { error: loanError } = await supabase
          .from('school_material_loans')
          .insert({
            material_id: material.id,
            student_id: selectedStudent.id,
            loaned_by: userId,
            notes: null
          });

        if (loanError) throw loanError;

        const { error: updateError } = await supabase
          .from('school_materials')
          .update({ is_available: false })
          .eq('id', material.id);

        if (updateError) throw updateError;

        const scannedMaterial: ScannedMaterial = {
          id: material.id,
          title: material.title,
          blink_code: material.blink_code,
          timestamp: new Date(),
          success: true,
          message: 'Succesvol uitgeleend'
        };
        setScannedMaterials(prev => [scannedMaterial, ...prev]);
        setToast({ message: `${material.title} uitgeleend`, type: 'success' });
      } else {
        const { data: loan, error: loanFetchError } = await supabase
          .from('school_material_loans')
          .select('id')
          .eq('material_id', material.id)
          .eq('student_id', selectedStudent.id)
          .is('returned_at', null)
          .maybeSingle();

        if (loanFetchError) throw loanFetchError;

        if (!loan) {
          const scannedMaterial: ScannedMaterial = {
            id: material.id,
            title: material.title,
            blink_code: material.blink_code,
            timestamp: new Date(),
            success: false,
            message: 'Geen actieve lening gevonden'
          };
          setScannedMaterials(prev => [scannedMaterial, ...prev]);
          setToast({ message: 'Geen actieve lening gevonden', type: 'error' });
          setPendingMaterial(null);
          setProcessing(false);
          return;
        }

        const { error: returnError } = await supabase
          .from('school_material_loans')
          .update({
            returned_at: new Date().toISOString(),
            returned_by: userId
          })
          .eq('id', loan.id);

        if (returnError) throw returnError;

        const { error: updateError } = await supabase
          .from('school_materials')
          .update({ is_available: true })
          .eq('id', material.id);

        if (updateError) throw updateError;

        const scannedMaterial: ScannedMaterial = {
          id: material.id,
          title: material.title,
          blink_code: material.blink_code,
          timestamp: new Date(),
          success: true,
          message: 'Succesvol ingeleverd'
        };
        setScannedMaterials(prev => [scannedMaterial, ...prev]);
        setToast({ message: `${material.title} ingeleverd`, type: 'success' });
      }

      onMaterialProcessed();
      setPendingMaterial(null);
      setProcessing(false);
    } catch (error) {
      console.error('Error processing material:', error);
      setToast({ message: 'Fout bij verwerken materiaal', type: 'error' });
      setPendingMaterial(null);
      setProcessing(false);
    }
  };

  const cancelMaterialAction = () => {
    setPendingMaterial(null);
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setAction(null);
    setScannedMaterials([]);
    setSearchQuery('');
    setShowScanner(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Snel Scannen - Materialen</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecteer leerling of scan materiaal om in te leveren</h3>

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
                    <strong>💡 Tip:</strong> Scan een materiaal om deze direct in te leveren, of scan een leerling om materialen uit te lenen.
                  </p>
                </div>
              )}

              {showScanner && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Scan leerling QR-code of materiaal BlinkQR</p>
                    <button
                      onClick={() => setShowScanner(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <UniversalScanner
                    onStudentScan={handleStudentScan}
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
                            {student.student_code && (
                              <p className="text-sm text-gray-500">{student.student_code}</p>
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
                  <Package className="w-4 h-4 mr-2" />
                  Materiaal uitlenen
                </Button>
                <Button
                  onClick={() => handleActionSelect('return')}
                  variant={action === 'return' ? 'primary' : 'secondary'}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Materiaal inleveren
                </Button>
              </div>

              {action && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      {processing ? 'Materiaal verwerken...' : 'Scan materiaal BlinkQR code'}
                    </p>
                  </div>
                  <UniversalScanner
                    onStudentScan={handleStudentScan}
                    onMaterialScan={handleMaterialScan}
                    onError={(error) => setToast({ message: error, type: 'error' })}
                    scanningFor="all"
                  />
                </div>
              )}

              {scannedMaterials.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Gescande materialen ({scannedMaterials.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {scannedMaterials.map((material, index) => (
                      <div
                        key={`${material.id}-${index}`}
                        className={`p-3 rounded-lg border-2 ${
                          material.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{material.title}</p>
                            <p className="text-xs text-gray-600">Code: {material.blink_code}</p>
                            <p className={`text-xs mt-1 ${
                              material.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {material.message}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {material.timestamp.toLocaleTimeString('nl-NL', {
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

      {pendingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {pendingMaterial.autoReturn ? 'Materiaal inleveren' : (action === 'lend' ? 'Materiaal uitlenen' : 'Materiaal inleveren')}
            </h3>

            {pendingMaterial.autoReturn && pendingMaterial.currentHolder ? (
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>{pendingMaterial.material.title}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Code: {pendingMaterial.material.blink_code}
                </p>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Momenteel uitgeleend aan</p>
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>{pendingMaterial.currentHolder.first_name} {pendingMaterial.currentHolder.last_name}</strong>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Wil je dit materiaal inleveren?
                </p>
              </div>
            ) : pendingMaterial.currentHolder && !pendingMaterial.autoReturn ? (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Niet beschikbaar</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Dit materiaal is momenteel uitgeleend aan <strong>{pendingMaterial.currentHolder.first_name} {pendingMaterial.currentHolder.last_name}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>{pendingMaterial.material.title}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Code: {pendingMaterial.material.blink_code}
                </p>
                <p className="text-sm text-gray-600">
                  {action === 'lend'
                    ? `Wil je dit materiaal uitlenen aan ${selectedStudent?.first_name} ${selectedStudent?.last_name}?`
                    : `Wil je dit materiaal inleveren voor ${selectedStudent?.first_name} ${selectedStudent?.last_name}?`
                  }
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {(!pendingMaterial.currentHolder || pendingMaterial.autoReturn) && (
                <Button
                  onClick={confirmMaterialAction}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? 'Bezig...' : 'Ja, bevestigen'}
                </Button>
              )}
              <Button
                onClick={cancelMaterialAction}
                variant="secondary"
                className="flex-1"
              >
                {(pendingMaterial.currentHolder && !pendingMaterial.autoReturn) ? 'Sluiten' : 'Nee, annuleren'}
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
                {pendingStudentSwitch.student.student_code && (
                  <p className="text-sm text-gray-600">
                    {pendingStudentSwitch.student.student_code}
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
