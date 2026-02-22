import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { SporenManagement } from './SporenManagement';
import { SporenBoardView } from './SporenBoardView';
import { GitBranch, Settings, BarChart3, Save, X, AlertCircle } from 'lucide-react';

interface School {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

export function SporenTab() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showManagement, setShowManagement] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, [user]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchGroups();
      fetchSubjects();
    }
  }, [selectedSchoolId]);

  const fetchSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          schools (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved');

      if (error) throw error;

      const schoolsList = data?.map(us => us.schools).filter(Boolean) as School[];
      setSchools(schoolsList);

      if (schoolsList.length === 1) {
        setSelectedSchoolId(schoolsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!selectedSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, grade_level')
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchSubjects = async () => {
    if (!selectedSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('school_subjects')
        .select('id, name, color')
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Geen scholen beschikbaar</h2>
          <p className="text-gray-600">
            Je hebt geen toegang tot scholen. Verbind eerst een school om sporen te beheren.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sporen</h1>
              <p className="text-sm text-gray-600">
                Organiseer leerlingen in niveaugroepen per vak
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowManagement(!showManagement)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {showManagement ? 'Toewijzingen' : 'Beheer Sporen'}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => {
                setSelectedSchoolId(e.target.value);
                setSelectedGroupId('');
                setSelectedSubjectId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecteer een school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Klas
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={!selectedSchoolId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecteer een klas</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} {group.grade_level && `(${group.grade_level})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vak
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={!selectedSchoolId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecteer een vak</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showManagement && selectedSchoolId ? (
          <div className="mt-6">
            <SporenManagement schoolId={selectedSchoolId} subjects={subjects} />
          </div>
        ) : selectedSchoolId && selectedGroupId && selectedSubjectId ? (
          <div className="mt-6">
            <SporenBoardView
              schoolId={selectedSchoolId}
              groupId={selectedGroupId}
              subjectId={selectedSubjectId}
              groupName={groups.find(g => g.id === selectedGroupId)?.name || ''}
              subjectName={subjects.find(s => s.id === selectedSubjectId)?.name || ''}
            />
          </div>
        ) : !showManagement ? (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Selecteer een school, klas en vak om te beginnen</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
