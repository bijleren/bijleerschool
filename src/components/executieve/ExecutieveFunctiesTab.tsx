import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { ExecutieveFunctiesOverview } from './ExecutieveFunctiesOverview';
import { StudentEFProfile } from './StudentEFProfile';
import { EFSchoolAnalytics } from './EFSchoolAnalytics';

interface School {
  id: string;
  name: string;
}

interface ExecutieveFunctiesTabProps {
  focusSchool: School | null;
}

type View = 'overview' | 'student' | 'analytics';

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

  return (
    <div className="h-full flex flex-col">
      {currentView === 'overview' && (
        <ExecutieveFunctiesOverview
          schoolId={focusSchool.id}
          schoolName={focusSchool.name}
          onNavigateToStudent={handleNavigateToStudent}
          onNavigateToAnalytics={handleNavigateToAnalytics}
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
