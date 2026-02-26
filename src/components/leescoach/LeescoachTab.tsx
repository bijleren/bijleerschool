import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { LeescoachOverview } from './LeescoachOverview';
import { LeescoachCreateSession } from './LeescoachCreateSession';
import { LeescoachAnalytics } from './LeescoachAnalytics';
import { LeescoachStudentProfile } from './LeescoachStudentProfile';
import { LeescoachSettings } from './LeescoachSettings';

interface LeescoachTabProps {
  focusSchool: {
    id: string;
    name: string;
  } | null;
}

type View = 'overview' | 'create' | 'analytics' | 'student-profile' | 'settings';

export function LeescoachTab({ focusSchool }: LeescoachTabProps) {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  if (!focusSchool) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <BookOpen className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">Selecteer een school om te beginnen</p>
      </div>
    );
  }

  const handleNavigateToCreate = () => {
    setCurrentView('create');
  };

  const handleNavigateToOverview = () => {
    setCurrentView('overview');
    setSelectedStudentId(null);
  };

  const handleNavigateToAnalytics = () => {
    setCurrentView('analytics');
  };

  const handleNavigateToSettings = () => {
    setCurrentView('settings');
  };

  const handleNavigateToStudentProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCurrentView('student-profile');
  };

  const handleSessionCreated = () => {
    setCurrentView('overview');
  };

  return (
    <div className="h-full flex flex-col">
      {currentView === 'overview' && (
        <LeescoachOverview
          schoolId={focusSchool.id}
          onNavigateToCreate={handleNavigateToCreate}
          onNavigateToAnalytics={handleNavigateToAnalytics}
          onNavigateToSettings={handleNavigateToSettings}
          onNavigateToStudentProfile={handleNavigateToStudentProfile}
        />
      )}

      {currentView === 'create' && (
        <LeescoachCreateSession
          schoolId={focusSchool.id}
          onSessionCreated={handleSessionCreated}
          onCancel={handleNavigateToOverview}
        />
      )}

      {currentView === 'analytics' && (
        <LeescoachAnalytics
          schoolId={focusSchool.id}
          onNavigateBack={handleNavigateToOverview}
        />
      )}

      {currentView === 'student-profile' && selectedStudentId && (
        <LeescoachStudentProfile
          schoolId={focusSchool.id}
          studentId={selectedStudentId}
          onNavigateBack={handleNavigateToOverview}
          onNavigateToCreate={handleNavigateToCreate}
        />
      )}

      {currentView === 'settings' && (
        <LeescoachSettings
          schoolId={focusSchool.id}
          onNavigateBack={handleNavigateToOverview}
        />
      )}
    </div>
  );
}
