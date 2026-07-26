import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Grid3x3, HelpCircle, Tag, Menu, X, ChevronDown, LogIn } from 'lucide-react';


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
    <nav className="bg-white border-b border-line z-[100] shadow-sm sticky top-0">
      <div className="w-full px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: logo + app name */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="font-fredoka font-bold text-xl text-brand">bijleren.eu</span>
            <span className="font-fredoka font-bold text-xl text-ink hidden sm:block">bijleer.school</span>
          </Link>
          {NAV_LINKS.slice(0, 3).map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-brand-soft text-brand'
                    : 'border-ink/15 hover:border-brand text-ink hover:text-brand bg-white'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: remaining links + NL flag + login */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            {NAV_LINKS.slice(3).map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-brand text-brand bg-brand-tint'
                      : 'border-ink/15 hover:border-brand text-ink hover:text-brand bg-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          {/* NL flag dropdown */}
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-ink/15 hover:border-brand transition-colors bg-white text-sm font-semibold text-ink" aria-label="Select language">
            <span className="text-base leading-none">🇳🇱🇧🇪</span>
            <span className="hidden sm:inline text-xs font-bold text-ink-soft">NL</span>
            <ChevronDown className="w-3 h-3 text-ink-soft" />
          </button>
          {/* Login button */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white font-fredoka font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <LogIn className="w-4 h-4" />
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-line bg-white px-4 pb-4 pt-2 space-y-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                to={link.to}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-fredoka font-semibold text-ink-soft rounded-xl hover:bg-brand-tint hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => { navigate('/login'); setMenuOpen(false); }}
            className="w-full mt-2 px-4 py-2.5 bg-brand text-white text-sm font-fredoka font-semibold rounded-xl shadow-sm hover:bg-brand-dark transition-all"
          >
            Inloggen
          </button>
        </div>
      )}
    </nav>
  );
}
