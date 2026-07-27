import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Clock, Plus } from 'lucide-react';

interface ExtendTimeModalProps {
  boardName: string;
  currentEndTime: string;
  onClose: () => void;
  onExtend: (additionalMinutes: number) => Promise<void>;
}

const EXTEND_PRESETS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 uur' },
];

export function ExtendTimeModal({
  boardName,
  currentEndTime,
  onClose,
  onExtend
}: ExtendTimeModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(15);
  const [customDuration, setCustomDuration] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [newEndTime, setNewEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (selectedDuration && currentEndTime) {
      const current = new Date(currentEndTime);
      const extended = new Date(current.getTime() + selectedDuration * 60000);
      setNewEndTime(extended.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [selectedDuration, currentEndTime]);

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
      if (minutes < 1) {
        setValidationError('Minimale verlenging is 1 minuut');
        setSelectedDuration(null);
      } else if (minutes > 120) {
        setValidationError('Maximale verlenging is 2 uur (120 minuten)');
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

  const handleExtend = async () => {
    if (!selectedDuration) {
      setValidationError('Selecteer een verlenging');
      return;
    }

    setSubmitting(true);
    try {
      await onExtend(selectedDuration);
    } catch (error) {
      console.error('Extend time error:', error);
      setValidationError('Er is een fout opgetreden bij het verlengen');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Les Verlengen</h2>
            <p className="text-gray-600 mt-1">{boardName}</p>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-#5C4118">
              <Clock className="w-4 h-4" />
              <span>Huidige eindtijd:</span>
              <span className="font-semibold">
                {new Date(currentEndTime).toLocaleTimeString('nl-NL', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {newEndTime && (
              <div className="flex items-center gap-2 text-sm text-#3D2B10 mt-2 font-medium">
                <Plus className="w-4 h-4" />
                <span>Nieuwe eindtijd:</span>
                <span className="font-bold">{newEndTime}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Verlengen met
            </label>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {EXTEND_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDurationChange(preset.value)}
                  disabled={submitting}
                  className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                    selectedDuration === preset.value && !useCustom
                      ? 'border-amber-500 bg-amber-50 text-#74531F'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Aangepast:
              </label>
              <input
                type="number"
                value={customDuration}
                onChange={(e) => handleCustomDurationChange(e.target.value)}
                placeholder="Minuten"
                min="1"
                max="120"
                disabled={submitting}
                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent w-32 ${
                  useCustom && selectedDuration
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-300'
                }`}
              />
              <span className="text-sm text-gray-500">(1-120 minuten)</span>
            </div>

            {validationError && (
              <p className="text-sm text-red-600 mt-2">{validationError}</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuleren
          </Button>
          <Button
            onClick={handleExtend}
            disabled={submitting || !selectedDuration}
          >
            {submitting ? 'Verlengen...' : 'Verlengen'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
