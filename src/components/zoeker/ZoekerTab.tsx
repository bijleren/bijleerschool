import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Search, CheckCircle, Edit3, XCircle, BarChart3, Clock, CheckSquare, TrendingUp, Youtube, Globe, Image as ImageIcon, Tv, BookOpen, Users as UsersIcon, MessageCircle } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Group {
  id: string;
  name: string;
  students?: Student[];
}

interface SearchRequest {
  id: string;
  student_id: string;
  query: string;
  target: string;
  status: string;
  teacher_feedback: string | null;
  modified_query: string | null;
  feedback_data: any[];
  created_at: string;
  students?: {
    first_name: string;
    last_name: string;
  };
}

interface StudentWithRequest extends Student {
  pending_request?: SearchRequest;
  status: 'idle' | 'waiting' | 'approved' | 'needs_work';
}

const TARGETS = {
  youtube: { label: 'YouTube', icon: Youtube, color: '#FF0000' },
  google: { label: 'Google', icon: Globe, color: '#4285F4' },
  images: { label: 'Afbeeldingen', icon: ImageIcon, color: '#34A853' },
  schooltv: { label: 'SchoolTV', icon: Tv, color: '#FF6B00' },
  wikipedia: { label: 'Wikipedia', icon: BookOpen, color: '#636363' },
  wikikids: { label: 'WikiKids', icon: UsersIcon, color: '#8BC34A' },
  prompt: { label: 'Antwoord', icon: MessageCircle, color: '#3498DB' }
};

