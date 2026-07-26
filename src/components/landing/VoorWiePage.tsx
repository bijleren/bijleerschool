import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, Users, BookOpen, Brain, Heart,
  Building2, Shuffle, Star, GraduationCap, Home, Network, Stethoscope
} from 'lucide-react';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

const SCHOOL_TYPES = [
  {
    icon: <Heart className="w-7 h-7 text-rose-600" />,
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    badge: 'bg-rose-100 text-rose-700',
    badgeLabel: 'Kleuteronderwijs',
    title: 'Kleuters',
    subtitle: 'Van 2,5 tot 6 jaar',
    description:
      'Voor kleuterscholen biedt bijleer.school eenvoudige, visuele tools die aansluiten bij de belevingswereld van jonge kinderen. Denk aan activiteitenborden met grote icoontjes, een WebWijzer met kinderbeveiliging en eenvoudige lees- en observatieregistraties.',
    features: [
      'ActiviTijd met visuele activiteitenborden',
      'WebWijzer met veilige, curated bronnen',
      'Leescoach voor vroege leesontwikkeling',
      'Eenvoudig leerlingbeheer per klas',
    ],
  },
  {
    icon: <BookOpen className="w-7 h-7 text-brand" />,
    bg: 'bg-brand-tint',
    border: 'border-brand-soft/40',
    badge: 'bg-brand-tint text-brand',
    badgeLabel: 'Lager onderwijs',
    title: 'Lagere school',
    subtitle: 'Van 6 tot 12 jaar',
    description:
      'De tools in bijleer.school zijn in de eerste plaats gebouwd voor de lagere school. Gedragsmanagement, bibliotheekbeheer, digitaal zoekveilig zoeken en leesregistraties — alles sluit aan bij de noden van een drukke klasomgeving.',
    features: [
      'Gedragsmanagement met opvolging',
      'Boeker voor schoolbibliotheek',
      'Zoeker voor veilig online opzoekwerk',
      'BlinkQR voor leerlingtoegang',
    ],
  },
   {
    icon: <Brain className="w-7 h-7 text-teal-600" />,
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    badge: 'bg-teal-100 text-teal-700',
    badgeLabel: 'Secundair onderwijs',
    title: 'Anderstalige nieuwkomers',
    subtitle: 'Van kleuter tot secundair',
    description:
      'Gebruik tools zoals woordenschat.be om een krachtige leerlijn rond het leren van het Nederlands mogelijk te maken. Ook andere tools maken het mogelijk om snel te differentiëren en digitale leermiddelen aan deze doelgroep te bezorgen.',
    features: [
      'Werk aan klanken, woorden en teksten met woordenschat.be',
      'Universele onderwijstechnieken',
      'Deel snel een video, document of website met de webwijer',
      'Oefen op basis digitale vaardigheden om deze doelgroep vlot ICT te leren hanteren.',
    ],
  },
  {
    icon: <Brain className="w-7 h-7 text-teal-600" />,
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    badge: 'bg-teal-100 text-teal-700',
    badgeLabel: 'Secundair onderwijs',
    title: 'Secundaire school',
    subtitle: 'Van 12 tot 18 jaar',
    description:
      'In het secundair onderwijs ligt de focus op zelfstandigheid en vakinhoud. bijleer.school ondersteunt leerkrachten met didactische tools, een overzicht van leertrajecten via Sporen en diepgaande analyses.',
    features: [
      'Sporen voor individuele leertrajecten',
      'Didactiekplatform met onderwijstechnieken',
      'Gedragsopvolging en incidentbeheer',
      'Analyse & inzichten per leerling',
    ],
  },
  {
    icon: <Users className="w-7 h-7 text-amber-600" />,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    badgeLabel: 'Buitengewoon onderwijs',
    title: 'Buitengewoon onderwijs',
    subtitle: 'Type 1 t.e.m. 9',
    description:
      'bijleer.school is uitgebreid gebruikt en getest in scholen voor buitengewoon onderwijs. De tools zijn flexibel genoeg om aan te passen aan de noden van elk type, met specifieke aandacht voor persoonlijke leertrajecten, visuele ondersteuning en individuele opvolging.',
    features: [
      'Sporen voor gepersonaliseerde trajecten',
      'Leescoach voor differentiatie',
      'ActiviTijd voor gestructureerde dagplanning',
      'Gedragsopvolging per leerling',
    ],
  },
  {
    icon: <GraduationCap className="w-7 h-7 text-green-600" />,
    bg: 'bg-green-50',
    border: 'border-green-100',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'Volwassenenonderwijs',
    title: 'Volwassenenonderwijs',
    subtitle: 'CVO, CBE en basiseducatie',
    description:
      'Ook in het volwassenenonderwijs staan leerkrachten voor unieke uitdagingen: heterogene groepen, uiteenlopende voorkennis en een grote nood aan individuele begeleiding. bijleer.school biedt tools om cursisten op te volgen en leertrajecten te visualiseren.',
    features: [
      'Sporen voor individuele leertrajecten',
      'Leescoach voor NT2 en laaggeletterdheid',
      'WebWijzer met cursistspecifieke bronnen',
      'Analyse & inzichten per cursist',
    ],
  },
];

