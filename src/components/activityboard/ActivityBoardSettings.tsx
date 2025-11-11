import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ColorPicker } from '../ui/ColorPicker';
import { Toast } from '../ui/Toast';
import { ArrowLeft, Plus, Trash2, Save, GripVertical, Grid, Book, Palette, Music, Pencil, Calculator, Gamepad2, Puzzle, Building, Trees, Scissors, Play, Shapes, Users, Globe, Beaker, Microscope, FlaskConical, Atom, TestTube, Dna, Brain, Lightbulb, Sparkles, Star, Heart, Smile, Trophy, Award, Target, Flag, MapPin, Compass, Mountain, Flower2, Leaf, Bug, Bird, Fish, Brush, PaintBucket, Printer, Laptop, Tablet, Smartphone, Headphones, Camera, Film, Clapperboard, Theater, Drama, Mic, Radio, Tv, Video } from 'lucide-react';

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
  description: string | null;
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
  // Basic & General
  { name: 'Grid', component: Grid },
  { name: 'Book', component: Book },
  { name: 'Pencil', component: Pencil },
  { name: 'Users', component: Users },
  { name: 'Star', component: Star },
  { name: 'Heart', component: Heart },
  { name: 'Smile', component: Smile },
  { name: 'Sparkles', component: Sparkles },

  // Math & Numbers
  { name: 'Calculator', component: Calculator },
  { name: 'Shapes', component: Shapes },

  // Science & Nature
  { name: 'Beaker', component: Beaker },
  { name: 'Microscope', component: Microscope },
  { name: 'FlaskConical', component: FlaskConical },
  { name: 'Atom', component: Atom },
  { name: 'TestTube', component: TestTube },
  { name: 'Dna', component: Dna },
  { name: 'Brain', component: Brain },
  { name: 'Lightbulb', component: Lightbulb },
  { name: 'Globe', component: Globe },
  { name: 'Trees', component: Trees },
  { name: 'Flower2', component: Flower2 },
  { name: 'Leaf', component: Leaf },
  { name: 'Bug', component: Bug },
  { name: 'Bird', component: Bird },
  { name: 'Fish', component: Fish },
  { name: 'Mountain', component: Mountain },

  // Geography & Exploration
  { name: 'MapPin', component: MapPin },
  { name: 'Compass', component: Compass },
  { name: 'Flag', component: Flag },

  // Arts & Creativity
  { name: 'Palette', component: Palette },
  { name: 'Brush', component: Brush },
  { name: 'PaintBucket', component: PaintBucket },
  { name: 'Scissors', component: Scissors },

  // Music & Performance
  { name: 'Music', component: Music },
  { name: 'Mic', component: Mic },
  { name: 'Headphones', component: Headphones },
  { name: 'Radio', component: Radio },
  { name: 'Theater', component: Theater },
  { name: 'Drama', component: Drama },

  // Technology
  { name: 'Laptop', component: Laptop },
  { name: 'Tablet', component: Tablet },
  { name: 'Smartphone', component: Smartphone },
  { name: 'Printer', component: Printer },
  { name: 'Camera', component: Camera },

  // Media & Video
  { name: 'Film', component: Film },
  { name: 'Video', component: Video },
  { name: 'Clapperboard', component: Clapperboard },
  { name: 'Tv', component: Tv },

  // Games & Play
  { name: 'Gamepad2', component: Gamepad2 },
  { name: 'Puzzle', component: Puzzle },
  { name: 'Play', component: Play },

  // Building & Construction
  { name: 'Building', component: Building },

  // Achievement & Goals
  { name: 'Trophy', component: Trophy },
  { name: 'Award', component: Award },
  { name: 'Target', component: Target }
];

