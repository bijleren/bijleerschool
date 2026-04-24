import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Video, X, ExternalLink } from 'lucide-react';
import type { QASession } from './QASessionsSection';

function isSessionImminent(session: QASession): boolean {
  const now = new Date();
  const start = new Date(`${session.date}T${session.start_time}`);
  const end = new Date(`${session.date}T${session.end_time}`);
  const fiveMinBefore = new Date(start.getTime() - 5 * 60 * 1000);
  return now >= fiveMinBefore && now <= end;
}

function sessionTitle(session: QASession): string {
  if (session.title) return session.title;
  const d = new Date(session.date + 'T00:00:00');
  return `Q&A — ${d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}`;
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

export function QANotificationBubble() {
  const [activeSession, setActiveSession] = useState<QASession | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const checkSessions = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('qa_sessions')
      .select('*')
      .eq('date', today)
      .order('start_time', { ascending: true });

    const imminent = (data || []).find(
      (s: QASession) => isSessionImminent(s) && !dismissedIds.has(s.id)
    );

    setActiveSession(imminent ?? null);
  }, [dismissedIds]);

  useEffect(() => {
    checkSessions();
    const id = setInterval(checkSessions, 60_000);
    return () => clearInterval(id);
  }, [checkSessions]);

  const dismiss = () => {
    if (activeSession) {
      setDismissedIds(prev => new Set([...prev, activeSession.id]));
      setActiveSession(null);
      setExpanded(false);
    }
  };

  if (!activeSession) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Expanded card */}
      {expanded && (
        <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-4 w-64 animate-fade-in">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {sessionTitle(activeSession)}
            </p>
            <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {formatTime(activeSession.start_time)} – {formatTime(activeSession.end_time)}
          </p>
          <a
            href={activeSession.teams_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Deelnemen aan Q&A
          </a>
        </div>
      )}

      {/* Bubble */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="relative w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="Q&A sessie live"
      >
        {/* Ping ring */}
        <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-40" />
        <Video className="w-5 h-5 relative z-10" />
      </button>
    </div>
  );
}
