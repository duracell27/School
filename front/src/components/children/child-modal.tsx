'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateChild, useUpdateChild } from '@/lib/children';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { DEFAULT_COUNTRY } from '@/lib/countries';
import { CountrySelect } from './country-select';
import { ChildAvatar } from './child-avatar';
import type { Child } from '@/types/child';

const TIMEZONES = [
  '-12', '-11', '-10', '-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1',
  '0', '+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9', '+10', '+11',
  '+12', '+13', '+14',
];

const schema = z.object({
  name: z.string().min(1, "Обов'язкове поле"),
  age: z.coerce.number().int().min(1, 'Мінімум 1'),
  hireDate: z.string().optional(),
  graduationDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ChildModalProps {
  open: boolean;
  onClose: () => void;
  child?: Child;
}

export function ChildModal({ open, onClose, child }: ChildModalProps) {
  const isEdit = !!child;
  const [submitError, setSubmitError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [timezone, setTimezone] = useState('+2');
  const [momPhone, setMomPhone] = useState('');
  const [dadPhone, setDadPhone] = useState('');
  const [showDad, setShowDad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createChild = useCreateChild();
  const updateChild = useUpdateChild();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const currentName = watch('name') || child?.name || '';

  useEffect(() => {
    setSubmitError('');
    setAvatarPreview(null);
    if (child) {
      reset({
        name: child.name,
        age: child.age,
        hireDate: child.hireDate ? child.hireDate.slice(0, 10) : '',
        graduationDate: child.graduationDate ? child.graduationDate.slice(0, 10) : '',
      });
      setAvatarUrl(child.avatar ?? null);
      setCountry(child.country);
      setTimezone(child.timezone);
      const mom = child.parentContacts.find((c) => c.label === 'Мама');
      const dad = child.parentContacts.find((c) => c.label === 'Тато');
      setMomPhone(mom?.phone ?? '');
      setDadPhone(dad?.phone ?? '');
      setShowDad(!!dad);
    } else {
      reset({ name: '', age: undefined as never, hireDate: '', graduationDate: '' });
      setAvatarUrl(null);
      setCountry(DEFAULT_COUNTRY);
      setTimezone('+2');
      setMomPhone('');
      setDadPhone('');
      setShowDad(false);
    }
  }, [child, open]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);
    } catch {
      setSubmitError('Помилка завантаження фото');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSubmit(data: FormValues) {
    try {
      const parentContacts = [
        ...(momPhone.trim() ? [{ label: 'Мама', phone: momPhone.trim() }] : []),
        ...(dadPhone.trim() ? [{ label: 'Тато', phone: dadPhone.trim() }] : []),
      ];

      const payload = {
        name: data.name,
        age: data.age,
        country,
        timezone,
        parentContacts,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
        ...(data.hireDate ? { hireDate: data.hireDate } : {}),
        ...(data.graduationDate ? { graduationDate: data.graduationDate } : {}),
      };

      if (isEdit) {
        await updateChild.mutateAsync({ id: child.id, data: payload });
      } else {
        await createChild.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати дитину' : 'Додати дитину'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0"
            >
              {displayAvatar ? (
                <div className="w-14 h-14 rounded-full overflow-hidden">
                  <Image src={displayAvatar} alt="avatar" width={56} height={56} className="w-full h-full object-cover" />
                </div>
              ) : (
                <ChildAvatar name={currentName || '?'} size={56} />
              )}
              <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs">
                {uploadingAvatar ? '...' : 'Фото'}
              </span>
            </button>
            <div className="text-sm text-gray-500">
              {uploadingAvatar ? 'Завантаження...' : 'Натисніть на аватар щоб змінити фото'}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="child-name">Ім'я</Label>
              <Input id="child-name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="child-age">Вік</Label>
              <Input id="child-age" type="number" min={1} {...register('age')} />
              {errors.age && <p className="text-sm text-red-500">{errors.age.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Країна</Label>
              <CountrySelect value={country} onChange={setCountry} />
            </div>
            <div className="space-y-1">
              <Label>Таймзона</Label>
              <Select value={timezone} onValueChange={(v) => setTimezone(v ?? '')}>
                <SelectTrigger>
                  <SelectValue>{timezone}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Контакти батьків</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Номер мами"
                value={momPhone}
                onChange={(e) => setMomPhone(e.target.value)}
              />
              {!showDad && (
                <button
                  type="button"
                  onClick={() => setShowDad(true)}
                  className="shrink-0 w-8 h-8 rounded-lg border border-input flex items-center justify-center text-gray-500 hover:bg-muted transition-colors text-lg leading-none"
                >
                  +
                </button>
              )}
            </div>
            {showDad && (
              <Input
                placeholder="Номер тата"
                value={dadPhone}
                onChange={(e) => setDadPhone(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="child-hireDate">Дата прийняття</Label>
              <Input id="child-hireDate" type="date" {...register('hireDate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="child-graduationDate">Дата закінчення</Label>
              <Input id="child-graduationDate" type="date" {...register('graduationDate')} />
            </div>
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
            <Button type="submit" disabled={isSubmitting || uploadingAvatar}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
