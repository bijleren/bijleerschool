import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, X, Globe } from 'lucide-react';

interface LandingNavProps {
  navigate: (path: string) => void;
}

const NAV_LINKS = [
  { label: 'Apps', to: '/apps' },
  { label: 'Voor wie?', to: '/voor-wie' },
  { label: 'Hoe werkt het?', to: '/hoe-werkt-het' },
  { label: 'Ons doel', to: '/ons-doel' },
  { label: 'Prijzen', to: '/#pricing', anchor: 'pricing' },
  { label: 'Contact', to: '/contact' },
];

export function LandingNav({ navigate }: LandingNavProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleAnchorClick = (e: React.MouseEvent, anchor: string) => {
    e.preventDefault();
    const scrollToAnchor = () => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };
    if (location.pathname === '/') {
      scrollToAnchor();
    } else {
      navigate('/');
      setTimeout(scrollToAnchor, 100);
    }
  };

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">bijleer.school</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              link.anchor ? (
                <a
                  key={link.label}
                  href={link.to}
                  onClick={(e) => handleAnchorClick(e, link.anchor!)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === link.to
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Leerkracht Login
              </button>
              <a
                href="/webwijzer"
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-md text-xs font-semibold text-gray-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all whitespace-nowrap z-50"
              >
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                WebWijzer voor leerlingen
              </a>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {NAV_LINKS.map((link) => (
            link.anchor ? (
              <a
                key={link.label}
                href={link.to}
                className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={(e) => { handleAnchorClick(e, link.anchor!); setMenuOpen(false); }}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.to}
                className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            )
          ))}
          <button
            onClick={() => { navigate('/login'); setMenuOpen(false); }}
            className="w-full mt-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Leerkracht Login
          </button>
        </div>
      )}
    </nav>
  );
}
