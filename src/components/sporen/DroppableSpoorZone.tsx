import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DraggableStudentCard } from './DraggableStudentCard';
import { StickyNote, AlertCircle } from 'lucide-react';
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

interface DroppableSpoorZoneProps {
  id: string;
  title: string;
  students: Student[];
  color: string;
  icon?: string;
  customIconUrl?: string | null;
  showNotes: boolean;
  onOpenNotes: () => void;
  hasNotes: boolean;
}

export function DroppableSpoorZone({
  id,
  title,
  students,
  color,
  icon,
  customIconUrl,
  showNotes,
  onOpenNotes,
  hasNotes
}: DroppableSpoorZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const IconComponent = icon ? (Icons as any)[icon] || Icons.GraduationCap : AlertCircle;

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg border-2 transition-all ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div
        className="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
        style={{ borderLeftWidth: '4px', borderLeftColor: color }}
      >
        <div className="flex items-center space-x-3">
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
            <p className="text-sm text-gray-500">{students.length} leerlingen</p>
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

      <SortableContext items={students.map(s => s.id)} strategy={rectSortingStrategy}>
        <div className="p-4">
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Sleep leerlingen hierheen</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {students.map((student) => {
                console.log('DroppableSpoorZone - rendering student:', student);
                return <DraggableStudentCard key={student.id} student={student} isDragging={false} />;
              })}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
