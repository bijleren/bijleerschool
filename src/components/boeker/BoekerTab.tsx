import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { BookLibrary } from './BookLibrary';
import { StudentBookManagement } from './StudentBookManagement';
import { BoekerAnalytics } from './BoekerAnalytics';
import { MaterialenTab } from '../materials/MaterialenTab';
import { Book, Users, BarChart3, Package } from 'lucide-react';

type View = 'library' | 'students' | 'analytics' | 'materials';

export function BoekerTab() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>('library');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserSchool();
  }, [user]);

  useEffect(() => {
    const handleNavigateToStudents = () => setCurrentView('students');
    const handleNavigateToAnalytics = () => setCurrentView('analytics');
    const handleNavigateToMaterials = () => setCurrentView('materials');

    window.addEventListener('navigateToBoekerStudents', handleNavigateToStudents);
    window.addEventListener('navigateToBoekerAnalytics', handleNavigateToAnalytics);
    window.addEventListener('navigateToBoekerMaterials', handleNavigateToMaterials);

    return () => {
      window.removeEventListener('navigateToBoekerStudents', handleNavigateToStudents);
      window.removeEventListener('navigateToBoekerAnalytics', handleNavigateToAnalytics);
      window.removeEventListener('navigateToBoekerMaterials', handleNavigateToMaterials);
    };
  }, []);

  const fetchUserSchool = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setSchoolId(data[0].school_id);
      }
    } catch (error) {
      console.error('Error fetching school:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-gray-600">Geen school gevonden</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Boeker - Digitale Bibliotheek</h1>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setCurrentView('library')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'library'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Book className="w-4 h-4 inline mr-2" />
          Bibliotheek
        </button>
        <button
          onClick={() => setCurrentView('students')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'students'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Leerlingen
        </button>
        <button
          onClick={() => setCurrentView('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'analytics'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Statistieken
        </button>
        <button
          onClick={() => setCurrentView('materials')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'materials'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Materialen
        </button>
      </div>

      {currentView === 'library' && (
        <BookLibrary
          schoolId={schoolId}
          onViewStudent={(studentId) => {
            setSelectedStudentId(studentId);
            setCurrentView('students');
          }}
        />
      )}
      {currentView === 'students' && (
        <StudentBookManagement
          schoolId={schoolId}
          initialStudentId={selectedStudentId}
          onClearStudent={() => setSelectedStudentId(null)}
        />
      )}
      {currentView === 'analytics' && <BoekerAnalytics schoolId={schoolId} />}
      {currentView === 'materials' && <MaterialenTab schoolId={schoolId} />}
    </div>
  );
}
