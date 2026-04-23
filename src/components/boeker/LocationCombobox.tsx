import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Plus, ChevronDown, X } from 'lucide-react';

interface BookLocation {
  id: string;
  name: string;
}

interface LocationComboboxProps {
  schoolId: string;
  value: string | null;
  onChange: (locationId: string | null) => void;
}

export function LocationCombobox({ schoolId, value, onChange }: LocationComboboxProps) {
  const [locations, setLocations] = useState<BookLocation[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    fetchLocations();
  }, [schoolId]);

  // Sync display value when external value changes
  useEffect(() => {
    if (value) {
      const loc = locations.find((l) => l.id === value);
      if (loc) setInputValue(loc.name);
    } else {
      setInputValue('');
    }
  }, [value, locations]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [locations, value]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('book_locations')
      .select('id, name')
      .eq('school_id', schoolId)
      .order('name');
    setLocations(data || []);
  };

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreate =
    inputValue.trim() !== '' &&
    !locations.some((l) => l.name.toLowerCase() === inputValue.trim().toLowerCase());

  const closeDropdown = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    // If no selection and input doesn't match a location, revert display
    if (value) {
      const loc = locations.find((l) => l.id === value);
      setInputValue(loc ? loc.name : '');
    } else {
      setInputValue('');
    }
  };

  const selectLocation = (loc: BookLocation) => {
    onChange(loc.id);
    setInputValue(loc.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const clearSelection = () => {
    onChange(null);
    setInputValue('');
    inputRef.current?.focus();
  };

  const createLocation = async () => {
    const name = inputValue.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('book_locations')
        .insert({ school_id: schoolId, name })
        .select('id, name')
        .single();

      if (error) throw error;
      const newLoc = data as BookLocation;
      setLocations((prev) => [...prev, newLoc].sort((a, b) => a.name.localeCompare(b.name)));
      selectLocation(newLoc);
    } finally {
      setCreating(false);
    }
  };

  const allOptions = showCreate
    ? [...filtered, { id: '__create__', name: inputValue.trim() }]
    : filtered;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, allOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
        const opt = allOptions[highlightedIndex];
        if (opt.id === '__create__') {
          createLocation();
        } else {
          selectLocation(opt);
        }
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
            if (e.target.value === '') onChange(null);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Zoek of maak locatie aan..."
          className="w-full pl-9 pr-16 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={clearSelection}
              className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen((o) => !o);
              inputRef.current?.focus();
            }}
            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && !showCreate && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Geen locaties gevonden
            </div>
          )}

          {filtered.map((loc, i) => (
            <button
              key={loc.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectLocation(loc);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                highlightedIndex === i
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${value === loc.id ? 'font-medium' : ''}`}
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {loc.name}
            </button>
          ))}

          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                createLocation();
              }}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
              disabled={creating}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-t border-gray-100 transition-colors ${
                highlightedIndex === filtered.length
                  ? 'bg-green-50 text-green-700'
                  : 'text-green-700 hover:bg-green-50'
              }`}
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              {creating ? 'Aanmaken...' : `Aanmaken: "${inputValue.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
