import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ArrowLeft, Video, FileText, ExternalLink, Users, User, Star, Zap, Hash, Calendar } from 'lucide-react';

interface WebWijzerContent {
  id: string;
  title: string;
  content_type: 'video' | 'file' | 'link';
  content_url: string;
  symbol: string;
  color: string;
}

interface WebWijzerContentFormProps {
  content: WebWijzerContent | null;
  onClose: () => void;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
}

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
}

const ALL_SYMBOLS = [
  '📚', '🎥', '🔗', '📝', '📄', '🎵', '🎨', '🔢', '🌍', '🔬',
  '⚽', '🎮', '📱', '💻', '📖', '✏️', '🖊️', '🖍️', '✂️', '📐',
  '📏', '📌', '📍', '🔖', '🏷️', '📋', '📊', '📈', '📉', '🗂️',
  '📅', '📆', '🗓️', '📇', '🗃️', '🗄️', '📑', '🗒️', '🗞️', '📰',
  '📓', '📔', '📕', '📗', '📘', '📙', '🎯', '🎪', '🎭', '🎬',
  '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻',
  '🎲', '♟️', '🎳', '🎯', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐',
  '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '⛳',
  '🧩', '🎨', '🖼️', '🎭', '🎪', '🎡', '🎢', '🎠', '🎤', '🎧',
  '🌟', '⭐', '✨', '💫', '🌈', '🔥', '💧', '⚡', '☀️', '🌙',
  '⚛️', '🔬', '🧪', '🧬', '🔭', '🌡️', '💉', '💊', '🩺', '🩹',
  '🧲', '🔦', '💡', '🔌', '🔋', '🪫', '🧯', '🗿', '🏆', '🥇',
  '🥈', '🥉', '🏅', '🎖️', '⚜️', '🎗️', '🎫', '🎟️', '🎪', '🎨'
];

const PRESET_COLORS = [
  '#EF4444', '#DC2626', '#B91C1C', // Reds
  '#F59E0B', '#D97706', '#B45309', // Oranges
  '#EAB308', '#CA8A04', '#A16207', // Yellows
  '#10B981', '#059669', '#047857', // Greens
  '#14B8A6', '#0D9488', '#0F766E', // Teals
  '#3B82F6', '#2563EB', '#1D4ED8', // Blues
  '#8B5CF6', '#7C3AED', '#6D28D9', // Purples
  '#EC4899', '#DB2777', '#BE185D', // Pinks
];

