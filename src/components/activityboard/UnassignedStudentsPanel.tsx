import React from 'react';
import { Users, UserPlus } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
}

interface UnassignedStudentsPanelProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

export function UnassignedStudentsPanel({
  students,
  onSelectStudent
}: UnassignedStudentsPanelProps) {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Ongeplaatste leerlingen</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {students.length} {students.length === 1 ? 'leerling' : 'leerlingen'} zonder activiteit
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Alle leerlingen zijn ingedeeld</p>
          </div>
        ) : (
          students.map((student) => (
            <button
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={`${student.first_name} ${student.last_name}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <span className="text-gray-600 font-medium text-sm group-hover:text-blue-600">
                      {student.first_name[0]}
                      {student.last_name[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-xs text-gray-500">Klik om toe te voegen</p>
                </div>
                <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
