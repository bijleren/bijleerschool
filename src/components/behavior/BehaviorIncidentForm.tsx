import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  Calendar,
  Clock,
  MapPin,
  User,
  AlertTriangle
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
}

interface BehaviorCategory {
  id: string;
  name: string;
  color: string;
}

interface BehaviorSeverityLevel {
  id: string;
  name: string;
  level: number;
  color: string;
}

interface BehaviorItem {
  id: string;
  name: string;
  description: string | null;
  behavior_categories: BehaviorCategory;
  behavior_severity_levels: BehaviorSeverityLevel;
}

interface Consequence {
  id: string;
  name: string;
  description: string | null;
  severity_level: number | null;
}

interface BehaviorIncidentFormProps {
  schoolId: string;
  onIncidentCreated: () => void;
  onCancel: () => void;
}

export function BehaviorIncidentForm({ schoolId, onIncidentCreated, onCancel }: BehaviorIncidentFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviorItems, setBehaviorItems] = useState<BehaviorItem[]>([]);
  const [consequences, setConsequences] = useState<Consequence[]>([]);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [behaviorItemId, setBehaviorItemId] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followupActionId, setFollowupActionId] = useState('');
  const [followupActionOther, setFollowupActionOther] = useState('');
  const [customBehaviorName, setCustomBehaviorName] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchBehaviorItems();
    fetchConsequences();
    
    // Check for preselected student
    const preselectedStudentId = sessionStorage.getItem('preselectedStudentId');
    if (preselectedStudentId) {
      setStudentId(preselectedStudentId);
      sessionStorage.removeItem('preselectedStudentId');
    }

    // Check for preload data from schoolday
    const preloadData = sessionStorage.getItem('behaviorPreloadData');
    if (preloadData) {
      try {
        const data = JSON.parse(preloadData);
        if (data.studentId) setStudentId(data.studentId);
        if (data.location) setLocation(data.location);
        if (data.time) {
          const today = new Date().toISOString().split('T')[0];
          setIncidentDate(`${today}T${data.time}`);
        }
        sessionStorage.removeItem('behaviorPreloadData');
      } catch (error) {
        console.error('Error parsing preload data:', error);
        sessionStorage.removeItem('behaviorPreloadData');
      }
    }
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchBehaviorItems = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_items')
        .select(`
          *,
          behavior_categories (*),
          behavior_severity_levels (*)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBehaviorItems(data || []);
    } catch (error) {
      console.error('Error fetching behavior items:', error);
    }
  };

  const fetchConsequences = async () => {
    try {
      const { data, error } = await supabase
        .from('consequences')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setConsequences(data || []);
    } catch (error) {
      console.error('Error fetching consequences:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      if (!studentId || !description) {
        setMessage('Vul alle verplichte velden in.');
        setLoading(false);
        return;
      }

      // Handle behavior item - if "other" is selected, use null
      const finalBehaviorItemId = behaviorItemId === 'other' ? null : behaviorItemId;
      
      // Handle follow-up action - if "other" is selected, use null for ID
      const finalFollowupActionId = followupActionId === 'other' ? null : (followupActionId || null);

      const { error } = await supabase
        .from('behavior_incidents')
        .insert({
          school_id: schoolId,
          student_id: studentId,
          behavior_item_id: finalBehaviorItemId,
          reported_by: user.id,
          incident_date: incidentDate,
          location: location || null,
          description,
          action_taken: actionTaken || null,
          follow_up_required: followUpRequired,
          follow_up_date: followUpRequired && followUpDate ? followUpDate : null,
          follow_up_notes: followUpRequired && followUpNotes ? followUpNotes : null,
          followup_action_id: finalFollowupActionId,
          followup_action_other: followupActionId === 'other' ? followupActionOther : null,
          status: 'pending',
        });

      if (error) throw error;

      setMessage('Incident succesvol gemeld!');
      onIncidentCreated();
    } catch (error) {
      console.error('Error creating incident:', error);
      setMessage('Er is een fout opgetreden bij het melden van het incident.');
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
          <h1 className="text-2xl font-bold text-gray-900">Incident melden</h1>
          <p className="text-gray-600">Meld een nieuw gedragsincident</p>
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
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student *
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecteer student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                  {student.student_number && ` (#${student.student_number})`}
                  {student.grade_level && ` - ${student.grade_level}`}
                </option>
              ))}
            </select>
          </div>

          {/* Behavior Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gedragsitem *
            </label>
            <select
              value={behaviorItemId}
              onChange={(e) => setBehaviorItemId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecteer gedragsitem</option>
              {behaviorItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.behavior_categories.name} - Niveau {item.behavior_severity_levels.level})
                </option>
              ))}
              <option value="other">Andere...</option>
            </select>
          </div>

          {/* Custom Behavior Name (when "other" is selected) */}
          {behaviorItemId === 'other' && (
            <Input
              label="Beschrijf het gedrag"
              value={customBehaviorName}
              onChange={(e) => setCustomBehaviorName(e.target.value)}
              required
              placeholder="Beschrijf het specifieke gedrag..."
            />
          )}

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
              <div className="space-y-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up actie
                  </label>
                  <select
                    value={followupActionId}
                    onChange={(e) => setFollowupActionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Geen follow-up actie</option>
                    {consequences.map((consequence) => (
                      <option key={consequence.id} value={consequence.id}>
                        {consequence.name}
                      </option>
                    ))}
                    <option value="other">Andere...</option>
                  </select>
                </div>

                {followupActionId === 'other' && (
                  <Input
                    label="Andere follow-up actie"
                    value={followupActionOther}
                    onChange={(e) => setFollowupActionOther(e.target.value)}
                    placeholder="Beschrijf de follow-up actie..."
                  />
                )}

                <Input
                  label="Follow-up datum"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up notities
                  </label>
                  <textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Wat moet er gedaan worden?"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuleren
            </Button>
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4 mr-2" />
              Incident melden
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}