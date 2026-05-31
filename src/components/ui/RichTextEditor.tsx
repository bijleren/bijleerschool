import React, { useRef, useEffect, useState } from 'react';
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo,
  Heading1, Heading2, Minus,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Show extended toolbar (headings, alignment, color, undo/redo) */
  extended?: boolean;
}

const COLORS = [
  '#111827', '#374151', '#6B7280',
  '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#14B8A6', '#3B82F6',
  '#EC4899', '#FFFFFF',
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type hier...',
  minHeight = '200px',
  extended = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt('Voer de URL in:');
    if (url) exec('createLink', url);
  };

  const applyColor = (color: string) => {
    exec('foreColor', color);
    setShowColors(false);
  };

  const ToolBtn = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-gray-200 transition-colors"
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px bg-gray-300 mx-1 self-stretch" />;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 border-b border-gray-300">
        <ToolBtn onClick={() => exec('bold')} title="Vet"><Bold className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Cursief"><Italic className="w-4 h-4" /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="Opsommingslijst"><List className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="Genummerde lijst"><ListOrdered className="w-4 h-4" /></ToolBtn>
        <Divider />
        <ToolBtn onClick={insertLink} title="Link invoegen"><LinkIcon className="w-4 h-4" /></ToolBtn>

        {extended && (
          <>
            <Divider />
            <ToolBtn onClick={() => exec('formatBlock', 'H1')} title="Koptekst 1"><Heading1 className="w-4 h-4" /></ToolBtn>
            <ToolBtn onClick={() => exec('formatBlock', 'H2')} title="Koptekst 2"><Heading2 className="w-4 h-4" /></ToolBtn>
            <ToolBtn onClick={() => exec('formatBlock', 'P')} title="Normale tekst">
              <span className="text-xs font-semibold px-0.5">P</span>
            </ToolBtn>
            <Divider />
            <ToolBtn onClick={() => exec('justifyLeft')} title="Links"><AlignLeft className="w-4 h-4" /></ToolBtn>
            <ToolBtn onClick={() => exec('justifyCenter')} title="Centreren"><AlignCenter className="w-4 h-4" /></ToolBtn>
            <ToolBtn onClick={() => exec('justifyRight')} title="Rechts"><AlignRight className="w-4 h-4" /></ToolBtn>
            <Divider />
            <div className="relative">
              <button
                type="button"
                title="Tekstkleur"
                onClick={() => setShowColors(v => !v)}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center gap-0.5"
              >
                <span className="text-sm font-bold" style={{ color: '#EF4444' }}>A</span>
                <span className="text-gray-400 text-[10px]">▾</span>
              </button>
              {showColors && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex flex-wrap gap-1.5 w-36">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyColor(c)}
                      className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>
            <Divider />
            <ToolBtn onClick={() => exec('insertHorizontalRule')} title="Horizontale lijn"><Minus className="w-4 h-4" /></ToolBtn>
            <Divider />
            <ToolBtn onClick={() => exec('undo')} title="Ongedaan maken"><Undo className="w-4 h-4" /></ToolBtn>
            <ToolBtn onClick={() => exec('redo')} title="Opnieuw"><Redo className="w-4 h-4" /></ToolBtn>
          </>
        )}
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 focus:outline-none prose prose-sm max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contentEditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
        [contentEditable] { outline: none; }
        [contentEditable] ul,
        [contentEditable] ol { padding-left: 2rem; margin: 0.5rem 0; }
        [contentEditable] li { margin: 0.25rem 0; }
        [contentEditable] a { color: #2563EB; text-decoration: underline; }
        [contentEditable] strong { font-weight: 600; }
        [contentEditable] em { font-style: italic; }
        [contentEditable] h1 { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
        [contentEditable] h2 { font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0; }
        [contentEditable] h3 { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; }
        [contentEditable] hr { border: none; border-top: 1px solid #D1D5DB; margin: 0.75rem 0; }
      `}</style>
    </div>
  );
}