export function ZoekerTab() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentWithRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'requests' | 'analytics'>('requests');
  const [editingStudents, setEditingStudents] = useState<Set<string>>(new Set());
  const [newRequestsCount, setNewRequestsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchStudentsWithRequests();
      fetchStats();

      // Set up Realtime subscription for new requests
      const channel = supabase
        .channel(`zoeker-requests-${selectedGroup}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'zoeker_search_requests'
          },
          (payload) => {
            // Only update if no students are being edited
            if (editingStudents.size === 0) {
              fetchStudentsWithRequests();
              fetchStats();
            } else {
              // Show notification of new requests
              setNewRequestsCount(prev => prev + 1);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedGroup, editingStudents]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .in('school_id', schoolIds)
        .order('name');

      if (error) throw error;

      setGroups(data || []);
      if (data && data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleStartEditing = (studentId: string) => {
    setEditingStudents(prev => new Set(prev).add(studentId));
  };

  const handleStopEditing = (studentId: string) => {
    setEditingStudents(prev => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  };

  const handleRefreshData = () => {
    fetchStudentsWithRequests();
    fetchStats();
    setNewRequestsCount(0);
  };

  const fetchStudentsWithRequests = async () => {
    if (!selectedGroup) return;

    try {
      setLoading(true);

      const { data: studentGroupData, error: studentGroupError } = await supabase
        .from('student_groups')
        .select(`
          student_id,
          students (
            id,
            first_name,
            last_name
          )
        `)
        .eq('group_id', selectedGroup)
        .eq('is_active', true);

      if (studentGroupError) throw studentGroupError;

      const studentData = studentGroupData?.map((sg: any) => ({
        id: sg.students.id,
        first_name: sg.students.first_name,
        last_name: sg.students.last_name
      })).sort((a, b) => a.first_name.localeCompare(b.first_name));

      const { data: requests, error: requestError } = await supabase
        .from('zoeker_search_requests')
        .select('*')
        .eq('status', 'pending')
        .in('student_id', (studentData || []).map(s => s.id));

      if (requestError) throw requestError;

      const { data: approved, error: approvedError } = await supabase
        .from('zoeker_search_requests')
        .select('*')
        .in('status', ['approved', 'needs_improvement'])
        .eq('student_opened', false)
        .in('student_id', (studentData || []).map(s => s.id));

      if (approvedError) throw approvedError;

      const studentsWithRequests: StudentWithRequest[] = (studentData || []).map(student => {
        const pendingRequest = requests?.find(r => r.student_id === student.id);
        const approvedRequest = approved?.find(r => r.student_id === student.id);

        let status: 'idle' | 'waiting' | 'approved' | 'needs_work' = 'idle';
        if (pendingRequest) status = 'waiting';
        else if (approvedRequest) {
          status = approvedRequest.status === 'approved' ? 'approved' : 'needs_work';
        }

        return {
          ...student,
          pending_request: pendingRequest,
          status
        };
      });

      setStudents(studentsWithRequests);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const { count: pending } = await supabase
        .from('zoeker_search_requests')
        .select('*', { count: 'exact', head: true })
        .in('school_id', schoolIds)
        .eq('status', 'pending');

      const { count: approved } = await supabase
        .from('zoeker_search_requests')
        .select('*', { count: 'exact', head: true })
        .in('school_id', schoolIds)
        .eq('status', 'approved')
        .eq('student_opened', false);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todaySearches } = await supabase
        .from('zoeker_search_history')
        .select('*', { count: 'exact', head: true })
        .in('school_id', schoolIds)
        .gte('created_at', today.toISOString());

      setPendingCount(pending || 0);
      setApprovedCount(approved || 0);
      setTodayCount(todaySearches || 0);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRespond = async (requestId: string, action: 'approve' | 'improve' | 'reject') => {
    const student = students.find(s => s.pending_request?.id === requestId);
    const request = student?.pending_request;
    if (!request || !student) return;

    const queryInput = document.getElementById(`query-${requestId}`) as HTMLInputElement;
    const feedbackInput = document.getElementById(`feedback-${requestId}`) as HTMLInputElement;

    const newQuery = queryInput?.value.trim() || request.query;
    const feedback = feedbackInput?.value.trim() || '';
    const queryChanged = newQuery !== request.query;

    // Clear editing state for this student
    handleStopEditing(student.id);

    // Optimistic update: immediately remove from pending list
    setStudents(prev => prev.map(s =>
      s.id === student.id
        ? { ...s, pending_request: undefined, status: action === 'approve' ? 'approved' : action === 'improve' ? 'needs_work' : 'idle' }
        : s
    ));

    try {
      const updates: any = {
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      };

      if (action === 'approve') {
        updates.status = 'approved';
        if (queryChanged) {
          updates.modified_query = newQuery;
          updates.teacher_feedback = feedback || `Aangepast naar: "${newQuery}"`;
        } else {
          updates.teacher_feedback = feedback || 'Goed gedaan!';
        }
      } else if (action === 'improve') {
        updates.status = 'needs_improvement';
        updates.teacher_feedback = feedback || 'Probeer je zoekopdracht te verbeteren.';
      } else if (action === 'reject') {
        updates.status = 'rejected';
        updates.teacher_feedback = feedback || 'Deze zoekopdracht is niet toegestaan.';
      }

      const { error } = await supabase
        .from('zoeker_search_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('zoeker_notifications').insert({
        student_id: request.student_id,
        request_id: requestId,
        message: action === 'approve'
          ? `✅ Je zoekopdracht is goedgekeurd!`
          : action === 'improve'
          ? `✏️ Je zoekopdracht moet verbeterd worden`
          : `❌ Je zoekopdracht is afgekeurd`
      });

      // Refresh to get accurate data
      fetchStudentsWithRequests();
      fetchStats();
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Er ging iets mis. Probeer het opnieuw.');
      // Revert optimistic update on error
      fetchStudentsWithRequests();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Zoeker Dashboard</h1>
          <p className="text-gray-600">Beheer zoekopdrachten van leerlingen</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="font-semibold text-gray-700">Klas:</label>
          <select
            value={selectedGroup || ''}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-4 py-2 border-2 border-blue-500 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* New Requests Notification */}
      {newRequestsCount > 0 && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">{newRequestsCount}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {newRequestsCount === 1 ? 'Nieuw verzoek beschikbaar' : `${newRequestsCount} nieuwe verzoeken beschikbaar`}
              </p>
              <p className="text-sm text-gray-600">
                Klik op vernieuwen om de nieuwe verzoeken te zien
              </p>
            </div>
          </div>
          <Button onClick={handleRefreshData} className="bg-blue-500 hover:bg-blue-600">
            Vernieuwen
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Wachtend</p>
              <p className="text-4xl font-bold text-orange-500 mt-2">{pendingCount}</p>
            </div>
            <Clock className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Goedgekeurd</p>
              <p className="text-4xl font-bold text-green-500 mt-2">{approvedCount}</p>
            </div>
            <CheckSquare className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Vandaag</p>
              <p className="text-4xl font-bold text-blue-500 mt-2">{todayCount}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Students Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Leerlingen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => {
            const TargetIcon = student.pending_request
              ? TARGETS[student.pending_request.target as keyof typeof TARGETS]?.icon
              : null;

            return (
              <Card
                key={student.id}
                className={`p-4 transition-all ${
                  student.status === 'waiting' ? 'border-2 border-orange-400 bg-orange-50' :
                  student.status === 'approved' ? 'border-2 border-green-400 bg-green-50' :
                  student.status === 'needs_work' ? 'border-2 border-blue-400 bg-blue-50' :
                  ''
                }`}
              >
                {/* Student Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      student.status === 'waiting' ? 'bg-orange-500' :
                      student.status === 'approved' ? 'bg-green-500' :
                      student.status === 'needs_work' ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`}
                  >
                    {student.first_name[0]}{student.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {student.status === 'waiting' ? '⏳ Wacht' :
                       student.status === 'approved' ? '✅ Klaar' :
                       student.status === 'needs_work' ? '✏️ Verbeteren' :
                       '💤 Geen verzoek'}
                    </p>
                  </div>
                </div>

                {/* Request Details */}
                {student.pending_request ? (
                  <div className="space-y-3">
                    <div className="p-2 bg-white rounded-lg">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        🔍 {student.pending_request.query}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        {TargetIcon && <TargetIcon className="w-3 h-3" />}
                        <span>📍 {TARGETS[student.pending_request.target as keyof typeof TARGETS]?.label || 'Onbekend'}</span>
                      </div>
                    </div>

                    <Input
                      id={`query-${student.pending_request.id}`}
                      defaultValue={student.pending_request.query}
                      placeholder="Zoekopdracht aanpassen..."
                      className="text-sm"
                      onFocus={() => handleStartEditing(student.id)}
                      onBlur={() => handleStopEditing(student.id)}
                    />
                    <Input
                      id={`feedback-${student.pending_request.id}`}
                      placeholder="Feedback (optioneel)..."
                      className="text-sm"
                      onFocus={() => handleStartEditing(student.id)}
                      onBlur={() => handleStopEditing(student.id)}
                    />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(student.pending_request!.id, 'approve')}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        OK
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRespond(student.pending_request!.id, 'improve')}
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRespond(student.pending_request!.id, 'reject')}
                        className="flex-1 bg-red-500 hover:bg-red-600"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        ✗
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">
                    {student.status === 'approved' ? 'Wacht op leerling...' :
                     student.status === 'needs_work' ? 'Moet verbeteren...' :
                     'Geen verzoek'}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
