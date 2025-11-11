import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ActivityBoardsList } from './ActivityBoardsList';
import { ActivityBoardView } from './ActivityBoardView';
import { ActivityBoardSettings } from './ActivityBoardSettings';
import { ActivityAnalytics } from './ActivityAnalytics';
import { Grid, School, Loader } from 'lucide-react';

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

interface ActivityBoardsTabProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function ActivityBoardsTab({ onFullscreenChange }: ActivityBoardsTabProps) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'list' | 'board' | 'settings' | 'analytics'>('list');
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [boards, setBoards] = useState<ActivityBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<ActivityBoard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserSchools();
  }, [user]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchBoards();
    }
  }, [selectedSchoolId]);

  const fetchUserSchools = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          schools (id, name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('is_active', true);

      if (error) throw error;

      const schools = data?.map(us => us.schools).filter(Boolean) || [];
      setUserSchools(schools);

      if (schools.length === 1 && !selectedSchoolId) {
        setSelectedSchoolId(schools[0].id);
      } else if (schools.length > 1 && !selectedSchoolId) {
        setSelectedSchoolId(schools[0].id);
      }
    } catch (error) {
      console.error('Error fetching user schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async () => {
    if (!selectedSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('activity_boards')
        .select('*')
        .eq('school_id', selectedSchoolId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const handleBoardCreated = () => {
    fetchBoards();
    setActiveView('list');
  };

  const handleBoardUpdated = () => {
    fetchBoards();
    setSelectedBoard(null);
    setActiveView('list');
  };

  const handleViewBoard = (board: ActivityBoard) => {
    setSelectedBoard(board);
    setActiveView('board');
  };

  const handleEditBoard = (board: ActivityBoard) => {
    setSelectedBoard(board);
    setActiveView('settings');
  };

  const handleCreateBoard = () => {
    setSelectedBoard(null);
    setActiveView('settings');
  };

  const selectedSchool = userSchools.find(school => school.id === selectedSchoolId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!selectedSchoolId || !selectedSchool) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Activi-Tijd</h1>
          <p className="text-gray-600">Selecteer een school om activiteitenborden te beheren</p>
        </div>

        {userSchools.length === 0 ? (
          <Card className="text-center py-12">
            <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen scholen gevonden</h3>
            <p className="text-gray-600">
              Je bent nog niet verbonden met een school. Ga naar de scholen tab om een school toe te voegen.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {userSchools.map((school) => (
              <Card key={school.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <School className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
                      <p className="text-sm text-gray-500">Beheer activiteitenborden</p>
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setSelectedSchoolId(school.id)}>
                    Selecteren
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeView === 'settings') {
    return (
      <ActivityBoardSettings
        schoolId={selectedSchoolId}
        board={selectedBoard}
        onBack={() => setActiveView('list')}
        onBoardCreated={handleBoardCreated}
        onBoardUpdated={handleBoardUpdated}
      />
    );
  }

  if (activeView === 'board' && selectedBoard) {
    return (
      <ActivityBoardView
        board={selectedBoard}
        onBack={() => setActiveView('list')}
        onEdit={() => handleEditBoard(selectedBoard)}
        onFullscreenChange={onFullscreenChange}
      />
    );
  }

  if (activeView === 'analytics') {
    return (
      <ActivityAnalytics
        schoolId={selectedSchoolId}
        boards={boards}
        onBack={() => setActiveView('list')}
      />
    );
  }

  return (
    <ActivityBoardsList
      schoolId={selectedSchoolId}
      schoolName={selectedSchool.name}
      schools={userSchools}
      boards={boards}
      onSchoolChange={setSelectedSchoolId}
      onCreateBoard={handleCreateBoard}
      onViewBoard={handleViewBoard}
      onEditBoard={handleEditBoard}
      onViewAnalytics={() => setActiveView('analytics')}
      onBoardsChanged={fetchBoards}
    />
  );
}
