import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { GedragskaartCard } from './GedragskaartCard';
import { GedragskaartFocusMode } from './GedragskaartFocusMode';
import { GedragskaartPresetModal } from './GedragskaartPresetModal';
import { GedragskaartCardEditor } from './GedragskaartCardEditor';
import { Users, ChevronDown, Plus, Settings, Target, Minus, LayoutGrid, List, X } from 'lucide-react';

interface BehaviorCard {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
}

interface Preset {
  id: string;
  name: string;
  card_ids: string[];
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  color: string | null;
}

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
}

interface FloatingLabel {
  id: number;
  x: number;
  y: number;
  text: string;
}

const CATEGORIES = ['Alle', 'Werkgeheugen', 'Inhibitie', 'Flexibiliteit', 'Planning', 'Taakinitiatie', 'Emotieregulatie', 'Zelfmonitoring', 'Timemanagement'];

const CATEGORY_COLORS: Record<string, string> = {
  Werkgeheugen: 'bg-amber-100 text-#74531F',
  Inhibitie: 'bg-red-100 text-red-700',
  Flexibiliteit: 'bg-green-100 text-green-700',
  Planning: 'bg-amber-100 text-amber-700',
  Taakinitiatie: 'bg-orange-100 text-orange-700',
  Emotieregulatie: 'bg-teal-100 text-teal-700',
  Zelfmonitoring: 'bg-cyan-100 text-cyan-700',
  Timemanagement: 'bg-rose-100 text-rose-700',
};

