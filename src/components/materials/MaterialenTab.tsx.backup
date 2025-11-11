import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { QrCode, Package, Plus, Search, ArrowLeft, Camera, X, UserCheck, UserX, Trash2 } from 'lucide-react';
import { UniversalScanner } from '../ui/UniversalScanner';

interface Material {
  id: string;
  school_id: string;
  blink_code: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  is_available: boolean;
  total_copies: number;
  available_copies: number;
  item_number: string | null;
  created_at: string;
}

interface GroupedMaterial {
  blink_code: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  total_items: number;
  available_items: number;
  items: Material[];
}

interface MaterialLoan {
  id: string;
  material_id: string;
  student_id: string;
  loaned_at: string;
  loaned_by: string;
  returned_at: string | null;
  returned_by: string | null;
  notes: string | null;
  students: {
    id: string;
    first_name: string;
    last_name: string;
    student_code: string | null;
  };
}

interface MaterialenTabProps {
  schoolId: string;
}

export function MaterialenTab({ schoolId }: MaterialenTabProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [groupedMaterials, setGroupedMaterials] = useState<GroupedMaterial[]>([]);
  const [filteredGroupedMaterials, setFilteredGroupedMaterials] = useState<GroupedMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [selectedBlinkCode, setSelectedBlinkCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'loan'>('list');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [formBlinkCode, setFormBlinkCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formItemNumber, setFormItemNumber] = useState('');
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [schoolId]);

  useEffect(() => {
    const grouped = materials.reduce((acc, material) => {
      const existing = acc.find(g => g.blink_code === material.blink_code);
      if (existing) {
        existing.items.push(material);
        existing.total_items++;
        existing.available_items += material.available_copies;
      } else {
        acc.push({
          blink_code: material.blink_code,
          title: material.title,
          description: material.description,
          photo_url: material.photo_url,
          total_items: 1,
          available_items: material.available_copies,
          items: [material]
        });
      }
      return acc;
    }, [] as GroupedMaterial[]);

    setGroupedMaterials(grouped);
  }, [materials]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredGroupedMaterials(
        groupedMaterials.filter(m =>
          m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.blink_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredGroupedMaterials(groupedMaterials);
    }
  }, [searchTerm, groupedMaterials]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('school_materials')
        .select('*')
        .eq('school_id', schoolId)
        .order('title');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setToast({ message: 'Fout bij ophalen materialen', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialScan = async (blinkCode: string) => {
    const existing = groupedMaterials.find(m => m.blink_code === blinkCode);
    if (existing) {
      setSelectedBlinkCode(blinkCode);
      setViewMode('detail');
      setShowScanner(false);
      setToast({ message: 'Materiaal gevonden!', type: 'success' });
    } else {
      setFormBlinkCode(blinkCode);
      setShowMaterialForm(true);
      setShowScanner(false);
      setToast({ message: 'Nieuw materiaal - vul details in', type: 'info' });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormPhoto(file);
      setFormPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${schoolId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('material-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('material-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const saveMaterial = async () => {
    if (!user || !formTitle.trim() || !formBlinkCode.trim()) {
      setToast({ message: 'Vul alle verplichte velden in', type: 'error' });
      return;
    }

    try {
      let photoUrl = null;
      if (formPhoto) {
        photoUrl = await uploadPhoto(formPhoto);
      }

      const cleanCode = formBlinkCode.replace(/-/g, '').toUpperCase();

      const materialData = {
        school_id: schoolId,
        blink_code: cleanCode,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        item_number: formItemNumber.trim() || null,
        photo_url: photoUrl,
        total_copies: 1,
        available_copies: 1,
        created_by: user.id
      };

      const { error } = await supabase
        .from('school_materials')
        .insert(materialData);

      if (error) throw error;

      resetForm();
      setShowMaterialForm(false);
      await fetchMaterials();
      setToast({ message: 'Materiaal toegevoegd', type: 'success' });
    } catch (error) {
      console.error('Error saving material:', error);
      setToast({ message: 'Fout bij opslaan materiaal', type: 'error' });
    }
  };

  const resetForm = () => {
    setFormBlinkCode('');
    setFormTitle('');
    setFormDescription('');
    setFormItemNumber('');
    setFormPhoto(null);
    setFormPhotoPreview(null);
  };

  const deleteItem = async (materialId: string) => {
    if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('school_materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      setToast({ message: 'Item verwijderd', type: 'success' });
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting item:', error);
      setToast({ message: 'Fout bij verwijderen item', type: 'error' });
    }
  };

  if (showScanner) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Scan BlinkQR Code</h2>
          <Button variant="secondary" onClick={() => setShowScanner(false)}>
            <X className="w-4 h-4 mr-2" />
            Sluiten
          </Button>
        </div>
        <Card>
          <UniversalScanner
            scanningFor="material"
            onMaterialScan={handleMaterialScan}
            onError={(error) => setToast({ message: error, type: 'error' })}
          />
        </Card>
      </div>
    );
  }

  if (showMaterialForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Nieuw Materiaal</h2>
          <Button
            variant="secondary"
            onClick={() => {
              setShowMaterialForm(false);
              resetForm();
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
        </div>

        <Card>
          <div className="space-y-4">
            <Input
              label="BlinkQR Code"
              value={formBlinkCode}
              onChange={(e) => setFormBlinkCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXXXX"
            />

            <Input
              label="Titel"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Bijv. iPad"
            />

            <Input
              label="Item Nummer (optioneel)"
              value={formItemNumber}
              onChange={(e) => setFormItemNumber(e.target.value)}
              placeholder="Bijv. 3 voor iPad 3"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving (optioneel)
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Extra informatie over het materiaal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto (optioneel)
              </label>
              <div className="flex gap-4">
                {formPhotoPreview && (
                  <img
                    src={formPhotoPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Upload foto</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveMaterial} className="flex-1">
                Aanmaken
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowMaterialForm(false);
                  resetForm();
                }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        </Card>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  if (viewMode === 'detail' && selectedBlinkCode) {
    const group = groupedMaterials.find(g => g.blink_code === selectedBlinkCode);
    if (!group) {
      setViewMode('list');
      return null;
    }

    return (
      <GroupedMaterialDetail
        group={group}
        schoolId={schoolId}
        onBack={() => {
          setViewMode('list');
          setSelectedBlinkCode(null);
        }}
        onRefresh={fetchMaterials}
        onDeleteItem={deleteItem}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materialen</h2>
          <p className="text-sm text-gray-600 mt-1">Beheer schoolmateriaal met BlinkQR codes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowScanner(true)}>
            <QrCode className="w-4 h-4 mr-2" />
            Scan Code
          </Button>
          <Button variant="secondary" onClick={() => setShowMaterialForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Handmatig Toevoegen
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Zoek op titel of code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Laden...</div>
        ) : filteredGroupedMaterials.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'Geen materialen gevonden' : 'Nog geen materialen toegevoegd'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Scan een BlinkQR code of voeg handmatig materiaal toe
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroupedMaterials.map((group) => (
              <div
                key={group.blink_code}
                onClick={() => {
                  setSelectedBlinkCode(group.blink_code);
                  setViewMode('detail');
                }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                {group.photo_url ? (
                  <img
                    src={group.photo_url}
                    alt={group.title}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <h3 className="font-semibold text-gray-900">{group.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{group.blink_code}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      group.available_items > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {group.available_items}/{group.total_items} beschikbaar
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function GroupedMaterialDetail({
  group,
  schoolId,
  onBack,
  onRefresh,
  onDeleteItem
}: {
  group: GroupedMaterial;
  schoolId: string;
  onBack: () => void;
  onRefresh: () => void;
  onDeleteItem: (id: string) => void;
}) {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'loan'>('list');

  if (viewMode === 'loan' && selectedMaterialId) {
    const material = group.items.find(m => m.id === selectedMaterialId);
    if (!material) return null;

    return (
      <MaterialLoanView
        material={material}
        schoolId={schoolId}
        onBack={() => {
          setViewMode('list');
          setSelectedMaterialId(null);
        }}
        onLoanComplete={() => {
          onRefresh();
          setViewMode('list');
          setSelectedMaterialId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {group.photo_url ? (
              <img
                src={group.photo_url}
                alt={group.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{group.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Code: {group.blink_code}</p>
            </div>

            {group.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Beschrijving</h3>
                <p className="text-gray-600">{group.description}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
              <div className={`border rounded-lg p-3 ${
                group.available_items > 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-medium ${
                  group.available_items > 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {group.available_items} van {group.total_items} beschikbaar
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Items ({group.total_items})
          </h3>
        </div>

        <div className="space-y-3">
          {group.items.map((item) => (
            <MaterialItemCard
              key={item.id}
              material={item}
              onLoan={() => {
                setSelectedMaterialId(item.id);
                setViewMode('loan');
              }}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function MaterialItemCard({
  material,
  onLoan,
  onDelete
}: {
  material: Material;
  onLoan: () => void;
  onDelete: (id: string) => void;
}) {
  const [loan, setLoan] = useState<MaterialLoan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentLoan();
  }, [material.id]);

  const fetchCurrentLoan = async () => {
    try {
      const { data, error } = await supabase
        .from('school_material_loans')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_code
          )
        `)
        .eq('material_id', material.id)
        .is('returned_at', null)
        .maybeSingle();

      if (error) throw error;
      setLoan(data);
    } catch (error) {
      console.error('Error fetching loan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">
              {material.title}
              {material.item_number && ` #${material.item_number}`}
            </h4>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                material.available_copies > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {material.available_copies > 0 ? 'Beschikbaar' : 'Uitgeleend'}
            </span>
          </div>

          {loan && (
            <p className="text-sm text-gray-600 mt-1">
              Uitgeleend aan {loan.students.first_name} {loan.students.last_name}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onLoan}
            disabled={material.available_copies === 0 && !loan}
          >
            {loan ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDelete(material.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MaterialLoanView({
  material,
  schoolId,
  onBack,
  onLoanComplete
}: {
  material: Material;
  schoolId: string;
  onBack: () => void;
  onLoanComplete: () => void;
}) {
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; first_name: string; last_name: string; student_code: string | null }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentLoan, setCurrentLoan] = useState<MaterialLoan | null>(null);

  useEffect(() => {
    fetchStudents();
    checkCurrentLoan();
  }, [schoolId, material.id]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_code')
        .eq('school_id', schoolId)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const checkCurrentLoan = async () => {
    try {
      const { data, error } = await supabase
        .from('school_material_loans')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_code
          )
        `)
        .eq('material_id', material.id)
        .is('returned_at', null)
        .maybeSingle();

      if (error) throw error;
      setCurrentLoan(data);
    } catch (error) {
      console.error('Error checking current loan:', error);
    }
  };

  const handleScan = async (scannedCode: string) => {
    const student = students.find(s => s.student_code === scannedCode);
    if (student) {
      setSelectedStudent(student.id);
      setShowScanner(false);
      setToast({ message: `${student.first_name} ${student.last_name} geselecteerd`, type: 'success' });
    } else {
      setToast({ message: 'Leerling niet gevonden', type: 'error' });
    }
  };

  const loanMaterial = async () => {
    if (!user || !selectedStudent) {
      setToast({ message: 'Selecteer een leerling', type: 'error' });
      return;
    }

    try {
      if (material.available_copies <= 0) {
        setToast({ message: 'Geen exemplaren beschikbaar', type: 'error' });
        return;
      }

      const { error } = await supabase
        .from('school_material_loans')
        .insert({
          material_id: material.id,
          student_id: selectedStudent,
          loaned_by: user.id,
          notes: notes.trim() || null
        });

      if (error) throw error;

      const newAvailable = material.available_copies - 1;
      await supabase
        .from('school_materials')
        .update({
          available_copies: newAvailable,
          is_available: newAvailable > 0
        })
        .eq('id', material.id);

      setToast({ message: 'Materiaal uitgeleend', type: 'success' });
      setTimeout(onLoanComplete, 1000);
    } catch (error) {
      console.error('Error loaning material:', error);
      setToast({ message: 'Fout bij uitleen', type: 'error' });
    }
  };

  const returnMaterial = async () => {
    if (!user || !currentLoan) return;

    try {
      const { error } = await supabase
        .from('school_material_loans')
        .update({
          returned_at: new Date().toISOString(),
          returned_by: user.id
        })
        .eq('id', currentLoan.id);

      if (error) throw error;

      const newAvailable = material.available_copies + 1;
      await supabase
        .from('school_materials')
        .update({
          available_copies: newAvailable,
          is_available: newAvailable > 0
        })
        .eq('id', material.id);

      setToast({ message: 'Materiaal geretourneerd', type: 'success' });
      setTimeout(onLoanComplete, 1000);
    } catch (error) {
      console.error('Error returning material:', error);
      setToast({ message: 'Fout bij retourneren', type: 'error' });
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showScanner) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Scan Leerling QR Code</h2>
          <Button variant="secondary" onClick={() => setShowScanner(false)}>
            <X className="w-4 h-4 mr-2" />
            Sluiten
          </Button>
        </div>
        <Card>
          <UniversalScanner
            scanningFor="student"
            onStudentScan={handleScan}
            onError={(error) => setToast({ message: error, type: 'error' })}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {currentLoan ? 'Retourneer Materiaal' : 'Leen Materiaal Uit'}
        </h2>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">
            {material.title}
            {material.item_number && ` #${material.item_number}`}
          </p>
          <p className="text-sm text-gray-500">{material.blink_code}</p>
        </div>

        {currentLoan ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-900">
                Uitgeleend aan {currentLoan.students.first_name} {currentLoan.students.last_name}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Sinds {new Date(currentLoan.loaned_at).toLocaleDateString('nl-NL')}
              </p>
            </div>
            <Button onClick={returnMaterial} className="w-full">
              <UserX className="w-4 h-4 mr-2" />
              Retourneer Materiaal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Zoek Leerling"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Zoek op naam..."
                />
              </div>
              <div className="pt-6">
                <Button variant="secondary" onClick={() => setShowScanner(true)}>
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan
                </Button>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
              {filteredStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                >
                  <input
                    type="radio"
                    name="student"
                    value={student.id}
                    checked={selectedStudent === student.id}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-900">
                    {student.first_name} {student.last_name}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notities (optioneel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Bijv. Voor project natuurkunde"
              />
            </div>

            <Button onClick={loanMaterial} className="w-full" disabled={!selectedStudent}>
              <UserCheck className="w-4 h-4 mr-2" />
              Leen Uit
            </Button>
          </div>
        )}
      </Card>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
