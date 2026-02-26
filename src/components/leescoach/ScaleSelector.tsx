import React from 'react';

type ScaleValue = 'very_poor' | 'poor' | 'good' | 'excellent' | null;

interface ScaleSelectorProps {
  value: ScaleValue;
  onChange: (value: ScaleValue) => void;
  disabled?: boolean;
}

export function ScaleSelector({ value, onChange, disabled = false }: ScaleSelectorProps) {
  const options: { value: ScaleValue; label: string }[] = [
    { value: 'very_poor', label: '--' },
    { value: 'poor', label: '-' },
    { value: 'good', label: '+' },
    { value: 'excellent', label: '++' },
  ];

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`
            flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all
            ${value === option.value
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
