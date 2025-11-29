import React, { useState, useEffect } from 'react';
import { Header } from '../layout/Header';
import { DashboardTab } from './DashboardTab';
import { ProfileTab } from '../profile/ProfileTab';
import { SchoolsTab } from '../schools/SchoolsTab';
import { SchoolDetail } from '../schools/SchoolDetail';
import { StudentDetail } from '../schools/StudentDetail';
import { GroupDetail } from '../schools/GroupDetail';
import { BehaviorTab } from '../behavior/BehaviorTab';
import { TeachingTab } from '../teaching/TeachingTab';
import { SchoolDayTab } from '../schoolday/SchoolDayTab';
import { WebWijzerTab } from '../webwijzer/WebWijzerTab';
import { ActivityBoardsTab } from '../activityboard/ActivityBoardsTab';
import { BoekerTab } from '../boeker/BoekerTab';
import { EDITab } from '../edi/EDITab';
import { DigiToolsTab } from '../digitools/DigiToolsTab';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SchoolOnboarding } from '../onboarding/SchoolOnboarding';

interface School {
  id: string;
  name: string;
  school_code: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
  date_of_birth: string | null;
  is_active: boolean;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  school_year: string | null;
  is_active: boolean;
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'schools' | 'behavior' | 'teaching' | 'schoolday' | 'webwijzer' | 'activityboards' | 'boeker' | 'edi' | 'digitools' | 'newsletter'>('dashboard');
  const [teachingPageOverride, setTeachingPageOverride] = useState<'technieken' | 'faq' | 'vormingen' | 'newsletter'>('technieken');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [userSchools, setUserSchools] = useState<School[]>([]);
  const [focusSchool, setFocusSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [behaviorFilter, setBehaviorFilter] = useState<'all' | 'today' | 'open' | 'followup'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserSchools();
    }

    // Check if there's a technique ID from a shared link
    const techniqueId = sessionStorage.getItem('selectedTechniqueId');
    if (techniqueId) {
      // Don't remove it yet - let TeachingTab handle it
      setActiveTab('teaching');
      setTeachingPageOverride('technieken');
    }

    // Listen for navigation events from schoolday
    const handleNavigateToBehavior = (event: CustomEvent) => {
      const { schoolId, preloadData } = event.detail;
      const school = userSchools.find(s => s.id === schoolId);
      if (school) {
        setSelectedSchool(school);
        setSelectedStudent(null);
        setSelectedGroup(null);
        setActiveTab('behavior');
        
        // Store preload data for behavior form
        if (preloadData) {
          sessionStorage.setItem('behaviorPreloadData', JSON.stringify(preloadData));
        }
      }
    };
    
    window.addEventListener('navigateToBehavior', handleNavigateToBehavior as EventListener);
    
    // Listen for navigation events to technique detail
    const handleNavigateToTechnique = (event: CustomEvent) => {
      const { techniqueId } = event.detail;
      // Navigate directly to technique detail
      handleNavigateToTechniqueDetail(techniqueId);
    };
    
    window.addEventListener('navigateToTechnique', handleNavigateToTechnique as EventListener);

    // Listen for navigation events from SchoolDetail
    const handleNavigateToStudentDetail = (event: CustomEvent) => {
      const { studentId, schoolId } = event.detail;
      console.log('Dashboard received student navigation event:', studentId, schoolId);
      handleNavigateToStudent(schoolId, studentId);
    };

    const handleNavigateToGroupDetail = (event: CustomEvent) => {
      const { groupId, schoolId } = event.detail;
      console.log('Dashboard received group navigation event:', groupId, schoolId);
      handleNavigateToGroup(schoolId, groupId);
    };

    // Listen for navigation to behavior from incident cards
    const handleNavigateToBehaviorFromIncident = async (event: CustomEvent) => {
      const { incidentId, schoolId } = event.detail;

      // If schoolId is provided, fetch and set that school
      if (schoolId) {
        try {
          const { data: school, error } = await supabase
            .from('schools')
            .select('*')
            .eq('id', schoolId)
            .single();

          if (error) throw error;
          setSelectedSchool(school);
        } catch (error) {
          console.error('Error fetching school:', error);
          setSelectedSchool(focusSchool);
        }
      } else {
        setSelectedSchool(focusSchool);
      }

      setSelectedStudent(null);
      setSelectedGroup(null);
      setBehaviorFilter('all');
      setActiveTab('behavior');
      // Store the incident ID to scroll to or highlight it
      if (incidentId) {
        sessionStorage.setItem('highlightIncidentId', incidentId);
      }
    };

    window.addEventListener('navigateToStudentDetail', handleNavigateToStudentDetail as EventListener);
    window.addEventListener('navigateToGroupDetail', handleNavigateToGroupDetail as EventListener);
    window.addEventListener('navigate-to-behavior', handleNavigateToBehaviorFromIncident as EventListener);

