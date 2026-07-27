import React, { useState } from 'react';
import { X, LogIn, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';

interface StudentLogin {
  id: string;
  label: string;
  url: string;
  username: string;
}

interface StudentLoginModalProps {
  logins: StudentLogin[];
  onClose: () => void;
}

export function StudentLoginModal({ logins, onClose }: StudentLoginModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLoginClick = async (login: StudentLogin) => {
    try {
      await navigator.clipboard.writeText(login.username);
      setCopiedId(login.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback: still open the site even if clipboard fails
    }
    window.open(login.url, '_blank', 'noopener,noreferrer');
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-#946B29" aria-hidden="true" />
            <h2 id="login-modal-title" className="text-lg font-bold text-gray-900">
              Inloggen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {logins.map((login) => {
            const copied = copiedId === login.id;
            return (
              <button
                key={login.id}
                onClick={() => handleLoginClick(login)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 rounded-xl transition-all group text-left"
                aria-label={`Inloggen bij ${login.label}, gebruikersnaam wordt gekopieerd`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-base">{login.label}</p>
                  <p className="text-sm text-gray-500 truncate">{getDomain(login.url)}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {copied ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Gekopieerd!
                    </span>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" aria-hidden="true" />
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" aria-hidden="true" />
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 text-center">
            Klik op een login om je gebruikersnaam te kopiëren en de website te openen
          </p>
        </div>
      </div>
    </div>
  );
}
