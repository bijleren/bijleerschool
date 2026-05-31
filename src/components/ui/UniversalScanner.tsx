import React, { useEffect, useRef } from 'react';
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
  const isRunningRef = useRef(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  // Unique ID per mount to avoid stale DOM references across remounts
  const idRef = useRef(`universal-scanner-${Math.random().toString(36).slice(2)}`);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    initScanner();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    isRunningRef.current = false;
    if (isRunningRef.current) return; // already stopped via flag above
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Ignore DOM cleanup errors from html5-qrcode
    }
  };

  const initScanner = async () => {
    try {
      const scanner = new Html5Qrcode(idRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (!mountedRef.current) return;
          const now = Date.now();
          if (processingRef.current) return;
          if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 5000) return;

          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;
          processingRef.current = true;
          handleScan(decodedText);
          setTimeout(() => { processingRef.current = false; }, 3000);
        },
        undefined
      );

      if (mountedRef.current) {
        isRunningRef.current = true;
      } else {
        // Unmounted before start completed
        try { await scanner.stop(); scanner.clear(); } catch { /* ignore */ }
        scannerRef.current = null;
      }
    } catch (err) {
      if (mountedRef.current && onError) {
        onError('Fout bij starten scanner');
      }
    }
  };

  const extractAccessHash = (scannedData: string): string | null => {
    try {
      if (scannedData.includes('bijleer.school/webwijzer?h=')) {
        const url = new URL(scannedData);
        const hash = url.searchParams.get('h');
        if (hash) return decodeURIComponent(hash);
      }
      if (scannedData.length >= 32 && /^[a-zA-Z0-9+/=]+$/.test(scannedData)) {
        return scannedData;
      }
    } catch { /* ignore */ }
    return null;
  };

  const extractBlinkCode = (scannedData: string): string | null => {
    try {
      const match = scannedData.match(/blinkqr\.app\/qr\/([A-Z0-9]+)/i);
      if (match) return match[1].toUpperCase();
    } catch { /* ignore */ }
    return null;
  };

  const handleScan = (scannedData: string) => {
    const isISBN = /^(978|979)\d{10}$/.test(scannedData) || /^\d{9}[\dX]$/.test(scannedData);
    const accessHash = extractAccessHash(scannedData);
    const blinkCode = extractBlinkCode(scannedData);

    if (isISBN && onBookScan && (scanningFor === 'book' || scanningFor === 'student-book' || scanningFor === 'all')) {
      onBookScan(scannedData);
      return;
    }
    if (accessHash && onStudentScan && (scanningFor === 'student' || scanningFor === 'student-book' || scanningFor === 'all')) {
      onStudentScan(accessHash);
      return;
    }
    if (blinkCode && scanningFor === 'student' && onStudentScan) {
      onStudentScan(blinkCode);
      return;
    }
    if (blinkCode && onMaterialScan && (scanningFor === 'material' || scanningFor === 'all')) {
      onMaterialScan(blinkCode);
      return;
    }
    if (onError) {
      if (scanningFor === 'student') onError('Geen geldige leerling QR-code');
      else if (scanningFor === 'book') onError('Geen geldige ISBN barcode');
      else if (scanningFor === 'material') onError('Geen geldige BlinkQR code');
      else onError('Geen geldige code herkend');
    }
  };

  const getScanMessage = () => {
    switch (scanningFor) {
      case 'student': return 'Scan leerling QR-code';
      case 'book': return 'Scan boek barcode (ISBN)';
      case 'material': return 'Scan BlinkQR code van materiaal';
      case 'student-book': return 'Scan leerling QR-code of boek barcode';
      case 'all': return 'Scan QR-code (leerling, boek, of materiaal)';
      default: return 'Scan QR-code';
    }
  };

  return (
    <div className="space-y-2">
      <div id={idRef.current} className="rounded-lg overflow-hidden max-w-md mx-auto" style={{ maxHeight: '300px' }} />
      <div className="text-center">
        <p className="text-sm text-gray-600">{getScanMessage()}</p>
      </div>
    </div>
  );
}
