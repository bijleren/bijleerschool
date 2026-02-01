import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { QrCode, Eye, ExternalLink, Calendar, Lock, Users, Plus, RefreshCw, Search, Filter, X, FileText, Link as LinkIcon, Image, Video, Music, File, MapPin, CheckSquare, BarChart3 } from 'lucide-react';

interface BlinkQR {
  id: string;
  code: string;
  title: string;
  description: string | null;
  content_type: string;
  content: any;
  user_id: string | null;
  is_locked: boolean;
  is_paper: boolean;
  views: number;
  created_at: string;
  school_id: string | null;
  created_for_school: boolean | null;
  team_editable: boolean | null;
  schools?: {
    name: string;
  };
}

interface School {
  id: string;
  name: string;
}

const contentTypeIcons: Record<string, any> = {
  text: FileText,
  website: LinkIcon,
  photo: Image,
  video: Video,
  audio: Music,
  document: File,
  location: MapPin,
  todo: CheckSquare,
};

export function BlinkQRTab() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'school' | 'user'>('school');
  const [schoolQRs, setSchoolQRs] = useState<BlinkQR[]>([]);
  const [userQRs, setUserQRs] = useState<BlinkQR[]>([]);
  const [filteredQRs, setFilteredQRs] = useState<BlinkQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [showPaperOnly, setShowPaperOnly] = useState(false);
  const [showLockedOnly, setShowLockedOnly] = useState(false);
  const [showTeamEditableOnly, setShowTeamEditableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_viewed' | 'alphabetical'>('newest');
  const [userSchools, setUserSchools] = useState<School[]>([]);
  const [focusSchool, setFocusSchool] = useState<School | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserSchools();
    }
  }, [user]);

  useEffect(() => {
    if (focusSchool) {
      fetchQRCodes();
    }
  }, [focusSchool]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [activeTab, schoolQRs, userQRs, searchTerm, selectedContentTypes, showPaperOnly, showLockedOnly, showTeamEditableOnly, sortBy]);

  const fetchUserSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          school_id,
          schools (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'approved');

      if (error) throw error;

      const schools = data?.map((us: any) => ({
        id: us.schools.id,
        name: us.schools.name,
      })) || [];

      setUserSchools(schools);
      if (schools.length > 0) {
        setFocusSchool(schools[0]);
      }
    } catch (error) {
      console.error('Error fetching user schools:', error);
    }
  };

  const fetchQRCodes = async () => {
    if (!user || !focusSchool) return;

    setLoading(true);
    try {
      const { data: schoolData, error: schoolError } = await supabase
        .from('qr_codes')
        .select(`
          id,
          code,
          title,
          description,
          content_type,
          content,
          user_id,
          is_locked,
          is_paper,
          views,
          created_at,
          school_id,
          created_for_school,
          team_editable,
          schools (
            name
          )
        `)
        .eq('school_id', focusSchool.id)
        .order('created_at', { ascending: false });

      if (schoolError) throw schoolError;

      const { data: userData, error: userError } = await supabase
        .from('qr_codes')
        .select(`
          id,
          code,
          title,
          description,
          content_type,
          content,
          user_id,
          is_locked,
          is_paper,
          views,
          created_at,
          school_id,
          created_for_school,
          team_editable,
          schools (
            name
          )
        `)
        .eq('school_id', focusSchool.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userError) throw userError;

      setSchoolQRs(schoolData || []);
      setUserQRs(userData || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let qrs = activeTab === 'school' ? schoolQRs : userQRs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      qrs = qrs.filter(qr =>
        qr.title.toLowerCase().includes(term) ||
        qr.code.toLowerCase().includes(term) ||
        (qr.description && qr.description.toLowerCase().includes(term))
      );
    }

    if (selectedContentTypes.length > 0) {
      qrs = qrs.filter(qr => selectedContentTypes.includes(qr.content_type));
    }

    if (showPaperOnly) {
      qrs = qrs.filter(qr => qr.is_paper);
    }

    if (showLockedOnly) {
      qrs = qrs.filter(qr => qr.is_locked);
    }

    if (showTeamEditableOnly) {
      qrs = qrs.filter(qr => qr.team_editable);
    }

    qrs = [...qrs].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'most_viewed':
          return b.views - a.views;
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredQRs(qrs);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedContentTypes([]);
    setShowPaperOnly(false);
    setShowLockedOnly(false);
    setShowTeamEditableOnly(false);
    setSortBy('newest');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedContentTypes.length > 0) count++;
    if (showPaperOnly) count++;
    if (showLockedOnly) count++;
    if (showTeamEditableOnly) count++;
    return count;
  };

  const formatCode = (code: string) => {
    if (code.length === 10) {
      return `${code.slice(0, 5)}-${code.slice(5)}`;
    }
    return code;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getContentTypeIcon = (contentType: string) => {
    const Icon = contentTypeIcons[contentType] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const totalSchoolViews = schoolQRs.reduce((sum, qr) => sum + qr.views, 0);
  const recentQRsCount = schoolQRs.filter(qr => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(qr.created_at) > weekAgo;
  }).length;

  const contentTypes = ['text', 'website', 'photo', 'video', 'audio', 'document', 'location', 'todo'];

  if (!focusSchool) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen school geselecteerd</h3>
          <p className="text-gray-600">Selecteer een school om BlinkQR codes te bekijken.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">BlinkQR Codes</h2>
          <p className="text-sm text-gray-600 mt-1">{focusSchool.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => window.open('https://blinkqr.app/sticker-create', '_blank', 'noopener,noreferrer')}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Stickers Maken
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
          <Button
            onClick={() => window.open(`https://blinkqr.app/create?userId=${user?.id}&schoolId=${focusSchool.id}`, '_blank', 'noopener,noreferrer')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe BlinkQR
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">School BlinkQRs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{schoolQRs.length}</p>
            </div>
            <QrCode className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mijn BlinkQRs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{userQRs.length}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totale Views</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalSchoolViews}</p>
            </div>
            <Eye className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Deze Week</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{recentQRsCount}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('school')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'school'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            School BlinkQRs
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
              {schoolQRs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'user'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Mijn BlinkQRs
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600">
              {userQRs.length}
            </span>
          </button>
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Zoek op titel of code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {getActiveFilterCount() > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-blue-600 text-white">
              {getActiveFilterCount()}
            </span>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={fetchQRCodes}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {showFilters && (
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      if (selectedContentTypes.includes(type)) {
                        setSelectedContentTypes(selectedContentTypes.filter(t => t !== type));
                      } else {
                        setSelectedContentTypes([...selectedContentTypes, type]);
                      }
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      selectedContentTypes.includes(type)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                    }`}
                  >
                    <span className="flex items-center space-x-1">
                      {getContentTypeIcon(type)}
                      <span className="capitalize">{type}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPaperOnly}
                  onChange={(e) => setShowPaperOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Alleen papier QR</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLockedOnly}
                  onChange={(e) => setShowLockedOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Alleen vergrendeld</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTeamEditableOnly}
                  onChange={(e) => setShowTeamEditableOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Alleen team bewerkbaar</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sorteren op</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Nieuwste eerst</option>
                <option value="oldest">Oudste eerst</option>
                <option value="most_viewed">Meest bekeken</option>
                <option value="alphabetical">Alfabetisch</option>
              </select>
            </div>

            {getActiveFilterCount() > 0 && (
              <Button
                variant="secondary"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Filters wissen
              </Button>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredQRs.length === 0 ? (
        <Card className="p-8 text-center">
          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          {searchTerm || getActiveFilterCount() > 0 ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen resultaten gevonden</h3>
              <p className="text-gray-600 mb-4">Probeer andere zoektermen of filters.</p>
              <Button variant="secondary" onClick={clearFilters}>
                Filters wissen
              </Button>
            </>
          ) : activeTab === 'user' ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen BlinkQRs</h3>
              <p className="text-gray-600 mb-4">Maak je eerste BlinkQR om te beginnen.</p>
              <Button onClick={() => window.open(`https://blinkqr.app/create?userId=${user?.id}&schoolId=${focusSchool.id}`, '_blank', 'noopener,noreferrer')}>
                <Plus className="w-4 h-4 mr-2" />
                Maak je eerste BlinkQR
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen BlinkQRs gevonden</h3>
              <p className="text-gray-600">Er zijn nog geen BlinkQRs voor deze school.</p>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQRs.map((qr) => (
            <Card key={qr.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{qr.title}</h3>
                    <p className="text-sm text-gray-500 font-mono">{formatCode(qr.code)}</p>
                  </div>
                </div>
              </div>

              {qr.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{qr.description}</p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{qr.views} views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(qr.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => window.open(`https://blinkqr.app/qr/${qr.code}`, '_blank', 'noopener,noreferrer')}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Bekijken
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open(`https://blinkqr.app/qr/${qr.code}/edit?userId=${user?.id}&schoolId=${focusSchool.id}`, '_blank', 'noopener,noreferrer')}
                  className="flex-1"
                >
                  Bewerken
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
