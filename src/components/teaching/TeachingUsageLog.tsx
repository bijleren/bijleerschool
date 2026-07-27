import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  School, 
  Users, 
  BookOpen,
  MapPin,
  MessageSquare,
  Filter,
  Search,
  GraduationCap
} from 'lucide-react';

interface TeachingUsageLogProps {
  onBack: () => void;
  userSchools: { id: string; name: string }[];
}

interface UsageLog {
  id: string;
  used_at: string;
  notes: string | null;
  block_title: string | null;
  time_of_day: string | null;
  teaching_techniques: {
    id: string;
    title: string;
    subtitle: string | null;
    teaching_technique_categories: {
      technique_categories: {
        name: string;
        color: string;
      };
    }[];
  };
  schools: {
    id: string;
    name: string;
  } | null;
  groups: {
    id: string;
    name: string;
    grade_level: string | null;
  } | null;
  school_grades: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export function TeachingUsageLog({ onBack, userSchools }: TeachingUsageLogProps) {
  const { user } = useAuth();
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>('all');

  // Get unique techniques for filter
  const uniqueTechniques = Array.from(
    new Map(
      usageLogs.map(log => [
        log.teaching_techniques.id,
        {
          id: log.teaching_techniques.id,
          title: log.teaching_techniques.title
        }
      ])
    ).values()
  );

  useEffect(() => {
    if (user) {
      fetchUsageLogs();
    }
  }, [user, dateRange]);

  useEffect(() => {
    applyFilters();
  }, [usageLogs, searchTerm, selectedSchoolId, selectedTechniqueId]);

  const fetchUsageLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const { data, error } = await supabase
        .from('technique_usage_logs')
        .select(`
          id,
          used_at,
          notes,
          block_title,
          time_of_day,
          teaching_techniques (
            id,
            title,
            subtitle,
            teaching_technique_categories (
              technique_categories (
                name,
                color
              )
            )
          ),
          schools (
            id,
            name
          ),
          groups (
            id,
            name,
            grade_level
          ),
          school_grades (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .gte('used_at', startDate.toISOString())
        .order('used_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsageLogs(data || []);
    } catch (error) {
      console.error('Error fetching usage logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...usageLogs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.teaching_techniques.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.block_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.groups?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.school_grades?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // School filter
    if (selectedSchoolId !== 'all') {
      filtered = filtered.filter(log => log.schools?.id === selectedSchoolId);
    }

    // Technique filter
    if (selectedTechniqueId !== 'all') {
      filtered = filtered.filter(log => log.teaching_techniques.id === selectedTechniqueId);
    }

    setFilteredLogs(filtered);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('nl-NL'),
      time: date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getContextInfo = (log: UsageLog) => {
    const parts = [];
    
    if (log.schools) {
      parts.push(log.schools.name);
    }
    
    if (log.groups) {
      parts.push(`Groep: ${log.groups.name}`);
      if (log.groups.grade_level) {
        parts.push(`(${log.groups.grade_level})`);
      }
    } else if (log.school_grades) {
      parts.push(`Klas: ${log.school_grades.name}`);
    }
    
    if (log.block_title) {
      parts.push(`tijdens ${log.block_title}`);
    }
    
    if (log.time_of_day) {
      parts.push(`om ${log.time_of_day}`);
    }
    
    return parts.join(' • ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar technieken
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Mijn Techniek Gebruik</h1>
          <p className="text-gray-600">Overzicht van je recent gebruikte didactische technieken</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Zoek in gebruik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">Alle scholen</option>
            {userSchools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTechniqueId}
            onChange={(e) => setSelectedTechniqueId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">Alle technieken</option>
            {uniqueTechniques.map((technique) => (
              <option key={technique.id} value={technique.id}>
                {technique.title}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="7">Laatste 7 dagen</option>
            <option value="30">Laatste 30 dagen</option>
            <option value="90">Laatste 90 dagen</option>
            <option value="365">Laatste jaar</option>
          </select>

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            {filteredLogs.length} van {usageLogs.length} items
          </div>
        </div>
      </Card>

      {/* Usage Log List */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {usageLogs.length === 0 ? 'Nog geen technieken gebruikt' : 'Geen resultaten gevonden'}
            </h3>
            <p className="text-gray-600">
              {usageLogs.length === 0 
                ? 'Begin met het gebruiken van didactische technieken om je voortgang te volgen.'
                : 'Probeer je zoekfilters aan te passen.'
              }
            </p>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const dateTime = formatDateTime(log.used_at);
            const contextInfo = getContextInfo(log);

            return (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-#946B29" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {log.teaching_techniques.title}
                        </h3>
                        {log.teaching_techniques.subtitle && (
                          <p className="text-sm text-gray-600">{log.teaching_techniques.subtitle}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {dateTime.date}
                        </div>
                        <div className="flex items-center mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {dateTime.time}
                        </div>
                      </div>
                    </div>

                    {/* Categories */}
                    {log.teaching_techniques.teaching_technique_categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {log.teaching_techniques.teaching_technique_categories
                          .filter(tc => tc.technique_categories)
                          .map((tc, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs rounded-full text-white"
                            style={{ backgroundColor: tc.technique_categories.color }}
                          >
                            {tc.technique_categories.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Context Information */}
                    <div className="text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {contextInfo}
                      </div>
                    </div>

                    {/* Notes */}
                    {log.notes && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Notities:</p>
                            <p className="text-sm text-gray-600">{log.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {filteredLogs.length === 100 && (
        <div className="text-center mt-6">
          <Button variant="secondary" onClick={() => setDateRange('365')}>
            Meer laden
          </Button>
        </div>
      )}
    </div>
  );
}