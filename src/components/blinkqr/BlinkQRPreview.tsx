import React, { useState, useEffect } from 'react';
import { getCachedBlinkQR } from '../../utils/blinkQRGenerator';
import { Loader2 } from 'lucide-react';

interface BlinkQRPreviewProps {
  code: string;
  onClick?: () => void;
  className?: string;
}

export function BlinkQRPreview({ code, onClick, className = '' }: BlinkQRPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadQRCode = async () => {
      try {
        setLoading(true);
        setError(false);
        const dataUrl = await getCachedBlinkQR(code, 300);
        if (mounted) {
          setImageUrl(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error generating QR code:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadQRCode();

    return () => {
      mounted = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div
        className={`w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={`w-32 h-32 bg-red-50 rounded-lg flex items-center justify-center ${className}`}
      >
        <span className="text-xs text-red-600">Error</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-md cursor-pointer ${className}`}
      title="Click to download QR code"
    >
      <img
        src={imageUrl}
        alt={`QR Code for ${code}`}
        className="w-full h-full object-contain bg-white"
      />
    </button>
  );
}
