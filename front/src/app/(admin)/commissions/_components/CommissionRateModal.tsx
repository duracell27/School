'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { useSetCommission } from '@/lib/commissions';

interface Props {
  teacherId: string;
  open: boolean;
  onClose: () => void;
}

export function CommissionRateModal({ teacherId, open, onClose }: Props) {
  const [percentage, setPercentage] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const setCommission = useSetCommission();

  useEffect(() => {
    if (!open) {
      setPercentage('');
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  function handleSave() {
    const pct = Number(percentage);
    if (!percentage || pct < 0 || pct > 100) return;
    setCommission.mutate(
      { teacherId, percentage, effectiveFrom },
      {
        onSuccess: onClose,
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Встановити ставку комісії</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Відсоток (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder="70"
              value={percentage}
              onChange={e => setPercentage(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Діє з</Label>
            <DatePicker value={effectiveFrom} onChange={setEffectiveFrom} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Скасувати</Button>
            <Button onClick={handleSave} disabled={setCommission.isPending || !percentage}>
              Зберегти
            </Button>
          </div>
          {setCommission.isError && (
            <p className="text-xs text-red-500">Помилка збереження. Спробуйте ще раз.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
