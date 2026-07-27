import React, { useState } from 'react';
import { X, Trash2, Check } from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  card_ids: string[];
}

interface GedragskaartPresetModalProps {
  presets: Preset[];
  activeCardIds: Set<string>;
  onApply: (presetId: string) => void;
  onSave: (name: string) => Promise<void>;
  onDelete: (presetId: string) => Promise<void>;
  onClose: () => void;
}

export function GedragskaartPresetModal({
  presets, activeCardIds, onApply, onSave, onDelete, onClose,
}: GedragskaartPresetModalProps) {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await onSave(newName.trim());
      setNewName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Presets beheren</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Save current selection */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Huidige selectie opslaan ({activeCardIds.size} kaarten)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Naam preset..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSave}
                disabled={!newName.trim() || saving}
                className="px-4 py-2 bg-#946B29 text-white rounded-lg text-sm font-medium hover:bg-#74531F disabled:opacity-50 transition-colors"
              >
                {saving ? '...' : 'Opslaan'}
              </button>
            </div>
          </div>

          {/* Existing presets */}
          {presets.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Opgeslagen presets</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {presets.map(preset => (
                  <div key={preset.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <button
                      onClick={() => { onApply(preset.id); onClose(); }}
                      className="flex-1 text-left"
                    >
                      <span className="text-sm font-medium text-gray-900">{preset.name}</span>
                      <span className="ml-2 text-xs text-gray-500">{preset.card_ids.length} kaarten</span>
                    </button>
                    <button
                      onClick={() => onApply(preset.id)}
                      className="p-1.5 text-#946B29 hover:bg-amber-50 rounded-md transition-colors"
                      title="Toepassen"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(preset.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {presets.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nog geen presets opgeslagen.</p>
          )}
        </div>
      </div>
    </div>
  );
}
