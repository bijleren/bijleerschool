import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
  title?: string;
}

export function ImageCropper({
  imageFile,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  title = 'Crop Image'
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, [imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

    const container = containerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const scale = Math.min(
        containerRect.width / img.naturalWidth,
        containerRect.height / img.naturalHeight
      ) * 0.8;
      setZoom(scale);

      setCrop({
        x: (containerRect.width - img.naturalWidth * scale) / 2,
        y: (containerRect.height - img.naturalHeight * scale) / 2
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCrop({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - crop.x, y: touch.clientY - crop.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setCrop({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const getCropArea = () => {
    if (!containerRef.current) return { x: 0, y: 0, width: 0, height: 0 };

    const containerRect = containerRef.current.getBoundingClientRect();
    const size = Math.min(containerRect.width, containerRect.height) * 0.7;

    // For square crops (aspectRatio = 1), ensure perfect square
    const width = size;
    const height = aspectRatio === 1 ? size : size / aspectRatio;

    return {
      x: (containerRect.width - width) / 2,
      y: (containerRect.height - height) / 2,
      width,
      height
    };
  };

  const handleCrop = async () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cropArea = getCropArea();
    const scaleX = imageSize.width / (imageRef.current.width * zoom);
    const scaleY = imageSize.height / (imageRef.current.height * zoom);

    const sourceX = (cropArea.x - crop.x) * scaleX;
    const sourceY = (cropArea.y - crop.y) * scaleY;
    const sourceWidth = cropArea.width * scaleX;
    const sourceHeight = cropArea.height * scaleY;

    canvas.width = 800;
    canvas.height = 800 / aspectRatio;

    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now()
        });
        onCropComplete(croppedFile);
      }
    }, imageFile.type, 0.95);
  };

  const cropArea = getCropArea();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <div
            ref={containerRef}
            className="relative w-full h-full bg-gray-900 overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageSrc && (
              <>
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  className="absolute select-none pointer-events-none"
                  style={{
                    transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: '0 0',
                    maxWidth: 'none'
                  }}
                  onLoad={handleImageLoad}
                  draggable={false}
                />

                <div
                  className="absolute border-4 border-white shadow-lg pointer-events-none"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
                  }}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white border-opacity-30" />
                    ))}
                  </div>

                  {/* Corner handles */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-amber-500 rounded-full"></div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-amber-500 rounded-full"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-amber-500 rounded-full"></div>
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-amber-500 rounded-full"></div>

                  {/* Aspect ratio label */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-#946B29 text-white text-sm font-medium px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    {aspectRatio === 1 ? 'Vierkant (1:1)' : aspectRatio === 2 / 3 ? 'Boekcover (2:3)' : `Verhouding ${aspectRatio.toFixed(2)}`}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-4">
          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-#5C4118 text-center">
              <span className="font-medium">Sleep de afbeelding</span> om te positioneren binnen het vierkante gebied
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <ZoomOut className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-#946B29"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoom - 0.1) / 2.9) * 100}%, #e5e7eb ${((zoom - 0.1) / 2.9) * 100}%, #e5e7eb 100%)`
                }}
              />
              <ZoomIn className="w-4 h-4 text-gray-600 flex-shrink-0" />
            </div>

            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Draai 90°"
            >
              <RotateCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="secondary"
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              onClick={handleCrop}
              className="flex-1"
            >
              Bijsnijden
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
