import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { X, Play, Pause, Mic, StopCircle, AlertCircle, Smile, Meh, Frown, Heart } from 'lucide-react';

interface ReadingSessionModalProps {
  book: {
    id: string;
    title: string;
    author: string;
    cover_image_url: string;
    student_book_id: string;
  };
  studentId: string;
  onClose: () => void;
  onComplete: () => void;
}

const EMOTIONS = [
  { value: 'happy', label: 'Blij', icon: Smile, color: 'text-yellow-500' },
  { value: 'love', label: 'Hou ervan', icon: Heart, color: 'text-red-500' },
  { value: 'neutral', label: 'Neutraal', icon: Meh, color: 'text-gray-500' },
  { value: 'sad', label: 'Verdrietig', icon: Frown, color: 'text-blue-500' }
];

export function ReadingSessionModal({ book, studentId, onClose, onComplete }: ReadingSessionModalProps) {
  const [isTimerMode, setIsTimerMode] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [manualMinutes, setManualMinutes] = useState('');
  const [endPage, setEndPage] = useState('');
  const [emotion, setEmotion] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startTimer = () => {
    setIsTimerRunning(true);
    setSessionStarted(true);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Kon audio opname niet starten. Check je microfoon permissies.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retryRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleComplete = async () => {
    if (!emotion) {
      setError('Selecteer je emotie');
      return;
    }

    if (!endPage || parseInt(endPage) <= 0) {
      setError('Vul de eindpagina in');
      return;
    }

    if (isTimerMode && !sessionStarted) {
      setError('Start eerst de timer');
      return;
    }

    if (!isTimerMode && (!manualMinutes || parseInt(manualMinutes) <= 0)) {
      setError('Vul het aantal minuten in');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const durationMinutes = isTimerMode
        ? Math.floor(timerSeconds / 60)
        : parseInt(manualMinutes);

      let uploadedAudioUrl = null;

      if (audioBlob) {
        const fileName = `${studentId}/${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reading-audio')
          .upload(fileName, audioBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('reading-audio')
          .getPublicUrl(fileName);

        uploadedAudioUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from('reading_sessions')
        .insert({
          student_book_id: book.student_book_id,
          student_id: studentId,
          book_id: book.id,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_minutes: durationMinutes,
          manual_duration: !isTimerMode,
          end_page: parseInt(endPage),
          emotion: emotion,
          audio_url: uploadedAudioUrl
        });

      if (insertError) throw insertError;

      onComplete();
    } catch (err) {
      console.error('Error saving reading session:', err);
      setError('Fout bij opslaan van lees sessie');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Ik lees</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-16 h-24 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-gray-400 text-xs">Geen cover</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{book.title}</h3>
              <p className="text-sm text-gray-600">{book.author}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Hoe wil je de tijd bijhouden?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setIsTimerMode(true)}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  isTimerMode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Play className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="font-medium">Timer</div>
              </button>
              <button
                onClick={() => setIsTimerMode(false)}
                disabled={sessionStarted}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  !isTimerMode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${sessionStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-2xl mx-auto mb-2">⏱️</div>
                <div className="font-medium">Handmatig</div>
              </button>
            </div>
          </div>

          {isTimerMode ? (
            <div className="text-center py-6">
              <div className="text-6xl font-bold text-gray-900 mb-6">
                {formatTime(timerSeconds)}
              </div>
              <div className="flex gap-4 justify-center">
                {!isTimerRunning ? (
                  <Button onClick={startTimer}>
                    <Play className="w-5 h-5 mr-2" />
                    {sessionStarted ? 'Hervatten' : 'Start Timer'}
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} variant="secondary">
                    <Pause className="w-5 h-5 mr-2" />
                    Pauzeren
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hoeveel minuten heb je gelezen?
              </label>
              <input
                type="number"
                min="1"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="Bijvoorbeeld: 15"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bij welke pagina ben je gestopt?
            </label>
            <input
              type="number"
              min="1"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              placeholder="Bijvoorbeeld: 42"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Hoe voelde je je tijdens het lezen?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {EMOTIONS.map((emo) => {
                const Icon = emo.icon;
                return (
                  <button
                    key={emo.value}
                    onClick={() => setEmotion(emo.value)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      emotion === emo.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-2 ${emo.color}`} />
                    <div className="font-medium text-sm">{emo.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Vertel over wat je hebt gelezen (optioneel)
            </label>
            {!audioUrl ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Start Opname
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-600 font-medium">Opname bezig...</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <StopCircle className="w-5 h-5 mr-2" />
                      Stop Opname
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <audio src={audioUrl} controls className="w-full" />
                <button
                  onClick={retryRecording}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Opnieuw opnemen
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuleren
          </Button>
          <Button onClick={handleComplete} disabled={saving} className="flex-1">
            {saving ? 'Bezig met opslaan...' : 'Klaar met lezen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
