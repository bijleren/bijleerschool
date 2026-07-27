import React from 'react';

interface BehaviorCard {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
}

interface GedragskaartCardProps {
  card: BehaviorCard;
  count: number;
  isActive: boolean;
  hasStudent: boolean;
  isDeductMode: boolean;
  bouncing: boolean;
  onAction: (e: React.MouseEvent) => void;
  onToggle: (e: React.MouseEvent) => void;
}

export function GedragskaartCard({
  card, count, isActive, hasStudent, isDeductMode, bouncing, onAction, onToggle,
}: GedragskaartCardProps) {
  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border-2 transition-all select-none
        ${isActive
          ? 'border-blue-300 bg-white shadow-md'
          : 'border-gray-200 bg-gray-50 opacity-60'}
        ${bouncing ? 'scale-95' : 'scale-100'}
        w-36 min-h-[160px] p-3 gap-2`}
    >
      {/* Toggle active/inactive */}
      <button
        onClick={onToggle}
        className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${isActive ? 'border-blue-400 bg-blue-400' : 'border-gray-300 bg-white'}`}
        title={isActive ? 'Deactiveer kaart' : 'Activeer kaart'}
      >
        {isActive && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Icon */}
      <div className="text-4xl mt-1 leading-none">{card.icon}</div>

      {/* Title */}
      <p className="text-xs font-semibold text-gray-800 text-center leading-tight line-clamp-2 px-1">
        {card.title}
      </p>

      {/* Count badge */}
      <div className={`text-lg font-bold tabular-nums leading-none
        ${count > 0 ? (isDeductMode ? 'text-red-500' : 'text-blue-600') : 'text-gray-300'}`}>
        {count}
      </div>

      {/* Action button */}
      <button
        onClick={onAction}
        disabled={!hasStudent || !isActive || (isDeductMode && count <= 0)}
        className={`w-full py-1.5 rounded-xl text-sm font-bold transition-all
          ${!hasStudent || !isActive
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
            : isDeductMode
              ? 'bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 border border-red-200'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 border border-blue-200'
          }`}
        title={!hasStudent ? 'Selecteer eerst een leerling' : undefined}
      >
        {isDeductMode ? '−1' : '+1'}
      </button>
    </div>
  );
}
