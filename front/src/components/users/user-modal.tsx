'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateUser, useUpdateUser } from '@/lib/users';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { UserAvatar } from './user-avatar';
import type { User } from '@/types/user';

const baseFields = {
  name: z.string().min(1, "Обов'язкове поле"),
  email: z.string().email('Невірний email'),
  role: z.enum(['ADMIN', 'TEACHER', 'ADMIN_TEACHER']),
  status: z.enum(['WORKING', 'FIRED']),
  hireDate: z.string().optional(),
  terminationDate: z.string().optional(),
};

const createSchema = z.object({
  ...baseFields,
  password: z.string().min(8, 'Мінімум 8 символів'),
});

const editSchema = z.object({
  ...baseFields,
  password: z.union([z.string().min(8, 'Мінімум 8 символів'), z.literal('')]),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: User;
}

export function UserModal({ open, onClose, user }: UserModalProps) {
  const isEdit = !!user;
  const [submitError, setSubmitError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm | EditForm>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'TEACHER', status: 'WORKING' },
  });

  const nameValue = watch('name');
  const statusValue = watch('status');

  useEffect(() => {
    setSubmitError('');
    setAvatarPreview(null);
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        status: user.status,
        hireDate: user.hireDate ? user.hireDate.slice(0, 10) : '',
        terminationDate: user.terminationDate ? user.terminationDate.slice(0, 10) : '',
      });
      setAvatarUrl(user.avatar ?? null);
    } else {
      reset({ name: '', email: '', password: '', role: 'TEACHER', status: 'WORKING', hireDate: '', terminationDate: '' });
      setAvatarUrl(null);
    }
  }, [user, open]);

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

  async function onSubmit(data: CreateForm | EditForm) {
    try {
      const common: Record<string, string> = {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        ...(data.hireDate ? { hireDate: data.hireDate } : {}),
        ...(data.terminationDate ? { terminationDate: data.terminationDate } : {}),
      };

      if (isEdit) {
        if (data.password) common.password = data.password;
        if (avatarUrl !== (user?.avatar ?? null)) common.avatar = avatarUrl ?? '';
        await updateUser.mutateAsync({ id: user.id, data: common });
      } else {
        const payload: Record<string, string> = {
          ...common,
          password: (data as CreateForm).password,
          ...(avatarUrl ? { avatar: avatarUrl } : {}),
        };
        await createUser.mutateAsync(payload as never);
      }
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Щось пішло не так');
    }
  }

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати користувача' : 'Створити користувача'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0"
              title="Змінити фото"
            >
              {displayAvatar ? (
                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                  <Image src={displayAvatar} alt="avatar" width={56} height={56} className="w-full h-full object-cover" />
                </div>
              ) : (
                <UserAvatar name={nameValue || '?'} size={56} />
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

          <div className="space-y-1">
            <Label htmlFor="name">Ім'я</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Електронна пошта</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">
              Пароль {isEdit && <span className="text-gray-400 text-xs">(залиште порожнім, щоб не змінювати)</span>}
            </Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Роль</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as 'ADMIN' | 'TEACHER' | 'ADMIN_TEACHER')}>
                <SelectTrigger>
                  <SelectValue>
                    {watch('role') === 'ADMIN' ? 'Адміністратор' : watch('role') === 'ADMIN_TEACHER' ? 'Адмін-вчитель' : 'Вчитель'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHER">Вчитель</SelectItem>
                  <SelectItem value="ADMIN">Адміністратор</SelectItem>
                  <SelectItem value="ADMIN_TEACHER">Адмін-вчитель</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Статус</Label>
              <Select value={statusValue} onValueChange={(v) => setValue('status', v as 'WORKING' | 'FIRED')}>
                <SelectTrigger>
                  <SelectValue>{statusValue === 'WORKING' ? 'Працює' : 'Звільнений'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WORKING">Працює</SelectItem>
                  <SelectItem value="FIRED">Звільнений</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="hireDate">Дата прийому</Label>
              <Input id="hireDate" type="date" {...register('hireDate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="terminationDate">Дата звільнення</Label>
              <Input id="terminationDate" type="date" {...register('terminationDate')} />
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
