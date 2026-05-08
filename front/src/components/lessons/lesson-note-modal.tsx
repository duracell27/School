'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpsertLessonNote, useLessonNote } from '@/lib/lesson-notes';
import { useSessionStore } from '@/store/session.store';
import { ImageIcon, X, Loader2 } from 'lucide-react';

interface LessonNoteModalProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  mode: 'create' | 'view';
  onSaved?: () => Promise<void> | void;
}

export function LessonNoteModal({ open, onClose, lessonId, mode, onSaved }: LessonNoteModalProps) {
  const currentUser = useSessionStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'ADMIN_TEACHER';

  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existingNote, isLoading: noteLoading } = useLessonNote(mode === 'view' ? lessonId : null);
  const upsert = useUpsertLessonNote();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImageData(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!description.trim()) {
      setError("Опис обов'язковий");
      return;
    }
    if (!isAdmin && !imageData) {
      setError("Скріншот обов'язковий");
      return;
    }
    setIsSubmitting(true);
    try {
      await upsert.mutateAsync({ lessonId, description: description.trim(), imageData });
      if (onSaved) {
        await onSaved();
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setImageData(undefined);
    setImagePreview(undefined);
    setError('');
    onClose();
  };

  if (mode === 'view') {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Нотатка до заняття</DialogTitle>
          </DialogHeader>
          {noteLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : existingNote ? (
            <div className="space-y-4">
              {existingNote.imageData && (
                <img
                  src={existingNote.imageData}
                  alt="Скріншот уроку"
                  className="w-full rounded-md object-contain max-h-64 border"
                />
              )}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Опис</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{existingNote.description}</p>
              </div>
              {existingNote.createdBy && (
                <p className="text-xs text-gray-400">Заповнив: {existingNote.createdBy.name}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">Нотатка не знайдена</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Закрити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Завершення заняття</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">
              Скріншот з уроку{!isAdmin && <span className="text-red-500 ml-1">*</span>}
              {isAdmin && <span className="text-gray-400 text-xs ml-1">(необов'язково)</span>}
            </Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full rounded-md object-contain max-h-48 border"
                />
                <button
                  onClick={() => { setImageData(undefined); setImagePreview(undefined); }}
                  className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 transition-colors"
              >
                <ImageIcon size={20} />
                <span className="text-xs">Натисніть щоб завантажити</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <Label htmlFor="note-desc" className="mb-1.5 block">
              Опис заняття<span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="note-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Що проходили на уроці..."
              rows={4}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Скасувати</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
