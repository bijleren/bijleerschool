import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Plus, Grid, Edit, Trash2, BarChart3, Eye, Users, Archive, ArchiveRestore } from 'lucide-react';

interface ActivityBoard {
  id: string;
  name: string;
  description: string | null;
  school_id: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
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

  React.useEffect(() => {
    fetchActiveCounts();
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Archive className="w-5 h-5 text-gray-600" />
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
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
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
                {activeBoards.map((board) => (
                  <Card key={board.id} className="hover:shadow-md transition-shadow">
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Grid className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{board.name}</h3>
                            {activeCounts[board.id] > 0 && (
                              <div className="flex items-center space-x-1 text-sm text-green-600 mt-1">
                                <Users className="w-3 h-3" />
                                <span>{activeCounts[board.id]} actief</span>
                              </div>
                            )}
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
                          onClick={() => onViewBoard(board)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Openen
                        </Button>
                        <button
                          onClick={() => onEditBoard(board)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
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
          )}

          {inactiveBoards.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Inactieve Borden</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveBoards.map((board) => (
                  <Card key={board.id} className="opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Grid className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{board.name}</h3>
                            <span className="text-xs text-gray-500">Inactief</span>
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
                          onClick={() => onEditBoard(board)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Bewerken
                        </Button>
                        <button
                          onClick={() => setDeleteConfirm(board)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
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
    </div>
  );
}
