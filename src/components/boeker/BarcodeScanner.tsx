import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '../ui/Button';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [starting, setStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const idRef = useRef(`barcode-reader-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    mountedRef.current = true;
    init();
    return () => {
      mountedRef.current = false;
      safeStop();
    };
  }, []);

  const safeStop = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch { /* ignore html5-qrcode DOM cleanup errors */ }
  };

  const init = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!mountedRef.current) return;
      setCameras(devices);
      await startWithCamera(0, devices);
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Geen camera gevonden');
        setStarting(false);
      }
    }
  };

  const startWithCamera = async (index: number, deviceList?: any[]) => {
    const list = deviceList ?? cameras;
    await safeStop();
    if (!mountedRef.current) return;

    setError(null);
    setStarting(true);

    try {
      const scanner = new Html5Qrcode(idRef.current);
      scannerRef.current = scanner;

      const cameraConstraint = list.length > 0
        ? list[index]?.id
        : { facingMode: 'environment' };

      await scanner.start(
        cameraConstraint,
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (!mountedRef.current) return;
          const cleanIsbn = decodedText.replace(/[^0-9X]/gi, '');
          if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
            safeStop().then(() => {
              onScan(cleanIsbn);
              onClose();
            });
          }
        },
        undefined
      );

      if (mountedRef.current) {
        setActiveCameraIndex(index);
        setStarting(false);
      } else {
        try { await scanner.stop(); scanner.clear(); } catch { /* ignore */ }
        scannerRef.current = null;
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Kon camera niet starten');
        setStarting(false);
      }
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const next = (activeCameraIndex + 1) % cameras.length;
    startWithCamera(next);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-#946B29" />
            <h2 className="text-lg font-semibold text-gray-900">ISBN barcode scannen</h2>
          </div>
          <button
            onClick={() => { safeStop(); onClose(); }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative mx-4 mb-4 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
          <div id={idRef.current} className="w-full h-full" />

          {/* Overlay: aim guide */}
          {!error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className="border-2 border-white/70 rounded-lg"
                style={{ width: '72%', height: '38%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
              >
                {/* Corner accents */}
                <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-amber-500 rounded-tl-md" />
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-amber-500 rounded-tr-md" />
                <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-amber-500 rounded-bl-md" />
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-amber-500 rounded-br-md" />
                {/* Scan line */}
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500/80 animate-pulse" />
              </div>
            </div>
          )}

          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center text-white space-y-2">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm">Camera starten...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
              <div className="text-center text-white space-y-3">
                <Camera className="w-10 h-10 mx-auto opacity-50" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={() => startWithCamera(activeCameraIndex)}
                  className="text-xs underline opacity-75 hover:opacity-100"
                >
                  Opnieuw proberen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 space-y-3">
          <p className="text-center text-sm text-gray-500">
            Houd de barcode van het boek voor de camera
          </p>

          <div className="flex gap-2">
            {cameras.length > 1 && (
              <Button
                variant="secondary"
                onClick={switchCamera}
                className="flex-1"
                disabled={starting}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Camera wisselen
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => { safeStop(); onClose(); }}
              className="flex-1"
            >
              Annuleren
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
