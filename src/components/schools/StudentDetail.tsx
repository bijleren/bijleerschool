import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ArrowLeft, CreditCard as Edit, Save, X, GraduationCap, Calendar, Hash, Heart, Star, Users, Plus, Trash2, AlertTriangle, Clock, MapPin, User, Eye, EyeOff, Upload, Image as ImageIcon, Palette, Link, QrCode, RefreshCw, ExternalLink, Download } from 'lucide-react';
import { ColorPicker } from '../ui/ColorPicker';
import { StudentWebWijzer } from '../webwijzer/StudentWebWijzer';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
  date_of_birth: string | null;
  is_active: boolean;
  created_at: string;
  profile_picture_url: string | null;
  color: string | null;
  symbol_url: string | null;
  student_display_number: number | null;
  pin_code: string | null;
  student_code: string | null;
  access_hash: string | null;
}

interface SchoolGrade {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface StudentGrade {
  id: string;
  student_id: string;
  grade_id: string;
  school_grades: SchoolGrade;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  school_year: string | null;
}

interface StudentGroup {
  id: string;
  group_id: string;
  groups: Group;
  enrolled_at: string;
  is_active: boolean;
}

interface BehaviorIncident {
  id: string;
  incident_date: string;
  location: string | null;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  behavior_items: {
    name: string;
    behavior_categories: {
      name: string;
      color: string;
    };
    behavior_severity_levels: {
      name: string;
      level: number;
      color: string;
    };
  };
  behavior_incident_students: {
    student_roles: {
      name: string;
      color: string;
    };
  }[];
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface StudentDetailProps {
  student: Student;
  schoolId: string;
  onBack: () => void;
  onStudentUpdated: (student: Student) => void;
}

export function StudentDetail({ student, schoolId, onBack, onStudentUpdated }: StudentDetailProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Student editing states
  const [editFirstName, setEditFirstName] = useState(student.first_name);
  const [editLastName, setEditLastName] = useState(student.last_name);
  const [editStudentNumber, setEditStudentNumber] = useState(student.student_number || '');
  const [editGradeLevel, setEditGradeLevel] = useState(student.grade_level || '');
  const [editDateOfBirth, setEditDateOfBirth] = useState(student.date_of_birth || '');
  const [editSelectedLeerjaar, setEditSelectedLeerjaar] = useState('');
  const [editColor, setEditColor] = useState(student.color || '#3B82F6');
  const [editDisplayNumber, setEditDisplayNumber] = useState(student.student_display_number?.toString() || '');
  const [editPinCode, setEditPinCode] = useState(student.pin_code || '');
  const [showPinCode, setShowPinCode] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [symbolFile, setSymbolFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(student.profile_picture_url || '');
  const [symbolPreview, setSymbolPreview] = useState(student.symbol_url || '');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Student groups
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  
  // Favorite state
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isStudentFavorite, setIsStudentFavorite] = useState(false);
  const [schoolGrades, setSchoolGrades] = useState<SchoolGrade[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);

  // Recent incidents
  const [recentIncidents, setRecentIncidents] = useState<BehaviorIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);

  // Incident statistics
  const [incidentStats, setIncidentStats] = useState({
    total: 0,
    recent: 0,
    byCategory: [] as Array<{ name: string; count: number; color: string }>,
    bySeverity: [] as Array<{ level: number; count: number; color: string }>
  });

  // WebWijzer states
  const [studentCode, setStudentCode] = useState(student.student_code || '');
  const [accessHash, setAccessHash] = useState(student.access_hash || '');
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [showWebWijzer, setShowWebWijzer] = useState(false);

  useEffect(() => {
    fetchStudentGroups();
    fetchAvailableGroups();
    checkIfStudentIsFavorite();
    fetchSchoolGrades();
    fetchStudentGrades();
    fetchRecentIncidents();
    fetchIncidentStatistics();
    generateQRCode();
  }, []);

  useEffect(() => {
    generateQRCode();
  }, [student.access_hash]);

