import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Search, ScanLine, UserPlus, Loader } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
  profile_picture_url: string | null;
  color: string | null;
  access_hash: string | null;
}

interface ActivityOption {
  id: string;
  name: string;
  color: string;
}

interface StudentSelectorProps {
  boardId: string;
  activityOption: ActivityOption;
  onClose: () => void;
  onSelectStudent: (studentId: string, activityOptionId: string) => void;
}

export function StudentSelector({
  boardId,
  activityOption,
  onClose,
  onSelectStudent
}: StudentSelectorProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'search' | 'scan'>('search');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchStudents();
    return () => {
      stopScanning();
    };
  }, [boardId]);

  const fetchStudents = async () => {
    if (!user) return;

    try {
      const { data: boardData } = await supabase
        .from('activity_boards')
        .select('school_id')
        .eq('id', boardId)
        .single();

      if (!boardData) return;

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, grade_level, profile_picture_url, color, access_hash')
        .eq('school_id', boardData.school_id)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    setScanning(true);
    try {
      const qrScanner = new Html5Qrcode('qr-reader');
      setHtml5QrCode(qrScanner);

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      alert('Kon camera niet starten. Gebruik de zoekfunctie.');
      setMode('search');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const hash = url.searchParams.get('h');

      if (!hash) {
        alert('Ongeldige QR-code');
        return;
      }

      const student = students.find(s => s.access_hash === hash);
      if (!student) {
        alert('Leerling niet gevonden');
        return;
      }

      await stopScanning();
      onSelectStudent(student.id, activityOption.id);
    } catch (error) {
      alert('Ongeldige QR-code format');
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.student_number || ''} ${s.grade_level || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (mode === 'scan' && !scanning) {
    startScanning();
  }

  if (mode === 'search' && scanning) {
    stopScanning();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div
          className="h-2 rounded-t-lg"
          style={{ backgroundColor: activityOption.color }}
        />
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Leerling toevoegen</h2>
            <p className="text-gray-600 mt-1">{activityOption.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === 'search' ? 'primary' : 'secondary'}
              onClick={() => setMode('search')}
              className="flex-1"
            >
              <Search className="w-4 h-4 mr-2" />
              Zoeken
            </Button>
            <Button
              variant={mode === 'scan' ? 'primary' : 'secondary'}
              onClick={() => setMode('scan')}
              className="flex-1"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Scannen
            </Button>
          </div>

          {mode === 'search' ? (
            <>
              <input
                type="text"
                placeholder="Zoek op naam, nummer of groep..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />

              {loading ? (
                <div className="text-center py-12">
                  <Loader className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-600 mt-4">Leerlingen laden...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Geen leerlingen gevonden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => onSelectStudent(student.id, activityOption.id)}
                      className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: student.color || '#6B7280' }}
                      >
                        {student.first_name[0]}
                        {student.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {student.grade_level && <span>{student.grade_level}</span>}
                          {student.student_number && (
                            <span className="text-gray-400">#{student.student_number}</span>
                          )}
                        </div>
                      </div>
                      <UserPlus className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div
                id="qr-reader"
                className="mx-auto mb-4"
                style={{ maxWidth: '400px' }}
              />
              <p className="text-sm text-gray-600">
                Scan de WebWijzer-kaart van de leerling
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
        </div>
      </Card>
    </div>
  );
}
