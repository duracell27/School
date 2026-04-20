'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useSessionStore } from '@/store/session.store';
import type { User } from '@/types/user';

interface RefreshResponse {
  access_token: string;
  user: User;
}

const navItems = [
  { href: '/users', label: 'Користувачі' },
  { href: '/children', label: 'Діти' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setUser = useSessionStore((s) => s.setUser);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    apiFetch<RefreshResponse>('/auth/refresh', { method: 'POST' })
      .then(({ user }) => {
        if (user.role !== 'ADMIN') {
          router.replace('/login');
          return;
        }
        setUser(user);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 bg-white border-r flex flex-col">
        <div className="px-5 py-5 border-b">
          <span className="font-semibold text-sm">Teacher Platform</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t">
          <button
            onClick={async () => {
              await apiFetch('/auth/logout', { method: 'POST' });
              router.replace('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Вийти
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
