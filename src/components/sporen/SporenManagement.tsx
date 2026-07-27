import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { SpoorForm } from './SpoorForm';
import { GitBranch, CreditCard as Edit2, Trash2, Plus, GripVertical, Eye, EyeOff } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Spoor {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  linked_subjects: string[];
}

interface Subject {
  id: string;
  name: string;
}

interface SporenManagementProps {
  schoolId: string;
  subjects: Subject[];
}

interface SortableSpoorItemProps {
  spoor: Spoor;
  subjects: Subject[];
  onEdit: (spoor: Spoor) => void;
  onDelete: (spoorId: string) => void;
  onToggleActive: (spoorId: string, isActive: boolean) => void;
}

function SortableSpoorItem({ spoor, subjects, onEdit, onDelete, onToggleActive }: SortableSpoorItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: spoor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const linkedSubjectNames = spoor.linked_subjects
    .map(subjectId => subjects.find(s => s.id === subjectId)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 ${spoor.is_active ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}
    >
      <div className="flex items-center space-x-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>

        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: spoor.color + '20' }}
        >
          <GitBranch className="w-6 h-6" style={{ color: spoor.color }} />
        </div>

        <div className="flex-1">
          <h3 className={`font-medium ${spoor.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
            {spoor.name}
          </h3>
          {linkedSubjectNames && (
            <p className="text-sm text-gray-500 mt-1">
              Vakken: {linkedSubjectNames}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => onToggleActive(spoor.id, !spoor.is_active)}
            title={spoor.is_active ? 'Deactiveren' : 'Activeren'}
          >
            {spoor.is_active ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onEdit(spoor)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            onClick={() => onDelete(spoor.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SporenManagement({ schoolId, subjects }: SporenManagementProps) {
  const [sporen, setSporen] = useState<Spoor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpoor, setEditingSpoor] = useState<Spoor | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (schoolId) {
      fetchSporen();
    }
  }, [schoolId]);

  const fetchSporen = async () => {
    try {
      setLoading(true);
      const { data: sporenData, error: sporenError } = await supabase
        .from('sporen')
        .select('*')
        .eq('school_id', schoolId)
        .order('sort_order');

      if (sporenError) throw sporenError;

      const { data: linksData, error: linksError } = await supabase
        .from('spoor_subject_links')
        .select('spoor_id, school_subject_id')
        .in('spoor_id', sporenData?.map(s => s.id) || []);

      if (linksError) throw linksError;

      const sporenWithLinks = sporenData?.map(spoor => ({
        ...spoor,
        linked_subjects: linksData?.filter(link => link.spoor_id === spoor.id).map(link => link.school_subject_id) || []
      })) || [];

      setSporen(sporenWithLinks);
    } catch (error) {
      console.error('Error fetching sporen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sporen.findIndex((s) => s.id === active.id);
      const newIndex = sporen.findIndex((s) => s.id === over.id);

      const newSporen = arrayMove(sporen, oldIndex, newIndex);
      setSporen(newSporen);

      try {
        const updates = newSporen.map((spoor, index) => ({
          id: spoor.id,
          sort_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('sporen')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error('Error updating sort order:', error);
        fetchSporen();
      }
    }
  };

  const handleDelete = async (spoorId: string) => {
    if (!confirm('Weet je zeker dat je dit spoor wilt verwijderen? Alle toewijzingen worden ook verwijderd.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sporen')
        .delete()
        .eq('id', spoorId);

      if (error) throw error;
      fetchSporen();
    } catch (error) {
      console.error('Error deleting spoor:', error);
      alert('Er is een fout opgetreden bij het verwijderen van het spoor.');
    }
  };

  const handleToggleActive = async (spoorId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('sporen')
        .update({ is_active: isActive })
        .eq('id', spoorId);

      if (error) throw error;
      fetchSporen();
    } catch (error) {
      console.error('Error toggling spoor active state:', error);
      alert('Er is een fout opgetreden bij het bijwerken van het spoor.');
    }
  };

  const handleEdit = (spoor: Spoor) => {
    setEditingSpoor(spoor);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSpoor(null);
    fetchSporen();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-#946B29 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Beheer Sporen</h2>
          <p className="text-sm text-gray-600 mt-1">
            Organiseer en beheer de sporen voor deze school
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Spoor
        </Button>
      </div>

      {sporen.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen sporen gevonden</h3>
          <p className="text-gray-600 mb-6">
            Maak je eerste spoor aan om te beginnen met het organiseren van leerlingen.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuw Spoor
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sporen.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sporen.map((spoor) => (
                <SortableSpoorItem
                  key={spoor.id}
                  spoor={spoor}
                  subjects={subjects}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showForm && (
        <SpoorForm
          schoolId={schoolId}
          subjects={subjects}
          editingSpoor={editingSpoor}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
