import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { BehaviorIncidentForm } from './BehaviorIncidentForm';
import { BehaviorSettings } from './BehaviorSettings';
import { BehaviorAnalytics } from './BehaviorAnalytics';
import { BehaviorIncidentEdit } from './BehaviorIncidentEdit';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { 
  AlertTriangle, 
  Plus, 
  Settings, 
  BarChart3, 
  Calendar,
  User,
  MapPin,
  Clock,
  Filter,
  Search
} from 'lucide-react';

interface School {
  id: string;
  name: string;
}

interface BehaviorIncident {
  id: string;
  incident_date: string;
  location: string | null;
  description: string;
  action_taken: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  status: 'pending' | 'in_progress' | 'resolved';
  students: {
    id: string;
    first_name: string;
    last_name: string;
    student_number: string | null;
  };
  behavior_items: {
    id: string;
    name: string;
    behavior_categories: {
      name: string;
      color: string;
    };
    behavior_severity_levels: {
      name: string;
      level: number;
      color: string;
    };
  };
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface BehaviorTabProps {
  selectedSchool: School | null;
  userSchools: School[];
  onSchoolSelect: (school: School) => void;
  onNavigateToStudent?: (schoolId: string, studentId: string) => void;
}

export function BehaviorTab({ selectedSchool, userSchools, onSchoolSelect, onNavigateToStudent }: BehaviorTabProps) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'incidents' | 'form' | 'settings' | 'analytics'>('incidents');
  const [editingIncident, setEditingIncident] = useState<BehaviorIncident | null>(null);
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    // Check if there's a preselected student and auto-open the form
    const preselectedStudentId = sessionStorage.getItem('preselectedStudentId');
    if (preselectedStudentId) {
      setActiveView('form');
      // Clear the preselected student after using it
      sessionStorage.removeItem('preselectedStudentId');
    }

    // Listen for navigation events from header dropdown
    const handleNavigateToBehaviorForm = () => {
      setActiveView('form');
    };
    
    const handleNavigateToBehaviorIncidents = () => {
      setActiveView('incidents');
    };
    
    const handleNavigateToBehaviorAnalytics = () => {
      setActiveView('analytics');
    };
    
    const handleNavigateToBehaviorSettings = () => {
      setActiveView('settings');
    };
    
    window.addEventListener('navigateToBehaviorForm', handleNavigateToBehaviorForm);
    window.addEventListener('navigateToBehaviorIncidents', handleNavigateToBehaviorIncidents);
    window.addEventListener('navigateToBehaviorAnalytics', handleNavigateToBehaviorAnalytics);
    window.addEventListener('navigateToBehaviorSettings', handleNavigateToBehaviorSettings);
    
