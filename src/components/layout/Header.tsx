import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { VersionModal } from '../ui/VersionModal';
import { GraduationCap, LogOut, User, ChevronDown, School, BarChart3, AlertTriangle, BookOpen, Calendar, Plus, List, Settings, Info, Link } from 'lucide-react';

interface HeaderProps {
  onNavigateToDashboard: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSchools: () => void;
  onNavigateToBehavior: () => void;
  onNavigateToTeaching: () => void;
  onNavigateToSchoolDay: () => void;
  onNavigateToWebWijzer: () => void;
}

interface UserSchool {
  id: string;
  schools: {
    id: string;
    name: string;
  };
}

interface HeaderProps {
  onNavigateToDashboard: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSchools: () => void;
  onNavigateToBehavior: () => void;
  onNavigateToBehaviorWithSchool: (school: { id: string; name: string }) => void;
  onNavigateToTeaching: () => void;
  onNavigateToSchoolDay: () => void;
  focusSchool: { id: string; name: string } | null;
}

export function Header({ onNavigateToDashboard, onNavigateToProfile, onNavigateToSchools, onNavigateToBehavior, onNavigateToBehaviorWithSchool, onNavigateToTeaching, onNavigateToSchoolDay, onNavigateToWebWijzer, focusSchool }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showBehaviorDropdown, setShowBehaviorDropdown] = useState(false);
  const [showWebWijzerDropdown, setShowWebWijzerDropdown] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const behaviorDropdownRef = useRef<HTMLDivElement>(null);
  const webwijzerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserSchools();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (behaviorDropdownRef.current && !behaviorDropdownRef.current.contains(event.target as Node)) {
        setShowBehaviorDropdown(false);
      }
      if (webwijzerDropdownRef.current && !webwijzerDropdownRef.current.contains(event.target as Node)) {
        setShowWebWijzerDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          id,
          schools (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved');

      if (error) throw error;
      setUserSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const getSchoolNavText = () => {
    if (userSchools.length === 0) return 'Mijn School';
    if (userSchools.length === 1) return 'Mijn School';
    return 'Mijn Scholen';
  };

  const handleBehaviorClick = () => {
    if (focusSchool) {
      // Use focus school for behavior navigation
      onNavigateToBehaviorWithSchool(focusSchool);
    } else {
      // Fallback to behavior selection if no focus school
      onNavigateToBehavior();
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-900">BijleerSchool</h1>
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="flex items-center space-x-1 px-2 py-0.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  <span>V1.1</span>
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-gray-500">Didactische toolkit</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-8">
            <button
              onClick={onNavigateToDashboard}
              className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            {/* Behavior Dropdown */}
            <div className="relative" ref={behaviorDropdownRef}>
              <button
                onClick={() => setShowBehaviorDropdown(!showBehaviorDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Gedrag</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showBehaviorDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Behavior Dropdown Menu */}
              {showBehaviorDropdown && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      if (focusSchool) {
                        // Use focus school for incident reporting
                        onNavigateToBehaviorWithSchool(focusSchool);
                        // Navigate directly to form view  
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('navigateToBehaviorForm'));
                        }, 100);
                      } else {
                        // Fallback to behavior selection if no focus school
                        onNavigateToBehavior();
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('navigateToBehaviorForm'));
                        }, 100);
                      }
                      setShowBehaviorDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-3" />
                    Incident melden
                  </button>
                  
                  <button
                    onClick={() => {
                      handleBehaviorClick();
                      setShowBehaviorDropdown(false);
                      // Navigate to incidents list view (default)
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('navigateToBehaviorIncidents'));
                      }, 100);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <List className="w-4 h-4 mr-3" />
                    Incidenten
                  </button>
                  
                  <button
                    onClick={() => {
                      handleBehaviorClick();
                      setShowBehaviorDropdown(false);
                      // Navigate to analytics view
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('navigateToBehaviorAnalytics'));
                      }, 100);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    Analyses
                  </button>
                  
                  <button
                    onClick={() => {
                      handleBehaviorClick();
                      setShowBehaviorDropdown(false);
                      // Navigate to settings view
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('navigateToBehaviorSettings'));
                      }, 100);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Instellingen
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onNavigateToTeaching}
              className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
            >
              <BookOpen className="w-5 h-5" />
              <span>Didactiek</span>
            </button>

            <button
              onClick={onNavigateToSchoolDay}
              className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
            >
              <Calendar className="w-5 h-5" />
              <span>Schooldag</span>
            </button>

            {/* WebWijzer Dropdown */}
            <div className="relative" ref={webwijzerDropdownRef}>
              <button
                onClick={() => setShowWebWijzerDropdown(!showWebWijzerDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
              >
                <Link className="w-5 h-5" />
                <span>WebWijzer</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showWebWijzerDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* WebWijzer Dropdown Menu */}
              {showWebWijzerDropdown && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      onNavigateToWebWijzer();
                      setShowWebWijzerDropdown(false);
                      // Navigate directly to form view
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('navigateToWebWijzerCreate'));
                      }, 100);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-3" />
                    Nieuwe content
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToWebWijzer();
                      setShowWebWijzerDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <List className="w-4 h-4 mr-3" />
                    Content beheren
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToWebWijzer();
                      setShowWebWijzerDropdown(false);
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('navigateToStudentWebWijzer'));
                      }, 100);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Leerling WebWijzer
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToWebWijzer();
                      setShowWebWijzerDropdown(false);
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('navigateToWebWijzerAnalytics'));
                      }, 100);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    Analytics
                  </button>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      onNavigateToSchools();
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <School className="w-4 h-4 mr-3" />
                    {getSchoolNavText()}
                  </button>
                  
                  <button
                    onClick={() => {
                      onNavigateToProfile();
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Mijn Profiel
                  </button>
                  
                  <button
                    onClick={() => {
                      signOut();
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Uitloggen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Version Modal */}
      <VersionModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
      />
    </header>
  );
}