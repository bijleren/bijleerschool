import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GraduationCap, ArrowLeft, LogIn, BookOpen, Users, Package, Tag, Calendar, User, Play, ExternalLink } from 'lucide-react';

interface TeachingTechnique {
  id: string;
  title: string;
  description: string;
  content: string;
  student_video_url: string | null;
  teacher_video_url: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
  teaching_technique_age_groups: Array<{
    age_groups: {
      name: string;
    };
  }>;
  teaching_technique_subjects: Array<{
    subjects: {
      name: string;
    };
  }>;
  teaching_technique_materials: Array<{
    materials: {
      name: string;
    };
  }>;
  teaching_technique_categories: Array<{
    technique_categories: {
      name: string;
      color: string;
    };
  }>;
}

export function PublicTechniqueView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [technique, setTechnique] = useState<TeachingTechnique | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const techniqueId = searchParams.get('technique');
    if (techniqueId) {
      fetchTechnique(techniqueId);
    } else {
      setError('Geen techniek ID gevonden');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchTechnique = async (id: string) => {
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

      if (!data) {
        setError('Techniek niet gevonden');
      } else {
        setTechnique(data);
      }
    } catch (err) {
      console.error('Error fetching technique:', err);
      setError('Fout bij het laden van de techniek');
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

  const handleLogin = () => {
    const techniqueId = searchParams.get('technique');
    if (techniqueId) {
      sessionStorage.setItem('selectedTechniqueId', techniqueId);
    }
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-#946B29 mx-auto mb-4"></div>
          <p className="text-gray-600">Techniek wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !technique) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Techniek niet gevonden</h2>
          <p className="text-gray-600 mb-6">{error || 'De gevraagde techniek kon niet worden geladen.'}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-#946B29 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">bijleer.school</h1>
                <p className="text-sm text-gray-600">Didactische Techniek</p>
              </div>
            </div>
            <Button onClick={handleLogin}>
              <LogIn className="w-4 h-4 mr-2" />
              Inloggen
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Terug naar home</span>
          </button>
        </div>

        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{technique.title}</h1>

            <div className="flex flex-wrap gap-2 mb-4">
              {technique.teaching_technique_categories.map((cat) => (
                <span
                  key={cat.technique_categories.name}
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: cat.technique_categories.color + '20',
                    color: cat.technique_categories.color
                  }}
                >
                  {cat.technique_categories.name}
                </span>
              ))}
            </div>

            {technique.description && (
              <p className="text-lg text-gray-700 mb-6">{technique.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {technique.teaching_technique_age_groups.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
                  <Users className="w-5 h-5 text-#946B29 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Leeftijdsgroepen</p>
                    <div className="flex flex-wrap gap-1">
                      {technique.teaching_technique_age_groups.map((ag) => (
                        <span key={ag.age_groups.name} className="text-sm text-gray-600">
                          {ag.age_groups.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {technique.teaching_technique_subjects.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Vakken</p>
                    <div className="flex flex-wrap gap-1">
                      {technique.teaching_technique_subjects.map((subj, idx) => (
                        <span key={subj.subjects.name} className="text-sm text-gray-600">
                          {subj.subjects.name}
                          {idx < technique.teaching_technique_subjects.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {technique.teaching_technique_materials.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                  <Package className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Materialen</p>
                    <div className="flex flex-wrap gap-1">
                      {technique.teaching_technique_materials.map((mat, idx) => (
                        <span key={mat.materials.name} className="text-sm text-gray-600">
                          {mat.materials.name}
                          {idx < technique.teaching_technique_materials.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Auteur</p>
                  <p className="text-sm text-gray-600">
                    {technique.profiles.first_name} {technique.profiles.last_name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {(technique.teacher_video_url || technique.student_video_url) && (
            <div className="mb-8 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Play className="w-6 h-6 text-#946B29" />
                Video's
              </h2>

              {technique.teacher_video_url && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Leerkracht Video</h3>
                  <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {getVimeoEmbedUrl(technique.teacher_video_url) ? (
                      <iframe
                        src={getVimeoEmbedUrl(technique.teacher_video_url)!}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <a
                          href={technique.teacher_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white flex items-center gap-2 hover:text-amber-300"
                        >
                          <ExternalLink className="w-5 h-5" />
                          Open video in nieuwe tab
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {technique.student_video_url && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Leerling Video</h3>
                  <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {getVimeoEmbedUrl(technique.student_video_url) ? (
                      <iframe
                        src={getVimeoEmbedUrl(technique.student_video_url)!}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <a
                          href={technique.student_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white flex items-center gap-2 hover:text-amber-300"
                        >
                          <ExternalLink className="w-5 h-5" />
                          Open video in nieuwe tab
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="prose max-w-none">
            <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: technique.content }} />
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Card className="p-6 bg-amber-50 border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Wil je meer technieken bekijken?
            </h3>
            <p className="text-gray-600 mb-4">
              Log in om toegang te krijgen tot alle didactische technieken en tools.
            </p>
            <Button onClick={handleLogin} className="bg-#946B29 hover:bg-#74531F">
              <LogIn className="w-4 h-4 mr-2" />
              Inloggen voor volledige toegang
            </Button>
          </Card>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            © 2025 bijleer.school. Alle rechten voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
