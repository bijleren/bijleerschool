import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Grid, BookMarked, Search, QrCode, Newspaper, Users,
  BookCheck, Layers, Clock, BarChart3, Lightbulb, ArrowRight, CheckCircle
} from 'lucide-react';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';
import { TimeSavingsCalculator } from './TimeSavingsCalculator';

const APPS = [
  {
    icon: <Globe className="w-7 h-7 text-orange-600" />,
    bg: 'bg-orange-50',
    accent: 'border-orange-200',
    title: 'WebWijzer',
    tag: 'Leerlingen',
    tagColor: 'bg-orange-100 text-orange-700',
    description: 'Gepersonaliseerde webwijzers per leerling. Elke leerling krijgt een eigen startpagina met educatieve links en goedgekeurde bronnen. Veilig, overzichtelijk en altijd up-to-date.',
    features: [
      'Unieke QR-code per leerling',
      'Afgeschermde educatieve links',
      'Zichtbaar op klassenscherm',
      'Activiteiten per leerling instellen',
    ],
  },
  {
    icon: <Grid className="w-7 h-7 text-teal-600" />,
    bg: 'bg-teal-50',
    accent: 'border-teal-200',
    title: 'ActiviTijd',
    tag: 'Klas',
    tagColor: 'bg-teal-100 text-teal-700',
    description: 'Real-time activiteitenborden voor de klas. Wijs activiteiten toe aan leerlingen of groepen en projecteer het bord op je klassenscherm. Zo weet iedereen wat ze moeten doen.',
    features: [
      'Activiteiten toewijzen per leerling',
      'Weergave op klassenscherm',
      'QR-scan voor leerlingtoegang',
      'Timer en tijdbeheer',
    ],
  },
  {
    icon: <BookMarked className="w-7 h-7 text-pink-600" />,
    bg: 'bg-pink-50',
    accent: 'border-pink-200',
    title: 'Boeker',
    tag: 'Bibliotheek',
    tagColor: 'bg-pink-100 text-pink-700',
    description: 'Digitaal bibliotheeksysteem voor de school. Beheer je boekencollectie, registreer uitleen en volg op wie welk boek heeft. Snel scannen via barcode of handmatig toevoegen.',
    features: [
      'Barcode scanner voor snelle uitleen',
      'Uitleenhistoriek per leerling',
      'Terugbrengherinneringen',
      'Leerlingen kunnen zelf inloggen',
    ],
  },
  {
    icon: <Search className="w-7 h-7 text-blue-600" />,
    bg: 'bg-blue-50',
    accent: 'border-blue-200',
    title: 'Zoeker',
    tag: 'Leerlingen',
    tagColor: 'bg-blue-100 text-blue-700',
    description: 'Een veilige zoekomgeving voor leerlingen. Geen afleiding, geen ongepaste content. De leerkracht bepaalt welke bronnen beschikbaar zijn en leerlingen zoeken binnen die kaders.',
    features: [
      'Afgesloten zoekomgeving',
      'Leerkracht beheert bronnen',
      'Schoolspecifieke inhoud',
      'Werkt op tablet en computer',
    ],
  },
  {
    icon: <QrCode className="w-7 h-7 text-cyan-600" />,
    bg: 'bg-cyan-50',
    accent: 'border-cyan-200',
    title: 'BlinkQR',
    tag: 'Communicatie',
    tagColor: 'bg-cyan-100 text-cyan-700',
    description: 'Genereer gepersonaliseerde QR-kaartjes per leerling. Elke leerling krijgt een kaartje met QR-code die toegang geeft tot zijn of haar webwijzer, activiteiten of profiel.',
    features: [
      'QR-kaartjes afdrukken',
      'Koppeling met WebWijzer',
      'Snel scannen in de klas',
      'Exporteerbaar als PDF',
    ],
  },
  {
    icon: <Newspaper className="w-7 h-7 text-amber-600" />,
    bg: 'bg-amber-50',
    accent: 'border-amber-200',
    title: 'Nieuwsbrief',
    tag: 'Communicatie',
    tagColor: 'bg-amber-100 text-amber-700',
    description: 'Maak en exporteer professionele nieuwsbrieven. Gebruik de ingebouwde editor om een visueel aantrekkelijke nieuwsbrief te maken en exporteer naar PDF of e-mail.',
    features: [
      'Rijke teksteditor',
      'Exporteer als PDF',
      'Schoolbranding toepassen',
      'Archief van vorige nieuwsbrieven',
    ],
  },
  {
    icon: <Users className="w-7 h-7 text-green-600" />,
    bg: 'bg-green-50',
    accent: 'border-green-200',
    title: 'Gedragsmanagement',
    tag: 'Leerlingbegeleiding',
    tagColor: 'bg-green-100 text-green-700',
    description: 'Registreer en opvolg gedragsincidenten structureel. Per incident leg je de context, consequenties en opvolging vast. Analyses tonen patronen doorheen het jaar.',
    features: [
      'Incidenten registreren',
      'Consequenties en opvolging',
      'Grafische analyses',
      'Per leerling of klas',
    ],
  },
  {
    icon: <BookCheck className="w-7 h-7 text-rose-600" />,
    bg: 'bg-rose-50',
    accent: 'border-rose-200',
    title: 'Leescoach',
    tag: 'Leesontwikkeling',
    tagColor: 'bg-rose-100 text-rose-700',
    description: 'Begeleide leesgesprekken en leesontwikkeling bijhouden per leerling. Log leessessies, registreer het niveau en volg de voortgang op met overzichtelijke grafieken.',
    features: [
      'Leessessies registreren',
      'Leesniveau bijhouden',
      'Interventies en opmerkingen',
      'Voortgangsanalyse per leerling',
    ],
  },
  {
    icon: <Layers className="w-7 h-7 text-violet-600" />,
    bg: 'bg-violet-50',
    accent: 'border-violet-200',
    title: 'Sporen',
    tag: 'Leerlingbegeleiding',
    tagColor: 'bg-violet-100 text-violet-700',
    description: 'Visueel overzicht van leertrajecten. Wijs leerlingen toe aan groeisporen en volg hun individueel pad op. Handig voor differentiatie en zorgniveaus.',
    features: [
      'Drag-and-drop interface',
      'Aangepaste sporen per school',
      'Notities per leerling',
      'Overzicht per klas of jaar',
    ],
  },
  {
    icon: <Clock className="w-7 h-7 text-slate-600" />,
    bg: 'bg-slate-50',
    accent: 'border-slate-200',
    title: 'Schooldag Planner',
    tag: 'Planning',
    tagColor: 'bg-slate-100 text-slate-700',
    description: 'Plan en beheer de schooldag van A tot Z. Maak uurroosterschema\'s, koppel vakken aan klassen en visualiseer de dagindeling voor je team.',
    features: [
      'Dagschema per klas',
      'Vakken en tijdblokken',
      'Herbruikbare sjablonen',
      'Overzicht voor het schoolteam',
    ],
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-emerald-600" />,
    bg: 'bg-emerald-50',
    accent: 'border-emerald-200',
    title: 'Analyse & Inzichten',
    tag: 'Rapportage',
    tagColor: 'bg-emerald-100 text-emerald-700',
    description: 'Krijg inzicht in hoe het platform gebruikt wordt. Welke technieken werken? Wat zijn gedragspatronen? Data helpt je betere beslissingen nemen voor de klas.',
    features: [
      'Dashboards per app',
      'Trends over tijd',
      'Exporteerbare rapporten',
      'Per leerling of klas filteren',
    ],
  },
];

