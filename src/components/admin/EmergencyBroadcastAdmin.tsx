import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { RichTextEditor } from '../ui/RichTextEditor';
import {
  Megaphone, AlertTriangle, Info, Save, Eye, EyeOff,
  Clock, Globe, ToggleLeft, ToggleRight, Loader,
} from 'lucide-react';

interface Broadcast {
  id: string;
  platform: string;
  is_active: boolean;
  type: 'info' | 'warning' | 'danger';
  title: string;
  content: string;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
}

const PLATFORMS = [
  { value: 'bijleer.school', label: 'bijleer.school' },
  { value: 'all', label: 'Alle platformen' },
];

const TYPES = [
  {
    value: 'info' as const,
    label: 'Info',
    bg: 'bg-#946B29',
    text: 'text-white',
    Icon: Info,
    preview: 'border-amber-300 bg-amber-50',
    iconColor: 'text-#946B29',
  },
  {
    value: 'warning' as const,
    label: 'Waarschuwing',
    bg: 'bg-amber-500',
    text: 'text-white',
    Icon: AlertTriangle,
    preview: 'border-amber-300 bg-amber-50',
    iconColor: 'text-amber-500',
  },
  {
    value: 'danger' as const,
    label: 'Gevaar',
    bg: 'bg-red-600',
    text: 'text-white',
    Icon: Megaphone,
    preview: 'border-red-300 bg-red-50',
    iconColor: 'text-red-600',
  },
];

const bannerThemes = {
  info: { bg: 'bg-#946B29', iconBg: 'bg-amber-500', Icon: Info },
  warning: { bg: 'bg-amber-500', iconBg: 'bg-amber-400', Icon: AlertTriangle },
  danger: { bg: 'bg-red-600', iconBg: 'bg-red-500', Icon: Megaphone },
};

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return '';
  // Convert UTC ISO string to local datetime-local input value
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeValue(val: string): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}

