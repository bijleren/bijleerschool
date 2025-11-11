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

  useEffect(() => {
    initScanner();

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch((err) => console.error('Error stopping scanner:', err));
      }
    };
  }, []);

  const initScanner = async () => {
    try {
      const scannerId = 'unified-scanner';
      scannerRef.current = new Html5Qrcode(scannerId);
      await startScanning();
    } catch (err) {
      console.error('Error initializing scanner:', err);
      onError('Fout bij initialiseren scanner');
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
          qrbox: { width: 250, height: 250 },
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
      onError('Fout bij starten scanner');
    }
  };

  const handleScan = (scannedData: string) => {
    const isISBN = /^(978|979)\d{10}$/.test(scannedData) || /^\d{9}[\dX]$/.test(scannedData);

    const isAccessHash = scannedData.length >= 32 && /^[a-f0-9]+$/.test(scannedData);

    if (scanningFor === 'student' || scanningFor === 'both') {
      if (isAccessHash) {
        if (onStudentScan) {
          onStudentScan(scannedData);
        }
        return;
      }
    }

    if (scanningFor === 'book' || scanningFor === 'both') {
      if (isISBN) {
        if (onBookScan) {
          onBookScan(scannedData);
        }
        return;
      }
    }

    if (scanningFor === 'both') {
      onError('Code niet herkend als leerling of boek');
    } else if (scanningFor === 'student') {
      onError('Geen geldige leerling QR-code');
    } else {
      onError('Geen geldige ISBN barcode');
    }
  };

  return (
    <div className="space-y-4">
      <div id="unified-scanner" className="rounded-lg overflow-hidden" />
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {scanningFor === 'student' && 'Scan leerling QR-code'}
          {scanningFor === 'book' && 'Scan boek barcode'}
          {scanningFor === 'both' && 'Scan leerling QR-code of boek barcode'}
        </p>
      </div>
    </div>
  );
}
