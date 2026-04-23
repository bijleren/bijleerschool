import React, { useState } from 'react';
import { Brain, LayoutGrid } from 'lucide-react';
import { ExecutieveFunctiesOverview } from './ExecutieveFunctiesOverview';
import { StudentEFProfile } from './StudentEFProfile';
import { EFSchoolAnalytics } from './EFSchoolAnalytics';
import { GedragskaartTab } from '../gedragskaart/GedragskaartTab';

interface School {
  id: string;
  name: string;
}

interface ExecutieveFunctiesTabProps {
  focusSchool: School | null;
}

type View = 'overview' | 'student' | 'analytics' | 'gedragskaart';

export function ExecutieveFunctiesTab({ focusSchool }: ExecutieveFunctiesTabProps) {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  if (!focusSchool) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Brain className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecteer een school om te beginnen</p>
      </div>
    );
  }

  const handleNavigateToStudent = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setCurrentView('student');
  };

  const handleNavigateToOverview = () => {
    setCurrentView('overview');
    setSelectedStudentId(null);
    setSelectedStudentName('');
  };

  const handleNavigateToAnalytics = () => {
    setCurrentView('analytics');
  };

  if (currentView === 'gedragskaart') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleNavigateToOverview}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Brain className="w-4 h-4" />
            Executieve Functies
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            Gedragskaarten
          </span>
        </div>
        <GedragskaartTab focusSchool={focusSchool} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {currentView === 'overview' && (
        <ExecutieveFunctiesOverview
          schoolId={focusSchool.id}
          schoolName={focusSchool.name}
          onNavigateToStudent={handleNavigateToStudent}
          onNavigateToAnalytics={handleNavigateToAnalytics}
          onNavigateToGedragskaart={() => setCurrentView('gedragskaart')}
        />
      )}

      {currentView === 'student' && selectedStudentId && (
        <StudentEFProfile
          schoolId={focusSchool.id}
          studentId={selectedStudentId}
          studentName={selectedStudentName}
          onNavigateBack={handleNavigateToOverview}
        />
      )}

      {currentView === 'analytics' && (
        <EFSchoolAnalytics
          schoolId={focusSchool.id}
          schoolName={focusSchool.name}
          onNavigateBack={handleNavigateToOverview}
          onNavigateToStudent={handleNavigateToStudent}
        />
      )}
    </div>
  );
}
