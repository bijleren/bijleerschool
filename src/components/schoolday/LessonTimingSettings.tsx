import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  X, 
  Clock, 
  Save,
  School,
  AlertCircle
} from 'lucide-react';

interface LessonTimingSettingsProps {
  schoolId: string;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

interface LessonSettings {
  id?: string;
  start_block_duration: number;
  main_block_duration: number;
  end_block_duration: number;
}

export function LessonTimingSettings({ schoolId, onClose, onSettingsUpdated }: LessonTimingSettingsProps) {
  const [settings, setSettings] = useState<LessonSettings>({
    start_block_duration: 5,
    main_block_duration: 10,
    end_block_duration: 5
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('school_lesson_settings')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          start_block_duration: data.start_block_duration,
          main_block_duration: data.main_block_duration,
          end_block_duration: data.end_block_duration
        });
      }
    } catch (error) {
      console.error('Error fetching lesson settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('school_lesson_settings')
          .update({
            start_block_duration: settings.start_block_duration,
            main_block_duration: settings.main_block_duration,
            end_block_duration: settings.end_block_duration
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('school_lesson_settings')
          .insert({
            school_id: schoolId,
            start_block_duration: settings.start_block_duration,
            main_block_duration: settings.main_block_duration,
            end_block_duration: settings.end_block_duration
          });

        if (error) throw error;
      }

      setMessage('Timing instellingen succesvol opgeslagen!');
      onSettingsUpdated();
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving lesson settings:', error);
      setMessage('Er is een fout opgetreden bij het opslaan van de instellingen.');
    } finally {
      setLoading(false);
    }
  };

  const calculateExample = () => {
    const totalDuration = 50; // Example 50-minute lesson
    const availableTime = totalDuration - settings.start_block_duration - settings.end_block_duration;
    const mainBlocks = Math.floor(availableTime / settings.main_block_duration);
    const remainder = availableTime % settings.main_block_duration;
    const lastBlockDuration = settings.main_block_duration + remainder;

    return {
      totalDuration,
      availableTime,
      mainBlocks,
      remainder,
      lastBlockDuration
    };
  };

  const example = calculateExample();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Clock className="w-6 h-6 mr-3" />
              Les Timing Instellingen
            </h2>
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <School className="w-4 h-4 mr-2" />
              <span>School-niveau instellingen - van toepassing op alle lessen</span>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('succesvol')
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            {/* Settings Form */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Blok Duur (minuten)</h3>
              <div className="space-y-4">
                <Input
                  label="Start Blok"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.start_block_duration}
                  onChange={(e) => setSettings({
                    ...settings,
                    start_block_duration: parseInt(e.target.value) || 5
                  })}
                  helperText="Opening/warming-up tijd aan het begin van de les"
                />
                
                <Input
                  label="Hoofd Blok"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.main_block_duration}
                  onChange={(e) => setSettings({
                    ...settings,
                    main_block_duration: parseInt(e.target.value) || 10
                  })}
                  helperText="Duur van elk hoofdactiviteit blok"
                />
                
                <Input
                  label="Eind Blok"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.end_block_duration}
                  onChange={(e) => setSettings({
                    ...settings,
                    end_block_duration: parseInt(e.target.value) || 5
                  })}
                  helperText="Afsluiting/evaluatie tijd aan het eind van de les"
                />
              </div>
            </Card>

            {/* Example Calculation */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Voorbeeld (50 minuten les)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Start blok:</span>
                  <span className="font-medium">{settings.start_block_duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Hoofd blokken:</span>
                  <span className="font-medium">
                    {example.mainBlocks - 1} × {settings.main_block_duration} min + 1 × {example.lastBlockDuration} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Eind blok:</span>
                  <span className="font-medium">{settings.end_block_duration} min</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Totaal:</span>
                  <span>{example.totalDuration} min</span>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={onClose}>
                Annuleren
              </Button>
              <Button onClick={handleSave} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Instellingen Opslaan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}