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
    <header className="md:hidden sticky top-0 z-40 bg-white border-b px-4 h-12 flex items-center justify-between">
      <div className="leading-tight">
        <p className="font-semibold text-sm">Teacher Platform</p>
        {schoolAccount != null && (
          <p className="text-[10px] text-gray-400 leading-none">
            Баланс: <span className="font-semibold text-black">{formatCurrency(schoolAccount.balance)}</span>
          </p>
        )}
      </div>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Меню"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg z-50">
          <nav className="px-3 py-2 space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
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
          <div className="px-3 pb-3 pt-1 border-t">
            <button
              onClick={async () => {
                await apiFetch('/auth/logout', { method: 'POST' });
                router.replace('/login');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              Вийти
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
