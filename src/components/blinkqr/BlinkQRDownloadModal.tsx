import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { generateBlinkQRImage, downloadBlinkQR, BlinkQRSize } from '../../utils/blinkQRGenerator';

interface BlinkQRDownloadModalProps {
  code: string;
  title: string;
  onClose: () => void;
}

interface SizeOption {
  size: BlinkQRSize;
  width: number;
  height: number;
  label: string;
}

const SIZE_OPTIONS: SizeOption[] = [
  { size: 300, width: 300, height: 315, label: 'Klein' },
  { size: 600, width: 600, height: 630, label: 'Normaal' },
  { size: 1200, width: 1200, height: 1260, label: 'Groot' },
  { size: 2400, width: 2400, height: 2520, label: 'Extra Groot' },
];

export function BlinkQRDownloadModal({ code, title, onClose }: BlinkQRDownloadModalProps) {
  const [selectedSize, setSelectedSize] = useState<BlinkQRSize>(600);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [selectedSize, code]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const dataUrl = await generateBlinkQRImage(code, selectedSize, 'dataUrl') as string;
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!previewUrl) return;

    try {
      setDownloading(true);
      downloadBlinkQR(code, selectedSize, previewUrl);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleViewFullSize = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Download BlinkQR Code</h2>
              <p className="text-sm text-gray-600 mt-1">{title}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">{code}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecteer Grootte</h3>
              <div className="space-y-3">
                {SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.size}
                    onClick={() => setSelectedSize(option.size)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedSize === option.size
                        ? 'border-#946B29 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {option.width} × {option.height} pixels
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Geschikt voor {option.size <= 300 ? 'web' : option.size <= 600 ? 'social media' : option.size <= 1200 ? 'print (A5/A4)' : 'print (groot formaat)'}
                        </p>
                      </div>
                      {selectedSize === option.size && (
                        <div className="w-5 h-5 bg-#946B29 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleDownload}
                  disabled={loading || !previewUrl || downloading}
                  className="w-full"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloaden...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PNG
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleViewFullSize}
                  disabled={loading || !previewUrl}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Volledig scherm
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Voorbeeld</h3>
              <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center min-h-[400px]">
                {loading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-#946B29 animate-spin mb-3" />
                    <p className="text-sm text-gray-600">Genereren...</p>
                  </div>
                ) : previewUrl ? (
                  <div className="w-full flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt={`QR Code preview - ${selectedSize}px`}
                      className="max-w-full max-h-[500px] object-contain border-2 border-gray-200 rounded-lg shadow-lg bg-white"
                      style={{ maxWidth: '100%' }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Geen voorbeeld beschikbaar</p>
                )}
              </div>

              <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                <h4 className="text-sm font-semibold text-#3D2B10 mb-2">Tips voor gebruik:</h4>
                <ul className="text-xs text-#5C4118 space-y-1">
                  <li>• Klein (300px): Perfect voor websites en digitale displays</li>
                  <li>• Normaal (600px): Ideaal voor social media posts</li>
                  <li>• Groot (1200px): Optimaal voor A5/A4 prints</li>
                  <li>• Extra Groot (2400px): Beste kwaliteit voor posters en banners</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
