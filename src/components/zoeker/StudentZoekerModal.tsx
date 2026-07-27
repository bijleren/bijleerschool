import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Search, HelpCircle, CheckCircle, AlertTriangle, Info, History, Trash2, Youtube, Globe, Image as ImageIcon, Tv, BookOpen, Users, MessageCircle } from 'lucide-react';

interface SearchRequest {
  id: string;
  query: string;
  target: string;
  status: string;
  teacher_feedback: string | null;
  modified_query: string | null;
  student_opened: boolean;
  feedback_data: any[];
  created_at: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  target: string;
  mode: string;
  created_at: string;
}

interface Feedback {
  type: 'success' | 'warning' | 'info';
  code: string;
  message: string;
}

interface StudentZoekerModalProps {
  studentId: string;
  schoolId: string;
  studentName: string;
  onClose: () => void;
}

const TARGETS = {
  youtube: { label: 'YouTube', icon: Youtube, color: '#FF0000' },
  google: { label: 'Google', icon: Globe, color: '#4285F4' },
  images: { label: 'Afbeeldingen', icon: ImageIcon, color: '#34A853' },
  schooltv: { label: 'SchoolTV', icon: Tv, color: '#FF6B00' },
  wikipedia: { label: 'Wikipedia', icon: BookOpen, color: '#636363' },
  wikikids: { label: 'WikiKids', icon: Users, color: '#8BC34A' },
  prompt: { label: 'Antwoord', icon: MessageCircle, color: '#3498DB' }
};

const TEMPLATES = [
  { label: 'Wie is...', template: 'Wie is ' },
  { label: 'Wat is...', template: 'Wat is ' },
  { label: 'Hoe werkt...', template: 'Hoe werkt ' },
  { label: 'Waarom...', template: 'Waarom ' },
  { label: 'Wanneer...', template: 'Wanneer ' },
  { label: 'Waar ligt...', template: 'Waar ligt ' },
  { label: 'Hoeveel...', template: 'Hoeveel ' },
  { label: 'Verschil tussen', template: 'Verschil tussen ' }
];

const QUESTION_WORDS = ['wie', 'wat', 'waar', 'wanneer', 'waarom', 'hoe', 'welke', 'hoeveel'];
const VAGUE_TERMS = ['ding', 'iets', 'dinges', 'dat', 'het', 'dit'];

