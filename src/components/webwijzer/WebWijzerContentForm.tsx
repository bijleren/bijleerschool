import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ArrowLeft, Video, FileText, ExternalLink } from 'lucide-react';

interface WebWijzerContent {
  id: string;
  title: string;
  content_type: 'video' | 'file' | 'link';
  content_url: string;
  symbol: string;
  color: string;
}

interface WebWijzerContentFormProps {
  content: WebWijzerContent | null;
  onClose: () => void;
}

const COMMON_SYMBOLS = ['📚', '🎥', '🔗', '📝', '📄', '🎵', '🎨', '🔢', '🌍', '🔬', '⚽', '🎮', '📱', '💻', '📖'];
const PRESET_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function WebWijzerContentForm({ content, onClose }: WebWijzerContentFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: content?.title || '',
    content_type: content?.content_type || 'video',
    content_url: content?.content_url || '',
    symbol: content?.symbol || '📎',
    color: content?.color || '#3B82F6',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (content) {
        const { error } = await supabase
          .from('webwijzer_content')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', content.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('webwijzer_content')
          .insert({
            ...formData,
            user_id: user.id,
          });

        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {content ? 'Edit Content' : 'Create Content'}
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, content_type: 'video' })}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  formData.content_type === 'video'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Video className="w-6 h-6" />
                <span className="font-medium">Video</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, content_type: 'file' })}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  formData.content_type === 'file'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-6 h-6" />
                <span className="font-medium">File</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, content_type: 'link' })}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  formData.content_type === 'link'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ExternalLink className="w-6 h-6" />
                <span className="font-medium">Link</span>
              </button>
            </div>
          </div>

          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter content title"
            required
          />

          <Input
            label={
              formData.content_type === 'video'
                ? 'YouTube URL'
                : formData.content_type === 'file'
                ? 'File URL'
                : 'Website URL'
            }
            value={formData.content_url}
            onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
            placeholder={
              formData.content_type === 'video'
                ? 'https://www.youtube.com/watch?v=...'
                : formData.content_type === 'file'
                ? 'https://example.com/file.pdf'
                : 'https://example.com'
            }
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symbol
            </label>
            <div className="grid grid-cols-8 gap-2">
              {COMMON_SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setFormData({ ...formData, symbol: sym })}
                  className={`p-3 text-2xl border-2 rounded-lg transition-colors ${
                    formData.symbol === sym
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
            <Input
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="Or enter custom symbol"
              className="mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-8 gap-2 mb-2">
              {PRESET_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: col })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === col ? 'border-gray-900 scale-110' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
            <Input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-12"
            />
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : content ? 'Update Content' : 'Create Content'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