export function EmergencyBroadcastAdmin() {
  const [selectedPlatform, setSelectedPlatform] = useState('bijleer.school');
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<'info' | 'warning' | 'danger'>('info');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formEndsAt, setFormEndsAt] = useState('');
  const [formIsActive, setFormIsActive] = useState(false);

  const [showPreview, setShowPreview] = useState(true);

  const loadBroadcast = useCallback(async (platform: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('emergency_broadcasts')
      .select('*')
      .eq('platform', platform)
      .maybeSingle();

    if (err) { setError(err.message); setLoading(false); return; }

    if (data) {
      setBroadcast(data as Broadcast);
      setFormType(data.type);
      setFormTitle(data.title);
      setFormContent(data.content);
      setFormStartsAt(toLocalDatetimeValue(data.starts_at));
      setFormEndsAt(toLocalDatetimeValue(data.ends_at));
      setFormIsActive(data.is_active);
    } else {
      // Insert default row for this platform
      const { data: inserted } = await supabase
        .from('emergency_broadcasts')
        .insert({ platform, is_active: false, type: 'info', title: '', content: '' })
        .select()
        .single();
      if (inserted) {
        setBroadcast(inserted as Broadcast);
        setFormType('info');
        setFormTitle('');
        setFormContent('');
        setFormStartsAt('');
        setFormEndsAt('');
        setFormIsActive(false);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBroadcast(selectedPlatform);
  }, [selectedPlatform, loadBroadcast]);

  const handleSave = async () => {
    if (!broadcast) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('emergency_broadcasts')
      .update({
        type: formType,
        title: formTitle,
        content: formContent,
        starts_at: fromLocalDatetimeValue(formStartsAt),
        ends_at: fromLocalDatetimeValue(formEndsAt),
        is_active: formIsActive,
      })
      .eq('id', broadcast.id);

    if (err) { setError(err.message); } else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    setSaving(false);
  };

  const handleToggle = async () => {
    if (!broadcast) return;
    setToggling(true);
    const newActive = !formIsActive;
    const { error: err } = await supabase
      .from('emergency_broadcasts')
      .update({ is_active: newActive })
      .eq('id', broadcast.id);
    if (!err) setFormIsActive(newActive);
    setToggling(false);
  };

  const typeConfig = TYPES.find(t => t.value === formType) ?? TYPES[0];
  const bannerTheme = bannerThemes[formType];
  const BannerIcon = bannerTheme.Icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Noodmelding beheer</h2>
            <p className="text-sm text-gray-500">Activeer een melding voor alle ingelogde gebruikers</p>
          </div>
        </div>

        {/* Quick toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling || loading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
            formIsActive
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {toggling ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : formIsActive ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          {formIsActive ? 'Melding actief' : 'Melding inactief'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Left: Form ── */}
        <div className="space-y-5">
          {/* Platform selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <Globe className="w-4 h-4 inline mr-1 text-gray-500" />
              Platform
            </label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSelectedPlatform(p.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    selectedPlatform === p.value
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type melding</label>
            <div className="flex gap-2">
              {TYPES.map(t => {
                const TIcon = t.Icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFormType(t.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      formType === t.value
                        ? `${t.bg} ${t.text} border-transparent shadow-md`
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <TIcon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titel</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Korte, duidelijke titel..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Content WYSIWYG */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Berichtinhoud</label>
            <RichTextEditor
              value={formContent}
              onChange={setFormContent}
              placeholder="Typ hier de noodmelding..."
              minHeight="140px"
              extended
            />
          </div>

          {/* Scheduling */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <Clock className="w-4 h-4 inline mr-1 text-gray-500" />
              Planning (optioneel)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Actief vanaf</p>
                <input
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={e => setFormStartsAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Actief tot</p>
                <input
                  type="datetime-local"
                  value={formEndsAt}
                  onChange={e => setFormEndsAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Leeg laten = geen tijdslimiet. De melding wordt enkel getoond als &apos;Actief&apos; aan staat.
            </p>
          </div>

          {/* Active toggle in form */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">Melding activeren</p>
              <p className="text-xs text-gray-500">Verschijnt direct voor alle gebruikers</p>
            </div>
            <button
              type="button"
              onClick={() => setFormIsActive(v => !v)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                formIsActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  formIsActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            {saving ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : saved ? (
              'Opgeslagen!'
            ) : (
              <><Save className="w-4 h-4" /> Opslaan</>
            )}
          </button>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Live voorbeeld</p>
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? 'Verbergen' : 'Tonen'}
            </button>
          </div>

          {showPreview && (
            <div className="space-y-4">
              {/* Banner preview */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Zo zien gebruikers de banner:</p>
                <div className={`${bannerTheme.bg} rounded-xl shadow-md overflow-hidden`}>
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${bannerTheme.iconBg} flex items-center justify-center mt-0.5`}>
                      <BannerIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {formTitle && (
                        <p className="font-semibold text-sm text-white leading-snug">{formTitle}</p>
                      )}
                      {formContent && (
                        <div
                          className="text-sm text-white opacity-90 mt-0.5 broadcast-preview-content"
                          dangerouslySetInnerHTML={{ __html: formContent }}
                        />
                      )}
                      {!formTitle && !formContent && (
                        <p className="text-sm text-white opacity-60 italic">Geen inhoud ingevuld...</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs">✕</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status card */}
              <div className={`rounded-xl border p-4 ${typeConfig.preview}`}>
                <div className="flex items-center gap-2 mb-3">
                  <typeConfig.Icon className={`w-4 h-4 ${typeConfig.iconColor}`} />
                  <p className="text-sm font-semibold text-gray-800">Instellingen overzicht</p>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform</span>
                    <span className="font-medium">{selectedPlatform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium">{typeConfig.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold ${formIsActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {formIsActive ? 'Actief' : 'Inactief'}
                    </span>
                  </div>
                  {formStartsAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vanaf</span>
                      <span className="font-medium">{new Date(formStartsAt).toLocaleString('nl-BE')}</span>
                    </div>
                  )}
                  {formEndsAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tot</span>
                      <span className="font-medium">{new Date(formEndsAt).toLocaleString('nl-BE')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .broadcast-preview-content ul { list-style: disc; padding-left: 1.25rem; margin: 0.2rem 0; }
        .broadcast-preview-content ol { list-style: decimal; padding-left: 1.25rem; margin: 0.2rem 0; }
        .broadcast-preview-content li { margin: 0.1rem 0; }
        .broadcast-preview-content a { text-decoration: underline; }
        .broadcast-preview-content strong { font-weight: 600; }
        .broadcast-preview-content em { font-style: italic; }
        .broadcast-preview-content p { margin: 0.1rem 0; }
      `}</style>
    </div>
  );
}
