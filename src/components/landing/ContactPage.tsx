import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MapPin, MessageSquare, School, Lightbulb, CheckCircle, ArrowRight } from 'lucide-react';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';

const CONTACT_REASONS = [
  { value: 'demo', label: 'Ik wil een demo of meer informatie' },
  { value: 'app-request', label: 'Ik wil een nieuwe app aanvragen' },
  { value: 'support', label: 'Ik wil ondersteuning op school' },
  { value: 'pricing', label: 'Ik heb een vraag over de prijzen' },
  { value: 'other', label: 'Andere vraag' },
];

export function ContactPage() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    school: '',
    reason: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mailto = `mailto:info@bijleren.eu?subject=${encodeURIComponent(`BijleerSchool contact: ${formState.reason}`)}&body=${encodeURIComponent(
      `Naam: ${formState.name}\nSchool: ${formState.school}\nE-mail: ${formState.email}\n\n${formState.message}`
    )}`;
    window.location.href = mailto;
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingNav navigate={navigate} />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
              Contact
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-5">
              We staan klaar om te helpen
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              Heb je een vraag, wil je een demo aanvragen of wil je een nieuwe app laten bouwen voor jouw school?
              Neem gerust contact op.
            </p>
          </div>
        </div>
      </div>

      {/* Contact grid */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 items-start">

            {/* Left: info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Hoe kunnen we helpen?</h2>
                <p className="text-gray-500 leading-relaxed">
                  Of je nu een vraag hebt over het platform, een nieuwe app wil aanvragen of ondersteuning op school wenst — we luisteren graag.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">E-mail</p>
                    <a href="mailto:info@bijleren.eu" className="text-blue-600 hover:underline text-sm">
                      info@bijleren.eu
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <School className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">Ondersteuning op school</p>
                    <p className="text-gray-500 text-sm">We komen langs voor sessies op maat.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">Nieuwe app aanvragen</p>
                    <p className="text-gray-500 text-sm">Heeft jouw school een nood die we nog niet invullen? Vertel het ons.</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Wij luisteren → prototype → gebruik</span>
                </div>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Elke app in BijleerSchool is gebouwd op vraag van een school. Jouw idee kan de volgende zijn die uitgerold wordt voor alle gebruikers.
                </p>
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-5">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Bericht verstuurd!</h3>
                  <p className="text-gray-500 mb-6">Je e-mailprogramma werd geopend. We reageren zo snel mogelijk.</p>
                  <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
                  >
                    Terug naar home <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formState.name}
                        onChange={handleChange}
                        placeholder="Jouw naam"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
                      <input
                        type="text"
                        name="school"
                        value={formState.school}
                        onChange={handleChange}
                        placeholder="Naam van je school"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mailadres</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formState.email}
                      onChange={handleChange}
                      placeholder="jouw@school.be"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reden van contact</label>
                    <select
                      name="reason"
                      required
                      value={formState.reason}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Selecteer een reden</option>
                      {CONTACT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bericht</label>
                    <textarea
                      name="message"
                      required
                      value={formState.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Vertel ons meer..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Bericht versturen
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Dit opent je e-mailprogramma. Je kunt ook rechtstreeks mailen naar{' '}
                    <a href="mailto:info@bijleren.eu" className="text-blue-500 hover:underline">info@bijleren.eu</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