  const generateQRCode = () => {
    if (student.access_hash) {
      const url = `https://bijleer.school/webwijzer?h=${encodeURIComponent(student.access_hash)}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
    }
  };

  const downloadQRCode = async () => {
    if (qrCodeUrl) {
      try {
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${student.first_name}-${student.last_name}-QR.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Error downloading QR code:', err);
      }
    }
  };

  const fetchRecentIncidents = async () => {
    try {
      setIncidentsLoading(true);

      // Fetch incidents through the junction table to get role information
      const { data: studentIncidents, error: incidentsError } = await supabase
        .from('behavior_incident_students')
        .select(`
          id,
          student_roles (
            name,
            color
          ),
          behavior_incidents (
            id,
            incident_date,
            location,
            description,
            status,
            behavior_items (
              name,
              behavior_categories (
                name,
                color
              ),
              behavior_severity_levels (
                name,
                level,
                color
              )
            ),
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (incidentsError) throw incidentsError;

      // Transform the data to match the expected format
      const incidents = studentIncidents?.map(si => ({
        id: si.behavior_incidents.id,
        incident_date: si.behavior_incidents.incident_date,
        location: si.behavior_incidents.location,
        description: si.behavior_incidents.description,
        status: si.behavior_incidents.status,
        behavior_items: si.behavior_incidents.behavior_items,
        behavior_incident_students: [{
          student_roles: si.student_roles
        }],
        profiles: si.behavior_incidents.profiles
      })) || [];

      setRecentIncidents(incidents);
    } catch (error) {
      console.error('Error fetching recent incidents:', error);
      setRecentIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const fetchIncidentStatistics = async () => {
    try {
      // Fetch all incidents for this student to calculate statistics
      const { data: allIncidents, error } = await supabase
        .from('behavior_incident_students')
        .select(`
          id,
          created_at,
          behavior_incidents (
            id,
            incident_date,
            behavior_items (
              behavior_categories (
                name,
                color
              ),
              behavior_severity_levels (
                level,
                color
              )
            )
          )
        `)
        .eq('student_id', student.id);

      if (error) throw error;

      const total = allIncidents?.length || 0;

      // Calculate recent incidents (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = allIncidents?.filter(inc =>
        new Date(inc.behavior_incidents.incident_date) >= thirtyDaysAgo
      ).length || 0;

      // Group by category
      const categoryMap = new Map<string, { count: number; color: string }>();
      allIncidents?.forEach(inc => {
        const category = inc.behavior_incidents.behavior_items.behavior_categories;
        const current = categoryMap.get(category.name) || { count: 0, color: category.color };
        categoryMap.set(category.name, { count: current.count + 1, color: category.color });
      });
      const byCategory = Array.from(categoryMap.entries())
        .map(([name, data]) => ({ name, count: data.count, color: data.color }))
        .sort((a, b) => b.count - a.count);

      // Group by severity
      const severityMap = new Map<number, { count: number; color: string }>();
      allIncidents?.forEach(inc => {
        const severity = inc.behavior_incidents.behavior_items.behavior_severity_levels;
        const current = severityMap.get(severity.level) || { count: 0, color: severity.color };
        severityMap.set(severity.level, { count: current.count + 1, color: severity.color });
      });
      const bySeverity = Array.from(severityMap.entries())
        .map(([level, data]) => ({ level, count: data.count, color: data.color }))
        .sort((a, b) => a.level - b.level);

      setIncidentStats({ total, recent, byCategory, bySeverity });
    } catch (error) {
      console.error('Error fetching incident statistics:', error);
    }
  };

  const fetchSchoolGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('school_grades')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setSchoolGrades(data || []);
    } catch (error) {
      console.error('Error fetching school grades:', error);
    }
  };

  const fetchStudentGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('student_grades')
        .select(`
          *,
          school_grades (*)
        `)
        .eq('student_id', student.id);

