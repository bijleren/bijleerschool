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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl p-5 sm:p-6 pointer-events-auto border border-gray-700">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center mt-0.5">
            <Cookie className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white mb-1 text-sm">Cookies op bijleer.school</h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Wij gebruiken functionele cookies die noodzakelijk zijn voor de werking van het platform (sessiebeheer, authenticatie). We plaatsen geen tracking- of advertentiecookies zonder uw toestemming. Lees meer in ons{' '}
              <Link to="/privacy-policy" className="text-blue-400 hover:underline">privacybeleid</Link>.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={accept}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Accepteren
              </button>
              <button
                onClick={decline}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Alleen functioneel
              </button>
            </div>
          </div>
          <button
            onClick={decline}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
