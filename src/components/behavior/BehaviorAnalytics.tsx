import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, TrendingUp, Users, AlertTriangle, Calendar } from 'lucide-react';

interface BehaviorAnalyticsProps {
  schoolId: string;
  onBack: () => void;
  onNavigateToStudent?: (schoolId: string, studentId: string) => void;
}

interface StudentFrequency {
  student_id: string;
  student_name: string;
  student_number: string | null;
  incident_count: number;
  latest_incident: string;
  severity_breakdown: { [key: number]: number };
  category_breakdown: { [key: string]: number };
}

interface CategoryStats {
  category_name: string;
  category_color: string;
  incident_count: number;
  percentage: number;
}

interface SeverityStats {
  level: number;
  level_name: string;
  level_color: string;
  incident_count: number;
  percentage: number;
}

export function BehaviorAnalytics({ schoolId, onBack, onNavigateToStudent }: BehaviorAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [studentFrequencies, setStudentFrequencies] = useState<StudentFrequency[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [severityStats, setSeverityStats] = useState<SeverityStats[]>([]);
  const [totalIncidents, setTotalIncidents] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Fetch incidents with related data
      const { data: incidents, error } = await supabase
        .from('behavior_incidents')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_number
          ),
          behavior_items (
            behavior_categories (
              name,
              color
            ),
            behavior_severity_levels (
              name,
              level,
              color
            )
          )
        `)
        .eq('school_id', schoolId)
        .gte('incident_date', startDate.toISOString());

      if (error) throw error;

      const incidentData = incidents || [];
      setTotalIncidents(incidentData.length);

      // Calculate student frequencies
      const studentMap = new Map<string, StudentFrequency>();
      
      incidentData.forEach((incident: any) => {
        const studentId = incident.student_id;
        const studentName = `${incident.students.first_name} ${incident.students.last_name}`;
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: studentName,
            student_number: incident.students.student_number,
            incident_count: 0,
            latest_incident: incident.incident_date,
            severity_breakdown: {},
            category_breakdown: {},
          });
        }

        const studentData = studentMap.get(studentId)!;
        studentData.incident_count++;
        
        // Update latest incident
        if (new Date(incident.incident_date) > new Date(studentData.latest_incident)) {
          studentData.latest_incident = incident.incident_date;
        }

        // Update severity breakdown
        const severityLevel = incident.behavior_items.behavior_severity_levels.level;
        studentData.severity_breakdown[severityLevel] = (studentData.severity_breakdown[severityLevel] || 0) + 1;

        // Update category breakdown
        const categoryName = incident.behavior_items.behavior_categories.name;
        studentData.category_breakdown[categoryName] = (studentData.category_breakdown[categoryName] || 0) + 1;
      });

      const sortedStudents = Array.from(studentMap.values())
        .sort((a, b) => b.incident_count - a.incident_count);
      setStudentFrequencies(sortedStudents);

      // Calculate category statistics
      const categoryMap = new Map<string, { count: number; color: string }>();
      incidentData.forEach((incident: any) => {
        const categoryName = incident.behavior_items.behavior_categories.name;
        const categoryColor = incident.behavior_items.behavior_categories.color;
        
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { count: 0, color: categoryColor });
        }
        categoryMap.get(categoryName)!.count++;
      });

      const categoryStatsData = Array.from(categoryMap.entries()).map(([name, data]) => ({
        category_name: name,
        category_color: data.color,
        incident_count: data.count,
        percentage: incidentData.length > 0 ? (data.count / incidentData.length) * 100 : 0,
      })).sort((a, b) => b.incident_count - a.incident_count);
      setCategoryStats(categoryStatsData);

      // Calculate severity statistics
      const severityMap = new Map<number, { count: number; name: string; color: string }>();
      incidentData.forEach((incident: any) => {
        const level = incident.behavior_items.behavior_severity_levels.level;
        const name = incident.behavior_items.behavior_severity_levels.name;
        const color = incident.behavior_items.behavior_severity_levels.color;

        if (!severityMap.has(level)) {
          severityMap.set(level, { count: 0, name, color });
        }
        severityMap.get(level)!.count++;
      });

      const severityStatsData = Array.from(severityMap.entries()).map(([level, data]) => ({
        level,
        level_name: data.name,
        level_color: data.color,
        incident_count: data.count,
        percentage: incidentData.length > 0 ? (data.count / incidentData.length) * 100 : 0,
      })).sort((a, b) => a.level - b.level);
      setSeverityStats(severityStatsData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar incidenten
          </Button>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-900">Gedragsanalyses</h1>
            <p className="text-gray-600">Inzicht in gedragspatronen en frequenties</p>
          </div>
        </div>
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="7">Laatste 7 dagen</option>
            <option value="30">Laatste 30 dagen</option>
            <option value="90">Laatste 90 dagen</option>
            <option value="365">Laatste jaar</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totaal incidenten</p>
              <p className="text-2xl font-bold text-gray-900">{totalIncidents}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Betrokken leerlingen</p>
              <p className="text-2xl font-bold text-gray-900">{studentFrequencies.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gemiddeld per leerling</p>
              <p className="text-2xl font-bold text-gray-900">
                {studentFrequencies.length > 0 ? (totalIncidents / studentFrequencies.length).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Per dag gemiddeld</p>
              <p className="text-2xl font-bold text-gray-900">
                {(totalIncidents / parseInt(dateRange)).toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Student Frequency */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Leerlingen met meeste incidenten
          </h3>
          <div className="space-y-3">
            {studentFrequencies.slice(0, 10).map((student, index) => (
              <div key={student.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                  </div>
                  <div>
                    {onNavigateToStudent ? (
                      <button
                        onClick={() => onNavigateToStudent(schoolId, student.student_id)}
                        className="font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left"
                      >
                        {student.student_name}
                      </button>
                    ) : (
                      <p className="font-medium text-gray-900">{student.student_name}</p>
                    )}
                    {student.student_number && (
                      <p className="text-sm text-gray-500">#{student.student_number}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Laatste: {new Date(student.latest_incident).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{student.incident_count}</p>
                  <p className="text-xs text-gray-500">incidenten</p>
                </div>
              </div>
            ))}
            {studentFrequencies.length === 0 && (
              <p className="text-gray-500 text-center py-8">Geen data beschikbaar</p>
            )}
          </div>
        </Card>

        {/* Category Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Verdeling per categorie
          </h3>
          <div className="space-y-3">
            {categoryStats.map((category) => (
              <div key={category.category_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.category_color }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {category.category_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {category.incident_count}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: category.category_color,
                      width: `${category.percentage}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {categoryStats.length === 0 && (
              <p className="text-gray-500 text-center py-8">Geen data beschikbaar</p>
            )}
          </div>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Verdeling per ernst niveau
          </h3>
          <div className="space-y-3">
            {severityStats.map((severity) => (
              <div key={severity.level} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: severity.level_color }}
                    >
                      {severity.level}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {severity.level_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {severity.incident_count}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({severity.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: severity.level_color,
                      width: `${severity.percentage}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {severityStats.length === 0 && (
              <p className="text-gray-500 text-center py-8">Geen data beschikbaar</p>
            )}
          </div>
        </Card>

        {/* Recent Trends */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recente trends
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Meest voorkomende gedrag</h4>
              {categoryStats.length > 0 ? (
                <p className="text-blue-800">
                  {categoryStats[0].category_name} ({categoryStats[0].incident_count} incidenten)
                </p>
              ) : (
                <p className="text-blue-800">Geen data beschikbaar</p>
              )}
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Meest voorkomend niveau</h4>
              {severityStats.length > 0 ? (
                <p className="text-yellow-800">
                  Niveau {severityStats.reduce((prev, current) => 
                    prev.incident_count > current.incident_count ? prev : current
                  ).level} - {severityStats.reduce((prev, current) => 
                    prev.incident_count > current.incident_count ? prev : current
                  ).level_name}
                </p>
              ) : (
                <p className="text-yellow-800">Geen data beschikbaar</p>
              )}
            </div>

            {studentFrequencies.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Aandacht vereist</h4>
                <p className="text-red-800">
                  {studentFrequencies.filter(s => s.incident_count >= 3).length} leerlingen 
                  met 3+ incidenten
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}