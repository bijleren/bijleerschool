import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { Button } from '../ui/Button';

interface QRScannerProps {
  onScanSuccess: (url: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, isVisible, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState(false);

  useEffect(() => {
    const initScanner = async () => {
      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('qr-reader');
        }

        if (!isScanning) {
          await startScanning();
        }
      } catch (err) {
        console.error('Error initializing scanner:', err);
        setError('Kon camera niet starten');
      }
    };

    initScanner();

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current || isScanning) return;

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          if (!scanCooldown && decodedText !== lastScan) {
            setLastScan(decodedText);
            setScanCooldown(true);
            onScanSuccess(decodedText);

            setTimeout(() => {
              setScanCooldown(false);
            }, 1500);
          }
        },
        () => {
          // Error callback - ignore, happens frequently
        }
      );
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Kon camera niet starten. Controleer de rechten.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
      style={{ zIndex: isVisible ? 50 : -1 }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">QR-code Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={startScanning}>Opnieuw proberen</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
              <div className="text-center text-sm text-gray-600">
                <p>Scan een WebWijzer QR-code om een leerling te identificeren</p>
                {scanCooldown && (
                  <p className="text-green-600 mt-2 font-medium">✓ QR-code gescand!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
