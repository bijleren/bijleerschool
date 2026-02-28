import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Star, HardDrive, ArrowRight, MessageSquare, CalendarCheck, ShieldCheck, Rocket, ChevronDown, ChevronUp } from 'lucide-react';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';
import { Button } from '../ui/Button';

const plans = [
  {
    name: 'Leerlingpakket',
    price: '4,5',
    unit: 'euro / leerling / jaar',
    description: 'Kies zelf de groepsgrootte.',
    highlight: false,
    features: [
      'Alle huidige leerapps',
      'Alle toekomstige leerapps',
      'Leerlingbeheer en groepen',
      'Analyse en rapportage',
      'Updates inbegrepen',
    ],
    cta: 'Start gratis',
    bestelUrl: 'https://www.bijleren.eu/shop/bijleer-school-123#attribute_values=60',
  },
  {
    name: 'Bijleer-school',
    price: '4,5',
    unit: 'euro / leerling / jaar',
    description: 'Krijg met het schoolteam toegang tot alle apps + didactische ondersteuning.',
    highlight: true,
    features: [
      'Alle huidige leerapps',
      'Alle toekomstige leerapps',
      'Leerlingbeheer en groepen',
      'Analyse en rapportage',
      'Updates inbegrepen',
      'Didactische nieuwsbrief',
      'Ondersteuning via online Q&A-sessies',
      'Online Vormingen',
      'Ondersteuning',
    ],
    cta: 'Start gratis',
    bestelUrl: 'https://www.bijleren.eu/shop/bijleer-school-123#attribute_values=63',
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
      'Apps op maat',
    ],
    cta: 'Neem contact op',
    bestelUrl: null,
  },
];

const timelineSteps = [
  {
    icon: Rocket,
    color: 'bg-blue-600',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    step: '01',
    title: 'Start gratis — volledig platform',
    body: 'Je krijgt meteen toegang tot het volledige platform. Geen creditcard, geen verplichtingen. Tijdens de gratis periode zijn er limieten op de hoeveelheid data die je kunt opslaan, maar alle functies staan voor je open.',
  },
  {
    icon: CalendarCheck,
    color: 'bg-emerald-600',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    step: '02',
    title: 'Welkomstsessie na 1–2 weken',
    body: 'Na 1 à 2 weken nemen we contact op om je uit te nodigen voor een persoonlijke welkomstsessie. We leren je school kennen, beantwoorden vragen en helpen je op weg met de tools die het meest relevant zijn voor jouw klas of team.',
  },
  {
    icon: MessageSquare,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    step: '03',
    title: 'Offerte op maat voor jouw school',
    body: 'Na de sessie stellen we een offerte op, afgestemd op jullie huidige gebruik en toekomstige noden. Zo weet je precies wat het platform kost voor jouw school — transparant, zonder verborgen kosten.',
  },
  {
    icon: ShieldCheck,
    color: 'bg-gray-700',
    lightColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    step: '04',
    title: '1 maand om te beslissen — inclusief GDPR',
    body: 'Na de offerte heb je 1 maand de tijd om te beslissen. In die periode behoud je volledige toegang tot alle functies en data. We zorgen ook voor de ondertekening van de nodige GDPR-verwerkersovereenkomsten, zodat je volledig compliant aan de slag kunt.',
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
  },
  {
    question: 'Als ik voor het leerlingpakket kies, kan ik dan doorheen het jaar van leerlingen-aantal veranderen?',
    answer: 'Je kan altijd meer leerlingen opstarten. Elke nieuwe leerling telt mee voor je licentie. We kijken dus naar het aantal unieke leerlingen die voor een app zijn gebruikt. ',
  },
  {
    question: 'Hoe veilig zijn de leerlinggegevens?',
    answer: 'Alle gegevens worden opgeslagen binnen de EU en zijn volledig afgeschermd per school. Leerlinggegevens zijn nooit zichtbaar voor andere scholen of derden. We voldoen aan de geldende privacy- en GDPR-wetgeving.',
  },{
    question: 'Is er korting als we later in het jaar starten?',
    answer: 'Voor leerling-pakketten is er geen korting mogelijk. Van zodra je bestelt loopt de licentie tot 31 augustus van dat schooljaar. Wil je later in het schooljaar starten als bijleer.school? Dan voorzien we een korting afhankelijk van de maand waarin je start. Neem hiervoor contact op via info@bijleren.eu',
  },{
    question: 'Kunnen we als scholengroep aankopen?',
    answer: 'Ja, het project is ook zo gestart. Samen bereiken we meer! Mail ons op info@bijleren.eu voor een offerte op maat.',
  },{
    question: 'Is dit een abonnement?',
    answer: 'Neen, per schooljaar kies je of je verder deelneemt.',
  },
];

export function PrijzenPage() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <LandingNav navigate={navigate} />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gray-50 border-b border-gray-100 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-block text-xs font-semibold tracking-widest text-blue-600 uppercase mb-4">Prijzen</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
              Eenvoudige, transparante prijzen
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Alle apps inbegrepen. De enige extra kost is de opslagruimte die je zelf gebruikt.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <div className="mt-auto flex flex-col gap-3">
                    <Button
                      onClick={() => navigate('/login')}
                      variant={plan.highlight ? 'primary' : 'secondary'}
                      className="w-full justify-center"
                    >
                      {plan.cta}
                    </Button>
                    {plan.bestelUrl && (
                      <a
                        href={plan.bestelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center py-2.5 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Bestel nu
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-8">
              Alle prijzen zijn exclusief 21% BTW.
            </p>
          </div>
        </section>

        {/* Data storage section */}
        <section className="py-20 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md mt-1">
                <HardDrive className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Opslagruimte — 1,65 / GB</h2>
                <p className="text-gray-600 leading-relaxed mb-5">
                  Voor apps waarmee je afbeeldingen, video's, documenten of andere bestanden kunt uploaden, gebruiken we opslagruimte. Die verbruik je gedurende het schooljaar.
                </p>
                <p className="text-gray-600 leading-relaxed mb-5">
                  We rekenen <span className="font-semibold text-gray-900">€ 1,65 per GB</span> aan, te verbruiken over het lopende schooljaar. Bij aanvang stellen we samen een datapakket voor dat past bij de tools die jouw school het meest zal gebruiken — zo betaal je nooit te veel en loop je niet onverwacht tegen limieten aan.
                </p>
                <div className="bg-white border border-gray-200 rounded-xl p-5 inline-flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Pakket op maat op basis van jouw gebruik</span>
                  </div>
                  <div className="hidden sm:block w-px h-5 bg-gray-200" />
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Geen verborgen kosten</span>
                  </div>
                  <div className="hidden sm:block w-px h-5 bg-gray-200" />
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Suggestie van ons inbegrepen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works — timeline */}
        <section className="py-20 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold tracking-widest text-blue-600 uppercase mb-3">Hoe werkt het?</span>
              <h2 className="text-3xl font-bold text-gray-900">Van gratis start tot volledig platform</h2>
              <p className="text-gray-500 mt-3 max-w-lg mx-auto">
                We begeleiden elke school stap voor stap — geen stress, geen verplichtingen van bij het begin.
              </p>
            </div>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-7 top-0 bottom-0 w-px bg-gray-200 hidden sm:block" aria-hidden="true" />

              <div className="space-y-10">
                {timelineSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="relative flex gap-6 sm:gap-8">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center shadow-md z-10`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Content */}
                      <div className={`flex-1 border ${step.borderColor} rounded-2xl p-6 ${step.lightColor}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs font-bold ${step.textColor} tracking-widest uppercase`}>Stap {step.step}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-gray-50 border-t border-gray-100">
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
        </section>

        {/* CTA */}
        <section className="py-20 bg-blue-600">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Klaar om te starten?</h2>
            <p className="text-blue-100 text-lg mb-8">
              Begin vandaag gratis. Geen creditcard, geen verplichtingen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
              >
                Start gratis
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors border border-blue-500"
              >
                Neem contact op
              </button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
