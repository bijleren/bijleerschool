import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  AlertTriangle,
  Tag,
  Users,
  Link,
  Info,
  Lightbulb,
  Zap,
  Ban,
  Package,
  Handshake,
  Target,
  Scale
} from 'lucide-react';

interface BehaviorCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_active: boolean;
}

interface BehaviorSeverityLevel {
  id: string;
  name: string;
  level: number;
  color: string;
  description: string | null;
  is_active: boolean;
}

interface BehaviorItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  severity_level_id: string;
  is_active: boolean;
  behavior_categories: BehaviorCategory;
  behavior_severity_levels: BehaviorSeverityLevel;
}

interface StudentRole {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
}

interface Consequence {
  id: string;
  name: string;
  description: string | null;
  severity_level: number | null;
  is_active: boolean;
}

interface BehaviorItemConsequence {
  id: string;
  behavior_item_id: string;
  consequence_id: string;
  is_default: boolean;
  consequences: Consequence;
}

interface BehaviorSettingsProps {
  schoolId: string;
  onBack: () => void;
}

export function BehaviorSettings({ schoolId, onBack }: BehaviorSettingsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'categories' | 'levels' | 'items' | 'roles' | 'consequences'>('categories');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Data states
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [severityLevels, setSeverityLevels] = useState<BehaviorSeverityLevel[]>([]);
  const [behaviorItems, setBehaviorItems] = useState<BehaviorItem[]>([]);
  const [studentRoles, setStudentRoles] = useState<StudentRole[]>([]);
  const [consequences, setConsequences] = useState<Consequence[]>([]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Consequence connection states
  const [showConsequenceConnections, setShowConsequenceConnections] = useState<string | null>(null);
  const [behaviorItemConsequences, setBehaviorItemConsequences] = useState<{ [key: string]: BehaviorItemConsequence[] }>({});

  // Confirmation modal
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchCategories(),
        fetchSeverityLevels(),
        fetchBehaviorItems(),
        fetchStudentRoles(),
        fetchConsequences()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_categories')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSeverityLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_severity_levels')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('level');

      if (error) throw error;
      setSeverityLevels(data || []);
    } catch (error) {
      console.error('Error fetching severity levels:', error);
    }
  };

  const fetchBehaviorItems = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_items')
        .select(`
          *,
          behavior_categories (*),
          behavior_severity_levels (*)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBehaviorItems(data || []);
    } catch (error) {
      console.error('Error fetching behavior items:', error);
    }
  };

  const fetchStudentRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('student_roles')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStudentRoles(data || []);
    } catch (error) {
      console.error('Error fetching student roles:', error);
    }
  };

  const fetchConsequences = async () => {
    try {
      const { data: consequencesData, error: consequencesError } = await supabase
        .from('consequences')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (consequencesError) throw consequencesError;
      setConsequences(consequencesData || []);
    } catch (error) {
      console.error('Error fetching consequences:', error);
    }
  };

  const fetchBehaviorItemConsequences = async (behaviorItemId: string) => {
    try {
      const { data, error } = await supabase
        .from('behavior_item_consequences')
        .select(`
          *,
          consequences (*)
        `)
        .eq('behavior_item_id', behaviorItemId);

      if (error) throw error;
      setBehaviorItemConsequences(prev => ({
        ...prev,
        [behaviorItemId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching behavior item consequences:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      let error;
      const tableName = getTableName();
      
      // For student roles, handle default role logic
      if (activeTab === 'roles' && formData.is_default) {
        // First, remove default from all other roles
        await supabase
          .from('student_roles')
          .update({ is_default: false })
          .eq('school_id', schoolId);
      }
      
      // For behavior_items, filter out nested objects that are not actual columns
      let saveData = formData;
      if (tableName === 'behavior_items') {
        const { behavior_categories, behavior_severity_levels, ...cleanData } = formData;
        saveData = cleanData;
      }

      if (editingItem) {
        ({ error } = await supabase
          .from(tableName)
          .update(saveData)
          .eq('id', editingItem.id));
      } else {
        ({ error } = await supabase
          .from(tableName)
          .insert({
            ...saveData,
            school_id: schoolId
          }));
      }

      if (error) throw error;

      setMessage('Succesvol opgeslagen!');
      setShowAddForm(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('Er is een fout opgetreden bij het opslaan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const tableName = getTableName();
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setMessage('Succesvol verwijderd!');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen.');
    }
  };

  const connectConsequence = async (behaviorItemId: string, consequenceId: string) => {
    try {
      const { error } = await supabase
        .from('behavior_item_consequences')
        .insert({
          behavior_item_id: behaviorItemId,
          consequence_id: consequenceId,
          is_default: false
        });

      if (error) throw error;

      setMessage('Consequentie succesvol gekoppeld!');
      fetchBehaviorItemConsequences(behaviorItemId);
    } catch (error) {
      console.error('Error connecting consequence:', error);
      setMessage('Er is een fout opgetreden bij het koppelen van de consequentie.');
    }
  };

  const disconnectConsequence = async (connectionId: string, behaviorItemId: string) => {
    try {
      const { error } = await supabase
        .from('behavior_item_consequences')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setMessage('Consequentie succesvol ontkoppeld!');
      fetchBehaviorItemConsequences(behaviorItemId);
    } catch (error) {
      console.error('Error disconnecting consequence:', error);
      setMessage('Er is een fout opgetreden bij het ontkoppelen van de consequentie.');
    }
  };

  const getTableName = () => {
    switch (activeTab) {
      case 'categories': return 'behavior_categories';
      case 'levels': return 'behavior_severity_levels';
      case 'items': return 'behavior_items';
      case 'roles': return 'student_roles';
      case 'consequences': return 'consequences';
      default: return 'behavior_categories';
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Lightbulb,
      Zap,
      Ban,
      Package,
      AlertTriangle,
      Handshake,
      Target,
      Tag
    };
    return icons[iconName] || Tag;
  };

  const renderInfoBlock = () => {
    const infoContent = {
      categories: {
        title: "Gedragscategorieën",
        description: "Categorieën helpen je gedrag te groeperen in logische thema's. Dit maakt het makkelijker om patronen te herkennen en analyses te maken.",
        examples: ["Pesten", "Agressie", "Verstoring", "Sociaal gedrag", "Academisch gedrag"]
      },
      levels: {
        title: "Ernst Niveaus",
        description: "Ernst niveaus geven aan hoe ernstig een gedragsincident is. Gebruik een schaal van 1-5 waarbij 1 licht is en 5 zeer ernstig.",
        examples: ["Niveau 1: Licht (bijv. praten tijdens les)", "Niveau 3: Matig (bijv. niet luisteren)", "Niveau 5: Ernstig (bijv. agressief gedrag)"]
      },
      items: {
        title: "Gedragsitems",
        description: "Gedragsitems zijn specifieke gedragingen die ontstaan door een categorie en ernst niveau te combineren. Ze beschrijven concrete acties.",
        examples: ["Pesten + Licht = Bijnaam gebruiken", "Verstoring + Matig = Hardop praten", "Agressie + Ernstig = Fysiek geweld"]
      },
      roles: {
        title: "Student Rollen",
        description: "Student rollen helpen je om de verschillende betrokkenen bij een incident te categoriseren. Gebruik je eigen woordenschat die past bij je team.",
        examples: ["Dader", "Slachtoffer", "Getuige", "Omstander", "Bemiddelaar"]
      },
      consequences: {
        title: "Consequenties",
        description: "Consequenties zijn de maatregelen die genomen kunnen worden naar aanleiding van gedragsincidenten. Je kunt ze koppelen aan specifieke gedragsitems.",
        examples: ["Gesprek met mentor", "Nablijven", "Ouders bellen", "Time-out", "Herstelgesprek"]
      }
    };

    const info = infoContent[activeTab];

    return (
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">{info.title}</h3>
            <p className="text-blue-800 mb-3">{info.description}</p>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Voorbeelden:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                {info.examples.map((example, index) => (
                  <li key={index}>• {example}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderCategories = () => (
    <div className="space-y-4">
      {renderInfoBlock()}
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gedragscategorieën ({categories.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Categorie toevoegen
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Categorie bewerken' : 'Nieuwe categorie toevoegen'}
          </h4>
          <div className="space-y-4">
            <Input
              label="Naam"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Pesten, Agressie"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Beschrijf wat deze categorie omvat..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icoon
                </label>
                <select
                  value={formData.icon || 'Tag'}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Tag">Tag (standaard)</option>
                  <option value="AlertTriangle">Waarschuwing</option>
                  <option value="Zap">Energie</option>
                  <option value="Ban">Verbod</option>
                  <option value="Handshake">Sociaal</option>
                  <option value="Target">Doelgericht</option>
                </select>
              </div>
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
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelEdit}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {categories.length === 0 ? (
          <Card className="text-center py-8">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen categorieën gevonden</h3>
            <p className="text-gray-600">Voeg categorieën toe om gedrag te kunnen classificeren.</p>
          </Card>
        ) : (
          categories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            return (
              <Card key={category.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <IconComponent 
                        className="w-5 h-5"
                        style={{ color: category.color }}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{category.name}</h4>
                      {category.description && (
                        <p className="text-sm text-gray-600">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(category)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: 'Categorie verwijderen',
                        message: `Weet je zeker dat je "${category.name}" wilt verwijderen?`,
                        onConfirm: () => {
                          handleDelete(category.id);
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        },
                      })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  const renderSeverityLevels = () => (
    <div className="space-y-4">
      {renderInfoBlock()}
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Ernst Niveaus ({severityLevels.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Niveau toevoegen
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Niveau bewerken' : 'Nieuw ernst niveau toevoegen'}
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Naam"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Bijv. Licht, Matig, Ernstig"
              />
              <Input
                label="Niveau (1-5)"
                type="number"
                min="1"
                max="5"
                value={formData.level || ''}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Beschrijf wanneer dit niveau van toepassing is..."
              />
            </div>
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
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelEdit}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {severityLevels.length === 0 ? (
          <Card className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen ernst niveaus gevonden</h3>
            <p className="text-gray-600">Voeg ernst niveaus toe om de ernst van gedrag te kunnen beoordelen.</p>
          </Card>
        ) : (
          severityLevels.map((level) => (
            <Card key={level.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: level.color }}
                  >
                    {level.level}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{level.name}</h4>
                    {level.description && (
                      <p className="text-sm text-gray-600">{level.description}</p>
                    )}
                    <p className="text-xs text-gray-500">Niveau {level.level}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(level)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Ernst niveau verwijderen',
                      message: `Weet je zeker dat je "${level.name}" wilt verwijderen?`,
                      onConfirm: () => {
                        handleDelete(level.id);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      },
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderBehaviorItems = () => (
    <div className="space-y-4">
      {renderInfoBlock()}
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gedragsitems ({behaviorItems.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Gedragsitem toevoegen
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Gedragsitem bewerken' : 'Nieuw gedragsitem toevoegen'}
          </h4>
          <div className="space-y-4">
            <Input
              label="Naam"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Bijnaam gebruiken, Hardop praten"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Beschrijf dit specifieke gedrag..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categorie
                </label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecteer categorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ernst niveau
                </label>
                <select
                  value={formData.severity_level_id || ''}
                  onChange={(e) => setFormData({ ...formData, severity_level_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecteer niveau</option>
                  {severityLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      Niveau {level.level} - {level.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelEdit}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {behaviorItems.length === 0 ? (
          <Card className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen gedragsitems gevonden</h3>
            <p className="text-gray-600">Voeg gedragsitems toe door categorieën en ernst niveaus te combineren.</p>
          </Card>
        ) : (
          behaviorItems.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: item.behavior_categories.color }}
                    >
                      {item.behavior_categories.name}
                    </span>
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: item.behavior_severity_levels.color }}
                    >
                      Niveau {item.behavior_severity_levels.level}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowConsequenceConnections(item.id);
                      fetchBehaviorItemConsequences(item.id);
                    }}
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Consequenties
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Gedragsitem verwijderen',
                      message: `Weet je zeker dat je "${item.name}" wilt verwijderen?`,
                      onConfirm: () => {
                        handleDelete(item.id);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      },
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Consequence Connections Modal */}
      {showConsequenceConnections && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowConsequenceConnections(null)}
            />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setShowConsequenceConnections(null)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Consequenties beheren</h3>
                <p className="text-gray-600">
                  Koppel consequenties aan "{behaviorItems.find(item => item.id === showConsequenceConnections)?.name}"
                </p>
              </div>

              <div className="space-y-4">
                {/* Connected Consequences */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Gekoppelde consequenties</h4>
                  <div className="space-y-2">
                    {(behaviorItemConsequences[showConsequenceConnections] || []).map((connection) => (
                      <div key={connection.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900">{connection.consequences.name}</span>
                          {connection.consequences.description && (
                            <p className="text-sm text-gray-600">{connection.consequences.description}</p>
                          )}
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => disconnectConsequence(connection.id, showConsequenceConnections)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {(behaviorItemConsequences[showConsequenceConnections] || []).length === 0 && (
                      <p className="text-gray-500 text-center py-4">Geen consequenties gekoppeld</p>
                    )}
                  </div>
                </div>

                {/* Available Consequences */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Beschikbare consequenties</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {consequences
                      .filter(consequence => 
                        !(behaviorItemConsequences[showConsequenceConnections] || [])
                          .some(connection => connection.consequences.id === consequence.id)
                      )
                      .map((consequence) => (
                        <div key={consequence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{consequence.name}</span>
                            {consequence.description && (
                              <p className="text-sm text-gray-600">{consequence.description}</p>
                            )}
                            {consequence.severity_level && (
                              <p className="text-xs text-gray-500">Geschikt voor niveau {consequence.severity_level}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => connectConsequence(showConsequenceConnections, consequence.id)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Koppelen
                          </Button>
                        </div>
                      ))}
                    {consequences
                      .filter(consequence => 
                        !(behaviorItemConsequences[showConsequenceConnections] || [])
                          .some(connection => connection.consequences.id === consequence.id)
                      ).length === 0 && (
                      <p className="text-gray-500 text-center py-4">Alle consequenties zijn al gekoppeld</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStudentRoles = () => (
    <div className="space-y-4">
      {renderInfoBlock()}
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Student Rollen ({studentRoles.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Rol toevoegen
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Student rol bewerken' : 'Nieuwe student rol toevoegen'}
          </h4>
          <div className="space-y-4">
            <Input
              label="Naam"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Dader, Slachtoffer, Getuige"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Beschrijf deze rol..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.is_default || false}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                  Standaard rol voor nieuwe incidenten
                </label>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> De standaard rol wordt automatisch geselecteerd bij nieuwe incidenten. 
                Je kunt maar één standaard rol hebben - het instellen van een nieuwe standaard rol 
                verwijdert de standaard status van andere rollen.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelEdit}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {studentRoles.length === 0 ? (
          <Card className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen student rollen gevonden</h3>
            <p className="text-gray-600">Voeg student rollen toe om betrokkenen bij incidenten te kunnen categoriseren.</p>
          </Card>
        ) : (
          studentRoles.map((role) => (
            <Card key={role.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                      {role.is_default && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                          Standaard
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-600">{role.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(role)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Student rol verwijderen',
                      message: `Weet je zeker dat je "${role.name}" wilt verwijderen?`,
                      onConfirm: () => {
                        handleDelete(role.id);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      },
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderConsequences = () => (
    <div className="space-y-4">
      {renderInfoBlock()}
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Consequenties ({consequences.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Consequentie toevoegen
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Consequentie bewerken' : 'Nieuwe consequentie toevoegen'}
          </h4>
          <div className="space-y-4">
            <Input
              label="Naam"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Gesprek met mentor, Nablijven"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Beschrijf deze consequentie..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geschikt voor ernst niveau (optioneel)
              </label>
              <select
                value={formData.severity_level || ''}
                onChange={(e) => setFormData({ ...formData, severity_level: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Alle niveaus</option>
                {severityLevels.map((level) => (
                  <option key={level.id} value={level.level}>
                    Niveau {level.level} - {level.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelEdit}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {consequences.length === 0 ? (
          <Card className="text-center py-8">
            <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen consequenties gevonden</h3>
            <p className="text-gray-600">Voeg consequenties toe om ze te kunnen koppelen aan gedragsitems.</p>
          </Card>
        ) : (
          consequences.map((consequence) => (
            <Card key={consequence.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{consequence.name}</h4>
                  {consequence.description && (
                    <p className="text-sm text-gray-600">{consequence.description}</p>
                  )}
                  {consequence.severity_level && (
                    <p className="text-xs text-gray-500">Geschikt voor niveau {consequence.severity_level}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(consequence)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Consequentie verwijderen',
                      message: `Weet je zeker dat je "${consequence.name}" wilt verwijderen?`,
                      onConfirm: () => {
                        handleDelete(consequence.id);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      },
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar incidenten
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Gedrag Instellingen</h1>
          <p className="text-gray-600">Beheer categorieën, niveaus en gedragsitems</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('succesvol') || message.includes('Succesvol')
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
              setActiveTab('categories');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            Categorieën
          </button>
          <button
            onClick={() => {
              setActiveTab('levels');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'levels'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Niveaus
          </button>
          <button
            onClick={() => {
              setActiveTab('items');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Gedragsitems
          </button>
          <button
            onClick={() => {
              setActiveTab('roles');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Student Rollen
          </button>
          <button
            onClick={() => {
              setActiveTab('consequences');
              cancelEdit();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'consequences'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Scale className="w-4 h-4 inline mr-2" />
            Consequenties
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'categories' && renderCategories()}
      {activeTab === 'levels' && renderSeverityLevels()}
      {activeTab === 'items' && renderBehaviorItems()}
      {activeTab === 'roles' && renderStudentRoles()}
      {activeTab === 'consequences' && renderConsequences()}

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