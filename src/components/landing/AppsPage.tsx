import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Grid2x2 as Grid, BookMarked, Search, QrCode, Users, BookCheck, Layers, Clock, BarChart3, Lightbulb, ArrowRight, CheckCircle, Baby, AlignLeft, Monitor, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
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
    problem: 'Hoe krijg je ICT-zwakke leerlingen snel naar de juiste website?',
    description: 'Een slimme inlogkaart die leerling gebruiken tijdens het oefenen. Ze kunnen deze ook scannen met een webcam en zo hun favoriete websites vinden, boeken uitlenen, een zoekmachine raadplegen en meer.',
    features: [
      'Unieke QR-code per leerling',
      'Afgeschermde educatieve links',
      'Zichtbaar op klassenscherm',
      'Deel snel wat je wil',
    ],
  },
  {
    icon: <Grid className="w-7 h-7 text-teal-600" />,
    bg: 'bg-teal-50',
    accent: 'border-teal-200',
    title: 'ActiviTijd',
    tag: 'Klas',
    tagColor: 'bg-teal-100 text-teal-700',
    problem: 'Hoe hou je overzicht over wie wat doet tijdens vrije activiteitsmomenten?',
    description: 'Real-time activiteitenborden voor de klas. Wijs activiteiten toe aan leerlingen of groepen en projecteer het bord op je klassenscherm. Ideaal voor contractwerk. Zo weet iedereen wat ze moeten doen.',
    features: [
      'Activiteiten toewijzen per leerling',
      'Weergave op klassenscherm',
      'QR-scan voor leerlingtoegang en snelle keuze',
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
    problem: 'Wie heeft welk boek, en is het al teruggebracht?',
    description: 'Digitaal bibliotheeksysteem voor de school. Beheer je boekencollectie, registreer uitleen en volg op wie welk boek heeft. Snel scannen via barcode of handmatig toevoegen.',
    features: [
      'Barcode scanner via webcam voor snelle uitleen',
      'Uitleenhistoriek per leerling',
      'Leesmotivatie: hoe was je leesmoment',
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
    problem: 'Hoe zorg je dat leerlingen veilig en gericht online opzoeken?',
    description: 'Een veilige start om online te zoeken op leerlingen-niveau. Jij als leerkracht kan zoekopdrachten bijsturen. Leerlingen kiezen eenvoudig welke bron ze raadplegen. Hou eenvoudig zicht op wat leerlingen zoeken.',
    features: [
      'Leer prompten',
      'Leerkracht kan feedback geven',
      'volg zoekopdrachten op per leerling',
      'Zoek multi-sensorieel',
    ],
  },
  {
    icon: <QrCode className="w-7 h-7 text-cyan-600" />,
    bg: 'bg-cyan-50',
    accent: 'border-cyan-200',
    title: 'BlinkQR',
    tag: 'Communicatie',
    tagColor: 'bg-cyan-100 text-cyan-700',
    problem: 'Hoe geef je elke leerling in seconden toegang tot zijn eigen tools?',
    description: 'Breng je favoriete digitale leermiddelen tot bij de leerlingen via QR-codes. Steeds aanpasbaar en multisensorieel.',
    features: [
      'QR-kaartjes afdrukken',
      'Koppel met websites, todos, audio en meer.',
      'Snel scannen in de klas',
      'Druk de stickervellen af.',
    ],
  },
  {
    icon: <Users className="w-7 h-7 text-green-600" />,
    bg: 'bg-green-50',
    accent: 'border-green-200',
    title: 'Gedragsmanagement',
    tag: 'Leerlingbegeleiding',
    tagColor: 'bg-green-100 text-green-700',
    problem: 'Hoe registreer en opvolg je gedragsincidenten zonder papierwerk?',
    description: 'Registreer en opvolg gedragsincidenten structureel. Dit ter vervangen of aanvulling van het typische .',
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
    problem: 'Hoe houd je de leesontwikkeling van elke leerling systematisch bij?',
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
    problem: 'Hoe maak je leertrajecten zichtbaar voor leerkracht en leerling?',
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
    problem: 'Hoe plan je lessen en dagschema\'s efficiënt voor de hele school?',
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
    problem: 'Hoe weet je of je aanpak effectief is voor al je leerlingen?',
    description: 'Krijg inzicht in hoe het platform gebruikt wordt. Welke technieken werken? Wat zijn gedragspatronen? Data helpt je betere beslissingen nemen voor de klas.',
    features: [
      'Dashboards per app',
      'Trends over tijd',
      'Exporteerbare rapporten',
      'Per leerling of klas filteren',
    ],
  },
  {
    icon: <Baby className="w-7 h-7 text-yellow-600" />,
    bg: 'bg-yellow-50',
    accent: 'border-yellow-200',
    title: 'kleuterdidactiek.be',
    tag: 'Didactiek',
    tagColor: 'bg-yellow-100 text-yellow-700',
    problem: 'Waar vind je snel kwalitatieve activiteiten voor kleuters?',
    description: 'Een rijke bibliotheek van didactische tips, activiteiten en werkvormen specifiek voor het kleuteronderwijs. Geïntegreerd in het platform als directe inspiratiebron voor kleuterleerkrachten.',
    features: [
      'Activiteiten per ontwikkelingsdomein',
      'Visuele werkvormen voor kleuters',
      'Inspiratie voor thematisch werken',
      'Direct beschikbaar in het platform',
    ],
  },
  {
    icon: <AlignLeft className="w-7 h-7 text-lime-600" />,
    bg: 'bg-lime-50',
    accent: 'border-lime-200',
    title: 'woordenschat.be',
    tag: 'Didactiek',
    tagColor: 'bg-lime-100 text-lime-700',
    problem: 'Hoe maak je woordenschatonderwijs boeiend en meetbaar?',
    description: 'Woordenschatonderwijs onderbouwd en praktisch. Van klanken tot woorden tot texten.',
    features: [
      'Werkvormen per leeftijdsgroep',
      'Vlaamse stem',
      'Adaptief en slimme differentiatie',
      'Eenvoudig in gebruik.',
    ],
  },
  {
    icon: <Monitor className="w-7 h-7 text-sky-600" />,
    bg: 'bg-sky-50',
    accent: 'border-sky-200',
    title: 'Basis ICT-geletterdheid',
    tag: 'Digitale vaardigheden',
    tagColor: 'bg-sky-100 text-sky-700',
    problem: 'Hoe leer je leerlingen stap voor stap digitaal vaardig te worden?',
    description: 'Oefen op basisvaardigheden als kopiëren en plakken, typen en tekstverwerkervaardigheden.',
    features: [
      'Controleer ICT-vaardigheid',
      'Geschikt voor lager en secundair',
      'Digitale veiligheid en mediawijsheid',
      'Drempelvrij voor elke leerling',
    ],
  },
  {
    icon: <Wrench className="w-7 h-7 text-stone-600" />,
    bg: 'bg-stone-50',
    accent: 'border-stone-200',
    title: 'DigiTools',
    tag: 'Digitale vaardigheden',
    tagColor: 'bg-stone-100 text-stone-700',
    problem: 'Welke digitale tools zijn echt geschikt voor gebruik in de klas?',
    description: 'Eenvoudige webapps, prototypes en slimme digitools.',
    features: [
      'Fysiek materiaal zoals de letterdoos digitaal gemaakt',
      'Beta- en nieuwe tools gemarkeerd',
    ],
  },
];

const CARD_WIDTH = 320;
const GAP = 24;

export function AppsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('Alle');
  const scrollRef = useRef<HTMLDivElement>(null);

  const tags = ['Alle', ...Array.from(new Set(APPS.map((a) => a.tag)))];
  const filtered = activeFilter === 'Alle' ? APPS : APPS.filter((a) => a.tag === activeFilter);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? (CARD_WIDTH + GAP) * 2 : -(CARD_WIDTH + GAP) * 2, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-cream">
      <LandingNav navigate={navigate} />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block bg-brand-tint text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-brand-soft/40">
              Alle leerapps
            </span>
            <h1 className="text-4xl font-heading font-bold text-ink mb-5">
              Eén abonnement. Alle apps.
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Alle huidige leerapps zijn inbegrepen in elk abonnement. En elke nieuwe app die we dankzij jullie mogen bouwen, krijgen alle andere scholen er automatisch bij — zonder meerprijs.
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

      {/* Filter + horizontal scroll */}
      <div className="py-16 bg-cream-soft/40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-10">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeFilter === tag
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Carousel */}
          <div className="relative">
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll links"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll rechts"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filtered.map((app) => (
                <div
                  key={app.title}
                  className="flex-shrink-0 bg-white rounded-2xl border border-gray-200 p-7 flex flex-col hover:shadow-md transition-shadow"
                  style={{ width: CARD_WIDTH }}
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
                  <p className="text-sm italic text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mb-3 leading-snug border-l-2 border-gray-300">
                    {app.problem}
                  </p>
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
                <div
                  className="flex-shrink-0 bg-white rounded-2xl border-2 border-dashed border-gray-300 p-7 flex flex-col items-start justify-center"
                  style={{ width: CARD_WIDTH }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 mb-4">
                    <Lightbulb className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700 mb-2">Klagen en vragen, zo vinden we snel wat je team kan ondersteunen.</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">
                    Elke app is gebouwd op vraag van een school. Neem contact op en beschrijf wat je mist of welke vragen je hebt — we luisteren.
                  </p>
                  <button
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                    onClick={() => window.location.href = '/contact'}
                  >
                    App aanvragen <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time savings calculator */}
      <TimeSavingsCalculator />

      {/* CTA */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-heading font-bold mb-4">Probeer alle apps gratis</h2>
            <p className="text-brand-tint text-lg mb-8 max-w-xl mx-auto">
              Maak een gratis account aan en ontdek elke app. Geen verplichtingen, maar we raden je wel aan je te laten ondersteunen zodat je de app echt volledig leert kennen.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 bg-white text-brand font-semibold px-8 py-3 rounded-lg hover:bg-brand-tint transition-colors"
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
