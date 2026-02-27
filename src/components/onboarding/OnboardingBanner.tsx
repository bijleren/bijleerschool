import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface OnboardingBannerProps {
  onOpenOnboarding: () => void;
}

const DISMISSED_KEY = 'onboarding_banner_dismissed';

export function OnboardingBanner({ onOpenOnboarding }: OnboardingBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="rounded-xl bg-blue-600 px-6 py-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm">
              Ontdek de bijleer.school en hoe je best start
            </p>
            <p className="text-blue-200 text-xs mt-0.5">
              Volg onze stap-voor-stap gids om alles snel in te stellen
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={onOpenOnboarding}
            className="flex items-center space-x-1.5 bg-white text-blue-700 hover:bg-blue-50 transition-colors text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <span>Aan de slag</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
