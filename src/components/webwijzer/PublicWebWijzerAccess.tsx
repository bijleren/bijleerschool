import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { QrCode, KeyRound, Camera, GraduationCap } from 'lucide-react';
import { StudentWebWijzer } from './StudentWebWijzer';
import { Html5Qrcode } from 'html5-qrcode';

export function PublicWebWijzerAccess() {
  const [accessMethod, setAccessMethod] = useState<'code' | 'qr' | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authenticatedStudent, setAuthenticatedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = params.get('h');

    if (hash) {
      authenticateWithHash(hash);
    }
  }, []);

  useEffect(() => {
    if (accessMethod === 'qr' && !scannerStarted) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [accessMethod]);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const url = new URL(decodedText);
          const hash = url.searchParams.get('h');
          if (hash) {
            stopScanner();
            authenticateWithHash(hash);
          }
        },
        (errorMessage) => {
          // Ignore decode errors, they happen frequently during scanning
        }
      );

      setScannerStarted(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
      setScannerStarted(false);
    }
  };

  const authenticateWithHash = async (hash: string) => {
    setLoading(true);
    setError('');

    try {
      const { data, error: queryError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_code, access_hash')
        .eq('access_hash', hash)
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) throw queryError;

      if (!data) {
        setError('Invalid or expired QR code. Please try entering your code manually.');
        setAccessMethod('code');
        return;
      }

      await supabase
        .from('webwijzer_access_log')
        .insert({
          student_id: data.id,
          access_method: 'qr',
        });

      setAuthenticatedStudent({
        id: data.id,
        name: data.first_name,
      });
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Failed to authenticate');
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
        .select('id, first_name, last_name, pin_code')
        .eq('student_code', studentCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) throw queryError;

      if (!data) {
        setError('Invalid student code');
        return;
      }

      if (data.pin_code !== pinCode) {
        setError('Invalid PIN code');
        return;
      }

      await supabase
        .from('webwijzer_access_log')
        .insert({
          student_id: data.id,
          access_method: 'manual',
        });

      setAuthenticatedStudent({
        id: data.id,
        name: data.first_name,
      });
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  if (authenticatedStudent) {
    return (
      <StudentWebWijzer
        studentId={authenticatedStudent.id}
        studentName={authenticatedStudent.name}
      />
    );
  }

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="text-center p-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your WebWijzer...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">WebWijzer</h1>
          <p className="text-gray-600">Access your learning content</p>
        </div>

        <Link
          to="/"
          className="fixed top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow text-sm font-medium"
        >
          <GraduationCap className="w-4 h-4" />
          <span>Terug naar home</span>
        </Link>

        {!accessMethod ? (
          <div className="space-y-4">
            <Card className="p-8 text-center hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setAccessMethod('qr')}>
              <QrCode className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan QR Code</h2>
              <p className="text-gray-600">Use your camera to scan your personal QR code</p>
            </Card>

            <Card className="p-8 text-center hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setAccessMethod('code')}>
              <KeyRound className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Code</h2>
              <p className="text-gray-600">Type your student code and PIN</p>
            </Card>
          </div>
        ) : accessMethod === 'qr' ? (
          <Card>
            <div className="text-center mb-6">
              <Camera className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan Your QR Code</h2>
              <p className="text-gray-600 mb-4">Position your QR code in front of the camera</p>
            </div>

            <div id="qr-reader" className="mb-6 rounded-lg overflow-hidden"></div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <p className="text-sm text-gray-600 text-center mb-4">
              Don't have your QR code? Ask your teacher for help.
            </p>

            <Button
              variant="secondary"
              onClick={() => {
                stopScanner();
                setAccessMethod(null);
                setError('');
              }}
              className="w-full"
            >
              Back
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="text-center mb-6">
              <KeyRound className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Code</h2>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <Input
                label="Student Code"
                value={studentCode}
                onChange={(e) => {
                  setStudentCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="e.g., ABC12345"
                maxLength={8}
                required
                className="text-center text-2xl font-mono tracking-wider"
              />

              <Input
                label="PIN Code"
                type="password"
                value={pinCode}
                onChange={(e) => {
                  setPinCode(e.target.value);
                  setError('');
                }}
                placeholder="Enter your 4-digit PIN"
                maxLength={4}
                required
                className="text-center text-2xl font-mono tracking-wider"
              />

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Checking...' : 'Access WebWijzer'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAccessMethod(null)} className="w-full">
                  Back
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
