import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  ArrowLeft, 
  Save, 
  X,
  Calendar,
  Clock,
  MapPin,
  User
} from 'lucide-react';

interface BehaviorIncident {
  id: string;
  school_id: string;
  student_id: string;
  behavior_item_id: string;
  reported_by: string;
  incident_date: string;
  location: string | null;
  description: string;
  action_taken: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
}

interface BehaviorIncidentEditProps {
  incident: BehaviorIncident;
  onIncidentUpdated: () => void;
  onCancel: () => void;
}

export function BehaviorIncidentEdit({ incident, onIncidentUpdated, onCancel }: BehaviorIncidentEditProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [incidentDate, setIncidentDate] = useState(incident.incident_date.slice(0, 16));
  const [location, setLocation] = useState(incident.location || '');
  const [description, setDescription] = useState(incident.description);
  const [actionTaken, setActionTaken] = useState(incident.action_taken || '');
  const [followUpRequired, setFollowUpRequired] = useState(incident.follow_up_required);
  const [followUpDate, setFollowUpDate] = useState(incident.follow_up_date?.slice(0, 10) || '');
  const [followUpNotes, setFollowUpNotes] = useState(incident.follow_up_notes || '');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'resolved'>(incident.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('behavior_incidents')
        .update({
          incident_date: incidentDate,
          location: location || null,
          description,
          action_taken: actionTaken || null,
          follow_up_required: followUpRequired,
          follow_up_date: followUpRequired && followUpDate ? followUpDate : null,
          follow_up_notes: followUpRequired && followUpNotes ? followUpNotes : null,
          status,
        })
        .eq('id', incident.id);

      if (error) throw error;

      setMessage('Incident succesvol bijgewerkt!');
      onIncidentUpdated();
    } catch (error) {
      console.error('Error updating incident:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van het incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar incidenten
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Incident bewerken</h1>
          <p className="text-gray-600">Wijzig de details van het gedragsincident</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('succesvol')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Datum en tijd *"
              type="datetime-local"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              required
            />
            <Input
              label="Locatie"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bijv. Klaslokaal 1A, Speelplaats"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschrijving *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Beschrijf wat er gebeurd is..."
            />
          </div>

          {/* Action Taken */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actie ondernomen
            </label>
            <textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Beschrijf welke actie je hebt ondernomen..."
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="followUpRequired" className="ml-2 block text-sm text-gray-900">
                Follow-up vereist
              </label>
            </div>

            {followUpRequired && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <Input
                  label="Follow-up datum"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up notities
                  </label>
                  <textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Wat moet er gedaan worden?"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'in_progress' | 'resolved')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="pending">Melding</option>
              <option value="in_progress">Onderzoek</option>
              <option value="resolved">Afgerond</option>
            </select>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuleren
            </Button>
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4 mr-2" />
              Wijzigingen opslaan
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}