import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UnifiedScannerProps {
  onStudentScan?: (accessHash: string) => void;
  onBookScan?: (isbn: string) => void;
  onError: (error: string) => void;
  scanningFor: 'student' | 'book' | 'both';
}

export function UnifiedScanner({ onStudentScan, onBookScan, onError, scanningFor }: UnifiedScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const initializingRef = useRef(false);

  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    initScanner();

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          })
          .catch((err) => console.error('Error stopping scanner:', err));
      }
      initializingRef.current = false;
    };
  }, []);

  const initScanner = async () => {
    if (scannerRef.current) return;

    try {
      const scannerId = 'unified-scanner';
      scannerRef.current = new Html5Qrcode(scannerId);
      await startScanning();
    } catch (err) {
      console.error('Error initializing scanner:', err);
      onError('Fout bij initialiseren scanner');
      initializingRef.current = false;
    }
  };

  const startScanning = async () => {
    if (!scannerRef.current || isScanning) return;

    try {
      setIsScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 2000) {
            return;
          }

          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;

          handleScan(decodedText);
        },
        undefined
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setIsScanning(false);
      initializingRef.current = false;
      onError('Fout bij starten scanner');
    }
  };

  const extractAccessHash = (scannedData: string): string | null => {
    try {
      if (scannedData.includes('bijleer.school/webwijzer?h=')) {
        const url = new URL(scannedData);
        const hash = url.searchParams.get('h');
        if (hash) {
          return decodeURIComponent(hash);
        }
      }

      if (scannedData.length >= 32 && /^[a-zA-Z0-9+/=]+$/.test(scannedData)) {
        return scannedData;
      }
    } catch (err) {
      console.error('Error extracting access hash:', err);
    }
    return null;
  };

  const handleScan = (scannedData: string) => {
    const isISBN = /^(978|979)\d{10}$/.test(scannedData) || /^\d{9}[\dX]$/.test(scannedData);
    const accessHash = extractAccessHash(scannedData);

    if (accessHash && onStudentScan) {
      onStudentScan(accessHash);
      return;
    }

    if (isISBN && onBookScan) {
      onBookScan(scannedData);
      return;
    }

    if (scanningFor === 'student') {
      onError('Geen geldige leerling QR-code');
    } else if (scanningFor === 'book') {
      onError('Geen geldige ISBN barcode');
    }
  };

  return (
    <div className="space-y-2">
      <div id="unified-scanner" className="rounded-lg overflow-hidden max-w-md mx-auto" style={{ maxHeight: '300px' }} />
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {scanningFor === 'student' && 'Scan leerling QR-code'}
          {scanningFor === 'book' && 'Scan boek barcode (ISBN)'}
          {scanningFor === 'both' && 'Scan leerling QR-code of boek barcode'}
        </p>
      </div>
    </div>
  );
}
