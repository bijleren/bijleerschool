import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Save, X, HelpCircle } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface DidactiekFAQProps {
  isAdmin: boolean;
}

export function DidactiekFAQ({ isAdmin }: DidactiekFAQProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'general',
    display_order: 0,
    is_published: false
  });

  useEffect(() => {
    fetchFAQs();
  }, [isAdmin]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('didactiek_faq')
        .select('*')
        .order('display_order', { ascending: true });

      if (!isAdmin) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setToast({ message: 'Fout bij ophalen FAQs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (editingFaq) {
        const { error } = await supabase
          .from('didactiek_faq')
          .update({
            ...formData,
            updated_by: userData.user.id
          })
          .eq('id', editingFaq.id);

        if (error) throw error;
        setToast({ message: 'FAQ bijgewerkt', type: 'success' });
      } else {
        const { error } = await supabase
          .from('didactiek_faq')
          .insert({
            ...formData,
            created_by: userData.user.id,
            updated_by: userData.user.id
          });

        if (error) throw error;
        setToast({ message: 'FAQ aangemaakt', type: 'success' });
      }

      setFormData({
        question: '',
        answer: '',
        category: 'general',
        display_order: 0,
        is_published: false
      });
      setEditingFaq(null);
      setIsCreating(false);
      fetchFAQs();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      setToast({ message: 'Fout bij opslaan FAQ', type: 'error' });
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      display_order: faq.display_order,
      is_published: faq.is_published
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze FAQ wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('didactiek_faq')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setToast({ message: 'FAQ verwijderd', type: 'success' });
      fetchFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      setToast({ message: 'Fout bij verwijderen FAQ', type: 'error' });
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      category: 'general',
      display_order: 0,
      is_published: false
    });
  };

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));
  const filteredFaqs = selectedCategory === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">FAQs laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Didactiek FAQ</h2>
            <p className="text-gray-600 mt-1">Veelgestelde vragen over didactische technieken</p>
          </div>
          {isAdmin && !isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe FAQ
            </Button>
          )}
        </div>
      </div>

      {isAdmin && isCreating && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingFaq ? 'FAQ bewerken' : 'Nieuwe FAQ'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vraag
              </label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Wat is...?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Antwoord
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Het antwoord op de vraag..."
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorie
                </label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="algemeen, technieken, etc."
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

            <div className="flex gap-2">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                {editingFaq ? 'Bijwerken' : 'Aanmaken'}
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

      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12">
          <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nog geen FAQs beschikbaar</p>
          {isAdmin && (
            <p className="text-sm text-gray-500 mt-2">Klik op "Nieuwe FAQ" om te beginnen</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 text-left">
                  <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {faq.category}
                      </span>
                      {isAdmin && !faq.is_published && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          Niet gepubliceerd
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(faq);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(faq.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {expandedFaqId === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedFaqId === faq.id && (
                <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                  <p className="text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
                </div>
              )}
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
