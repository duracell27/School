'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ChildAvatar } from '@/components/children/child-avatar';
import { getCountry } from '@/lib/countries';
import type { Child } from '@/types/child';

interface ChildSelectProps {
  children: Child[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export function ChildSelect({ children, value, onChange, placeholder = 'Оберіть учня' }: ChildSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = children.find((c) => c.id === value);
  const filtered = children.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
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
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full h-9 px-2.5 rounded-lg border border-input bg-transparent text-sm text-left hover:bg-muted transition-colors"
      >
        {selected ? (
          <>
            <ChildAvatar name={selected.name} avatar={selected.avatar} size={20} />
            <span className="text-base leading-none">{getCountry(selected.country)?.flag ?? selected.country}</span>
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
            {filtered.map((c) => {
              const country = getCountry(c.country);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2 ${c.id === value ? 'bg-gray-50 font-medium' : ''}`}
                  >
                    <ChildAvatar name={c.name} avatar={c.avatar} size={20} />
                    <span className="text-base leading-none">{country?.flag ?? c.country}</span>
                    <span>{c.name}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">Нічого не знайдено</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
