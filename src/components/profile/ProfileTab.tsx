import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { User, Mail, Calendar, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  created_at: string;
}

export function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFirstName(data.first_name);
      setLastName(data.last_name);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, first_name: firstName, last_name: lastName });
      setMessage('Profiel succesvol bijgewerkt!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van je profiel.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setMessage('Account verwijdering is momenteel niet beschikbaar vanwege beveiligingsredenen. Neem contact op met de beheerder voor hulp.');
    setDeleting(false);
    setShowDeleteConfirm(false);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Profiel niet gevonden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mijn Profiel</h1>
        <p className="text-gray-600">Beheer je persoonlijke informatie</p>
      </div>

      <div className="space-y-6">
        {/* Profile Overview */}
        <Card>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Mail className="w-4 h-4 mr-1" />
                {profile.email}
              </div>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Calendar className="w-4 h-4 mr-1" />
                Lid sinds {new Date(profile.created_at).toLocaleDateString('nl-NL')}
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Profile */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profiel bewerken</h3>
          
          <form onSubmit={updateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Voornaam"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Achternaam"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <Input
              label="E-mailadres"
              value={profile.email}
              disabled
              helperText="E-mailadres kan niet worden gewijzigd"
            />

            {message && (
              <div className={`p-3 rounded-lg ${
                message.includes('succesvol') 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Profiel bijwerken
              </Button>
            </div>
          </form>
        </Card>

        {/* Account Deletion Accordion */}
        <Card>
          <button
            onClick={() => setShowDeleteSection(!showDeleteSection)}
            className="w-full flex items-center justify-between p-0 bg-transparent border-none text-left focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-lg"
          >
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-red-900">Account verwijderen</h3>
            </div>
            {showDeleteSection ? (
              <ChevronUp className="w-5 h-5 text-red-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-red-600" />
            )}
          </button>
          
          {showDeleteSection && (
            <div className="mt-6 pt-6 border-t border-red-200">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">Waarschuwing</h4>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Het verwijderen van je account is permanent en kan niet ongedaan worden gemaakt. Dit zal:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Je profiel en alle persoonlijke gegevens verwijderen</li>
                        <li>Je uit alle scholen en groepen verwijderen</li>
                        <li>Alle door jou aangemaakte content verwijderen</li>
                        <li>Je toegang tot het platform permanent beëindigen</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                >
                  Account verwijderen
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => !deleting && setShowDeleteConfirm(false)}
            />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    Account definitief verwijderen
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Weet je zeker dat je je account wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt. 
                      Alle je gegevens, schoolverbindingen en content worden permanent verwijderd.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <Button
                  variant="danger"
                  onClick={deleteAccount}
                  loading={deleting}
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  {deleting ? 'Account wordt verwijderd...' : 'Ja, verwijder mijn account'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}