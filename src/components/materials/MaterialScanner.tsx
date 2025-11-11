import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface MaterialScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
}

export function MaterialScanner({ onScan, onError }: MaterialScannerProps) {
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
      const scannerId = 'material-scanner';
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

          console.log('Material scanner received:', decodedText);
          onScan(decodedText);
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

  return (
    <div className="space-y-2">
      <div id="material-scanner" className="rounded-lg overflow-hidden max-w-md mx-auto" style={{ maxHeight: '300px' }} />
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Scan BlinkQR code van materiaal
        </p>
      </div>
    </div>
  );
}
