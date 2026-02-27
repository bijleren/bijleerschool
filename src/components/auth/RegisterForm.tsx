import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 karakters lang zijn');
      setLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError('Gelieve de algemene voorwaarden en het privacybeleid te aanvaarden');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, firstName, lastName);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account aangemaakt!</h2>
          <p className="text-gray-600 mb-6">
            Je account is succesvol aangemaakt. Controleer je e-mail (ook de spam map) voor een bevestigingslink voordat je inlogt.
          </p>
          <Button onClick={onToggleMode} className="w-full">
            Ga naar inloggen
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account aanmaken</h1>
        <p className="text-gray-600">Maak je bijleer.school account aan</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Voornaam"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="Jan"
          />
          <Input
            label="Achternaam"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            placeholder="Jansen"
          />
        </div>

        <Input
          label="E-mailadres"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="jouw@email.nl"
        />

        <Input
          label="Wachtwoord"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          helperText="Minimaal 6 karakters"
        />

        <Input
          label="Bevestig wachtwoord"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="••••••••"
        />

        <div className="flex items-start gap-3">
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
          />
          <label htmlFor="accept-terms" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
            Ik ga akkoord met de{' '}
            <Link
              to="/algemene-voorwaarden"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              algemene voorwaarden
            </Link>{' '}
            en het{' '}
            <Link
              to="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              privacybeleid
            </Link>{' '}
            van bijleer.school.
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
          disabled={!acceptedTerms}
        >
          Account aanmaken
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Al een account?{' '}
          <button
            onClick={onToggleMode}
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Log hier in
          </button>
        </p>
      </div>
    </Card>
  );
}
