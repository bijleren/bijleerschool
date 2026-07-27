import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { X, Star, Mic, StopCircle, Camera, AlertCircle, Smile, Meh, Frown, Heart } from 'lucide-react';

interface ReturnItemModalProps {
  item: {
    id: string;
    title: string;
    type: 'book' | 'material';
    student_book_id?: string;
    material_loan_id?: string;
    cover_image_url?: string;
    photo_url?: string;
  };
  studentId: string;
  onClose: () => void;
  onComplete: () => void;
}

const EMOTIONS = [
  { value: 'happy', label: 'Blij', icon: Smile, color: 'text-yellow-500' },
  { value: 'love', label: 'Geweldig', icon: Heart, color: 'text-red-500' },
  { value: 'neutral', label: 'Oké', icon: Meh, color: 'text-gray-500' },
  { value: 'sad', label: 'Niet leuk', icon: Frown, color: 'text-amber-500' }
];

export function ReturnItemModal({ item, studentId, onClose, onComplete }: ReturnItemModalProps) {
  const [starRating, setStarRating] = useState(0);
  const [emotion, setEmotion] = useState<string>('');
  const [textFeedback, setTextFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Kon audio opname niet starten. Check je microfoon permissies.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retryRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReturn = async () => {
    try {
      setSaving(true);
      setError(null);

      let uploadedAudioUrl = null;
      let uploadedPhotoUrl = null;

      if (audioBlob) {
        const fileName = `${studentId}/${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-audio')
          .upload(fileName, audioBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('feedback-audio')
          .getPublicUrl(fileName);

        uploadedAudioUrl = publicUrl;
      }

      if (photoFile) {
        const fileName = `${studentId}/${Date.now()}.${photoFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('feedback-photos')
          .getPublicUrl(fileName);

        uploadedPhotoUrl = publicUrl;
      }

      if (item.type === 'book') {
        if (item.student_book_id) {
          await supabase
            .from('student_books')
            .update({
              returned_at: new Date().toISOString(),
              status: 'returned'
            })
            .eq('id', item.student_book_id);

          const { data: bookData } = await supabase
            .from('books')
            .select('available_copies')
            .eq('id', item.id)
            .single();

          if (bookData) {
            await supabase
              .from('books')
              .update({ available_copies: bookData.available_copies + 1 })
              .eq('id', item.id);
          }

          if (starRating > 0 || emotion || textFeedback || uploadedAudioUrl || uploadedPhotoUrl) {
            await supabase
              .from('book_reviews')
              .upsert({
                student_id: studentId,
                book_id: item.id,
                student_book_id: item.student_book_id,
                rating: starRating || null,
                emotion: emotion || null,
                review_text: textFeedback || null,
                audio_url: uploadedAudioUrl,
                photo_url: uploadedPhotoUrl
              });
          }
        }
      } else {
        if (item.material_loan_id) {
          await supabase
            .from('school_material_loans')
            .update({ returned_at: new Date().toISOString() })
            .eq('id', item.material_loan_id);

          await supabase
            .from('school_materials')
            .update({ is_available: true })
            .eq('id', item.id);

          if (textFeedback || uploadedAudioUrl || uploadedPhotoUrl) {
            await supabase
              .from('material_feedback')
              .insert({
                material_loan_id: item.material_loan_id,
                material_id: item.id,
                student_id: studentId,
                text_feedback: textFeedback || null,
                audio_url: uploadedAudioUrl,
                photo_url: uploadedPhotoUrl
              });
          }
        }
      }

      onComplete();
    } catch (err) {
      console.error('Error returning item:', err);
      setError('Fout bij inleveren');
    } finally {
      setSaving(false);
    }
  };

  const itemImage = item.type === 'book' ? item.cover_image_url : item.photo_url;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Inleveren</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            {itemImage ? (
              <img
                src={itemImage}
                alt={item.title}
                className="w-16 h-24 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-gray-400 text-xs">Geen foto</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600">
                {item.type === 'book' ? 'Boek' : 'Materiaal'}
              </p>
            </div>
          </div>

          {item.type === 'book' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Hoeveel sterren geef je dit boek?
                </label>
                <div className="flex gap-2 justify-center py-4">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setStarRating(rating)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          rating <= starRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Hoe vond je het boek?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {EMOTIONS.map((emo) => {
                    const Icon = emo.icon;
                    return (
                      <button
                        key={emo.value}
                        onClick={() => setEmotion(emo.value)}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          emotion === emo.value
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-8 h-8 mx-auto mb-2 ${emo.color}`} />
                        <div className="font-medium text-sm">{emo.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vertel meer over je ervaring (optioneel)
            </label>
            <textarea
              value={textFeedback}
              onChange={(e) => setTextFeedback(e.target.value)}
              placeholder="Wat vond je ervan? Zou je het aanraden aan anderen?"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Audio opname (optioneel)
            </label>
            {!audioUrl ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center px-6 py-3 bg-#946B29 text-white rounded-lg hover:bg-#74531F transition-colors"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Start Opname
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-600 font-medium">Opname bezig...</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <StopCircle className="w-5 h-5 mr-2" />
                      Stop Opname
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <audio src={audioUrl} controls className="w-full" />
                <button
                  onClick={retryRecording}
                  className="text-sm text-#946B29 hover:text-#74531F font-medium"
                >
                  Opnieuw opnemen
                </button>
              </div>
            )}
          </div>

          {item.type === 'book' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Foto met het boek (optioneel)
              </label>
              {!photoPreview ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-6 py-3 bg-#946B29 text-white rounded-lg hover:bg-#74531F transition-colors"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Foto maken
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={removePhoto}
                    className="text-sm text-#946B29 hover:text-#74531F font-medium"
                  >
                    Andere foto kiezen
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuleren
          </Button>
          <Button onClick={handleReturn} disabled={saving} className="flex-1">
            {saving ? 'Bezig met inleveren...' : 'Inleveren'}
          </Button>
        </div>
      </div>
    </div>
  );
}
