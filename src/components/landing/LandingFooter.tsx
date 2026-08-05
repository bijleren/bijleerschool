import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-8 bg-neutral-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/algemene-voorwaarden" onClick={scrollToTop} className="text-white/80 hover:text-[#F4B11B] transition-colors font-semibold">
            Algemene voorwaarden
          </Link>
          <span className="text-white/30">|</span>
          <Link to="/privacy-policy" onClick={scrollToTop} className="text-white/80 hover:text-[#F4B11B] transition-colors font-semibold">
            Privacybeleid
          </Link>
          <span className="text-white/30">|</span>
          <Link to="/cookie-policy" onClick={scrollToTop} className="text-white/80 hover:text-[#F4B11B] transition-colors font-semibold">
            Cookiebeleid
          </Link>
          <span className="text-white/30">|</span>
          <button className="inline-flex items-center gap-1.5 text-white/80 hover:text-[#F4B11B] transition-colors cursor-pointer font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback
          </button>
        </div>
        <div className="text-center text-white/70 font-semibold mt-4">
          © {new Date().getFullYear()} bijleer.school <span className="text-[#F4B11B] font-bold">v1.0</span> — een app van{' '}
          <a
            href="https://bijleren.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F4B11B] hover:text-[#F4B11B]/80 transition-colors font-bold"
          >
            bijleren.eu
          </a>
        </div>
      </div>
    </footer>
  );
}
