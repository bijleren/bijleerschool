import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import {
  GraduationCap,
  School,
  Plus,
  Users,
  ArrowRight,
  CheckCircle,
  Building,
  UserPlus,
  LogOut,
  Copy,
  Check,
  Share2
} from 'lucide-react';

interface SchoolOnboardingProps {
  onSchoolConnected: () => void;
}

export function SchoolOnboarding({ onSchoolConnected }: SchoolOnboardingProps) {
  const { user, signOut } = useAuth();
  const [activeStep, setActiveStep] = useState<'choose' | 'join' | 'create'>('choose');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSchoolCode, setCreatedSchoolCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Join school form
  const [schoolCode, setSchoolCode] = useState('');

  // Create school form
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPostalCode, setSchoolPostalCode] = useState('');

  const joinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      // Find the school by code
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('school_code', schoolCode.toUpperCase())
        .single();

      if (schoolError || !school) {
        setMessage('School met deze code niet gevonden. Controleer de code en probeer opnieuw.');
        setLoading(false);
        return;
      }

      // Check if user is already connected to this school
      const { data: existing } = await supabase
        .from('user_schools')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', school.id)
        .maybeSingle();

      if (existing) {
        setMessage('Je bent al verbonden met deze school.');
        setLoading(false);
        return;
      }

      // Join the school
      const { error } = await supabase
        .from('user_schools')
        .insert({
          user_id: user.id,
          school_id: school.id,
          role: 'teacher',
          status: 'approved',
        });

      if (error) throw error;

      setMessage('Succesvol toegevoegd aan de school! Je hebt nu toegang tot alle functies.');
      setSchoolCode('');
      
      // Refresh the parent component after a short delay
      setTimeout(() => {
        onSchoolConnected();
      }, 1500);
    } catch (error) {
      console.error('Error joining school:', error);
      setMessage('Er is een fout opgetreden bij het toevoegen aan de school.');
    } finally {
      setLoading(false);
    }
  };

  const createSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    try {
      // Generate a unique school code
      const generatedSchoolCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create the school
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: schoolName,
          school_code: generatedSchoolCode,
          address: schoolAddress || null,
          city: schoolCity || null,
          postal_code: schoolPostalCode || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (schoolError) throw schoolError;

      // Add user as admin of the school
      const { error: userSchoolError } = await supabase
        .from('user_schools')
        .insert({
          user_id: user.id,
          school_id: school.id,
          role: 'admin',
          status: 'approved',
        });

      if (userSchoolError) throw userSchoolError;

      setCreatedSchoolCode(generatedSchoolCode);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating school:', error);
      setMessage('Er is een fout opgetreden bij het aanmaken van de school.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdSchoolCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleConfirmUnderstand = () => {
    setShowSuccessModal(false);
    onSchoolConnected();
  };

  if (activeStep === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                onClick={signOut}
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Uitloggen
              </Button>
            </div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">School toevoegen</h1>
              <p className="text-gray-600">Voer de schoolcode in om je aan te sluiten</p>
            </div>

            <form onSubmit={joinSchool} className="space-y-6">
              <Input
                label="Schoolcode"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="Voer de 6-cijferige schoolcode in"
                required
                maxLength={6}
                className="text-center text-lg font-mono"
              />

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.includes('succesvol')
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  School toevoegen
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveStep('choose')}
                  className="w-full"
                >
                  Terug
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if (activeStep === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                onClick={signOut}
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Uitloggen
              </Button>
            </div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg">
                <Building className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">School aanmaken</h1>
              <p className="text-gray-600">Maak een nieuwe school aan en word beheerder</p>
            </div>

            <form onSubmit={createSchool} className="space-y-6">
              <Input
                label="Schoolnaam"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
                placeholder="Naam van de school"
              />
              
              <Input
                label="Adres (optioneel)"
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                placeholder="Straatnaam en huisnummer"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Postcode (optioneel)"
                  value={schoolPostalCode}
                  onChange={(e) => setSchoolPostalCode(e.target.value)}
                  placeholder="1234 AB"
                />
                <Input
                  label="Plaats (optioneel)"
                  value={schoolCity}
                  onChange={(e) => setSchoolCity(e.target.value)}
                  placeholder="Amsterdam"
                />
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.includes('succesvol')
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  School aanmaken
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveStep('choose')}
                  className="w-full"
                >
                  Terug
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              onClick={signOut}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl mb-6 shadow-lg">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welkom bij BijleerSchool!</h1>
          <p className="text-xl text-gray-600 mb-2">
            Hallo {user?.user_metadata?.first_name}! 👋
          </p>
          <p className="text-lg text-gray-600">
            Om te beginnen moet je verbinding maken met een school
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Join Existing School */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setActiveStep('join')}>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4 group-hover:bg-blue-200 transition-colors">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">School toevoegen</h2>
              <p className="text-gray-600 mb-6">
                Heb je al een schoolcode? Voeg jezelf toe aan een bestaande school.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Snelle toegang
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Bestaande data
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Teamwerk
                </div>
              </div>
              <div className="mt-6">
                <Button variant="secondary" className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Schoolcode invoeren
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Create New School */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setActiveStep('create')}>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4 group-hover:bg-green-200 transition-colors">
                <Building className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">School aanmaken</h2>
              <p className="text-gray-600 mb-6">
                Start een nieuwe school en word automatisch beheerder.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Volledige controle
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Eigen instellingen
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Team uitnodigen
                </div>
              </div>
              <div className="mt-6">
                <Button className="w-full group-hover:bg-green-700 transition-colors">
                  Nieuwe school starten
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="mt-8 bg-gray-50 border-gray-200">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Hulp nodig?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Schoolcode krijgen:</h4>
                <p>Vraag je schoolbeheerder of collega om de 6-cijferige schoolcode.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Nieuwe school:</h4>
                <p>Perfect voor scholen die nog niet op het platform zitten.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">School succesvol aangemaakt!</h2>
                <p className="text-gray-600">Je school is nu klaar voor gebruik</p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Deel deze code met collega's</h3>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  Collega's kunnen zich registreren op BijleerSchool en tijdens de registratie deze code invoeren om zich aan te sluiten bij jouw school.
                </p>

                <div className="bg-white rounded-lg p-4 border border-blue-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Schoolcode:</span>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {codeCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Gekopieerd!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Kopieer
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-mono font-bold text-gray-900 tracking-wider">
                      {createdSchoolCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-600" />
                  Wat moet je doen?
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span>Deel deze code met je collega's via e-mail, WhatsApp of een ander kanaal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span>Bewaar de code op een veilige plek voor toekomstig gebruik</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Voor je collega's:</h4>
                <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                  <li>Ga naar BijleerSchool en klik op "Registreren"</li>
                  <li>Vul hun persoonlijke gegevens in</li>
                  <li>Voer de schoolcode <span className="font-mono font-bold">{createdSchoolCode}</span> in</li>
                  <li>Klaar! Ze zijn nu verbonden met jouw school</li>
                </ol>
              </div>

              <Button
                onClick={handleConfirmUnderstand}
                className="w-full"
                size="lg"
              >
                Ik begrijp het, ga naar dashboard
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}