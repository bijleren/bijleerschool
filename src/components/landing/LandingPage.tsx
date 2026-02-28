import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BarChart3, Globe, ArrowRight, Grid,
  BookMarked, Search, QrCode, ChevronDown, ChevronUp,
  CheckCircle, MessageSquare, Lightbulb, Rocket, MapPin, Star,
  BookCheck, Layers, Clock, Wrench, MonitorSmartphone, BookOpen, Type, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

const APPS = [
  {
    icon: <Globe className="w-6 h-6 text-orange-600" />,
    bg: 'bg-orange-50',
    title: 'WebWijzer',
    description: 'Gepersonaliseerde webwijzers per leerling met educatieve links en afgeschermde bronnen.',
  },
  {
    icon: <Grid className="w-6 h-6 text-teal-600" />,
    bg: 'bg-teal-50',
    title: 'ActiviTijd',
    description: 'Activiteitenborden voor het organiseren en beheren van klasactiviteiten in real-time.',
  },
  {
    icon: <BookMarked className="w-6 h-6 text-pink-600" />,
    bg: 'bg-pink-50',
    title: 'Boeker',
    description: 'Digitaal bibliotheeksysteem voor het beheren van schoolboeken en leenregistraties.',
  },
  {
    icon: <Search className="w-6 h-6 text-blue-600" />,
    bg: 'bg-blue-50',
    title: 'Zoeker',
    description: 'Krachtige zoekomgeving die leerlingen begeleidt naar goedgekeurde online bronnen.',
  },
  {
    icon: <QrCode className="w-6 h-6 text-cyan-600" />,
    bg: 'bg-cyan-50',
    title: 'BlinkQR',
    description: 'Gepersonaliseerde QR-codes voor snelle toegang tot leerlingprofielen en webwijzers.',
  },
  {
    icon: <Users className="w-6 h-6 text-green-600" />,
    bg: 'bg-green-50',
    title: 'Gedragsmanagement',
    description: 'Registreer en analyseer gedragsincidenten met opvolging, consequenties en inzichten.',
  },
  {
    icon: <BookCheck className="w-6 h-6 text-rose-600" />,
    bg: 'bg-rose-50',
    title: 'Leescoach',
    description: 'Begeleide leesgesprekken en leesregistraties om de leesontwikkeling van leerlingen te ondersteunen.',
  },
  {
    icon: <Layers className="w-6 h-6 text-violet-600" />,
    bg: 'bg-violet-50',
    title: 'Sporen',
    description: 'Visueel overzicht van leertrajecten en individuele groeipaden per leerling.',
  },
  {
    icon: <Clock className="w-6 h-6 text-slate-600" />,
    bg: 'bg-slate-50',
    title: 'Schooldag Planner',
    description: 'Plan en beheer lessen, vakken en dagschema\'s voor je hele school.',
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-emerald-600" />,
    bg: 'bg-emerald-50',
    title: 'Analyse & Inzichten',
    description: 'Krijg inzicht in trends, effectiviteit van technieken en leerlingontwikkeling doorheen het jaar.',
  },
  {
    icon: <Wrench className="w-6 h-6 text-gray-600" />,
    bg: 'bg-gray-50',
    title: 'DigiTools',
    description: 'Gecureerde collectie digitale tools en apps geselecteerd voor gebruik in de klas.',
  },
  {
    icon: <BookOpen className="w-6 h-6 text-lime-600" />,
    bg: 'bg-lime-50',
    title: 'kleuterdidactiek.be',
    description: 'Praktijkgerichte didactische bronnen en activiteiten speciaal voor het kleuteronderwijs.',
  },
  {
    icon: <Type className="w-6 h-6 text-yellow-600" />,
    bg: 'bg-yellow-50',
    title: 'woordenschat.be',
    description: 'Interactieve woordenschatoefeningen en tools voor woordenschatontwikkeling in de klas.',
  },
  {
    icon: <MonitorSmartphone className="w-6 h-6 text-sky-600" />,
    bg: 'bg-sky-50',
    title: 'Basis ICT-geletterdheid',
    description: 'Apps en oefeningen om leerlingen stap voor stap digitaal vaardig te maken.',
  },
];

