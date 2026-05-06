import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SchoolDetail } from './SchoolDetail';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { School, Plus, Users, MapPin, Calendar, Eye } from 'lucide-react';

interface School {
  id: string;
  name: string;
  school_code: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
}

interface UserSchool {
  id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  schools: School;
}

export function SchoolsTab() {
  const { user } = useAuth();
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolCity, setNewSchoolCity] = useState('');
  const [newSchoolPostalCode, setNewSchoolPostalCode] = useState('');
  const [newSchoolCountry, setNewSchoolCountry] = useState('België');
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [message, setMessage] = useState('');


  const fetchUserSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          *,
          schools (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved');

      if (error) throw error;
      setUserSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserSchools();
  }, [user]);

  if (selectedSchool) {
    return (
      <SchoolDetail
        school={selectedSchool}
        onBack={() => { setSelectedSchool(null); fetchUserSchools(); }}
        onSchoolUpdated={(updatedSchool) => {
          setSelectedSchool(updatedSchool);
          fetchUserSchools();
        }}
        onNavigateToStudent={(studentId: string, schoolId: string) => {
          console.log('SchoolsTab: Navigating to student', studentId, 'in school', schoolId);
          // For now, just log - we can implement navigation later if needed
        }}
        onNavigateToGroup={(groupId: string, schoolId: string) => {
          console.log('SchoolsTab: Navigating to group', groupId, 'in school', schoolId);
          // For now, just log - we can implement navigation later if needed
        }}
      />
    );
  }

  const joinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setJoinLoading(true);
    setMessage('');

    try {
      // First, find the school by code
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('school_code', schoolCode.toUpperCase())
        .single();

      if (schoolError || !school) {
        setMessage('School met deze code niet gevonden.');
        setJoinLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from('user_schools')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', school.id)
        .maybeSingle();

      if (existing) {
        if (existing.is_active) {
          setMessage('Je bent al verbonden met deze school.');
          setJoinLoading(false);
          return;
        }
        const { error } = await supabase
          .from('user_schools')
          .update({ is_active: true, status: 'approved' })
          .eq('id', existing.id);
        if (error) throw error;
        setMessage('Succesvol opnieuw verbonden met de school!');
        setSchoolCode('');
        setShowJoinForm(false);
        fetchUserSchools();
        return;
      }

      // Join the school
      const { error } = await supabase
        .from('user_schools')
        .insert({
          user_id: user.id,
          school_id: school.id,
          role: 'teacher',
          status: 'approved',
        });

      if (error) throw error;

      setMessage('Succesvol toegevoegd aan de school! Je hebt nu toegang.');
      setSchoolCode('');
      setShowJoinForm(false);
      fetchUserSchools();
    } catch (error) {
      console.error('Error joining school:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen aan de school.');
    } finally {
      setJoinLoading(false);
    }
  };

  const createSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreateLoading(true);
    setMessage('');

    try {
      // Generate a unique school code
      const schoolCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create the school
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: newSchoolName,
          school_code: schoolCode,
          address: newSchoolAddress || null,
          city: newSchoolCity || null,
          postal_code: newSchoolPostalCode || null,
          country: newSchoolCountry || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (schoolError) throw schoolError;

      // Add user as admin of the school
      const { error: userSchoolError } = await supabase
        .from('user_schools')
        .insert({
          user_id: user.id,
          school_id: school.id,
          role: 'admin',
          status: 'approved',
        });

      if (userSchoolError) throw userSchoolError;

      setMessage(`School succesvol aangemaakt! Schoolcode: ${schoolCode}`);
      setNewSchoolName('');
      setNewSchoolAddress('');
      setNewSchoolCity('');
      setNewSchoolPostalCode('');
      setNewSchoolCountry('België');
      setShowCreateForm(false);
      fetchUserSchools();
    } catch (error) {
      console.error('Error creating school:', error);
      setMessage('Er is een fout opgetreden bij het aanmaken van de school.');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mijn Scholen</h1>
          <p className="text-gray-600">Beheer je schoolverbindingen</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowJoinForm(!showJoinForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            School toevoegen
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <School className="w-4 h-4 mr-2" />
            School aanmaken
          </Button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('succesvol') || message.includes('Schoolcode')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Join School Form */}
      {showJoinForm && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">School toevoegen</h3>
          <form onSubmit={joinSchool} className="space-y-4">
            <Input
              label="Schoolcode"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="Voer de 6-cijferige schoolcode in"
              required
              maxLength={6}
            />
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowJoinForm(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" loading={joinLoading}>
                Toevoegen
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Create School Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe school aanmaken</h3>
          <form onSubmit={createSchool} className="space-y-4">
            <Input
              label="Schoolnaam"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
              required
              placeholder="Naam van de school"
            />
            <Input
              label="Adres (optioneel)"
              value={newSchoolAddress}
              onChange={(e) => setNewSchoolAddress(e.target.value)}
              placeholder="Straatnaam en huisnummer"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Postcode (optioneel)"
                value={newSchoolPostalCode}
                onChange={(e) => setNewSchoolPostalCode(e.target.value)}
                placeholder="3000"
              />
              <Input
                label="Plaats (optioneel)"
                value={newSchoolCity}
                onChange={(e) => setNewSchoolCity(e.target.value)}
                placeholder="Leuven"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
              <select
                value={newSchoolCountry}
                onChange={(e) => setNewSchoolCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="België">België</option>
                <option value="Nederland">Nederland</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" loading={createLoading}>
                School aanmaken
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Schools List */}
      <div className="space-y-4">
        {userSchools.length === 0 ? (
          <Card className="text-center py-12">
            <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen scholen gevonden</h3>
            <p className="text-gray-600 mb-6">
              Je bent nog niet verbonden met een school. Voeg een school toe of maak een nieuwe aan.
            </p>
          </Card>
        ) : (
          userSchools.map((userSchool) => (
            <Card key={userSchool.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <School className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {userSchool.schools.name}
                    </h3>
                    <div className="flex items-center mt-2">
                      <span className={`${userSchool.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full text-xs font-medium mr-3`}>
                        {userSchool.role === 'admin' ? 'Beheerder' : 'Teammember'}
                      </span>
                      <span>Code: {userSchool.schools.school_code}</span>
                    </div>
                    {userSchool.schools.address && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {userSchool.schools.address}
                        {userSchool.schools.city && `, ${userSchool.schools.city}`}
                        {userSchool.schools.postal_code && ` ${userSchool.schools.postal_code}`}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      Toegevoegd op {new Date(userSchool.joined_at).toLocaleDateString('nl-NL')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedSchool(userSchool.schools)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Beheren
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}