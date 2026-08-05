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
      <div className="w-full bg-neutral-800 border-t border-white/10 shadow-2xl pointer-events-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Cookie className="w-4 h-4 text-[#F4B11B] flex-shrink-0" />
          <p className="text-white/70 text-xs leading-relaxed flex-1 min-w-0">
            Wij gebruiken functionele cookies voor sessiebeheer en authenticatie.{' '}
            <Link to="/privacy-policy" className="text-[#F4B11B] hover:underline">Privacybeleid</Link>.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={accept}
              className="px-3 py-1.5 bg-[#F4B11B] hover:bg-[#F4B11B]/90 text-neutral-900 text-xs font-semibold rounded-lg transition-colors"
            >
              Accepteren
            </button>
            <button
              onClick={decline}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Alleen functioneel
            </button>
            <button
              onClick={decline}
              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-[#F4B11B] transition-colors rounded hover:bg-white/10"
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