const OTHER_AUDIENCES = [
  {
    icon: <Home className="w-7 h-7 text-orange-600" />,
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    badge: 'bg-orange-100 text-orange-700',
    badgeLabel: 'Thuisonderwijs',
    title: 'Huisonderwijs',
    subtitle: 'Ouders die thuis lesgeven',
    description:
      'Ondersteun je kind thuis met alle bijleer-apps. Zet leermiddelen klaar via de WebWijzer, oefen op lezen, spellen en schrijven met woordenschat.be of ondersteun de structuur en dagindeling met BlinkQR\'s.',
    features: [
      'WebWijzer met gepersonaliseerde leermiddelen',
      'woordenschat.be voor lezen, spellen en schrijven',
      'BlinkQR voor structuur en dagindeling',
      'Leerlingprofiel en voortgangsopvolging',
    ],
  },
  {
    icon: <Network className="w-7 h-7 text-cyan-600" />,
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    badge: 'bg-cyan-100 text-cyan-700',
    badgeLabel: 'Ondersteuningsorganisaties',
    title: 'Ondersteuningscentra',
    subtitle: 'CLB, GON, ION en begeleiders',
    description:
      'Koppel jezelf aan verschillende scholen en ondersteun waar nodig. Krijg zicht op alle tools en leerlingen van de scholen die je begeleidt en schakel snel tussen contexten zonder te wisselen van platform.',
    features: [
      'Koppeling aan meerdere scholen',
      'Overzicht over leerlingen van alle gekoppelde scholen',
      'Toegang tot alle leerapps per school',
      'Snel schakelen tussen scholen en leerlingen',
    ],
  },
  {
    icon: <Stethoscope className="w-7 h-7 text-rose-600" />,
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    badge: 'bg-rose-100 text-rose-700',
    badgeLabel: 'Paramedici',
    title: 'Therapeuten & logopedisten',
    subtitle: 'Zorgprofessionals buiten school',
    description:
      'Gebruik de bijleer-tools tijdens therapie. Zet cliënten gericht aan het werk met woordenschat.be, werk aan digitale vaardigheden via DigiTools of maak gebruik van de leervideo\'s en didactische bronnen van bijleren.',
    features: [
      'woordenschat.be voor taal- en leestherapie',
      'DigiTools voor digitale vaardigheidstraining',
      'Leervideo\'s en didactische bronnen',
      'WebWijzer met therapiegericht materiaal',
    ],
  },
];

const PRINCIPLES = [
  {
    icon: <Shuffle className="w-5 h-5 text-brand" />,
    title: 'Netneutraal',
    description:
      'bijleer.school is niet gebonden aan een specifiek onderwijsnet — noch gemeentelijk, noch vrij, noch provinciaal. Elke school is welkom, ongeacht de inrichtende macht.',
  },
  {
    icon: <Building2 className="w-5 h-5 text-brand" />,
    title: 'Methodeneutraal',
    description:
      'We werken niet vanuit één didactische methode of visie. Of je school nu kiest voor ervaringsgericht onderwijs, directe instructie of een eigen mix — bijleer.school past zich aan.',
  },
  {
    icon: <Star className="w-5 h-5 text-brand" />,
    title: 'Gebouwd door scholen',
    description:
      'Elke app in bijleer.school is ontstaan vanuit een concrete vraag van een leerkracht of schoolteam. Geen generiek softwarepakket, maar tools die echt gebruikt worden in de klas.',
  },
];


