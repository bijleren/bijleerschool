import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
}

interface UnassignedStudentsPanelProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

function DraggableStudent({ student, onSelectStudent }: { student: Student; onSelectStudent: (student: Student) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `unassigned-${student.id}`,
    data: {
      type: 'unassigned-student',
      student
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <button
        onClick={() => onSelectStudent(student)}
        className="w-full p-2 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all group flex flex-col items-center text-center"
      >
                {student.profile_picture_url ? (
                  <img
                    src={student.profile_picture_url}
                    alt={`${student.first_name} ${student.last_name}`}
                    className="w-16 h-16 rounded-full object-cover mb-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-amber-100 transition-colors mb-1">
                    <span className="text-gray-600 font-medium text-sm group-hover:text-#946B29">
                      {student.first_name[0]}
                      {student.last_name[0]}
                    </span>
                  </div>
                )}
                <div className="w-full">
                  <p className="font-medium text-gray-900 text-xs truncate">
                    {student.first_name}
                  </p>
                  <p className="font-medium text-gray-700 text-xs truncate">
                    {student.last_name}
                  </p>
                </div>
        <UserPlus className="w-3 h-3 text-gray-400 group-hover:text-#946B29 transition-colors mt-1" />
      </button>
    </div>
  );
}

export function UnassignedStudentsPanel({
  students,
  onSelectStudent
}: UnassignedStudentsPanelProps) {
  return (
    <div className="bg-white border-l border-gray-200 flex flex-col h-screen" style={{ width: '160px' }}>
      <div className="p-2 border-b border-gray-200">
        <div className="flex items-center gap-1 mb-1">
          <Users className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900 text-xs">Leerlingen</h3>
        </div>
        <p className="text-xs text-gray-500">
          {students.length}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {students.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-xs">Alle ingedeeld</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <DraggableStudent
                key={student.id}
                student={student}
                onSelectStudent={onSelectStudent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
