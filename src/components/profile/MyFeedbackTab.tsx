import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { MessageSquare, Bug, Lightbulb, HelpCircle, Clock, CheckCircle, AlertCircle, ArrowRight, RotateCcw, ExternalLink } from 'lucide-react';

interface ContactMessage {
  id: string;
  created_at: string;
  type: string;
  subject: string;
  message: string;
  status: string | null;
  notes: string | null;
  replied_at: string | null;
  replied_by: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  'bug': { label: 'Bug melding', icon: Bug, color: 'text-red-600', bg: 'bg-red-100' },
  'app-request': { label: 'App aanvraag', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-100' },
  'support': { label: 'Ondersteuning', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  'pricing': { label: 'Prijs vraag', icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
  'demo': { label: 'Demo aanvraag', icon: ExternalLink, color: 'text-teal-600', bg: 'bg-teal-100' },
  'other': { label: 'Overig', icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-100' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  'new': { label: 'Nieuw', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  'in_progress': { label: 'In behandeling', color: 'text-amber-700', bg: 'bg-amber-100', icon: RotateCcw },
  'resolved': { label: 'Afgehandeld', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
  'replied': { label: 'Beantwoord', color: 'text-teal-700', bg: 'bg-teal-100', icon: MessageSquare },
};

function getStatusConfig(status: string | null) {
  return STATUS_CONFIG[status ?? 'new'] ?? STATUS_CONFIG['new'];
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG['other'];
}

export function MyFeedbackTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('id, created_at, type, subject, message, status, notes, replied_at, replied_by')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data || []);
    } catch {
      // silently fail — empty state handles no data
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <div className="text-center py-14">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Nog geen meldingen</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Je hebt nog geen bugrapporten, ideen of vragen ingediend. Heb je iets te melden?
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Stuur een bericht
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{messages.length} {messages.length === 1 ? 'melding' : 'meldingen'}</p>
        <button
          onClick={() => navigate('/contact')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Nieuw bericht
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {messages.map((msg) => {
        const typeConf = getTypeConfig(msg.type);
        const statusConf = getStatusConfig(msg.status);
        const TypeIcon = typeConf.icon;
        const StatusIcon = statusConf.icon;
        const hasReply = !!msg.notes;

        return (
          <div
            key={msg.id}
            className={`bg-white border rounded-xl p-5 transition-shadow hover:shadow-sm ${
              hasReply && msg.status !== 'resolved' ? 'border-teal-200 ring-1 ring-teal-100' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 ${typeConf.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <TypeIcon className={`w-5 h-5 ${typeConf.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeConf.bg} ${typeConf.color} mb-1.5`}>
                      {typeConf.label}
                    </span>
                    <h4 className="font-semibold text-gray-900 text-sm leading-snug">{msg.subject}</h4>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusConf.bg} ${statusConf.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConf.label}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 whitespace-pre-wrap">
                  {msg.message}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  Ingediend op {new Date(msg.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>

                {hasReply && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700">Reactie van het team</span>
                      {msg.replied_at && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(msg.replied_at).toLocaleDateString('nl-NL', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 bg-teal-50 border border-teal-100 rounded-lg px-4 py-3 whitespace-pre-wrap">
                      {msg.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
