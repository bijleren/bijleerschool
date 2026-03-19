import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Newspaper, Download, Plus, Trash2, Calendar, FileText, Upload, X, Search, Lock, Info } from 'lucide-react';

interface Newsletter {
  id: string;
  school_id: string | null;
  title: string;
  description: string;
  file_path: string;
  preview: boolean;
  created_at: string;
  created_by: string | null;
}

interface NieuwsbriefTabProps {
  isPremium?: boolean;
  isAdmin?: boolean;
}

interface UserSchool {
  user_id: string;
  school_id: string;
  role: string;
  is_active: boolean;
}

export function NieuwsbriefTab({ isPremium = false, isAdmin: isAdminProp }: NieuwsbriefTabProps = {}) {
  const { user } = useAuth();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [filteredNewsletters, setFilteredNewsletters] = useState<Newsletter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(isAdminProp || false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNewsletter, setNewNewsletter] = useState({ title: '', description: '', file: null as File | null, preview: false });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (isAdminProp === undefined) {
        checkAdminStatus();
      }
      fetchNewsletters();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .rpc('is_admin', { user_email: user.email });

      if (error) throw error;
      setIsAdmin(data || false);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  };

  const fetchNewsletters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const result = data || [];
      setNewsletters(result);
      setFilteredNewsletters(result);
    } catch (err) {
      console.error('Error fetching newsletters:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortForNonPremium = (list: Newsletter[]) => {
    if (isAdmin || isPremium) return list;
    return [...list].sort((a, b) => {
      if (a.preview && !b.preview) return -1;
      if (!a.preview && b.preview) return 1;
      return 0;
    });
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredNewsletters(sortForNonPremium(newsletters));
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = newsletters.filter(newsletter =>
        newsletter.title.toLowerCase().includes(query) ||
        (newsletter.description && newsletter.description.toLowerCase().includes(query))
      );
      setFilteredNewsletters(sortForNonPremium(filtered));
    }
  }, [searchQuery, newsletters, isAdmin, isPremium]);

  const handleDownload = async (newsletter: Newsletter) => {
    try {
      const { data, error } = await supabase.storage
        .from('newsletters')
        .download(newsletter.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${newsletter.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading newsletter:', err);
      setError('Fout bij het downloaden van de nieuwsbrief');
    }
  };

  const handleAddNewsletter = async () => {
    if (!newNewsletter.title || !newNewsletter.description || !newNewsletter.file) {
      setError('Vul alle velden in en selecteer een PDF bestand');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const fileExt = newNewsletter.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('newsletters')
        .upload(filePath, newNewsletter.file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('newsletters')
        .insert({
          title: newNewsletter.title,
          description: newNewsletter.description,
          file_path: filePath,
          created_by: user?.id,
          preview: newNewsletter.preview,
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setNewNewsletter({ title: '', description: '', file: null, preview: false });
      fetchNewsletters();
    } catch (err: any) {
      console.error('Error adding newsletter:', err);
      setError(err.message || 'Fout bij het toevoegen van de nieuwsbrief');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteNewsletter = async (newsletter: Newsletter) => {
    if (!confirm(`Weet je zeker dat je "${newsletter.title}" wilt verwijderen?`)) {
      return;
    }

    try {
      const { error: deleteFileError } = await supabase.storage
        .from('newsletters')
        .remove([newsletter.file_path]);

      if (deleteFileError) throw deleteFileError;

      const { error: deleteError } = await supabase
        .from('newsletters')
        .delete()
        .eq('id', newsletter.id);

      if (deleteError) throw deleteError;

      fetchNewsletters();
    } catch (err) {
      console.error('Error deleting newsletter:', err);
      setError('Fout bij het verwijderen van de nieuwsbrief');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
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

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Newspaper className="w-8 h-8 mr-3 text-blue-600" />
            Nieuwsbrief
          </h1>
          <p className="text-gray-600 mt-2">
            Bekijk en download alle nieuwsbrieven
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuwsbrief toevoegen
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {newsletters.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Zoek nieuwsbrieven..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {newsletters.length === 0 ? (
        <Card className="text-center py-12">
          <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen nieuwsbrieven beschikbaar</h3>
          <p className="text-gray-600">
            {isAdmin ? 'Voeg de eerste nieuwsbrief toe om te beginnen.' : 'Er zijn momenteel geen nieuwsbrieven beschikbaar.'}
          </p>
        </Card>
      ) : filteredNewsletters.length === 0 ? (
        <Card className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen resultaten gevonden</h3>
          <p className="text-gray-600">
            Probeer een andere zoekterm
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNewsletters.map((newsletter) => {
            const locked = !isAdmin && !isPremium && !newsletter.preview;
            return (
              <Card key={newsletter.id} className={`transition-shadow ${locked ? 'opacity-50' : 'hover:shadow-md'}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        {locked && <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        {newsletter.title}
                        {isAdmin && newsletter.preview && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-normal">
                            Preview
                          </span>
                        )}
                      </h3>
                      {newsletter.description && (
                        <p className="text-gray-600 text-sm mb-2">
                          {newsletter.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          {!isAdmin && !isPremium && newsletter.preview && (
                            <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-200">
                              Voorbeeld
                            </span>
                          )}
                          <Button
                            onClick={() => !locked && handleDownload(newsletter)}
                            disabled={locked}
                            className={locked ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                          >
                            {locked ? <Lock className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                            {locked ? 'Vergrendeld' : 'Download PDF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-center text-xs text-gray-500 mt-2">
                          <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                          {formatDate(newsletter.created_at)}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteNewsletter(newsletter)}
                          className="text-red-600 hover:text-red-700 transition-colors p-2"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Nieuwsbrief toevoegen</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewNewsletter({ title: '', description: '', file: null, preview: false });
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Titel"
                  value={newNewsletter.title}
                  onChange={(e) => setNewNewsletter({ ...newNewsletter, title: e.target.value })}
                  placeholder="Bijv. Nieuwsbrief November 2025"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschrijving
                  </label>
                  <textarea
                    value={newNewsletter.description}
                    onChange={(e) => setNewNewsletter({ ...newNewsletter, description: e.target.value })}
                    placeholder="Korte beschrijving van de nieuwsbrief..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF Bestand
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.type === 'application/pdf') {
                          setNewNewsletter({ ...newNewsletter, file });
                          setError('');
                        } else {
                          setError('Selecteer een geldig PDF bestand');
                        }
                      }}
                      className="hidden"
                      id="newsletter-file"
                    />
                    <label htmlFor="newsletter-file" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {newNewsletter.file ? (
                          <span className="text-blue-600 font-medium">{newNewsletter.file.name}</span>
                        ) : (
                          <>
                            Klik om een PDF te selecteren
                            <br />
                            <span className="text-xs text-gray-500">Alleen PDF bestanden toegestaan</span>
                          </>
                        )}
                      </p>
                    </label>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newsletter-preview"
                    checked={newNewsletter.preview}
                    onChange={(e) => setNewNewsletter({ ...newNewsletter, preview: e.target.checked })}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="newsletter-preview" className="ml-2 text-sm text-gray-700">
                    Preview (alleen zichtbaar voor niet-premium scholen)
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewNewsletter({ title: '', description: '', file: null, preview: false });
                      setError('');
                    }}
                    className="flex-1"
                    disabled={uploading}
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={handleAddNewsletter}
                    className="flex-1"
                    loading={uploading}
                    disabled={uploading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Toevoegen
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
