import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import {
  ArrowLeft,
  Edit,
  Play,
  ExternalLink,
  Users,
  BookMarked,
  Wrench,
  Calendar,
  User,
  MessageCircle,
  Award,
  BarChart3,
  Plus,
  Star,
  Send,
  Trash2,
  Share2,
  Check
} from 'lucide-react';

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

interface TeachingTechniqueDetailProps {
  technique: TeachingTechnique;
  onBack: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  userSchools?: { id: string; name: string }[];
}

interface UsageStats {
  totalUsage: number;
  uniqueTeachers: number;
  uniqueGroups: number;
  recentUsage: any[];
}

interface Coach {
  id: string;
  user_id: string;
  experience_level: string;
  description: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export function TeachingTechniqueDetail({ technique, onBack, onEdit, onDelete, userSchools = [] }: TeachingTechniqueDetailProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalUsage: 0,
    uniqueTeachers: 0,
    uniqueGroups: 0,
    recentUsage: []
  });
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCoach, setIsCoach] = useState(false);
  const [showCoachForm, setShowCoachForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [coachData, setCoachData] = useState({
    experience_level: 'intermediate',
    description: ''
  });
  const [selectedSchoolId, setSelectedSchoolId] = useState(userSchools[0]?.id || '');

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?technique=${technique.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (userSchools.length > 0) {
      fetchUsageStats();
      fetchCoaches();
      fetchComments();
      checkIfUserIsCoach();
      checkAdminStatus();
    }
  }, [technique.id, selectedSchoolId]);

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

  const fetchUsageStats = async () => {
    try {
      const { data, error } = await supabase
        .from('technique_usage_logs')
        .select(`
          *,
          profiles (first_name, last_name),
          groups (name)
        `)
        .eq('technique_id', technique.id);

      if (error) throw error;

      const stats = {
        totalUsage: data?.length || 0,
        uniqueTeachers: new Set(data?.map(d => d.user_id)).size,
        uniqueGroups: new Set(data?.filter(d => d.group_id).map(d => d.group_id)).size,
        recentUsage: data?.slice(-5) || []
      };

      setUsageStats(stats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const fetchCoaches = async () => {
    if (!selectedSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('technique_coaches')
        .select(`
          *,
          profiles (first_name, last_name)
        `)
        .eq('technique_id', technique.id)
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true);

      if (error) throw error;
      setCoaches(data || []);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    }
  };

  const fetchComments = async () => {
    if (!selectedSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('technique_comments')
        .select(`
          *,
          profiles (first_name, last_name)
        `)
        .eq('technique_id', technique.id)
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const checkIfUserIsCoach = async () => {
    if (!user || !selectedSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('technique_coaches')
        .select('*')
        .eq('technique_id', technique.id)
        .eq('user_id', user.id)
        .eq('school_id', selectedSchoolId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setIsCoach(!!data);
      if (data) {
        setCoachData({
          experience_level: data.experience_level,
          description: data.description || ''
        });
      }
    } catch (error) {
      console.error('Error checking coach status:', error);
    }
  };

  const handleBecomeCoach = async () => {
    if (!user || !selectedSchoolId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('technique_coaches')
        .insert({
          technique_id: technique.id,
          user_id: user.id,
          school_id: selectedSchoolId,
          experience_level: coachData.experience_level,
          description: coachData.description || null
        });

      if (error) throw error;

      setIsCoach(true);
      setShowCoachForm(false);
      setMessage('Je bent nu geregistreerd als coach voor deze techniek!');
      fetchCoaches();
    } catch (error) {
      console.error('Error becoming coach:', error);
      setMessage('Er is een fout opgetreden bij het registreren als coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoach = async () => {
    if (!user || !selectedSchoolId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('technique_coaches')
        .update({ is_active: false })
        .eq('technique_id', technique.id)
        .eq('user_id', user.id)
        .eq('school_id', selectedSchoolId);

      if (error) throw error;

      setIsCoach(false);
      setMessage('Je bent niet meer geregistreerd als coach voor deze techniek.');
      fetchCoaches();
    } catch (error) {
      console.error('Error removing coach:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van je coach status.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !selectedSchoolId || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('technique_comments')
        .insert({
          technique_id: technique.id,
          user_id: user.id,
          school_id: selectedSchoolId,
          comment: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      setShowCommentForm(false);
      setMessage('Reactie succesvol toegevoegd!');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen van de reactie.');
    } finally {
      setLoading(false);
    }
  };

  const logUsage = async (groupId?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('technique_usage_logs')
        .insert({
          technique_id: technique.id,
          user_id: user.id,
          group_id: groupId || null,
          used_at: new Date().toISOString()
        });

      if (error) throw error;
      setMessage('Gebruik geregistreerd!');
      fetchUsageStats();
    } catch (error) {
      console.error('Error logging usage:', error);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teaching_techniques')
        .delete()
        .eq('id', technique.id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      onDelete();
    } catch (error) {
      console.error('Error deleting technique:', error);
      setMessage('Fout bij verwijderen van techniek');
    } finally {
      setLoading(false);
    }
  };

  const getVimeoEmbedUrl = (url: string) => {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (!vimeoMatch) return null;

    const videoId = vimeoMatch[1];
    const hash = vimeoMatch[2];

    return hash
      ? `https://player.vimeo.com/video/${videoId}?h=${hash}`
      : `https://player.vimeo.com/video/${videoId}`;
  };

  const externalLinks = technique.external_links || [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar technieken
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{technique.title}</h1>
            {technique.subtitle && (
              <p className="text-gray-600">{technique.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {userSchools.length > 1 && (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {userSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}
          <Button variant="secondary" onClick={handleShare}>
            {copySuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Gekopieerd!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Delen
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => logUsage()}>
            <Plus className="w-4 h-4 mr-2" />
            Gebruik registreren
          </Button>
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Bewerken
              </Button>
              {onDelete && (
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Verwijderen
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('succesvol') || message.includes('geregistreerd')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Usage Statistics */}
        {selectedSchoolId && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Gebruiksstatistieken
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{usageStats.totalUsage}</div>
                <div className="text-sm text-gray-600">Totaal gebruikt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{usageStats.uniqueTeachers}</div>
                <div className="text-sm text-gray-600">Unieke leerkrachten</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{usageStats.uniqueGroups}</div>
                <div className="text-sm text-gray-600">Verschillende groepen</div>
              </div>
            </div>
          </Card>
        )}

        {/* Basic Information */}
        <Card>
          {technique.photo_url && (
            <div className="mb-6">
              <img 
                src={technique.photo_url} 
                alt={technique.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Beschrijving</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{technique.description}</p>
          
          <div className="mt-6 flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              Door: {technique.profiles ? `${technique.profiles.first_name} ${technique.profiles.last_name}` : 'Onbekend'}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Toegevoegd: {new Date(technique.created_at).toLocaleDateString('nl-NL')}
            </div>
          </div>
        </Card>

        {/* Tags */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorieën</h3>
          
          <div className="space-y-4">
            {technique.teaching_technique_categories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Techniek Categorieën</h4>
                <div className="flex flex-wrap gap-2">
                  {technique.teaching_technique_categories.filter(tc => tc.technique_categories).map((tc) => (
                    <span
                      key={tc.technique_categories.id}
                      className="px-3 py-1 text-sm rounded-full text-white"
                      style={{ backgroundColor: tc.technique_categories.color }}
                    >
                      {tc.technique_categories.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {technique.teaching_technique_age_groups.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Leeftijdsgroepen</h4>
                <div className="flex flex-wrap gap-2">
                  {technique.teaching_technique_age_groups.filter(tag => tag.age_groups).map((tag) => (
                    <span
                      key={tag.age_groups.id}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      <Users className="w-3 h-3 inline mr-1" />
                      {tag.age_groups.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {technique.teaching_technique_subjects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Vakken</h4>
                <div className="flex flex-wrap gap-2">
                  {technique.teaching_technique_subjects.filter(ts => ts.subjects).map((ts) => (
                    <span
                      key={ts.subjects.id}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      <BookMarked className="w-3 h-3 inline mr-1" />
                      {ts.subjects.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {technique.teaching_technique_materials.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Materialen</h4>
                <div className="flex flex-wrap gap-2">
                  {technique.teaching_technique_materials.filter(tm => tm.materials).map((tm) => (
                    <span
                      key={tm.materials.id}
                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                    >
                      <Wrench className="w-3 h-3 inline mr-1" />
                      {tm.materials.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Videos */}
        {(technique.teacher_video_url || technique.student_video_url) && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Video's</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {technique.teacher_video_url && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Play className="w-4 h-4 mr-2" />
                    Voor Leerkrachten
                  </h4>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {getVimeoEmbedUrl(technique.teacher_video_url) ? (
                      <iframe
                        src={getVimeoEmbedUrl(technique.teacher_video_url)!}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Video niet beschikbaar</p>
                          <a
                            href={technique.teacher_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500 text-sm"
                          >
                            Open in nieuwe tab
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {technique.student_video_url && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Play className="w-4 h-4 mr-2" />
                    Voor Studenten
                  </h4>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {getVimeoEmbedUrl(technique.student_video_url) ? (
                      <iframe
                        src={getVimeoEmbedUrl(technique.student_video_url)!}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Video niet beschikbaar</p>
                          <a
                            href={technique.student_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500 text-sm"
                          >
                            Open in nieuwe tab
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Coaches Section */}
        {selectedSchoolId && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Coaches ({coaches.length})
              </h3>
              {!isCoach ? (
                <Button variant="secondary" onClick={() => setShowCoachForm(true)}>
                  <Star className="w-4 h-4 mr-2" />
                  Word coach
                </Button>
              ) : (
                <Button variant="danger" onClick={handleRemoveCoach} loading={loading}>
                  Coach status verwijderen
                </Button>
              )}
            </div>

            {showCoachForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Registreer als coach</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ervaringsniveau
                    </label>
                    <select
                      value={coachData.experience_level}
                      onChange={(e) => setCoachData({ ...coachData, experience_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Gemiddeld</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschrijving (optioneel)
                    </label>
                    <textarea
                      value={coachData.description}
                      onChange={(e) => setCoachData({ ...coachData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Beschrijf je ervaring met deze techniek..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button variant="secondary" onClick={() => setShowCoachForm(false)}>
                      Annuleren
                    </Button>
                    <Button onClick={handleBecomeCoach} loading={loading}>
                      Registreren als coach
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {coaches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nog geen coaches voor deze techniek</p>
              ) : (
                coaches.map((coach) => (
                  <div key={coach.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Award className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {coach.profiles.first_name} {coach.profiles.last_name}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          coach.experience_level === 'expert' 
                            ? 'bg-green-100 text-green-800'
                            : coach.experience_level === 'intermediate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {coach.experience_level === 'expert' ? 'Expert' : 
                           coach.experience_level === 'intermediate' ? 'Gemiddeld' : 'Beginner'}
                        </span>
                      </div>
                      {coach.description && (
                        <p className="text-sm text-gray-600 mt-1">{coach.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Comments Section */}
        {selectedSchoolId && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Reacties ({comments.length})
              </h3>
              <Button variant="secondary" onClick={() => setShowCommentForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Reactie toevoegen
              </Button>
            </div>

            {showCommentForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Deel je ervaring met deze techniek..."
                  />
                  <div className="flex justify-end space-x-3">
                    <Button variant="secondary" onClick={() => setShowCommentForm(false)}>
                      Annuleren
                    </Button>
                    <Button 
                      onClick={handleAddComment} 
                      loading={loading}
                      disabled={!newComment.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Reactie plaatsen
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nog geen reacties op deze techniek</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-indigo-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {comment.profiles.first_name} {comment.profiles.last_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                    <p className="text-gray-700">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* External Links */}
        {externalLinks.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Externe Links</h3>
            <div className="space-y-3">
              {externalLinks.map((link: any, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{link.title}</p>
                    <p className="text-sm text-gray-500">{link.url}</p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Techniek verwijderen"
          message={`Weet je zeker dat je "${technique.title}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          confirmButtonVariant="danger"
        />
      )}
    </div>
  );
}