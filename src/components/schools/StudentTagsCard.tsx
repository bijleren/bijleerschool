import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Tag, Plus, X, Clock, Download, ChevronDown, ChevronUp, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#0EA5E9',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#D97706',
];

function getRandomColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

interface TagDefinition {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface TagAssignment {
  id: string;
  tag_definition_id: string;
  assigned_at: string;
  student_tag_definitions: TagDefinition;
}

interface TagLogEntry {
  id: string;
  tag_name: string;
  tag_color: string;
  action: 'added' | 'removed';
  performed_at: string;
  profiles: { first_name: string; last_name: string } | null;
}

interface StudentTagsCardProps {
  studentId: string;
  schoolId: string;
}

export function StudentTagsCard({ studentId, schoolId }: StudentTagsCardProps) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TagAssignment[]>([]);
  const [allTags, setAllTags] = useState<TagDefinition[]>([]);
  const [tagLog, setTagLog] = useState<TagLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Popover state
  const [showPopover, setShowPopover] = useState(false);
  const [popoverSearch, setPopoverSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');
  const [quickCreateColor, setQuickCreateColor] = useState(getRandomColor());
  const [quickCreateDesc, setQuickCreateDesc] = useState('');
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);
  const [showQuickColorPicker, setShowQuickColorPicker] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAssignments();
    fetchAllTags();
  }, [studentId, schoolId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
        setPopoverSearch('');
        setShowQuickCreate(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowQuickColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_tag_assignments')
        .select('id, tag_definition_id, assigned_at, student_tag_definitions(id, name, color, description)')
        .eq('student_id', studentId)
        .order('assigned_at', { ascending: true });
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching tag assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTags = async () => {
    try {
      const { data, error } = await supabase
        .from('student_tag_definitions')
        .select('id, name, color, description')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      if (error) throw error;
      setAllTags(data || []);
    } catch (err) {
      console.error('Error fetching all tags:', err);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_tag_log')
        .select('id, tag_name, tag_color, action, performed_at, performed_by')
        .eq('student_id', studentId)
        .order('performed_at', { ascending: false });
      if (error) throw error;

      // Enrich with profile names
      const enriched = await Promise.all(
        (data || []).map(async (entry) => {
          if (!entry.performed_by) return { ...entry, profiles: null };
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', entry.performed_by)
            .maybeSingle();
          return { ...entry, profiles: profile };
        })
      );
      setTagLog(enriched);
    } catch (err) {
      console.error('Error fetching tag log:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const assignTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('student_tag_assignments')
        .insert({ student_id: studentId, tag_definition_id: tagId, assigned_by: user?.id });
      if (error) throw error;
      await fetchAssignments();
      if (showHistory) await fetchHistory();
    } catch (err) {
      console.error('Error assigning tag:', err);
    }
  };

  const removeTag = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('student_tag_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
      await fetchAssignments();
      if (showHistory) await fetchHistory();
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  const quickCreateAndAssign = async () => {
    if (!quickCreateName.trim()) return;
    setQuickCreateSaving(true);
    try {
      const { data: newTag, error: createError } = await supabase
        .from('student_tag_definitions')
        .insert({
          school_id: schoolId,
          name: quickCreateName.trim(),
          color: quickCreateColor,
          description: quickCreateDesc.trim() || null,
          created_by: user?.id,
        })
        .select('id, name, color, description')
        .single();
      if (createError) throw createError;

      await supabase
        .from('student_tag_assignments')
        .insert({ student_id: studentId, tag_definition_id: newTag.id, assigned_by: user?.id });

      await fetchAssignments();
      await fetchAllTags();
      if (showHistory) await fetchHistory();

      setQuickCreateName('');
      setQuickCreateColor(getRandomColor());
      setQuickCreateDesc('');
      setShowQuickCreate(false);
      setPopoverSearch('');
    } catch (err) {
      console.error('Error quick creating tag:', err);
    } finally {
      setQuickCreateSaving(false);
    }
  };

  const toggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && tagLog.length === 0) {
      await fetchHistory();
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Tag naam', 'Kleur', 'Actie', 'Datum', 'Uitgevoerd door'],
      ...tagLog.map(e => [
        e.tag_name,
        e.tag_color,
        e.action === 'added' ? 'Toegevoegd' : 'Verwijderd',
        new Date(e.performed_at).toLocaleString('nl-NL'),
        e.profiles ? `${e.profiles.first_name} ${e.profiles.last_name}` : 'Onbekend',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tag-geschiedenis.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const assignedIds = new Set(assignments.map(a => a.tag_definition_id));
  const availableTags = allTags.filter(t => !assignedIds.has(t.id));
  const filteredAvailable = availableTags.filter(t =>
    popoverSearch === '' || t.name.toLowerCase().includes(popoverSearch.toLowerCase())
  );
  const noExactMatch = popoverSearch !== '' && !allTags.some(t =>
    t.name.toLowerCase() === popoverSearch.toLowerCase()
  );

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="w-5 h-5 text-gray-400" />
          Tags
        </h3>
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => {
              setShowPopover(p => !p);
              setPopoverSearch('');
              setShowQuickCreate(false);
            }}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tag toevoegen
          </button>

          {showPopover && (
            <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-64">
              {!showQuickCreate ? (
                <>
                  <div className="p-2 border-b border-gray-100">
                    <Input
                      placeholder="Zoek tag..."
                      value={popoverSearch}
                      onChange={e => setPopoverSearch(e.target.value)}
                      autoFocus
                      className="text-sm"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {filteredAvailable.length === 0 && !noExactMatch && (
                      <p className="text-xs text-gray-400 px-3 py-2">
                        {availableTags.length === 0 ? 'Alle tags al toegewezen' : 'Geen resultaten'}
                      </p>
                    )}
                    {filteredAvailable.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => { assignTag(tag.id); setShowPopover(false); setPopoverSearch(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm text-gray-800 truncate">{tag.name}</span>
                      </button>
                    ))}
                    {noExactMatch && (
                      <button
                        onClick={() => {
                          setQuickCreateName(popoverSearch);
                          setQuickCreateColor(getRandomColor());
                          setQuickCreateDesc('');
                          setShowQuickCreate(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-t border-gray-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-blue-600">
                          Nieuwe tag "<span className="font-medium">{popoverSearch}</span>" aanmaken
                        </span>
                      </button>
                    )}
                    {!noExactMatch && availableTags.length > 0 && (
                      <button
                        onClick={() => {
                          setQuickCreateName('');
                          setQuickCreateColor(getRandomColor());
                          setQuickCreateDesc('');
                          setShowQuickCreate(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-t border-gray-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-blue-600">Nieuwe tag aanmaken</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Nieuwe tag aanmaken & toewijzen</p>
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={colorPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowQuickColorPicker(p => !p)}
                        className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: quickCreateColor }}
                      />
                      {showQuickColorPicker && (
                        <div className="absolute top-10 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-44">
                          <div className="grid grid-cols-5 gap-1.5">
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => { setQuickCreateColor(c); setShowQuickColorPicker(false); }}
                                className={`w-7 h-7 rounded-md hover:scale-110 transition-transform ${quickCreateColor === c ? 'ring-2 ring-offset-1 ring-gray-800' : ''}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1">
                            <input
                              type="color"
                              value={quickCreateColor}
                              onChange={e => setQuickCreateColor(e.target.value)}
                              className="w-7 h-7 rounded cursor-pointer border-0"
                            />
                            <span className="text-xs text-gray-400">Aangepast</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder="Naam *"
                      value={quickCreateName}
                      onChange={e => setQuickCreateName(e.target.value)}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') quickCreateAndAssign(); }}
                      className="text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Omschrijving (optioneel)"
                    value={quickCreateDesc}
                    onChange={e => setQuickCreateDesc(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowQuickCreate(false)}
                      className="flex-1 text-xs text-gray-500 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Terug
                    </button>
                    <button
                      onClick={quickCreateAndAssign}
                      disabled={!quickCreateName.trim() || quickCreateSaving}
                      className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      {quickCreateSaving ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Aanmaken
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assigned tags */}
      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Laden...</span>
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-gray-400 py-1">Nog geen tags toegewezen aan deze leerling.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assignments.map(a => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium group"
              style={{ backgroundColor: a.student_tag_definitions.color }}
            >
              {a.student_tag_definitions.name}
              <button
                onClick={() => removeTag(a.id)}
                className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                title="Tag verwijderen"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* History toggle */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleHistory}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Tag geschiedenis
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showHistory && tagLog.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
            >
              <Download className="w-3.5 h-3.5" />
              Exporteer CSV
            </button>
          )}
        </div>

        {showHistory && (
          <div className="mt-3">
            {historyLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Laden...</span>
              </div>
            ) : tagLog.length === 0 ? (
              <p className="text-sm text-gray-400">Geen geschiedenis beschikbaar.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tagLog.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={`flex-shrink-0 w-2 h-2 rounded-full ${
                          entry.action === 'added' ? 'bg-green-500' : 'bg-red-400'
                        }`}
                      />
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-white text-xs font-medium flex-shrink-0"
                        style={{ backgroundColor: entry.tag_color }}
                      >
                        {entry.tag_name}
                      </span>
                      <span className={`text-xs flex-shrink-0 ${
                        entry.action === 'added' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {entry.action === 'added' ? 'Toegevoegd' : 'Verwijderd'}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {new Date(entry.performed_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {entry.profiles && (
                        <p className="text-xs text-gray-400">
                          {entry.profiles.first_name} {entry.profiles.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
