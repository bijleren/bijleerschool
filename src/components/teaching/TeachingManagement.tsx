import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ArrowLeft, Plus, CreditCard as Edit, Trash2, Save, X, Users, BookMarked, Wrench, Tag } from 'lucide-react';

interface AgeGroup {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Material {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
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

interface TeachingManagementProps {
  onBack: () => void;
  ageGroups: AgeGroup[];
  subjects: Subject[];
  materials: Material[];
  techniqueCategories: TechniqueCategory[];
  onDataUpdated: () => void;
}

export function TeachingManagement({ 
  onBack, 
  ageGroups, 
  subjects, 
  materials, 
  techniqueCategories,
  onDataUpdated 
}: TeachingManagementProps) {
  const [activeTab, setActiveTab] = useState<'age_groups' | 'subjects' | 'materials' | 'categories'>('age_groups');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [message, setMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleSave = async (type: 'age_groups' | 'subjects' | 'materials' | 'categories') => {
    try {
      let error;

      const tableName = type === 'categories' ? 'technique_categories' : type;

      if (editingItem) {
        ({ error } = await supabase
          .from(tableName)
          .update(formData)
          .eq('id', editingItem));
      } else {
        ({ error } = await supabase
          .from(tableName)
          .insert(formData));
      }

      if (error) throw error;

      setMessage('Succesvol opgeslagen!');
      setShowAddForm(false);
      setEditingItem(null);
      setFormData({});
      onDataUpdated();
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('Er is een fout opgetreden bij het opslaan.');
    }
  };

  const handleDelete = async (type: 'age_groups' | 'subjects' | 'materials' | 'categories', id: string) => {
    try {
      const tableName = type === 'categories' ? 'technique_categories' : type;
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setMessage('Succesvol verwijderd!');
      onDataUpdated();
    } catch (error) {
      console.error('Error deleting:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen.');
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item.id);
    setFormData(item);
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const renderItems = (items: any[], type: 'age_groups' | 'subjects' | 'materials' | 'categories', icon: any) => {
    const Icon = icon;
    
    const getTitle = () => {
      switch (type) {
        case 'age_groups': return 'Leeftijdsgroepen';
        case 'subjects': return 'Vakken';
        case 'materials': return 'Materialen';
        case 'categories': return 'Categorieën';
        default: return 'Items';
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon className="w-5 h-5 mr-2" />
            {getTitle()}
          </h3>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Toevoegen
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <h4 className="text-lg font-semibold mb-4">
              {editingItem ? 'Bewerken' : 'Nieuwe toevoegen'}
            </h4>
            <div className="space-y-4">
              <Input
                label="Naam"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschrijving
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              {type === 'categories' && (
                <>
                  <Input
                    label="Icoon (Lucide naam)"
                    value={formData.icon || 'Tag'}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="BookOpen, Users, Monitor, etc."
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kleur
                    </label>
                    <input
                      type="color"
                      value={formData.color || '#6B7280'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              <Input
                label="Sorteervolgorde"
                type="number"
                value={formData.sort_order || 0}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              />
              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Annuleren
                </Button>
                <Button onClick={() => handleSave(type)}>
                  <Save className="w-4 h-4 mr-2" />
                  Opslaan
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-4">
          {items.filter(item => item.is_active).map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {type === 'categories' && (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-600">{item.description}</p>
                  )}
                    {type === 'categories' && (
                      <p className="text-xs text-gray-500">Icoon: {item.icon}</p>
                    )}
                  <p className="text-xs text-gray-500">Volgorde: {item.sort_order}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Item verwijderen',
                      message: `Weet je zeker dat je "${item.name}" wilt verwijderen?`,
                      onConfirm: () => {
                        handleDelete(type, item.id);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      },
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar technieken
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Categorieën Beheren</h1>
          <p className="text-gray-600">Beheer leeftijdsgroepen, vakken en materialen</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('Succesvol')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('age_groups');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'age_groups'
                ? 'border-amber-500 text-#946B29'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Leeftijdsgroepen
          </button>
          <button
            onClick={() => {
              setActiveTab('subjects');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subjects'
                ? 'border-amber-500 text-#946B29'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookMarked className="w-4 h-4 inline mr-2" />
            Vakken
          </button>
          <button
            onClick={() => {
              setActiveTab('materials');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'materials'
                ? 'border-amber-500 text-#946B29'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Wrench className="w-4 h-4 inline mr-2" />
            Materialen
            </button>
            <button
              onClick={() => {
                setActiveTab('categories');
                cancelEdit();
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-amber-500 text-#946B29'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Tag className="w-4 h-4 inline mr-2" />
              Categorieën
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'age_groups' && renderItems(ageGroups, 'age_groups', Users)}
      {activeTab === 'subjects' && renderItems(subjects, 'subjects', BookMarked)}
      {activeTab === 'materials' && renderItems(materials, 'materials', Wrench)}
      {activeTab === 'categories' && renderItems(techniqueCategories, 'categories', Tag)}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Verwijderen"
        cancelText="Annuleren"
        variant="danger"
      />
    </div>
  );
}