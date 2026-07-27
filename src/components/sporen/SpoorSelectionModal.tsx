import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  color: string | null;
  symbol_url: string | null;
}

interface Spoor {
  id: string;
  name: string;
  color: string;
  icon: string;
  custom_icon_url?: string | null;
}

interface SpoorSelectionModalProps {
  student: Student;
  sporen: Spoor[];
  currentSpoorId: string | null;
  onSelect: (spoorId: string | null) => void;
  onClose: () => void;
}

export function SpoorSelectionModal({ student, sporen, currentSpoorId, onSelect, onClose }: SpoorSelectionModalProps) {
  const [selectedSpoorId, setSelectedSpoorId] = useState<string | null>(currentSpoorId);

  const handleConfirm = () => {
    onSelect(selectedSpoorId);
    onClose();
  };

  const renderIcon = (spoor: Spoor) => {
    if (spoor.custom_icon_url) {
      return (
        <img
          src={spoor.custom_icon_url}
          alt=""
          className="w-8 h-8 object-contain"
        />
      );
    }

    const IconComponent = (LucideIcons as any)[spoor.icon];
    if (IconComponent) {
      return <IconComponent className="w-8 h-8" style={{ color: spoor.color }} />;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Spoor selecteren</h2>
            <p className="text-sm text-gray-600 mt-1">
              {student.first_name} {student.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {/* Option to unassign */}
            <button
              onClick={() => setSelectedSpoorId(null)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedSpoorId === null
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <X className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Niet toegewezen</div>
                  <div className="text-sm text-gray-500">Verwijder spoor toewijzing</div>
                </div>
              </div>
            </button>

            {/* List of available sporen */}
            {sporen.map(spoor => (
              <button
                key={spoor.id}
                onClick={() => setSelectedSpoorId(spoor.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedSpoorId === spoor.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                style={{
                  borderColor: selectedSpoorId === spoor.id ? '#3b82f6' : undefined,
                }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${spoor.color}20` }}
                  >
                    {renderIcon(spoor)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{spoor.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleConfirm}>
            Bevestigen
          </Button>
        </div>
      </div>
    </div>
  );
}
