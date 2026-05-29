'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CancellationSide } from '@/types/lesson';

interface CancellationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (side: CancellationSide, reason: string) => Promise<void>;
}

export function CancellationModal({ open, onClose, onConfirm }: CancellationModalProps) {
  const [side, setSide] = useState<CancellationSide | ''>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setSide('');
    setReason('');
    setError('');
    onClose();
  }

  async function handleConfirm() {
    setError('');
    if (!side) { setError('Оберіть сторону скасування'); return; }
    if (!reason.trim()) { setError('Вкажіть причину скасування'); return; }
    setIsSubmitting(true);
    try {
      await onConfirm(side, reason.trim());
      setSide('');
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Скасування заняття</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>З чиєї сторони скасування?</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSide('STUDENT')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  side === 'STUDENT'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Учень
              </button>
              <button
                type="button"
                onClick={() => setSide('TEACHER')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  side === 'TEACHER'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Вчитель
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Причина скасування</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Вкажіть причину..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Відмінити</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            Скасувати заняття
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
