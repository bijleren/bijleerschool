import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
  const [verifying, setVerifying] = useState(true);
  const [hasRecoveryToken, setHasRecoveryToken] = useState(false);
  const sessionEstablishedRef = useRef(false);

  const { updatePassword, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for recovery token on mount and manually process if needed
  useEffect(() => {
    const processRecoveryToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type') || searchParams.get('type');
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const code = searchParams.get('code');

      console.log('Reset password page loaded', {
        type,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasCode: !!code,
        hasSession: !!session,
        authLoading,
        hash: window.location.hash,
        search: window.location.search
      });

      if ((code || accessToken || type === 'recovery') && !session) {
        setHasRecoveryToken(true);
        console.log('Recovery token detected, waiting for Supabase to establish session...');

        // Set timeout to show error if session doesn't establish
        const timeout = setTimeout(() => {
          if (!sessionEstablishedRef.current) {
            console.log('Timeout: Session not established after 15 seconds');
            setVerifying(false);
            setError('De sessie kon niet worden gestart. Dit kan gebeuren als de link verlopen is. Vraag een nieuwe link aan.');
          }
        }, 15000);

        return () => clearTimeout(timeout);
      } else if (session) {
        // Session already exists
        console.log('Session already established');
        setHasRecoveryToken(true);
        sessionEstablishedRef.current = true;
        setVerifying(false);
        setError('');
      } else {
        console.log('No recovery token or session found');
        setHasRecoveryToken(false);
        setVerifying(false);
        setError('Ongeldige of verlopen wachtwoord herstel link. Vraag een nieuwe aan.');
      }
    };

    processRecoveryToken();
  }, []);

  // Handle session establishment
  useEffect(() => {
    if (session && hasRecoveryToken && !sessionEstablishedRef.current) {
      console.log('Session established, ready for password reset');
      sessionEstablishedRef.current = true;
      setVerifying(false);
      setError('');
    } else if (!authLoading && hasRecoveryToken && !session && !sessionEstablishedRef.current) {
      // AuthContext finished loading but no session was established
      console.log('AuthContext loading complete but no session found');
    }
  }, [session, hasRecoveryToken, authLoading]);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate('/auth');
    }
  }, [success, countdown, navigate]);

  useEffect(() => {
    calculatePasswordStrength(password);
  }, [password]);

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) {
      setPasswordStrength({ score: 0, text: '', color: '' });
      return;
    }

    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;

    if (score <= 2) {
      setPasswordStrength({ score, text: 'Zwak', color: 'text-red-600' });
    } else if (score <= 3) {
      setPasswordStrength({ score, text: 'Gemiddeld', color: 'text-orange-600' });
    } else {
      setPasswordStrength({ score, text: 'Sterk', color: 'text-green-600' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 karakters bevatten');
      setLoading(false);
      return;
    }

    const { error } = await updatePassword(password);

    if (error) {
      setError(error.message);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Wachtwoord succesvol gewijzigd!</h1>
          <p className="text-gray-600 mb-6">
            Je wachtwoord is succesvol gewijzigd. Je wordt over {countdown} seconden doorgestuurd naar de inlogpagina.
          </p>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Nu inloggen
          </Button>
        </div>
      </Card>
    );
  }

  if (verifying) {
    return (
      <Card className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-#946B29 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link wordt geverifieerd...</h1>
          <p className="text-gray-600 mb-6">
            Een moment geduld terwijl we je wachtwoord herstel link controleren.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29 mx-auto"></div>
        </div>
      </Card>
    );
  }

  if (error && !password) {
    return (
      <Card className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link verlopen of ongeldig</h1>
          <p className="text-gray-600 mb-6">
            Deze wachtwoord herstel link is verlopen of ongeldig. Vraag een nieuwe aan.
          </p>
          <Button onClick={() => navigate('/forgot-password')} className="w-full">
            Nieuwe link aanvragen
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
          <Lock className="w-6 h-6 text-#946B29" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nieuw wachtwoord instellen</h1>
        <p className="text-gray-600">
          Voer je nieuwe wachtwoord in. Zorg dat het veilig en sterk is.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="relative">
            <Input
              label="Nieuw wachtwoord"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimaal 8 karakters"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Wachtwoord sterkte:</span>
                <span className={`text-sm font-medium ${passwordStrength.color}`}>
                  {passwordStrength.text}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    passwordStrength.score <= 2
                      ? 'bg-red-500'
                      : passwordStrength.score <= 3
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <Input
            label="Bevestig wachtwoord"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Herhaal je wachtwoord"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-#74531F font-medium mb-1">Tips voor een sterk wachtwoord:</p>
          <ul className="text-sm text-#946B29 space-y-1">
            <li>• Minimaal 8 karakters lang</li>
            <li>• Combinatie van hoofd- en kleine letters</li>
            <li>• Bevat cijfers en speciale tekens</li>
          </ul>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Wachtwoord wijzigen
        </Button>
      </form>
    </Card>
  );
}
