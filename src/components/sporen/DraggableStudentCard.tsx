import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  profile_picture_url: string | null;
  color: string | null;
  symbol_url: string | null;
}

interface DraggableStudentCardProps {
  student: Student;
  isDragging: boolean;
  onClick?: () => void;
}

export function DraggableStudentCard({ student, isDragging, onClick }: DraggableStudentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: student.id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const backgroundColor = student.color || '#e5e7eb';

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
      onClick={handleClick}
    >
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-3">
        <div className="flex flex-col items-center space-y-2">
          {student.profile_picture_url ? (
            <img
              src={student.profile_picture_url}
              alt={`${student.first_name} ${student.last_name}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : student.symbol_url ? (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor }}
            >
              <img src={student.symbol_url} alt="" className="w-10 h-10 object-contain" />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor }}
            >
              {student.first_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="font-medium text-sm text-gray-900 leading-tight">
              {student.first_name}
            </p>
            <p className="font-medium text-sm text-gray-900 leading-tight">
              {student.last_name}
            </p>
            {student.student_number && (
              <p className="text-xs text-gray-500 mt-1">#{student.student_number}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
