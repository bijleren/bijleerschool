import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableStudentCard } from './DraggableStudentCard';
import { StickyNote, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import * as Icons from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  profile_picture_url: string | null;
  color: string | null;
  symbol_url: string | null;
}

interface StudentDetail {
  student_id: string;
  needs_attention: boolean;
  begeleiding_klas?: string;
  begeleiding_thuis?: string;
  evaluatie?: string;
}

interface DroppableSpoorZoneProps {
  id: string;
  title: string;
  students: Student[];
  studentDetails?: StudentDetail[];
  color: string;
  icon?: string;
  customIconUrl?: string | null;
  showNotes: boolean;
  onOpenNotes: () => void;
  hasNotes: boolean;
  onStudentClick?: (studentId: string) => void;
  isExpanded?: boolean;
}

export function DroppableSpoorZone({
  id,
  title,
  students,
  studentDetails = [],
  color,
  icon,
  customIconUrl,
  showNotes,
  onOpenNotes,
  hasNotes,
  onStudentClick,
  isExpanded: propExpanded = false
}: DroppableSpoorZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [localExpanded, setLocalExpanded] = useState(propExpanded);

  React.useEffect(() => {
    setLocalExpanded(propExpanded);
  }, [propExpanded]);

  const isExpanded = localExpanded;
  const IconComponent = icon ? (Icons as any)[icon] || Icons.GraduationCap : AlertCircle;

  const attentionCount = students.filter(s => {
    const detail = studentDetails.find(d => d.student_id === s.id);
    return detail?.needs_attention;
  }).length;

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg border-2 transition-all ${
        isOver ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
      }`}
    >
      <div
        className="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
        style={{ borderLeftWidth: '4px', borderLeftColor: color }}
      >
        <div className="flex items-center space-x-3 flex-1">
          <button
            onClick={() => setLocalExpanded(!localExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: customIconUrl ? 'transparent' : color + '20' }}
          >
            {customIconUrl ? (
              <img src={customIconUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <IconComponent className="w-5 h-5" style={{ color }} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-500">{students.length} leerlingen</p>
              {attentionCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  {attentionCount} aandacht nodig
                </span>
              )}
            </div>
          </div>
        </div>
        {showNotes && (
          <button
            onClick={onOpenNotes}
            className={`p-2 rounded-lg transition-colors ${
              hasNotes
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title="Notities"
          >
            <StickyNote className="w-5 h-5" />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4">
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Sleep leerlingen hierheen</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {students.map((student) => {
                const detail = studentDetails.find(d => d.student_id === student.id);
                return (
                  <div key={student.id} className="relative">
                    {detail?.needs_attention && (
                      <div className="absolute -top-1 -right-1 z-10 bg-red-500 rounded-full p-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                    )}
                    <DraggableStudentCard
                      student={student}
                      isDragging={false}
                      onClick={onStudentClick ? () => onStudentClick(student.id) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
