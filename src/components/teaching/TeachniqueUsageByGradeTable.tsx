import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { BookOpen, TrendingUp, Users } from 'lucide-react';

interface TechniqueUsageByGradeTableProps {
  schoolId: string;
  dateRange: string;
}

interface SchoolGrade {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface TechniqueUsageData {
  technique_id: string;
  technique_title: string;
  technique_subtitle: string | null;
  categories: { name: string; color: string }[];
  grade_usage: { [gradeId: string]: number };
  grade_teachers: { [gradeId: string]: Set<string> };
  total_usage: number;
  total_teachers: number;
}

export function TechniqueUsageByGradeTable({ schoolId, dateRange }: TechniqueUsageByGradeTableProps) {
  const [schoolGrades, setSchoolGrades] = useState<SchoolGrade[]>([]);
  const [techniqueUsageData, setTechniqueUsageData] = useState<TechniqueUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [schoolId, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch school grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('school_grades')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order');

      if (gradesError) throw gradesError;
      setSchoolGrades(gradesData || []);

      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Get school user IDs
      const { data: userSchoolsData } = await supabase
        .from('user_schools')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('status', 'approved')
        .eq('is_active', true);

      const userIds = userSchoolsData?.map(us => us.user_id) || [];

      if (userIds.length === 0) {
        setTechniqueUsageData([]);
        return;
      }

      // Fetch technique usage logs with technique and grade data
      const { data: usageLogsData, error: usageError } = await supabase
        .from('technique_usage_logs')
        .select(`
          technique_id,
          grade_id,
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
          )
        `)
        .in('user_id', userIds)
        .gte('used_at', startDate.toISOString());

      if (usageError) throw usageError;

      // Process the data to create technique usage summary
      const techniqueMap = new Map<string, TechniqueUsageData>();

      usageLogsData?.forEach((log: any) => {
        const techniqueId = log.technique_id;
        const gradeId = log.grade_id;
        
        if (!techniqueMap.has(techniqueId)) {
          techniqueMap.set(techniqueId, {
            technique_id: techniqueId,
            technique_title: log.teaching_techniques.title,
            technique_subtitle: log.teaching_techniques.subtitle,
            categories: log.teaching_techniques.teaching_technique_categories
              .filter((tc: any) => tc.technique_categories)
              .map((tc: any) => ({
                name: tc.technique_categories.name,
                color: tc.technique_categories.color
              })),
            grade_usage: {},
            grade_teachers: {},
            total_usage: 0,
            total_teachers: new Set()
          });
        }

        const techniqueData = techniqueMap.get(techniqueId)!;
        techniqueData.total_usage++;
        techniqueData.total_teachers.add(log.user_id);

        if (gradeId) {
          techniqueData.grade_usage[gradeId] = (techniqueData.grade_usage[gradeId] || 0) + 1;
          if (!techniqueData.grade_teachers[gradeId]) {
            techniqueData.grade_teachers[gradeId] = new Set();
          }
          techniqueData.grade_teachers[gradeId].add(log.user_id);
        }
      });

      // Convert to array and sort by total usage
      const sortedTechniques = Array.from(techniqueMap.values())
        .map(technique => ({
          ...technique,
          total_teachers: technique.total_teachers.size,
          grade_teachers: Object.fromEntries(
            Object.entries(technique.grade_teachers).map(([gradeId, teacherSet]) => [
              gradeId,
              teacherSet.size
            ])
          )
        }))
        .sort((a, b) => b.total_usage - a.total_usage);

      setTechniqueUsageData(sortedTechniques);
    } catch (error) {
      console.error('Error fetching technique usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-#946B29"></div>
      </div>
    );
  }

  if (techniqueUsageData.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Geen gebruiksdata gevonden</h3>
        <p className="text-gray-600">
          Er zijn nog geen technieken gebruikt in de geselecteerde periode.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Techniek
            </th>
            {schoolGrades.map((grade) => (
              <th key={grade.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {grade.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {techniqueUsageData.map((technique, index) => (
            <tr key={technique.technique_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-#946B29" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {technique.technique_title}
                    </p>
                    {technique.technique_subtitle && (
                      <p className="text-sm text-gray-500 truncate">
                        {technique.technique_subtitle}
                      </p>
                    )}
                    {technique.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {technique.categories.slice(0, 2).map((category, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded-full text-white"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.name}
                          </span>
                        ))}
                        {technique.categories.length > 2 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                            +{technique.categories.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              {schoolGrades.map((grade) => {
                const count = technique.grade_usage[grade.id] || 0;
                const teacherCount = technique.grade_teachers[grade.id] || 0;
                return (
                  <td key={grade.id} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${
                        count > 0 ? 'text-#946B29' : 'text-gray-300'
                      }`}>
                        {count > 0 ? `${count} (${teacherCount})` : '0'}
                      </span>
                      {count > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-#946B29 h-1 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (count / Math.max(...Object.values(technique.grade_usage))) * 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}