import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, AlertTriangle, Grid } from 'lucide-react';

interface SwitchBoardModalProps {
  currentBoardName: string;
  newBoardName: string;
  onClose: () => void;
  onStopAndSwitch: () => Promise<void>;
}

export function SwitchBoardModal({
  currentBoardName,
  newBoardName,
  onClose,
  onStopAndSwitch
}: SwitchBoardModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleStopAndSwitch = async () => {
    setSubmitting(true);
    try {
      await onStopAndSwitch();
    } catch (error) {
      console.error('Switch board error:', error);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Bord Wisselen</h2>
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
                Je bent al bezig met een activiteit
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Als je wisselt naar een ander bord, wordt je huidige activiteit beëindigd.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Huidig bord</p>
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-gray-500" />
                <p className="font-medium text-gray-900">{currentBoardName}</p>
              </div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 mx-auto text-gray-400">↓</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 mb-1">Nieuw bord</p>
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-blue-500" />
                <p className="font-medium text-gray-900">{newBoardName}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Wil je je huidige activiteit beëindigen en overschakelen?
          </p>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Doorgaan
          </Button>
          <Button
            onClick={handleStopAndSwitch}
            disabled={submitting}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {submitting ? 'Wisselen...' : 'Stop & Wissel'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
