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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow px-3 py-2">
        <p className="font-medium text-sm text-gray-900 leading-tight">
          {student.first_name} {student.last_name}
        </p>
        {student.student_number && (
          <p className="text-xs text-gray-500">#{student.student_number}</p>
        )}
      </div>
    </div>
  );
}
