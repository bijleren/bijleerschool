import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Clock, Grid2x2 as Grid, AlertCircle } from 'lucide-react';

interface ActiveBoard {
  id: string;
  name: string;
  description: string | null;
  active_until: string;
  board_icon: string | null;
  icon_url: string | null;
}

interface BoardSelectionModalProps {
  boards: ActiveBoard[];
  onSelectBoard: (boardId: string) => void;
  onClose: () => void;
}

export function BoardSelectionModal({
  boards,
  onSelectBoard,
  onClose
}: BoardSelectionModalProps) {
  const [remainingTimes, setRemainingTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newRemainingTimes: Record<string, number> = {};
      boards.forEach(board => {
        const remaining = new Date(board.active_until).getTime() - Date.now();
        newRemainingTimes[board.id] = Math.max(0, remaining);
      });
      setRemainingTimes(newRemainingTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [boards]);

  const formatRemainingTime = (ms: number): string => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}u ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const availableBoards = boards.filter(
    board => remainingTimes[board.id] > 300000
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Kies een Activiteitenbord</h2>
            <p className="text-gray-600 mt-1">Selecteer het bord waar je aan wilt werken</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {availableBoards.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Geen actieve borden beschikbaar
              </h3>
              <p className="text-gray-600">
                Er zijn momenteel geen activiteitenborden beschikbaar voor jou.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableBoards.map((board) => {
                const remaining = remainingTimes[board.id] || 0;
                const isExpiringSoon = remaining > 0 && remaining < 600000;

                return (
                  <Card
                    key={board.id}
                    className={`hover:shadow-lg transition-all cursor-pointer ${
                      isExpiringSoon ? 'border-2 border-yellow-400' : ''
                    }`}
                    onClick={() => onSelectBoard(board.id)}
                  >
                    <div className="flex flex-col h-full p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {board.icon_url ? (
                            <img
                              src={board.icon_url}
                              alt={board.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Grid className="w-6 h-6 text-#946B29" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">
                            {board.name}
                          </h3>
                          <div
                            className={`flex items-center gap-1 text-sm mt-1 ${
                              isExpiringSoon ? 'text-yellow-600 font-semibold' : 'text-gray-600'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{formatRemainingTime(remaining)} resterend</span>
                          </div>
                        </div>
                      </div>

                      {board.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {board.description}
                        </p>
                      )}

                      <Button className="w-full mt-auto">
                        Open Bord
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
