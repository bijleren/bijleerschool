import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <LandingNav navigate={navigate} />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
              Juridisch
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacybeleid</h1>
            <p className="text-gray-500">Laatste update: februari 2026</p>
          </div>
        </div>
      </div>

      <div className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-10 prose prose-gray max-w-none">

            <Section title="1. Verwerkingsverantwoordelijke">
              <p><strong>bijleren.eu</strong> is de verwerkingsverantwoordelijke voor de persoonsgegevens die via het platform bijleer.school worden verwerkt.</p>
              <p>Contactadres: <a href="mailto:info@bijleren.eu" className="text-blue-600 hover:underline">info@bijleren.eu</a></p>
            </Section>

            <Section title="2. Welke gegevens verwerken wij?">
              <p>Wij verwerken de volgende categorieën persoonsgegevens:</p>
              <ul>
                <li><strong>Accountgegevens:</strong> voornaam, achternaam, e-mailadres, school.</li>
                <li><strong>Leerlinggegevens:</strong> voornaam, achternaam, klas, groep en gegevens die leerkrachten invoeren in de apps (gedragsregistraties, leesverslagen, activiteiten, etc.).</li>
                <li><strong>Gebruiksgegevens:</strong> inlogmomenten, gebruikte functies, technische logbestanden.</li>
                <li><strong>Betalingsgegevens:</strong> factuurgegevens (geen betaalkaartgegevens — betalingen verlopen via beveiligde derde partijen).</li>
              </ul>
            </Section>

            <Section title="3. Doeleinden van de verwerking">
              <p>Wij verwerken persoonsgegevens voor de volgende doeleinden:</p>
              <ul>
                <li>Het leveren en verbeteren van de diensten op het Platform.</li>
                <li>Het beheren van gebruikersaccounts en schoolprofielen.</li>
                <li>Het factureren van abonnementen.</li>
                <li>Het bieden van technische ondersteuning.</li>
                <li>Het naleven van wettelijke verplichtingen.</li>
              </ul>
            </Section>

            <Section title="4. Rechtsgrond voor de verwerking">
              <p>De verwerking van persoonsgegevens is gebaseerd op:</p>
              <ul>
                <li><strong>Uitvoering van een overeenkomst:</strong> voor het verlenen van de dienst aan geregistreerde gebruikers.</li>
                <li><strong>Toestemming:</strong> voor het plaatsen van niet-functionele cookies (zie cookiebeleid).</li>
                <li><strong>Wettelijke verplichting:</strong> voor bewaarplichten inzake facturatie.</li>
                <li><strong>Gerechtvaardigd belang:</strong> voor interne analyse en beveiligingsmonitoring.</li>
              </ul>
            </Section>

            <Section title="5. Leerlinggegevens en GDPR">
              <p>bijleer.school verwerkt gegevens van minderjarigen uitsluitend op instructie van de school (de feitelijke verwerkingsverantwoordelijke voor leerlinggegevens). De school draagt de verantwoordelijkheid voor het informeren van ouders en leerlingen conform de AVG/GDPR.</p>
              <p>Leerlinggegevens worden nooit gebruikt voor marketing, profilering of gedeeld met derden buiten de schoolcontext.</p>
            </Section>

            <Section title="6. Bewaartermijnen">
              <p>Accountgegevens worden bewaard zolang het account actief is, en tot 2 jaar na opzegging. Leerlinggegevens worden verwijderd op verzoek van de school of uiterlijk 1 jaar na het einde van het abonnement. Factuurgegevens worden 7 jaar bewaard conform de boekhoudwetgeving.</p>
            </Section>

            <Section title="7. Doorgifte aan derden">
              <p>Wij geven persoonsgegevens niet door aan derden voor commerciële doeleinden. Voor de technische werking van het Platform maken wij gebruik van verwerkers (o.a. Supabase voor data-opslag), met wie we verwerkersovereenkomsten hebben afgesloten. Alle gegevens worden opgeslagen binnen de Europese Unie.</p>
            </Section>

            <Section title="8. Beveiliging">
              <p>Wij nemen passende technische en organisatorische maatregelen om persoonsgegevens te beschermen tegen ongeoorloofde toegang, verlies of misbruik. Dit omvat versleutelde verbindingen (HTTPS), toegangsbeheer per school en regelmatige veiligheidsaudits.</p>
            </Section>

            <Section title="9. Uw rechten">
              <p>Onder de GDPR heeft u de volgende rechten:</p>
              <ul>
                <li>Recht op inzage in uw persoonsgegevens.</li>
                <li>Recht op rectificatie van onjuiste gegevens.</li>
                <li>Recht op verwijdering ("recht op vergetelheid").</li>
                <li>Recht op beperking van de verwerking.</li>
                <li>Recht op overdraagbaarheid van gegevens.</li>
                <li>Recht om bezwaar te maken tegen verwerking.</li>
              </ul>
              <p>U kunt uw rechten uitoefenen door contact op te nemen via <a href="mailto:info@bijleren.eu" className="text-blue-600 hover:underline">info@bijleren.eu</a>. Wij reageren binnen 30 dagen.</p>
            </Section>

            <Section title="10. Cookies">
              <p>bijleer.school maakt gebruik van functionele cookies die noodzakelijk zijn voor de werking van het Platform (sessiebeheer, authenticatie). Wij gebruiken geen analytische of advertentiecookies zonder uw toestemming. Zie ook ons cookiebanner bij uw eerste bezoek.</p>
            </Section>

            <Section title="11. Klachten">
              <p>Als u meent dat wij uw persoonsgegevens niet correct verwerken, kunt u een klacht indienen bij de Gegevensbeschermingsautoriteit (GBA) via <a href="https://www.gegevensbeschermingsautoriteit.be" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.gegevensbeschermingsautoriteit.be</a>.</p>
            </Section>

            <Section title="12. Wijzigingen">
              <p>Wij behouden ons het recht voor dit privacybeleid te wijzigen. De meest actuele versie is altijd beschikbaar op onze website. Bij wezenlijke wijzigingen worden gebruikers per e-mail geïnformeerd.</p>
            </Section>

          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3 text-sm">{children}</div>
    </div>
  );
}
