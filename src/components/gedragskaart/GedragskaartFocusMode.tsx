import React from 'react';
import { X } from 'lucide-react';
import { GedragskaartCard } from './GedragskaartCard';

interface BehaviorCard {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
}

interface GedragskaartFocusModeProps {
  cards: BehaviorCard[];
  progressMap: Record<string, number>;
  isDeductMode: boolean;
  bouncingCardId: string | null;
  onAction: (cardId: string, e: React.MouseEvent) => void;
  onClose: () => void;
}

export function GedragskaartFocusMode({
  cards, progressMap, isDeductMode, bouncingCardId, onAction, onClose,
}: GedragskaartFocusModeProps) {
  return (
    <div className="fixed inset-0 bg-gray-900/90 z-50 flex flex-col overflow-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="text-white text-lg font-bold">Focusmodus — {cards.length} actieve kaarten</h2>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-4 p-6">
        {cards.map(card => (
          <GedragskaartCard
            key={card.id}
            card={card}
            count={progressMap[card.id] || 0}
            isActive={true}
            hasStudent={true}
            isDeductMode={isDeductMode}
            bouncing={bouncingCardId === card.id}
            onAction={(e) => onAction(card.id, e)}
            onToggle={() => {}}
          />
        ))}
      </div>
    </div>
  );
}
