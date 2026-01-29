import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, AlertTriangle, Users } from 'lucide-react';

interface StopBoardModalProps {
  boardName: string;
  activeStudentCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function StopBoardModal({
  boardName,
  activeStudentCount,
  onClose,
  onConfirm
}: StopBoardModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Stop board error:', error);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Les Beëindigen</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                Weet je zeker dat je de les wilt beëindigen?
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Alle actieve activiteiten worden automatisch afgesloten.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Bord</p>
              <p className="text-base text-gray-900">{boardName}</p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {activeStudentCount === 0 ? (
                  'Geen actieve leerlingen'
                ) : activeStudentCount === 1 ? (
                  '1 actieve leerling wordt beëindigd'
                ) : (
                  `${activeStudentCount} actieve leerlingen worden beëindigd`
                )}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            De leerlingen krijgen een melding dat het bord is beëindigd en worden
            teruggeleid naar het overzicht.
          </p>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuleren
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? 'Beëindigen...' : 'Beëindig Les'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