export function VoorWiePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <LandingNav navigate={navigate} />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block bg-brand-tint text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-brand-soft/40">
              Voor elke school
            </span>
            <h1 className="text-5xl font-heading font-bold text-ink mb-6 leading-tight">
              Voor wie is bijleer.school?
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-10">
              bijleer.school is ontworpen voor elke school in Vlaanderen. Krachtig voor het ondersteunen van zorgleerlingen en anderstalige nieuwkomers, maar noodzakelijk voor elke kleuterschool, lagere school,
              secundaire school of buitengewoon onderwijs. Niet gebonden aan een net of methode.
              Gewoon tools die werken in de klas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/auth')}
                className="inline-flex items-center justify-center gap-2 bg-brand text-white font-heading font-semibold px-7 py-3 rounded-2xl hover:bg-brand-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Gratis uitproberen
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                to="/apps"
                className="inline-flex items-center justify-center px-7 py-3 rounded-2xl border border-line text-ink font-heading font-semibold hover:bg-brand-tint hover:border-brand-soft transition-all shadow-sm hover:-translate-y-0.5"
              >
                Bekijk alle apps
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* School types */}
      <div className="py-24 bg-cream-soft/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-bold text-ink mb-4">Voor elk schooltype</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Of je nu kleuteronderwijs geeft of met complexe zorgprofielen werkt — bijleer.school biedt
              tools die passen bij de noden van jouw school.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {SCHOOL_TYPES.map((type) => (
              <div
                key={type.title}
                className={`bg-white rounded-2xl border ${type.border} p-8 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-5 mb-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${type.bg}`}>
                    {type.icon}
                  </div>
                  <div>
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${type.badge}`}>
                      {type.badgeLabel}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{type.title}</h3>
                    <p className="text-sm text-gray-400">{type.subtitle}</p>
                  </div>
                </div>
                <p className="text-gray-500 leading-relaxed mb-6">{type.description}</p>
                <ul className="space-y-2.5">
                  {type.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Other audiences */}
      <div className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ook buiten de schoolmuren</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              bijleer.school is niet alleen voor scholen. Ook thuis, in een ondersteuningscentrum of in een therapiepraktijk vind je hier de tools die het leren ondersteunen.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {OTHER_AUDIENCES.map((type) => (
              <div
                key={type.title}
                className={`bg-white rounded-2xl border ${type.border} p-8 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-5 mb-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${type.bg}`}>
                    {type.icon}
                  </div>
                  <div>
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${type.badge}`}>
                      {type.badgeLabel}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{type.title}</h3>
                    <p className="text-sm text-gray-400">{type.subtitle}</p>
                  </div>
                </div>
                <p className="text-gray-500 leading-relaxed mb-6">{type.description}</p>
                <ul className="space-y-2.5">
                  {type.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Principles: net & method neutral */}
      <div className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Niet gebonden aan een net of methode
            </h2>
            <p className="text-lg text-gray-500">
              bijleer.school kiest geen kant. We zijn er voor elke leerkracht, ongeacht waar je school
              toe behoort of welke onderwijsfilosofie je hanteert.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-tint mb-5">
                  {p.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{p.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-heading font-bold mb-4">
              Is bijleer.school iets voor jouw school?
            </h2>
            <p className="text-lg mb-8 text-brand-tint max-w-xl mx-auto">
              Probeer het gratis uit. Geen kredietkaart, geen engagement.
              Ontdek of het past bij jouw team en leerlingen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/auth')}
                className="inline-flex items-center justify-center gap-2 bg-white text-brand font-heading font-semibold px-8 py-3 rounded-2xl hover:bg-brand-tint transition-all shadow-sm hover:-translate-y-0.5"
              >
                Gratis starten
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 border border-brand-soft text-white font-heading font-semibold px-8 py-3 rounded-2xl hover:bg-brand-dark transition-all shadow-sm hover:-translate-y-0.5"
              >
                Stel een vraag
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
