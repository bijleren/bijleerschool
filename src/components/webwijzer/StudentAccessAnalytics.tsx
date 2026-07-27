import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ArrowLeft, Users, Clock, Calendar, TrendingUp, Search, User, QrCode, MousePointer, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface StudentAccess {
  student_id: string;
  student_name: string;
  student_number: string | null;
  total_visits: number;
  last_visit: string | null;
  first_visit: string | null;
  qr_visits: number;
  manual_visits: number;
  visit_history: Array<{
    accessed_at: string;
    access_method: string;
  }>;
}

type SortField = 'name' | 'total_visits' | 'last_visit' | 'first_visit';
type SortDirection = 'asc' | 'desc';

export function StudentAccessAnalytics({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [studentAccess, setStudentAccess] = useState<StudentAccess[]>([]);
  const [filteredAccess, setFilteredAccess] = useState<StudentAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentAccess | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortField, setSortField] = useState<SortField>('total_visits');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (user) {
      fetchStudentAccess();
    }
  }, [user]);

  useEffect(() => {
    filterStudents();
  }, [studentAccess, searchTerm, dateFilter, sortField, sortDirection]);

  const fetchStudentAccess = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .in('school_id', schoolIds)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      const accessDataPromises = (students || []).map(async (student) => {
        const { data: accessLogs } = await supabase
          .from('webwijzer_access_log')
          .select('accessed_at, access_method')
          .eq('student_id', student.id)
          .order('accessed_at', { ascending: false });

        const logs = accessLogs || [];
        const qrVisits = logs.filter(log => log.access_method === 'qr').length;
        const manualVisits = logs.filter(log => log.access_method === 'manual').length;

        return {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number,
          total_visits: logs.length,
          last_visit: logs.length > 0 ? logs[0].accessed_at : null,
          first_visit: logs.length > 0 ? logs[logs.length - 1].accessed_at : null,
          qr_visits: qrVisits,
          manual_visits: manualVisits,
          visit_history: logs,
        };
      });

      const accessData = await Promise.all(accessDataPromises);
      const sortedData = accessData.sort((a, b) => b.total_visits - a.total_visits);
      setStudentAccess(sortedData);
    } catch (error) {
      console.error('Error fetching student access:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...studentAccess];

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (dateFilter) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          cutoffDate = new Date(now.setDate(now.getDate() - 30));
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(s => {
        if (!s.last_visit) return false;
        return new Date(s.last_visit) >= cutoffDate;
      });
    }

    filtered = sortStudents(filtered);
    setFilteredAccess(filtered);
  };

  const sortStudents = (students: StudentAccess[]) => {
    return [...students].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.student_name.localeCompare(b.student_name);
          break;
        case 'total_visits':
          comparison = a.total_visits - b.total_visits;
          break;
        case 'last_visit':
          if (!a.last_visit && !b.last_visit) comparison = 0;
          else if (!a.last_visit) comparison = 1;
          else if (!b.last_visit) comparison = -1;
          else comparison = new Date(a.last_visit).getTime() - new Date(b.last_visit).getTime();
          break;
        case 'first_visit':
          if (!a.first_visit && !b.first_visit) comparison = 0;
          else if (!a.first_visit) comparison = 1;
          else if (!b.first_visit) comparison = -1;
          else comparison = new Date(a.first_visit).getTime() - new Date(b.first_visit).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-#946B29" />
    ) : (
      <ArrowDown className="w-4 h-4 text-#946B29" />
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Zojuist';
    if (diffMins < 60) return `${diffMins} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    return date.toLocaleDateString('nl-NL');
  };

  const getTotalStats = () => {
    const totalVisits = studentAccess.reduce((sum, s) => sum + s.total_visits, 0);
    const activeStudents = studentAccess.filter(s => s.total_visits > 0).length;
    const totalStudents = studentAccess.length;
    const qrTotal = studentAccess.reduce((sum, s) => sum + s.qr_visits, 0);
    const manualTotal = studentAccess.reduce((sum, s) => sum + s.manual_visits, 0);

    return {
      totalVisits,
      activeStudents,
      totalStudents,
      engagementRate: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0,
      qrTotal,
      manualTotal,
    };
  };

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => setSelectedStudent(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedStudent.student_name}</h1>
            <p className="text-gray-600 mt-1">
              {selectedStudent.student_number && `#${selectedStudent.student_number} • `}
              Toegangsgeschiedenis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Users className="w-6 h-6 text-#946B29" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Totaal bezoeken</p>
                <p className="text-2xl font-bold text-gray-900">{selectedStudent.total_visits}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <QrCode className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Via QR code</p>
                <p className="text-2xl font-bold text-gray-900">{selectedStudent.qr_visits}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-lg">
                <MousePointer className="w-6 h-6 text-#946B29" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Handmatig</p>
                <p className="text-2xl font-bold text-gray-900">{selectedStudent.manual_visits}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Laatste bezoek</p>
                <p className="text-sm font-bold text-gray-900">
                  {selectedStudent.last_visit ? formatRelativeTime(selectedStudent.last_visit) : 'Nooit'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bezoekgeschiedenis</h3>
          {selectedStudent.visit_history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Geen bezoeken geregistreerd</p>
          ) : (
            <div className="space-y-3">
              {selectedStudent.visit_history.map((visit, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {visit.access_method === 'qr' ? (
                      <div className="p-2 bg-green-100 rounded-lg">
                        <QrCode className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <MousePointer className="w-5 h-5 text-#946B29" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {visit.access_method === 'qr' ? 'QR Code Scan' : 'Handmatige toegang'}
                      </p>
                      <p className="text-sm text-gray-600">{formatDate(visit.accessed_at)}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{formatRelativeTime(visit.accessed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leerling Toegang Analytics</h1>
          <p className="text-gray-600 mt-1">Overzicht van WebWijzer pagina bezoeken</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Users className="w-6 h-6 text-#946B29" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Totaal bezoeken</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVisits}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Actieve leerlingen</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeStudents}/{stats.totalStudents}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-#946B29" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Betrokkenheid</p>
              <p className="text-2xl font-bold text-gray-900">{stats.engagementRate}%</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <QrCode className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">QR vs Handmatig</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.qrTotal}/{stats.manualTotal}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Zoek leerling..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={dateFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setDateFilter('all')}
              className="flex-1 sm:flex-none"
            >
              Alles
            </Button>
            <Button
              variant={dateFilter === 'today' ? 'primary' : 'secondary'}
              onClick={() => setDateFilter('today')}
              className="flex-1 sm:flex-none"
            >
              Vandaag
            </Button>
            <Button
              variant={dateFilter === 'week' ? 'primary' : 'secondary'}
              onClick={() => setDateFilter('week')}
              className="flex-1 sm:flex-none"
            >
              7 dagen
            </Button>
            <Button
              variant={dateFilter === 'month' ? 'primary' : 'secondary'}
              onClick={() => setDateFilter('month')}
              className="flex-1 sm:flex-none"
            >
              30 dagen
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-#946B29 mx-auto"></div>
            <p className="text-gray-600 mt-4">Gegevens laden...</p>
          </div>
        ) : filteredAccess.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen gegevens gevonden</h3>
            <p className="text-gray-600">
              {searchTerm || dateFilter !== 'all'
                ? 'Probeer andere filters'
                : 'Nog geen leerlingen hebben hun WebWijzer bezocht'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Leerling
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('total_visits')}
                  >
                    <div className="flex items-center gap-2">
                      Totaal bezoeken
                      <SortIcon field="total_visits" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR / Handmatig
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('last_visit')}
                  >
                    <div className="flex items-center gap-2">
                      Laatste bezoek
                      <SortIcon field="last_visit" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('first_visit')}
                  >
                    <div className="flex items-center gap-2">
                      Eerste bezoek
                      <SortIcon field="first_visit" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actie
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccess.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-#946B29" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                          {student.student_number && (
                            <div className="text-sm text-gray-500">#{student.student_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{student.total_visits}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <QrCode className="w-3 h-3 mr-1" />
                          {student.qr_visits}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-#5C4118">
                          <MousePointer className="w-3 h-3 mr-1" />
                          {student.manual_visits}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.last_visit ? formatRelativeTime(student.last_visit) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.first_visit ? formatRelativeTime(student.first_visit) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                        disabled={student.total_visits === 0}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
