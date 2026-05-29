'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, CalendarDays, Users, Baby,
  BookOpen, Tag, CreditCard, Percent, LogOut,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSessionStore } from '@/store/session.store';
import { useOverdueCount } from '@/lib/lessons';
import { useSchoolAccount } from '@/lib/payments';
import { formatCurrency } from '@/lib/format';
import { MobileHeader } from '@/components/ui/mobile-header';
import type { User } from '@/types/user';

interface RefreshResponse {
  access_token: string;
  user: User;
}

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/calendar', label: 'Календар', icon: CalendarDays },
  { href: '/users', label: 'Користувачі', icon: Users },
  { href: '/children', label: 'Діти', icon: Baby },
  { href: '/lessons', label: 'Уроки', icon: BookOpen, showBadge: true },
  { href: '/lesson-prices', label: 'Вартість заняття', icon: Tag },
  { href: '/payments', label: 'Оплати', icon: CreditCard },
  { href: '/commissions', label: 'Комісії', icon: Percent },
];

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function SidebarSchoolBalance() {
  const { data } = useSchoolAccount();
  if (data == null) return null;
  return (
    <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">
      Баланс школи: <span className="font-semibold text-sidebar-foreground">{formatCurrency(data.balance)}</span>
    </p>
  );
}

function NavContent() {
  const pathname = usePathname();
  const { data: overdueCount = 0 } = useOverdueCount();

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <item.icon size={16} className="shrink-0" />
            {item.label}
            {item.showBadge && <NavBadge count={overdueCount} />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setUser = useSessionStore((s) => s.setUser);
  const router = useRouter();

  useEffect(() => {
    apiFetch<RefreshResponse>('/auth/refresh', { method: 'POST' })
      .then(({ user }) => {
        if (user.role !== 'ADMIN' && user.role !== 'ADMIN_TEACHER') {
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
    <div className="min-h-screen flex flex-col md:flex-row">
      <MobileHeader />
      <aside className="w-56 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col hidden md:flex">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <span className="font-semibold text-sm">Teacher Platform</span>
          <SidebarSchoolBalance />
        </div>
        <NavContent />
        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={async () => {
              await apiFetch('/auth/logout', { method: 'POST' });
              router.replace('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-sidebar-accent hover:text-red-200 transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            Вийти
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-3 md:p-6 bg-[oklch(0.985_0.005_285)]">{children}</main>
    </div>
  );
}
