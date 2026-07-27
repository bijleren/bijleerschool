import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import * as Icons from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
}

interface ActivityOption {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  max_students: number | null;
  current_count: number;
}

interface ActivitySelectionModalProps {
  student: Student | null;
  activities: ActivityOption[];
  onSelect: (activityId: string) => void;
  onClose: () => void;
}

export function ActivitySelectionModal({
  student,
  activities,
  onSelect,
  onClose
}: ActivitySelectionModalProps) {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  if (!student) return null;

  const availableActivities = activities.filter(
    (activity) =>
      activity.max_students === null ||
      activity.current_count < activity.max_students
  );

  const handleSelect = () => {
    if (selectedActivity) {
      onSelect(selectedActivity);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={`${student.first_name} ${student.last_name}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {student.first_name[0]}
                  {student.last_name[0]}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-sm text-gray-500">Selecteer een activiteit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {availableActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Alle activiteiten zijn vol</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableActivities.map((activity) => {
                const IconComponent =
                  (Icons[activity.icon as keyof typeof Icons] as any) || Icons.Grid;
                const spotsLeft =
                  activity.max_students !== null
                    ? activity.max_students - activity.current_count
                    : null;

                return (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedActivity === activity.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: activity.color + '20' }}
                      >
                        <IconComponent
                          className="w-5 h-5"
                          style={{ color: activity.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {activity.name}
                        </h4>
                        {activity.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600">
                            {activity.current_count}
                            {spotsLeft !== null && ` / ${activity.max_students}`}
                            {spotsLeft !== null && spotsLeft <= 3 && (
                              <span className="text-orange-600 ml-1">
                                ({spotsLeft} plekken vrij)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedActivity || availableActivities.length === 0}
          >
            Toevoegen
          </Button>
        </div>
      </div>
    </div>
  );
}
