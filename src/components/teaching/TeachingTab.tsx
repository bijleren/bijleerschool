import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { TeachingTechniqueForm } from './TeachingTechniqueForm';
import { TeachingTechniqueDetail } from './TeachingTechniqueDetail';
import { TeachingManagement } from './TeachingManagement';
import { TeachingAnalytics } from './TeachingAnalytics';
import { TeachingUsageLog } from './TeachingUsageLog';
import { DidactiekFAQ } from './DidactiekFAQ';
import { DidactiekVormingen } from './DidactiekVormingen';
import { NieuwsbriefTab } from '../nieuwsbrief/NieuwsbriefTab';
import { BookOpen, Plus, Search, Filter, Settings, Play, ExternalLink, Users, BookMarked, Wrench, BarChart3, Clock, CreditCard as Edit, HelpCircle, Video, FileText, Lock, Info } from 'lucide-react';

interface AgeGroup {
  id: string;
  name: string;
  description: string | null;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

interface Material {
  id: string;
  name: string;
  description: string | null;
}

interface TechniqueCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface TeachingTechnique {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  photo_url: string | null;
  student_video_url: string | null;
  teacher_video_url: string | null;
  external_links: any;
  created_by: string;
  is_active: boolean;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
  teaching_technique_age_groups: {
    age_groups: AgeGroup;
  }[];
  teaching_technique_subjects: {
    subjects: Subject;
  }[];
  teaching_technique_materials: {
    materials: Material;
  }[];
  teaching_technique_categories: {
    technique_categories: TechniqueCategory;
  }[];
}

interface UserSchool {
  id: string;
  name: string;
}

interface TeachingTabProps {
  initialPage?: 'technieken' | 'faq' | 'vormingen' | 'newsletter';
}

export function TeachingTab({ initialPage = 'technieken' }: TeachingTabProps = {}) {
  const { user } = useAuth();
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [activePage, setActivePage] = useState<'technieken' | 'faq' | 'vormingen' | 'newsletter'>(initialPage);
  const [activeView, setActiveView] = useState<'list' | 'form' | 'detail' | 'management' | 'analytics'>('list');
  const [techniques, setTechniques] = useState<TeachingTechnique[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [techniqueCategories, setTechniqueCategories] = useState<TechniqueCategory[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<TeachingTechnique | null>(null);
  const [editingTechnique, setEditingTechnique] = useState<TeachingTechnique | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchUserSchools();
    fetchData();
    checkAdminStatus();

    // Check if there's a preselected technique data from navigation
    const selectedTechniqueData = sessionStorage.getItem('selectedTechniqueData');
    if (selectedTechniqueData) {
      try {
        const technique = JSON.parse(selectedTechniqueData);
        // Clear the session storage
        sessionStorage.removeItem('selectedTechniqueData');
        // Show the technique detail immediately
        setSelectedTechnique(technique);
        setActiveView('detail');
      } catch (error) {
        console.error('Error parsing technique data:', error);
        sessionStorage.removeItem('selectedTechniqueData');
      }
    }

    // Check if there's a technique ID from a shared link
    const techniqueId = sessionStorage.getItem('selectedTechniqueId');
    if (techniqueId) {
      sessionStorage.removeItem('selectedTechniqueId');
      fetchTechniqueById(techniqueId);
    }
  }, []);

  useEffect(() => {
    setActivePage(initialPage);
    // Reset to list view when changing pages
    setActiveView('list');
  }, [initialPage]);

  const checkAdminStatus = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .rpc('is_admin', { user_email: user.email });

      if (error) throw error;
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const fetchUserSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          schools (id, name, premium_school)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true);

      if (error) throw error;

      const schools = data?.map((us: any) => us.schools).filter(Boolean) || [];
      setUserSchools(schools);

