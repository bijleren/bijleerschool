import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TemplateBuilder } from './TemplateBuilder';
import { TemplateConnections } from './TemplateConnections';
import { DayTimeline } from './DayTimeline';
import { LessonTimingSettings } from './LessonTimingSettings';
import { 
  Calendar, 
  Plus, 
  Settings, 
  Clock,
  Users,
  School
} from 'lucide-react';

interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
  school_id: string;
  is_active: boolean;
  created_at: string;
}

interface UserSchool {
  id: string;
  name: string;
}

export function SchoolDayTab() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'timeline' | 'templates' | 'connections' | 'timing'>('timeline');
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DayTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserSchools();
  }, [user]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchTemplates();
    }
  }, [selectedSchoolId]);

  const fetchUserSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          schools (id, name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true);

      if (error) throw error;

      const schools = data?.map(us => us.schools).filter(Boolean) || [];
      setUserSchools(schools);

      // Auto-select first school if user has only one school
      if (schools.length === 1 && !selectedSchoolId) {
        setSelectedSchoolId(schools[0].id);
      } else if (schools.length > 1 && !selectedSchoolId) {
        setSelectedSchoolId(schools[0].id);
      }
    } catch (error) {
      console.error('Error fetching user schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!selectedSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('day_templates')
        .select('*')
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleTemplateCreated = () => {
    fetchTemplates();
    setActiveView('timeline');
  };

  const selectedSchool = userSchools.find(school => school.id === selectedSchoolId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!selectedSchoolId || !selectedSchool) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Schooldag</h1>
          <p className="text-gray-600">Selecteer een school om je schooldag te beheren</p>
        </div>

        {userSchools.length === 0 ? (
          <Card className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen scholen gevonden</h3>
            <p className="text-gray-600">
              Je bent nog niet verbonden met een school. Ga naar de scholen tab om een school toe te voegen.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {userSchools.map((school) => (
              <Card key={school.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <School className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
                      <p className="text-sm text-gray-500">Beheer je schooldag planning</p>
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setSelectedSchoolId(school.id)}>
                    Selecteren
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeView === 'templates') {
    return (
      <TemplateBuilder
        schoolId={selectedSchoolId}
        onBack={() => setActiveView('timeline')}
        onTemplateCreated={handleTemplateCreated}
        editingTemplate={selectedTemplate}
        onTemplateUpdated={() => {
          fetchTemplates();
          setSelectedTemplate(null);
          setActiveView('timeline');
        }}
      />
    );
  }

  if (activeView === 'connections') {
    return (
      <TemplateConnections
        schoolId={selectedSchoolId}
        onBack={() => setActiveView('timeline')}
        templates={templates}
      />
    );
  }

  if (activeView === 'timing') {
    return (
      <LessonTimingSettings
        schoolId={selectedSchoolId}
        onClose={() => setActiveView('timeline')}
        onSettingsUpdated={() => {
          // Refresh any data that depends on timing settings
          setActiveView('timeline');
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schooldag</h1>
            <p className="text-gray-600">{selectedSchool.name}</p>
          </div>
          {userSchools.length > 1 && (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {userSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setActiveView('connections')}
          >
            <Users className="w-4 h-4 mr-2" />
            Verbindingen
          </Button>
          <Button
            variant="secondary"
            onClick={() => setActiveView('timing')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Timing
          </Button>
          <Button
            onClick={() => {
              setSelectedTemplate(null);
              setActiveView('templates');
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Template
          </Button>
        </div>
      </div>

      {/* Timeline View */}
      <DayTimeline
        schoolId={selectedSchoolId}
        templates={templates}
        onEditTemplate={(template) => {
          setSelectedTemplate(template);
          setActiveView('templates');
        }}
      />
    </div>
  );
}