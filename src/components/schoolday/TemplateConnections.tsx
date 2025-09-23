import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { 
  ArrowLeft, 
  Plus, 
  Trash2,
  School,
  Users,
  Calendar,
  CheckCircle
} from 'lucide-react';

interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
}

interface SchoolTemplateConnection {
  id: string;
  school_id: string;
  template_id: string;
  is_default: boolean;
  effective_from: string;
  effective_until: string | null;
  day_templates: DayTemplate;
}

interface GroupTemplateConnection {
  id: string;
  group_id: string;
  template_id: string;
  is_default: boolean;
  effective_from: string;
  effective_until: string | null;
  groups: Group;
  day_templates: DayTemplate;
}

interface TemplateConnectionsProps {
  schoolId: string;
  onBack: () => void;
  templates: DayTemplate[];
}

export function TemplateConnections({ schoolId, onBack, templates }: TemplateConnectionsProps) {
  const [schoolConnections, setSchoolConnections] = useState<SchoolTemplateConnection[]>([]);
  const [groupConnections, setGroupConnections] = useState<GroupTemplateConnection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [isDefault, setIsDefault] = useState(false);

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
    fetchConnections();
    fetchGroups();
  }, []);

  const fetchConnections = async () => {
    try {
      // Fetch school template connections
      const { data: schoolData, error: schoolError } = await supabase
        .from('school_day_templates')
        .select(`
          *,
          day_templates (*)
        `)
        .eq('school_id', schoolId);

      if (schoolError) throw schoolError;
      setSchoolConnections(schoolData || []);

      // Fetch group template connections
      const { data: groupData, error: groupError } = await supabase
        .from('group_day_templates')
        .select(`
          *,
          groups (*),
          day_templates (*)
        `)
        .in('group_id', await getSchoolGroupIds());

      if (groupError) throw groupError;
      setGroupConnections(groupData || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const getSchoolGroupIds = async (): Promise<string[]> => {
    const { data } = await supabase
      .from('groups')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_active', true);
    
    return data?.map(g => g.id) || [];
  };

  const connectSchoolTemplate = async () => {
    if (!selectedTemplateId) return;

    setLoading(true);
    setMessage('');

    try {
      // If setting as default, remove default from other connections
      if (isDefault) {
        await supabase
          .from('school_day_templates')
          .update({ is_default: false })
          .eq('school_id', schoolId);
      }

      const { error } = await supabase
        .from('school_day_templates')
        .insert({
          school_id: schoolId,
          template_id: selectedTemplateId,
          is_default: isDefault,
          effective_from: effectiveFrom,
          effective_until: effectiveUntil || null,
        });

      if (error) throw error;

      setMessage('Template succesvol verbonden met school!');
      setShowSchoolForm(false);
      resetForm();
      fetchConnections();
    } catch (error) {
      console.error('Error connecting school template:', error);
      setMessage('Er is een fout opgetreden bij het verbinden van de template.');
    } finally {
      setLoading(false);
    }
  };

  const connectGroupTemplate = async () => {
    if (!selectedTemplateId || !selectedGroupId) return;

    setLoading(true);
    setMessage('');

    try {
      // If setting as default, remove default from other connections for this group
      if (isDefault) {
        await supabase
          .from('group_day_templates')
          .update({ is_default: false })
          .eq('group_id', selectedGroupId);
      }

      const { error } = await supabase
        .from('group_day_templates')
        .insert({
          group_id: selectedGroupId,
          template_id: selectedTemplateId,
          is_default: isDefault,
          effective_from: effectiveFrom,
          effective_until: effectiveUntil || null,
        });

      if (error) throw error;

      setMessage('Template succesvol verbonden met groep!');
      setShowGroupForm(false);
      resetForm();
      fetchConnections();
    } catch (error) {
      console.error('Error connecting group template:', error);
      setMessage('Er is een fout opgetreden bij het verbinden van de template.');
    } finally {
      setLoading(false);
    }
  };

  const disconnectSchoolTemplate = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('school_day_templates')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setMessage('Template verbinding verwijderd!');
      fetchConnections();
    } catch (error) {
      console.error('Error disconnecting school template:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de verbinding.');
    }
  };

  const disconnectGroupTemplate = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('group_day_templates')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setMessage('Template verbinding verwijderd!');
      fetchConnections();
    } catch (error) {
      console.error('Error disconnecting group template:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van de verbinding.');
    }
  };

  const resetForm = () => {
    setSelectedTemplateId('');
    setSelectedGroupId('');
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setEffectiveUntil('');
    setIsDefault(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar schooldag
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Template Verbindingen</h1>
          <p className="text-gray-600">Verbind templates met scholen en groepen</p>
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

      <div className="space-y-8">
        {/* School Template Connections */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <School className="w-5 h-5 mr-2" />
              School Templates
            </h2>
            <Button onClick={() => setShowSchoolForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Template verbinden
            </Button>
          </div>

          {showSchoolForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4">Template verbinden met school</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Selecteer template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Geldig vanaf
                    </label>
                    <input
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Geldig tot (optioneel)
                    </label>
                    <input
                      type="date"
                      value={effectiveUntil}
                      onChange={(e) => setEffectiveUntil(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="schoolDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="schoolDefault" className="ml-2 block text-sm text-gray-900">
                    Standaard template voor school
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="secondary" onClick={() => setShowSchoolForm(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={connectSchoolTemplate} loading={loading}>
                    Verbinden
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {schoolConnections.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Geen templates verbonden met school</p>
            ) : (
              schoolConnections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {connection.is_default && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {connection.day_templates.name}
                        {connection.is_default && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Standaard
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Geldig vanaf: {formatDate(connection.effective_from)}
                        {connection.effective_until && ` tot ${formatDate(connection.effective_until)}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Verbinding verwijderen',
                      message: `Weet je zeker dat je de verbinding met "${connection.day_templates.name}" wilt verwijderen?`,
                      onConfirm: () => {
                        disconnectSchoolTemplate(connection.id);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      },
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Group Template Connections */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Groep Templates
            </h2>
            <Button onClick={() => setShowGroupForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Template verbinden
            </Button>
          </div>

          {showGroupForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4">Template verbinden met groep</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Groep
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Selecteer groep</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Selecteer template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Geldig vanaf
                    </label>
                    <input
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Geldig tot (optioneel)
                    </label>
                    <input
                      type="date"
                      value={effectiveUntil}
                      onChange={(e) => setEffectiveUntil(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="groupDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="groupDefault" className="ml-2 block text-sm text-gray-900">
                    Standaard template voor groep
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="secondary" onClick={() => setShowGroupForm(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={connectGroupTemplate} loading={loading}>
                    Verbinden
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {groupConnections.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Geen templates verbonden met groepen</p>
            ) : (
              groupConnections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {connection.is_default && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {connection.groups.name} → {connection.day_templates.name}
                        {connection.is_default && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Standaard
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {connection.groups.grade_level && `${connection.groups.grade_level} • `}
                        Geldig vanaf: {formatDate(connection.effective_from)}
                        {connection.effective_until && ` tot ${formatDate(connection.effective_until)}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Verbinding verwijderen',
                      message: `Weet je zeker dat je de verbinding tussen "${connection.groups.name}" en "${connection.day_templates.name}" wilt verwijderen?`,
                      onConfirm: () => {
                        disconnectGroupTemplate(connection.id);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      },
                    })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
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