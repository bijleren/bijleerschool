import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Smile, Frown, Meh, Angry, Laugh } from 'lucide-react';

interface ActivitySession {
  id: string;
  activity_option_id: string;
  students: {
    first_name: string;
    last_name: string;
    color: string | null;
  };
}

interface ActivityOption {
  id: string;
  name: string;
  color: string;
}

interface FeedbackModalProps {
  session: ActivitySession;
  options: ActivityOption[];
  onClose: () => void;
  onSubmit: (
    sessionId: string,
    rating: number | null,
    notes: string | null,
    switchToActivity: string | null
  ) => void;
  mode?: 'teacher' | 'student';
  prefilledSwitchTo?: string | null;
}

export function FeedbackModal({
  session,
  options,
  onClose,
  onSubmit,
  mode = 'teacher',
  prefilledSwitchTo = null
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [switchTo, setSwitchTo] = useState<string | null>(prefilledSwitchTo);
  const [submitting, setSubmitting] = useState(false);

  const ratingOptions = [
    { value: 1, icon: Angry, label: 'Heel vervelend', color: 'text-red-500' },
    { value: 2, icon: Frown, label: 'Niet leuk', color: 'text-orange-500' },
    { value: 3, icon: Meh, label: 'Neutraal', color: 'text-yellow-500' },
    { value: 4, icon: Smile, label: 'Leuk', color: 'text-green-500' },
    { value: 5, icon: Laugh, label: 'Heel leuk', color: 'text-emerald-500' }
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(session.id, rating, notes || null, switchTo);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingClick = async (value: number) => {
    setRating(value);
    if (mode === 'student') {
      setSubmitting(true);
      try {
        await onSubmit(session.id, value, null, null);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const otherOptions = options.filter(o => o.id !== session.activity_option_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activiteit afsluiten</h2>
            <p className="text-gray-600 mt-1">
              {session.students.first_name} {session.students.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Hoe vond je de activiteit?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ratingOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleRatingClick(option.value)}
                    disabled={submitting}
                    className={`flex flex-col items-center p-3 border-2 rounded-lg transition-all ${
                      rating === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon
                      className={`w-8 h-8 ${
                        rating === option.value ? option.color : 'text-gray-400'
                      }`}
                    />
                    <span className="text-xs mt-1 text-gray-600 text-center">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'teacher' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notities (optioneel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Voeg notities toe over de activiteit..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {mode === 'teacher' && otherOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overschakelen naar andere activiteit?
              </label>
              <select
                value={switchTo || ''}
                onChange={(e) => setSwitchTo(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Nee, alleen afsluiten</option>
                {otherOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Opslaan...' : switchTo ? 'Afsluiten & Overschakelen' : 'Afsluiten'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
