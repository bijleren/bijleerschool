import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { RichTextEditor } from '../ui/RichTextEditor';
import { Plus, CreditCard as Edit2, Trash2, Save, X, Video, Play } from 'lucide-react';

interface Vorming {
  id: string;
  title: string;
  description: string;
  embed_code: string;
  category: string;
  display_order: number;
  is_published: boolean;
  preview: boolean;
  created_at: string;
  updated_at: string;
}

interface DidactiekVormingenProps {
  isAdmin: boolean;
  isPremium: boolean;
}

export function DidactiekVormingen({ isAdmin, isPremium }: DidactiekVormingenProps) {
  const [vormingen, setVormingen] = useState<Vorming[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVorming, setEditingVorming] = useState<Vorming | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVorming, setSelectedVorming] = useState<Vorming | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    embed_code: '',
    category: 'algemeen',
    display_order: 0,
    is_published: false,
    preview: false
  });

  useEffect(() => {
    fetchVormingen();
  }, [isAdmin]);

  const fetchVormingen = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('didactiek_vormingen')
        .select('*')
        .order('display_order', { ascending: true });

      if (!isAdmin) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      let result = data || [];
      if (!isAdmin && isPremium) {
        result = result.filter((v: Vorming) => !v.preview);
      }
      setVormingen(result);
    } catch (error) {
      console.error('Error fetching vormingen:', error);
      setToast({ message: 'Fout bij ophalen vormingen', type: 'error' });
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (editingVorming) {
        const { error } = await supabase
          .from('didactiek_vormingen')
          .update({
            ...formData,
            updated_by: userData.user.id
          })
          .eq('id', editingVorming.id);

        if (error) throw error;
        setToast({ message: 'Vorming bijgewerkt', type: 'success' });
      } else {
        const { error } = await supabase
          .from('didactiek_vormingen')
          .insert({
            ...formData,
            created_by: userData.user.id,
            updated_by: userData.user.id
          });

        if (error) throw error;
        setToast({ message: 'Vorming aangemaakt', type: 'success' });
      }

      setFormData({
        title: '',
        description: '',
        embed_code: '',
        category: 'algemeen',
        display_order: 0,
        is_published: false,
        preview: false
      });
      setEditingVorming(null);
      setIsCreating(false);
      fetchVormingen();
    } catch (error) {
      console.error('Error saving vorming:', error);
      setToast({ message: 'Fout bij opslaan vorming', type: 'error' });
    }
  };

  const handleEdit = (vorming: Vorming) => {
    setEditingVorming(vorming);
    setFormData({
      title: vorming.title,
      description: vorming.description,
      embed_code: vorming.embed_code,
      category: vorming.category,
      display_order: vorming.display_order,
      is_published: vorming.is_published,
      preview: vorming.preview
    });
    setIsCreating(true);
    setSelectedVorming(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze vorming wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('didactiek_vormingen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setToast({ message: 'Vorming verwijderd', type: 'success' });
      fetchVormingen();
    } catch (error) {
      console.error('Error deleting vorming:', error);
      setToast({ message: 'Fout bij verwijderen vorming', type: 'error' });
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingVorming(null);
    setFormData({
      title: '',
      description: '',
      embed_code: '',
      category: 'algemeen',
      display_order: 0,
      is_published: false,
      preview: false
    });
  };

  const categories = Array.from(new Set(vormingen.map(v => v.category)));
  const filteredVormingen = selectedCategory === 'all'
    ? vormingen
    : vormingen.filter(v => v.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vormingen laden...</p>
        </div>
      </div>
    );
  }

  if (selectedVorming && !isCreating) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="secondary" onClick={() => setSelectedVorming(null)}>
            Terug naar overzicht
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedVorming.title}</h2>
                <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {selectedVorming.category}
                </span>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(selectedVorming)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedVorming.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div
              className="mb-6"
              dangerouslySetInnerHTML={{ __html: selectedVorming.embed_code }}
            />

            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: selectedVorming.description }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Didactiek Vormingen</h2>
            <p className="text-gray-600 mt-1">Video trainingen en workshops</p>
          </div>
          {isAdmin && !isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Vorming
            </Button>
          )}
        </div>
      </div>

      {isAdmin && isCreating && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingVorming ? 'Vorming bewerken' : 'Nieuwe Vorming'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titel
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titel van de vorming"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Beschrijving van de vorming..."
                minHeight="150px"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vimeo Embed Code
              </label>
              <textarea
                value={formData.embed_code}
                onChange={(e) => setFormData({ ...formData, embed_code: e.target.value })}
                placeholder='<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/..." ...></iframe></div>'
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Plak de volledige embed code van Vimeo (klik op 'Share' → 'Embed' in Vimeo)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorie
                </label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="algemeen, didactiek, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volgorde
                </label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
                Gepubliceerd (zichtbaar voor gebruikers)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="preview"
                checked={formData.preview}
                onChange={(e) => setFormData({ ...formData, preview: e.target.checked })}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <label htmlFor="preview" className="ml-2 text-sm text-gray-700">
                Preview (alleen zichtbaar voor niet-premium scholen)
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                {editingVorming ? 'Bijwerken' : 'Aanmaken'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Annuleren
              </Button>
            </div>
          </form>
        </div>
      )}

      {categories.length > 1 && (
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle categorieën
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredVormingen.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nog geen vormingen beschikbaar</p>
          {isAdmin && (
            <p className="text-sm text-gray-500 mt-2">Klik op "Nieuwe Vorming" om te beginnen</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVormingen.map((vorming) => (
            <div
              key={vorming.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedVorming(vorming)}
            >
              <div className="relative group">
                <div
                  className="pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: vorming.embed_code }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 flex-1">{vorming.title}</h3>
                  {isAdmin && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(vorming);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(vorming.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {vorming.category}
                  </span>
                  {isAdmin && !vorming.is_published && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                      Niet gepubliceerd
                    </span>
                  )}
                  {isAdmin && vorming.preview && (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                      Preview
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