    return () => {
      window.removeEventListener('navigateToBehaviorForm', handleNavigateToBehaviorForm);
      window.removeEventListener('navigateToBehaviorIncidents', handleNavigateToBehaviorIncidents);
      window.removeEventListener('navigateToBehaviorAnalytics', handleNavigateToBehaviorAnalytics);
      window.removeEventListener('navigateToBehaviorSettings', handleNavigateToBehaviorSettings);
    };
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedSchool) {
      fetchIncidents();
    }
  }, [selectedSchool]);

  const fetchIncidents = async () => {
    if (!selectedSchool) return;

    try {
      const { data, error } = await supabase
        .from('behavior_incidents')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_number
          ),
          behavior_incident_students (
            id,
            student_id,
            role_id,
            students (
              id,
              first_name,
              last_name,
              student_number
            ),
            student_roles (
              id,
              name,
              color
            )
          ),
          behavior_items (
            id,
            name,
            behavior_categories (
              name,
              color
            ),
            behavior_severity_levels (
              name,
              level,
              color
            )
          ),
          profiles (
            first_name,
            last_name
          ),
          behavior_incident_notifications (
            id,
            notification_type,
            teacher_id,
            group_id,
            profiles (
              first_name,
              last_name
            ),
            groups (
              name
            )
          ),
          behavior_incident_eerste_acties (
            id,
            consequence_id,
            notes,
            consequences (
              id,
              name
            )
          ),
          behavior_incident_followup_acties (
            id,
            consequence_id,
            notes,
            action_date,
            consequences (
              id,
              name
            )
          )
        `)
        .eq('school_id', selectedSchool.id)
        .order('incident_date', { ascending: false });

      if (error) throw error;

      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncidentCreated = () => {
    fetchIncidents();
    setActiveView('incidents');
  };

  const handleIncidentUpdated = () => {
    fetchIncidents();
    setEditingIncident(null);
    setActiveView('incidents');
  };

  const handleEditIncident = (incident: BehaviorIncident) => {
    setEditingIncident(incident);
    setActiveView('form');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Melding';
      case 'in_progress': return 'Onderzoek';
      case 'resolved': return 'Afgerond';
      default: return status;
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = searchTerm === '' || 
      `${incident.students.first_name} ${incident.students.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.behavior_items.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    
    const matchesSeverity = severityFilter === 'all' || 
      incident.behavior_items.behavior_severity_levels.level.toString() === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  if (!selectedSchool) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gedragsincidenten</h1>
          <p className="text-gray-600">Selecteer een school om gedragsincidenten te beheren</p>
        </div>

        {userSchools.length === 0 ? (
          <Card className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                      <AlertTriangle className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
                      <p className="text-sm text-gray-500">Code: {school.school_code}</p>
                      {school.city && (
                        <p className="text-sm text-gray-500">{school.city}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => onSchoolSelect(school)}>
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

  if (activeView === 'form') {
    if (editingIncident) {
      return (
        <BehaviorIncidentEdit
          incident={editingIncident}
          onIncidentUpdated={handleIncidentUpdated}
          onCancel={() => {
            setEditingIncident(null);
            setActiveView('incidents');
          }}
        />
      );
    }
    
    return (
      <BehaviorIncidentForm
        schoolId={selectedSchool.id}
        onIncidentCreated={handleIncidentCreated}
        onCancel={() => setActiveView('incidents')}
      />
    );
  }

  if (activeView === 'settings') {
    return (
      <BehaviorSettings
        schoolId={selectedSchool.id}
        onBack={() => setActiveView('incidents')}
      />
    );
  }

  if (activeView === 'analytics') {
    return (
      <BehaviorAnalytics
        schoolId={selectedSchool.id}
        onBack={() => setActiveView('incidents')}
        onNavigateToStudent={onNavigateToStudent}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gedragsincidenten</h1>
          <p className="text-gray-600">{selectedSchool.name}</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setActiveView('analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analyses
          </Button>
          <Button
            variant="secondary"
            onClick={() => setActiveView('settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Instellingen
          </Button>
          <Button onClick={() => setActiveView('form')}>
            <Plus className="w-4 h-4 mr-2" />
            Incident melden
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Zoek incidenten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Alle statussen</option>
            <option value="pending">Melding</option>
            <option value="in_progress">Onderzoek</option>
            <option value="resolved">Afgerond</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Alle niveaus</option>
            <option value="1">Niveau 1</option>
            <option value="2">Niveau 2</option>
            <option value="3">Niveau 3</option>
            <option value="4">Niveau 4</option>
            <option value="5">Niveau 5</option>
          </select>
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            {filteredIncidents.length} van {incidents.length} incidenten
          </div>
        </div>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <Card className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {incidents.length === 0 ? 'Geen incidenten gevonden' : 'Geen incidenten gevonden met deze filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {incidents.length === 0 
                ? 'Er zijn nog geen gedragsincidenten gemeld voor deze school.'
                : 'Probeer je zoekfilters aan te passen.'
              }
            </p>
            {incidents.length === 0 && (
              <Button onClick={() => setActiveView('form')}>
                <Plus className="w-4 h-4 mr-2" />
                Eerste incident melden
              </Button>
            )}
          </Card>
        ) : (
          filteredIncidents.map((incident) => (
            <Card key={incident.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onNavigateToStudent && incident.students.id && onNavigateToStudent(selectedSchool.id, incident.students.id)}
                            className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                          >
                            {incident.students.first_name} {incident.students.last_name}
                          </button>
                          {incident.students.student_number && (
                            <span className="text-sm text-gray-500">#{incident.students.student_number}</span>
                          )}
                        </div>
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: incident.behavior_items.behavior_categories.color + '20',
                            color: incident.behavior_items.behavior_categories.color
                          }}
                        >
                          {incident.behavior_items.behavior_categories.name}
                        </span>
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: incident.behavior_items.behavior_severity_levels.color + '20',
                            color: incident.behavior_items.behavior_severity_levels.color
                          }}
                        >
                          Niveau {incident.behavior_items.behavior_severity_levels.level}
                        </span>
                      </div>

                      {/* Display all connected students */}
                      {incident.behavior_incident_students && incident.behavior_incident_students.length > 0 && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <h5 className="text-xs font-medium text-gray-700 mb-2">Betrokken studenten:</h5>
                          <div className="flex flex-wrap gap-2">
                            {incident.behavior_incident_students.map((studentRel: any) => (
                              <div key={studentRel.id} className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                <button
                                  onClick={() => onNavigateToStudent && studentRel.students.id && onNavigateToStudent(selectedSchool.id, studentRel.students.id)}
                                  className="font-medium text-gray-900 hover:text-indigo-600 transition-colors text-sm"
                                >
                                  {studentRel.students.first_name} {studentRel.students.last_name}
                                </button>
                                {studentRel.students.student_number && (
                                  <span className="text-xs text-gray-500">#{studentRel.students.student_number}</span>
                                )}
                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: studentRel.student_roles.color + '20',
                                    color: studentRel.student_roles.color
                                  }}
                                >
                                  {studentRel.student_roles.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <h4 className="font-medium text-gray-900 mb-2">{incident.behavior_items.name}</h4>
                      <p className="text-gray-600 mb-3">{incident.description}</p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(incident.incident_date).toLocaleDateString('nl-NL')}
                        </div>
                        {incident.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {incident.location}
                          </div>
                        )}
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          Gemeld door: {incident.profiles ? `${incident.profiles.first_name} ${incident.profiles.last_name}` : 'Onbekend'}
                        </div>
                      </div>

                      {incident.behavior_incident_eerste_acties && incident.behavior_incident_eerste_acties.length > 0 && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <h5 className="font-medium text-green-900 mb-2">Eerste acties:</h5>
                          <div className="space-y-2">
                            {incident.behavior_incident_eerste_acties.map((actie: any) => (
                              <div key={actie.id} className="text-sm">
                                <span className="text-green-900 font-medium">{actie.consequences.name}</span>
                                {actie.notes && (
                                  <p className="text-green-800 mt-1 ml-2">{actie.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {incident.behavior_incident_followup_acties && incident.behavior_incident_followup_acties.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-blue-900 mb-2">Follow-up acties:</h5>
                          <div className="space-y-2">
                            {incident.behavior_incident_followup_acties.map((actie: any) => (
                              <div key={actie.id} className="text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-blue-900 font-medium">{actie.consequences.name}</span>
                                  <span className="text-blue-700 text-xs">
                                    {new Date(actie.action_date).toLocaleDateString('nl-NL')}
                                  </span>
                                </div>
                                {actie.notes && (
                                  <p className="text-blue-800 mt-1 ml-2">{actie.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {incident.follow_up_required && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                          <h5 className="font-medium text-yellow-900 mb-1">Follow-up vereist</h5>
                          {incident.follow_up_date && (
                            <p className="text-yellow-800 text-sm">
                              Datum: {new Date(incident.follow_up_date).toLocaleDateString('nl-NL')}
                            </p>
                          )}
                          {incident.follow_up_notes && (
                            <p className="text-yellow-800 text-sm mt-1">{incident.follow_up_notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Connected Teachers/Groups */}
                  {incident.behavior_incident_notifications && incident.behavior_incident_notifications.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                      <h5 className="font-medium text-purple-900 mb-2">Geïnformeerde personen:</h5>
                      <div className="flex flex-wrap gap-2">
                        {incident.behavior_incident_notifications.map((notification: any) => (
                          <span
                            key={notification.id}
                            className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                          >
                            {notification.notification_type === 'teacher' 
                              ? `${notification.profiles?.first_name} ${notification.profiles?.last_name}`
                              : `Groep: ${notification.groups?.name}`
                            }
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                    {getStatusText(incident.status)}
                  </span>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleEditIncident(incident)}
                  >
                    Bewerken
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