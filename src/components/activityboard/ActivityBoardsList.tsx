import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ActivationModal } from './ActivationModal';
import { StopBoardModal } from './StopBoardModal';
import { ExtendTimeModal } from './ExtendTimeModal';
import { Plus, Grid2x2 as Grid, CreditCard as Edit, Trash2, BarChart3, Eye, Users, Archive, ArchiveRestore, Play, Square, Clock, AlertTriangle } from 'lucide-react';

interface ActivityBoard {
  id: string;
  name: string;
  description: string | null;
  school_id: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  active_until: string | null;
  activated_at: string | null;
  activated_by: string | null;
  icon_url: string | null;
  board_icon: string | null;
  student_group_ids: string[];
  student_ids: string[];
  archived_at?: string;
}

interface UserSchool {
  id: string;
  name: string;
}

interface ActivityBoardsListProps {
  schoolId: string;
  schoolName: string;
  schools: UserSchool[];
  boards: ActivityBoard[];
  onSchoolChange: (schoolId: string) => void;
  onCreateBoard: () => void;
  onViewBoard: (board: ActivityBoard) => void;
  onEditBoard: (board: ActivityBoard) => void;
  onViewAnalytics: () => void;
  onBoardsChanged: (includeArchived?: boolean) => void;
}

export function ActivityBoardsList({
  schoolId,
  schoolName,
  schools,
  boards,
  onSchoolChange,
  onCreateBoard,
  onViewBoard,
  onEditBoard,
  onViewAnalytics,
  onBoardsChanged
}: ActivityBoardsListProps) {
  const [archiveConfirm, setArchiveConfirm] = useState<ActivityBoard | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ActivityBoard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [activationBoard, setActivationBoard] = useState<ActivityBoard | null>(null);
  const [stopBoard, setStopBoard] = useState<ActivityBoard | null>(null);
  const [extendBoard, setExtendBoard] = useState<ActivityBoard | null>(null);
  const [boardDetails, setBoardDetails] = useState<Record<string, { studentCount: number; groupNames: string[]; activeOptionsCount: number }>>({});
  const [remainingTimes, setRemainingTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchActiveCounts();
    fetchBoardDetails();
  }, [boards]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newRemainingTimes: Record<string, number> = {};
      boards.forEach(board => {
        if (board.is_active && board.active_until) {
          const remaining = new Date(board.active_until).getTime() - Date.now();
          newRemainingTimes[board.id] = Math.max(0, remaining);
        }
      });
      setRemainingTimes(newRemainingTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [boards]);

  const fetchActiveCounts = async () => {
    const counts: Record<string, number> = {};

    for (const board of boards) {
      try {
        const { count, error } = await supabase
          .from('activity_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', board.id)
          .is('end_time', null);

        if (!error && count !== null) {
          counts[board.id] = count;
        }
      } catch (error) {
        console.error('Error fetching active count:', error);
      }
    }

    setActiveCounts(counts);
  };

  const fetchBoardDetails = async () => {
    const details: Record<string, { studentCount: number; groupNames: string[]; activeOptionsCount: number }> = {};

    for (const board of boards) {
      try {
        const studentIds = new Set<string>();

        if (board.student_group_ids && board.student_group_ids.length > 0) {
          const { data: groupStudents, error: groupError } = await supabase
            .from('student_groups')
            .select('student_id')
            .in('group_id', board.student_group_ids)
            .eq('is_active', true);

          if (!groupError && groupStudents) {
            groupStudents.forEach(s => studentIds.add(s.student_id));
          }
        }

        if (board.student_ids && board.student_ids.length > 0) {
          board.student_ids.forEach(id => studentIds.add(id));
        }

        const { data: groups, error: groupNamesError } = await supabase
          .from('groups')
          .select('name')
          .in('id', board.student_group_ids || []);

        const { count: optionsCount, error: optionsError } = await supabase
          .from('activity_options')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', board.id)
          .eq('is_active', true);

        details[board.id] = {
          studentCount: studentIds.size,
          groupNames: !groupNamesError && groups ? groups.map(g => g.name) : [],
          activeOptionsCount: !optionsError && optionsCount !== null ? optionsCount : 0
        };
      } catch (error) {
        console.error('Error fetching board details:', error);
        details[board.id] = { studentCount: 0, groupNames: [], activeOptionsCount: 0 };
      }
    }

    setBoardDetails(details);
  };

  const handleActivateBoard = async (board: ActivityBoard, durationMinutes: number) => {
    try {
      const activatedAt = new Date();
      const activeUntil = new Date(activatedAt.getTime() + durationMinutes * 60000);

      const { error } = await supabase
        .from('activity_boards')
        .update({
          is_active: true,
          activated_at: activatedAt.toISOString(),
          active_until: activeUntil.toISOString(),
          activated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', board.id);

      if (error) throw error;

      setActivationBoard(null);
      onBoardsChanged();
    } catch (error) {
      console.error('Error activating board:', error);
      throw error;
    }
  };

  const handleStopBoard = async (board: ActivityBoard) => {
    try {
      await supabase
        .from('activity_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('board_id', board.id)
        .is('end_time', null);

      const { error } = await supabase
        .from('activity_boards')
        .update({
          is_active: false,
          active_until: null,
          activated_at: null
        })
        .eq('id', board.id);

      if (error) throw error;

      setStopBoard(null);
      onBoardsChanged();
    } catch (error) {
      console.error('Error stopping board:', error);
      throw error;
    }
  };

  const handleExtendBoard = async (board: ActivityBoard, additionalMinutes: number) => {
    try {
      if (!board.active_until) return;

      const currentEnd = new Date(board.active_until);
      const newEnd = new Date(currentEnd.getTime() + additionalMinutes * 60000);

      const { error } = await supabase
        .from('activity_boards')
        .update({ active_until: newEnd.toISOString() })
        .eq('id', board.id);

      if (error) throw error;

      setExtendBoard(null);
      onBoardsChanged();
    } catch (error) {
      console.error('Error extending board:', error);
      throw error;
    }
  };

  const formatRemainingTime = (ms: number): string => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}u ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleArchiveBoard = async () => {
    if (!archiveConfirm) return;

    setArchiving(true);
    try {
      const { error } = await supabase
        .from('activity_boards')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', archiveConfirm.id);

      if (error) throw error;

      onBoardsChanged();
      setArchiveConfirm(null);
    } catch (error) {
      console.error('Error archiving board:', error);
      alert('Fout bij archiveren van bord. Probeer het opnieuw.');
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchiveBoard = async (boardId: string) => {
    try {
      const { error } = await supabase
        .from('activity_boards')
        .update({ archived_at: null })
        .eq('id', boardId);

      if (error) throw error;

      onBoardsChanged();
    } catch (error) {
      console.error('Error unarchiving board:', error);
      alert('Fout bij herstellen van bord. Probeer het opnieuw.');
    }
  };

  const handleDeleteBoard = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      // Permanently delete the board (CASCADE will handle related data)
      const { error } = await supabase
        .from('activity_boards')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      onBoardsChanged();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Fout bij verwijderen van bord. Probeer het opnieuw.');
    } finally {
      setDeleting(false);
    }
  };

  const archivedBoards = boards.filter(b => b.archived_at);
  const activeBoards = boards.filter(b => b.is_active && !b.archived_at);
  const inactiveBoards = boards.filter(b => !b.is_active && !b.archived_at);

  const displayBoards = showArchived ? archivedBoards : [...activeBoards, ...inactiveBoards];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activi-Tijd</h1>
            <p className="text-gray-600">{schoolName}</p>
          </div>
          {schools.length > 1 && (
            <select
              value={schoolId}
              onChange={(e) => onSchoolChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex space-x-3">
          <Button
            variant={showArchived ? "primary" : "secondary"}
            onClick={() => {
              const newShowArchived = !showArchived;
              setShowArchived(newShowArchived);
              onBoardsChanged(newShowArchived);
            }}
          >
            {showArchived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
            {showArchived ? 'Toon Actieve' : 'Toon Archief'}
          </Button>
          <Button variant="secondary" onClick={onViewAnalytics}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analyses
          </Button>
          <Button onClick={onCreateBoard}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuw Bord
          </Button>
        </div>
      </div>

      {!showArchived && activeBoards.length === 0 && inactiveBoards.length === 0 ? (
        <Card className="text-center py-12">
          <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen activiteitenborden</h3>
          <p className="text-gray-600 mb-6">
            Maak je eerste activiteitenbord aan om te beginnen met het volgen van activiteiten.
          </p>
          <Button onClick={onCreateBoard}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuw Bord Maken
          </Button>
        </Card>
      ) : showArchived && archivedBoards.length === 0 ? (
        <Card className="text-center py-12">
          <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen gearchiveerde borden</h3>
          <p className="text-gray-600">
            Gearchiveerde borden verschijnen hier.
          </p>
        </Card>
      ) : showArchived ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gearchiveerde Borden</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archivedBoards.map((board) => (
              <Card key={board.id} className="opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center relative">
                        {board.icon_url ? (
                          <img
                            src={board.icon_url}
                            alt={board.name}
                            className="w-full h-full object-cover rounded-lg opacity-50"
                          />
                        ) : (
                          <Grid className="w-6 h-6 text-gray-600" />
                        )}
                        <div className="absolute bottom-0 right-0 bg-gray-200 rounded-tl-lg rounded-br-lg p-1">
                          <Archive className="w-3 h-3 text-gray-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{board.name}</h3>
                        <span className="text-xs text-gray-500">Gearchiveerd</span>
                      </div>
                    </div>
                  </div>

                  {board.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {board.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleUnarchiveBoard(board.id)}
                      className="flex-1"
                    >
                      <ArchiveRestore className="w-4 h-4 mr-1" />
                      Herstellen
                    </Button>
                    <button
                      onClick={() => onViewBoard(board)}
                      className="p-2 text-gray-600 hover:text-#946B29 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Bekijken"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(board)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Permanent verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {activeBoards.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actieve Borden</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeBoards.map((board) => {
                  const remaining = remainingTimes[board.id] || 0;
                  const isExpiringSoon = remaining > 0 && remaining < 600000;
                  const details = boardDetails[board.id] || { studentCount: 0, groupNames: [], activeOptionsCount: 0 };

                  return (
                    <Card key={board.id} className={`hover:shadow-md transition-shadow ${isExpiringSoon ? 'border-2 border-yellow-400' : ''}`}>
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center relative">
                              {board.icon_url ? (
                                <img
                                  src={board.icon_url}
                                  alt={board.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Grid className="w-6 h-6 text-green-600" />
                              )}
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{board.name}</h3>
                              {board.active_until && (
                                <div className={`flex items-center space-x-1 text-sm mt-1 ${isExpiringSoon ? 'text-yellow-600 font-semibold' : 'text-gray-600'}`}>
                                  <Clock className="w-3 h-3" />
                                  <span>{formatRemainingTime(remaining)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {activeCounts[board.id] > 0 && (
                                  <div className="flex items-center space-x-1 text-sm text-#946B29 font-medium">
                                    <Users className="w-3 h-3" />
                                    <span>{activeCounts[board.id]} actief</span>
                                  </div>
                                )}
                                {details.studentCount > 0 && (
                                  <span className="text-xs text-gray-500">
                                    ({details.studentCount} toegewezen)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {board.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {board.description}
                          </p>
                        )}

                        <div className="mt-auto space-y-2">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => setStopBoard(board)}
                              className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                              <Square className="w-4 h-4 mr-1" />
                              Stop Les
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setExtendBoard(board)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="secondary"
                              onClick={() => onViewBoard(board)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Openen
                            </Button>
                            <button
                              onClick={() => onEditBoard(board)}
                              className="p-2 text-gray-600 hover:text-#946B29 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {inactiveBoards.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Beschikbare Borden</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveBoards.map((board) => {
                  const details = boardDetails[board.id] || { studentCount: 0, groupNames: [], activeOptionsCount: 0 };
                  const hasWarnings = details.studentCount === 0 || details.activeOptionsCount === 0;

                  return (
                    <Card key={board.id} className="hover:shadow-md transition-shadow">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {board.icon_url ? (
                                <img
                                  src={board.icon_url}
                                  alt={board.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Grid className="w-6 h-6 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900">{board.name}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-gray-500" />
                                  <span className={`text-sm ${details.studentCount === 0 ? 'text-yellow-600 font-medium' : 'text-gray-700'}`}>
                                    {details.studentCount} leerling{details.studentCount !== 1 ? 'en' : ''}
                                  </span>
                                </div>
                                {details.activeOptionsCount > 0 && (
                                  <span className="text-xs text-gray-500">
                                    • {details.activeOptionsCount} activiteit{details.activeOptionsCount !== 1 ? 'en' : ''}
                                  </span>
                                )}
                                {hasWarnings && (
                                  <AlertTriangle className="w-3 h-3 text-yellow-500" title={details.studentCount === 0 ? 'Geen leerlingen toegewezen' : 'Geen actieve activiteiten'} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {board.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {board.description}
                          </p>
                        )}

                        <div className="mt-auto space-y-2">
                          <Button
                            onClick={() => setActivationBoard(board)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Gebruik in Les
                          </Button>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="secondary"
                              onClick={() => onEditBoard(board)}
                              className="flex-1"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Bewerken
                            </Button>
                            <button
                              onClick={() => setArchiveConfirm(board)}
                              className="p-2 text-gray-600 hover:text-orange-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Archiveren"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(board)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {archiveConfirm && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setArchiveConfirm(null)}
          onConfirm={handleArchiveBoard}
          title="Bord archiveren"
          message={`Weet je zeker dat je "${archiveConfirm.name}" wilt archiveren? Het bord verdwijnt uit de lijst maar alle gegevens blijven bewaard. Je kunt het later herstellen.`}
          confirmText="Archiveren"
          cancelText="Annuleren"
          isLoading={archiving}
        />
      )}

      {deleteConfirm && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteBoard}
          title="Bord permanent verwijderen"
          message={`Weet je zeker dat je "${deleteConfirm.name}" permanent wilt verwijderen? Alle activiteiten en sessiegegevens worden definitief verwijderd en kunnen niet worden hersteld.`}
          confirmText="Permanent Verwijderen"
          cancelText="Annuleren"
          isLoading={deleting}
        />
      )}

      {activationBoard && (
        <ActivationModal
          board={activationBoard}
          onClose={() => setActivationBoard(null)}
          onActivate={(duration) => handleActivateBoard(activationBoard, duration)}
          studentCount={boardDetails[activationBoard.id]?.studentCount || 0}
          groupNames={boardDetails[activationBoard.id]?.groupNames || []}
          activeOptionsCount={boardDetails[activationBoard.id]?.activeOptionsCount || 0}
        />
      )}

      {stopBoard && (
        <StopBoardModal
          boardName={stopBoard.name}
          activeStudentCount={activeCounts[stopBoard.id] || 0}
          onClose={() => setStopBoard(null)}
          onConfirm={() => handleStopBoard(stopBoard)}
        />
      )}

      {extendBoard && extendBoard.active_until && (
        <ExtendTimeModal
          boardName={extendBoard.name}
          currentEndTime={extendBoard.active_until}
          onClose={() => setExtendBoard(null)}
          onExtend={(duration) => handleExtendBoard(extendBoard, duration)}
        />
      )}
    </div>
  );
}
