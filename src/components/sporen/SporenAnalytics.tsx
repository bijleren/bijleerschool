import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, LayoutGrid, TrendingUp, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { SporenLog } from './SporenLog';
import { SporenOverview } from './SporenOverview';
import { SporenTimeline } from './SporenTimeline';
import { StudentSporenAnalytics } from './StudentSporenAnalytics';

type AnalyticsView = 'log' | 'overview' | 'timeline' | 'student';

interface Spoor {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface Group {
  id: string;
  name: string;
  grade_level: string | null;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface SporenAnalyticsProps {
  schoolId: string;
  groups: Group[];
  subjects: Subject[];
  initialGroupId?: string;
  initialSubjectId?: string;
  onNavigateBack: () => void;
}

export function SporenAnalytics({
  schoolId,
  groups,
  subjects,
  initialGroupId = '',
  initialSubjectId = '',
  onNavigateBack,
}: SporenAnalyticsProps) {
  const [view, setView] = useState<AnalyticsView>('overview');
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [sporen, setSporen] = useState<Spoor[]>([]);
  const [loadingSporen, setLoadingSporen] = useState(false);

  useEffect(() => {
    if (selectedSubjectId && schoolId) {
      loadSporen();
    } else {
      setSporen([]);
    }
  }, [selectedSubjectId, schoolId]);

  const loadSporen = async () => {
    setLoadingSporen(true);
    try {
      const { data, error } = await supabase
        .from('sporen')
        .select(`
          id, name, color, sort_order,
          spoor_subject_links!inner(school_subject_id)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .eq('spoor_subject_links.school_subject_id', selectedSubjectId)
        .order('sort_order');

      if (error) throw error;
      setSporen(data || []);
    } catch (err) {
      console.error('Error loading sporen:', err);
    } finally {
      setLoadingSporen(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const groupName = selectedGroup
    ? `${selectedGroup.name}${selectedGroup.grade_level ? ` (${selectedGroup.grade_level})` : ''}`
    : '';
  const subjectName = selectedSubject?.name || '';

  const tabs: { key: AnalyticsView; label: string; icon: React.ReactNode; description: string; requiresClassSubject: boolean }[] = [
    {
      key: 'overview',
      label: 'Overzicht',
      icon: <LayoutGrid className="w-4 h-4" />,
      description: 'Huidige indeling per spoor, exporteerbaar',
      requiresClassSubject: true,
    },
    {
      key: 'log',
      label: 'Wijzigingslog',
      icon: <Clock className="w-4 h-4" />,
      description: 'Alle spoorwijzigingen in chronologische volgorde',
      requiresClassSubject: true,
    },
    {
      key: 'timeline',
      label: 'Tijdlijn',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Per leerling hoe lang in elk spoor',
      requiresClassSubject: true,
    },
    {
      key: 'student',
      label: 'Per leerling',
      icon: <User className="w-4 h-4" />,
      description: 'Alle spoor-sessies van een specifieke leerling over alle vakken',
      requiresClassSubject: false,
    },
  ];

  const canShowData = selectedGroupId && selectedSubjectId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onNavigateBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Terug
        </Button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sporen Analyse</h2>
          {groupName && subjectName && (
            <p className="text-sm text-gray-500">{groupName} &mdash; {subjectName}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 px-1 pt-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                view === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-5">
          <div className="text-xs text-gray-400">
            {tabs.find((t) => t.key === view)?.description}
          </div>

          {view === 'student' ? (
            <StudentSporenAnalytics schoolId={schoolId} groups={groups} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Klas</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecteer een klas</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}{g.grade_level ? ` (${g.grade_level})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Vak</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecteer een vak</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {canShowData ? (
                <>
                  {loadingSporen ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : view === 'overview' ? (
                    <SporenOverview
                      key={`${selectedGroupId}-${selectedSubjectId}`}
                      schoolId={schoolId}
                      groupId={selectedGroupId}
                      subjectId={selectedSubjectId}
                      groupName={groupName}
                      subjectName={subjectName}
                      sporen={sporen}
                    />
                  ) : view === 'log' ? (
                    <SporenLog
                      key={`${selectedGroupId}-${selectedSubjectId}`}
                      schoolId={schoolId}
                      groupId={selectedGroupId}
                      subjectId={selectedSubjectId}
                      groupName={groupName}
                      subjectName={subjectName}
                      sporen={sporen}
                    />
                  ) : (
                    <SporenTimeline
                      key={`${selectedGroupId}-${selectedSubjectId}`}
                      schoolId={schoolId}
                      groupId={selectedGroupId}
                      subjectId={selectedSubjectId}
                      groupName={groupName}
                      subjectName={subjectName}
                      sporen={sporen}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Selecteer een klas en vak om de analyse te zien</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