export function WebWijzerContentForm({ content, onClose }: WebWijzerContentFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: content?.title || '',
    content_type: content?.content_type || 'video',
    content_url: content?.content_url || '',
    symbol: content?.symbol || '📎',
    color: content?.color || '#3B82F6',
    has_date_limit: false,
    available_from: '',
    available_until: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assignment states
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [assignmentMode, setAssignmentMode] = useState<'students' | 'groups'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPush, setIsPush] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [clickLimit, setClickLimit] = useState<number | null>(null);
  const [hasClickLimit, setHasClickLimit] = useState(false);
  const [hasDateLimit, setHasDateLimit] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateUntil, setDateUntil] = useState('');

  useEffect(() => {
    if (user && !content) {
      fetchStudentsAndGroups();
    }
  }, [user, content]);

  const fetchStudentsAndGroups = async () => {
    if (!user) return;

    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const [studentsData, groupsData] = await Promise.all([
        supabase
          .from('students')
          .select('id, first_name, last_name, student_number, grade_level')
          .in('school_id', schoolIds)
          .eq('is_active', true)
          .order('first_name'),
        supabase
          .from('groups')
          .select('id, name, grade_level')
          .in('school_id', schoolIds)
          .eq('is_active', true)
          .order('name'),
      ]);

      setStudents(studentsData.data || []);
      setGroups(groupsData.data || []);
    } catch (error) {
      console.error('Error fetching students and groups:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      let contentId: string;

      if (content) {
        const { error } = await supabase
          .from('webwijzer_content')
          .update({
            ...formData,
            has_date_limit: hasDateLimit,
            available_from: hasDateLimit && dateFrom ? new Date(dateFrom).toISOString() : null,
            available_until: hasDateLimit && dateUntil ? new Date(dateUntil).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', content.id);

        if (error) throw error;
        contentId = content.id;
      } else {
        const { data, error } = await supabase
          .from('webwijzer_content')
          .insert({
            ...formData,
            user_id: user.id,
            has_date_limit: hasDateLimit,
            available_from: hasDateLimit && dateFrom ? new Date(dateFrom).toISOString() : null,
            available_until: hasDateLimit && dateUntil ? new Date(dateUntil).toISOString() : null,
          })
          .select()
          .single();

        if (error) throw error;
        contentId = data.id;

        // Create assignments if any students or groups are selected
        if (selectedStudents.size > 0 || selectedGroups.size > 0) {
          const assignments = [
            ...Array.from(selectedStudents).map(studentId => ({
              content_id: contentId,
              assignable_type: 'student',
              assignable_id: studentId,
              is_push: isPush,
              is_favorite: isFavorite,
              click_limit: hasClickLimit ? clickLimit : null,
            })),
            ...Array.from(selectedGroups).map(groupId => ({
              content_id: contentId,
              assignable_type: 'group',
              assignable_id: groupId,
              is_push: isPush,
              is_favorite: isFavorite,
              click_limit: hasClickLimit ? clickLimit : null,
            })),
          ];

          const { error: assignError } = await supabase
            .from('webwijzer_assignments')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      setMessage({
        type: 'success',
        text: content ? 'Content updated successfully!' : 'Content created and assigned successfully!'
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving content:', error);
      setMessage({ type: 'error', text: 'Failed to save content' });
    } finally {
      setSaving(false);
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
        <Button variant="secondary" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {content ? 'Edit Content' : 'Create Content'}
        </h1>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content Section */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Content Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, content_type: 'video' })}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                        formData.content_type === 'video'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Video className="w-6 h-6" />
                      <span className="font-medium">Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, content_type: 'file' })}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                        formData.content_type === 'file'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-6 h-6" />
                      <span className="font-medium">File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, content_type: 'link' })}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                        formData.content_type === 'link'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ExternalLink className="w-6 h-6" />
                      <span className="font-medium">Link</span>
                    </button>
                  </div>
                </div>

                <Input
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter content title"
                  required
                />

                <Input
                  label={
                    formData.content_type === 'video'
                      ? 'YouTube URL'
                      : formData.content_type === 'file'
                      ? 'File URL'
                      : 'Website URL'
                  }
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  placeholder={
                    formData.content_type === 'video'
                      ? 'https://www.youtube.com/watch?v=...'
                      : formData.content_type === 'file'
                      ? 'https://example.com/file.pdf'
                      : 'https://example.com'
                  }
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Symbol
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    <div className="grid grid-cols-10 gap-2">
                      {ALL_SYMBOLS.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setFormData({ ...formData, symbol: sym })}
                          className={`p-2 text-2xl border-2 rounded-lg transition-colors hover:scale-110 ${
                            formData.symbol === sym
                              ? 'border-blue-500 bg-blue-50 scale-110'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="Or enter custom symbol"
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-8 gap-2 mb-2">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: col })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === col ? 'border-gray-900 scale-110 ring-2 ring-gray-400' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-12"
                  />
                </div>
              </div>
            </Card>

            {/* Assignment Section - Only show for new content */}
            {!content && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Assign to Students/Groups (Optional)</h2>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={assignmentMode === 'students' ? 'primary' : 'secondary'}
                      onClick={() => setAssignmentMode('students')}
                      className="flex-1"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Students
                    </Button>
                    <Button
                      type="button"
                      variant={assignmentMode === 'groups' ? 'primary' : 'secondary'}
                      onClick={() => setAssignmentMode('groups')}
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Groups
                    </Button>
                  </div>

                  <Input
                    placeholder={`Search ${assignmentMode}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {assignmentMode === 'students' ? (
                      filteredStudents.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No students found</p>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredStudents.map((student) => (
                            <label
                              key={student.id}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
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
                              {student.grade_level && (
                                <span className="text-sm text-gray-500">{student.grade_level}</span>
                              )}
                            </label>
                          ))}
                        </div>
                      )
                    ) : (
                      filteredGroups.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No groups found</p>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredGroups.map((group) => (
                            <label
                              key={group.id}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
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
                          ))}
                        </div>
                      )
                    )}
                  </div>

                  {(selectedStudents.size > 0 || selectedGroups.size > 0) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900">
                        Selected: {selectedStudents.size} students, {selectedGroups.size} groups
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Settings Sidebar - Only show for new content */}
          {!content && (
            <div className="space-y-6">
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">Content Settings</h3>

                {selectedStudents.size === 0 && selectedGroups.size === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Select students or groups below to configure assignment settings</p>
                  </div>
                ) : (
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

                    <div>
                      <label className="flex items-start gap-3 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={hasDateLimit}
                          onChange={(e) => {
                            setHasDateLimit(e.target.checked);
                            if (!e.target.checked) {
                              setDateFrom('');
                              setDateUntil('');
                            }
                          }}
                          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-500" />
                            <span className="font-medium text-gray-900">Date Limit</span>
                          </div>
                          <p className="text-sm text-gray-600">Set when content is available</p>
                        </div>
                      </label>
                      {hasDateLimit && (
                        <div className="space-y-2">
                          <Input
                            type="datetime-local"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="Available from"
                            label="From"
                          />
                          <Input
                            type="datetime-local"
                            value={dateUntil}
                            onChange={(e) => setDateUntil(e.target.value)}
                            placeholder="Available until"
                            label="Until"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? 'Saving...' : content ? 'Update Content' : 'Create Content'}
          </Button>
        </div>
      </form>
    </div>
  );
}
