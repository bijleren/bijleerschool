import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { VersionModal } from '../ui/VersionModal';
import { GraduationCap, LogOut, User, ChevronDown, School, BarChart3, AlertTriangle, BookOpen, Plus, List, Settings, Info, Link, Grid2x2 as Grid, HelpCircle, Video, Newspaper, Wrench, Search, QrCode, GitBranch, Sparkles, Library, Star, Brain, MessageSquare, Bug, Lightbulb, X, Send, HandHelping } from 'lucide-react';

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
  onNavigateToBegeleiding: () => void;
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
  onNavigateToProfileFeedback?: () => void;
  focusSchool: { id: string; name: string } | null;
}

export function Header({ onNavigateToDashboard, onNavigateToProfile, onNavigateToSchools, onNavigateToBehavior, onNavigateToBehaviorWithSchool, onNavigateToTeaching, onNavigateToTeachingFAQ, onNavigateToTeachingVormingen, onNavigateToNieuwsbrief, onNavigateToBegeleiding, onNavigateToWebWijzer, onNavigateToActivityBoards, onNavigateToBoeker, onNavigateToLeescoach, onNavigateToZoeker, onNavigateToEDI, onNavigateToDigiTools, onNavigateToBlinkQR, onNavigateToSporen, onNavigateToExecutieveFuncties, onNavigateToOnboarding, onNavigateToProfileFeedback, focusSchool }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showAppsDropdown, setShowAppsDropdown] = useState(false);
  const [showDidactiekDropdown, setShowDidactiekDropdown] = useState(false);
  const [showSlimmeICTDropdown, setShowSlimmeICTDropdown] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [hasPremiumSchool, setHasPremiumSchool] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestie' | 'vraag'>('bug');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
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
      onNavigateToBehaviorWithSchool(focusSchool);
    } else {
      onNavigateToBehavior();
    }
  };

  const openFeedbackModal = () => {
    setFeedbackType('bug');
    setFeedbackTitle('');
    setFeedbackDescription('');
    setFeedbackSuccess(false);
    setShowFeedbackModal(true);
    setShowProfileDropdown(false);
  };

  const submitFeedback = async () => {
    if (!feedbackTitle.trim() || !feedbackDescription.trim()) return;
    setFeedbackSubmitting(true);
    try {
      await supabase.from('bug_reports').insert({
        type: feedbackType,
        title: feedbackTitle.trim().slice(0, 200),
        description: feedbackDescription.trim().slice(0, 5000),
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        locale: navigator.language,
        status: 'new',
      });
      setFeedbackSuccess(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setFeedbackSubmitting(false);
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
                  <div className="border-t border-gray-100 mx-3 my-1" />
                  <div className="px-3 py-1">
                    <p className="text-xs text-gray-400 font-medium px-2 pb-1">Meer van bijleer</p>
                    <a
                      href="https://woordenschat.be"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowAppsDropdown(false)}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <BookOpen className="w-4 h-4 mr-2 text-emerald-600" />
                      woordenschat.be
                    </a>
                    <a
                      href="https://kleuterdidactiek.be"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowAppsDropdown(false)}
                      className="w-full flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-pink-500" />
                      kleuterdidactiek.be
                    </a>
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
                    FAQ en Q&A
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
                  <button
                    onClick={() => {
                      onNavigateToBegeleiding();
                      setShowDidactiekDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HandHelping className="w-4 h-4 mr-3" />
                    Begeleiding
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

                  <button
                    onClick={openFeedbackModal}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 mr-3" />
                    Geef feedback
                  </button>

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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFeedbackModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-9 h-9 bg-blue-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Feedback of bug melden</h2>
                  <p className="text-xs text-gray-500">We lezen elke inzending</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    (onNavigateToProfileFeedback ?? onNavigateToProfile)();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <List className="w-3.5 h-3.5" />
                  Mijn meldingen
                </button>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {feedbackSuccess ? (
              <div className="px-6 py-12 text-center">
                <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mx-auto mb-4">
                  <Send className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bedankt!</h3>
                <p className="text-sm text-gray-500 mb-6">Je feedback is ontvangen. We bekijken het zo snel mogelijk.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sluiten
                  </button>
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false);
                      onNavigateToProfile();
                    }}
                    className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Bekijk mijn meldingen
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Soort melding</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'bug', label: 'Bug melden', icon: Bug, color: 'red' },
                      { value: 'suggestie', label: 'Idee / feedback', icon: Lightbulb, color: 'amber' },
                      { value: 'vraag', label: 'Vraag', icon: HelpCircle, color: 'blue' },
                    ] as const).map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFeedbackType(value)}
                        className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          feedbackType === value
                            ? color === 'red'
                              ? 'border-red-400 bg-red-50 text-red-700'
                              : color === 'amber'
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label>
                  <input
                    type="text"
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                    maxLength={200}
                    placeholder={
                      feedbackType === 'bug'
                        ? 'Korte omschrijving van het probleem'
                        : feedbackType === 'suggestie'
                        ? 'Kort idee of suggestie'
                        : 'Stel je vraag kort'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschrijving</label>
                  <textarea
                    value={feedbackDescription}
                    onChange={(e) => setFeedbackDescription(e.target.value)}
                    maxLength={5000}
                    rows={4}
                    placeholder={
                      feedbackType === 'bug'
                        ? 'Beschrijf wat er misging en hoe we het kunnen nabootsen...'
                        : feedbackType === 'suggestie'
                        ? 'Beschrijf je idee of feedback in detail...'
                        : 'Beschrijf je vraag zo duidelijk mogelijk...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={submitFeedback}
                    disabled={feedbackSubmitting || !feedbackTitle.trim() || !feedbackDescription.trim()}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {feedbackSubmitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Versturen...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Versturen
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}