    return () => {
      window.removeEventListener('navigateToBehavior', handleNavigateToBehavior as EventListener);
      window.removeEventListener('navigateToTechnique', handleNavigateToTechnique as EventListener);
      window.removeEventListener('navigateToStudentDetail', handleNavigateToStudentDetail as EventListener);
      window.removeEventListener('navigateToGroupDetail', handleNavigateToGroupDetail as EventListener);
      window.removeEventListener('navigate-to-behavior', handleNavigateToBehaviorFromIncident as EventListener);
    };
  }, [user]);

  const fetchUserSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          schools (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true);

      if (error) throw error;

      const schools = data?.map(us => us.schools).filter(Boolean) || [];
      setUserSchools(schools);

      // Check if user has any schools
      if (schools.length === 0) {
        setShowOnboarding(true);
      } else if (schools.length === 1 && !selectedSchool) {
        // Auto-select first school if user has only one school
        setSelectedSchool(schools[0]);
        setFocusSchool(schools[0]);
        setShowOnboarding(false);
      } else if (schools.length > 1 && !focusSchool) {
        // Auto-select first school as focus school if user has multiple schools
        setFocusSchool(schools[0]);
        setShowOnboarding(false);
      } else {
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error fetching user schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToDashboard = () => {
    setActiveTab('dashboard');
  };

  const handleNavigateToProfile = () => {
    setActiveTab('profile');
  };

  const handleNavigateToSchools = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('schools');
  };

  const handleNavigateToBehavior = (filter: 'all' | 'today' | 'open' | 'followup' = 'all') => {
    setSelectedSchool(focusSchool);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setBehaviorFilter(filter);
    setActiveTab('behavior');
  };

  const handleNavigateToTeaching = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('teaching');
    setTeachingPageOverride('technieken');
  };

  const handleNavigateToTeachingFAQ = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('teaching');
    setTeachingPageOverride('faq');
  };

  const handleNavigateToTeachingVormingen = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('teaching');
    setTeachingPageOverride('vormingen');
  };

  const handleNavigateToSchoolDay = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('schoolday');
  };

  const handleNavigateToWebWijzer = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('webwijzer');
  };

  const handleNavigateToActivityBoards = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('activityboards');
  };

  const handleNavigateToBoeker = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('boeker');
  };

  const handleNavigateToEDI = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('edi');
  };

  const handleNavigateToDigiTools = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('digitools');
  };

  const handleNavigateToNewsletter = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('teaching');
    setTeachingPageOverride('newsletter');
  };

  const handleNavigateToBehaviorWithSchool = (school: { id: string; name: string }) => {
    // Use focus school instead of passed school
    setSelectedSchool(focusSchool);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('behavior');
  };

  const handleNavigateToBehaviorWithStudent = async (schoolId: string, studentId: string) => {
    try {
      // Fetch school data
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (schoolError) throw schoolError;

      // Set the school and navigate to behavior tab with pre-selected student
      setSelectedSchool(school);
      setSelectedStudent(null);
      setSelectedGroup(null);
      setActiveTab('behavior');
      
      // Store the student ID for the behavior form to use
      sessionStorage.setItem('preselectedStudentId', studentId);
    } catch (error) {
      console.error('Error navigating to behavior with student:', error);
    }
  };

  const handleSchoolSelect = (school: School) => {
    setSelectedSchool(school);
  };

  const handleNavigateToTechniqueDetail = async (techniqueId: string) => {
    try {
      // Fetch the technique data
      const { data: technique, error } = await supabase
        .from('teaching_techniques')
        .select(`
          *,
          profiles (first_name, last_name),
          teaching_technique_age_groups (
            age_groups (*)
          ),
          teaching_technique_subjects (
            subjects (*)
          ),
          teaching_technique_materials (
            materials (*)
          ),
          teaching_technique_categories (
            technique_categories (*)
          )
        `)
        .eq('id', techniqueId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      // Navigate to teaching tab and show technique detail
      setActiveTab('teaching');
      // Store the technique data for the teaching tab to use
      sessionStorage.setItem('selectedTechniqueData', JSON.stringify(technique));
    } catch (error) {
      console.error('Error fetching technique:', error);
      // Fallback to teaching tab
      setActiveTab('teaching');
    }
  };

  const handleNavigateToStudent = async (schoolId: string, studentId: string) => {
    try {
      // Fetch school data
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (schoolError) throw schoolError;

      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      setSelectedSchool(school);
      setSelectedStudent(student);
      setSelectedGroup(null);
      setActiveTab('schools');
    } catch (error) {
      console.error('Error navigating to student:', error);
    }
  };

  const handleNavigateToGroup = async (schoolId: string, groupId: string) => {
    try {
      // Fetch school data
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (schoolError) throw schoolError;

      // Fetch group data
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      setSelectedSchool(school);
      setSelectedGroup(group);
      setSelectedStudent(null);
      setActiveTab('schools');
    } catch (error) {
      console.error('Error navigating to group:', error);
    }
  };

  const handleSchoolConnected = () => {
    // Refresh user schools and hide onboarding
    fetchUserSchools();
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">BijleerSchool wordt geladen...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if user has no schools
  if (showOnboarding) {
    return <SchoolOnboarding onSchoolConnected={handleSchoolConnected} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isFullscreen && (
        <Header
        onNavigateToDashboard={handleNavigateToDashboard}
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToSchools={handleNavigateToSchools}
        onNavigateToBehavior={handleNavigateToBehavior}
        onNavigateToBehaviorWithSchool={handleNavigateToBehaviorWithSchool}
        onNavigateToTeaching={handleNavigateToTeaching}
        onNavigateToTeachingFAQ={handleNavigateToTeachingFAQ}
        onNavigateToTeachingVormingen={handleNavigateToTeachingVormingen}
        onNavigateToNieuwsbrief={handleNavigateToNewsletter}
        onNavigateToSchoolDay={handleNavigateToSchoolDay}
        onNavigateToWebWijzer={handleNavigateToWebWijzer}
        onNavigateToActivityBoards={handleNavigateToActivityBoards}
        onNavigateToBoeker={handleNavigateToBoeker}
        onNavigateToEDI={handleNavigateToEDI}
        onNavigateToDigiTools={handleNavigateToDigiTools}
        focusSchool={focusSchool}
      />
      )}
      <main className={isFullscreen ? '' : 'p-8'}>
        {activeTab === 'dashboard' && (
          <DashboardTab
            onNavigateToStudent={handleNavigateToStudent}
            onNavigateToGroup={handleNavigateToGroup}
            onNavigateToSchools={handleNavigateToSchools}
            onNavigateToBehaviorWithStudent={handleNavigateToBehaviorWithStudent}
            onNavigateToBehavior={handleNavigateToBehavior}
            onNavigateToTeaching={handleNavigateToTeaching}
            onNavigateToTeachingFAQ={handleNavigateToTeachingFAQ}
            onNavigateToTeachingVormingen={handleNavigateToTeachingVormingen}
            onNavigateToNieuwsbrief={handleNavigateToNewsletter}
            onNavigateToEDI={handleNavigateToEDI}
            onNavigateToWebWijzer={handleNavigateToWebWijzer}
            onNavigateToActivityBoards={handleNavigateToActivityBoards}
            onNavigateToBoeker={handleNavigateToBoeker}
            userSchools={userSchools}
            focusSchool={focusSchool}
            onFocusSchoolChange={setFocusSchool}
          />
        )}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'schools' && !selectedSchool && <SchoolsTab />}
        {activeTab === 'behavior' && (
          <BehaviorTab
            selectedSchool={selectedSchool}
            userSchools={userSchools}
            onSchoolSelect={handleSchoolSelect}
            onNavigateToStudent={handleNavigateToStudent}
            initialFilter={behaviorFilter}
            onFilterChange={setBehaviorFilter}
          />
        )}
        {activeTab === 'teaching' && <TeachingTab key={teachingPageOverride} initialPage={teachingPageOverride} />}
        {activeTab === 'schoolday' && <SchoolDayTab />}
        {activeTab === 'webwijzer' && <WebWijzerTab />}
        {activeTab === 'boeker' && <BoekerTab />}
        {activeTab === 'edi' && <EDITab />}
        {activeTab === 'digitools' && <DigiToolsTab />}
        {activeTab === 'activityboards' && <ActivityBoardsTab onFullscreenChange={setIsFullscreen} />}
        {activeTab === 'schools' && selectedSchool && !selectedStudent && !selectedGroup && (
          <SchoolDetail
            school={selectedSchool}
            onBack={() => setSelectedSchool(null)}
            onSchoolUpdated={(updatedSchool) => setSelectedSchool(updatedSchool)}
            onNavigateToStudent={(studentId: string, schoolId: string) => handleNavigateToStudent(schoolId, studentId)}
            onNavigateToGroup={(groupId: string, schoolId: string) => handleNavigateToGroup(schoolId, groupId)}
          />
        )}
        {activeTab === 'schools' && selectedSchool && selectedStudent && (
          <StudentDetail
            student={selectedStudent}
            schoolId={selectedSchool.id}
            onBack={() => setSelectedStudent(null)}
            onStudentUpdated={(updatedStudent) => setSelectedStudent(updatedStudent)}
          />
        )}
        {activeTab === 'schools' && selectedSchool && selectedGroup && (
          <GroupDetail
            group={selectedGroup}
            schoolId={selectedSchool.id}
            onBack={() => setSelectedGroup(null)}
            onGroupUpdated={(updatedGroup) => setSelectedGroup(updatedGroup)}
          />
        )}
      </main>
    </div>
  );
}