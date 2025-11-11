import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { QrCode, Package, Plus, Search, ArrowLeft, Camera, X, UserCheck, UserX, Eye } from 'lucide-react';
import { UniversalScanner } from '../ui/UniversalScanner';

interface Material {
  id: string;
  school_id: string;
  blink_code: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  is_available: boolean;
  created_at: string;
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
    qr_code: string | null;
  };
}

interface MaterialenTabProps {
  schoolId: string;
}

export function MaterialenTab({ schoolId }: MaterialenTabProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'loan'>('list');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form states
  const [formBlinkCode, setFormBlinkCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [schoolId]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredMaterials(
        materials.filter(m =>
          m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.blink_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredMaterials(materials);
    }
  }, [searchTerm, materials]);

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
    // Check if material already exists
    const existing = materials.find(m => m.blink_code === blinkCode);
    if (existing) {
      setSelectedMaterial(existing);
      setViewMode('detail');
      setShowScanner(false);
      setToast({ message: 'Materiaal gevonden!', type: 'success' });
    } else {
      // Create new material with this code
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

      // Remove dashes from blink code before saving
      const cleanCode = formBlinkCode.replace(/-/g, '').toUpperCase();

      const materialData = {
        school_id: schoolId,
        blink_code: cleanCode,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        photo_url: photoUrl,
        created_by: user.id
      };

      if (selectedMaterial) {
        const { error } = await supabase
          .from('school_materials')
          .update(materialData)
          .eq('id', selectedMaterial.id);

        if (error) throw error;
        setToast({ message: 'Materiaal bijgewerkt', type: 'success' });
      } else {
        const { error } = await supabase
          .from('school_materials')
          .insert(materialData);

        if (error) throw error;
        setToast({ message: 'Materiaal aangemaakt', type: 'success' });
      }

      resetForm();
      fetchMaterials();
      setShowMaterialForm(false);
    } catch (error) {
      console.error('Error saving material:', error);
      setToast({ message: 'Fout bij opslaan materiaal', type: 'error' });
    }
  };

  const resetForm = () => {
    setFormBlinkCode('');
    setFormTitle('');
    setFormDescription('');
    setFormPhoto(null);
    setFormPhotoPreview(null);
    setSelectedMaterial(null);
  };

  const editMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setFormBlinkCode(material.blink_code);
    setFormTitle(material.title);
    setFormDescription(material.description || '');
    setFormPhotoPreview(material.photo_url);
    setShowMaterialForm(true);
  };

  const deleteMaterial = async (materialId: string) => {
    if (!confirm('Weet je zeker dat je dit materiaal wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('school_materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      setToast({ message: 'Materiaal verwijderd', type: 'success' });
      fetchMaterials();
      setViewMode('list');
    } catch (error) {
      console.error('Error deleting material:', error);
      setToast({ message: 'Fout bij verwijderen materiaal', type: 'error' });
    }
  };

  const openLoanView = (material: Material) => {
    setSelectedMaterial(material);
    setViewMode('loan');
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
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedMaterial ? 'Materiaal Bewerken' : 'Nieuw Materiaal'}
          </h2>
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
              placeholder="XXXXXXXXXX (dashes worden genegeerd)"
              disabled={!!selectedMaterial}
            />

            <Input
              label="Titel"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Bijv. iPad 3"
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
                {selectedMaterial ? 'Bijwerken' : 'Aanmaken'}
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

  if (viewMode === 'detail' && selectedMaterial) {
    return (
      <MaterialDetail
        material={selectedMaterial}
        onBack={() => {
          setViewMode('list');
          setSelectedMaterial(null);
        }}
        onEdit={editMaterial}
        onDelete={deleteMaterial}
        onLoan={openLoanView}
        onRefresh={fetchMaterials}
      />
    );
  }

  if (viewMode === 'loan' && selectedMaterial) {
    return (
      <MaterialLoanView
        material={selectedMaterial}
        schoolId={schoolId}
        onBack={() => {
          setViewMode('detail');
        }}
        onLoanComplete={() => {
          fetchMaterials();
          setViewMode('detail');
        }}
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
        ) : filteredMaterials.length === 0 ? (
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
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                onClick={() => {
                  setSelectedMaterial(material);
                  setViewMode('detail');
                }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                {material.photo_url ? (
                  <img
                    src={material.photo_url}
                    alt={material.title}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <h3 className="font-semibold text-gray-900">{material.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{material.blink_code}</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      material.is_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {material.is_available ? 'Beschikbaar' : 'Uitgeleend'}
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

function MaterialDetail({
  material,
  onBack,
  onEdit,
  onDelete,
  onLoan,
  onRefresh
}: {
  material: Material;
  onBack: () => void;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
  onLoan: (material: Material) => void;
  onRefresh: () => void;
}) {
  const [loans, setLoans] = useState<MaterialLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, [material.id]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('school_material_loans')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            qr_code
          )
        `)
        .eq('material_id', material.id)
        .order('loaned_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentLoan = loans.find(l => !l.returned_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onEdit(material)}>
            Bewerken
          </Button>
          <Button variant="secondary" onClick={() => onDelete(material.id)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {material.photo_url ? (
              <img
                src={material.photo_url}
                alt={material.title}
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
              <h2 className="text-2xl font-bold text-gray-900">{material.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Code: {material.blink_code}</p>
            </div>

            {material.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Beschrijving</h3>
                <p className="text-gray-600">{material.description}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
              {currentLoan ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-900">
                    Uitgeleend aan {currentLoan.students.first_name} {currentLoan.students.last_name}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Sinds {new Date(currentLoan.loaned_at).toLocaleDateString('nl-NL')}
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-900">Beschikbaar</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => onLoan(material)}
              className="w-full"
              disabled={!material.is_available && !!currentLoan}
            >
              {currentLoan ? (
                <>
                  <UserX className="w-4 h-4 mr-2" />
                  Retourneer
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Uitleen
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Uitleengeschiedenis</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Laden...</div>
        ) : loans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nog niet uitgeleend</div>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {loan.students.first_name} {loan.students.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(loan.loaned_at).toLocaleDateString('nl-NL')}
                    {loan.returned_at && (
                      <> - {new Date(loan.returned_at).toLocaleDateString('nl-NL')}</>
                    )}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    loan.returned_at
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {loan.returned_at ? 'Geretourneerd' : 'Uitgeleend'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
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
  const [students, setStudents] = useState<Array<{ id: string; first_name: string; last_name: string; qr_code: string | null }>>([]);
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
        .select('id, first_name, last_name, qr_code')
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
            qr_code
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
    const student = students.find(s => s.qr_code === scannedCode);
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
      const { error } = await supabase
        .from('school_material_loans')
        .insert({
          material_id: material.id,
          student_id: selectedStudent,
          loaned_by: user.id,
          notes: notes.trim() || null
        });

      if (error) throw error;

      await supabase
        .from('school_materials')
        .update({ is_available: false })
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

      await supabase
        .from('school_materials')
        .update({ is_available: true })
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
            scanningFor="material"
            onMaterialScan={handleMaterialScan}
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
          <p className="font-medium text-gray-900">{material.title}</p>
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