export function StudentZoekerModal({ studentId, schoolId, studentName, onClose }: StudentZoekerModalProps) {
  const [query, setQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<SearchRequest[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<SearchRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
    fetchHistory();
    fetchRejectedRequests();

    const interval = setInterval(() => {
      fetchPendingRequests();
    }, 10000);

    return () => clearInterval(interval);
  }, [studentId]);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('zoeker_search_requests')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['approved', 'needs_improvement', 'answered'])
        .eq('student_opened', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('zoeker_search_history')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchRejectedRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('zoeker_search_requests')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRejectedRequests(data || []);
    } catch (error) {
      console.error('Error fetching rejected requests:', error);
    }
  };

  const analyzeQuery = (searchQuery: string): Feedback[] => {
    const feedbackList: Feedback[] = [];
    const trimmed = searchQuery.trim();

    if (!trimmed) return [];

    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const lower = trimmed.toLowerCase();

    if (words.length <= 1) {
      feedbackList.push({ type: 'warning', code: 'WORD_COUNT_LOW', message: `Slechts ${words.length} woord — probeer specifieker te zijn.` });
    } else if (words.length >= 10) {
      feedbackList.push({ type: 'info', code: 'WORD_COUNT_HIGH', message: `${words.length} woorden is veel. Kun je het korter maken?` });
    } else if (words.length >= 4) {
      feedbackList.push({ type: 'success', code: 'WORD_COUNT_GREAT', message: `Uitstekend! ${words.length} specifieke woorden.` });
    } else if (words.length >= 3) {
      feedbackList.push({ type: 'success', code: 'WORD_COUNT_GOOD', message: `Goed! ${words.length} woorden is specifiek.` });
    }

    const foundQuestion = QUESTION_WORDS.find(w => lower.startsWith(w) || lower.includes(' ' + w));
    if (foundQuestion) {
      feedbackList.push({ type: 'success', code: 'HAS_QUESTION', message: `Top! Je gebruikt "${foundQuestion}" — dat helpt.` });
    } else {
      feedbackList.push({ type: 'info', code: 'NO_QUESTION', message: 'Tip: Begin met een vraagwoord (wie, wat, waar...).' });
    }

    const foundVague = VAGUE_TERMS.find(t => lower.includes(t));
    if (foundVague) {
      feedbackList.push({ type: 'warning', code: 'VAGUE', message: `"${foundVague}" is vaag. Wat bedoel je precies?` });
    }

    if (words.slice(1).some(w => w.length > 1 && w[0] === w[0].toUpperCase() && /[a-zA-Z]/.test(w[0]))) {
      feedbackList.push({ type: 'success', code: 'PROPER_NOUN', message: 'Goed dat je hoofdletters gebruikt voor namen!' });
    }

    if (trimmed.includes('"')) {
      feedbackList.push({ type: 'success', code: 'QUOTES', message: 'Slim! Aanhalingstekens zoeken naar exacte zinnen.' });
    }

    if (/\b(19|20)\d{2}\b/.test(trimmed)) {
      feedbackList.push({ type: 'success', code: 'YEAR', message: 'Een jaartal toevoegen helpt!' });
    }

    return feedbackList;
  };

  useEffect(() => {
    if (query.trim().length >= 2) {
      setFeedback(analyzeQuery(query));
    } else {
      setFeedback([]);
    }
  }, [query]);

  const handleSearchNow = async () => {
    if (!query.trim() || !selectedTarget) return;

    const targetUrls: { [key: string]: string } = {
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      images: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`,
      schooltv: `https://schooltv.nl/zoeken?query=${encodeURIComponent(query)}`,
      wikipedia: `https://nl.wikipedia.org/wiki/Speciaal:Zoeken?search=${encodeURIComponent(query)}`,
      wikikids: `https://wikikids.nl/Speciaal:Zoeken?search=${encodeURIComponent(query)}`
    };

    try {
      await supabase.from('zoeker_search_history').insert({
        student_id: studentId,
        school_id: schoolId,
        query: query.trim(),
        target: selectedTarget,
        mode: 'free',
        feedback_data: feedback
      });

      if (selectedTarget !== 'prompt' && targetUrls[selectedTarget]) {
        window.open(targetUrls[selectedTarget], '_blank');
      }

      setQuery('');
      setSelectedTarget(null);
      setFeedback([]);
      fetchHistory();
    } catch (error) {
      console.error('Error logging search:', error);
    }
  };

  const handleSendToTeacher = async () => {
    if (!query.trim() || !selectedTarget) return;

    try {
      const existingPending = await supabase
        .from('zoeker_search_requests')
        .select('id')
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingPending.data) {
        const confirmed = window.confirm('Je hebt al een zoekopdracht in de wachtrij. Wil je deze vervangen?');
        if (!confirmed) return;

        await supabase
          .from('zoeker_search_requests')
          .delete()
          .eq('id', existingPending.data.id);
      }

      const { error } = await supabase.from('zoeker_search_requests').insert({
        student_id: studentId,
        school_id: schoolId,
        query: query.trim(),
        target: selectedTarget,
        status: 'pending',
        feedback_data: feedback
      });

      if (error) throw error;

      setQuery('');
      setSelectedTarget(null);
      setFeedback([]);
      alert('Verstuurd naar leerkracht!');
    } catch (error) {
      console.error('Error sending to teacher:', error);
      alert('Er ging iets mis. Probeer het opnieuw.');
    }
  };

  const handleDismissFeedback = async (requestId: string) => {
    try {
      const request = pendingRequests.find(r => r.id === requestId);
      if (request && request.status === 'approved' && request.target === 'prompt') {
        await supabase.from('zoeker_search_history').insert({
          student_id: studentId,
          school_id: schoolId,
          query: request.modified_query || request.query,
          target: 'prompt',
          mode: 'prompt',
          feedback_data: request.feedback_data
        });
      }

      await supabase
        .from('zoeker_search_requests')
        .update({ student_opened: true })
        .eq('id', requestId);

      fetchPendingRequests();
      fetchHistory();
    } catch (error) {
      console.error('Error dismissing feedback:', error);
    }
  };

  const handleOpenApproved = async (requestId: string) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;

    const targetUrls: { [key: string]: string } = {
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(request.modified_query || request.query)}`,
      google: `https://www.google.com/search?q=${encodeURIComponent(request.modified_query || request.query)}`,
      images: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(request.modified_query || request.query)}`,
      schooltv: `https://schooltv.nl/zoeken?query=${encodeURIComponent(request.modified_query || request.query)}`,
      wikipedia: `https://nl.wikipedia.org/wiki/Speciaal:Zoeken?search=${encodeURIComponent(request.modified_query || request.query)}`,
      wikikids: `https://wikikids.nl/Speciaal:Zoeken?search=${encodeURIComponent(request.modified_query || request.query)}`
    };

    try {
      await supabase.from('zoeker_search_history').insert({
        student_id: studentId,
        school_id: schoolId,
        query: request.modified_query || request.query,
        target: request.target,
        mode: 'controlled',
        feedback_data: request.feedback_data
      });

      await supabase
        .from('zoeker_search_requests')
        .update({ student_opened: true })
        .eq('id', requestId);

      if (targetUrls[request.target]) {
        window.open(targetUrls[request.target], '_blank');
      }

      fetchPendingRequests();
      fetchHistory();
    } catch (error) {
      console.error('Error opening approved search:', error);
    }
  };

  const handleRetry = async (requestId: string) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;

    setQuery(request.query);
    setSelectedTarget(request.target);

    await supabase
      .from('zoeker_search_requests')
      .update({ student_opened: true })
      .eq('id', requestId);

    fetchPendingRequests();
  };

  const handleReSearch = async (historyItem: SearchHistoryItem) => {
    const targetUrls: { [key: string]: string } = {
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(historyItem.query)}`,
      google: `https://www.google.com/search?q=${encodeURIComponent(historyItem.query)}`,
      images: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(historyItem.query)}`,
      schooltv: `https://schooltv.nl/zoeken?query=${encodeURIComponent(historyItem.query)}`,
      wikipedia: `https://nl.wikipedia.org/wiki/Speciaal:Zoeken?search=${encodeURIComponent(historyItem.query)}`,
      wikikids: `https://wikikids.nl/Speciaal:Zoeken?search=${encodeURIComponent(historyItem.query)}`
    };

    if (targetUrls[historyItem.target]) {
      window.open(targetUrls[historyItem.target], '_blank');
    }
  };

  const FeedbackIcon = ({ type }: { type: string }) => {
    if (type === 'success') return <CheckCircle className="w-4 h-4" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  const isPrompt = selectedTarget === 'prompt';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Zoeker</h2>
            <p className="text-sm text-gray-600">Slim zoeken op het internet</p>
          </div>
          <Button onClick={onClose} variant="secondary" className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Sluiten
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Typ je zoekopdracht..."
                  className="w-full px-4 py-3 pr-10 rounded-full border-2 border-transparent focus:border-blue-500 bg-white shadow-md outline-none text-lg"
                  autoFocus
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`w-11 h-11 rounded-full border-2 border-blue-500 ${showTemplates ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors`}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {showTemplates && (
              <Card className="p-4 animate-in slide-in-from-top">
                <p className="text-sm text-gray-600 mb-2">Probeer een zoekstructuur:</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.label}
                      onClick={() => {
                        setQuery(template.template);
                        setShowTemplates(false);
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Target Selection */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Waar wil je zoeken?</p>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {Object.entries(TARGETS).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTarget(key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    selectedTarget === key
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                      : 'border-transparent bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            {!isPrompt && (
              <Button
                onClick={handleSearchNow}
                disabled={!query.trim() || !selectedTarget}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Search className="w-4 h-4" />
                Ga meteen
              </Button>
            )}
            <Button
              onClick={handleSendToTeacher}
              disabled={!query.trim() || !selectedTarget}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
            >
              <MessageCircle className="w-4 h-4" />
              {isPrompt ? 'Verstuur antwoord' : 'Controleer'}
            </Button>
          </div>

          {/* Feedback Panel */}
          {feedback.length > 0 && (
            <Card className="p-4 bg-white">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-orange-500" />
                Tips voor je zoekopdracht
              </h3>
              <div className="space-y-2">
                {feedback.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                      item.type === 'success' ? 'bg-green-50 text-green-700' :
                      item.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-blue-50 text-blue-700'
                    }`}
                  >
                    <FeedbackIcon type={item.type} />
                    <span>{item.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pending Teacher Feedback */}
          {pendingRequests.length > 0 && (
            <Card className="p-4 bg-white border-l-4 border-blue-500">
              <h3 className="font-bold text-gray-900 mb-3">Feedback van je leerkracht</h3>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-3 rounded-lg ${
                      request.status === 'approved' ? 'bg-green-50 border border-green-200' :
                      request.status === 'needs_improvement' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <p className="font-semibold mb-1">"{request.modified_query || request.query}"</p>
                    <p className="text-sm text-gray-600 mb-2">
                      {request.status === 'approved' ? '✅ Goedgekeurd' :
                       request.status === 'needs_improvement' ? '✏️ Moet verbeterd worden' :
                       '💬 Beantwoord'}
                    </p>
                    {request.teacher_feedback && (
                      <p className="text-sm bg-white p-2 rounded mb-2">{request.teacher_feedback}</p>
                    )}
                    <div className="flex gap-2">
                      {request.status === 'approved' && (
                        isPrompt ? (
                          <Button size="sm" onClick={() => handleDismissFeedback(request.id)}>
                            OK
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleOpenApproved(request.id)}>
                            Zoeken op {TARGETS[request.target as keyof typeof TARGETS]?.label}
                          </Button>
                        )
                      )}
                      {request.status === 'needs_improvement' && (
                        <Button size="sm" variant="secondary" onClick={() => handleRetry(request.id)}>
                          Opnieuw proberen
                        </Button>
                      )}
                      {request.status === 'answered' && (
                        <Button size="sm" onClick={() => handleDismissFeedback(request.id)}>
                          Begrepen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* History Section */}
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="font-semibold">Je zoekgeschiedenis</span>
              {history.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">{history.length}</span>
              )}
            </button>
            {showHistory && (
              <Card className="mt-2 p-4">
                {history.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm italic py-4">Nog geen zoekopdrachten</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{item.query}</p>
                          <p className="text-xs text-gray-500">{TARGETS[item.target as keyof typeof TARGETS]?.label}</p>
                        </div>
                        {item.target !== 'prompt' && (
                          <button
                            onClick={() => handleReSearch(item)}
                            className="ml-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex-shrink-0"
                          >
                            <Search className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Trash Section */}
          {rejectedRequests.length > 0 && (
            <div>
              <button
                onClick={() => setShowTrash(!showTrash)}
                className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-semibold">Afgekeurd</span>
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{rejectedRequests.length}</span>
              </button>
              {showTrash && (
                <Card className="mt-2 p-4">
                  <div className="space-y-2">
                    {rejectedRequests.map((request) => (
                      <div key={request.id} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                        <p className="font-semibold text-sm">{request.query}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          💬 {request.teacher_feedback || 'Afgekeurd door leerkracht'}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
