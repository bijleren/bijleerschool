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
              <h2 className="text-2xl font-bold text-gray-900">Versie 1.1</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Gedragsincidenten - Meerdere studenten</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Mogelijkheid om meerdere studenten toe te voegen aan één incident</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Toewijzen van verschillende rollen aan studenten (bijv. hoofddader, slachtoffer, toeschouwer)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Nieuwe 'Studentrollen' beheer pagina in instellingen voor het configureren van rollen</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Automatische migratie van bestaande incidenten met één student</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Gevolgen systeem</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Nieuwe 'Gevolgen' beheer pagina voor het configureren van acties en sancties</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Onderscheid tussen 'Eerste acties' (direct genomen) en 'Follow-up acties' (later uitgevoerd)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Mogelijkheid om meerdere acties per incident toe te voegen met notities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Datumregistratie voor follow-up acties</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Database verbeteringen</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Nieuwe tabellen voor studentrollen, gevolgen en acties</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Junction tabel voor meerdere studenten per incident</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Achterwaartse compatibiliteit met bestaande incidenten</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Gebruikersinterface</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Verbeterde incidentweergave met studentrollen en meerdere acties</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Nieuw tabblad 'Studentrollen' in gedragsinstellingen</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Nieuw tabblad 'Gevolgen' in gedragsinstellingen</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Betere organisatie van eerste acties en follow-up acties in formulieren</span>
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