      const hasPremium = data?.some((us: any) => us.schools?.premium_school === 1) || false;
      setIsPremium(hasPremium);
    } catch (error) {
      console.error('Error fetching user schools:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all reference data
      const [ageGroupsRes, subjectsRes, materialsRes, categoriesRes] = await Promise.all([
        supabase.from('age_groups').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('subjects').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('materials').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('technique_categories').select('*').eq('is_active', true).order('sort_order')
      ]);

      if (ageGroupsRes.error) throw ageGroupsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (materialsRes.error) throw materialsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setAgeGroups(ageGroupsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setMaterials(materialsRes.data || []);
      setTechniqueCategories(categoriesRes.data || []);

      // Fetch techniques
      await fetchTechniques();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechniques = async () => {
    try {
      const { data, error } = await supabase
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTechniques(data || []);
    } catch (error) {
      console.error('Error fetching techniques:', error);
    }
  };

  const isItemLocked = (item: { preview?: boolean }, admin: boolean, premium: boolean): boolean => {
    if (admin) return false;
    if (premium) return false;
    return !(item.preview);
  };

  const fetchTechniqueById = async (id: string) => {
    try {
      const { data, error } = await supabase
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
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSelectedTechnique(data);
        setActiveView('detail');
      }
    } catch (error) {
      console.error('Error fetching technique:', error);
    }
  };

  const handleTechniqueCreated = () => {
    fetchTechniques();
    setActiveView('list');
  };

  const handleTechniqueUpdated = () => {
    fetchTechniques();
    setEditingTechnique(null);
    setActiveView('list');
  };

  const handleViewTechnique = (technique: TeachingTechnique) => {
    setSelectedTechnique(technique);
    setEditingTechnique(null);
    setActiveView('detail');
  };

  const handleEditTechnique = (technique: TeachingTechnique) => {
    setEditingTechnique(technique);
    setSelectedTechnique(null);
    setActiveView('form');
  };
  
  const visibleTechniques = techniques;

  const filteredTechniques = visibleTechniques.filter(technique => {
    const matchesSearch = searchTerm === '' ||
      technique.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technique.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (technique.subtitle && technique.subtitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAgeGroup = selectedAgeGroup === 'all' ||
      technique.teaching_technique_age_groups.some(tag => tag.age_groups && tag.age_groups.id === selectedAgeGroup);

    const matchesSubject = selectedSubject === 'all' ||
      technique.teaching_technique_subjects.some(ts => ts.subjects && ts.subjects.id === selectedSubject);

    const matchesMaterial = selectedMaterial === 'all' ||
      technique.teaching_technique_materials.some(tm => tm.materials && tm.materials.id === selectedMaterial);

    const matchesCategory = selectedCategory === 'all' ||
      technique.teaching_technique_categories.some(tc => tc.technique_categories && tc.technique_categories.id === selectedCategory);

    return matchesSearch && matchesAgeGroup && matchesSubject && matchesMaterial && matchesCategory;
  });

  if (activeView === 'form') {
    return (
      <TeachingTechniqueForm
        onTechniqueCreated={handleTechniqueCreated}
        onTechniqueUpdated={handleTechniqueUpdated}
        onCancel={() => setActiveView('list')}
        ageGroups={ageGroups}
        subjects={subjects}
        materials={materials}
        techniqueCategories={techniqueCategories}
        editingTechnique={editingTechnique}
      />
    );
  }

  if (activeView === 'detail' && selectedTechnique) {
    return (
      <TeachingTechniqueDetail
        technique={selectedTechnique}
        onBack={() => setActiveView('list')}
        onEdit={() => handleEditTechnique(selectedTechnique)}
        onDelete={() => {
          setSelectedTechnique(null);
          setActiveView('list');
          fetchTechniques();
        }}
        userSchools={userSchools}
      />
    );
  }

  if (activeView === 'management') {
    return (
      <TeachingManagement
        onBack={() => setActiveView('list')}
        ageGroups={ageGroups}
        subjects={subjects}
        materials={materials}
        techniqueCategories={techniqueCategories}
        onDataUpdated={fetchData}
      />
    );
  }

  if (activeView === 'analytics') {
    return (
      <TeachingAnalytics
        onBack={() => setActiveView('list')}
        userSchools={userSchools}
      />
    );
  }

  if (activeView === 'log') {
    return (
      <TeachingUsageLog
        onBack={() => setActiveView('list')}
        userSchools={userSchools}
      />
    );
  }

  const renderTabNav = () => (
    <div className="flex gap-4 border-b border-gray-200 pb-4 mb-6">
      <button
        onClick={() => setActivePage('technieken')}
        className={`flex items-center space-x-2 px-4 py-2 transition-colors ${
          activePage === 'technieken'
            ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
            : 'text-gray-700 hover:text-blue-600'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>Technieken</span>
      </button>
      <button
        onClick={() => setActivePage('faq')}
        className={`flex items-center space-x-2 px-4 py-2 transition-colors ${
          activePage === 'faq'
            ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
            : 'text-gray-700 hover:text-blue-600'
        }`}
      >
        <HelpCircle className="w-4 h-4" />
        <span>FAQ</span>
      </button>
      <button
        onClick={() => setActivePage('vormingen')}
        className={`flex items-center space-x-2 px-4 py-2 transition-colors ${
          activePage === 'vormingen'
            ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
            : 'text-gray-700 hover:text-blue-600'
        }`}
      >
        <Video className="w-4 h-4" />
        <span>Vormingen</span>
      </button>
      <button
        onClick={() => setActivePage('newsletter')}
        className={`flex items-center space-x-2 px-4 py-2 transition-colors ${
          activePage === 'newsletter'
            ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
            : 'text-gray-700 hover:text-blue-600'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Nieuwsbrief</span>
      </button>
    </div>
  );

  if (activePage === 'faq') {
    return (
      <div className="space-y-6">
        {renderTabNav()}
        <DidactiekFAQ isAdmin={isAdmin} isPremium={isPremium} />
      </div>
    );
  }

  if (activePage === 'vormingen') {
    return (
      <div className="space-y-6">
        {renderTabNav()}
        <DidactiekVormingen isAdmin={isAdmin} isPremium={isPremium} />
      </div>
    );
  }

  if (activePage === 'newsletter') {
    return (
      <div className="space-y-6">
        {renderTabNav()}
        <NieuwsbriefTab isPremium={isPremium} isAdmin={isAdmin} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Navigation Tabs */}
      {renderTabNav()}

      {!isAdmin && !isPremium && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Volledige toegang met een bijleer.school-licentie</p>
            <p className="text-blue-800">
              Deze didactische items zijn enkel beschikbaar voor scholen met een volledige bijleer.school-licentie. De items met een slotje zijn vergrendeld voor jouw school. De items die je wel kunt openen zijn gratis voorbeelditems.
              Neem contact op via <a href="mailto:info@bijleren.eu" className="font-medium underline hover:text-blue-600">info@bijleren.eu</a> voor meer informatie over een licentie voor jouw hele school.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Didactische Technieken</h1>
          <p className="text-gray-600">Ontdek effectieve lesmethoden en tools</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setActiveView('analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analyses
          </Button>
          <Button
            variant="secondary"
            onClick={() => setActiveView('log')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Log
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="secondary"
                onClick={() => setActiveView('management')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Beheren
              </Button>
              <Button onClick={() => setActiveView('form')}>
                <Plus className="w-4 h-4 mr-2" />
                Techniek toevoegen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Zoek technieken..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedAgeGroup}
            onChange={(e) => setSelectedAgeGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Alle leeftijdsgroepen</option>
            {ageGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Alle vakken</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Alle materialen</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Alle categorieën</option>
            {techniqueCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            {filteredTechniques.length} van {visibleTechniques.length} technieken
          </div>
        </div>
      </Card>

      {/* Techniques List */}
      <div className="space-y-4">
        {filteredTechniques.length === 0 ? (
          <Card className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {visibleTechniques.length === 0 ? 'Geen technieken gevonden' : 'Geen technieken gevonden met deze filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {visibleTechniques.length === 0
                ? 'Er zijn nog geen didactische technieken toegevoegd.'
                : 'Probeer je zoekfilters aan te passen.'
              }
            </p>
            {visibleTechniques.length === 0 && isAdmin && (
              <Button onClick={() => setActiveView('form')}>
                <Plus className="w-4 h-4 mr-2" />
                Eerste techniek toevoegen
              </Button>
            )}
          </Card>
        ) : (
          filteredTechniques.map((technique) => {
            const locked = isItemLocked(technique as any, isAdmin, isPremium);
            return (
              <Card key={technique.id} className={`transition-shadow ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {technique.photo_url ? (
                          <img
                            src={technique.photo_url}
                            alt={technique.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-6 h-6 text-indigo-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                            {locked && <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            {technique.title}
                            {isAdmin && (technique as any).preview && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-normal">
                                Preview
                              </span>
                            )}
                          </h3>
                          {technique.subtitle && (
                            <p className="text-sm text-gray-600 mb-2">{technique.subtitle}</p>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3 line-clamp-2">{technique.description}</p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {technique.teaching_technique_categories.filter(tc => tc.technique_categories).map((tc) => (
                            <span
                              key={tc.technique_categories.id}
                              className="px-2 py-1 text-xs rounded-full text-white"
                              style={{ backgroundColor: tc.technique_categories.color }}
                            >
                              {tc.technique_categories.name}
                            </span>
                          ))}
                          {technique.teaching_technique_age_groups.filter(tag => tag.age_groups).map((tag) => (
                            <span
                              key={tag.age_groups.id}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              <Users className="w-3 h-3 inline mr-1" />
                              {tag.age_groups.name}
                            </span>
                          ))}
                          {technique.teaching_technique_subjects.filter(ts => ts.subjects).map((ts) => (
                            <span
                              key={ts.subjects.id}
                              className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                            >
                              <BookMarked className="w-3 h-3 inline mr-1" />
                              {ts.subjects.name}
                            </span>
                          ))}
                          {technique.teaching_technique_materials.filter(tm => tm.materials).map((tm) => (
                            <span
                              key={tm.materials.id}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                            >
                              <Wrench className="w-3 h-3 inline mr-1" />
                              {tm.materials.name}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {technique.teacher_video_url && (
                            <div className="flex items-center">
                              <Play className="w-4 h-4 mr-1" />
                              Docent video
                            </div>
                          )}
                          {technique.student_video_url && (
                            <div className="flex items-center">
                              <Play className="w-4 h-4 mr-1" />
                              Student video
                            </div>
                          )}
                          {technique.external_links && Object.keys(technique.external_links).length > 0 && (
                            <div className="flex items-center">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Externe links
                            </div>
                          )}
                          {technique.profiles && (
                            <div className="flex items-center">
                              Door: {technique.profiles.first_name} {technique.profiles.last_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => !locked && handleViewTechnique(technique)}
                      disabled={locked}
                    >
                      {locked ? <Lock className="w-4 h-4" /> : 'Bekijken'}
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditTechnique(technique)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Bewerken
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}