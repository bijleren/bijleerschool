import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ColorPicker } from '../ui/ColorPicker';
import { ArrowLeft, Plus, Trash2, Save, GripVertical, Grid, Book, Palette, Music, Pencil, Calculator, Gamepad2, Puzzle, Building, Trees, Scissors, Play } from 'lucide-react';

interface ActivityBoard {
  id: string;
  name: string;
  description: string | null;
  school_id: string;
  is_active: boolean;
}

interface ActivityOption {
  id?: string;
  board_id?: string;
  name: string;
  description: string;
  max_students: number | null;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface ActivityBoardSettingsProps {
  schoolId: string;
  board: ActivityBoard | null;
  onBack: () => void;
  onBoardCreated: () => void;
  onBoardUpdated: () => void;
}

const ICON_OPTIONS = [
  { name: 'Grid', component: Grid },
  { name: 'Book', component: Book },
  { name: 'Palette', component: Palette },
  { name: 'Music', component: Music },
  { name: 'Pencil', component: Pencil },
  { name: 'Calculator', component: Calculator },
  { name: 'Gamepad2', component: Gamepad2 },
  { name: 'Puzzle', component: Puzzle },
  { name: 'Building', component: Building },
  { name: 'Trees', component: Trees },
  { name: 'Scissors', component: Scissors },
  { name: 'Play', component: Play }
];

const PRESET_ACTIVITIES = [
  { name: 'Zelfstandig Werken', icon: 'Pencil', color: '#3B82F6', max_students: null },
  { name: 'Lezen', icon: 'Book', color: '#10B981', max_students: null },
  { name: 'Rekenhoek', icon: 'Calculator', color: '#F59E0B', max_students: 4 },
  { name: 'Bouwen', icon: 'Building', color: '#8B5CF6', max_students: 6 },
  { name: 'Knutselen', icon: 'Scissors', color: '#EC4899', max_students: 4 },
  { name: 'Tekenen', icon: 'Palette', color: '#EF4444', max_students: null },
  { name: 'Puzzelen', icon: 'Puzzle', color: '#06B6D4', max_students: 2 },
  { name: 'Muziekhoek', icon: 'Music', color: '#F97316', max_students: 4 },
  { name: 'Spelen', icon: 'Gamepad2', color: '#84CC16', max_students: null }
];

export function ActivityBoardSettings({
  schoolId,
  board,
  onBack,
  onBoardCreated,
  onBoardUpdated
}: ActivityBoardSettingsProps) {
  const { user } = useAuth();
  const [name, setName] = useState(board?.name || '');
  const [description, setDescription] = useState(board?.description || '');
  const [isActive, setIsActive] = useState(board?.is_active ?? true);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!board);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (board) {
      fetchOptions();
    }
  }, [board]);

  const fetchOptions = async () => {
    if (!board) return;

    try {
      const { data, error } = await supabase
        .from('activity_options')
        .select('*')
        .eq('board_id', board.id)
        .order('sort_order');

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    const newOption: ActivityOption = {
      name: '',
      description: '',
      max_students: null,
      color: '#3B82F6',
      icon: 'Grid',
      sort_order: options.length,
      is_active: true
    };
    setOptions([...options, newOption]);
  };

  const addPresetActivity = (preset: typeof PRESET_ACTIVITIES[0]) => {
    const newOption: ActivityOption = {
      name: preset.name,
      description: '',
      max_students: preset.max_students,
      color: preset.color,
      icon: preset.icon,
      sort_order: options.length,
      is_active: true
    };
    setOptions([...options, newOption]);
    setShowPresets(false);
  };

  const updateOption = (index: number, field: keyof ActivityOption, value: any) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      alert('Voer een bordnaam in');
      return;
    }

    if (options.length === 0) {
      alert('Voeg minimaal één activiteit toe');
      return;
    }

    if (options.some(o => !o.name.trim())) {
      alert('Alle activiteiten moeten een naam hebben');
      return;
    }

    setSaving(true);
    try {
      if (board) {
        const { error: boardError } = await supabase
          .from('activity_boards')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', board.id);

        if (boardError) throw boardError;

        const existingOptionIds = options.filter(o => o.id).map(o => o.id);

        const { data: allOptions, error: fetchError } = await supabase
          .from('activity_options')
          .select('id')
          .eq('board_id', board.id);

        if (fetchError) throw fetchError;

        const optionsToDelete = allOptions?.filter(opt => !existingOptionIds.includes(opt.id)) || [];

        for (const opt of optionsToDelete) {
          const { error: deleteError } = await supabase
            .from('activity_options')
            .delete()
            .eq('id', opt.id);

          if (deleteError) throw deleteError;
        }

        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          const optionData = {
            board_id: board.id,
            name: option.name.trim(),
            description: option.description.trim() || null,
            max_students: option.max_students,
            color: option.color,
            icon: option.icon,
            sort_order: i,
            is_active: option.is_active
          };

          if (option.id) {
            const { error } = await supabase
              .from('activity_options')
              .update(optionData)
              .eq('id', option.id);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('activity_options')
              .insert(optionData);

            if (error) throw error;
          }
        }

        onBoardUpdated();
      } else {
        const { data: boardData, error: boardError } = await supabase
          .from('activity_boards')
          .insert({
            school_id: schoolId,
            name: name.trim(),
            description: description.trim() || null,
            is_active: isActive,
            created_by: user.id
          })
          .select()
          .single();

        if (boardError) throw boardError;

        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          const { error: optionError } = await supabase
            .from('activity_options')
            .insert({
              board_id: boardData.id,
              name: option.name.trim(),
              description: option.description.trim() || null,
              max_students: option.max_students,
              color: option.color,
              icon: option.icon,
              sort_order: i,
              is_active: option.is_active
            });

          if (optionError) throw optionError;
        }

        onBoardCreated();
      }
    } catch (error) {
      console.error('Error saving board:', error);
      alert('Fout bij opslaan. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {board ? 'Bord bewerken' : 'Nieuw bord'}
        </h1>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Bordinstellingen</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bordnaam *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Groep 5 Activiteiten"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionele beschrijving van het bord"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Bord is actief
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Activiteiten</h2>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowPresets(!showPresets)}>
                  <Grid className="w-4 h-4 mr-2" />
                  Voorinstellingen
                </Button>
                <Button variant="secondary" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe activiteit
                </Button>
              </div>
            </div>

            {showPresets && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">Klik op een activiteit om toe te voegen:</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_ACTIVITIES.map((preset, idx) => {
                    const IconComponent = ICON_OPTIONS.find(i => i.name === preset.icon)?.component || Grid;
                    return (
                      <button
                        key={idx}
                        onClick={() => addPresetActivity(preset)}
                        className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: preset.color }}
                        >
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {options.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nog geen activiteiten toegevoegd
              </div>
            ) : (
              <div className="space-y-4">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-2">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-6 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Naam *
                            </label>
                            <Input
                              value={option.name}
                              onChange={(e) => updateOption(index, 'name', e.target.value)}
                              placeholder="Activiteitnaam"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Max. leerlingen
                            </label>
                            <Input
                              type="number"
                              value={option.max_students?.toString() || ''}
                              onChange={(e) =>
                                updateOption(
                                  index,
                                  'max_students',
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                              placeholder="∞"
                              min="1"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Kleur
                            </label>
                            <ColorPicker
                              color={option.color}
                              onChange={(color) => updateOption(index, 'color', color)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Icoon
                            </label>
                            <div className="grid grid-cols-4 gap-1 border border-gray-300 rounded-lg p-1">
                              {ICON_OPTIONS.map((iconOption) => {
                                const IconComponent = iconOption.component;
                                return (
                                  <button
                                    key={iconOption.name}
                                    type="button"
                                    onClick={() => updateOption(index, 'icon', iconOption.name)}
                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                                      option.icon === iconOption.name ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    <IconComponent className="w-4 h-4 text-gray-700" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Beschrijving
                            </label>
                            <Input
                              value={option.description}
                              onChange={(e) => updateOption(index, 'description', e.target.value)}
                              placeholder="Optioneel"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => removeOption(index)}
                        className="mt-2 p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onBack}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
