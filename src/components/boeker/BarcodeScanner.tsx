import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '../ui/Button';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    loadCameras();
    return () => {
      stopScanning();
    };
  }, []);

  const loadCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      if (devices.length > 0) {
        setSelectedCamera(devices[0].id);
      }
    } catch (err) {
      setError('Geen camera gevonden');
    }
  };

  const startScanning = async () => {
    if (!selectedCamera) {
      setError('Selecteer een camera');
      return;
    }

    try {
      setError(null);
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          const cleanIsbn = decodedText.replace(/[^0-9X]/gi, '');
          if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
            onScan(cleanIsbn);
            stopScanning();
          }
        },
        (errorMessage) => {
        }
      );

      setScanning(true);
    } catch (err: any) {
      setError(err.message || 'Kon scanner niet starten');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">ISBN Barcode Scanner</h2>
            <button
              onClick={() => {
                stopScanning();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!scanning && cameras.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecteer Camera
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Camera ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            id="barcode-reader"
            className="w-full bg-gray-100 rounded-lg overflow-hidden"
            style={{ minHeight: '300px' }}
          />

          <div className="mt-4 flex gap-3">
            {!scanning ? (
              <Button onClick={startScanning} disabled={!selectedCamera}>
                <Camera className="w-4 h-4 mr-2" />
                Start Scannen
              </Button>
            ) : (
              <Button variant="secondary" onClick={stopScanning}>
                Stop Scannen
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                stopScanning();
                onClose();
              }}
            >
              Annuleren
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Houd de barcode voor de camera en zorg voor goede belichting. De scanner herkent automatisch EAN-13 barcodes (ISBN).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
