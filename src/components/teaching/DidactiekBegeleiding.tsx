import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import {
  MessageSquare, GraduationCap, Eye, Lightbulb,
  ArrowLeft, CheckCircle2, X
} from 'lucide-react';

type RequestType = 'bijleergesprek' | 'vorming' | 'demodag' | 'ontwikkelingsvraag';

interface UserSchool {
  id: string;
  name: string;
}

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

const REQUEST_TYPES: {
  type: RequestType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    type: 'bijleergesprek',
    label: 'Bijleergesprek',
    description: 'Plan een online gesprek met ons team voor didactische ondersteuning van leerkrachten.',
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    type: 'vorming',
    label: 'Vorming / Pedagogische studiedag',
    description: 'Vraag een vorming of pedagogische studiedag aan voor jouw school of team.',
    icon: GraduationCap,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    type: 'demodag',
    label: 'Demodag',
    description: 'Wij komen lesgeven op jouw school.',
    icon: Eye,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    type: 'ontwikkelingsvraag',
    label: 'Ontwikkelingsvraag',
    description: 'Laat ons leermaterialen, leerapps of meer ontwikkelen op basis van jullie noden.',
    icon: Lightbulb,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
];


// ─── Form state shapes ───────────────────────────────────────────────────────

interface BijleergesprekForm {
  periode: string;
  preferred_days: string[];
  who_joins: string;
  reason: string;
}

interface VormingForm {
  periode: string;
  content_theme: string;
  specific_dates: string;
  online_meeting_moments: string;
  contact_name: string;
  contact_info: string;
  format: string;
  num_participants: string;
}

interface DemodagForm {
  periode: string;
  preferred_days: string[];
  general_topic: string;
  classes_subjects: string;
  duration: string;
  wants_qa: boolean;
}

