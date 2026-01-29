import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Clock, AlertCircle } from 'lucide-react';

interface ActivityBoard {
  id: string;
  name: string;
  description: string | null;
  student_group_ids: string[];
  student_ids: string[];
}

interface ActivationModalProps {
  board: ActivityBoard;
  onClose: () => void;
  onActivate: (durationMinutes: number) => Promise<void>;
  studentCount: number;
  groupNames: string[];
  activeOptionsCount: number;
}

const DURATION_PRESETS = [
  { value: 15, label: '15 minuten' },
  { value: 30, label: '30 minuten' },
  { value: 45, label: '45 minuten' },
  { value: 60, label: '1 uur' },
  { value: 90, label: '1,5 uur' },
  { value: 120, label: '2 uur' },
];

export function ActivationModal({
  board,
  onClose,
  onActivate,
  studentCount,
  groupNames,
  activeOptionsCount
}: ActivationModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(45);
  const [customDuration, setCustomDuration] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (selectedDuration) {
      const now = new Date();
      const end = new Date(now.getTime() + selectedDuration * 60000);
      setEndTime(end.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [selectedDuration]);

  const handleDurationChange = (duration: number) => {
    setUseCustom(false);
    setSelectedDuration(duration);
    setCustomDuration('');
    setValidationError('');
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    setUseCustom(true);

    const minutes = parseInt(value);
    if (!isNaN(minutes)) {
      if (minutes < 5) {
        setValidationError('Minimale duur is 5 minuten');
        setSelectedDuration(null);
      } else if (minutes > 240) {
        setValidationError('Maximale duur is 4 uur (240 minuten)');
        setSelectedDuration(null);
      } else {
        setValidationError('');
        setSelectedDuration(minutes);
      }
    } else {
      setSelectedDuration(null);
      setValidationError('Voer een geldig getal in');
    }
  };

  const handleActivate = async () => {
    if (!selectedDuration) {
      setValidationError('Selecteer een duur');
      return;
    }

    if (activeOptionsCount === 0) {
      setValidationError('Het bord heeft geen actieve activiteiten');
      return;
    }

    setSubmitting(true);
    try {
      await onActivate(selectedDuration);
    } catch (error) {
      console.error('Activation error:', error);
      setValidationError('Er is een fout opgetreden bij het activeren');
      setSubmitting(false);
    }
  };

  const hasWarnings = studentCount === 0 || activeOptionsCount === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gebruik in Les</h2>
            <p className="text-gray-600 mt-1">{board.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {hasWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                {studentCount === 0 && (
                  <p className="text-yellow-800 font-medium">
                    Geen leerlingen toegewezen aan dit bord
                  </p>
                )}
                {activeOptionsCount === 0 && (
                  <p className="text-yellow-800 font-medium mt-1">
                    Het bord heeft geen actieve activiteiten
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Lesduur
              </label>
              {endTime && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>De les eindigt om {endTime}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDurationChange(preset.value)}
                  disabled={submitting}
                  className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                    selectedDuration === preset.value && !useCustom
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Aangepaste duur:
              </label>
              <input
                type="number"
                value={customDuration}
                onChange={(e) => handleCustomDurationChange(e.target.value)}
                placeholder="Minuten"
                min="5"
                max="240"
                disabled={submitting}
                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32 ${
                  useCustom && selectedDuration
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              />
              <span className="text-sm text-gray-500">(5-240 minuten)</span>
            </div>

            {validationError && (
              <p className="text-sm text-red-600 mt-2">{validationError}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Leerlingen:</span>
              <span className="font-medium text-gray-900">{studentCount}</span>
            </div>
            {groupNames.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Groepen:</span>
                <span className="font-medium text-gray-900">{groupNames.join(', ')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Actieve activiteiten:</span>
              <span className="font-medium text-gray-900">{activeOptionsCount}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuleren
          </Button>
          <Button
            onClick={handleActivate}
            disabled={submitting || !selectedDuration || activeOptionsCount === 0}
          >
            {submitting ? 'Activeren...' : 'Start Les'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
