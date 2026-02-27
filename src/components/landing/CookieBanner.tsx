import React, { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'bijleerschool_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="w-full bg-gray-900 border-t border-gray-700 shadow-2xl pointer-events-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Cookie className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-gray-400 text-xs leading-relaxed flex-1 min-w-0">
            Wij gebruiken functionele cookies voor sessiebeheer en authenticatie — geen tracking of advertenties.{' '}
            <Link to="/privacy-policy" className="text-blue-400 hover:underline">Privacybeleid</Link>.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={accept}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Accepteren
            </button>
            <button
              onClick={decline}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Alleen functioneel
            </button>
            <button
              onClick={decline}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded hover:bg-gray-700"
              aria-label="Sluiten"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
