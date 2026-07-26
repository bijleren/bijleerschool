import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Grid3x3, HelpCircle, Tag, Menu, X, ChevronDown } from 'lucide-react';
import { BijlerenLogo } from './BijlerenLogo';

interface LandingNavProps {
  navigate: (path: string) => void;
}

const NAV_LINKS = [
  { label: 'Apps', to: '/apps', icon: Grid3x3 },
  { label: 'Hoe werkt het?', to: '/hoe-werkt-het', icon: HelpCircle },
  { label: 'Prijzen', to: '/prijzen', icon: Tag },
  { label: 'Voor wie?', to: '/voor-wie', icon: null },
  { label: 'Ons doel', to: '/ons-doel', icon: null },
  { label: 'Contact', to: '/contact', icon: null },
];

export function LandingNav({ navigate }: LandingNavProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-line shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: logo + app name */}
          <Link to="/" className="flex items-center gap-2.5">
            <BijlerenLogo size={32} />
            <span className="text-lg font-heading font-bold text-ink">bijleer.school</span>
          </Link>

          {/* Center: nav buttons with icons */}
          <div className="hidden lg:flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-heading font-semibold rounded-xl border transition-all ${
                    isActive
                      ? 'text-brand bg-brand-tint border-brand-soft'
                      : 'text-ink-soft border-line hover:text-brand hover:border-brand-soft hover:bg-brand-tint/50'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: NL flag + login */}
          <div className="hidden lg:flex items-center gap-3">
            <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:border-brand-soft hover:text-brand transition-all">
              <span className="text-base leading-none">🇳🇱</span>
              NL
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-heading font-semibold rounded-xl shadow-sm hover:bg-brand-dark hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Inloggen
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-xl text-ink-soft hover:bg-brand-tint hover:text-brand transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-line bg-white px-4 pb-4 pt-2 space-y-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                to={link.to}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-heading font-semibold text-ink-soft rounded-xl hover:bg-brand-tint hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => { navigate('/login'); setMenuOpen(false); }}
            className="w-full mt-2 px-4 py-2.5 bg-brand text-white text-sm font-heading font-semibold rounded-xl shadow-sm hover:bg-brand-dark transition-all"
          >
            Inloggen
          </button>
        </div>
      )}
    </nav>
  );
}