export function AppsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('Alle');

  const tags = ['Alle', ...Array.from(new Set(APPS.map((a) => a.tag)))];
  const filtered = activeFilter === 'Alle' ? APPS : APPS.filter((a) => a.tag === activeFilter);

  return (
    <div className="min-h-screen bg-white">
      <LandingNav navigate={navigate} />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
              Alle leerapps
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-5">
              Eén abonnement. Alle apps.
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Alle huidige leerapps zijn inbegrepen in elk abonnement. En elke nieuwe app die we bouwen, krijg je automatisch erbij — zonder bijbetaling.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Alle huidige apps inbegrepen</span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Alle toekomstige apps inbegrepen</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter + grid */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-10">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeFilter === tag
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((app) => (
              <div
                key={app.title}
                className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${app.bg}`}>
                    {app.icon}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${app.tagColor}`}>
                    {app.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{app.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">{app.description}</p>
                <ul className="space-y-2">
                  {app.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Request card */}
            {activeFilter === 'Alle' && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-7 flex flex-col items-start justify-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 mb-4">
                  <Lightbulb className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Mis je een app?</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  Elke app is gebouwd op vraag van een school. Neem contact op en beschrijf wat je mist — we luisteren.
                </p>
                <button
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  onClick={() => window.location.href = '/contact'}
                >
                  App aanvragen <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time savings calculator */}
      <TimeSavingsCalculator />

      {/* CTA */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Probeer alle apps gratis</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Maak een gratis account aan en ontdek elke app. Geen verplichtingen, geen kredietkaart.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Gratis starten <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
