import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { SpoorNotesModal } from './SpoorNotesModal';
import { SpoorSelectionModal } from './SpoorSelectionModal';
import { StudentSpoorDetailsModal } from './StudentSpoorDetailsModal';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { DroppableSpoorZone } from './DroppableSpoorZone';
import { DraggableStudentCard } from './DraggableStudentCard';
import { Save, X, Download, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  profile_picture_url: string | null;
  color: string | null;
  symbol_url: string | null;
}

interface Spoor {
  id: string;
  name: string;
  color: string;
  icon: string;
  custom_icon_url?: string | null;
  sort_order: number;
}

interface Assignment {
  student_id: string;
  spoor_id: string | null;
}

interface StudentDetail {
  student_id: string;
  needs_attention: boolean;
  begeleiding_klas?: string;
  begeleiding_thuis?: string;
  evaluatie?: string;
  team_member_id?: string | null;
}

interface Note {
  spoor_id: string;
  notes_text: string;
}

interface SporenBoardViewProps {
  schoolId: string;
  groupId: string;
  subjectId: string;
  groupName: string;
  subjectName: string;
}

export function SporenBoardView({ schoolId, groupId, subjectId, groupName, subjectName }: SporenBoardViewProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [sporen, setSporen] = useState<Spoor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>([]);
  const [studentDetails, setStudentDetails] = useState<StudentDetail[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedSpoorId, setSelectedSpoorId] = useState<string | null>(null);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [expandedAll, setExpandedAll] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (groupId && subjectId) {
      fetchData();
    }
  }, [groupId, subjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudents(),
        fetchSporen(),
        fetchAssignments(),
        fetchStudentDetails(),
        fetchNotes()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const { data: groupData, error: groupError } = await supabase
      .from('student_groups')
      .select('student_id')
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (groupError) throw groupError;

    const studentIds = groupData?.map(sg => sg.student_id) || [];

    if (studentIds.length === 0) {
      setStudents([]);
      return;
    }

    const { data, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, student_number, profile_picture_url, color, symbol_url')
      .in('id', studentIds)
      .eq('is_active', true)
      .order('first_name');

    if (error) throw error;
    setStudents(data || []);
  };

  const fetchSporen = async () => {
    const { data: sporenData, error: sporenError } = await supabase
      .from('sporen')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('sort_order');

    if (sporenError) throw sporenError;

    const { data: links, error: linksError } = await supabase
      .from('spoor_subject_links')
      .select('spoor_id')
      .eq('school_subject_id', subjectId);

    if (linksError) throw linksError;

    const linkedSpoorIds = links?.map(l => l.spoor_id) || [];
    const filteredSporen = sporenData?.filter(s => linkedSpoorIds.includes(s.id)) || [];
    setSporen(filteredSporen);
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('student_spoor_assignments')
      .select('student_id, spoor_id')
      .eq('group_id', groupId)
      .eq('school_subject_id', subjectId)
      .eq('is_current', true);

    if (error) throw error;
    const assignmentsList = data || [];
    setAssignments(assignmentsList);
    setOriginalAssignments(JSON.parse(JSON.stringify(assignmentsList)));
  };

  const fetchStudentDetails = async () => {
    const { data, error } = await supabase
      .from('student_spoor_assignments')
      .select('student_id, needs_attention, begeleiding_klas, begeleiding_thuis, evaluatie, team_member_id')
      .eq('group_id', groupId)
      .eq('school_subject_id', subjectId)
      .eq('is_current', true);

    if (error) throw error;
    setStudentDetails(data || []);
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('spoor_notes')
      .select('spoor_id, notes_text')
      .eq('group_id', groupId)
      .eq('school_subject_id', subjectId);

    if (error) throw error;
    setNotes(data || []);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const studentId = active.id as string;
    const newSpoorId = over.id === 'unassigned' ? null : (over.id as string);

    setAssignments(prev => {
      const existing = prev.find(a => a.student_id === studentId);
      if (existing) {
        return prev.map(a =>
          a.student_id === studentId ? { ...a, spoor_id: newSpoorId } : a
        );
      } else {
        return [...prev, { student_id: studentId, spoor_id: newSpoorId }];
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await supabase
        .from('student_spoor_assignments')
        .update({ is_current: false })
        .eq('group_id', groupId)
        .eq('school_subject_id', subjectId)
        .eq('is_current', true);

      const newAssignments = assignments
        .filter(a => a.spoor_id !== null)
        .map(a => ({
          student_id: a.student_id,
          group_id: groupId,
          school_subject_id: subjectId,
          spoor_id: a.spoor_id,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          is_current: true
        }));

      if (newAssignments.length > 0) {
        const { error } = await supabase
          .from('student_spoor_assignments')
          .insert(newAssignments);

        if (error) throw error;
      }

      setOriginalAssignments(JSON.parse(JSON.stringify(assignments)));
      alert('Wijzigingen succesvol opgeslagen!');
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Er is een fout opgetreden bij het opslaan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setAssignments(JSON.parse(JSON.stringify(originalAssignments)));
  };

  const hasChanges = JSON.stringify(assignments) !== JSON.stringify(originalAssignments);

  const getStudentsForSpoor = (spoorId: string | null) => {
    if (spoorId === null) {
      const assignedStudentIds = assignments.map(a => a.student_id);
      return students.filter(s => !assignedStudentIds.includes(s.id));
    }

    const assignedStudentIds = assignments
      .filter(a => a.spoor_id === spoorId)
      .map(a => a.student_id);
    return students.filter(s => assignedStudentIds.includes(s.id));
  };

  const activeStudent = students.find(s => s.id === activeId);

  const handleExportToExcel = () => {
    const exportData = students.map(student => {
      const assignment = assignments.find(a => a.student_id === student.id);
      const detail = studentDetails.find(d => d.student_id === student.id);
      const spoor = assignment?.spoor_id ? sporen.find(s => s.id === assignment.spoor_id) : null;
      return {
        'Leerlingnummer': student.student_number || '',
        'Voornaam': student.first_name,
        'Achternaam': student.last_name,
        'Spoor': spoor?.name || 'Niet toegewezen',
        'Aandacht nodig': detail?.needs_attention ? 'Ja' : 'Nee',
        'Begeleiding klas': detail?.begeleiding_klas || '',
        'Begeleiding thuis': detail?.begeleiding_thuis || '',
        'Evaluatie': detail?.evaluatie || ''
      };
    });

    const notesData = notes.map(note => {
      const spoor = sporen.find(s => s.id === note.spoor_id);
      return {
        'Spoor': spoor?.name || '',
        'Notities': note.notes_text
      };
    });

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Toewijzingen');

    if (notesData.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(notesData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Notities');
    }

    XLSX.writeFile(wb, `Sporen_${groupName}_${subjectName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportToPDF = () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Sporen Overzicht - ${groupName} - ${subjectName}`, margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Geëxporteerd op: ${new Date().toLocaleDateString('nl-NL')}`, margin, yPosition);
    yPosition += 10;

    sporen.forEach((spoor) => {
      const spoorStudents = getStudentsForSpoor(spoor.id);
      if (spoorStudents.length === 0) return;

      if (yPosition > 180) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFillColor(parseInt(spoor.color.slice(1, 3), 16), parseInt(spoor.color.slice(3, 5), 16), parseInt(spoor.color.slice(5, 7), 16));
      pdf.rect(margin, yPosition, contentWidth, 8, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(spoor.name, margin + 2, yPosition + 5.5);
      yPosition += 10;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Naam', margin, yPosition);
      pdf.text('Klas', margin + 50, yPosition);
      pdf.text('Thuis', margin + 100, yPosition);
      pdf.text('Evaluatie', margin + 150, yPosition);
      yPosition += 5;

      pdf.setFont('helvetica', 'normal');
      spoorStudents.forEach((student) => {
        const detail = studentDetails.find(d => d.student_id === student.id);

        if (yPosition > 185) {
          pdf.addPage();
          yPosition = margin;
        }

        const studentName = `${student.first_name} ${student.last_name}`;
        const klas = detail?.begeleiding_klas || '-';
        const thuis = detail?.begeleiding_thuis || '-';
        const eval_text = detail?.evaluatie || '-';

        pdf.text(studentName.substring(0, 30), margin, yPosition);
        const klasLines = pdf.splitTextToSize(klas.substring(0, 100), 45);
        pdf.text(klasLines[0] || '-', margin + 50, yPosition);
        const thuisLines = pdf.splitTextToSize(thuis.substring(0, 100), 45);
        pdf.text(thuisLines[0] || '-', margin + 100, yPosition);
        const evalLines = pdf.splitTextToSize(eval_text.substring(0, 100), 45);
        pdf.text(evalLines[0] || '-', margin + 150, yPosition);

        if (detail?.needs_attention) {
          pdf.setFillColor(239, 68, 68);
          pdf.circle(margin + 45, yPosition - 1.5, 1.5, 'F');
        }

        yPosition += 5;
      });

      yPosition += 5;
    });

    pdf.save(`Sporen_${groupName}_${subjectName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleOpenNotes = (spoorId: string) => {
    setSelectedSpoorId(spoorId);
    setShowNotesModal(true);
  };

  const handleNoteSaved = (spoorId: string, notesText: string) => {
    setNotes(prev => {
      const existing = prev.find(n => n.spoor_id === spoorId);
      if (existing) {
        return prev.map(n => n.spoor_id === spoorId ? { ...n, notes_text: notesText } : n);
      } else {
        return [...prev, { spoor_id: spoorId, notes_text: notesText }];
      }
    });
  };

  const handleStudentClick = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setShowDetailsModal(true);
    }
  };

  const handleSpoorSelection = (spoorId: string | null) => {
    if (!selectedStudent) return;

    setAssignments(prev => {
      const existing = prev.find(a => a.student_id === selectedStudent.id);
      if (existing) {
        return prev.map(a =>
          a.student_id === selectedStudent.id ? { ...a, spoor_id: spoorId } : a
        );
      } else {
        return [...prev, { student_id: selectedStudent.id, spoor_id: spoorId }];
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (sporen.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Geen sporen beschikbaar</h3>
        <p className="text-gray-600">
          Er zijn geen actieve sporen gekoppeld aan dit vak. Maak eerst sporen aan en koppel ze aan het vak.
        </p>
      </div>
    );
  }

  return (
    <div>
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Je hebt niet-opgeslagen wijzigingen
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Ongedaan maken
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <Button
          variant="secondary"
          onClick={() => setExpandedAll(!expandedAll)}
        >
          {expandedAll ? (
            <>
              <Minimize2 className="w-4 h-4 mr-2" />
              Alles inklappen
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 mr-2" />
              Alles uitklappen
            </>
          )}
        </Button>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={handleExportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="secondary" onClick={handleExportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          <DroppableSpoorZone
            id="unassigned"
            title="Niet toegewezen"
            students={getStudentsForSpoor(null)}
            studentDetails={studentDetails}
            color="#6b7280"
            showNotes={false}
            onOpenNotes={() => {}}
            hasNotes={false}
            onStudentClick={handleStudentClick}
            isExpanded={expandedAll}
          />

          {sporen.map(spoor => {
            const spoorNotes = notes.find(n => n.spoor_id === spoor.id);
            return (
              <DroppableSpoorZone
                key={spoor.id}
                id={spoor.id}
                title={spoor.name}
                students={getStudentsForSpoor(spoor.id)}
                studentDetails={studentDetails}
                color={spoor.color}
                icon={spoor.icon}
                customIconUrl={spoor.custom_icon_url}
                showNotes={true}
                onOpenNotes={() => handleOpenNotes(spoor.id)}
                hasNotes={!!spoorNotes?.notes_text}
                onStudentClick={handleStudentClick}
                isExpanded={expandedAll}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeStudent ? (
            <div className="opacity-80">
              <DraggableStudentCard student={activeStudent} isDragging={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showNotesModal && selectedSpoorId && (
        <SpoorNotesModal
          groupId={groupId}
          subjectId={subjectId}
          spoorId={selectedSpoorId}
          spoorName={sporen.find(s => s.id === selectedSpoorId)?.name || ''}
          groupName={groupName}
          subjectName={subjectName}
          onClose={() => {
            setShowNotesModal(false);
            setSelectedSpoorId(null);
          }}
          onSave={handleNoteSaved}
        />
      )}

      {showDetailsModal && selectedStudent && (
        <StudentSpoorDetailsModal
          student={selectedStudent}
          groupId={groupId}
          subjectId={subjectId}
          sporen={sporen}
          currentSpoorId={assignments.find(a => a.student_id === selectedStudent.id)?.spoor_id || null}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedStudent(null);
          }}
          onSave={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
