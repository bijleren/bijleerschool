import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';

interface AgeGroup {
  id: string;
  name: string;
  description: string | null;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

interface Material {
  id: string;
  name: string;
  description: string | null;
}

interface TechniqueCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
}

interface TeachingTechniqueFormProps {
  onTechniqueCreated: () => void;
  onCancel: () => void;
  ageGroups: AgeGroup[];
  subjects: Subject[];
  materials: Material[];
  techniqueCategories: TechniqueCategory[];
  editingTechnique?: TeachingTechnique | null;
  onTechniqueUpdated?: () => void;
}

interface TeachingTechnique {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  photo_url: string | null;
  student_video_url: string | null;
  teacher_video_url: string | null;
  external_links: any;
  teaching_technique_age_groups: { age_groups: { id: string } }[];
  teaching_technique_subjects: { subjects: { id: string } }[];
  teaching_technique_materials: { materials: { id: string } }[];
  teaching_technique_categories: { technique_categories: { id: string } }[];
}

interface ExternalLink {
  title: string;
  url: string;
}

export function TeachingTechniqueForm({
  onTechniqueCreated,
  onCancel,
  ageGroups,
  subjects,
  materials,
  techniqueCategories,
  editingTechnique = null,
  onTechniqueUpdated
}: TeachingTechniqueFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [title, setTitle] = useState(editingTechnique?.title || '');
  const [subtitle, setSubtitle] = useState(editingTechnique?.subtitle || '');
  const [description, setDescription] = useState(editingTechnique?.description || '');
  const [photoUrl, setPhotoUrl] = useState(editingTechnique?.photo_url || '');
  const [studentVideoUrl, setStudentVideoUrl] = useState(editingTechnique?.student_video_url || '');
  const [teacherVideoUrl, setTeacherVideoUrl] = useState(editingTechnique?.teacher_video_url || '');
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>(
    editingTechnique?.teaching_technique_age_groups?.map(tag => tag.age_groups.id) || []
  );
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    editingTechnique?.teaching_technique_subjects?.map(ts => ts.subjects.id) || []
  );
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(
    editingTechnique?.teaching_technique_materials?.map(tm => tm.materials.id) || []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    editingTechnique?.teaching_technique_categories?.map(tc => tc.technique_categories.id) || []
  );
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>(
    editingTechnique?.external_links || []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      let technique;
      
      if (editingTechnique) {
        // Update existing technique
        const { data, error: techniqueError } = await supabase
          .from('teaching_techniques')
          .update({
            title,
            subtitle: subtitle || null,
            description,
            photo_url: photoUrl || null,
            student_video_url: studentVideoUrl || null,
            teacher_video_url: teacherVideoUrl || null,
            external_links: externalLinks.length > 0 ? externalLinks : null,
          })
          .eq('id', editingTechnique.id)
          .select()
          .single();

        if (techniqueError) throw techniqueError;
        technique = data;

        // Delete existing associations
        await Promise.all([
          supabase.from('teaching_technique_age_groups').delete().eq('technique_id', editingTechnique.id),
          supabase.from('teaching_technique_subjects').delete().eq('technique_id', editingTechnique.id),
          supabase.from('teaching_technique_materials').delete().eq('technique_id', editingTechnique.id),
          supabase.from('teaching_technique_categories').delete().eq('technique_id', editingTechnique.id)
        ]);
      } else {
        // Create new technique
        const { data, error: techniqueError } = await supabase
          .from('teaching_techniques')
          .insert({
            title,
            subtitle: subtitle || null,
            description,
            photo_url: photoUrl || null,
            student_video_url: studentVideoUrl || null,
            teacher_video_url: teacherVideoUrl || null,
            external_links: externalLinks.length > 0 ? externalLinks : null,
            created_by: user.id,
          })
          .select()
          .single();

        if (techniqueError) throw techniqueError;
        technique = data;
      }

      // Add age group associations
      if (selectedAgeGroups.length > 0) {
        const ageGroupInserts = selectedAgeGroups.map(ageGroupId => ({
          technique_id: technique.id,
          age_group_id: ageGroupId,
        }));

        const { error: ageGroupError } = await supabase
          .from('teaching_technique_age_groups')
          .insert(ageGroupInserts);

        if (ageGroupError) throw ageGroupError;
      }

      // Add subject associations
      if (selectedSubjects.length > 0) {
        const subjectInserts = selectedSubjects.map(subjectId => ({
          technique_id: technique.id,
          subject_id: subjectId,
        }));

        const { error: subjectError } = await supabase
          .from('teaching_technique_subjects')
          .insert(subjectInserts);

        if (subjectError) throw subjectError;
      }

      // Add material associations
      if (selectedMaterials.length > 0) {
        const materialInserts = selectedMaterials.map(materialId => ({
          technique_id: technique.id,
          material_id: materialId,
        }));

        const { error: materialError } = await supabase
          .from('teaching_technique_materials')
          .insert(materialInserts);

        if (materialError) throw materialError;
      }

      // Add category associations
      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map(categoryId => ({
          technique_id: technique.id,
          category_id: categoryId,
        }));

        const { error: categoryError } = await supabase
          .from('teaching_technique_categories')
          .insert(categoryInserts);

        if (categoryError) throw categoryError;
      }

      setMessage(editingTechnique ? 'Techniek succesvol bijgewerkt!' : 'Techniek succesvol toegevoegd!');
      
      if (editingTechnique && onTechniqueUpdated) {
        onTechniqueUpdated();
      } else {
        onTechniqueCreated();
      }
    } catch (error) {
      console.error('Error creating technique:', error);
      setMessage(editingTechnique 
        ? 'Er is een fout opgetreden bij het bijwerken van de techniek.'
        : 'Er is een fout opgetreden bij het toevoegen van de techniek.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAgeGroupToggle = (ageGroupId: string) => {
    setSelectedAgeGroups(prev =>
      prev.includes(ageGroupId)
        ? prev.filter(id => id !== ageGroupId)
        : [...prev, ageGroupId]
    );
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const addExternalLink = () => {
    setExternalLinks([...externalLinks, { title: '', url: '' }]);
  };

  const removeExternalLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const updateExternalLink = (index: number, field: 'title' | 'url', value: string) => {
    const updated = [...externalLinks];
    updated[index][field] = value;
    setExternalLinks(updated);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar technieken
        </Button>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingTechnique ? 'Didactische Techniek Bewerken' : 'Nieuwe Didactische Techniek'}
          </h1>
          <p className="text-gray-600">
            {editingTechnique ? 'Bewerk de lesmethode' : 'Voeg een nieuwe lesmethode toe'}
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('succesvol')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basis Informatie</h3>
            
            <Input
              label="Titel *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Naam van de techniek"
            />

            <Input
              label="Ondertitel"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Korte beschrijving of tagline"
            />

            <Input
              label="Foto URL"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              helperText="URL naar een afbeelding voor deze techniek"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Uitgebreide beschrijving van de techniek..."
              />
            </div>
          </div>

          {/* Video URLs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Video's</h3>
            
            <Input
              label="Docent Video URL"
              value={teacherVideoUrl}
              onChange={(e) => setTeacherVideoUrl(e.target.value)}
              placeholder="https://vimeo.com/..."
              helperText="Vimeo URL voor Leerkrachten"
            />

            <Input
              label="Student Video URL"
              value={studentVideoUrl}
              onChange={(e) => setStudentVideoUrl(e.target.value)}
              placeholder="https://vimeo.com/..."
              helperText="Vimeo URL voor studenten"
            />
          </div>

          {/* Age Groups */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Categorieën</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {techniqueCategories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="h-4 w-4 text-#946B29 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      {category.description && (
                        <p className="text-xs text-gray-500">{category.description}</p>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Age Groups */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Leeftijdsgroepen</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ageGroups.map((ageGroup) => (
                <label
                  key={ageGroup.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedAgeGroups.includes(ageGroup.id)}
                    onChange={() => handleAgeGroupToggle(ageGroup.id)}
                    className="h-4 w-4 text-#946B29 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{ageGroup.name}</span>
                    {ageGroup.description && (
                      <p className="text-xs text-gray-500">{ageGroup.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Vakken</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {subjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject.id)}
                    onChange={() => handleSubjectToggle(subject.id)}
                    className="h-4 w-4 text-#946B29 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{subject.name}</span>
                    {subject.description && (
                      <p className="text-xs text-gray-500">{subject.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Materialen</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {materials.map((material) => (
                <label
                  key={material.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMaterials.includes(material.id)}
                    onChange={() => handleMaterialToggle(material.id)}
                    className="h-4 w-4 text-#946B29 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{material.name}</span>
                    {material.description && (
                      <p className="text-xs text-gray-500">{material.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* External Links */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Externe Links</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addExternalLink}>
                <Plus className="w-4 h-4 mr-1" />
                Link toevoegen
              </Button>
            </div>
            
            {externalLinks.map((link, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <Input
                    placeholder="Link titel"
                    value={link.title}
                    onChange={(e) => updateExternalLink(index, 'title', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateExternalLink(index, 'url', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeExternalLink(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuleren
            </Button>
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4 mr-2" />
              {editingTechnique ? 'Wijzigingen opslaan' : 'Techniek opslaan'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}