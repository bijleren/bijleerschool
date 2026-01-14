import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionModal({ isOpen, onClose }: VersionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Versie 1.4</h2>
              <p className="text-sm text-gray-500 mt-1">Wat is er nieuw?</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">WebWijzer - Deel met je leerlingen</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Betere analyse en betere iconen</span>
                </li>
               
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Leerlingen kunnen gebruik maken van de webwijzer login QR-code via hun platform</span>
                </li>
               
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Zoeker</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Oefen op prompten met leerlingen</span>
                </li>
               
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Leerlingen kunnen sneller en veiliger zoeken.</span>
                </li>
               
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Gevolgen systeem</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Je kan meerdere consequenties toevoegen aan één incident.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Je kan na het maken van een incident follow-upconsequenties toevoegen.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Mogelijkheid om notities toe te voegen</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Datumregistratie voor follow-up acties</span>
                </li>
              </ul>
            </div>

           

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Gebruikersinterface</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Betere groepcreatie.</span>
                </li>
                 <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Opslagruimte zichtbaar.</span>
                </li>
                
              </ul>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button onClick={onClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
