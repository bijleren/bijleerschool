import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('Je e-mailadres is nog niet bevestigd. Controleer je e-mail (ook de spam map) voor de bevestigingslink.');
      } else {
        setError(error.message);
      }
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welkom terug</h1>
        <p className="text-gray-600">Log in op je BijleerSchool account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
        />

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
        >
          Inloggen
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Nog geen account?{' '}
          <button
            onClick={onToggleMode}
            className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Registreer hier
          </button>
        </p>
      </div>
    </Card>
  );
}