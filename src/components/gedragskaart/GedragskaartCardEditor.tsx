import React, { useState } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = ['Werkgeheugen', 'Inhibitie', 'Flexibiliteit', 'Planning', 'Taakinitiatie', 'Emotieregulatie', 'Zelfmonitoring', 'Timemanagement'];
const ICON_OPTIONS = ['🧠','✋','🔄','📋','🚀','💚','🔍','⏰','🎯','💡','⭐','🏆','📝','👣','😌','💪','❓','👀','🗣️','✅'];

interface GedragskaartCardEditorProps {
  onSave: (data: { title: string; description: string; category: string; icon: string }) => Promise<void>;
  onClose: () => void;
}

export function GedragskaartCardEditor({ onSave, onClose }: GedragskaartCardEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [icon, setIcon] = useState('🧠');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), category, icon });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nieuwe gedragskaart</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="bv. Goed luisteren"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Korte omschrijving..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icoon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                    ${icon === ic ? 'bg-amber-100 border-2 border-amber-500' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                >
                  {ic}
                </button>
              ))}
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-10 h-10 text-center border border-gray-200 rounded-lg text-xl"
                maxLength={2}
                title="Of typ zelf een emoji"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{title || 'Titel'}</p>
              <p className="text-xs text-gray-500">{category}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 px-4 py-2 bg-#946B29 text-white rounded-lg text-sm font-medium hover:bg-#74531F disabled:opacity-50 transition-colors"
          >
            {saving ? 'Opslaan...' : 'Kaart aanmaken'}
          </button>
        </div>
      </div>
    </div>
  );
}
