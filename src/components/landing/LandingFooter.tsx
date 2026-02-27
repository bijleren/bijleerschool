import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ExternalLink } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">bijleer.school</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 mb-4">
             Gebouwd op vraag van scholen, voor scholen.
            </p>
            <a
              href="https://bijleren.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              een app van bijleren.eu
            </a>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/apps" className="hover:text-white transition-colors">Alle apps</Link></li>
              <li><Link to="/voor-wie" className="hover:text-white transition-colors">Voor wie?</Link></li>
              <li><Link to="/hoe-werkt-het" className="hover:text-white transition-colors">Hoe werkt het?</Link></li>
              <li><Link to="/ons-doel" className="hover:text-white transition-colors">Ons doel</Link></li>
              <li><a href="/#pricing" className="hover:text-white transition-colors">Prijzen</a></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Aanvraag nieuwe app</Link></li>
            </ul>
          </div>

          {/* School */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">School</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Leerkracht login</Link></li>
              <li><Link to="/webwijzer" className="hover:text-white transition-colors">WebWijzer voor leerlingen</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Ondersteuning op school</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Juridisch</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/algemene-voorwaarden" className="hover:text-white transition-colors">Algemene voorwaarden</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacybeleid</Link></li>
              <li><a href="mailto:info@bijleren.eu" className="hover:text-white transition-colors">info@bijleren.eu</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} bijleer.school. Alle rechten voorbehouden.</p>
            <span className="hidden sm:inline text-gray-700">·</span>
            <a
              href="https://bijleren.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              een app van bijleren.eu
            </a>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/algemene-voorwaarden" className="hover:text-white transition-colors">Algemene voorwaarden</Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacybeleid</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
