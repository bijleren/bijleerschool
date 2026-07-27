import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ScaleSelector } from './ScaleSelector';
import { ArrowLeft, Save, Users, ChevronDown } from 'lucide-react';

type ScaleValue = 'very_poor' | 'poor' | 'good' | 'excellent' | null;

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Book {
  id: string;
  title: string;
  author: string | null;
}

interface ReadingTechnique {
  id: string;
  title: string;
  description: string | null;
}

interface ReadingIntervention {
  id: string;
  title: string;
  is_default: boolean;
}

interface LeescoachCreateSessionProps {
  schoolId: string;
  onSessionCreated: () => void;
  onCancel: () => void;
}

export function LeescoachCreateSession({ schoolId, onSessionCreated, onCancel }: LeescoachCreateSessionProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [techniques, setTechniques] = useState<ReadingTechnique[]>([]);
  const [interventions, setInterventions] = useState<ReadingIntervention[]>([]);
  const [message, setMessage] = useState('');

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState(new Date().toTimeString().slice(0, 5));
  const [bookSource, setBookSource] = useState<'library' | 'manual'>('library');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [manualBookTitle, setManualBookTitle] = useState('');
  const [manualBookAuthor, setManualBookAuthor] = useState('');
  const [generalObservations, setGeneralObservations] = useState('');

  const [leesniveauScale, setLeesniveauScale] = useState<ScaleValue>(null);
  const [leesniveauObservations, setLeesniveauObservations] = useState('');
  const [begripScale, setBegripScale] = useState<ScaleValue>(null);
  const [begripObservations, setBegripObservations] = useState('');
  const [motivatieScale, setMotivatieScale] = useState<ScaleValue>(null);
  const [motivatieObservations, setMotivatieObservations] = useState('');
  const [smaakontwikkelingScale, setSmaakontwikkelingScale] = useState<ScaleValue>(null);
  const [smaakontwikkelingObservations, setSmaakontwikkelingObservations] = useState('');

  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>([]);
  const [selectedInterventionIds, setSelectedInterventionIds] = useState<string[]>([]);
  const [customInterventionNotes, setCustomInterventionNotes] = useState('');
  const [nextSessionDate, setNextSessionDate] = useState('');

  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.student-dropdown-container')) {
        setShowStudentDropdown(false);
      }
      if (!target.closest('.book-dropdown-container')) {
        setShowBookDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadStudentsForGroup(selectedGroupId);
    } else {
      setFilteredStudents(allStudents);
    }
    setSelectedStudentId('');
    setStudentSearch('');
  }, [selectedGroupId, allStudents]);

  const loadInitialData = async () => {
    const [groupsRes, studentsRes, booksRes, techniquesRes, interventionsRes, prefsRes] = await Promise.all([
      supabase
        .from('groups')
        .select('id, name, grade_level')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('last_name'),
      supabase
        .from('books')
        .select('id, title, author')
        .eq('school_id', schoolId)
        .order('title'),
      supabase
        .from('reading_techniques')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('reading_interventions')
        .select('*')
        .or(`is_default.eq.true,school_id.eq.${schoolId}`)
        .eq('is_active', true)
        .order('sort_order'),
      user
        ? supabase
            .from('user_preferences')
            .select('last_group_id')
            .eq('user_id', user.id)
            .eq('school_id', schoolId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (groupsRes.data) setGroups(groupsRes.data);
    if (studentsRes.data) {
      setAllStudents(studentsRes.data);
      setFilteredStudents(studentsRes.data);
    }
    if (booksRes.data) setBooks(booksRes.data);
    if (techniquesRes.data) setTechniques(techniquesRes.data);
    if (interventionsRes.data) setInterventions(interventionsRes.data);

    if (prefsRes.data?.last_group_id) {
      const savedGroupId = prefsRes.data.last_group_id;
      const groupExists = groupsRes.data?.some(g => g.id === savedGroupId);
      if (groupExists) {
        setSelectedGroupId(savedGroupId);
      }
    }
  };

  const loadStudentsForGroup = async (groupId: string) => {
    const { data } = await supabase
      .from('student_groups')
      .select('students(id, first_name, last_name)')
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (data) {
      const students = data
        .map((sg: any) => sg.students)
        .filter(Boolean)
        .sort((a: Student, b: Student) => a.last_name.localeCompare(b.last_name));
      setFilteredStudents(students);
    }
  };

  const saveGroupPreference = async (groupId: string) => {
    if (!user) return;
    await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, school_id: schoolId, last_group_id: groupId || null, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,school_id' }
      );
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    saveGroupPreference(groupId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudentId) {
      setMessage('Selecteer een leerling');
      return;
    }

    if (!leesniveauScale && !begripScale && !motivatieScale && !smaakontwikkelingScale) {
      setMessage('Beoordeel tenminste één parameter');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`).toISOString();

      const { data: session, error: sessionError } = await supabase
        .from('reading_coach_sessions')
        .insert({
          school_id: schoolId,
          student_id: selectedStudentId,
          coach_id: user?.id,
          session_date: sessionDateTime,
          book_id: bookSource === 'library' ? selectedBookId || null : null,
          manual_book_title: bookSource === 'manual' ? manualBookTitle : null,
          manual_book_author: bookSource === 'manual' ? manualBookAuthor : null,
          general_observations: generalObservations || null,
          leesniveau_scale: leesniveauScale,
          leesniveau_observations: leesniveauObservations || null,
          begrip_scale: begripScale,
          begrip_observations: begripObservations || null,
          motivatie_scale: motivatieScale,
          motivatie_observations: motivatieObservations || null,
          smaakontwikkeling_scale: smaakontwikkelingScale,
          smaakontwikkeling_observations: smaakontwikkelingObservations || null,
          custom_intervention_notes: customInterventionNotes || null,
          next_session_date: nextSessionDate || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      if (selectedTechniqueIds.length > 0) {
        const techniqueInserts = selectedTechniqueIds.map(tid => ({
          session_id: session.id,
          technique_id: tid,
        }));
        await supabase.from('reading_session_techniques').insert(techniqueInserts);
      }

      if (selectedInterventionIds.length > 0) {
        const interventionInserts = selectedInterventionIds.map(iid => ({
          session_id: session.id,
          intervention_id: iid,
        }));
        await supabase.from('reading_session_interventions').insert(interventionInserts);
      }

      setMessage('Sessie succesvol opgeslagen');
      setTimeout(() => onSessionCreated(), 1000);
    } catch (error: any) {
      console.error('Error creating session:', error);
      setMessage(error.message || 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const toggleTechnique = (id: string) => {
    setSelectedTechniqueIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const toggleIntervention = (id: string) => {
    setSelectedInterventionIds(prev =>
      prev.includes(id) ? prev.filter(iid => iid !== id) : [...prev, id]
    );
  };

  const displayedStudents = filteredStudents.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    (b.author && b.author.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  const selectedStudent = filteredStudents.find(s => s.id === selectedStudentId)
    ?? allStudents.find(s => s.id === selectedStudentId);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Nieuwe Leessessie</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Leerling en Timing</h2>

            <div className="space-y-4">
              {groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Klas
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGroupId}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="w-full appearance-none px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Alle leerlingen</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}{group.grade_level ? ` (${group.grade_level})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {selectedGroup && (
                    <p className="mt-1.5 text-sm text-#946B29 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {filteredStudents.length} leerling{filteredStudents.length !== 1 ? 'en' : ''} in {selectedGroup.name}
                    </p>
                  )}
                </div>
              )}

              <div className="student-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leerling
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={selectedGroupId ? `Zoek in ${selectedGroup?.name ?? 'klas'}...` : 'Selecteer een leerling...'}
                    value={selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudentId('');
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    required
                  />
                  {showStudentDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {displayedStudents.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500 text-sm">Geen leerlingen gevonden</div>
                      ) : (
                        displayedStudents.map(student => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setStudentSearch('');
                              setShowStudentDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50"
                          >
                            {student.first_name} {student.last_name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum
                  </label>
                  <Input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tijd
                  </label>
                  <Input
                    type="time"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Boek</h2>

            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="library"
                    checked={bookSource === 'library'}
                    onChange={(e) => setBookSource(e.target.value as 'library')}
                    className="w-4 h-4"
                  />
                  <span>Uit Bibliotheek</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="manual"
                    checked={bookSource === 'manual'}
                    onChange={(e) => setBookSource(e.target.value as 'manual')}
                    className="w-4 h-4"
                  />
                  <span>Ander Boek</span>
                </label>
              </div>

              {bookSource === 'library' ? (
                <div className="relative book-dropdown-container">
                  <Input
                    type="text"
                    placeholder="Selecteer een boek (optioneel)..."
                    value={selectedBookId ? books.find(b => b.id === selectedBookId)?.title : bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value);
                      setSelectedBookId('');
                      setShowBookDropdown(true);
                    }}
                    onFocus={() => setShowBookDropdown(true)}
                  />
                  {showBookDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredBooks.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500 text-sm">Geen boeken gevonden</div>
                      ) : (
                        filteredBooks.map(book => (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => {
                              setSelectedBookId(book.id);
                              setBookSearch('');
                              setShowBookDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50"
                          >
                            <div className="font-medium">{book.title}</div>
                            {book.author && <div className="text-sm text-gray-600">{book.author}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Boektitel"
                    value={manualBookTitle}
                    onChange={(e) => setManualBookTitle(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="Auteur (optioneel)"
                    value={manualBookAuthor}
                    onChange={(e) => setManualBookAuthor(e.target.value)}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Algemene Observaties</h2>
            <textarea
              value={generalObservations}
              onChange={(e) => setGeneralObservations(e.target.value)}
              placeholder="Wat viel je op tijdens deze sessie?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">{generalObservations.length} / 1000</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Beoordeling</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leesniveau
                </label>
                <ScaleSelector
                  value={leesniveauScale}
                  onChange={setLeesniveauScale}
                />
                <textarea
                  value={leesniveauObservations}
                  onChange={(e) => setLeesniveauObservations(e.target.value)}
                  placeholder="Opmerkingen over leesniveau..."
                  rows={2}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Begrip
                </label>
                <ScaleSelector
                  value={begripScale}
                  onChange={setBegripScale}
                />
                <textarea
                  value={begripObservations}
                  onChange={(e) => setBegripObservations(e.target.value)}
                  placeholder="Opmerkingen over begrip..."
                  rows={2}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivatie
                </label>
                <ScaleSelector
                  value={motivatieScale}
                  onChange={setMotivatieScale}
                />
                <textarea
                  value={motivatieObservations}
                  onChange={(e) => setMotivatieObservations(e.target.value)}
                  placeholder="Opmerkingen over motivatie..."
                  rows={2}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Smaakontwikkeling
                </label>
                <ScaleSelector
                  value={smaakontwikkelingScale}
                  onChange={setSmaakontwikkelingScale}
                />
                <textarea
                  value={smaakontwikkelingObservations}
                  onChange={(e) => setSmaakontwikkelingObservations(e.target.value)}
                  placeholder="Opmerkingen over smaakontwikkeling..."
                  rows={2}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </Card>

          {techniques.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Leestechnieken</h2>
              <div className="space-y-2">
                {techniques.map(technique => (
                  <label key={technique.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTechniqueIds.includes(technique.id)}
                      onChange={() => toggleTechnique(technique.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{technique.title}</div>
                      {technique.description && (
                        <div className="text-sm text-gray-600">{technique.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Interventies</h2>
            <div className="space-y-2 mb-4">
              {interventions.map(intervention => (
                <label key={intervention.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedInterventionIds.includes(intervention.id)}
                    onChange={() => toggleIntervention(intervention.id)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">{intervention.title}</span>
                  {intervention.is_default && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">Standaard</span>
                  )}
                </label>
              ))}
            </div>
            <textarea
              value={customInterventionNotes}
              onChange={(e) => setCustomInterventionNotes(e.target.value)}
              placeholder="Andere interventies of aantekeningen..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Vervolg</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volgende sessie gepland op (optioneel)
              </label>
              <Input
                type="date"
                value={nextSessionDate}
                onChange={(e) => setNextSessionDate(e.target.value)}
              />
            </div>
          </Card>

          {message && (
            <div className={`p-4 rounded-lg ${message.includes('succesvol') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Opslaan...' : 'Sessie Opslaan'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Annuleren
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
