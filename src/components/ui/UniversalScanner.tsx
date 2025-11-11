import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UniversalScannerProps {
  onStudentScan?: (accessHash: string) => void;
  onBookScan?: (isbn: string) => void;
  onMaterialScan?: (blinkCode: string) => void;
  onError?: (error: string) => void;
  scanningFor: 'student' | 'book' | 'material' | 'student-book' | 'all';
}

export function UniversalScanner({
  onStudentScan,
  onBookScan,
  onMaterialScan,
  onError,
  scanningFor
}: UniversalScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const initializingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    initScanner();

    return () => {
      console.log('UniversalScanner cleanup - stopping scanner');
      isMountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            console.log('Scanner stopped successfully');
            if (scannerRef.current) {
              scannerRef.current.clear();
              scannerRef.current = null;
            }
          })
          .catch((err) => {
            console.error('Error stopping scanner:', err);
            // Try to clear anyway
            if (scannerRef.current) {
              try {
                scannerRef.current.clear();
                scannerRef.current = null;
              } catch (e) {
                console.error('Error clearing scanner:', e);
              }
            }
          });
      }
      initializingRef.current = false;
    };
  }, []);

  const initScanner = async () => {
    if (scannerRef.current) return;

    try {
      const scannerId = 'universal-scanner';
      scannerRef.current = new Html5Qrcode(scannerId);
      await startScanning();
    } catch (err) {
      console.error('Error initializing scanner:', err);
      if (onError) onError('Fout bij initialiseren scanner');
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
      if (onError) onError('Fout bij starten scanner');
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

  const extractBlinkCode = (scannedData: string): string | null => {
    try {
      const blinkQRPattern = /blinkqr\.app\/qr\/([A-Z0-9]+)/i;
      const match = scannedData.match(blinkQRPattern);
      if (match) {
        return match[1].toUpperCase();
      }
    } catch (err) {
      console.error('Error extracting BlinkQR code:', err);
    }
    return null;
  };

  const handleScan = (scannedData: string) => {
    if (!isMountedRef.current) {
      console.log('Scanner unmounted, ignoring scan:', scannedData);
      return;
    }

    console.log('Universal scanner received:', scannedData);

    const isISBN = /^(978|979)\d{10}$/.test(scannedData) || /^\d{9}[\dX]$/.test(scannedData);
    const accessHash = extractAccessHash(scannedData);
    const blinkCode = extractBlinkCode(scannedData);

    console.log('Detection results:', {
      isISBN,
      hasAccessHash: !!accessHash,
      hasBlinkCode: !!blinkCode,
      scanningFor
    });

    if (isISBN && onBookScan && (scanningFor === 'book' || scanningFor === 'student-book' || scanningFor === 'all')) {
      if (!isMountedRef.current) return;
      console.log('Calling onBookScan with ISBN:', scannedData);
      onBookScan(scannedData);
      return;
    }

    if (accessHash && onStudentScan && (scanningFor === 'student' || scanningFor === 'student-book' || scanningFor === 'all')) {
      if (!isMountedRef.current) return;
      console.log('Calling onStudentScan with hash:', accessHash);
      onStudentScan(accessHash);
      return;
    }

    if (blinkCode && scanningFor === 'student' && onStudentScan) {
      if (!isMountedRef.current) return;
      console.log('Calling onStudentScan with BlinkCode:', blinkCode);
      onStudentScan(blinkCode);
      return;
    }

    if (blinkCode && onMaterialScan && (scanningFor === 'material' || scanningFor === 'all')) {
      if (!isMountedRef.current) return;
      console.log('Calling onMaterialScan with code:', blinkCode);
      onMaterialScan(blinkCode);
      return;
    }

    if (onError && isMountedRef.current) {
      if (scanningFor === 'student') {
        onError('Geen geldige leerling QR-code');
      } else if (scanningFor === 'book') {
        onError('Geen geldige ISBN barcode');
      } else if (scanningFor === 'material') {
        onError('Geen geldige BlinkQR code');
      } else {
        onError('Geen geldige code herkend');
      }
    }
  };

  const getScanMessage = () => {
    switch (scanningFor) {
      case 'student':
        return 'Scan leerling QR-code';
      case 'book':
        return 'Scan boek barcode (ISBN)';
      case 'material':
        return 'Scan BlinkQR code van materiaal';
      case 'student-book':
        return 'Scan leerling QR-code of boek barcode';
      case 'all':
        return 'Scan QR-code (leerling, boek, of materiaal)';
      default:
        return 'Scan QR-code';
    }
  };

  return (
    <div className="space-y-2">
      <div id="universal-scanner" className="rounded-lg overflow-hidden max-w-md mx-auto" style={{ maxHeight: '300px' }} />
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {getScanMessage()}
        </p>
      </div>
    </div>
  );
}
