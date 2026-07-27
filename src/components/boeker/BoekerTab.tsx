import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { BookLibrary } from './BookLibrary';
import { StudentBookManagement } from './StudentBookManagement';
import { BoekerAnalytics } from './BoekerAnalytics';
import { MaterialenTab } from '../materials/MaterialenTab';
import { QuickScanModal } from './QuickScanModal';
import { RecentActivity } from './RecentActivity';
import { Book, Users, BarChart3, Package, Scan, Activity, Tag, ChevronDown } from 'lucide-react';
import { BookDetailPage } from './BookDetailPage';
import { BookTagsSettings } from './BookTagsSettings';

type View = 'library' | 'students' | 'analytics' | 'materials' | 'activity' | 'tags' | 'book-detail';

interface School {
  id: string;
  name: string;
}

interface BoekerTabProps {
  focusSchool?: School | null;
  userSchools?: School[];
}

export function BoekerTab({ focusSchool, userSchools = [] }: BoekerTabProps) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>('library');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (focusSchool) {
      setSelectedSchool(focusSchool);
      setSchoolId(focusSchool.id);
      fetchIsAdmin(focusSchool.id);
      setLoading(false);
    } else {
      fetchUserSchool();
    }
  }, [user, focusSchool]);

  // When selected school changes (from switcher), update schoolId and reset view
  useEffect(() => {
    if (selectedSchool) {
      setSchoolId(selectedSchool.id);
      setCurrentView('library');
      setSelectedStudentId(null);
      setSelectedBookId(null);
      setRefreshTrigger(prev => prev + 1);
      fetchIsAdmin(selectedSchool.id);
    }
  }, [selectedSchool?.id]);

  const fetchIsAdmin = async (sid: string) => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_schools')
        .select('role')
        .eq('user_id', user.id)
        .eq('school_id', sid)
        .eq('is_active', true)
        .eq('status', 'approved')
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const handleNavigateToStudents = () => setCurrentView('students');
    const handleNavigateToAnalytics = () => setCurrentView('analytics');
    const handleNavigateToMaterials = () => setCurrentView('materials');
    const handleNavigateToBookDetail = (e: Event) => {
      const bookId = (e as CustomEvent).detail?.bookId;
      if (bookId) {
        setSelectedBookId(bookId);
        setCurrentView('book-detail');
      }
    };

    window.addEventListener('navigateToBoekerStudents', handleNavigateToStudents);
    window.addEventListener('navigateToBoekerAnalytics', handleNavigateToAnalytics);
    window.addEventListener('navigateToBoekerMaterials', handleNavigateToMaterials);
    window.addEventListener('navigateToBoekerBookDetail', handleNavigateToBookDetail);

    return () => {
      window.removeEventListener('navigateToBoekerStudents', handleNavigateToStudents);
      window.removeEventListener('navigateToBoekerAnalytics', handleNavigateToAnalytics);
      window.removeEventListener('navigateToBoekerMaterials', handleNavigateToMaterials);
      window.removeEventListener('navigateToBoekerBookDetail', handleNavigateToBookDetail);
    };
  }, []);

  const fetchUserSchool = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select('school_id, role, schools(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const school = (data[0].schools as unknown) as School;
        setSchoolId(data[0].school_id);
        setIsAdmin(data[0].role === 'admin');
        if (school) setSelectedSchool(school);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29"></div>
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
      {currentView !== 'book-detail' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Boeker - Digitale Bibliotheek</h1>
            {userSchools.length > 1 && (
              <div className="relative">
                <select
                  value={selectedSchool?.id ?? ''}
                  onChange={(e) => {
                    const school = userSchools.find(s => s.id === e.target.value);
                    if (school) setSelectedSchool(school);
                  }}
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 font-medium cursor-pointer hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {userSchools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              </div>
            )}
            {userSchools.length === 1 && selectedSchool && (
              <span className="text-sm text-gray-500 font-normal">{selectedSchool.name}</span>
            )}
          </div>
          <Button onClick={() => setShowQuickScan(true)} variant="primary">
            <Scan className="w-4 h-4 mr-2" />
            Snel Scannen
          </Button>
        </div>
      )}

      {currentView !== 'book-detail' && <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setCurrentView('library')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'library'
              ? 'text-#946B29 border-b-2 border-#946B29'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Book className="w-4 h-4 inline mr-2" />
          Bibliotheek
        </button>
        <button
          onClick={() => setCurrentView('materials')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'materials'
              ? 'text-#946B29 border-b-2 border-#946B29'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Materialen
        </button>
        <button
          onClick={() => setCurrentView('students')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'students'
              ? 'text-#946B29 border-b-2 border-#946B29'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Leerlingen
        </button>
        <button
          onClick={() => setCurrentView('activity')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'activity'
              ? 'text-#946B29 border-b-2 border-#946B29'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Activiteit
        </button>
        <button
          onClick={() => setCurrentView('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'analytics'
              ? 'text-#946B29 border-b-2 border-#946B29'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Statistieken
        </button>
        <button
          onClick={() => setCurrentView('tags')}
          className={`px-4 py-2 font-medium transition-colors ${
            currentView === 'tags'
              ? 'text-#946B29 border-b-2 border-#946B29'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Tag className="w-4 h-4 inline mr-2" />
          Tags
        </button>
      </div>}

      {currentView === 'book-detail' && selectedBookId && schoolId && (
        <BookDetailPage
          bookId={selectedBookId}
          schoolId={schoolId}
          isAdmin={isAdmin}
          onBack={() => setCurrentView('library')}
          onViewStudent={(studentId) => {
            setSelectedStudentId(studentId);
            setCurrentView('students');
          }}
        />
      )}

      {currentView === 'library' && (
        <BookLibrary
          schoolId={schoolId}
          onViewStudent={(studentId) => {
            setSelectedStudentId(studentId);
            setCurrentView('students');
          }}
          key={refreshTrigger}
        />
      )}
      {currentView === 'materials' && <MaterialenTab schoolId={schoolId} />}
      {currentView === 'students' && (
        <StudentBookManagement
          schoolId={schoolId}
          initialStudentId={selectedStudentId}
          onClearStudent={() => setSelectedStudentId(null)}
          key={refreshTrigger}
        />
      )}
      {currentView === 'activity' && (
        <RecentActivity
          schoolId={schoolId}
          onViewStudent={(studentId) => {
            setSelectedStudentId(studentId);
            setCurrentView('students');
          }}
        />
      )}
      {currentView === 'analytics' && <BoekerAnalytics schoolId={schoolId} key={refreshTrigger} />}
      {currentView === 'tags' && <BookTagsSettings schoolId={schoolId} />}

      {showQuickScan && (
        <QuickScanModal
          schoolId={schoolId}
          onClose={() => setShowQuickScan(false)}
          onBookProcessed={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}
