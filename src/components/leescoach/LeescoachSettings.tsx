import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface ReadingTechnique {
  id: string;
  school_id: string | null;
  title: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

interface ReadingIntervention {
  id: string;
  title: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

interface LeescoachSettingsProps {
  schoolId: string;
  onNavigateBack: () => void;
}

export function LeescoachSettings({ schoolId, onNavigateBack }: LeescoachSettingsProps) {
  const [activeTab, setActiveTab] = useState<'techniques' | 'interventions'>('techniques');
  const [techniques, setTechniques] = useState<ReadingTechnique[]>([]);
  const [interventions, setInterventions] = useState<ReadingIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTechniqueId, setEditingTechniqueId] = useState<string | null>(null);
  const [editingInterventionId, setEditingInterventionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [editFormData, setEditFormData] = useState({ title: '', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    const [techniquesRes, interventionsRes] = await Promise.all([
      supabase
        .from('reading_techniques')
        .select('*')
        .or(`is_default.eq.true,school_id.eq.${schoolId}`)
        .order('sort_order'),
      supabase
        .from('reading_interventions')
        .select('*')
        .or(`is_default.eq.true,school_id.eq.${schoolId}`)
        .order('sort_order'),
    ]);

    if (techniquesRes.data) setTechniques(techniquesRes.data);
    if (interventionsRes.data) setInterventions(interventionsRes.data);
    setLoading(false);
  };

  const handleAddTechnique = async () => {
    if (!formData.title.trim()) {
      setMessage('Titel is verplicht');
      return;
    }

    const { error } = await supabase.from('reading_techniques').insert({
      school_id: schoolId,
      title: formData.title,
      description: formData.description || null,
      sort_order: techniques.length,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Techniek toegevoegd');
    setFormData({ title: '', description: '' });
    setShowAddForm(false);
    loadData();
  };

  const handleAddIntervention = async () => {
    if (!formData.title.trim()) {
      setMessage('Titel is verplicht');
      return;
    }

    const { error } = await supabase.from('reading_interventions').insert({
      school_id: schoolId,
      title: formData.title,
      is_default: false,
      sort_order: interventions.filter(i => !i.is_default).length,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Interventie toegevoegd');
    setFormData({ title: '', description: '' });
    setShowAddForm(false);
    loadData();
  };

  const handleToggleTechniqueActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('reading_techniques')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadData();
  };

  const handleToggleInterventionActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('reading_interventions')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadData();
  };

  const handleEditTechnique = (technique: ReadingTechnique) => {
    setEditingTechniqueId(technique.id);
    setEditFormData({ title: technique.title, description: technique.description || '' });
  };

  const handleSaveEditTechnique = async (id: string) => {
    if (!editFormData.title.trim()) {
      setMessage('Titel is verplicht');
      return;
    }

    const { error } = await supabase
      .from('reading_techniques')
      .update({
        title: editFormData.title,
        description: editFormData.description || null,
      })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Techniek bijgewerkt');
    setEditingTechniqueId(null);
    setEditFormData({ title: '', description: '' });
    loadData();
  };

  const handleCancelEditTechnique = () => {
    setEditingTechniqueId(null);
    setEditFormData({ title: '', description: '' });
  };

  const handleDeleteTechnique = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze techniek wilt verwijderen?')) return;

    const { error } = await supabase
      .from('reading_techniques')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Techniek verwijderd');
    loadData();
  };

  const handleEditIntervention = (intervention: ReadingIntervention) => {
    setEditingInterventionId(intervention.id);
    setEditFormData({ title: intervention.title, description: '' });
  };

  const handleSaveEditIntervention = async (id: string) => {
    if (!editFormData.title.trim()) {
      setMessage('Titel is verplicht');
      return;
    }

    const { error } = await supabase
      .from('reading_interventions')
      .update({ title: editFormData.title })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Interventie bijgewerkt');
    setEditingInterventionId(null);
    setEditFormData({ title: '', description: '' });
    loadData();
  };

  const handleCancelEditIntervention = () => {
    setEditingInterventionId(null);
    setEditFormData({ title: '', description: '' });
  };

  const handleDeleteIntervention = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze interventie wilt verwijderen?')) return;

    const { error } = await supabase
      .from('reading_interventions')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Interventie verwijderd');
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onNavigateBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Instellingen</h1>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('techniques')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'techniques'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Leestechnieken
          </button>
          <button
            onClick={() => setActiveTab('interventions')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'interventions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Interventies
          </button>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg">
            {message}
          </div>
        )}

        {activeTab === 'techniques' && (
          <div>
            <div className="mb-6">
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-5 h-5 mr-2" />
                Nieuwe Techniek
              </Button>
            </div>

            {showAddForm && (
              <Card className="p-4 mb-6">
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Titel"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <textarea
                    placeholder="Beschrijving (optioneel)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddTechnique}>
                      <Save className="w-5 h-5 mr-2" />
                      Opslaan
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      <X className="w-5 h-5 mr-2" />
                      Annuleren
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {techniques.map((technique) => (
                <Card key={technique.id} className="p-4">
                  {editingTechniqueId === technique.id ? (
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Titel"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      />
                      <textarea
                        placeholder="Beschrijving (optioneel)"
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => handleSaveEditTechnique(technique.id)} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Opslaan
                        </Button>
                        <Button variant="outline" onClick={handleCancelEditTechnique} size="sm">
                          <X className="w-4 h-4 mr-2" />
                          Annuleren
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{technique.title}</h3>
                          {technique.is_default && (
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded">Standaard</span>
                          )}
                        </div>
                        {technique.description && (
                          <p className="text-sm text-gray-600 mt-1">{technique.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={technique.is_active}
                            onChange={() => handleToggleTechniqueActive(technique.id, technique.is_active)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Actief</span>
                        </label>
                        {!technique.is_default && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTechnique(technique)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTechnique(technique.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {techniques.length === 0 && (
                <Card className="p-8 text-center text-gray-500">
                  Nog geen leestechnieken toegevoegd
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'interventions' && (
          <div>
            <div className="mb-6">
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-5 h-5 mr-2" />
                Nieuwe Interventie
              </Button>
            </div>

            {showAddForm && (
              <Card className="p-4 mb-6">
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Titel"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddIntervention}>
                      <Save className="w-5 h-5 mr-2" />
                      Opslaan
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      <X className="w-5 h-5 mr-2" />
                      Annuleren
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {interventions.map((intervention) => (
                <Card key={intervention.id} className="p-4">
                  {editingInterventionId === intervention.id ? (
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Titel"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => handleSaveEditIntervention(intervention.id)} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Opslaan
                        </Button>
                        <Button variant="outline" onClick={handleCancelEditIntervention} size="sm">
                          <X className="w-4 h-4 mr-2" />
                          Annuleren
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{intervention.title}</h3>
                        {intervention.is_default && (
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">Standaard</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={intervention.is_active}
                            onChange={() => handleToggleInterventionActive(intervention.id, intervention.is_active)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Actief</span>
                        </label>
                        {!intervention.is_default && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditIntervention(intervention)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteIntervention(intervention.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
