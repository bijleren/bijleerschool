import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, Info, X, Megaphone } from 'lucide-react';

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

const CURRENT_PLATFORM = 'bijleer.school';
const DISMISS_KEY = 'emergency_broadcast_dismissed';

function getDismissedMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
  } catch {
    return {};
  }
}

function isDismissed(broadcast: Broadcast): boolean {
  const map = getDismissedMap();
  return map[broadcast.id] === broadcast.updated_at;
}

function markDismissed(broadcast: Broadcast) {
  const map = getDismissedMap();
  map[broadcast.id] = broadcast.updated_at;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
}

function isScheduleActive(broadcast: Broadcast): boolean {
  const now = new Date();
  if (broadcast.starts_at && new Date(broadcast.starts_at) > now) return false;
  if (broadcast.ends_at && new Date(broadcast.ends_at) < now) return false;
  return true;
}

const themes = {
  info: {
    bg: 'bg-blue-600',
    border: 'border-blue-700',
    text: 'text-white',
    iconBg: 'bg-blue-500',
    closeBg: 'hover:bg-blue-500',
    Icon: Info,
  },
  warning: {
    bg: 'bg-amber-500',
    border: 'border-amber-600',
    text: 'text-white',
    iconBg: 'bg-amber-400',
    closeBg: 'hover:bg-amber-400',
    Icon: AlertTriangle,
  },
  danger: {
    bg: 'bg-red-600',
    border: 'border-red-700',
    text: 'text-white',
    iconBg: 'bg-red-500',
    closeBg: 'hover:bg-red-500',
    Icon: Megaphone,
  },
};

export function EmergencyBroadcastBanner() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [visible, setVisible] = useState(false);

  const evaluate = useCallback((b: Broadcast | null) => {
    if (!b) { setVisible(false); setBroadcast(null); return; }
    if (!b.is_active) { setVisible(false); setBroadcast(null); return; }
    if (!b.title && !b.content) { setVisible(false); setBroadcast(null); return; }
    if (!isScheduleActive(b)) { setVisible(false); setBroadcast(null); return; }
    if (isDismissed(b)) { setVisible(false); setBroadcast(null); return; }
    setBroadcast(b);
    setVisible(true);
  }, []);

  const fetchBroadcast = useCallback(async () => {
    const { data } = await supabase
      .from('emergency_broadcasts')
      .select('*')
      .in('platform', [CURRENT_PLATFORM, 'all'])
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    evaluate(data as Broadcast | null);
  }, [evaluate]);

  useEffect(() => {
    fetchBroadcast();

    // Re-check every minute for schedule boundaries
    const interval = setInterval(fetchBroadcast, 60_000);

    const channel = supabase
      .channel('emergency_broadcasts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_broadcasts' },
        () => { fetchBroadcast(); }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchBroadcast]);

  const handleDismiss = () => {
    if (broadcast) markDismissed(broadcast);
    setVisible(false);
    setBroadcast(null);
  };

  if (!visible || !broadcast) return null;

  const theme = themes[broadcast.type] ?? themes.info;
  const { Icon } = theme;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] ${theme.bg} ${theme.border} border-b shadow-lg`}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${theme.iconBg} flex items-center justify-center mt-0.5`}>
          <Icon className={`w-4 h-4 ${theme.text}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {broadcast.title && (
            <p className={`font-semibold text-sm ${theme.text} leading-snug`}>
              {broadcast.title}
            </p>
          )}
          {broadcast.content && (
            <div
              className={`text-sm ${theme.text} opacity-90 mt-0.5 broadcast-content`}
              dangerouslySetInnerHTML={{ __html: broadcast.content }}
            />
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 w-7 h-7 rounded-full ${theme.closeBg} flex items-center justify-center transition-colors mt-0.5`}
          aria-label="Melding sluiten"
        >
          <X className={`w-4 h-4 ${theme.text}`} />
        </button>
      </div>

      <style>{`
        .broadcast-content ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .broadcast-content ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .broadcast-content li { margin: 0.1rem 0; }
        .broadcast-content a { text-decoration: underline; opacity: 0.9; }
        .broadcast-content strong { font-weight: 600; }
        .broadcast-content em { font-style: italic; }
        .broadcast-content p { margin: 0.15rem 0; }
      `}</style>
    </div>
  );
}