const FAQS = [
  {
    question: 'Hoe werkt de gratis proefperiode?',
    answer: 'Je kunt bijleer.school volledig gratis uitproberen. Maak een account aan, voeg je school toe en ontdek alle leerapps. We nemen contact met je op om te kijken of wat wij bieden past bij jullie noden. Ga je niet van start met de bijleer.school? Dan verwijderen we  je school en data na 60 dagen. Zo kan je vrij uitproberen zonder zorgen.',
  },{
    question: 'Hoe werken jullie met ondersteuningcentra samen?',
    answer: 'Als ondersteuner kan je snel en eenvoudig verschillende scholen aanmaken en beheren. Zo kan je perfect over scholen heen leerlingen op weg helpen bij het gebruiken van de tools. Wil je ook met het team toegang tot onze didactische expertise? Neem contact op, want ook jullie kunnen als team een bijleer.school worden!',
  },
  {
    question: 'Wat is het verschil tussen "Leerlingen-pakket" en "Bijleer.school"?',
    answer: 'Leerling-pakket" geeft toegang tot alle leerapps voor een zelf gekozen set leerlingen binnen de school. Je krijgt geen toegang tot de didactische expertise met de vormingen, nieuwsbrieven en techniekendatabank die we hebben. Met dit pakket kan je dus alle tools gebruiken, maar mis je de didactische expertise die een volledige school wel krijgt.',
  },
  {
    question: 'Krijg ik ook toegang tot nieuwe apps die later worden toegevoegd?',
    answer: 'Ja. Elk abonnement geeft toegang tot alle huidige én toekomstige leerapps. Je betaalt eenmalig per leerling per schooljaar en profiteert automatisch van alle nieuwe functionaliteiten.',
  },
  {
    question: 'Kan onze school een specifieke app laten maken?',
    answer: 'Absoluut. bijleer.school is gebouwd op vraag van scholen. Elke school kan een aanvraag indienen voor nieuwe functionaliteiten of tools. We bespreken de nood, bouwen een prototype en rollen het uit voor alle gebruikers. Zo kan je samen met scholen laagdrempelig een app bouwen. De bijleer.school is momenteel op deze manier gebouwd. Scholen die samen beter ICT willen inzetten en vooral didactisch sterker willen staan',
  },
  {
    question: 'Hoe werkt ondersteuning op school?',
    answer: 'Voor scholen die extra begeleiding wensen, bieden we ondersteuning op maat aan. Dit omvat vormingen op maat, begeleiding bij de implementatie en live lessen op jullie school zodat leerkrachten in hun eigen klas het effect kunnen zien. Neem contact op voor een offerte.',
  },
  {
    question: 'Is er een minimum aantal leerlingen?',
    answer: 'Neen, er is geen minimum. Je betaalt exact voor het aantal leerlingen dat je toevoegt aan het platform, aan 4,5 euro per leerling per jaar.',
  }, {
    question: 'Als ik voor het leerlingpakket kies, kan ik dan doorheen het jaar van leerlingen-aantal veranderen?'',
    answer: 'Je kan altijd meer leerlingen opstarten. Elke nieuwe leerling telt mee voor je licentie. We kijken dus naar het aantal unieke leerlingen die voor een app zijn gebruikt. ',
  },
  {
    question: 'Hoe veilig zijn de leerlinggegevens?',
    answer: 'Alle gegevens worden opgeslagen binnen de EU en zijn volledig afgeschermd per school. Leerlinggegevens zijn nooit zichtbaar voor andere scholen of derden. We voldoen aan de geldende privacy- en GDPR-wetgeving.'
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <LandingNav navigate={navigate} />
      <Hero navigate={navigate} />
      <AppsSection />
      <HowItBuilt />
      <TryFreeSection navigate={navigate} />
      <PricingSection navigate={navigate} />
      <FAQSection />
      <CTASection navigate={navigate} />
      <LandingFooter />
    </div>
  );
}