interface OntwikkelingsvraagForm {
  contact_persons: string;
  idea_subject: string;
  online_meeting_moments: string;
  school_context: string;
  desired_outcome: string;
  has_budget: string;
  urgency: string;
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(d => d !== opt) : [...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            selected.includes(opt)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

// ─── Individual form components ───────────────────────────────────────────────

function BijleergesprekFormFields({
  data,
  onChange,
}: {
  data: BijleergesprekForm;
  onChange: (d: BijleergesprekForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Periode</FieldLabel>
        <Input
          value={data.periode}
          onChange={e => onChange({ ...data, periode: e.target.value })}
          placeholder="bijv. oktober – december 2026"
          required
        />
      </div>
      <div>
        <FieldLabel>Voorkeursdagen</FieldLabel>
        <CheckboxGroup
          options={DAYS}
          selected={data.preferred_days}
          onChange={val => onChange({ ...data, preferred_days: val })}
        />
      </div>
      <div>
        <FieldLabel required>Wie neemt deel?</FieldLabel>
        <Input
          value={data.who_joins}
          onChange={e => onChange({ ...data, who_joins: e.target.value })}
          placeholder="bijv. zorgleerkrachten, directie, gehele leerkrachtenteam…"
          required
        />
      </div>
      <div>
        <FieldLabel required>Waarom is dit gesprek nodig?</FieldLabel>
        <textarea
          value={data.reason}
          onChange={e => onChange({ ...data, reason: e.target.value })}
          placeholder="Geef een korte omschrijving van de aanleiding en het doel van het gesprek."
          rows={4}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}

function VormingFormFields({
  data,
  onChange,
}: {
  data: VormingForm;
  onChange: (d: VormingForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Periode</FieldLabel>
        <Input
          value={data.periode}
          onChange={e => onChange({ ...data, periode: e.target.value })}
          placeholder="bijv. januari – maart 2027"
          required
        />
      </div>
      <div>
        <FieldLabel required>Inhoud en thema</FieldLabel>
        <textarea
          value={data.content_theme}
          onChange={e => onChange({ ...data, content_theme: e.target.value })}
          placeholder="Beschrijf het gewenste thema of de inhoud van de vorming."
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div>
        <FieldLabel>Mogelijke specifieke data</FieldLabel>
        <Input
          value={data.specific_dates}
          onChange={e => onChange({ ...data, specific_dates: e.target.value })}
          placeholder="bijv. 12/02, 14/02 of 'vrijdag in februari'"
        />
      </div>
      <div>
        <FieldLabel>Mogelijke momenten voor online overleg</FieldLabel>
        <Input
          value={data.online_meeting_moments}
          onChange={e => onChange({ ...data, online_meeting_moments: e.target.value })}
          placeholder="bijv. dinsdagavond, woensdagnamiddag…"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Contactpersoon</FieldLabel>
          <Input
            value={data.contact_name}
            onChange={e => onChange({ ...data, contact_name: e.target.value })}
            placeholder="Naam contactpersoon"
            required
          />
        </div>
        <div>
          <FieldLabel required>Contactgegevens</FieldLabel>
          <Input
            value={data.contact_info}
            onChange={e => onChange({ ...data, contact_info: e.target.value })}
            placeholder="E-mail of telefoonnummer"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Voorkeursvorm</FieldLabel>
          <select
            value={data.format}
            onChange={e => onChange({ ...data, format: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Geen voorkeur</option>
            <option value="in-school">Op school</option>
            <option value="external">Externe locatie</option>
            <option value="online">Online</option>
          </select>
        </div>
        <div>
          <FieldLabel>Geschat aantal deelnemers</FieldLabel>
          <Input
            type="number"
            value={data.num_participants}
            onChange={e => onChange({ ...data, num_participants: e.target.value })}
            placeholder="bijv. 15"
            min="1"
          />
        </div>
      </div>
    </div>
  );
}

function DemodagFormFields({
  data,
  onChange,
}: {
  data: DemodagForm;
  onChange: (d: DemodagForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Periode</FieldLabel>
        <Input
          value={data.periode}
          onChange={e => onChange({ ...data, periode: e.target.value })}
          placeholder="bijv. april – juni 2027"
          required
        />
      </div>
      <div>
        <FieldLabel>Voorkeursdagen</FieldLabel>
        <CheckboxGroup
          options={DAYS}
          selected={data.preferred_days}
          onChange={val => onChange({ ...data, preferred_days: val })}
        />
      </div>
      <div>
        <FieldLabel required>Algemeen thema</FieldLabel>
        <Input
          value={data.general_topic}
          onChange={e => onChange({ ...data, general_topic: e.target.value })}
          placeholder="bijv. differentiatie, coöperatief leren, technologie…"
          required
        />
      </div>
      <div>
        <FieldLabel required>Welke klassen / vakken?</FieldLabel>
        <textarea
          value={data.classes_subjects}
          onChange={e => onChange({ ...data, classes_subjects: e.target.value })}
          placeholder="bijv. 3de graad LO, wiskunde en talen in de middenschool…"
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div>
        <FieldLabel>Gewenste duur</FieldLabel>
        <select
          value={data.duration}
          onChange={e => onChange({ ...data, duration: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Geen voorkeur</option>
          <option value="halve dag">Halve dag</option>
          <option value="volledige dag">Volledige dag</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="wants_qa"
          checked={data.wants_qa}
          onChange={e => onChange({ ...data, wants_qa: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="wants_qa" className="text-sm text-gray-700">
          Nabespreking / Q&amp;A gewenst na de demo
        </label>
      </div>
    </div>
  );
}

function OntwikkelingsvraagFormFields({
  data,
  onChange,
}: {
  data: OntwikkelingsvraagForm;
  onChange: (d: OntwikkelingsvraagForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Contactpersoon(en) en bereikbaarheid</FieldLabel>
        <textarea
          value={data.contact_persons}
          onChange={e => onChange({ ...data, contact_persons: e.target.value })}
          placeholder="Naam, functie, e-mail en/of telefoonnummer"
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div>
        <FieldLabel required>Idee / onderwerp</FieldLabel>
        <textarea
          value={data.idea_subject}
          onChange={e => onChange({ ...data, idea_subject: e.target.value })}
          placeholder="Beschrijf kort het onderwerp of de vraag die je wilt bespreken."
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div>
        <FieldLabel>Mogelijke momenten voor online overleg</FieldLabel>
        <Input
          value={data.online_meeting_moments}
          onChange={e => onChange({ ...data, online_meeting_moments: e.target.value })}
          placeholder="bijv. woensdagochtend, vrijdagnamiddag…"
        />
      </div>
      <div>
        <FieldLabel>Schoolcontext</FieldLabel>
        <textarea
          value={data.school_context}
          onChange={e => onChange({ ...data, school_context: e.target.value })}
          placeholder="Korte omschrijving van de schoolsituatie, uitdagingen of achtergrond."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div>
        <FieldLabel>Gewenst resultaat</FieldLabel>
        <textarea
          value={data.desired_outcome}
          onChange={e => onChange({ ...data, desired_outcome: e.target.value })}
          placeholder="Wat hoop je te bereiken met deze samenwerking?"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Budget</FieldLabel>
          <select
            value={data.has_budget}
            onChange={e => onChange({ ...data, has_budget: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Weet ik nog niet</option>
            <option value="ja">Budget beschikbaar</option>
            <option value="offerte nodig">Offerte eerst nodig</option>
          </select>
        </div>
        <div>
          <FieldLabel>Urgentie / timing</FieldLabel>
          <select
            value={data.urgency}
            onChange={e => onChange({ ...data, urgency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Geen specifieke deadline</option>
            <option value="dringend">Dringend (binnen 1 maand)</option>
            <option value="dit schooljaar">Dit schooljaar</option>
            <option value="volgend schooljaar">Volgend schooljaar</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DidactiekBegeleiding() {
  const { user } = useAuth();
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [activeForm, setActiveForm] = useState<RequestType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [bijleergesprekData, setBijleergesprekData] = useState<BijleergesprekForm>({
    periode: '', preferred_days: [], who_joins: '', reason: '',
  });
  const [vormingData, setVormingData] = useState<VormingForm>({
    periode: '', content_theme: '', specific_dates: '', online_meeting_moments: '',
    contact_name: '', contact_info: '', format: '', num_participants: '',
  });
  const [demodagData, setDemodagData] = useState<DemodagForm>({
    periode: '', preferred_days: [], general_topic: '', classes_subjects: '',
    duration: '', wants_qa: false,
  });
  const [ontwikkelingsvraagData, setOntwikkelingsvraagData] = useState<OntwikkelingsvraagForm>({
    contact_persons: '', idea_subject: '', online_meeting_moments: '',
    school_context: '', desired_outcome: '', has_budget: '', urgency: '',
  });

  useEffect(() => {
    fetchUserSchools();
  }, [user]);

  const fetchUserSchools = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select('schools (id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      const schools: UserSchool[] = (data ?? [])
        .map((us: any) => us.schools)
        .filter(Boolean);
      setUserSchools(schools);
      if (schools.length === 1) setSelectedSchoolId(schools[0].id);
    } catch {
      // silent
    }
  };

  const getFormData = (): Record<string, any> => {
    switch (activeForm) {
      case 'bijleergesprek': return bijleergesprekData;
      case 'vorming': return vormingData;
      case 'demodag': return demodagData;
      case 'ontwikkelingsvraag': return ontwikkelingsvraagData;
      default: return {};
    }
  };

  const resetForm = () => {
    setBijleergesprekData({ periode: '', preferred_days: [], who_joins: '', reason: '' });
    setVormingData({ periode: '', content_theme: '', specific_dates: '', online_meeting_moments: '', contact_name: '', contact_info: '', format: '', num_participants: '' });
    setDemodagData({ periode: '', preferred_days: [], general_topic: '', classes_subjects: '', duration: '', wants_qa: false });
    setOntwikkelingsvraagData({ contact_persons: '', idea_subject: '', online_meeting_moments: '', school_context: '', desired_outcome: '', has_budget: '', urgency: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm || !selectedSchoolId || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('begeleiding_requests').insert({
        type: activeForm,
        school_id: selectedSchoolId,
        submitted_by: user.id,
        form_data: getFormData(),
        status: 'nieuw',
      });
      if (error) throw error;

      resetForm();
      setSubmitted(true);
    } catch {
      setToast({ message: 'Fout bij versturen aanvraag', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = (type: RequestType) => {
    setActiveForm(type);
    setSubmitted(false);
  };

  const closeForm = () => {
    setActiveForm(null);
    setSubmitted(false);
    resetForm();
  };

  // ─── Form view ───────────────────────────────────────────────────────────────
  if (activeForm) {
    const typeInfo = REQUEST_TYPES.find(t => t.type === activeForm)!;

    if (submitted) {
      return (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={closeForm}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar overzicht
          </button>
          <div className="bg-white border border-emerald-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Aanvraag ontvangen!</h2>
            <p className="text-gray-600 mb-6">
              Bedankt voor jouw {typeInfo.label.toLowerCase()}-aanvraag. Ons team neemt zo snel mogelijk contact met je op om alles te bespreken en te plannen.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={closeForm} variant="secondary">
                Terug naar overzicht
              </Button>
              <Button onClick={() => { setSubmitted(false); resetForm(); }}>
                Nieuwe aanvraag
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={closeForm}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar overzicht
        </button>

        <div className={`border-2 ${typeInfo.borderColor} rounded-2xl overflow-hidden shadow-sm`}>
          <div className={`${typeInfo.bgColor} px-6 py-5 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center`}>
              <typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{typeInfo.label}</h2>
              <p className="text-sm text-gray-600">{typeInfo.description}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
            {userSchools.length > 1 && (
              <div>
                <FieldLabel required>School</FieldLabel>
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecteer een school</option>
                  {userSchools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {activeForm === 'bijleergesprek' && (
              <BijleergesprekFormFields data={bijleergesprekData} onChange={setBijleergesprekData} />
            )}
            {activeForm === 'vorming' && (
              <VormingFormFields data={vormingData} onChange={setVormingData} />
            )}
            {activeForm === 'demodag' && (
              <DemodagFormFields data={demodagData} onChange={setDemodagData} />
            )}
            {activeForm === 'ontwikkelingsvraag' && (
              <OntwikkelingsvraagFormFields data={ontwikkelingsvraagData} onChange={setOntwikkelingsvraagData} />
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !selectedSchoolId}>
                {submitting ? 'Verzenden…' : 'Aanvraag versturen'}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                <X className="w-4 h-4 mr-1.5" />
                Annuleren
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── Overview ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Begeleiding</h2>
        <p className="text-gray-600 mt-1">
          Vraag ondersteuning aan voor jouw school. Selecteer het type begeleiding dat bij jouw nood past — ons team neemt daarna contact met je op.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REQUEST_TYPES.map(rt => (
          <button
            key={rt.type}
            onClick={() => openForm(rt.type)}
            className={`text-left p-5 rounded-2xl border-2 ${rt.borderColor} ${rt.bgColor} hover:shadow-md transition-all group`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <rt.icon className={`w-6 h-6 ${rt.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{rt.label}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{rt.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
