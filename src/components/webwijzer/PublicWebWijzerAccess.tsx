import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { KeyRound, GraduationCap, Globe, X, RefreshCw, Clapperboard } from 'lucide-react';
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [authenticatedStudent, setAuthenticatedStudent] = useState<{ id: string; name: string; hash?: string } | null>(null);
  // share_code of a printed Videoleren worksheet: after login the student goes straight to that task.
  const [videoleerCode, setVideoleerCode] = useState<string | null>(() => new URLSearchParams(window.location.search).get('vl'));
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

  const startScanner = async (facing: 'user' | 'environment' = facingMode) => {
    if (scannerRef.current || startingRef.current) return;
    startingRef.current = true;
    setCameraError('');
    try {
      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: facing },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          try {
            const url = new URL(decodedText);
            const hash = url.searchParams.get('h');
            const vl = url.searchParams.get('vl');
            if (hash) { stopScanner(); authenticateWithHash(hash); }
            else if (vl) setVideoleerCode(vl); // worksheet QR: keep scanning for the student's own card
          } catch { /* not a URL */ }
        },
        () => { /* ignore decode errors */ }
      );
      setScannerStarted(true);
      startingRef.current = false;
    } catch {
      startingRef.current = false;
      // If front camera fails, try back camera as fallback
      if (facing === 'user') {
        startingRef.current = false;
        setFacingMode('environment');
        startScanner('environment');
      } else {
        setCameraError('Camera niet beschikbaar. Gebruik de code om in te loggen.');
      }
    }
  };

  const switchCamera = async () => {
    if (switchingCamera) return;
    setSwitchingCamera(true);
    const next: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user';
    await stopScanner();
    setFacingMode(next);
    // Small delay to let the DOM element reset
    await new Promise(r => setTimeout(r, 150));
    await startScanner(next);
    setSwitchingCamera(false);
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
      const { data: rows, error: rpcError } = await supabase.rpc('authenticate_student_by_hash', { p_hash: hash });
      if (rpcError) throw rpcError;
      const data = Array.isArray(rows) ? rows[0] : rows;
      if (!data) { setCameraError('Ongeldige of verlopen QR-code. Gebruik de code om in te loggen.'); return; }
      await supabase.rpc('webwijzer_log_access', { p_hash: data.access_hash, p_method: 'qr' });
      setAuthenticatedStudent({ id: data.id, name: data.first_name, hash: data.access_hash });
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
      // The PIN is checked on the server; the browser never sees it.
      const code = studentCode.toUpperCase();
      const { data: rows, error: rpcError } = await supabase.rpc('authenticate_student_by_code', { p_code: code, p_pin: pinCode });
      if (rpcError) throw rpcError;
      const data = Array.isArray(rows) ? rows[0] : rows;
      if (!data) {
        // Tell the student which part was wrong, as before.
        const { data: check } = await supabase.rpc('lookup_student_by_code', { p_code: code, p_pin: pinCode });
        const status = (Array.isArray(check) ? check[0] : check)?.status;
        setError(status === 'not_found' ? 'Ongeldige studentcode' : 'Ongeldige pincode');
        return;
      }
      await supabase.rpc('webwijzer_log_access', { p_hash: data.access_hash, p_method: 'manual' });
      setAuthenticatedStudent({ id: data.id, name: data.first_name, hash: data.access_hash });
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
    return (
      <StudentWebWijzer
        studentId={authenticatedStudent.id}
        studentName={authenticatedStudent.name}
        accessHash={authenticatedStudent.hash}
        openVideoleerCode={videoleerCode ?? undefined}
        onStop={handleStop}
      />
    );
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
          {videoleerCode && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4" role="status">
              <Clapperboard className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                <b>Je videoleertaak staat klaar.</b> Scan nu je eigen QR-kaart of log in met je code, dan open je meteen de taak.
              </p>
            </div>
          )}
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
                  onClick={() => { setCameraError(''); startScanner(facingMode); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Opnieuw proberen
                </button>
              </div>
            ) : (
              <div className="relative">
                <div id={scannerIdRef.current} className="w-full" />
                {scannerStarted && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Camera actief — richt op je QR-code
                    </p>
                    <button
                      onClick={switchCamera}
                      disabled={switchingCamera}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors disabled:opacity-50"
                      title={facingMode === 'user' ? 'Schakel naar achtercamera' : 'Schakel naar voorcamera'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${switchingCamera ? 'animate-spin' : ''}`} />
                      {facingMode === 'user' ? 'Achtercamera' : 'Voorcamera'}
                    </button>
                  </div>
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