function Hero({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
            Gebouwd vanuit echte noden van scholen
          </span>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Leerwinst en tijdswinst via slimme didactiek en handige ICT-tools
          </h1>
          <p className="text-xl text-gray-500 mb-10 leading-relaxed">
           Met de bijleer.school zetten we bijleren centraal. Met onze apps en platformen zet je ICT didactisch in. - Gebouwd op vraag van scholen, voor scholen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/login')} size="lg">
              Gratis uitproberen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-base"
            >
              Bekijk prijzen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const CARD_WIDTH = 260;
  const GAP = 20;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? (CARD_WIDTH + GAP) * 2 : -(CARD_WIDTH + GAP) * 2, behavior: 'smooth' });
  };

  const allItems = [
    ...APPS,
    {
      icon: <Lightbulb className="w-6 h-6 text-gray-400" />,
      bg: 'bg-gray-50',
      title: 'Jouw app hier?',
      description: 'Scholen kunnen nieuwe apps aanvragen. Wij luisteren, bouwen een prototype en rollen het uit.',
      dashed: true,
    },
  ];

  return (
    <div className="py-24 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Alle leerapps inbegrepen</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Eén abonnement geeft toegang tot alle huidige en toekomstige leerapps.
            De tools die we maken groeien uit jullie noden.
          </p>
        </div>
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
            className="flex gap-5 overflow-x-auto pb-4 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {allItems.map((app) => (
              <div
                key={app.title}
                className={`flex-shrink-0 bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
                  (app as any).dashed ? 'border-dashed border-gray-300' : 'border-gray-200'
                }`}
                style={{ width: CARD_WIDTH }}
              >
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg mb-4 ${app.bg}`}>
                  {app.icon}
                </div>
                <h3 className={`font-semibold mb-1.5 ${(app as any).dashed ? 'text-gray-700' : 'text-gray-900'}`}>
                  {app.title}
                </h3>
                <p className={`text-sm leading-relaxed ${(app as any).dashed ? 'text-gray-400' : 'text-gray-500'}`}>
                  {app.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItBuilt() {
  const steps = [
    {
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
      title: 'Wij luisteren',
      description: 'Scholen melden hun noden. Een probleem in de klas, een ontbrekende tool, een idee dat het leven van leerkrachten makkelijker maakt.',
    },
    {
      icon: <Lightbulb className="w-6 h-6 text-blue-600" />,
      title: 'Wij bouwen een prototype',
      description: 'Samen met de aanvragende school wordt een eerste versie gebouwd en getest in een echte klasomgeving.',
    },
    {
      icon: <Rocket className="w-6 h-6 text-blue-600" />,
      title: 'Iedereen profiteert',
      description: 'De nieuwe app wordt uitgerold naar alle scholen op het platform. Elke school betaalt mee aan de groei van het geheel.',
    },
  ];

  return (
    <div className="py-24 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Apps gemaakt door en voor scholen
          </h2>
          <p className="text-lg text-gray-500">
            bijleer.school is geen generiek softwarepakket. Elke app is ontstaan vanuit een concrete vraag van een leerkracht of schoolteam.
            Jouw school kan ook nieuwe functionaliteiten aanvragen.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 mb-5">
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a
            href="mailto:info@bijleren.eu"
            className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
          >
            <MapPin className="w-4 h-4" />
            Vraag een nieuwe app aan voor jouw school
          </a>
        </div>
      </div>
    </div>
  );
}

function TryFreeSection({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="py-24 bg-gray-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 sm:p-14">
          <div className="max-w-2xl">
            <span className="inline-block bg-green-50 text-green-700 text-sm font-semibold px-3 py-1 rounded-full mb-5 border border-green-100">
              Didactiek centraal
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
Niet gewoon een app, maar echte didactiek</h2>
            <p className="text-gray-500 text-lg mb-6 leading-relaxed">
              Wij hebben een menu-kaart van apps voor je klaarstaan. Voor elke school zijn er tools om de planlast te verlagen, meer leerwinst mogelijk te maken en tijdwinst centraal te zetten. Bouw een krachtige verticale leerlijn over heel je school.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Toegang tot alle leerapps',
                'Verticale leerlijn',
                'ICT leerkracht- en leerlingvriendelijk inzetten',
                'Ondersteuning tot op de klasvloer mogelijk',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button onClick={() => navigate('/login')} size="lg">
              Gratis account aanmaken
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingSection({ navigate }: { navigate: (path: string) => void }) {
  const plans = [
    {
      name: 'Leerlingpakket',
      price: '4,5',
      unit: 'euro / leerling / jaar',
      description: 'Voor klassen of groepen die zelf de schaal bepalen.',
      highlight: false,
      features: [
        'Alle huidige leerapps',
        'Alle toekomstige leerapps',
        'Leerlingbeheer en groepen',
        'Analyse en rapportage',
        'Updates inbegrepen',
      ],
      cta: 'Start gratis',
    },
    {
      name: 'Bijleer-school',
      price: '4,5',
      unit: 'euro / leerling / jaar',
      description: 'Krijg met het schoolteam toegang tot alle apps + didactische ondersteuning.',
      highlight: true,
      features: [
        'Alles van het leerling-pakket',
        'Didactische nieuwsbrief',
        'Online Vormingen',
        'Ondersteuning',
      ],
      cta: 'Start gratis',
    },
    {
      name: 'Extra ondersteuning',
      price: 'Op maat',
      unit: '',
      description: 'Begeleiding en implementatie door een expert op jouw school.',
      highlight: false,
      features: [
        'Studiedagen op je school',
        'Demo-lessen in jullie klassen',
        'Implementatiebegeleiding',
        'Apps op maat'
      ],
      cta: 'Neem contact op',
    },
  ];

  return (
    <div id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Eenvoudige, eerlijke prijzen</h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
           Alle apps inbegrepen. De enige kost die er nog bij komt is de opslagruimte die je zelf gebruikt.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                plan.highlight
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.highlight && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    <Star className="w-3 h-3" /> Ga voor impact
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                {plan.unit && <span className="text-gray-500 text-sm ml-2">{plan.unit}</span>}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate(plan.cta === 'Neem contact op' ? '/login' : '/login')}
                variant={plan.highlight ? 'primary' : 'secondary'}
                className="w-full justify-center"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">
          Alle prijzen zijn exclusief 21% BTW.
        </p>
      </div>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Veelgestelde vragen</h2>
          <p className="text-gray-500 text-lg">Staat jouw vraag er niet bij? Neem gerust contact op.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                {openIndex === i ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CTASection({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Klaar om te starten?
          </h2>
          <p className="text-lg mb-8 text-blue-100 max-w-xl mx-auto">
            Sluit je aan bij de scholen die bijleer.school gebruiken. Maak vandaag nog een gratis account aan en ontdek alle leerapps.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Gratis starten
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="mailto:info@bijleren.eu"
              className="inline-flex items-center justify-center gap-2 border border-blue-400 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact opnemen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

