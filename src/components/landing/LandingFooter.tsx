import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-8 pb-6 text-center text-xs font-semibold text-ink-soft space-y-2">
      <div className="space-x-3">
        <Link to="/algemene-voorwaarden" onClick={scrollToTop} className="hover:text-ink transition-colors">
          Algemene voorwaarden
        </Link>
        <span className="opacity-40">•</span>
        <Link to="/privacy-policy" onClick={scrollToTop} className="hover:text-ink transition-colors">
          Privacybeleid
        </Link>
        <span className="opacity-40">•</span>
        <Link to="/cookie-policy" onClick={scrollToTop} className="hover:text-ink transition-colors">
          Cookiebeleid
        </Link>
        <span className="opacity-40">•</span>
        <button className="inline-flex items-center gap-1 hover:text-ink transition-colors cursor-pointer">
          <MessageSquare className="w-3 h-3" />
          Feedback
        </button>
      </div>
      <div className="opacity-70">
        © {new Date().getFullYear()} bijleer.school <span className="opacity-60">v1.0</span> — een app van{' '}
        <a
          href="https://bijleren.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink transition-colors"
        >
          bijleren.eu
        </a>
      </div>
    </footer>
  );
}
