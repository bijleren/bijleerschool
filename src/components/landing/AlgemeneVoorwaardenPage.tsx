import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

export function AlgemeneVoorwaardenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <LandingNav navigate={navigate} />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block bg-brand-tint text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-brand-soft/40">
              Juridisch
            </span>
            <h1 className="text-4xl font-heading font-bold text-ink mb-4">Algemene Voorwaarden</h1>
            <p className="text-gray-500">Laatste update: februari 2026</p>
          </div>
        </div>
      </div>

      <div className="py-16 bg-cream-soft/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-10 prose prose-gray max-w-none">

            <Section title="1. Partijen">
              <p>Deze Algemene Voorwaarden zijn van toepassing op alle diensten aangeboden door <strong>bijleren.eu</strong>, eigenaar en exploitant van het platform <strong>bijleer.school</strong>.</p>
              <p>Contactgegevens: <a href="mailto:info@bijleren.eu" className="text-brand hover:underline">info@bijleren.eu</a></p>
            </Section>

            <Section title="2. Definities">
              <ul>
                <li><strong>Platform:</strong> het digitale platform bijleer.school, toegankelijk via bijleerschool.be en bijleren.eu.</li>
                <li><strong>Gebruiker:</strong> elke persoon die een account aanmaakt op het Platform, in het bijzonder leerkrachten en schoolbeheerders.</li>
                <li><strong>School:</strong> de onderwijsinstelling namens wie de gebruiker het Platform gebruikt.</li>
                <li><strong>Leerling:</strong> een minderjarige leerling wiens gegevens door een gebruiker worden beheerd via het Platform.</li>
                <li><strong>Dienst:</strong> alle modules, apps en functies die bijleer.school aanbiedt.</li>
              </ul>
            </Section>

            <Section title="3. Toegang en account">
              <p>Om gebruik te maken van het Platform dient u een account aan te maken. U bent verantwoordelijk voor de beveiliging van uw aanmeldgegevens. U mag uw account niet delen met derden.</p>
              <p>bijleer.school behoudt zich het recht voor om accounts te schorsen of te verwijderen bij misbruik of schending van deze voorwaarden.</p>
            </Section>

            <Section title="4. Gebruik van het Platform">
              <p>Het Platform is uitsluitend bestemd voor gebruik binnen een educatieve context. U verbindt zich ertoe:</p>
              <ul>
                <li>Het Platform niet te gebruiken voor onwettige of schadelijke doeleinden.</li>
                <li>Geen persoonsgegevens van leerlingen te verwerken buiten de doeleinden waarvoor ze zijn verzameld.</li>
                <li>Geen pogingen te ondernemen om het Platform te hacken, verstoren of te overbelasten.</li>
                <li>De intellectuele eigendomsrechten van bijleer.school te respecteren.</li>
              </ul>
            </Section>

            <Section title="5. Abonnementen en betalingen">
              <p>bijleer.school biedt een gratis proefperiode aan. Voor structureel gebruik dient een abonnement te worden afgesloten. De actuele prijzen zijn beschikbaar op de website.</p>
              <p>Abonnementen worden jaarlijks gefactureerd. Betalingen dienen te worden voldaan binnen 30 dagen na factuurdatum. Bij niet-tijdige betaling behoudt bijleer.school zich het recht voor om toegang tot het Platform te beperken.</p>
              <p>Facturen worden uitgeschreven op naam van de school of het schoolbestuur.</p>
            </Section>

            <Section title="6. Beschikbaarheid en onderhoud">
              <p>bijleer.school streeft naar een beschikbaarheid van het Platform van minimaal 99% op jaarbasis, gepland onderhoud niet meegerekend. Bij gepland onderhoud wordt u zo mogelijk vooraf verwittigd.</p>
              <p>bijleer.school is niet aansprakelijk voor schade die voortvloeit uit tijdelijke onbeschikbaarheid van het Platform.</p>
            </Section>

            <Section title="7. Intellectuele eigendom">
              <p>Alle inhoud op het Platform, inclusief software, ontwerpen, teksten en logo's, is eigendom van bijleren.eu of haar licentiegevers. U mag deze inhoud niet kopiëren, verspreiden of aanpassen zonder voorafgaande schriftelijke toestemming.</p>
              <p>Inhoud die gebruikers uploaden (zoals afbeeldingen of documenten) blijft eigendom van de gebruiker. Door het uploaden verleent u bijleer.school een beperkte licentie om deze inhoud te verwerken voor de levering van de Dienst.</p>
            </Section>

            <Section title="8. Aansprakelijkheid">
              <p>bijleer.school is niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst die voortvloeit uit het gebruik van of de onmogelijkheid tot gebruik van het Platform.</p>
              <p>De aansprakelijkheid van bijleer.school is in alle gevallen beperkt tot het bedrag dat de gebruiker in de drie maanden voorafgaand aan het schadeveroorzakend feit aan bijleer.school heeft betaald.</p>
            </Section>

            <Section title="9. Beëindiging">
              <p>U kunt uw account op elk moment opzeggen via de instellingen of door contact op te nemen met <a href="mailto:info@bijleren.eu" className="text-brand hover:underline">info@bijleren.eu</a>. Na opzegging worden uw gegevens conform ons Privacybeleid verwijderd.</p>
              <p>bijleer.school kan uw account beëindigen bij schending van deze voorwaarden, na voorafgaande kennisgeving.</p>
            </Section>

            <Section title="10. Wijzigingen aan de voorwaarden">
              <p>bijleer.school behoudt zich het recht voor deze voorwaarden te wijzigen. Gebruikers worden via e-mail of via het Platform verwittigd van wezenlijke wijzigingen. Voortgezet gebruik na de kennisgeving geldt als aanvaarding van de nieuwe voorwaarden.</p>
            </Section>

            <Section title="11. Toepasselijk recht en bevoegde rechter">
              <p>Op deze voorwaarden is het Belgisch recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechtbanken van het gerechtelijk arrondissement waar bijleren.eu gevestigd is.</p>
            </Section>

            <Section title="12. Contact">
              <p>Voor vragen over deze Algemene Voorwaarden kunt u contact opnemen via <a href="mailto:info@bijleren.eu" className="text-brand hover:underline">info@bijleren.eu</a>.</p>
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
      <h2 className="text-xl font-heading font-bold text-ink mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3 text-sm">{children}</div>
    </div>
  );
}
