import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Users, BarChart3, Globe, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">BijleerSchool</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/webwijzer"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                WebWijzer
              </Link>
              <Button onClick={() => navigate('/login')} variant="primary">
                Leerkracht Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Didactische Toolkit voor leerkrachten
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              BijleerSchool helpt docenten bij het verbeteren van hun lessen met bewezen didactische technieken,
              gedragsmanagement en gepersonaliseerde leertools.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/login')} size="lg">
                Gratis Starten
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button onClick={() => navigate('/webwijzer')} variant="secondary" size="lg">
                WebWijzer voor Leerlingen
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Alles wat je nodig hebt voor effectief lesgeven
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<BookOpen className="w-8 h-8 text-blue-600" />}
            title="Didactische Technieken"
            description="Toegang tot een bibliotheek van bewezen onderwijstechnieken met praktische voorbeelden."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-green-600" />}
            title="Gedragsmanagement"
            description="Registreer en analyseer gedragsincidenten met consequenties en interventies."
          />
          <FeatureCard
            icon={<Globe className="w-8 h-8 text-orange-600" />}
            title="WebWijzer"
            description="Gepersonaliseerde webwijzers per leerling met educatieve links en bronnen."
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8 text-purple-600" />}
            title="Analyse & Inzichten"
            description="Krijg inzicht in trends, effectiviteit van technieken en leerlingontwikkeling."
          />
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Hoe werkt het?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Maak een account"
              description="Registreer je gratis en maak een school aan of sluit je aan bij een bestaande school."
            />
            <StepCard
              number="2"
              title="Voeg leerlingen toe"
              description="Import je klassenlijsten en begin met het bijhouden van technieken en gedrag."
            />
            <StepCard
              number="3"
              title="Verbeter je lessen"
              description="Gebruik de data en inzichten om je lessen te verbeteren en leerlingen beter te begeleiden."
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Klaar om te beginnen?
          </h2>
          <p className="text-xl mb-8 text-blue-50">
            Sluit je aan bij leerkrachten die BijleerSchool gebruiken om hun onderwijs te verbeteren.
          </p>
          <Button
            onClick={() => navigate('/login')}
            variant="secondary"
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            Start Nu Gratis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2025 BijleerSchool. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white text-2xl font-bold rounded-full mb-4">
        {number}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
