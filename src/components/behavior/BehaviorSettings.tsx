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
      {categories.map((category) => (
        <Card key={category.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: category.color }}
              >
                {React.createElement(getIconComponent(category.icon), { className: "w-4 h-4" })}
              </div>
              <div>
                <h3 className="font-medium">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-600">{category.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startEdit(category)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal({
                  isOpen: true,
                  title: 'Categorie verwijderen',
                  message: `Weet je zeker dat je "${category.name}" wilt verwijderen?`,
                  onConfirm: () => {
                    handleDelete(category.id);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                  }
                })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );