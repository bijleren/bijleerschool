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
    <div className="bg-white border-l border-gray-200 flex flex-col h-screen" style={{ width: '400px' }}>
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Ongeplaatste leerlingen</h3>
        </div>
        <p className="text-xs text-gray-500">
          {students.length} {students.length === 1 ? 'leerling' : 'leerlingen'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Alle leerlingen zijn ingedeeld</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group flex flex-col items-center text-center"
              >
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={`${student.first_name} ${student.last_name}`}
                    className="w-16 h-16 rounded-full object-cover mb-2"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors mb-2">
                    <span className="text-gray-600 font-medium text-lg group-hover:text-blue-600">
                      {student.first_name[0]}
                      {student.last_name[0]}
                    </span>
                  </div>
                )}
                <div className="w-full">
                  <p className="font-medium text-gray-900 text-xs truncate">
                    {student.first_name}
                  </p>
                  <p className="font-medium text-gray-900 text-xs truncate">
                    {student.last_name}
                  </p>
                </div>
                <UserPlus className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition-colors mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
