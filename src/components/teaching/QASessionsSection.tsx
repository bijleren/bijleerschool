import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, ExternalLink, Calendar, Clock, Video, X } from 'lucide-react';

export interface QASession {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teams_link: string;
  title: string | null;
  created_at: string;
}

interface Props {
  isAdmin: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function sessionTitle(session: QASession): string {
  if (session.title) return session.title;
  const d = new Date(session.date + 'T00:00:00');
  return `Q&A — ${d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function isLinkActive(session: QASession): boolean {
  const now = new Date();
  const start = new Date(`${session.date}T${session.start_time}`);
  const end = new Date(`${session.date}T${session.end_time}`);
  const fiveMinBefore = new Date(start.getTime() - 5 * 60 * 1000);
  return now >= fiveMinBefore && now <= end;
}

function minutesUntilActive(session: QASession): number {
  const now = new Date();
  const start = new Date(`${session.date}T${session.start_time}`);
  const fiveMinBefore = new Date(start.getTime() - 5 * 60 * 1000);
  return Math.ceil((fiveMinBefore.getTime() - now.getTime()) / 60000);
}

function toICSTime(date: string, time: string): string {
  // date: YYYY-MM-DD, time: HH:MM or HH:MM:SS
  const datePart = date.replace(/-/g, '');
  const parts = time.split(':');
  const hh = parts[0].padStart(2, '0');
  const mm = (parts[1] ?? '00').padStart(2, '0');
  const ss = (parts[2] ?? '00').padStart(2, '0').slice(0, 2);
  return `${datePart}T${hh}${mm}${ss}`;
}

function generateICS(session: QASession): string {
  const start = toICSTime(session.date, session.start_time);
  const end = toICSTime(session.date, session.end_time);
  // DTSTAMP must be UTC: YYYYMMDDTHHmmssZ
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15) + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//bijleer.school//QA//NL',
    'BEGIN:VEVENT',
    `UID:${session.id}@bijleer.school`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'SUMMARY:bijleer.school Q&A',
    `DESCRIPTION:Teams-link: ${session.teams_link}`,
    `URL:${session.teams_link}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(session: QASession) {
  const content = generateICS(session);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sessionTitle(session).replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const EMPTY_FORM = { date: '', start_time: '', end_time: '', teams_link: '', title: '' };

export function QASessionsSection({ isAdmin }: Props) {
  const [sessions, setSessions] = useState<QASession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Re-check link-active state every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchSessions = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('qa_sessions')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    // Filter out sessions that have already ended today
    const now = new Date();
    const upcoming = (data || []).filter((s: QASession) => {
      const end = new Date(`${s.date}T${s.end_time}`);
      return end > now;
    });

    setSessions(upcoming);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleSave = async () => {
    if (!form.date || !form.start_time || !form.end_time || !form.teams_link) {
      setError('Vul alle verplichte velden in.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase.from('qa_sessions').insert({
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      teams_link: form.teams_link,
      title: form.title.trim() || null,
    });
    setSaving(false);
    if (dbErr) { setError('Opslaan mislukt. Probeer opnieuw.'); return; }
    setShowModal(false);
    setForm(EMPTY_FORM);
    fetchSessions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('qa_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  if (loading) return null;

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Aankomende Q&A sessies</h2>
          {sessions.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {sessions.length}
            </span>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowModal(true); setError(null); setForm(EMPTY_FORM); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Sessie toevoegen
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-5 py-8 text-center">
          <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Geen geplande Q&A sessies</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.map(session => {
            const active = isLinkActive(session);
            const minsUntil = minutesUntilActive(session);
            const soon = !active && minsUntil <= 60 && minsUntil > 0;

            return (
              <div
                key={session.id}
                className={`relative bg-white rounded-xl border p-4 shadow-sm transition-all ${
                  active ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-100'
                }`}
              >
                {/* Active pulse indicator */}
                {active && (
                  <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                )}

                {/* Admin delete */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors"
                    title="Verwijder sessie"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <p className="font-semibold text-gray-900 text-sm mb-2 pr-6">
                  {sessionTitle(session)}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formatDate(session.date)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{formatTime(session.start_time)} – {formatTime(session.end_time)}</span>
                  {soon && (
                    <span className="ml-1 text-amber-600 font-medium">
                      (over {minsUntil} min)
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <a
                    href={active ? session.teams_link : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => { if (!active) e.preventDefault(); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={active ? 'Deelnemen aan Q&A' : 'Link wordt 5 minuten voor de sessie actief'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {active ? 'Deelnemen' : 'Nog niet actief'}
                  </a>
                  <button
                    onClick={() => downloadICS(session)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors"
                    title="Toevoegen aan agenda"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Agenda
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add session modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Q&A sessie toevoegen</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starttijd <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eindtijd <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teams-link <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  placeholder="https://teams.microsoft.com/..."
                  value={form.teams_link}
                  onChange={e => setForm(f => ({ ...f, teams_link: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel <span className="text-gray-400 font-normal">(optioneel)</span>
                </label>
                <input
                  type="text"
                  placeholder="Automatisch gegenereerd als leeg"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
