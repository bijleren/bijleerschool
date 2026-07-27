import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, ArrowRight, AlertCircle, User, Filter } from 'lucide-react';

interface LogEntry {
  id: string;
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  spoor_id: string;
  spoor_name: string;
  spoor_color: string;
  is_current: boolean;
  assigned_at: string;
  assigned_by_name: string | null;
  needs_attention: boolean;
  change_notes: string | null;
}

interface Spoor {
  id: string;
  name: string;
  color: string;
}

interface SporenLogProps {
  schoolId: string;
  groupId: string;
  subjectId: string;
  groupName: string;
  subjectName: string;
  sporen: Spoor[];
}

export function SporenLog({ schoolId, groupId, subjectId, groupName, subjectName, sporen }: SporenLogProps) {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSpoorId, setFilterSpoorId] = useState<string>('');
  const [filterStudentName, setFilterStudentName] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (groupId && subjectId) {
      loadLog();
    }
  }, [groupId, subjectId, page]);

  const loadLog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_spoor_assignments')
        .select(`
          id,
          student_id,
          spoor_id,
          is_current,
          assigned_at,
          needs_attention,
          change_notes,
          students!student_spoor_assignments_student_id_fkey(first_name, last_name),
          sporen!student_spoor_assignments_spoor_id_fkey(name, color)
        `)
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .order('assigned_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const mapped: LogEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        student_first_name: row.students?.first_name || '',
        student_last_name: row.students?.last_name || '',
        spoor_id: row.spoor_id,
        spoor_name: row.sporen?.name || '',
        spoor_color: row.sporen?.color || '#6b7280',
        is_current: row.is_current,
        assigned_at: row.assigned_at,
        assigned_by_name: null,
        needs_attention: row.needs_attention,
        change_notes: row.change_notes,
      }));

      setLogEntries(mapped);
    } catch (err) {
      console.error('Error loading spoor log:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = logEntries.filter((entry) => {
    const nameMatch = filterStudentName === '' ||
      `${entry.student_first_name} ${entry.student_last_name}`
        .toLowerCase()
        .includes(filterStudentName.toLowerCase());
    const spoorMatch = filterSpoorId === '' || entry.spoor_id === filterSpoorId;
    return nameMatch && spoorMatch;
  });

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek leerling..."
              value={filterStudentName}
              onChange={(e) => setFilterStudentName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="sm:w-56">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterSpoorId}
              onChange={(e) => setFilterSpoorId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">Alle sporen</option>
              {sporen.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nog geen wijzigingen geregistreerd</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry, index) => {
            const prevEntry = filteredEntries
              .slice(index + 1)
              .find((e) => e.student_id === entry.student_id);

            return (
              <div
                key={entry.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  entry.is_current
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white ring-2"
                    style={{ backgroundColor: entry.spoor_color, ringColor: entry.spoor_color }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {entry.student_first_name} {entry.student_last_name}
                    </span>
                    {prevEntry && (
                      <>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: prevEntry.spoor_color }}
                        >
                          {prevEntry.spoor_name}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </>
                    )}
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: entry.spoor_color }}
                    >
                      {entry.spoor_name}
                    </span>
                    {entry.is_current && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Huidig
                      </span>
                    )}
                    {entry.needs_attention && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(entry.assigned_at)}
                    </span>
                    {entry.assigned_by_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {entry.assigned_by_name}
                      </span>
                    )}
                  </div>
                  {entry.change_notes && (
                    <p className="text-xs text-gray-600 mt-1 italic">{entry.change_notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(logEntries.length === PAGE_SIZE || page > 0) && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Vorige
          </button>
          <span className="text-sm text-gray-500">Pagina {page + 1}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={logEntries.length < PAGE_SIZE}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}