export function GedragskaartTab({ focusSchool }: { focusSchool: { id: string; name: string } | null }) {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(focusSchool?.id || null);

  // Groups + students
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const studentPickerRef = useRef<HTMLDivElement>(null);

  // Cards & progress
  const [cards, setCards] = useState<BehaviorCard[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [activeCardIds, setActiveCardIds] = useState<Set<string>>(new Set());
  const [presets, setPresets] = useState<Preset[]>([]);

  // UI state
  const [filterCategory, setFilterCategory] = useState('Alle');
  const [viewMode, setViewMode] = useState<'grid' | 'category'>('grid');
  const [hideInactive, setHideInactive] = useState(false);
  const [isDeductMode, setIsDeductMode] = useState(false);
  const [bouncingCardId, setBouncingCardId] = useState<string | null>(null);
  const [floatingLabels, setFloatingLabels] = useState<FloatingLabel[]>([]);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [loading, setLoading] = useState(true);

  // Resolve schoolId from focusSchool or user_schools
  useEffect(() => {
    if (focusSchool) {
      setSchoolId(focusSchool.id);
    } else {
      resolveSchoolId();
    }
  }, [focusSchool, user]);

  const resolveSchoolId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_schools')
      .select('school_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('status', 'approved')
      .limit(1);
    if (data?.[0]) setSchoolId(data[0].school_id);
  };

  useEffect(() => {
    if (schoolId) loadInitialData();
  }, [schoolId]);

  useEffect(() => {
    if (selectedGroupId) loadStudentsForGroup(selectedGroupId);
    else setStudents([]);
    setSelectedStudentId('');
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedStudentId) loadProgress(selectedStudentId);
    else setProgressMap({});
  }, [selectedStudentId]);

  // Close student picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentPickerRef.current && !studentPickerRef.current.contains(e.target as Node)) {
        setShowStudentPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [cardsRes, groupsRes, presetsRes] = await Promise.all([
        supabase.from('behavior_cards').select('id, title, description, category, icon').eq('is_active', true).order('category').order('title'),
        supabase.from('groups').select('id, name, grade_level').eq('school_id', schoolId!).eq('is_active', true).order('name'),
        user ? supabase.from('behavior_card_presets').select('id, name, card_ids').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      ]);

      const fetchedCards = (cardsRes.data || []) as BehaviorCard[];
      setCards(fetchedCards);
      setActiveCardIds(new Set(fetchedCards.map(c => c.id)));
      setGroups(groupsRes.data || []);
      setPresets((presetsRes.data || []) as Preset[]);
    } catch (err) {
      console.error('Error loading gedragskaart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForGroup = async (groupId: string) => {
    const { data } = await supabase
      .from('student_groups')
      .select('students(id, first_name, last_name, color)')
      .eq('group_id', groupId)
      .eq('is_active', true);
    const list = (data || []).map((r: any) => r.students).filter(Boolean) as Student[];
    list.sort((a, b) => a.last_name.localeCompare(b.last_name));
    setStudents(list);
  };

  const loadProgress = async (studentId: string) => {
    const { data } = await supabase
      .from('behavior_card_progress')
      .select('card_id, total_count')
      .eq('student_id', studentId);
    const map: Record<string, number> = {};
    for (const row of data || []) map[row.card_id] = row.total_count;
    setProgressMap(map);
  };

  const incrementCard = async (cardId: string) => {
    if (!selectedStudentId) return;
    const current = progressMap[cardId] || 0;
    const next = current + 1;
    setProgressMap(prev => ({ ...prev, [cardId]: next }));

    const { data: existing } = await supabase
      .from('behavior_card_progress')
      .select('id')
      .eq('student_id', selectedStudentId)
      .eq('card_id', cardId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('behavior_card_progress')
        .update({ total_count: next, last_incremented_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('student_id', selectedStudentId)
        .eq('card_id', cardId);
    } else {
      await supabase
        .from('behavior_card_progress')
        .insert({ student_id: selectedStudentId, card_id: cardId, total_count: 1, created_by: user?.id });
    }
    return next;
  };

  const decrementCard = async (cardId: string) => {
    if (!selectedStudentId) return;
    const current = progressMap[cardId] || 0;
    if (current <= 0) return;
    const next = current - 1;
    setProgressMap(prev => ({ ...prev, [cardId]: next }));
    await supabase
      .from('behavior_card_progress')
      .update({ total_count: next, updated_at: new Date().toISOString() })
      .eq('student_id', selectedStudentId)
      .eq('card_id', cardId);
  };

  const handleCardAction = async (cardId: string, e: React.MouseEvent) => {
    if (!selectedStudentId) return;
    if (isDeductMode && (progressMap[cardId] || 0) <= 0) return;

    setBouncingCardId(cardId);
    setTimeout(() => setBouncingCardId(null), 250);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const label: FloatingLabel = { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top, text: isDeductMode ? '−1' : '+1' };
    setFloatingLabels(prev => [...prev, label]);
    setTimeout(() => setFloatingLabels(prev => prev.filter(l => l.id !== label.id)), 700);

    if (isDeductMode) {
      await decrementCard(cardId);
    } else {
      await incrementCard(cardId);
    }
  };

  const handleToggleCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
    setSelectedPresetId('');
  };

  const handleApplyPreset = (presetId: string) => {
    if (!presetId) { setSelectedPresetId(''); return; }
    const preset = presets.find(p => p.id === presetId);
    if (preset) { setActiveCardIds(new Set(preset.card_ids)); setSelectedPresetId(presetId); }
  };

  const handleSavePreset = async (name: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('behavior_card_presets')
      .insert({ user_id: user.id, school_id: schoolId, name, card_ids: Array.from(activeCardIds) })
      .select();
    if (data) setPresets(prev => [...prev, data[0] as Preset]);
  };

  const handleDeletePreset = async (presetId: string) => {
    await supabase.from('behavior_card_presets').delete().eq('id', presetId);
    setPresets(prev => prev.filter(p => p.id !== presetId));
    if (selectedPresetId === presetId) setSelectedPresetId('');
  };

  const handleCreateCard = async (cardData: { title: string; description: string; category: string; icon: string }) => {
    if (!user) return;
    const { data } = await supabase
      .from('behavior_cards')
      .insert({ ...cardData, card_type: 'user', created_by_user_id: user.id, is_active: true })
      .select();
    if (data?.[0]) {
      const newCard = data[0] as BehaviorCard;
      setCards(prev => [...prev, newCard]);
      setActiveCardIds(prev => new Set([...prev, newCard.id]));
    }
  };

  const filteredCards = useMemo(() => {
    let list = cards;
    if (filterCategory !== 'Alle') list = list.filter(c => c.category === filterCategory);
    if (hideInactive) list = list.filter(c => activeCardIds.has(c.id));
    return list;
  }, [cards, filterCategory, hideInactive, activeCardIds]);

  const activeCards = useMemo(() => cards.filter(c => activeCardIds.has(c.id)), [cards, activeCardIds]);

  const groupedCards = useMemo(() => {
    const map: Record<string, BehaviorCard[]> = {};
    for (const cat of CATEGORIES.slice(1)) {
      map[cat] = cards.filter(c => c.category === cat && (!hideInactive || activeCardIds.has(c.id)));
    }
    return map;
  }, [cards, hideInactive, activeCardIds]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29" />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Floating +/- labels */}
      {floatingLabels.map(l => (
        <div
          key={l.id}
          className={`fixed pointer-events-none z-50 text-2xl font-black animate-bounce ${isDeductMode ? 'text-red-500' : 'text-green-500'}`}
          style={{ left: l.x, top: l.y, transform: 'translateX(-50%) translateY(-100%)', animation: 'floatUp 0.7s ease-out forwards' }}
        >
          {l.text}
        </div>
      ))}

      {/* Header bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h1 className="text-xl font-bold text-gray-900 mr-auto">Gedragskaarten</h1>

          {/* Group selector */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-pointer hover:border-amber-500 transition-colors min-w-[160px]">
              <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="absolute inset-0 opacity-0 w-full cursor-pointer"
              >
                <option value="">Kies klas...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}{g.grade_level ? ` (${g.grade_level})` : ''}</option>
                ))}
              </select>
              <span className="flex-1 truncate text-gray-700">
                {selectedGroup ? selectedGroup.name : 'Kies klas...'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Student selector */}
          <div className="relative" ref={studentPickerRef}>
            <button
              onClick={() => selectedGroupId && setShowStudentPicker(!showStudentPicker)}
              disabled={!selectedGroupId}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors min-w-[180px]
                ${selectedStudentId
                  ? 'bg-amber-50 border-amber-300 text-#74531F'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed'}`}
            >
              {selectedStudentId && selectedStudent ? (
                <>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: selectedStudent.color || '#3B82F6' }}
                  >
                    {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                  </div>
                  <span className="flex-1 font-medium truncate">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedStudentId(''); }}
                    className="text-amber-500 hover:text-#946B29"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">
                    {!selectedGroupId ? 'Kies eerst klas' : students.length === 0 ? 'Geen leerlingen' : 'Selecteer leerling'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 pointer-events-none" />
                </>
              )}
            </button>

            {showStudentPicker && students.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {students.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStudentId(s.id); setShowStudentPicker(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left
                        ${selectedStudentId === s.id ? 'bg-amber-50' : ''}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: s.color || '#3B82F6' }}
                      >
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{s.first_name} {s.last_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* No student notice */}
        {!selectedStudentId && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-3">
            <Users className="w-4 h-4 flex-shrink-0" />
            Selecteer een leerling om +1 te kunnen klikken. Kaarten zijn wel zichtbaar.
          </div>
        )}

        {/* Toolbar row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5
                ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Alle
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5
                ${viewMode === 'category' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}
            >
              <List className="w-3.5 h-3.5" /> Categorie
            </button>
          </div>

          <div className="h-5 w-px bg-gray-200" />

          {/* +1/-1 toggle */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsDeductMode(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all
                ${!isDeductMode ? 'bg-green-500 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              +1
            </button>
            <button
              onClick={() => setIsDeductMode(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all
                ${isDeductMode ? 'bg-red-500 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              −1
            </button>
          </div>

          <div className="h-5 w-px bg-gray-200" />

          {/* Select all / deselect */}
          <button
            onClick={() => { setActiveCardIds(new Set(filteredCards.map(c => c.id))); setSelectedPresetId(''); }}
            className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            Alles aan
          </button>
          <button
            onClick={() => {
              const ids = new Set(filteredCards.map(c => c.id));
              setActiveCardIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
              setSelectedPresetId('');
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Alles uit
          </button>

          <div className="h-5 w-px bg-gray-200" />

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hideInactive}
              onChange={e => setHideInactive(e.target.checked)}
              className="w-4 h-4 cursor-pointer rounded"
            />
            Verberg inactief
          </label>

          <div className="h-5 w-px bg-gray-200" />

          <button
            onClick={() => setShowFocusMode(true)}
            disabled={activeCards.length === 0 || !selectedStudentId}
            className="px-3 py-1.5 text-xs font-semibold bg-#946B29 text-white rounded-lg hover:bg-#74531F disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5" />
            Focus ({activeCards.length})
          </button>

          <button
            onClick={() => setShowPresetModal(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Presets
          </button>

          <button
            onClick={() => setShowCardEditor(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Kaart
          </button>
        </div>

        {/* Category filter (grid mode only) */}
        {viewMode === 'grid' && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all
                  ${filterCategory === cat
                    ? 'bg-gray-900 text-white'
                    : cat === 'Alle'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : `${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'} opacity-80 hover:opacity-100`
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span>{cards.length} kaarten</span>
          <span>·</span>
          <span className="text-green-600 font-semibold">{activeCards.length} actief</span>
          {selectedStudentId && selectedStudent && (
            <>
              <span>·</span>
              <span className="text-#946B29 font-semibold">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Cards grid */}
      {viewMode === 'grid' ? (
        <div className="flex flex-wrap justify-center gap-3">
          {filteredCards.map(card => (
            <GedragskaartCard
              key={card.id}
              card={card}
              count={progressMap[card.id] || 0}
              isActive={activeCardIds.has(card.id)}
              hasStudent={!!selectedStudentId}
              isDeductMode={isDeductMode}
              bouncing={bouncingCardId === card.id}
              onAction={(e) => handleCardAction(card.id, e)}
              onToggle={(e) => handleToggleCard(card.id, e)}
            />
          ))}
          {filteredCards.length === 0 && (
            <div className="w-full text-center py-16 text-gray-400">
              Geen kaarten gevonden voor deze filter.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.slice(1).map(category => {
            const catCards = groupedCards[category];
            if (!catCards || catCards.length === 0) return null;
            const activeCount = catCards.filter(c => activeCardIds.has(c.id)).length;
            return (
              <div key={category} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600'}`}>
                    {category}
                  </span>
                  <span className="text-xs text-gray-400">{activeCount}/{catCards.length} actief</span>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-1">
                  {catCards.map(card => (
                    <div key={card.id} className="flex-shrink-0">
                      <GedragskaartCard
                        card={card}
                        count={progressMap[card.id] || 0}
                        isActive={activeCardIds.has(card.id)}
                        hasStudent={!!selectedStudentId}
                        isDeductMode={isDeductMode}
                        bouncing={bouncingCardId === card.id}
                        onAction={(e) => handleCardAction(card.id, e)}
                        onToggle={(e) => handleToggleCard(card.id, e)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showFocusMode && (
        <GedragskaartFocusMode
          cards={activeCards}
          progressMap={progressMap}
          isDeductMode={isDeductMode}
          bouncingCardId={bouncingCardId}
          onAction={(cardId, e) => handleCardAction(cardId, e)}
          onClose={() => setShowFocusMode(false)}
        />
      )}

      {showPresetModal && (
        <GedragskaartPresetModal
          presets={presets}
          activeCardIds={activeCardIds}
          onApply={handleApplyPreset}
          onSave={handleSavePreset}
          onDelete={handleDeletePreset}
          onClose={() => setShowPresetModal(false)}
        />
      )}

      {showCardEditor && (
        <GedragskaartCardEditor
          onSave={handleCreateCard}
          onClose={() => setShowCardEditor(false)}
        />
      )}
    </div>
  );
}
