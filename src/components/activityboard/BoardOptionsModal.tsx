import React from 'react';
import { X, Camera, Eye, EyeOff, User, Users as UsersIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { QRScanner } from './QRScanner';

interface BoardOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'teacher' | 'student';
  onModeChange: (mode: 'teacher' | 'student') => void;
  showUnassignedPanel: boolean;
  onToggleUnassignedPanel: () => void;
  onQRScan: (url: string) => void;
  showScanner: boolean;
  onToggleScanner: () => void;
}

export function BoardOptionsModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
  showUnassignedPanel,
  onToggleUnassignedPanel,
  onQRScan,
  showScanner,
  onToggleScanner
}: BoardOptionsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Instellingen</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Weergavemodus</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onModeChange('teacher')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === 'teacher'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        mode === 'teacher' ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    >
                      <User
                        className={`w-5 h-5 ${
                          mode === 'teacher' ? 'text-white' : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Leraar modus</p>
                      <p className="text-xs text-gray-500">Volledige controle</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onModeChange('student')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === 'student'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        mode === 'student' ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    >
                      <UsersIcon
                        className={`w-5 h-5 ${
                          mode === 'student' ? 'text-white' : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Leerling modus</p>
                      <p className="text-xs text-gray-500">Alleen feedback</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">QR-code Scanner</h4>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">Camera actief</span>
                  </div>
                  <button
                    onClick={onToggleScanner}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showScanner ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showScanner ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Scan WebWijzer QR-codes om leerlingen automatisch te identificeren en toe te
                  voegen
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Weergave opties</h4>
              <button
                onClick={onToggleUnassignedPanel}
                className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {showUnassignedPanel ? (
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-gray-900">
                        Ongeplaatste leerlingen
                      </p>
                      <p className="text-xs text-gray-500">
                        {showUnassignedPanel ? 'Verberg' : 'Toon'} zijpaneel met leerlingen
                        zonder activiteit
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      showUnassignedPanel
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {showUnassignedPanel ? 'Zichtbaar' : 'Verborgen'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end">
            <Button onClick={onClose}>Sluiten</Button>
          </div>
        </div>
      </div>

      {showScanner && (
        <QRScanner
          onScanSuccess={onQRScan}
          isVisible={isOpen}
          onClose={() => {}}
        />
      )}
    </>
  );
}
