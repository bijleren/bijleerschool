import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, TrendingUp, Users, AlertTriangle, Calendar, Clock } from 'lucide-react';

interface BehaviorAnalyticsProps {
  schoolId: string;
  onBack: () => void;
  onNavigateToStudent?: (schoolId: string, studentId: string) => void;
  onFilterByTimeSlot?: (startMinutes: number, endMinutes: number, timeLabel: string) => void;
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

interface TimeOfDayStats {
  timeLabel: string;
  startMinutes: number;
  endMinutes: number;
  incident_count: number;
  percentage: number;
}

export function BehaviorAnalytics({ schoolId, onBack, onNavigateToStudent, onFilterByTimeSlot }: BehaviorAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [studentFrequencies, setStudentFrequencies] = useState<StudentFrequency[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [severityStats, setSeverityStats] = useState<SeverityStats[]>([]);
  const [timeOfDayStats, setTimeOfDayStats] = useState<TimeOfDayStats[]>([]);
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
        if (!incident.students) return;
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
        if (incident.behavior_items?.behavior_severity_levels) {
          const severityLevel = incident.behavior_items.behavior_severity_levels.level;
          studentData.severity_breakdown[severityLevel] = (studentData.severity_breakdown[severityLevel] || 0) + 1;
        }

        // Update category breakdown
        if (incident.behavior_items?.behavior_categories) {
          const categoryName = incident.behavior_items.behavior_categories.name;
          studentData.category_breakdown[categoryName] = (studentData.category_breakdown[categoryName] || 0) + 1;
        }
      });

      const sortedStudents = Array.from(studentMap.values())
        .sort((a, b) => b.incident_count - a.incident_count);
      setStudentFrequencies(sortedStudents);

      // Calculate category statistics
      const categoryMap = new Map<string, { count: number; color: string }>();
      incidentData.forEach((incident: any) => {
        if (!incident.behavior_items?.behavior_categories) return;
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
        if (!incident.behavior_items?.behavior_severity_levels) return;
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

      // Calculate time of day statistics with 30-minute intervals
      // Create time slots: 00:00-08:30, then 30-min intervals until 16:00, then 16:00-23:59
      const timeSlots: Array<{ timeLabel: string; startMinutes: number; endMinutes: number }> = [];

      // First slot: 00:00 - 08:30
      timeSlots.push({ timeLabel: '00:00 - 08:30', startMinutes: 0, endMinutes: 510 });

      // 30-minute intervals from 08:30 to 16:00
      for (let minutes = 510; minutes < 960; minutes += 30) {
        const startHour = Math.floor(minutes / 60);
        const startMin = minutes % 60;
        const endHour = Math.floor((minutes + 30) / 60);
        const endMin = (minutes + 30) % 60;

        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        timeSlots.push({
          timeLabel: `${startTime} - ${endTime}`,
          startMinutes: minutes,
          endMinutes: minutes + 30
        });
      }

      // Last slot: 16:00 - 23:59
      timeSlots.push({ timeLabel: '16:00 - 23:59', startMinutes: 960, endMinutes: 1440 });

      // Count incidents per time slot
      const slotCounts = new Map<number, number>();
      incidentData.forEach((incident: any) => {
        const date = new Date(incident.incident_date);
        const totalMinutes = date.getHours() * 60 + date.getMinutes();

        // Find which slot this incident belongs to
        const slotIndex = timeSlots.findIndex(slot =>
          totalMinutes >= slot.startMinutes && totalMinutes < slot.endMinutes
        );

        if (slotIndex !== -1) {
          slotCounts.set(slotIndex, (slotCounts.get(slotIndex) || 0) + 1);
        }
      });

      const timeOfDayStatsData = timeSlots.map((slot, index) => ({
        ...slot,
        incident_count: slotCounts.get(index) || 0,
        percentage: incidentData.length > 0 ? ((slotCounts.get(index) || 0) / incidentData.length) * 100 : 0,
      }));
      setTimeOfDayStats(timeOfDayStatsData);

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
              <div
                key={category.category_name}
                className="space-y-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('filterByCategory', {
                    detail: { categoryName: category.category_name }
                  }));
                }}
              >
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
              <div
                key={severity.level}
                className="space-y-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('filterBySeverity', {
                    detail: { severityLevel: severity.level }
                  }));
                }}
              >
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

      {/* Time of Day Analysis */}
      <Card className="mt-8">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Incidenten per tijdstip
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Overzicht van incidenten per tijdsblok (30-minuten intervallen van 08:30-16:00, ongeacht datum)
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aantal incidenten
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visualisatie
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeOfDayStats.map((stat, index) => {
                const maxCount = Math.max(...timeOfDayStats.map(s => s.incident_count));
                const intensity = maxCount > 0 ? stat.incident_count / maxCount : 0;
                const barWidth = stat.percentage;

                return (
                  <tr
                    key={index}
                    onClick={() => {
                      if (stat.incident_count > 0 && onFilterByTimeSlot) {
                        onFilterByTimeSlot(stat.startMinutes, stat.endMinutes, stat.timeLabel);
                      }
                    }}
                    className={`transition-colors ${
                      stat.incident_count > 0
                        ? 'hover:bg-blue-50 cursor-pointer'
                        : 'opacity-50'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {stat.timeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {stat.incident_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {stat.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="h-6 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`,
                          }}
                        >
                          {stat.incident_count > 0 && (
                            <span className="text-xs font-medium text-blue-900">
                              {stat.incident_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {timeOfDayStats.every(s => s.incident_count === 0) && (
          <p className="text-gray-500 text-center py-8">Geen data beschikbaar</p>
        )}
      </Card>
    </div>
  );
}