      if (error) {
        console.warn('Student grades table not found:', error);
        setStudentGrades([]);
      } else {
        setStudentGrades(data || []);
      }
    } catch (error) {
      console.error('Error fetching student grades:', error);
      setStudentGrades([]);
    }
  };

  const checkIfStudentIsFavorite = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('favoritable_id', student.id)
        .eq('favoritable_type', 'student')
        .maybeSingle();

      if (error) throw error;
      setIsStudentFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleStudentFavorite = async () => {
    if (!user) return;

    setFavoriteLoading(true);

    try {
      if (isStudentFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('favoritable_id', student.id)
          .eq('favoritable_type', 'student');

        if (error) throw error;
        setIsStudentFavorite(false);
        setMessage('Student verwijderd uit favorieten');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            favoritable_id: student.id,
            favoritable_type: 'student'
          });

        if (error) throw error;
        setIsStudentFavorite(true);
        setMessage('Student toegevoegd aan favorieten');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van favorieten.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const generateStudentCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const generateAccessHash = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)));
  };

  const regenerateStudentCode = async () => {
    if (!confirm('Are you sure you want to regenerate the student code? The old QR code will no longer work.')) {
      return;
    }

    setRegeneratingCode(true);

    try {
      const newCode = generateStudentCode();
      const newHash = generateAccessHash();

      const { error } = await supabase
        .from('students')
        .update({
          student_code: newCode,
          access_hash: newHash,
        })
        .eq('id', student.id);

      if (error) throw error;

      setStudentCode(newCode);
      setAccessHash(newHash);
      setMessage('Student code successfully regenerated');
    } catch (error) {
      console.error('Error regenerating student code:', error);
      setMessage('Failed to regenerate student code');
    } finally {
      setRegeneratingCode(false);
    }
  };

  const generateInitialStudentCode = async () => {
    if (studentCode) return;

    try {
      const newCode = generateStudentCode();
      const newHash = generateAccessHash();

      const { error } = await supabase
        .from('students')
        .update({
          student_code: newCode,
          access_hash: newHash,
        })
        .eq('id', student.id);

      if (error) throw error;

      setStudentCode(newCode);
      setAccessHash(newHash);
    } catch (error) {
      console.error('Error generating student code:', error);
    }
  };

  useEffect(() => {
    if (!studentCode) {
      generateInitialStudentCode();
    }
  }, []);

  const fetchStudentGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('student_groups')
        .select(`
          *,
          groups (*)
        `)
        .eq('student_id', student.id)
        .eq('is_active', true);

      if (error) throw error;
      setStudentGroups(data || []);
    } catch (error) {
      console.error('Error fetching student groups:', error);
    }
  };

  const fetchAvailableGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true);

      if (error) throw error;
      setAvailableGroups(data || []);
    } catch (error) {
      console.error('Error fetching available groups:', error);
    }
  };

  const addStudentToGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('student_groups')
        .insert({
          student_id: student.id,
          group_id: groupId,
        });

      if (error) throw error;

      fetchStudentGroups();
      setMessage('Student succesvol toegevoegd aan groep!');
      setShowAddGroup(false);
    } catch (error) {
      console.error('Error adding student to group:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen aan de groep.');
    }
  };

  const removeStudentFromGroup = async (studentGroupId: string) => {
    try {
      const { error } = await supabase
        .from('student_groups')
        .update({ is_active: false })
        .eq('id', studentGroupId);

      if (error) throw error;

      fetchStudentGroups();
      setMessage('Student succesvol verwijderd uit klas!');
    } catch (error) {
      console.error('Error removing student from klas:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen uit de klas.');
    }
  };

  const removeStudentFromGrade = async (studentGradeId: string) => {
    try {
      const { error } = await supabase
        .from('student_grades')
        .delete()
        .eq('id', studentGradeId);

      if (error) throw error;

      fetchStudentGrades();
      setMessage('Student succesvol verwijderd uit leerjaar!');
    } catch (error) {
      console.error('Error removing student from grade:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen uit het leerjaar.');
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    }
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      setSymbolFile(file);
      setSymbolPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    console.log('Starting file upload:', { fileName: file.name, fileType: file.type, fileSize: file.size, folder });

    const fileExt = file.name.split('.').pop();
    const fileName = `${student.id}_${folder}_${Date.now()}.${fileExt}`;
    const filePath = `${schoolId}/${fileName}`;

    console.log('Upload path:', filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    const { data: { publicUrl } } = supabase.storage
      .from('student-files')
      .getPublicUrl(filePath);

    console.log('Public URL:', publicUrl);

    return publicUrl;
  };

  const updateStudent = async () => {
    setLoading(true);
    setMessage('');

    try {
      let profilePictureUrl = student.profile_picture_url;
      let symbolUrl = student.symbol_url;

      if (profilePictureFile) {
        console.log('Uploading profile picture...');
        try {
          profilePictureUrl = await uploadFile(profilePictureFile, 'profile');
          console.log('Profile picture uploaded successfully');
        } catch (uploadError: any) {
          console.error('Error uploading profile picture:', uploadError);
          const errorMsg = uploadError?.message || 'Onbekende fout';
          setMessage(`Fout bij uploaden van profielfoto: ${errorMsg}`);
        }
      }

      if (symbolFile) {
        console.log('Uploading symbol...');
        try {
          symbolUrl = await uploadFile(symbolFile, 'symbol');
          console.log('Symbol uploaded successfully');
        } catch (uploadError: any) {
          console.error('Error uploading symbol:', uploadError);
          const errorMsg = uploadError?.message || 'Onbekende fout';
          setMessage(`Fout bij uploaden van symbool: ${errorMsg}`);
        }
      }

      const { data, error } = await supabase
        .from('students')
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          student_number: editStudentNumber || null,
          grade_level: editGradeLevel || null,
          date_of_birth: editDateOfBirth || null,
          color: editColor,
          student_display_number: editDisplayNumber ? parseInt(editDisplayNumber) : null,
          pin_code: editPinCode || null,
          profile_picture_url: profilePictureUrl,
          symbol_url: symbolUrl,
        })
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;

      // Handle leerjaar connection
      if (editSelectedLeerjaar) {
        // Check if connection already exists
        const { data: existingConnection } = await supabase
          .from('student_grades')
          .select('id')
          .eq('student_id', student.id)
          .eq('grade_id', editSelectedLeerjaar)
          .maybeSingle();

        if (!existingConnection) {
          // Add new connection
          const { error: gradeError } = await supabase
            .from('student_grades')
            .insert({
              student_id: student.id,
              grade_id: editSelectedLeerjaar
            });

          if (gradeError) throw gradeError;
        }
      }

      onStudentUpdated(data);
      setIsEditing(false);
      setEditSelectedLeerjaar('');
      setProfilePictureFile(null);
      setSymbolFile(null);
      if (!message) {
        setMessage('Student succesvol bijgewerkt!');
      }
      fetchStudentGrades();
    } catch (error) {
      console.error('Error updating student:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van de student.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Melding';
      case 'in_progress': return 'Onderzoek';
      case 'resolved': return 'Afgerond';
      default: return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  // Filter available groups that student is not already in
  const filteredAvailableGroups = availableGroups.filter(
    group => !studentGroups.some(sg => sg.groups.id === group.id)
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar studenten
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {student.first_name} {student.last_name}
            </h1>
            {student.student_number && (
              <p className="text-gray-600">#{student.student_number}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={toggleStudentFavorite}
            loading={favoriteLoading}
            className={isStudentFavorite 
              ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            }
          >
            <Heart className={`w-4 h-4 mr-2 ${isStudentFavorite ? 'fill-current' : ''}`} />
            {isStudentFavorite ? 'Favoriet' : 'Favoriet maken'}
          </Button>
          {!isEditing ? (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Bewerken
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Annuleren
              </Button>
              <Button onClick={updateStudent} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
            </div>
          )}
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

      {/* Student Info */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Informatie</h3>
        
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Voornaam"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                required
              />
              <Input
                label="Achternaam"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Studentnummer"
                value={editStudentNumber}
                onChange={(e) => setEditStudentNumber(e.target.value)}
              />
              <Input
                label="Klas/Niveau"
                value={editGradeLevel}
                onChange={(e) => setEditGradeLevel(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leerjaar
                </label>
                <select
                  value={editSelectedLeerjaar}
                  onChange={(e) => setEditSelectedLeerjaar(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecteer leerjaar</option>
                  {schoolGrades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              label="Geboortedatum"
              type="date"
              value={editDateOfBirth}
              onChange={(e) => setEditDateOfBirth(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profielfoto (PNG/JPG)
                </label>
                <div className="flex items-center space-x-4">
                  {profilePicturePreview && (
                    <img
                      src={profilePicturePreview}
                      alt="Profielfoto preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  )}
                  <label className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload foto</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbool (PNG/JPG)
                </label>
                <div className="flex items-center space-x-4">
                  {symbolPreview && (
                    <img
                      src={symbolPreview}
                      alt="Symbool preview"
                      className="w-16 h-16 rounded object-cover border-2 border-gray-300"
                    />
                  )}
                  <label className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload symbool</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleSymbolChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ColorPicker
                label="Kleur"
                value={editColor}
                onChange={setEditColor}
              />

              <Input
                label="Student Nummer (positief getal)"
                type="number"
                min="1"
                value={editDisplayNumber}
                onChange={(e) => setEditDisplayNumber(e.target.value)}
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode (4 cijfers)
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type={showPinCode ? 'text' : 'password'}
                  value={editPinCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEditPinCode(value);
                  }}
                  placeholder="0000"
                  maxLength={4}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPinCode(!showPinCode)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {showPinCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {editPinCode && editPinCode.length !== 4 && (
                <p className="mt-1 text-sm text-red-600">Pincode moet exact 4 cijfers zijn</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start space-x-6 mb-6 pb-6 border-b border-gray-200">
              {student.profile_picture_url && (
                <img
                  src={student.profile_picture_url}
                  alt="Profielfoto"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                />
              )}
              {student.symbol_url && (
                <img
                  src={student.symbol_url}
                  alt="Symbool"
                  className="w-20 h-20 rounded object-cover border-2 border-gray-300"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
                <p className="text-gray-900">{student.first_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
                <p className="text-gray-900">{student.last_name}</p>
              </div>
              {student.student_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Studentnummer</label>
                  <p className="text-gray-900 flex items-center">
                    <Hash className="w-4 h-4 mr-1" />
                    {student.student_number}
                  </p>
                </div>
              )}
              {student.grade_level && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Klas/Niveau</label>
                  <p className="text-gray-900">{student.grade_level}</p>
                </div>
              )}
              {student.date_of_birth && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geboortedatum</label>
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(student.date_of_birth)}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Toegevoegd op</label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(student.created_at)}
                </p>
              </div>
              {student.color && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kleur</label>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: student.color }}
                    />
                    <p className="text-gray-900 font-mono text-sm">{student.color}</p>
                  </div>
                </div>
              )}
              {student.student_display_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Nummer</label>
                  <p className="text-gray-900 flex items-center">
                    <Hash className="w-4 h-4 mr-1" />
                    {student.student_display_number}
                  </p>
                </div>
              )}
              {student.pin_code && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 font-mono">
                      {showPinCode ? student.pin_code : '••••'}
                    </p>
                    <button
                      onClick={() => setShowPinCode(!showPinCode)}
                      className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      {showPinCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Recent Incidents */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Recente Incidenten
        </h3>

        {incidentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : recentIncidents.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Geen recente incidenten</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => {
                sessionStorage.setItem('returnToStudent', JSON.stringify({ schoolId, studentId: student.id }));
                window.dispatchEvent(new CustomEvent('navigate-to-behavior', { detail: { incidentId: incident.id, schoolId: schoolId } }));
              }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: incident.behavior_items.behavior_categories.color }}
                    >
                      {incident.behavior_items.behavior_categories.name}
                    </span>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: incident.behavior_items.behavior_severity_levels.color }}
                    >
                      Niveau {incident.behavior_items.behavior_severity_levels.level}
                    </span>
                    {incident.behavior_incident_students && incident.behavior_incident_students[0] && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: incident.behavior_incident_students[0].student_roles.color + '20',
                          color: incident.behavior_incident_students[0].student_roles.color
                        }}
                      >
                        {incident.behavior_incident_students[0].student_roles.name}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                    {getStatusText(incident.status)}
                  </span>
                </div>

                <h4 className="font-medium text-gray-900 mb-2">
                  {incident.behavior_items.name}
                </h4>

                <p className="text-gray-700 text-sm mb-3">{incident.description}</p>

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(incident.incident_date).toLocaleDateString('nl-NL')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(incident.incident_date).toLocaleTimeString('nl-NL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {incident.location && (
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {incident.location}
                    </div>
                  )}
                  <div className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {incident.profiles ? `${incident.profiles.first_name} ${incident.profiles.last_name}` : 'Onbekend'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* WebWijzer Section */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Link className="w-5 h-5 mr-2" />
            WebWijzer
          </h3>
          <Button
            variant="secondary"
            onClick={() => setShowWebWijzer(true)}
            size="sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View WebWijzer
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Code</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                  {studentCode || 'Generating...'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={regenerateStudentCode}
                disabled={regeneratingCode || !studentCode}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regeneratingCode ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Students use this code with their PIN to access WebWijzer
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">QR Code</label>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start gap-4">
                {qrCodeUrl ? (
                  <div className="flex-shrink-0">
                    <div
                      className="bg-white p-2 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-300"
                      onClick={downloadQRCode}
                      title="Click to download QR code"
                    >
                      <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={downloadQRCode}
                      className="w-full mt-2"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    https://bijleer.school/webwijzer?h={accessHash || '...'}
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    Students can scan this QR code for instant access to their WebWijzer
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    Click the QR code to download it
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Student Groups */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Klassen ({studentGroups.length})
          </h3>
          <Button variant="secondary" onClick={() => setShowAddGroup(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Toevoegen aan klas
          </Button>
        </div>

        {showAddGroup && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Beschikbare klassen</h4>
              <Button variant="secondary" onClick={() => setShowAddGroup(false)}>
                Annuleren
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredAvailableGroups.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Geen beschikbare klassen gevonden</p>
              ) : (
                filteredAvailableGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <span className="font-medium">{group.name}</span>
                      {group.description && (
                        <p className="text-sm text-gray-600">{group.description}</p>
                      )}
                      {group.grade_level && (
                        <span className="text-sm text-gray-500 ml-2">Klas: {group.grade_level}</span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => addStudentToGroup(group.id)}>
                      Toevoegen
                    </Button>
                  </div>
                ))
              )}
            </div>
            {studentGrades.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leerjaren</label>
                <div className="flex flex-wrap gap-2">
                  {studentGrades.map((studentGrade) => (
                    <span
                      key={studentGrade.id}
                      className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                    >
                      {studentGrade.school_grades.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {studentGroups.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Student zit in geen klassen</p>
          ) : (
            studentGroups.map((studentGroup) => (
              <div key={studentGroup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{studentGroup.groups.name}</span>
                  {studentGroup.groups.description && (
                    <p className="text-sm text-gray-600">{studentGroup.groups.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    {studentGroup.groups.grade_level && (
                      <div className="flex items-center">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        {studentGroup.groups.grade_level}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Toegevoegd: {formatDate(studentGroup.enrolled_at)}
                    </div>
                  </div>
                  {studentGroup.groups.school_year && (
                    <div className="text-xs text-gray-500 mt-1">
                      Schooljaar: {studentGroup.groups.school_year}
                    </div>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeStudentFromGroup(studentGroup.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Student Leerjaren */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Leerjaren ({studentGrades.length})
          </h3>
        </div>

        <div className="space-y-2">
          {studentGrades.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Student heeft geen leerjaren toegewezen</p>
          ) : (
            studentGrades.map((studentGrade) => (
              <div key={studentGrade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{studentGrade.school_grades.name}</span>
                  {studentGrade.school_grades.description && (
                    <p className="text-sm text-gray-600">{studentGrade.school_grades.description}</p>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeStudentFromGrade(studentGrade.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Incident Statistics */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Gedragsincidenten overzicht</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Total Incidents */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Totaal incidenten</p>
                <p className="text-2xl font-bold text-blue-900">{incidentStats.total}</p>
              </div>
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Afgelopen 30 dagen</p>
                <p className="text-2xl font-bold text-orange-900">{incidentStats.recent}</p>
              </div>
            </div>
          </div>

          {/* By Category */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Per categorie</h4>
            <div className="space-y-2">
              {incidentStats.byCategory.length === 0 ? (
                <p className="text-xs text-gray-500">Geen data</p>
              ) : (
                incidentStats.byCategory.slice(0, 3).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{cat.count}</span>
                  </div>
                ))
              )}
              {incidentStats.byCategory.length > 3 && (
                <p className="text-xs text-gray-500 mt-2">+{incidentStats.byCategory.length - 3} meer</p>
              )}
            </div>
          </div>

          {/* By Severity */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Per ernst niveau</h4>
            <div className="space-y-2">
              {incidentStats.bySeverity.length === 0 ? (
                <p className="text-xs text-gray-500">Geen data</p>
              ) : (
                incidentStats.bySeverity.map((sev) => (
                  <div key={sev.level} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sev.color }}
                      />
                      <span className="text-sm text-gray-700">Niveau {sev.level}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{sev.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* WebWijzer Modal */}
      {showWebWijzer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                WebWijzer - {student.first_name} {student.last_name}
              </h2>
              <Button variant="ghost" onClick={() => setShowWebWijzer(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6">
              <StudentWebWijzer
                studentId={student.id}
                studentName={student.first_name}
                onBackToDashboard={() => setShowWebWijzer(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}