import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, TrendingUp, Clock, ArrowRight, CheckCircle, Users, BookOpen, Layers, Heart, Share2, Target } from 'lucide-react';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

const GOALS = [
  {
    number: '01',
    icon: <Monitor className="w-8 h-8 text-brand" />,
    bg: 'bg-brand-tint',
    border: 'border-brand-soft/40',
    accent: 'text-brand',
    title: 'ICT didactisch gebruiken',
    subtitle: 'Technologie als middel, niet als doel',
    description:
      'Digitale tools hebben pas echte waarde als ze het leerproces verdiepen. bijleer.school is ontworpen vanuit didactische principes: elke app ondersteunt een concrete onderwijsdoelstelling en helpt leerkrachten bewuste keuzes te maken over wanneer en hoe ze technologie inzetten.',
    points: [
      'Apps zijn gebouwd rond bewezen didactische methoden',
      'Technologie versterkt de leerkracht, vervangt hem niet',
      'Elke functie heeft een duidelijk pedagogisch doel',
      'Onderwijstechnieken en vormingen beschikbaar voor het team',
    ],
  },
  {
    number: '02',
    icon: <TrendingUp className="w-8 h-8 text-teal-600" />,
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    accent: 'text-teal-600',
    title: 'Verticale leerlijnen',
    subtitle: 'Apps die de hele school verbinden',
    description:
      'Leren stopt niet aan de klasdeur of bij de jaarovergang. bijleer.school groeit mee met elke leerling doorheen de school: van de eerste klas tot de laatste. Leerkrachten zien de volledige ontwikkeling van een leerling en kunnen naadloos verderbouwen op wat voorgaande jaren is opgebouwd.',
    points: [
      'Leerlingprofielen groeien mee doorheen de schoolloopbaan',
      'Leescoach, Sporen en gedragsdata zijn zichtbaar over jaren',
      'Teams werken met gedeelde taal en gedeelde tools',
      'Overdracht van klas tot klas verloopt soepel en gestructureerd',
    ],
  },
  {
    number: '03',
    icon: <Clock className="w-8 h-8 text-amber-600" />,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    accent: 'text-amber-600',
    title: 'Didactische routines',
    subtitle: 'Tijd besparen door slim werken',
    description:
      'Leerkrachten besteden kostbare tijd aan administratie, registraties en opvolgingswerk. bijleer.school automatiseert en stroomlijnt de routines die nu veel tijd in beslag nemen, zodat de leerkracht zich kan focussen op wat echt telt: lesgeven en contact met leerlingen.',
    points: [
      'Snelle registratie van leesgesprekken, gedrag en activiteiten',
      'Templates en presets voor terugkerende taken',
      'Overzichtelijke rapporten zonder handmatig samenvoegen',
      'Minder papier, minder dubbel werk, meer impact',
    ],
  },
];

const STATS = [
  { icon: <Users className="w-5 h-5" />, value: '3 doelen', label: 'die alles sturen' },
  { icon: <BookOpen className="w-5 h-5" />, value: '10+ apps', label: 'gebouwd op vraag' },
  { icon: <Layers className="w-5 h-5" />, value: '1 platform', label: 'voor de hele school' },
];

export function OnsDoel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <LandingNav navigate={navigate} />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block bg-brand-tint text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-brand-soft/40">
              Onze visie
            </span>
            <h1 className="text-5xl font-heading font-bold text-ink mb-6 leading-tight">
              Ons doel
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-10">
              bijleer.school is niet zomaar een verzameling apps. Elk product is gebouwd rond drie fundamentele overtuigingen over goed onderwijs en slimme schoolorganisatie.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {STATS.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
                  <div className="text-brand">{s.icon}</div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-sm">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 bg-cream-soft/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {GOALS.map((goal, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl border ${goal.border} overflow-hidden shadow-sm`}
            >
              <div className="p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${goal.bg}`}>
                      {goal.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${goal.accent}`}>
                      {goal.number}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{goal.title}</h2>
                    <p className={`text-sm font-medium mb-4 ${goal.accent}`}>{goal.subtitle}</p>
                    <p className="text-gray-600 leading-relaxed mb-6">{goal.description}</p>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {goal.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bijleren.eu founder section */}
      <div className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-amber-50 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-amber-100">
              Bijleren.eu
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Doel voor tool
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              bijleer.school is een initiatief van Bijleren.eu. Niet zomaar een toolkit, maar een missie: elk instrument wordt gebouwd vanuit een helder didactisch doel. Eerst nadenken waarom, dan pas hoe.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 flex flex-col items-start">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-tint mb-5">
                <Heart className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Scholen samenbrengen</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We geloven dat scholen sterker worden wanneer ze samenwerken. Door noden te delen en samen tools te bouwen, besparen we tijd — zodat elke leerkracht meer ruimte krijgt om echt les te geven op de manier die bij hem of haar past.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 flex flex-col items-start">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-100 mb-5">
                <Share2 className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Samen bouwen, samen groeien</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Elke app begint bij een echte vraag van een echte school. Wat we samen bouwen, delen we met iedereen. Zo maakt elk nieuw inzicht, elke nieuwe nood, het platform beter voor alle scholen tegelijk.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 flex flex-col items-start">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 mb-5">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Doel voor tool</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Bijleren.eu brengt niet enkel een tool, maar de didactische visie erachter. Wat wil je bereiken met je leerlingen? Dát is het vertrekpunt. De technologie volgt de pedagogie, niet andersom.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-10 text-center">
            <p className="text-2xl font-bold text-gray-900 mb-2 italic">"Doel voor tool"</p>
            <p className="text-gray-600 text-sm max-w-xl mx-auto">
              De tagline van Bijleren.eu vat samen waar bijleer.school voor staat: technologie die ten dienste staat van een helder didactisch doel. Geen tool omwille van de tool.
            </p>
          </div>
        </div>
      </div>

      <div className="py-20 bg-cream-soft/40 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-heading font-bold mb-4">Kom bij de community!</h2>
            <p className="text-brand-tint text-lg max-w-xl mx-auto mb-8">
              bijleer.school groeit samen met de scholen die het gebruiken. Jouw input, noden en ideeën maken het platform beter voor iedereen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 bg-white text-brand font-semibold px-8 py-3 rounded-lg hover:bg-brand-tint transition-colors"
              >
                Gratis starten
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center justify-center gap-2 border border-brand-soft text-white font-semibold px-8 py-3 rounded-lg hover:bg-brand-dark transition-colors"
              >
                Neem contact op
              </button>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
