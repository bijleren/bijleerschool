import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { MessageSquare, Bug, Lightbulb, HelpCircle, Clock, CheckCircle, RotateCcw, ArrowRight, AlertCircle } from 'lucide-react';

interface BugReport {
  id: string;
  created_at: string;
  type: string;
  title: string;
  description: string;
  status: string | null;
  notes: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  'bug': { label: 'Bug melding', icon: Bug, color: 'text-red-600', bg: 'bg-red-100' },
  'suggestie': { label: 'Idee / feedback', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-100' },
  'vraag': { label: 'Vraag', icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
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
  return TYPE_CONFIG[type] ?? { label: type, icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-100' };
}

export function MyFeedbackTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchReports();
  }, [user]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('id, created_at, type, title, description, status, notes')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch {
      // empty state handles no data
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

  if (reports.length === 0) {
    return (
      <Card>
        <div className="text-center py-14">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Nog geen meldingen</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Je hebt nog geen feedback, bugs of vragen ingediend via de "Geef feedback" knop in de header.
          </p>
          <p className="text-xs text-gray-400">
            Klik op je profielicoontje rechtsboven en kies "Geef feedback".
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{reports.length} {reports.length === 1 ? 'melding' : 'meldingen'}</p>

      {reports.map((report) => {
        const typeConf = getTypeConfig(report.type);
        const statusConf = getStatusConfig(report.status);
        const TypeIcon = typeConf.icon;
        const StatusIcon = statusConf.icon;
        const hasReply = !!report.notes;

        return (
          <div
            key={report.id}
            className={`bg-white border rounded-xl p-5 transition-shadow hover:shadow-sm ${
              hasReply ? 'border-teal-200 ring-1 ring-teal-100' : 'border-gray-200'
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
                    <h4 className="font-semibold text-gray-900 text-sm leading-snug">{report.title}</h4>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusConf.bg} ${statusConf.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConf.label}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 whitespace-pre-wrap">
                  {report.description}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  Ingediend op {new Date(report.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>

                {hasReply && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700">Reactie van het team</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-teal-50 border border-teal-100 rounded-lg px-4 py-3 whitespace-pre-wrap">
                      {report.notes}
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
