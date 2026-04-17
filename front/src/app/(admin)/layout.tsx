'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useSessionStore } from '@/store/session.store';
import type { User } from '@/types/user';

interface RefreshResponse {
  access_token: string;
  user: User;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setUser = useSessionStore((s) => s.setUser);
  const router = useRouter();

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
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Teacher Platform — Admin</h1>
        <button
          onClick={async () => {
            await apiFetch('/auth/logout', { method: 'POST' });
            router.replace('/login');
          }}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Log out
        </button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
