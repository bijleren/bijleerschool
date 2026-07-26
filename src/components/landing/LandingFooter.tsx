import React from 'react';
import { Link } from 'react-router-dom';

export function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-cream border-t border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-soft">
            <Link to="/algemene-voorwaarden" onClick={scrollToTop} className="hover:text-ink transition-colors">
              Algemene voorwaarden
            </Link>
            <span className="opacity-40">•</span>
            <Link to="/privacy-policy" onClick={scrollToTop} className="hover:text-ink transition-colors">
              Privacybeleid
            </Link>
            <span className="opacity-40">•</span>
            <Link to="/contact" onClick={scrollToTop} className="hover:text-ink transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-xs font-semibold text-ink-soft">
            © {new Date().getFullYear()} bijleer.school v1.0 —{' '}
            <a
              href="https://bijleren.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink transition-colors"
            >
              een app van bijleren.eu
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
