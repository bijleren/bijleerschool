import React, { useState, useRef, useEffect } from 'react';
import { Palette, X } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B',
  '#6B7280', '#374151', '#1F2937', '#111827', '#000000', '#FFFFFF'
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [hexInput, setHexInput] = useState(value || '#3B82F6');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value || '#3B82F6');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleHexInputChange = (input: string) => {
    setHexInput(input);

    if (/^#[0-9A-Fa-f]{6}$/.test(input)) {
      onChange(input.toUpperCase());
    }
  };

  const handleColorSelect = (color: string) => {
    setHexInput(color);
    onChange(color);
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value || '#3B82F6' }}
          />
          <Palette className="w-4 h-4 text-gray-600" />
        </button>

        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexInputChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
        />
      </div>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute top-full left-0 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          style={{ minWidth: '280px' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Selecteer kleur</h4>
            <button
              onClick={() => setShowPicker(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-6 gap-2 mb-4">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                className={`w-10 h-10 rounded border-2 transition-all hover:scale-110 ${
                  value === color ? 'border-gray-900 ring-2 ring-blue-500' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          <div className="border-t pt-3">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Custom kleur (hex):
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInputChange(e.target.value)}
                placeholder="#000000"
                maxLength={7}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: hexInput }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
