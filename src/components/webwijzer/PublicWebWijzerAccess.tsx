import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { KeyRound, GraduationCap, Globe, X } from 'lucide-react';
import { StudentWebWijzer } from './StudentWebWijzer';
import { Html5Qrcode } from 'html5-qrcode';

export function PublicWebWijzerAccess() {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scannerStarted, setScannerStarted] = useState(false);
  const [authenticatedStudent, setAuthenticatedStudent] = useState<{ id: string; name: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const scannerIdRef = useRef(`webwijzer-qr-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = params.get('h');
    if (hash) {
      authenticateWithHash(hash);
    } else {
      startScanner();
    }
    return () => { stopScanner(); };
  }, []);

  const startScanner = async () => {
    if (scannerRef.current || startingRef.current) return;
    startingRef.current = true;
    setCameraError('');
    try {
      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          try {
            const url = new URL(decodedText);
            const hash = url.searchParams.get('h');
            if (hash) { stopScanner(); authenticateWithHash(hash); }
          } catch { /* not a URL */ }
        },
        () => { /* ignore decode errors */ }
      );
      setScannerStarted(true);
      startingRef.current = false;
    } catch {
      startingRef.current = false;
      setCameraError('Camera niet beschikbaar. Gebruik de code om in te loggen.');
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    setScannerStarted(false);
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch { /* ignore DOM cleanup errors */ }
  };

  const authenticateWithHash = async (hash: string) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('students')
        .select('id, first_name, access_hash')
        .eq('access_hash', hash)
        .eq('is_active', true)
        .maybeSingle();
      if (queryError) throw queryError;
      if (!data) { setCameraError('Ongeldige of verlopen QR-code. Gebruik de code om in te loggen.'); return; }
      await supabase.from('webwijzer_access_log').insert({ student_id: data.id, access_method: 'qr' });
      setAuthenticatedStudent({ id: data.id, name: data.first_name });
    } catch {
      setCameraError('Inloggen mislukt. Probeer de code methode.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('students')
        .select('id, first_name, pin_code')
        .eq('student_code', studentCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (queryError) throw queryError;
      if (!data) { setError('Ongeldige studentcode'); return; }
      if (data.pin_code !== pinCode) { setError('Ongeldige pincode'); return; }
      await supabase.from('webwijzer_access_log').insert({ student_id: data.id, access_method: 'manual' });
      setAuthenticatedStudent({ id: data.id, name: data.first_name });
    } catch {
      setError('Inloggen mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    window.location.replace('/webwijzer');
  };

  if (authenticatedStudent) {
    return <StudentWebWijzer studentId={authenticatedStudent.id} studentName={authenticatedStudent.name} onStop={handleStop} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Je WebWijzer wordt geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav — matches bijleer.school style */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">bijleer.school</span>
            </Link>

            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-700">WebWijzer</span>
            </div>

            <button
              onClick={() => { setShowCodeModal(true); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Log in met code</span>
              <span className="sm:hidden">Code</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Scan je QR-code</h1>
            <p className="text-gray-500 text-sm">Richt je camera op de QR-code van je leerkracht</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {cameraError ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm mb-4">{cameraError}</p>
                <button
                  onClick={() => startScanner()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Opnieuw proberen
                </button>
              </div>
            ) : (
              <div>
                <div id={scannerIdRef.current} className="w-full" />
                {scannerStarted && (
                  <p className="text-center text-xs text-gray-400 py-3 border-t border-gray-100">
                    Camera actief — richt op je QR-code
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Geen QR-code bij de hand?{' '}
            <button
              onClick={() => { setShowCodeModal(true); setError(''); }}
              className="text-blue-600 hover:text-blue-700 font-medium underline-offset-2 hover:underline"
            >
              Log in met code
            </button>
          </p>
        </div>
      </div>

      {/* Info — full width at bottom */}
      <div className="bg-white border-t border-gray-200 px-4 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Wat is de WebWijzer?</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              De WebWijzer geeft je toegang tot alle leermaterialen die je leerkracht voor jou heeft klaargezet — video's, bestanden of websites.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Hoe werkt het?</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Scan de QR-code die je van je leerkracht hebt gekregen, of klik op "Log in met code" rechtsboven en voer je studentcode en pincode in.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Veiligheid</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Je QR-code en pincode zijn persoonlijk. Deel ze niet met anderen. Heb je problemen? Vraag hulp aan je leerkracht.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Problemen?</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Werkt de camera niet? Gebruik dan de code-knop rechtsboven. Werkt de code ook niet? Vraag je leerkracht om de code te controleren.
            </p>
          </div>
        </div>
      </div>

      {/* Code login modal */}
      {showCodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => { setShowCodeModal(false); setError(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Sluit venster"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Log in met code</h2>
              <p className="text-sm text-gray-500 mt-0.5">Voer je studentcode en pincode in</p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <Input
                label="Studentcode"
                value={studentCode}
                onChange={(e) => { setStudentCode(e.target.value.toUpperCase()); setError(''); }}
                placeholder="bijv. ABC12345"
                maxLength={8}
                required
                className="text-center text-xl font-mono tracking-widest"
                autoComplete="username"
                autoFocus
              />
              <Input
                label="Pincode"
                type="password"
                value={pinCode}
                onChange={(e) => { setPinCode(e.target.value); setError(''); }}
                placeholder="4-cijferige pincode"
                maxLength={4}
                required
                className="text-center text-xl font-mono tracking-widest"
                autoComplete="current-password"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Controleren...' : 'Toegang tot WebWijzer'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