interface ActivityPreset {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  max_students: number | null;
  is_default: boolean;
}

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
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [colleagues, setColleagues] = useState<Array<{ id: string; email: string; full_name: string | null }>>([]);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!board);
  const [showPresets, setShowPresets] = useState(false);
  const [showNewPreset, setShowNewPreset] = useState(false);
  const [presets, setPresets] = useState<ActivityPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('Grid');
  const [newPresetColor, setNewPresetColor] = useState('#3B82F6');
  const [newPresetMaxStudents, setNewPresetMaxStudents] = useState<number | ''>('');
  const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchGroupsAndStudents();
    fetchColleagues();
    fetchPresets();
    if (board) {
      fetchOptions();
      fetchBoardSettings();
    }
  }, [board]);

  const fetchGroupsAndStudents = async () => {
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
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
        .select(`
          id,
          title,
          start_time,
          end_time,
          day_of_week,
          day_templates!inner(school_id)
        `)
        .eq('is_active', true)
        .eq('day_templates.school_id', schoolId)
        .order('day_of_week, start_time');

      if (timeBlocksError) throw timeBlocksError;
      setTimeBlocks(timeBlocksData || []);
    } catch (error) {
      console.error('Error fetching groups and students:', error);
    }
  };

  const fetchColleagues = async () => {
    try {
      // Get all users from the same school (excluding current user)
      const { data: colleaguesData, error: colleaguesError } = await supabase
        .from('user_schools')
        .select(`
          user_id,
          profiles!inner(
            id,
            email,
            full_name
          )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'approved')
        .eq('is_active', true)
        .neq('user_id', user?.id);

      if (colleaguesError) throw colleaguesError;

      const formattedColleagues = colleaguesData?.map((item: any) => ({
        id: item.profiles.id,
        email: item.profiles.email,
        full_name: item.profiles.full_name
      })) || [];

      setColleagues(formattedColleagues);
    } catch (error) {
      console.error('Error fetching colleagues:', error);
    }
  };

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_presets')
        .select('*')
        .or(`is_default.eq.true,school_id.eq.${schoolId}`)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error fetching presets:', error);
    }
  };

  const createPreset = async () => {
    if (!user || !newPresetName.trim()) {
      setToast({ message: 'Voer een naam in voor de voorinstelling', type: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('activity_presets')
        .insert({
          school_id: schoolId,
          name: newPresetName.trim(),
          icon: newPresetIcon,
          color: newPresetColor,
          max_students: newPresetMaxStudents || null,
          created_by: user.id
        });

      if (error) throw error;

      setToast({ message: 'Voorinstelling succesvol aangemaakt', type: 'success' });
      setShowNewPreset(false);
      setNewPresetName('');
      setNewPresetIcon('Grid');
      setNewPresetColor('#3B82F6');
      setNewPresetMaxStudents('');
      fetchPresets();
    } catch (error) {
      console.error('Error creating preset:', error);
      setToast({ message: 'Fout bij aanmaken voorinstelling', type: 'error' });
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

      // Fetch shared colleagues
      const { data: accessData, error: accessError } = await supabase
        .from('activity_board_access')
        .select('user_id')
        .eq('board_id', board.id)
        .eq('access_type', 'teacher');

      if (accessError) throw accessError;
      if (accessData) {
        setSelectedColleagues(accessData.map(a => a.user_id).filter(Boolean) as string[]);
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

  const addPresetActivity = (preset: ActivityPreset) => {
    const newOption: ActivityOption = {
      name: preset.name,
      description: preset.description || '',
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
      setToast({ message: 'Voer een bordnaam in', type: 'error' });
      return;
    }

    if (options.length === 0) {
      setToast({ message: 'Voeg minimaal één activiteit toe', type: 'error' });
      return;
    }

    if (options.some(o => !o.name.trim())) {
      setToast({ message: 'Alle activiteiten moeten een naam hebben', type: 'error' });
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
            description: option.description?.trim() || null,
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

        // Update shared colleagues
        const { error: deleteAccessError } = await supabase
          .from('activity_board_access')
          .delete()
          .eq('board_id', board.id)
          .eq('access_type', 'teacher');

        if (deleteAccessError) throw deleteAccessError;

        if (selectedColleagues.length > 0) {
          const accessToInsert = selectedColleagues.map(userId => ({
            board_id: board.id,
            user_id: userId,
            access_type: 'teacher'
          }));

          const { error: accessError } = await supabase
            .from('activity_board_access')
            .insert(accessToInsert);

          if (accessError) throw accessError;
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
              description: option.description?.trim() || null,
              max_students: option.max_students,
              color: option.color,
              icon: option.icon,
              sort_order: i,
              is_active: option.is_active
            });

          if (optionError) throw optionError;
        }

        // Add shared colleagues
        if (selectedColleagues.length > 0) {
          const accessToInsert = selectedColleagues.map(userId => ({
            board_id: boardData.id,
            user_id: userId,
            access_type: 'teacher'
          }));

          const { error: accessError } = await supabase
            .from('activity_board_access')
            .insert(accessToInsert);

          if (accessError) throw accessError;
        }

        onBoardCreated();
      }
    } catch (error) {
      console.error('Error saving board:', error);
      setToast({ message: 'Fout bij opslaan. Probeer het opnieuw.', type: 'error' });
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
                Delen met collega's (optioneel)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {colleagues.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen collega's beschikbaar</p>
                ) : (
                  colleagues.map((colleague) => (
                    <label key={colleague.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedColleagues.includes(colleague.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColleagues([...selectedColleagues, colleague.id]);
                          } else {
                            setSelectedColleagues(selectedColleagues.filter(id => id !== colleague.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {colleague.full_name || colleague.email}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Geselecteerde collega's kunnen dit bord bekijken en gebruiken</p>
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">Klik op een activiteit om toe te voegen:</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowNewPreset(!showNewPreset)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nieuwe Voorinstelling
                  </Button>
                </div>

                {showNewPreset && (
                  <div className="mb-4 p-3 bg-white border border-gray-300 rounded-lg space-y-3">
                    <Input
                      label="Naam"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Bijv. Computerhoek"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Icoon</label>
                        <select
                          value={newPresetIcon}
                          onChange={(e) => setNewPresetIcon(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {ICON_OPTIONS.map((icon) => (
                            <option key={icon.name} value={icon.name}>{icon.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max. Leerlingen</label>
                        <input
                          type="number"
                          value={newPresetMaxStudents}
                          onChange={(e) => setNewPresetMaxStudents(e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="Optioneel"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <ColorPicker
                      color={newPresetColor}
                      onChange={setNewPresetColor}
                      label="Kleur"
                    />

                    <div className="flex gap-2">
                      <Button onClick={createPreset} className="flex-1">
                        Voorinstelling Aanmaken
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowNewPreset(false);
                          setNewPresetName('');
                          setNewPresetIcon('Grid');
                          setNewPresetColor('#3B82F6');
                          setNewPresetMaxStudents('');
                        }}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {presets.map((preset) => {
                    const IconComponent = ICON_OPTIONS.find(i => i.name === preset.icon)?.component || Grid;
                    return (
                      <button
                        key={preset.id}
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
                              value={option.color}
                              onChange={(color) => updateOption(index, 'color', color)}
                            />
                          </div>

                          <div className="relative" style={{ width: '80px' }}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Icoon
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowIconPicker(showIconPicker === index ? null : index)}
                              className="w-full h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                            >
                              {(() => {
                                const SelectedIcon = ICON_OPTIONS.find(io => io.name === option.icon)?.component || Grid;
                                return <SelectedIcon className="w-5 h-5 text-gray-700" />;
                              })()}
                            </button>

                            {showIconPicker === index && (
                              <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50" style={{ width: '220px' }}>
                                <div className="grid grid-cols-4 gap-1">
                                  {ICON_OPTIONS.map((iconOption) => {
                                    const IconComponent = iconOption.component;
                                    return (
                                      <button
                                        key={iconOption.name}
                                        type="button"
                                        onClick={() => {
                                          updateOption(index, 'icon', iconOption.name);
                                          setShowIconPicker(null);
                                        }}
                                        className={`p-2 rounded hover:bg-gray-100 transition-colors flex items-center justify-center ${
                                          option.icon === iconOption.name ? 'bg-blue-100' : ''
                                        }`}
                                      >
                                        <IconComponent className="w-5 h-5 text-gray-700" />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Beschrijving
                          </label>
                          <Input
                            value={option.description || ''}
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
