import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BarChart3, Globe, ArrowRight, Grid,
  BookMarked, Search, QrCode, Newspaper, ChevronDown, ChevronUp,
  CheckCircle, MessageSquare, Lightbulb, Rocket, MapPin, Star,
  BookCheck, Layers, Clock
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
    icon: <Newspaper className="w-6 h-6 text-amber-600" />,
    bg: 'bg-amber-50',
    title: 'Nieuwsbrief',
    description: 'Maak en verstuur visueel aantrekkelijke nieuwsbrieven naar ouders en leerlingen.',
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
];

const FAQS = [
  {
    question: 'Hoe werkt de gratis proefperiode?',
    answer: 'Je kunt BijleerSchool volledig gratis uitproberen zonder kredietkaart. Maak een account aan, voeg je school toe en ontdek alle leerapps. Na de proefperiode kies je welk abonnement het beste bij je school past.',
  },
  {
    question: 'Wat is het verschil tussen "Vrij aantal leerlingen" en "Volledige school"?',
    answer: '"Vrij aantal leerlingen" geeft toegang tot alle leerapps voor een zelf gekozen set leerlingen binnen de school. "Volledige school" omvat bovendien het volledige didactiekplatform met onderwijstechnieken, FAQs en vormingen — voor het hele team.',
  },
  {
    question: 'Krijg ik ook toegang tot nieuwe apps die later worden toegevoegd?',
    answer: 'Ja. Elk abonnement geeft toegang tot alle huidige én toekomstige leerapps. Je betaalt eenmalig per leerling per jaar en profiteert automatisch van alle nieuwe functionaliteiten.',
  },
  {
    question: 'Kan onze school een specifieke app laten maken?',
    answer: 'Absoluut. BijleerSchool is gebouwd op vraag van scholen. Elke school kan een aanvraag indienen voor nieuwe functionaliteiten of tools. We bespreken de nood, bouwen een prototype en rollen het uit voor alle gebruikers.',
  },
  {
    question: 'Hoe werkt ondersteuning op school?',
    answer: 'Voor scholen die extra begeleiding wensen, bieden we ondersteuning op maat aan. Dit omvat professionele ontwikkelingssessies, begeleiding bij de implementatie en directe support voor het schoolteam. Neem contact op voor een offerte.',
  },
  {
    question: 'Is er een minimum aantal leerlingen?',
    answer: 'Neen, er is geen minimum. Je betaalt exact voor het aantal leerlingen dat je toevoegt aan het platform, aan 4,5 euro per leerling per jaar.',
  },
  {
    question: 'Hoe veilig zijn de leerlinggegevens?',
    answer: 'Alle gegevens worden opgeslagen binnen de EU en zijn volledig afgeschermd per school. Leerlinggegevens zijn nooit zichtbaar voor andere scholen of derden. We voldoen aan de geldende privacy- en GDPR-wetgeving.',
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
            Gebouwd door en voor scholen
          </span>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Digitale leerapps die echt werken in de klas
          </h1>
          <p className="text-xl text-gray-500 mb-10 leading-relaxed">
            BijleerSchool bundelt alle tools die een leerkracht nodig heeft in één platform.
            Van gedragsmanagement tot leesbegeleiding — gebouwd op vraag van scholen, voor scholen.
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
  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Alle leerapps inbegrepen</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Eén abonnement geeft toegang tot alle huidige en toekomstige leerapps.
            Geen verborgen kosten, geen extra modules.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {APPS.map((app) => (
            <div
              key={app.title}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg mb-4 ${app.bg}`}>
                {app.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{app.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{app.description}</p>
            </div>
          ))}
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-5 flex flex-col items-start justify-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-gray-50 mb-4">
              <Lightbulb className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1.5">Jouw app hier?</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Scholen kunnen nieuwe apps aanvragen. Wij luisteren, bouwen een prototype en rollen het uit.
            </p>
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
            BijleerSchool is geen generiek softwarepakket. Elke app is ontstaan vanuit een concrete vraag van een leerkracht of schoolteam.
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
            href="mailto:info@bijleerschool.be"
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
              Gratis proberen
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Start zonder risico
            </h2>
            <p className="text-gray-500 text-lg mb-6 leading-relaxed">
              Maak een gratis account aan en ontdek het volledige platform. Geen kredietkaart vereist, geen tijdslimiet voor het verkennen.
              Wanneer je beslist om verder te gaan, kies je het abonnement dat past bij je school.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Toegang tot alle leerapps',
                'Geen kredietkaart nodig',
                'Volledige functionaliteit tijdens de proefperiode',
                'Persoonlijke begeleiding bij de start',
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
      name: 'Vrij aantal leerlingen',
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
      name: 'Volledige school',
      price: '4,5',
      unit: 'euro / leerling / jaar',
      description: 'Voor schoolteams die het volledige aanbod willen benutten.',
      highlight: true,
      features: [
        'Alles van Vrij aantal leerlingen',
        'Didactiekplatform voor het team',
        'Onderwijstechnieken & FAQs',
        'Vormingen en professionele ontwikkeling',
        'Prioritaire ondersteuning',
      ],
      cta: 'Start gratis',
    },
    {
      name: 'Ondersteuning op school',
      price: 'Op maat',
      unit: '',
      description: 'Begeleiding en implementatie door een expert op jouw school.',
      highlight: false,
      features: [
        'Alles van Volledige school',
        'Sessies op school',
        'Implementatiebegeleiding',
        'Training voor het team',
        'Persoonlijk aanspreekpunt',
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
            Geen verborgen kosten. Geen modules die je apart moet kopen. Alle apps inbegrepen.
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
                    <Star className="w-3 h-3" /> Meest gekozen
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
          Alle prijzen zijn exclusief BTW. Factuur beschikbaar voor scholen.
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
            Sluit je aan bij de scholen die BijleerSchool gebruiken. Maak vandaag nog een gratis account aan en ontdek alle leerapps.
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
              href="mailto:info@bijleerschool.be"
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

