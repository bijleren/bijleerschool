import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-8 pb-6 text-center text-sm space-y-3 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link to="/algemene-voorwaarden" onClick={scrollToTop} className="text-ink-soft hover:text-brand transition-colors font-semibold">
          Algemene voorwaarden
        </Link>
        <span className="text-line">|</span>
        <Link to="/privacy-policy" onClick={scrollToTop} className="text-ink-soft hover:text-brand transition-colors font-semibold">
          Privacybeleid
        </Link>
        <span className="text-line">|</span>
        <Link to="/cookie-policy" onClick={scrollToTop} className="text-ink-soft hover:text-brand transition-colors font-semibold">
          Cookiebeleid
        </Link>
        <span className="text-line">|</span>
        <button className="inline-flex items-center gap-1.5 text-ink-soft hover:text-brand transition-colors cursor-pointer font-semibold">
          <MessageSquare className="w-3.5 h-3.5" />
          Feedback
        </button>
      </div>
      <div className="text-ink-soft font-semibold">
        © {new Date().getFullYear()} bijleer.school <span className="opacity-50">v1.0</span> — een app van{' '}
        <a
          href="https://bijleren.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:text-brand-dark transition-colors font-bold"
        >
          bijleren.eu
        </a>
      </div>
    </footer>
  );
}
