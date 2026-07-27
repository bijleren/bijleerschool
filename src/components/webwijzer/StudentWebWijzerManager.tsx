import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ArrowLeft, Search, Trash2, Video, FileText, ExternalLink, Users, AlertCircle, Eye, Star, CreditCard as Edit2 } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
}

interface WebWijzerContent {
  id: string;
  title: string;
  content_type: 'video' | 'file' | 'link';
  content_url: string;
  symbol: string;
  color: string;
  assignment_source: 'direct' | 'group';
  assignment_id?: string;
  group_name?: string;
  is_favorite?: boolean;
}

interface StudentWebWijzerManagerProps {
  onBack: () => void;
  onEditContent?: (contentId: string) => void;
}

export function StudentWebWijzerManager({ onBack, onEditContent }: StudentWebWijzerManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentContents, setStudentContents] = useState<WebWijzerContent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<WebWijzerContent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentContent();
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .in('school_id', schoolIds)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentContent = async () => {
    if (!selectedStudent) return;

    setLoading(true);
    try {
      const { data: directAssignments } = await supabase
        .from('webwijzer_assignments')
        .select(`
          id,
          content_id,
          is_favorite,
          webwijzer_content (
            id,
            title,
            content_type,
            content_url,
            symbol,
            color
          )
        `)
        .eq('assignable_type', 'student')
        .eq('assignable_id', selectedStudent.id);

      const { data: studentGroups } = await supabase
        .from('student_groups')
        .select('group_id, groups (name)')
        .eq('student_id', selectedStudent.id)
        .eq('is_active', true);

      const groupIds = studentGroups?.map(sg => sg.group_id) || [];

      let groupAssignments: any[] = [];
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from('webwijzer_assignments')
          .select(`
            id,
            content_id,
            assignable_id,
            is_favorite,
            webwijzer_content (
              id,
              title,
              content_type,
              content_url,
              symbol,
              color
            )
          `)
          .eq('assignable_type', 'group')
          .in('assignable_id', groupIds);
        groupAssignments = data || [];
      }

      const contents: WebWijzerContent[] = [];

      directAssignments?.forEach((assignment: any) => {
        if (assignment.webwijzer_content) {
          contents.push({
            ...assignment.webwijzer_content,
            assignment_source: 'direct',
            assignment_id: assignment.id,
            is_favorite: assignment.is_favorite || false,
          });
        }
      });

      groupAssignments.forEach((assignment: any) => {
        if (assignment.webwijzer_content) {
          const group = studentGroups?.find(sg => sg.group_id === assignment.assignable_id);
          contents.push({
            ...assignment.webwijzer_content,
            assignment_source: 'group',
            assignment_id: assignment.id,
            group_name: group?.groups?.name,
            is_favorite: assignment.is_favorite || false,
          });
        }
      });

      const uniqueContents = Array.from(
        new Map(contents.map(c => [c.id, c])).values()
      );

      setStudentContents(uniqueContents);
    } catch (error) {
      console.error('Error fetching student content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContent = (content: WebWijzerContent) => {
    if (content.assignment_source === 'group') {
      setMessage('Deze content komt van een groep en kan alleen daar verwijderd worden');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setContentToDelete(content);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!contentToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('webwijzer_assignments')
        .delete()
        .eq('id', contentToDelete.assignment_id!);

      if (error) throw error;

      setMessage('Content succesvol verwijderd');
      fetchStudentContent();
      setTimeout(() => setMessage(''), 3000);
      setShowDeleteConfirm(false);
      setContentToDelete(null);
    } catch (error) {
      console.error('Error removing content:', error);
      setMessage('Fout bij verwijderen van content');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'file':
        return <FileText className="w-5 h-5" />;
      case 'link':
        return <ExternalLink className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.student_number || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (selectedStudent) {
    const favoriteContents = studentContents.filter(c => c.is_favorite);
    const generalContents = studentContents.filter(c => !c.is_favorite);

    const renderContentCard = (content: WebWijzerContent) => (
      <Card key={`${content.id}-${content.assignment_id}`} className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: content.color + '20' }}
          >
            {content.symbol}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(content.content_url, '_blank')}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
              title="Bekijk content"
            >
              <Eye className="w-4 h-4 text-blue-600" />
            </button>
            {onEditContent && (
              <button
                onClick={() => onEditContent(content.id)}
                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                title="Bewerk content"
              >
                <Edit2 className="w-4 h-4 text-green-600" />
              </button>
            )}
            {content.assignment_source === 'direct' && (
              <button
                onClick={() => handleRemoveContent(content)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Verwijder content"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">{content.title}</h3>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          {getContentIcon(content.content_type)}
          <span className="capitalize">{content.content_type}</span>
        </div>

        <div className="pt-3 border-t border-gray-200">
          {content.assignment_source === 'direct' ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Direct toegewezen
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Users className="w-4 h-4" />
              Via groep: {content.group_name}
            </div>
          )}
        </div>
      </Card>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => setSelectedStudent(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </h1>
            <p className="text-gray-600 mt-1">
              WebWijzer Content Management
              {selectedStudent.student_number && ` • #${selectedStudent.student_number}`}
            </p>
          </div>
        </div>

        {message && (
          <Card className={`${
            message.includes('succesvol')
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className={`text-sm ${
              message.includes('succesvol') ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {message}
            </p>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : studentContents.length === 0 ? (
          <Card className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen content</h3>
            <p className="text-gray-600">
              Deze student heeft nog geen WebWijzer content toegewezen gekregen
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {favoriteContents.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Favorieten</h2>
                  <span className="text-sm text-gray-500">({favoriteContents.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteContents.map(renderContentCard)}
                </div>
              </div>
            )}

            {generalContents.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-gray-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Algemene Items</h2>
                  <span className="text-sm text-gray-500">({generalContents.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generalContents.map(renderContentCard)}
                </div>
              </div>
            )}
          </div>
        )}

        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setContentToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Content verwijderen"
          message={`Weet je zeker dat je "${contentToDelete?.title}" wilt verwijderen voor ${selectedStudent?.first_name}?`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          variant="danger"
          loading={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student WebWijzer Beheer</h1>
          <p className="text-gray-600 mt-1">Bekijk en beheer WebWijzer content per student</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            placeholder="Zoek student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen studenten gevonden</h3>
          <p className="text-gray-600">Probeer een andere zoekterm</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedStudent(student)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {student.first_name} {student.last_name}
                  </h3>
                  {student.student_number && (
                    <p className="text-sm text-gray-500">#{student.student_number}</p>
                  )}
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
