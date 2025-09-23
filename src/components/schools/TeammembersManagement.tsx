import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Calendar,
  Shield,
  User,
  Trash2,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  school_code: string;
}

interface SchoolTeammember {
  id: string;
  school_id: string;
  user_id: string;
  role: 'teacher' | 'admin';
  joined_at: string;
  is_active: boolean;
  invited_by: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface TeammembersManagementProps {
  school: School;
  onBack: () => void;
}

export function TeammembersManagement({ school, onBack }: TeammembersManagementProps) {
  const { user } = useAuth();
  const [teammembers, setTeammembers] = useState<SchoolTeammember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'teacher' | 'admin'>('teacher');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    checkAdminStatus();
    fetchTeammembers();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('is_school_admin', { 
          user_id_input: user.id, 
          school_id_input: school.id 
        });

      if (error) throw error;
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const fetchTeammembers = async () => {
    try {
      const { data, error } = await supabase
        .from('school_teammembers')
        .select(`
          *,
          profiles!school_teammembers_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('role', { ascending: false }) // admins first
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setTeammembers(data || []);
    } catch (error) {
      console.error('Error fetching teammembers:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviteTeammember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setInviteLoading(true);
    setMessage('');

    try {
      // Check if user with this email exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!existingProfile) {
        setMessage('Gebruiker met dit e-mailadres bestaat niet. De gebruiker moet eerst een account aanmaken.');
        setInviteLoading(false);
        return;
      }

      // Check if user is already connected to this school
      const { data: existingConnection, error: connectionError } = await supabase
        .from('school_teammembers')
        .select('*')
        .eq('school_id', school.id)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (connectionError) throw connectionError;

      if (existingConnection) {
        if (existingConnection.is_active) {
          setMessage('Deze gebruiker is al verbonden met de school.');
        } else {
          // Reactivate existing connection
          const { error: reactivateError } = await supabase
            .from('school_teammembers')
            .update({ 
              is_active: true, 
              role: inviteRole,
              joined_at: new Date().toISOString(),
              invited_by: user.id
            })
            .eq('id', existingConnection.id);

          if (reactivateError) throw reactivateError;
          setMessage('Teammember succesvol opnieuw toegevoegd aan de school!');
        }
      } else {
        // Create new connection
        const { error: insertError } = await supabase
          .from('school_teammembers')
          .insert({
            school_id: school.id,
            user_id: existingProfile.id,
            role: inviteRole,
            invited_by: user.id
          });

        if (insertError) throw insertError;
        setMessage('Teammember succesvol uitgenodigd!');
      }

      setInviteEmail('');
      setInviteRole('teacher');
      setShowInviteForm(false);
      fetchTeammembers();
    } catch (error) {
      console.error('Error inviting teammember:', error);
      setMessage('Er is een fout opgetreden bij het uitnodigen van het teammember.');
    } finally {
      setInviteLoading(false);
    }
  };

  const updateTeammemberRole = async (teammemberId: string, newRole: 'teacher' | 'admin') => {
    try {
      const { error } = await supabase
        .from('school_teammembers')
        .update({ role: newRole })
        .eq('id', teammemberId);

      if (error) throw error;

      setMessage('Rol succesvol bijgewerkt!');
      fetchTeammembers();
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage('Er is een fout opgetreden bij het bijwerken van de rol.');
    }
  };

  const removeTeammember = async (teammemberId: string) => {
    try {
      const { error } = await supabase
        .from('school_teammembers')
        .update({ is_active: false })
        .eq('id', teammemberId);

      if (error) throw error;

      setMessage('Teammember succesvol verwijderd uit de school!');
      fetchTeammembers();
    } catch (error) {
      console.error('Error removing teammember:', error);
      setMessage('Er is een fout opgetreden bij het verwijderen van het teammember.');
    }
  };

  const filteredTeammembers = teammembers.filter(teammember => {
    if (!teammember.profiles) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      teammember.profiles.first_name.toLowerCase().includes(searchLower) ||
      teammember.profiles.last_name.toLowerCase().includes(searchLower) ||
      teammember.profiles.email.toLowerCase().includes(searchLower) ||
      teammember.role.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const getRoleText = (role: string) => {
    return role === 'admin' ? 'Beheerder' : 'Docent';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar school
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teammembers</h1>
            <p className="text-gray-600">{school.name} - Code: {school.school_code}</p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInviteForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Teammember uitnodigen
          </Button>
        )}
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

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Teammember uitnodigen</h3>
          <form onSubmit={inviteTeammember} className="space-y-4">
            <Input
              label="E-mailadres"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="naam@school.nl"
              helperText="De gebruiker moet al een account hebben"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'teacher' | 'admin')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="teacher">Docent</option>
                <option value="admin">Beheerder</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowInviteForm(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" loading={inviteLoading}>
                Uitnodigen
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Zoek teammembers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* School Code Info */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Teammembers toevoegen</h3>
            <p className="text-blue-800 mb-2">
              Deel de schoolcode <strong>{school.school_code}</strong> met collega's zodat zij zich kunnen aansluiten.
            </p>
            <p className="text-sm text-blue-700">
              Zij krijgen direct toegang na het invoeren van de code - geen goedkeuring nodig.
            </p>
          </div>
        </div>
      </Card>

      {/* Teammembers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Actieve teammembers ({filteredTeammembers.length})
          </h2>
        </div>

        {filteredTeammembers.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {teammembers.length === 0 ? 'Nog geen teammembers' : 'Geen teammembers gevonden'}
            </h3>
            <p className="text-gray-600 mb-6">
              {teammembers.length === 0 
                ? 'Nodig collega\'s uit of deel de schoolcode om te beginnen.'
                : 'Probeer een andere zoekopdracht.'
              }
            </p>
            {teammembers.length === 0 && isAdmin && (
              <Button onClick={() => setShowInviteForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Eerste teammember uitnodigen
              </Button>
            )}
          </Card>
        ) : (
          filteredTeammembers.map((teammember) => (
            <Card key={teammember.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    {teammember.role === 'admin' ? (
                      <Shield className="w-6 h-6 text-indigo-600" />
                    ) : (
                      <User className="w-6 h-6 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {teammember.profiles ? (
                        `${teammember.profiles.first_name} ${teammember.profiles.last_name}`
                      ) : (
                        'Profiel niet gevonden'
                      )}
                      {teammember.user_id === user?.id && (
                        <span className="ml-2 text-sm text-gray-500">(jij)</span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {teammember.profiles?.email || 'Geen email'}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Toegevoegd: {formatDate(teammember.joined_at)}
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(teammember.role)}`}>
                        {getRoleText(teammember.role)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {isAdmin && teammember.user_id !== user?.id && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={teammember.role}
                      onChange={(e) => updateTeammemberRole(teammember.id, e.target.value as 'teacher' | 'admin')}
                      className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="teacher">Docent</option>
                      <option value="admin">Beheerder</option>
                    </select>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmModal({
                        isOpen: true,
                        title: 'Teammember verwijderen',
                        message: `Weet je zeker dat je ${teammember.profiles?.first_name} ${teammember.profiles?.last_name} uit de school wilt verwijderen?`,
                        onConfirm: () => {
                          removeTeammember(teammember.id);
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        },
                      })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Verwijderen"
        cancelText="Annuleren"
        variant="danger"
      />
    </div>
  );
}