'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/users/user-avatar';
import type { User } from '@/types/user';

interface TeacherSelectProps {
  users: User[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TeacherSelect({ users, value, onChange, placeholder = 'Оберіть вчителя', disabled }: TeacherSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = users.find((u) => u.id === value);
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 w-full h-9 px-2.5 rounded-lg border border-input bg-transparent text-sm text-left transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}
      >
        {selected ? (
          <>
            <UserAvatar name={selected.name} avatar={selected.avatar} size={20} />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-input rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              placeholder="Пошук..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-sm"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2 ${u.id === value ? 'bg-gray-50 font-medium' : ''}`}
                >
                  <UserAvatar name={u.name} avatar={u.avatar} size={20} />
                  <span>{u.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">Нічого не знайдено</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
