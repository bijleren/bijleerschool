import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, FileSpreadsheet, FileText, AlertCircle, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface StudentAssignment {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_number: string | null;
  spoor_id: string;
  spoor_name: string;
  spoor_color: string;
  spoor_sort_order: number;
  needs_attention: boolean;
  assigned_at: string;
}

interface Spoor {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface SporenOverviewProps {
  schoolId: string;
  groupId: string;
  subjectId: string;
  groupName: string;
  subjectName: string;
  sporen: Spoor[];
}

export function SporenOverview({ schoolId, groupId, subjectId, groupName, subjectName, sporen }: SporenOverviewProps) {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'spoor'>('spoor');

  useEffect(() => {
    if (groupId && subjectId) {
      loadAssignments();
    }
  }, [groupId, subjectId]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_spoor_assignments')
        .select(`
          student_id,
          spoor_id,
          needs_attention,
          assigned_at,
          students!student_spoor_assignments_student_id_fkey(first_name, last_name, student_number),
          sporen!student_spoor_assignments_spoor_id_fkey(name, color, sort_order)
        `)
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('is_current', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const mapped: StudentAssignment[] = (data || []).map((row: any) => ({
        student_id: row.student_id,
        student_first_name: row.students?.first_name || '',
        student_last_name: row.students?.last_name || '',
        student_number: row.students?.student_number || null,
        spoor_id: row.spoor_id,
        spoor_name: row.sporen?.name || '',
        spoor_color: row.sporen?.color || '#6b7280',
        spoor_sort_order: row.sporen?.sort_order ?? 0,
        needs_attention: row.needs_attention,
        assigned_at: row.assigned_at,
      }));

      setAssignments(mapped);
    } catch (err) {
      console.error('Error loading spoor overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    if (sortBy === 'spoor') {
      if (a.spoor_sort_order !== b.spoor_sort_order) return a.spoor_sort_order - b.spoor_sort_order;
    }
    return `${a.student_last_name} ${a.student_first_name}`.localeCompare(
      `${b.student_last_name} ${b.student_first_name}`, 'nl'
    );
  });

  const groupedBySpoor = sporen.map((spoor) => ({
    spoor,
    students: sortedAssignments.filter((a) => a.spoor_id === spoor.id),
  })).filter((group) => group.students.length > 0);

  const unassigned = sortedAssignments.filter(
    (a) => !sporen.find((s) => s.id === a.spoor_id)
  );

  const exportExcel = () => {
    const rows = sortedAssignments.map((a, index) => ({
      '#': index + 1,
      Leerlingnummer: a.student_number || '',
      Voornaam: a.student_first_name,
      Achternaam: a.student_last_name,
      Spoor: a.spoor_name,
      'Aandacht nodig': a.needs_attention ? 'Ja' : 'Nee',
      'Toegewezen op': new Date(a.assigned_at).toLocaleDateString('nl-BE'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [
      { wch: 4 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sporen Overzicht');

    const bySpoor = sporen.map((s) => ({
      Spoor: s.name,
      'Aantal leerlingen': assignments.filter((a) => a.spoor_id === s.id).length,
    }));
    const wsSummary = XLSX.utils.json_to_sheet(bySpoor);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Samenvatting per spoor');

    const dateStr = new Date().toLocaleDateString('nl-BE').replace(/\//g, '-');
    XLSX.writeFile(wb, `Sporen_${groupName}_${subjectName}_${dateStr}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const dateStr = new Date().toLocaleDateString('nl-BE');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Sporen Overzicht', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${groupName} - ${subjectName}`, margin, y);
    y += 6;
    doc.text(`Gegenereerd op ${dateStr}`, margin, y);
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setTextColor(0, 0, 0);

    for (const { spoor, students } of groupedBySpoor) {
      if (y > 260) {
        doc.addPage();
        y = margin;
      }

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
          : { r: 107, g: 114, b: 128 };
      };
      const { r, g, b } = hexToRgb(spoor.color);

      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${spoor.name}  (${students.length} leerling${students.length !== 1 ? 'en' : ''})`, margin + 4, y + 5.5);
      doc.setTextColor(0, 0, 0);
      y += 12;

      for (const student of students) {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        const name = `${student.student_last_name}, ${student.student_first_name}`;
        doc.setFontSize(9);
        doc.setFont('helvetica', student.needs_attention ? 'bold' : 'normal');
        if (student.needs_attention) {
          doc.setTextColor(220, 38, 38);
        }
        const prefix = student.needs_attention ? '! ' : '\u2022 ';
        doc.text(`${prefix}${name}${student.student_number ? `  [${student.student_number}]` : ''}`, margin + 4, y);
        doc.setTextColor(0, 0, 0);
        y += 5.5;
      }

      y += 4;
    }

    doc.save(`Sporen_${groupName}_${subjectName}_${dateStr}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Sorteren:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setSortBy('spoor')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                sortBy === 'spoor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Per spoor
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1.5 text-sm border-l border-gray-300 transition-colors ${
                sortBy === 'name' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Op naam
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} size="sm">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} size="sm">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nog geen leerlingen toegewezen aan sporen</p>
        </div>
      ) : sortBy === 'spoor' ? (
        <div className="space-y-4">
          {groupedBySpoor.map(({ spoor, students }) => (
            <div key={spoor.id} className="rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: spoor.color + '22', borderBottom: `2px solid ${spoor.color}` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: spoor.color }} />
                  <span className="font-semibold text-gray-900 text-sm">{spoor.name}</span>
                </div>
                <span className="text-xs text-gray-600 font-medium bg-white/70 px-2 py-0.5 rounded-full">
                  {students.length} leerling{students.length !== 1 ? 'en' : ''}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {students.map((student) => (
                  <div key={student.student_id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {student.student_first_name[0]}{student.student_last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900">
                        {student.student_first_name} {student.student_last_name}
                      </span>
                      {student.student_number && (
                        <span className="text-xs text-gray-400 ml-2">{student.student_number}</span>
                      )}
                    </div>
                    {student.needs_attention && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {unassigned.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-500 text-sm">Geen spoor toegewezen</span>
                <span className="text-xs text-gray-400">{unassigned.length} leerling{unassigned.length !== 1 ? 'en' : ''}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {unassigned.map((student) => (
                  <div key={student.student_id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {student.student_first_name[0]}{student.student_last_name[0]}
                      </span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {student.student_first_name} {student.student_last_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Naam</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Leerlingnr.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Spoor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aandacht</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Toegewezen op</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAssignments.map((student, index) => (
                  <tr key={student.student_id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400">{index + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {student.student_first_name} {student.student_last_name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{student.student_number || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: student.spoor_color }}
                      >
                        {student.spoor_name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {student.needs_attention && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(student.assigned_at).toLocaleDateString('nl-BE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2 flex-wrap">
        {sporen.map((spoor) => {
          const count = assignments.filter((a) => a.spoor_id === spoor.id).length;
          const pct = assignments.length > 0 ? Math.round((count / assignments.length) * 100) : 0;
          return (
            <div key={spoor.id} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: spoor.color }} />
              <span className="text-gray-700">{spoor.name}</span>
              <span className="text-gray-400">{count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
