import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const { error } = await resetPassword(email);

    if (error) {
      console.error('Password reset error:', error);

      if (error.message?.includes('No API key found')) {
        setError('Er is een configuratieprobleem met de authenticatie service. Neem contact op met de beheerder.');
      } else if (error.message?.includes('timeout') || error.status === 504) {
        setError('De aanvraag duurde te lang. Controleer je internetverbinding en probeer het opnieuw.');
      } else if (error.message?.includes('User not found')) {
        setError('Er bestaat geen account met dit e-mailadres.');
      } else {
        setError(error.message || 'Er is een fout opgetreden. Probeer het later opnieuw.');
      }
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Controleer je e-mail</h1>
          <p className="text-gray-600 mb-6">
            We hebben een wachtwoord herstel link gestuurd naar <strong>{email}</strong>.
            Controleer ook je spam map als je het bericht niet kunt vinden.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar inloggen
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wachtwoord vergeten?</h1>
        <p className="text-gray-600">
          Geen probleem. Voer je e-mailadres in en we sturen je een link om je wachtwoord opnieuw in te stellen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="E-mailadres"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="jouw@email.be"
          autoFocus
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
            {error.includes('configuratieprobleem') && (
              <p className="text-xs text-red-500 mt-2">
                Zorg dat de redirect URL is toegevoegd in Supabase Dashboard → Authentication → URL Configuration
              </p>
            )}
            {error.includes('te lang') && (
              <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                <p className="font-medium text-gray-700 mb-1">Alternatieve oplossing:</p>
                <p>Neem contact op met de beheerder om je wachtwoord handmatig te resetten via Supabase Dashboard → Authentication → Users</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <strong>Let op:</strong> De e-mail service moet correct geconfigureerd zijn in Supabase.
            Als je een timeout error krijgt, vraag de beheerder om SMTP in te stellen via Dashboard → Settings → Authentication → SMTP Settings.
          </p>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Stuur herstel link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/auth"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar inloggen
        </Link>
      </div>
    </Card>
  );
}
