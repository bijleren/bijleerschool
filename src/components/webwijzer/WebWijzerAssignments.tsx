import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ArrowLeft, Users, User, Star, Zap, Hash } from 'lucide-react';

interface WebWijzerContent {
  id: string;
  title: string;
  content_type: string;
  symbol: string;
  color: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
  school_id: string;
}

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
  school_id: string;
}

interface WebWijzerAssignmentsProps {
  content: WebWijzerContent;
  onBack: () => void;
}

export function WebWijzerAssignments({ content, onBack }: WebWijzerAssignmentsProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isPush, setIsPush] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [clickLimit, setClickLimit] = useState<number | null>(null);
  const [hasClickLimit, setHasClickLimit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'students' | 'groups'>('students');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userSchools, error: schoolsError } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      if (schoolsError) throw schoolsError;

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const [studentsData, groupsData] = await Promise.all([
        supabase
          .from('students')
          .select('id, first_name, last_name, student_number, grade_level, school_id')
          .in('school_id', schoolIds)
          .eq('is_active', true)
          .order('first_name'),
        supabase
          .from('groups')
          .select('id, name, grade_level, school_id')
          .in('school_id', schoolIds)
          .eq('is_active', true)
          .order('name'),
      ]);

      if (studentsData.error) throw studentsData.error;
      if (groupsData.error) throw groupsData.error;

      setStudents(studentsData.data || []);
      setGroups(groupsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedStudents.size === 0 && selectedGroups.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one student or group' });
      return;
    }

    setSaving(true);
    try {
      const assignments = [
        ...Array.from(selectedStudents).map(studentId => ({
          content_id: content.id,
          assignable_type: 'student',
          assignable_id: studentId,
          is_push: isPush,
          is_favorite: isFavorite,
          click_limit: hasClickLimit ? clickLimit : null,
        })),
        ...Array.from(selectedGroups).map(groupId => ({
          content_id: content.id,
          assignable_type: 'group',
          assignable_id: groupId,
          is_push: isPush,
          is_favorite: isFavorite,
          click_limit: hasClickLimit ? clickLimit : null,
        })),
      ];

      const { error } = await supabase
        .from('webwijzer_assignments')
        .insert(assignments);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Content assigned successfully!' });
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error assigning content:', error);
      setMessage({ type: 'error', text: 'Failed to assign content' });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.student_number || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assign Content</h1>
          <p className="text-gray-600 mt-1">{content.title}</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex gap-2 mb-4">
              <Button
                variant={viewMode === 'students' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('students')}
                className="flex-1"
              >
                <User className="w-4 h-4 mr-2" />
                Students
              </Button>
              <Button
                variant={viewMode === 'groups' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('groups')}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Groups
              </Button>
            </div>

            <Input
              placeholder={`Search ${viewMode}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {viewMode === 'students' ? (
                  filteredStudents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No students found</p>
                  ) : (
                    filteredStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => handleStudentToggle(student.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {student.first_name} {student.last_name}
                          </p>
                          {student.student_number && (
                            <p className="text-sm text-gray-500">#{student.student_number}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )
                ) : (
                  filteredGroups.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No groups found</p>
                  ) : (
                    filteredGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.has(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <Users className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{group.name}</p>
                        </div>
                        {group.grade_level && (
                          <span className="text-sm text-gray-500">{group.grade_level}</span>
                        )}
                      </label>
                    ))
                  )
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Content Settings</h3>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPush}
                  onChange={(e) => setIsPush(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-gray-900">Push</span>
                  </div>
                  <p className="text-sm text-gray-600">Auto-open when student accesses page</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium text-gray-900">Favorite</span>
                  </div>
                  <p className="text-sm text-gray-600">Always available</p>
                </div>
              </label>

              <div>
                <label className="flex items-start gap-3 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={hasClickLimit}
                    onChange={(e) => {
                      setHasClickLimit(e.target.checked);
                      if (!e.target.checked) setClickLimit(null);
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-900">Click Limit</span>
                    </div>
                    <p className="text-sm text-gray-600">Limit number of times content can be accessed</p>
                  </div>
                </label>
                {hasClickLimit && (
                  <Input
                    type="number"
                    min="1"
                    value={clickLimit || ''}
                    onChange={(e) => setClickLimit(parseInt(e.target.value) || null)}
                    placeholder="Number of clicks"
                  />
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Selection Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Students:</span>
                <span className="font-medium">{selectedStudents.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Groups:</span>
                <span className="font-medium">{selectedGroups.size}</span>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={saving || (selectedStudents.size === 0 && selectedGroups.size === 0)}
            className="w-full"
          >
            {saving ? 'Assigning...' : 'Assign Content'}
          </Button>
        </div>
      </div>
    </div>
  );
}
