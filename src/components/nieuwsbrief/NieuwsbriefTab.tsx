import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Newspaper, Download, Plus, Trash2, Calendar, FileText, Upload, X } from 'lucide-react';

interface Newsletter {
  id: string;
  school_id: string | null;
  title: string;
  description: string;
  file_path: string;
  created_at: string;
  created_by: string | null;
}

interface UserSchool {
  user_id: string;
  school_id: string;
  role: string;
  is_active: boolean;
}

export function NieuwsbriefTab() {
  const { user } = useAuth();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNewsletter, setNewNewsletter] = useState({ title: '', description: '', file: null as File | null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      checkAdminStatus();
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
      setNewsletters(data || []);
    } catch (err) {
      console.error('Error fetching newsletters:', err);
    } finally {
      setLoading(false);
    }
  };

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
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setNewNewsletter({ title: '', description: '', file: null });
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

      {newsletters.length === 0 ? (
        <Card className="text-center py-12">
          <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen nieuwsbrieven beschikbaar</h3>
          <p className="text-gray-600">
            {isAdmin ? 'Voeg de eerste nieuwsbrief toe om te beginnen.' : 'Er zijn momenteel geen nieuwsbrieven beschikbaar.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsletters.map((newsletter) => (
            <Card key={newsletter.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {newsletter.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(newsletter.created_at)}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteNewsletter(newsletter)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {newsletter.description}
                </p>

                <Button
                  variant="outline"
                  onClick={() => handleDownload(newsletter)}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </Card>
          ))}
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
                    setNewNewsletter({ title: '', description: '', file: null });
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
                      setNewNewsletter({ title: '', description: '', file: null });
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
