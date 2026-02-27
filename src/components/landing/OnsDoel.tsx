import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, TrendingUp, Clock, ArrowRight, CheckCircle, Users, BookOpen, Layers } from 'lucide-react';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

const GOALS = [
  {
    number: '01',
    icon: <Monitor className="w-8 h-8 text-blue-600" />,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    accent: 'text-blue-600',
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
    <div className="min-h-screen bg-white">
      <LandingNav navigate={navigate} />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
              Onze visie
            </span>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Ons doel
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-10">
              bijleer.school is niet zomaar een verzameling apps. Elk product is gebouwd rond drie fundamentele overtuigingen over goed onderwijs en slimme schoolorganisatie.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {STATS.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
                  <div className="text-blue-600">{s.icon}</div>
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

      <div className="py-20 bg-gray-50">
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

      <div className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Kom bij de community!</h2>
            <p className="text-blue-100 text-lg max-w-xl mx-auto mb-8">
              bijleer.school groeit samen met de scholen die het gebruiken. Jouw input, noden en ideeën maken het platform beter voor iedereen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Gratis starten
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center justify-center gap-2 border border-blue-400 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
