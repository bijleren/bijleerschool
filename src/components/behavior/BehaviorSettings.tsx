import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ArrowLeft, Plus, CreditCard as Edit, Trash2, Save, X, AlertTriangle, Tag, Users, Link, Info, Lightbulb, Zap, Ban, Package, Handshake, Target, Scale, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    if (schoolId) {
      setLoading(true);
      setShowAddForm(false);
      setEditingItem(null);
      setFormData({});
      setShowConsequenceConnections(null);
      setBehaviorItemConsequences({});
      setMessage('');

      fetchData().finally(() => setLoading(false));
    }
  }, [schoolId]);

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

      if (activeTab === 'levels' && !editingItem) {
        // Check if we already have 5 severity levels
        if (severityLevels.length >= 5) {
          setMessage('Maximum aantal ernst niveaus (5) bereikt.');
          setLoading(false);
          return;
        }

        const maxLevel = severityLevels.length > 0
          ? Math.max(...severityLevels.map(l => l.level))
          : 0;
        formData.level = maxLevel + 1;
      }

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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gedragscategorieën ({categories.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Categorie toevoegen
        </Button>
      </div>

      {showAddForm && activeTab === 'categories' && (
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
              placeholder="Bijv. Pesten, Verstoring"
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
                placeholder="Beschrijf deze categorie..."
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
                  <option value="Tag">Tag</option>
                  <option value="AlertTriangle">AlertTriangle</option>
                  <option value="Lightbulb">Lightbulb</option>
                  <option value="Zap">Zap</option>
                  <option value="Ban">Ban</option>
                  <option value="Package">Package</option>
                  <option value="Handshake">Handshake</option>
                  <option value="Target">Target</option>
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
                {editingItem ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {categories.length === 0 ? (
          <Card className="text-center py-8">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen categorieën gevonden</h3>
            <p className="text-gray-600">Voeg categorieën toe om gedrag te organiseren.</p>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {React.createElement(getIconComponent(category.icon), { className: "w-4 h-4" })}
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
          ))
        )}
      </div>
    </div>
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndSeverityLevels = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = severityLevels.findIndex((level) => level.id === active.id);
    const newIndex = severityLevels.findIndex((level) => level.id === over.id);

    const reorderedLevels = arrayMove(severityLevels, oldIndex, newIndex);

    setSeverityLevels(reorderedLevels);

    try {
      // Prepare updates array for the database function
      const levelUpdates = reorderedLevels.map((level, index) => ({
        id: level.id,
        level: index + 1
      }));

      // Call the database function to update all levels atomically
      const { error } = await supabase.rpc('reorder_severity_levels', {
        level_updates: levelUpdates
      });

      if (error) throw error;

      setMessage('Volgorde succesvol bijgewerkt!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van de volgorde.');
      fetchData();
    }
  };

  const SortableSeverityLevel = ({ level }: { level: BehaviorSeverityLevel }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: level.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style}>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: level.color }}
              >
                {level.level}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{level.name}</h4>
                {level.description && (
                  <p className="text-sm text-gray-600">{level.description}</p>
                )}
                <p className="text-xs text-gray-500">Niveau: {level.level}</p>
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
      </div>
    );
  };

  const renderSeverityLevels = () => {
    const maxLevelsReached = severityLevels.length >= 5;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Ernst Niveaus ({severityLevels.length}/5)</h3>
            {severityLevels.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">Sleep om de volgorde te wijzigen</p>
            )}
            {maxLevelsReached && (
              <p className="text-sm text-amber-600 mt-1">Maximum aantal niveaus bereikt</p>
            )}
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={maxLevelsReached}
          >
            <Plus className="w-4 h-4 mr-2" />
            Niveau toevoegen
          </Button>
        </div>

      {showAddForm && activeTab === 'levels' && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Niveau bewerken' : 'Nieuw ernst niveau toevoegen'}
          </h4>
          <div className="space-y-4">
            <Input
              label="Naam"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Licht, Matig, Ernstig"
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
                placeholder="Beschrijf dit ernst niveau..."
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
                {editingItem ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {severityLevels.length === 0 ? (
          <Card className="text-center py-8">
            <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen ernst niveaus gevonden</h3>
            <p className="text-gray-600">Voeg ernst niveaus toe om gedrag te classificeren.</p>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndSeverityLevels}
          >
            <SortableContext
              items={severityLevels.map((level) => level.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {severityLevels.map((level) => (
                  <SortableSeverityLevel key={level.id} level={level} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
    );
  };

  const renderBehaviorItems = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gedragsitems ({behaviorItems.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Item toevoegen
        </Button>
      </div>

      {showAddForm && activeTab === 'items' && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Item bewerken' : 'Nieuw gedragsitem toevoegen'}
          </h4>
          <div className="space-y-4">
            <Input
              label="Naam"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Hardop praten, Pesten"
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
                placeholder="Beschrijf dit gedragsitem..."
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
                  <option value="">Selecteer ernst niveau</option>
                  {severityLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name} (Niveau {level.level})
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
                {editingItem ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {behaviorItems.length === 0 ? (
          <Card className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen gedragsitems gevonden</h3>
            <p className="text-gray-600">Voeg gedragsitems toe om incidenten te kunnen melden.</p>
          </Card>
        ) : (
          behaviorItems.map((item) => (
            <Card key={item.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: item.behavior_categories.color }}
                    >
                      {React.createElement(getIconComponent(item.behavior_categories.icon), { className: "w-3 h-3" })}
                    </div>
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: item.behavior_severity_levels.color }}
                    >
                      {item.behavior_severity_levels.level}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {item.behavior_categories.name} • {item.behavior_severity_levels.name}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      if (showConsequenceConnections === item.id) {
                        setShowConsequenceConnections(null);
                      } else {
                        setShowConsequenceConnections(item.id);
                        fetchBehaviorItemConsequences(item.id);
                      }
                    }}
                  >
                    <Link className="w-4 h-4" />
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
              
              {/* Consequence Connections */}
              {showConsequenceConnections === item.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Gekoppelde consequenties</h5>
                  
                  {/* Available consequences to connect */}
                  <div className="mb-4">
                    <h6 className="text-sm font-medium text-gray-700 mb-2">Beschikbare consequenties</h6>
                    <div className="flex flex-wrap gap-2">
                      {consequences
                        .filter(consequence => 
                          !behaviorItemConsequences[item.id]?.some(bic => bic.consequence_id === consequence.id)
                        )
                        .map((consequence) => (
                        <Button
                          key={consequence.id}
                          variant="secondary"
                          size="sm"
                          onClick={() => connectConsequence(item.id, consequence.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {consequence.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Connected consequences */}
                  <div className="space-y-2">
                    {behaviorItemConsequences[item.id]?.map((connection) => (
                      <div key={connection.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{connection.consequences.name}</span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => disconnectConsequence(connection.id, item.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )) || []}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderStudentRoles = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Student Rollen ({studentRoles.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Rol toevoegen
        </Button>
      </div>

      {showAddForm && activeTab === 'roles' && (
        <Card>
          <h4 className="text-lg font-semibold mb-4">
            {editingItem ? 'Rol bewerken' : 'Nieuwe student rol toevoegen'}
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
                  Standaard rol
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelEdit}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                {editingItem ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {studentRoles.length === 0 ? (
          <Card className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen student rollen gevonden</h3>
            <p className="text-gray-600">Voeg rollen toe om studenten te categoriseren bij incidenten.</p>
          </Card>
        ) : (
          studentRoles.map((role) => (
            <Card key={role.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: role.color }}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                      {role.is_default && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Consequenties ({consequences.length})</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Consequentie toevoegen
        </Button>
      </div>

      {showAddForm && activeTab === 'consequences' && (
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
              placeholder="Bijv. Nablijven, Gesprek met mentor"
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
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={cancelEdit}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                {editingItem ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {consequences.length === 0 ? (
          <Card className="text-center py-8">
            <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen consequenties gevonden</h3>
            <p className="text-gray-600">Voeg consequenties toe om follow-up acties te definiëren.</p>
          </Card>
        ) : (
          consequences.map((consequence) => (
            <Card key={consequence.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Scale className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{consequence.name}</h4>
                    {consequence.description && (
                      <p className="text-sm text-gray-600">{consequence.description}</p>
                    )}
                  </div>
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
          <p className="text-gray-600">Beheer categorieën, ernst niveaus en gedragsitems</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.toLowerCase().includes('succesvol')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Info Block */}
      {renderInfoBlock()}

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
            <Scale className="w-4 h-4 inline mr-2" />
            Ernst Niveaus
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
            <AlertTriangle className="w-4 h-4 inline mr-2" />
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
            <Target className="w-4 h-4 inline mr-2" />
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