import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { VersionModal } from '../ui/VersionModal';
import { GraduationCap, LogOut, User, ChevronDown, School, BarChart3, AlertTriangle, BookOpen, Plus, List, Settings, Info, Link, Grid2x2 as Grid, HelpCircle, Video, Newspaper, Wrench, Search, QrCode, GitBranch, Sparkles, Library, Star, Brain } from 'lucide-react';

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
  onNavigateToTeachingFAQ: () => void;
  onNavigateToTeachingVormingen: () => void;
  onNavigateToNieuwsbrief: () => void;
  onNavigateToWebWijzer: () => void;
  onNavigateToActivityBoards: () => void;
  onNavigateToBoeker: () => void;
  onNavigateToLeescoach: () => void;
  onNavigateToZoeker: () => void;
  onNavigateToEDI: () => void;
  onNavigateToDigiTools: () => void;
  onNavigateToBlinkQR: () => void;
  onNavigateToSporen: () => void;
  onNavigateToExecutieveFuncties: () => void;
  onNavigateToOnboarding?: () => void;
  focusSchool: { id: string; name: string } | null;
}

export function Header({ onNavigateToDashboard, onNavigateToProfile, onNavigateToSchools, onNavigateToBehavior, onNavigateToBehaviorWithSchool, onNavigateToTeaching, onNavigateToTeachingFAQ, onNavigateToTeachingVormingen, onNavigateToNieuwsbrief, onNavigateToWebWijzer, onNavigateToActivityBoards, onNavigateToBoeker, onNavigateToLeescoach, onNavigateToZoeker, onNavigateToEDI, onNavigateToDigiTools, onNavigateToBlinkQR, onNavigateToSporen, onNavigateToExecutieveFuncties, onNavigateToOnboarding, focusSchool }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showAppsDropdown, setShowAppsDropdown] = useState(false);
  const [showDidactiekDropdown, setShowDidactiekDropdown] = useState(false);
  const [showSlimmeICTDropdown, setShowSlimmeICTDropdown] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [hasPremiumSchool, setHasPremiumSchool] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const appsDropdownRef = useRef<HTMLDivElement>(null);
  const didactiekDropdownRef = useRef<HTMLDivElement>(null);
  const slimmeICTDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserSchools();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (appsDropdownRef.current && !appsDropdownRef.current.contains(event.target as Node)) {
        setShowAppsDropdown(false);
      }
      if (didactiekDropdownRef.current && !didactiekDropdownRef.current.contains(event.target as Node)) {
        setShowDidactiekDropdown(false);
      }
      if (slimmeICTDropdownRef.current && !slimmeICTDropdownRef.current.contains(event.target as Node)) {
        setShowSlimmeICTDropdown(false);
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
            name,
            premium_school
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved');

      if (error) throw error;
      setUserSchools(data || []);

      const hasPremium = data?.some((us: any) => us.schools?.premium_school === 1) || false;
      setHasPremiumSchool(hasPremium);
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
                <h1 className="text-xl font-bold text-gray-900">bijleer.school</h1>
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="flex items-center space-x-1 px-2 py-0.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  <span>V1.4</span>
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

            {/* Apps Dropdown */}
            <div className="relative" ref={appsDropdownRef}>
              <button
                onClick={() => setShowAppsDropdown(!showAppsDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
              >
                <Grid className="w-5 h-5" />
                <span>Leerapps</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAppsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Apps Dropdown Menu */}
              {showAppsDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* Direct App Links */}
                  <div className="px-3 py-2">
                    <div className="relative flex items-center group">
                      <button
                        onClick={() => {
                          handleBehaviorClick();
                          setShowAppsDropdown(false);
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('navigateToBehaviorIncidents'));
                          }, 100);
                        }}
                        className="flex-1 flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Gedrag
                      </button>
                      <button
                        onClick={() => {
                          if (focusSchool) {
                            onNavigateToBehaviorWithSchool(focusSchool);
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('navigateToBehaviorForm'));
                            }, 100);
                          } else {
                            onNavigateToBehavior();
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('navigateToBehaviorForm'));
                            }, 100);
                          }
                          setShowAppsDropdown(false);
                        }}
                        className="mr-2 w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                        title="Incident melden"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        onNavigateToSporen();
                        setShowAppsDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <GitBranch className="w-4 h-4 mr-2" />
                      Sporen
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToLeescoach();
                        setShowAppsDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Library className="w-4 h-4 mr-2" />
                      Leescoach
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToExecutieveFuncties();
                        setShowAppsDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Executieve Functies
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToEDI();
                        setShowAppsDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <GraduationCap className="w-4 h-4 mr-2" />
                      EDI
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToDigiTools();
                        setShowAppsDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      DigiTools
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Slim delen Dropdown */}
            <div className="relative" ref={slimmeICTDropdownRef}>
              <button
                onClick={() => setShowSlimmeICTDropdown(!showSlimmeICTDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
              >
                <Sparkles className="w-5 h-5" />
                <span>Slim delen</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSlimmeICTDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showSlimmeICTDropdown && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-3 py-2">
                    <div className="relative flex items-center">
                      <button
                        onClick={() => {
                          onNavigateToWebWijzer();
                          setShowSlimmeICTDropdown(false);
                        }}
                        className="flex-1 flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        WebWijzer
                      </button>
                      <button
                        onClick={() => {
                          onNavigateToWebWijzer();
                          setShowSlimmeICTDropdown(false);
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('navigateToWebWijzerCreate'));
                          }, 100);
                        }}
                        className="mr-2 w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                        title="Nieuwe content"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        onNavigateToBlinkQR();
                        setShowSlimmeICTDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      BlinkQR
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToBoeker();
                        setShowSlimmeICTDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Boeker
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToZoeker();
                        setShowSlimmeICTDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Zoeker
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToActivityBoards();
                        setShowSlimmeICTDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Grid className="w-4 h-4 mr-2" />
                      Activi-Tijd
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToDigiTools();
                        setShowSlimmeICTDropdown(false);
                      }}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      DigiTools
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={didactiekDropdownRef}>
              <button
                onClick={() => setShowDidactiekDropdown(!showDidactiekDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
              >
                <BookOpen className="w-5 h-5" />
                <span>Didactiek</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDidactiekDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDidactiekDropdown && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      onNavigateToTeaching();
                      setShowDidactiekDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 mr-3" />
                    Technieken
                  </button>
                  <button
                    onClick={() => {
                      onNavigateToTeachingFAQ();
                      setShowDidactiekDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 mr-3" />
                    FAQ
                  </button>
                  <button
                    onClick={() => {
                      onNavigateToTeachingVormingen();
                      setShowDidactiekDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Video className="w-4 h-4 mr-3" />
                    Vormingen
                  </button>
                  <button
                    onClick={() => {
                      onNavigateToNieuwsbrief();
                      setShowDidactiekDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Newspaper className="w-4 h-4 mr-3" />
                    Nieuwsbrief
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

                  {onNavigateToOnboarding && (
                    <button
                      onClick={() => {
                        onNavigateToOnboarding();
                        setShowProfileDropdown(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 mr-3" />
                      Aan de slag
                    </button>
                  )}

                  {!hasPremiumSchool && (
                    <button
                      onClick={() => {
                        navigate('/prijzen');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Star className="w-4 h-4 mr-3 text-amber-500" />
                      Upgrade naar premium
                    </button>
                  )}

                  <div className="border-t border-gray-100 my-1" />

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