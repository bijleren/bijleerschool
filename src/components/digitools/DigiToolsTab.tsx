import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Plus, Search, ExternalLink, CreditCard as Edit2, Trash2, Sparkles, X } from 'lucide-react';

interface DigiTool {
  id: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  link: string;
  is_beta: boolean;
  is_new: boolean;
  is_active: boolean;
  visible_to_users: boolean;
  requires_premium: boolean;
  created_at: string;
}

export function DigiToolsTab() {
  const { user } = useAuth();
  const [tools, setTools] = useState<DigiTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<DigiTool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState<DigiTool | null>(null);
  const [spotlightTool, setSpotlightTool] = useState<DigiTool | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    screenshot_url: '',
    link: '',
    is_beta: false,
    is_new: false,
    is_active: true,
    visible_to_users: true,
    requires_premium: false,
  });

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      fetchTools();
    }
  }, [user]);

  useEffect(() => {
    const filtered = tools.filter(tool =>
      tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTools(filtered);
  }, [searchTerm, tools]);

  useEffect(() => {
    if (tools.length > 0) {
      const randomTool = tools[Math.floor(Math.random() * tools.length)];
      setSpotlightTool(randomTool);
    }
  }, [tools]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data: platformSchool, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('name', 'Bijleren')
        .maybeSingle();

      if (schoolError || !platformSchool) {
        console.error('Error fetching platform school:', schoolError);
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_schools')
        .select('role, is_active, school_id')
        .eq('user_id', user.id)
        .eq('school_id', platformSchool.id)
        .eq('is_active', true)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      const isPlatformAdmin = data !== null;
      setIsAdmin(isPlatformAdmin);
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
    }
  };

  const fetchTools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('digitools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTool) {
        const { error } = await supabase
          .from('digitools')
          .update(formData)
          .eq('id', editingTool.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('digitools')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingTool(null);
      resetForm();
      fetchTools();
    } catch (error) {
      console.error('Error saving tool:', error);
      alert('Fout bij opslaan van tool');
    }
  };

  const handleEdit = (tool: DigiTool) => {
    setEditingTool(tool);
    setFormData({
      title: tool.title,
      description: tool.description,
      screenshot_url: tool.screenshot_url || '',
      link: tool.link,
      is_beta: tool.is_beta,
      is_new: tool.is_new,
      is_active: tool.is_active,
      visible_to_users: tool.visible_to_users,
      requires_premium: tool.requires_premium,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze tool wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('digitools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTools();
    } catch (error) {
      console.error('Error deleting tool:', error);
      alert('Fout bij verwijderen van tool');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      screenshot_url: '',
      link: '',
      is_beta: false,
      is_new: false,
      is_active: true,
      visible_to_users: true,
      requires_premium: false,
    });
  };

  const openModal = () => {
    resetForm();
    setEditingTool(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">DigiTools</h1>
          <p className="text-gray-600 mt-1">Ontdek digitale tools en bronnen</p>
        </div>
        {isAdmin && (
          <Button onClick={openModal} className="bg-#946B29 hover:bg-#74531F text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tool Toevoegen
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-#3D2B10">Admin Functies</h3>
              <p className="text-sm text-#74531F">Beheer digitale tools voor alle gebruikers</p>
            </div>
            <Button onClick={openModal} className="bg-#946B29 hover:bg-#74531F text-white">
              <Plus className="w-5 h-5 mr-2" />
              Nieuwe Tool Toevoegen
            </Button>
          </div>
        </div>
      )}

      {spotlightTool && (
        <Card className="bg-gradient-to-r from-amber-50 to-amber-50 border-2 border-amber-200">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-#946B29" />
              <h2 className="text-xl font-bold text-gray-900">Tool in de Kijker</h2>
            </div>
            <div className="flex gap-6">
              {spotlightTool.screenshot_url && (
                <img
                  src={spotlightTool.screenshot_url}
                  alt={spotlightTool.title}
                  className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{spotlightTool.title}</h3>
                  {spotlightTool.is_new && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">NEW</span>
                  )}
                  {spotlightTool.is_beta && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">BETA</span>
                  )}
                </div>
                <p className="text-gray-700 mb-4">{spotlightTool.description}</p>
                <Button
                  onClick={() => window.open(spotlightTool.link, '_blank')}
                  variant="primary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Tool
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Zoek tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Tools laden...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beschrijving
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTools.map((tool) => (
                <tr
                  key={tool.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.open(tool.link, '_blank')}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {tool.screenshot_url && (
                        <img
                          src={tool.screenshot_url}
                          alt={tool.title}
                          className="w-12 h-12 object-cover rounded border border-gray-200"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{tool.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{tool.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {tool.is_new && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          NIEUW
                        </span>
                      )}
                      {tool.is_beta && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                          BETA
                        </span>
                      )}
                      {!tool.is_active && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                          INACTIEF
                        </span>
                      )}
                      {!tool.visible_to_users && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          VERBORGEN
                        </span>
                      )}
                      {tool.requires_premium && (
                        <span className="px-2 py-1 bg-amber-100 text-#74531F text-xs font-semibold rounded">
                          PREMIUM
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(tool.link, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(tool)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(tool.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">Geen tools gevonden</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTool ? 'Tool Bewerken' : 'Nieuwe Tool Toevoegen'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingTool(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschrijving
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screenshot URL
                  </label>
                  <Input
                    type="url"
                    value={formData.screenshot_url}
                    onChange={(e) => setFormData({ ...formData, screenshot_url: e.target.value })}
                    placeholder="https://example.com/screenshot.png"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link
                  </label>
                  <Input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://example.com"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_new}
                        onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                        className="w-4 h-4 text-#946B29 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Markeer als Nieuw</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_beta}
                        onChange={(e) => setFormData({ ...formData, is_beta: e.target.checked })}
                        className="w-4 h-4 text-#946B29 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Markeer als Beta</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-#946B29 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Actief</span>
                    </label>
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.visible_to_users}
                        onChange={(e) => setFormData({ ...formData, visible_to_users: e.target.checked })}
                        className="w-4 h-4 text-#946B29 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Zichtbaar voor Eindgebruikers</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_premium}
                        onChange={(e) => setFormData({ ...formData, requires_premium: e.target.checked })}
                        className="w-4 h-4 text-#946B29 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Vereist Premium School</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTool(null);
                    }}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingTool ? 'Tool Bijwerken' : 'Tool Toevoegen'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
