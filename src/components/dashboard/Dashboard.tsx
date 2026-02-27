import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { ZoekerTab } from '../zoeker/ZoekerTab';
import { BlinkQRTab } from '../blinkqr/BlinkQRTab';
import { SporenTab } from '../sporen/SporenTab';
import { LeescoachTab } from '../leescoach/LeescoachTab';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SchoolOnboarding } from '../onboarding/SchoolOnboarding';
import { OnboardingChecklist } from '../onboarding/OnboardingChecklist';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'schools' | 'behavior' | 'teaching' | 'schoolday' | 'webwijzer' | 'activityboards' | 'boeker' | 'zoeker' | 'edi' | 'digitools' | 'newsletter' | 'blinkqr' | 'sporen' | 'leescoach' | 'onboarding'>('dashboard');
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

    // Check for URL parameters to set the active tab
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    const subtabParam = queryParams.get('subtab');
    const schoolIdParam = queryParams.get('schoolId');
    const groupIdParam = queryParams.get('groupId');
    const studentIdParam = queryParams.get('studentId');

    if (tabParam) {
      const validTabs = ['dashboard', 'profile', 'schools', 'behavior', 'teaching', 'schoolday', 'webwijzer', 'activityboards', 'boeker', 'zoeker', 'edi', 'digitools', 'newsletter', 'blinkqr', 'sporen', 'leescoach'];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam as typeof activeTab);

        // Handle teaching subtab
        if (tabParam === 'teaching' && subtabParam) {
          const validSubtabs = ['technieken', 'faq', 'vormingen', 'newsletter'];
          if (validSubtabs.includes(subtabParam)) {
            setTeachingPageOverride(subtabParam as typeof teachingPageOverride);
          }
        }

        // Handle combined parameters
        if (tabParam === 'schools') {
          if (schoolIdParam && groupIdParam) {
            // Navigate to specific school and group
            handleNavigateToSchoolAndGroup(schoolIdParam, groupIdParam);
          } else if (schoolIdParam && studentIdParam) {
            // Navigate to specific school and student
            handleNavigateToSchoolAndStudent(schoolIdParam, studentIdParam);
          } else if (schoolIdParam) {
            // Navigate to just the school
            handleNavigateToSchoolById(schoolIdParam);
          } else if (groupIdParam) {
            // Navigate to group (fetch school from group data)
            handleNavigateToGroupById(groupIdParam);
          } else if (studentIdParam) {
            // Navigate to student (fetch school from student data)
            handleNavigateToStudentById(studentIdParam);
          }
        }

        // Clear the URL parameters after setting the tab
        navigate(location.pathname, { replace: true });
      }
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
      const { incidentId, schoolId, studentId } = event.detail;

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
      // Store the student ID to filter by
      if (studentId) {
        sessionStorage.setItem('behaviorFilterStudent', studentId);
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
  }, [user, location.search]);

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

  const handleNavigateToOnboarding = () => {
    setActiveTab('onboarding');
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

  const handleNavigateToLeescoach = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('leescoach');
  };

  const handleNavigateToZoeker = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('zoeker');
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

  const handleNavigateToBlinkQR = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('blinkqr');
  };

  const handleNavigateToSporen = () => {
    setSelectedSchool(null);
    setSelectedStudent(null);
    setSelectedGroup(null);
    setActiveTab('sporen');
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

  const handleNavigateToSchoolById = async (schoolId: string) => {
    try {
      // Fetch school data
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (schoolError) throw schoolError;

      if (school) {
        setSelectedSchool(school);
        setSelectedGroup(null);
        setSelectedStudent(null);
        setActiveTab('schools');
      }
    } catch (error) {
      console.error('Error navigating to school by ID:', error);
    }
  };

  const handleNavigateToGroupById = async (groupId: string) => {
    try {
      // Fetch group data with school info
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*, schools(*)')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      if (group && group.schools) {
        setSelectedSchool(group.schools);
        setSelectedGroup({
          id: group.id,
          name: group.name,
          description: group.description,
          grade_level: group.grade_level,
          school_year: group.school_year,
          is_active: group.is_active,
          created_at: group.created_at
        });
        setSelectedStudent(null);
        setActiveTab('schools');
      }
    } catch (error) {
      console.error('Error navigating to group by ID:', error);
    }
  };

  const handleNavigateToStudentById = async (studentId: string) => {
    try {
      // Fetch student data with school info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*, schools(*)')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      if (student && student.schools) {
        setSelectedSchool(student.schools);
        setSelectedStudent({
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number,
          grade_level: student.grade_level,
          date_of_birth: student.date_of_birth,
          is_active: student.is_active,
          created_at: student.created_at
        });
        setSelectedGroup(null);
        setActiveTab('schools');
      }
    } catch (error) {
      console.error('Error navigating to student by ID:', error);
    }
  };

  const handleNavigateToSchoolAndGroup = async (schoolId: string, groupId: string) => {
    try {
      // Fetch both school and group data
      const [schoolResult, groupResult] = await Promise.all([
        supabase.from('schools').select('*').eq('id', schoolId).single(),
        supabase.from('groups').select('*').eq('id', groupId).eq('school_id', schoolId).single()
      ]);

      if (schoolResult.error) throw schoolResult.error;
      if (groupResult.error) throw groupResult.error;

      const school = schoolResult.data;
      const group = groupResult.data;

      if (school && group) {
        setSelectedSchool(school);
        setSelectedGroup({
          id: group.id,
          name: group.name,
          description: group.description,
          grade_level: group.grade_level,
          school_year: group.school_year,
          is_active: group.is_active,
          created_at: group.created_at
        });
        setSelectedStudent(null);
        setActiveTab('schools');
      }
    } catch (error) {
      console.error('Error navigating to school and group:', error);
    }
  };

  const handleNavigateToSchoolAndStudent = async (schoolId: string, studentId: string) => {
    try {
      // Fetch both school and student data
      const [schoolResult, studentResult] = await Promise.all([
        supabase.from('schools').select('*').eq('id', schoolId).single(),
        supabase.from('students').select('*').eq('id', studentId).eq('school_id', schoolId).single()
      ]);

      if (schoolResult.error) throw schoolResult.error;
      if (studentResult.error) throw studentResult.error;

      const school = schoolResult.data;
      const student = studentResult.data;

      if (school && student) {
        setSelectedSchool(school);
        setSelectedStudent({
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number,
          grade_level: student.grade_level,
          date_of_birth: student.date_of_birth,
          is_active: student.is_active,
          created_at: student.created_at
        });
        setSelectedGroup(null);
        setActiveTab('schools');
      }
    } catch (error) {
      console.error('Error navigating to school and student:', error);
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
        onNavigateToWebWijzer={handleNavigateToWebWijzer}
        onNavigateToActivityBoards={handleNavigateToActivityBoards}
        onNavigateToBoeker={handleNavigateToBoeker}
        onNavigateToLeescoach={handleNavigateToLeescoach}
        onNavigateToZoeker={handleNavigateToZoeker}
        onNavigateToEDI={handleNavigateToEDI}
        onNavigateToDigiTools={handleNavigateToDigiTools}
        onNavigateToBlinkQR={handleNavigateToBlinkQR}
        onNavigateToSporen={handleNavigateToSporen}
        onNavigateToOnboarding={handleNavigateToOnboarding}
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
            onNavigateToZoeker={handleNavigateToZoeker}
            onNavigateToBlinkQR={handleNavigateToBlinkQR}
            onNavigateToOnboarding={handleNavigateToOnboarding}
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
        {activeTab === 'webwijzer' && <WebWijzerTab focusSchool={focusSchool} />}
        {activeTab === 'boeker' && <BoekerTab />}
        {activeTab === 'zoeker' && <ZoekerTab />}
        {activeTab === 'edi' && <EDITab />}
        {activeTab === 'digitools' && <DigiToolsTab />}
        {activeTab === 'blinkqr' && <BlinkQRTab />}
        {activeTab === 'sporen' && <SporenTab focusSchool={focusSchool} />}
        {activeTab === 'leescoach' && <LeescoachTab focusSchool={focusSchool} />}
        {activeTab === 'activityboards' && <ActivityBoardsTab onFullscreenChange={setIsFullscreen} />}
        {activeTab === 'onboarding' && (
          <OnboardingChecklist
            focusSchool={focusSchool}
            onNavigateToSchools={handleNavigateToSchools}
            onNavigateToWebWijzer={handleNavigateToWebWijzer}
          />
        )}
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