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
  const [selectedTimeBlocks, setSelectedTimeBlocks] = useState<string[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<Array<{ id: string; title: string; start_time: string; end_time: string; day_of_week: number }>>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!board);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    fetchGroupsAndStudents();
    if (board) {
      fetchOptions();
      fetchBoardSettings();
    }
  }, [board]);

  const fetchGroupsAndStudents = async () => {
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('student_groups')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('school_id', schoolId)
        .order('first_name, last_name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      const { data: timeBlocksData, error: timeBlocksError } = await supabase
        .from('day_template_blocks')
        .select('id, title, start_time, end_time, day_of_week, template_id')
        .eq('is_active', true)
        .order('day_of_week, start_time');

      if (timeBlocksError) throw timeBlocksError;
      setTimeBlocks(timeBlocksData || []);
    } catch (error) {
      console.error('Error fetching groups and students:', error);
    }
  };

  const fetchBoardSettings = async () => {
    if (!board) return;

    try {
      const { data, error } = await supabase
        .from('activity_boards')
        .select('student_group_ids, student_ids')
        .eq('id', board.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSelectedGroups(data.student_group_ids || []);
        setSelectedStudents(data.student_ids || []);
      }

      const { data: timeBlocksData, error: timeBlocksError } = await supabase
        .from('activity_board_timeblocks')
        .select('template_block_id')
        .eq('board_id', board.id);

      if (timeBlocksError) throw timeBlocksError;
      if (timeBlocksData) {
        setSelectedTimeBlocks(timeBlocksData.map(tb => tb.template_block_id));
      }
    } catch (error) {
      console.error('Error fetching board settings:', error);
    }
  };

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
            student_group_ids: selectedGroups,
            student_ids: selectedStudents,
            updated_at: new Date().toISOString()
          })
          .eq('id', board.id);

        if (boardError) throw boardError;

        const { error: deleteTimeblocksError } = await supabase
          .from('activity_board_timeblocks')
          .delete()
          .eq('board_id', board.id);

        if (deleteTimeblocksError) throw deleteTimeblocksError;

        if (selectedTimeBlocks.length > 0) {
          const timeblocksToInsert = selectedTimeBlocks.map(blockId => ({
            board_id: board.id,
            template_block_id: blockId
          }));

          const { error: timeblocksError } = await supabase
            .from('activity_board_timeblocks')
            .insert(timeblocksToInsert);

          if (timeblocksError) throw timeblocksError;
        }

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
            student_group_ids: selectedGroups,
            student_ids: selectedStudents,
            created_by: user.id
          })
          .select()
          .single();

        if (boardError) throw boardError;

        if (selectedTimeBlocks.length > 0) {
          const timeblocksToInsert = selectedTimeBlocks.map(blockId => ({
            board_id: boardData.id,
            template_block_id: blockId
          }));

          const { error: timeblocksError } = await supabase
            .from('activity_board_timeblocks')
            .insert(timeblocksToInsert);

          if (timeblocksError) throw timeblocksError;
        }

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tijdblokken (optioneel)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                {timeBlocks.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen tijdblokken beschikbaar. Maak eerst een lesrooster aan.</p>
                ) : (
                  timeBlocks.map((block) => {
                    const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
                    return (
                      <label key={block.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedTimeBlocks.includes(block.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTimeBlocks([...selectedTimeBlocks, block.id]);
                            } else {
                              setSelectedTimeBlocks(selectedTimeBlocks.filter(id => id !== block.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {dayNames[block.day_of_week]} - {block.title} ({block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Selecteer tijdblokken waarin dit bord actief is</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Groepen (optioneel)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {groups.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen groepen beschikbaar</p>
                ) : (
                  groups.map((group) => (
                    <label key={group.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group.id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-gray-700">{group.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Selecteer groepen om het bord te beperken tot specifieke groepen</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leerlingen (optioneel)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {students.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen leerlingen beschikbaar</p>
                ) : (
                  students.map((student) => (
                    <label key={student.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-gray-700">{student.first_name} {student.last_name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Selecteer specifieke leerlingen om het bord te beperken</p>
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
                        <div className="flex gap-3 items-start">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Naam *
                            </label>
                            <Input
                              value={option.name}
                              onChange={(e) => updateOption(index, 'name', e.target.value)}
                              placeholder="Activiteitnaam"
                            />
                          </div>

                          <div style={{ width: '120px' }}>
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

                          <div style={{ width: '70px' }}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Kleur
                            </label>
                            <ColorPicker
                              color={option.color}
                              onChange={(color) => updateOption(index, 'color', color)}
                            />
                          </div>

                          <div style={{ width: '220px' }}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Icoon
                            </label>
                            <div className="grid grid-cols-4 gap-1 border border-gray-300 rounded-lg p-1 h-[120px]">
                              {ICON_OPTIONS.map((iconOption) => {
                                const IconComponent = iconOption.component;
                                return (
                                  <button
                                    key={iconOption.name}
                                    type="button"
                                    onClick={() => updateOption(index, 'icon', iconOption.name)}
                                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors flex items-center justify-center ${
                                      option.icon === iconOption.name ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    <IconComponent className="w-4 h-4 text-gray-700" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div>
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
