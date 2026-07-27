import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ArrowLeft, Plus, CreditCard as Edit, Trash2, Save, X, Clock, BookOpen, Coffee, Utensils, MoreHorizontal } from 'lucide-react';

interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
  school_id: string;
  is_active: boolean;
  created_at: string;
}

interface TemplateBlock {
  id: string;
  template_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  block_type: 'lesson' | 'break' | 'lunch' | 'other';
  title: string;
  subject_id: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  school_subjects?: {
    id: string;
    title: string;
    icon: string;
    color: string;
  };
}

interface SchoolSubject {
  id: string;
  title: string;
  icon: string;
  color: string;
  sort_order: number;
}

interface TemplateBuilderProps {
  schoolId: string;
  onBack: () => void;
  onTemplateCreated: () => void;
  editingTemplate?: DayTemplate | null;
  onTemplateUpdated?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Maandag' },
  { value: 2, label: 'Dinsdag' },
  { value: 3, label: 'Woensdag' },
  { value: 4, label: 'Donderdag' },
  { value: 5, label: 'Vrijdag' },
  { value: 6, label: 'Zaterdag' },
  { value: 0, label: 'Zondag' },
];

const BLOCK_TYPES = [
  { value: 'lesson', label: 'Les', icon: BookOpen, color: 'bg-amber-100 text-#5C4118' },
  { value: 'break', label: 'Pauze', icon: Coffee, color: 'bg-green-100 text-green-800' },
  { value: 'lunch', label: 'Lunch', icon: Utensils, color: 'bg-orange-100 text-orange-800' },
  { value: 'other', label: 'Overig', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-800' },
];

export function TemplateBuilder({ 
  schoolId, 
  onBack, 
  onTemplateCreated, 
  editingTemplate = null,
  onTemplateUpdated 
}: TemplateBuilderProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DayTemplate | null>(editingTemplate);
  const [templateBlocks, setTemplateBlocks] = useState<TemplateBlock[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(!!editingTemplate);
  const [templateName, setTemplateName] = useState(editingTemplate?.name || '');
  const [templateDescription, setTemplateDescription] = useState(editingTemplate?.description || '');

  // Block form state
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TemplateBlock | null>(null);
  const [blockData, setBlockData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    block_type: 'lesson' as const,
    title: '',
    subject_id: '',
    description: '',
  });

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
    fetchTemplates();
    fetchSchoolSubjects();
    if (editingTemplate) {
      setSelectedTemplate(editingTemplate);
      fetchTemplateBlocks(editingTemplate.id);
    }
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('day_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchSchoolSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('school_subjects')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setSchoolSubjects(data || []);
    } catch (error) {
      console.error('Error fetching school subjects:', error);
    }
  };

  const fetchTemplateBlocks = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('day_template_blocks')
        .select(`
          *,
          school_subjects (
            id,
            title,
            icon,
            color
          )
        `)
        .eq('template_id', templateId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setTemplateBlocks(data || []);
    } catch (error) {
      console.error('Error fetching template blocks:', error);
    }
  };

  const saveTemplate = async () => {
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      let template;

      if (editingTemplate) {
        // Update existing template
        const { data, error } = await supabase
          .from('day_templates')
          .update({
            name: templateName,
            description: templateDescription || null,
          })
          .eq('id', editingTemplate.id)
          .select()
          .single();

        if (error) throw error;
        template = data;
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('day_templates')
          .insert({
            school_id: schoolId,
            name: templateName,
            description: templateDescription || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        template = data;
      }

      setSelectedTemplate(template);
      setShowTemplateForm(false);
      setMessage(editingTemplate ? 'Template succesvol bijgewerkt!' : 'Template succesvol aangemaakt!');
      fetchTemplates();

      if (editingTemplate && onTemplateUpdated) {
        onTemplateUpdated();
      } else if (!editingTemplate) {
        onTemplateCreated();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage('Er is een fout opgetreden bij het opslaan van de template.');
    } finally {
      setLoading(false);
    }
  };

  const saveBlock = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setMessage('');

    try {
      if (editingBlock) {
        // Update existing block
        const { error } = await supabase
          .from('day_template_blocks')
          .update({
            day_of_week: blockData.day_of_week,
            start_time: blockData.start_time,
            end_time: blockData.end_time,
            block_type: blockData.block_type,
            title: blockData.title,
            subject_id: blockData.block_type === 'lesson' ? blockData.subject_id || null : null,
            description: blockData.description || null,
          })
          .eq('id', editingBlock.id);

        if (error) throw error;
      } else {
        // Create new block
        const { error } = await supabase
          .from('day_template_blocks')
          .insert({
            template_id: selectedTemplate.id,
            day_of_week: blockData.day_of_week,
            start_time: blockData.start_time,
            end_time: blockData.end_time,
            block_type: blockData.block_type,
            title: blockData.title,
            subject_id: blockData.block_type === 'lesson' ? blockData.subject_id || null : null,
            description: blockData.description || null,
          });

        if (error) throw error;
      }

      setShowBlockForm(false);
      setEditingBlock(null);
      resetBlockForm();
      setMessage(editingBlock ? 'Blok succesvol bijgewerkt!' : 'Blok succesvol toegevoegd!');
      fetchTemplateBlocks(selectedTemplate.id);
    } catch (error) {
      console.error('Error saving block:', error);
      setMessage('Er is een fout opgetreden bij het opslaan van het blok.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('day_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      setMessage('Template succesvol verwijderd!');
      fetchTemplates();
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setTemplateBlocks([]);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de template.');
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('day_template_blocks')
        .update({ is_active: false })
        .eq('id', blockId);

      if (error) throw error;

      setMessage('Blok succesvol verwijderd!');
      if (selectedTemplate) {
        fetchTemplateBlocks(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error deleting block:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van het blok.');
    }
  };

  const startEditBlock = (block: TemplateBlock) => {
    setEditingBlock(block);
    setBlockData({
      day_of_week: block.day_of_week,
      start_time: block.start_time,
      end_time: block.end_time,
      block_type: block.block_type,
      title: block.title,
      subject_id: block.subject_id || '',
      description: block.description || '',
    });
    setShowBlockForm(true);
  };

  const resetBlockForm = () => {
    setBlockData({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      block_type: 'lesson',
      title: '',
      subject_id: '',
      description: '',
    });
  };

  const getBlockTypeInfo = (type: string) => {
    return BLOCK_TYPES.find(bt => bt.value === type) || BLOCK_TYPES[0];
  };

  const groupBlocksByDay = (blocks: TemplateBlock[]) => {
    const grouped: { [key: number]: TemplateBlock[] } = {};
    blocks.forEach(block => {
      if (!grouped[block.day_of_week]) {
        grouped[block.day_of_week] = [];
      }
      grouped[block.day_of_week].push(block);
    });
    return grouped;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar schooldag
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Template Beheer</h1>
          <p className="text-gray-600">Maak en beheer dagschema templates</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('succesvol')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
            <Button size="sm" onClick={() => setShowTemplateForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nieuw
            </Button>
          </div>

          {showTemplateForm && (
            <Card className="mb-4">
              <h3 className="font-semibold mb-4">
                {editingTemplate ? 'Template bewerken' : 'Nieuwe template'}
              </h3>
              <div className="space-y-4">
                <Input
                  label="Naam"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschrijving
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="secondary" onClick={() => setShowTemplateForm(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={saveTemplate} loading={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Opslaan
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id 
                    ? 'ring-2 ring-amber-500 bg-amber-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => {
                  setSelectedTemplate(template);
                  fetchTemplateBlocks(template.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-600">{template.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template);
                        setTemplateName(template.name);
                        setTemplateDescription(template.description || '');
                        setShowTemplateForm(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          isOpen: true,
                          title: 'Template verwijderen',
                          message: `Weet je zeker dat je "${template.name}" wilt verwijderen?`,
                          onConfirm: () => {
                            deleteTemplate(template.id);
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          },
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Template Blocks */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedTemplate.name} - Tijdblokken
                </h2>
                <Button onClick={() => setShowBlockForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Blok toevoegen
                </Button>
              </div>

              {showBlockForm && (
                <Card className="mb-6">
                  <h3 className="font-semibold mb-4">
                    {editingBlock ? 'Blok bewerken' : 'Nieuw tijdblok'}
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dag van de week
                        </label>
                        <select
                          value={blockData.day_of_week}
                          onChange={(e) => setBlockData({ ...blockData, day_of_week: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type
                        </label>
                        <select
                          value={blockData.block_type}
                          onChange={(e) => setBlockData({ ...blockData, block_type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                          {BLOCK_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Starttijd"
                        type="time"
                        value={blockData.start_time}
                        onChange={(e) => setBlockData({ ...blockData, start_time: e.target.value })}
                        required
                      />
                      <Input
                        label="Eindtijd"
                        type="time"
                        value={blockData.end_time}
                        onChange={(e) => setBlockData({ ...blockData, end_time: e.target.value })}
                        required
                      />
                    </div>
                    <Input
                      label="Titel"
                      value={blockData.title}
                      onChange={(e) => setBlockData({ ...blockData, title: e.target.value })}
                      required
                    />
                    {blockData.block_type === 'lesson' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vak
                        </label>
                        <select
                          value={blockData.subject_id}
                          onChange={(e) => setBlockData({ ...blockData, subject_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="">Selecteer vak</option>
                          {schoolSubjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Beschrijving
                      </label>
                      <textarea
                        value={blockData.description}
                        onChange={(e) => setBlockData({ ...blockData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setShowBlockForm(false);
                          setEditingBlock(null);
                          resetBlockForm();
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuleren
                      </Button>
                      <Button onClick={saveBlock} loading={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        Opslaan
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Blocks by Day */}
              <div className="space-y-6">
                {DAYS_OF_WEEK.map((day) => {
                  const dayBlocks = templateBlocks.filter(block => block.day_of_week === day.value);
                  
                  return (
                    <Card key={day.value}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {day.label} ({dayBlocks.length} blokken)
                      </h3>
                      
                      {dayBlocks.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Geen tijdblokken voor deze dag</p>
                      ) : (
                        <div className="space-y-3">
                          {dayBlocks.map((block) => {
                            const typeInfo = getBlockTypeInfo(block.block_type);
                            const Icon = typeInfo.icon;
                            
                            return (
                              <div key={block.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-lg ${typeInfo.color} flex items-center space-x-1`}>
                                    <Icon className="w-4 h-4" />
                                    {block.school_subjects && (
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: block.school_subjects.color }}
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-gray-900">{block.title}</span>
                                      <span className="text-sm text-gray-500">
                                        {block.start_time} - {block.end_time}
                                      </span>
                                    </div>
                                    {block.school_subjects && (
                                      <p className="text-sm text-gray-600">Vak: {block.school_subjects.title}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => startEditBlock(block)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setConfirmModal({
                                      isOpen: true,
                                      title: 'Blok verwijderen',
                                      message: `Weet je zeker dat je "${block.title}" wilt verwijderen?`,
                                      onConfirm: () => {
                                        deleteBlock(block.id);
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                      },
                                    })}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecteer een template</h3>
              <p className="text-gray-600">
                Kies een template uit de lijst om de tijdblokken te beheren
              </p>
            </Card>
          )}
        </div>
      </div>

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