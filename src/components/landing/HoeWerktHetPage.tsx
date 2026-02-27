import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, ArrowRight, UserPlus, School, Users, LayoutGrid,
  ChevronDown, ChevronUp, CheckCircle, MessageSquare, Lightbulb, Rocket,
  BookOpen, BarChart3, Shield, Clock
} from 'lucide-react';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

const STEPS = [
  {
    number: '01',
    icon: <UserPlus className="w-6 h-6 text-blue-600" />,
    title: 'Maak een gratis account',
    description: 'Registreer je via de aanmeldpagina. Geen kredietkaart nodig. Je hebt meteen toegang tot het volledige platform om alles te verkennen.',
    details: [
      'Registreer met je schoolmailadres',
      'Bevestig je account via e-mail',
      'Direct toegang tot alle leerapps',
    ],
  },
  {
    number: '02',
    icon: <School className="w-6 h-6 text-blue-600" />,
    title: 'Stel je school in',
    description: 'Maak je school aan en nodig collega\'s uit. Alle leerkrachten van dezelfde school werken samen in één gedeelde omgeving.',
    details: [
      'Voeg je schoolnaam en gegevens toe',
      'Nodig collega\'s uit via e-mail',
      'Stel klassen en groepen in',
    ],
  },
  {
    number: '03',
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: 'Voeg leerlingen toe',
    description: 'Importeer je klassenlijsten via CSV of voeg leerlingen individueel toe. Alle leerlinggegevens blijven binnen jouw school.',
    details: [
      'Bulk-import via CSV-bestand',
      'Manueel toevoegen per leerling',
      'Leerlingen indelen in klassen',
    ],
  },
  {
    number: '04',
    icon: <LayoutGrid className="w-6 h-6 text-blue-600" />,
    title: 'Gebruik de leerapps',
    description: 'Alle leerapps staan klaar. Begin met de apps die het meest aansluiten bij de noden van jouw klas. Elke app werkt direct, zonder configuratie.',
    details: [
      'Alle apps onmiddellijk bruikbaar',
      'Stap-voor-stap begeleiding in elke app',
      'Hulpcentrum en FAQ beschikbaar',
    ],
  },
];

const ROLES = [
  {
    icon: <BookOpen className="w-7 h-7 text-blue-600" />,
    title: 'Voor de leerkracht',
    points: [
      'Beheer leerlingprofielen en gedrag',
      'Gebruik didactische technieken in de les',
      'Volg leesvoortgang op per leerling',
      'Maak gepersonaliseerde webwijzers',
      'Exporteer nieuwsbrieven voor ouders',
    ],
  },
  {
    icon: <Users className="w-7 h-7 text-blue-600" />,
    title: 'Voor het schoolteam',
    points: [
      'Gedeeld overzicht per school',
      'Teambreed didactiekplatform',
      'Analyses en trends over klassen heen',
      'Centrale leerlingendatabank',
      'Vormingen en professionele ontwikkeling',
    ],
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-blue-600" />,
    title: 'Voor de directie',
    points: [
      'Schoolbrede inzichten en rapportages',
      'Overzicht van app-gebruik per leerkracht',
      'Aanvragen van nieuwe functionaliteiten',
      'Ondersteuning op maat beschikbaar',
      'GDPR-conforme gegevensopslag',
    ],
  },
];

const FAQS = [
  {
    question: 'Heb ik technische kennis nodig om te starten?',
    answer: 'Neen. BijleerSchool is ontworpen voor leerkrachten, niet voor IT-specialisten. Het platform is intuïtief en elke app bevat een korte uitleg bij de eerste gebruik.',
  },
  {
    question: 'Kunnen meerdere leerkrachten tegelijk inloggen?',
    answer: 'Ja. Elke leerkracht heeft een eigen account. Alle leerkrachten van dezelfde school werken samen in één gedeelde schoolomgeving en kunnen elkaars leerlinggegevens zien en beheren.',
  },
  {
    question: 'Wat gebeurt er als ik wil stoppen?',
    answer: 'Je kunt op elk moment stoppen. We bieden geen jaarcontracten — je betaalt per schooljaar. Je gegevens kunnen worden geëxporteerd en worden daarna veilig verwijderd.',
  },
  {
    question: 'Werkt BijleerSchool ook op tablet of smartphone?',
    answer: 'Ja. Het platform is volledig responsief en werkt op desktop, tablet en smartphone. Sommige apps, zoals ActiviTijd en WebWijzer, zijn specifiek ontworpen voor gebruik op een klassenscherm of tablet.',
  },
  {
    question: 'Hoe lang duurt het om alles in te stellen?',
    answer: 'De basisopstelling — account aanmaken, school instellen en leerlingen importeren — duurt gemiddeld 15 tot 30 minuten. Daarna kun je meteen starten met de leerapps.',
  },
];

export function HoeWerktHetPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <LandingNav navigate={navigate} />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
              Hoe werkt het?
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-5">
              Van aanmelding tot les in vier stappen
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              BijleerSchool is zo eenvoudig mogelijk opgezet. Geen ingewikkelde configuratie, geen lange handleidingen. Je bent snel klaar om te starten.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 max-w-4xl mx-auto">
            {STEPS.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-8 flex gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-blue-400 tracking-widest">{step.number}</span>
                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                  </div>
                  <p className="text-gray-500 mb-5 leading-relaxed">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Built by schools */}
      <div className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Gebouwd op vraag van scholen</h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              Elke app in BijleerSchool is ontstaan vanuit een concrete nood in de klas. Scholen vragen, wij bouwen.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: <MessageSquare className="w-6 h-6 text-blue-600" />, title: 'Wij luisteren', desc: 'Elke school kan een nieuwe app of functionaliteit aanvragen. We bespreken de nood en denken mee.' },
              { icon: <Lightbulb className="w-6 h-6 text-blue-600" />, title: 'Prototype', desc: 'Samen met de aanvragende school bouwen we een eerste versie en testen we die in een echte klasomgeving.' },
              { icon: <Rocket className="w-6 h-6 text-blue-600" />, title: 'Uitrol voor iedereen', desc: 'De nieuwe app wordt beschikbaar voor alle scholen op het platform. Geen extra kosten.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who is it for */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Voor iedereen in de school</h2>
            <p className="text-gray-500 text-lg">BijleerSchool ondersteunt leerkrachten, teams én directies.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {ROLES.map((role, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-7">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-5">
                  {role.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{role.title}</h3>
                <ul className="space-y-3">
                  {role.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Privacy en veiligheid</h3>
              <p className="text-gray-500 leading-relaxed">
                Alle leerlinggegevens worden opgeslagen binnen de EU en zijn volledig afgeschermd per school.
                Geen enkele andere school heeft toegang tot jouw gegevens. BijleerSchool voldoet aan de geldende GDPR-wetgeving.
                Leerlingprofielen bevatten geen onnodige persoonlijke informatie en worden nooit gedeeld met derden.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nog vragen?</h2>
            <p className="text-gray-500 text-lg">Hier zijn de meest gestelde vragen over het gebruik van het platform.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Klaar om te starten?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Maak vandaag nog een gratis account aan. Geen kredietkaart, geen verplichtingen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Gratis starten <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center justify-center gap-2 border border-blue-400 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Stel een vraag
              </button>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
