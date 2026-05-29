'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useOverdueCount } from '@/lib/lessons';
import { useSchoolAccount } from '@/lib/payments';
import { formatCurrency } from '@/lib/format';
import { apiFetch } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/users', label: 'Користувачі' },
  { href: '/children', label: 'Діти' },
  { href: '/lessons', label: 'Уроки', showBadge: true },
  { href: '/lesson-prices', label: 'Вартість заняття' },
  { href: '/payments', label: 'Оплати' },
  { href: '/commissions', label: 'Комісії' },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: overdueCount = 0 } = useOverdueCount();
  const { data: schoolAccount } = useSchoolAccount();

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="md:hidden sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-4 h-12 flex items-center justify-between">
      <div className="leading-tight">
        <p className="font-semibold text-sm">Teacher Platform</p>
        {schoolAccount != null && (
          <p className="text-[10px] text-sidebar-foreground/60 leading-none">
            Баланс: <span className="font-semibold text-sidebar-foreground">{formatCurrency(schoolAccount.balance)}</span>
          </p>
        )}
      </div>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
        aria-label="Меню"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-sidebar text-sidebar-foreground border-b border-sidebar-border shadow-lg z-50">
          <nav className="px-3 py-2 space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  {item.label}
                  {item.showBadge && overdueCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {overdueCount > 99 ? '99+' : overdueCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pb-3 pt-1 border-t border-sidebar-border">
            <button
              onClick={async () => {
                await apiFetch('/auth/logout', { method: 'POST' });
                router.replace('/login');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-sidebar-accent transition-colors"
            >
              Вийти
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
