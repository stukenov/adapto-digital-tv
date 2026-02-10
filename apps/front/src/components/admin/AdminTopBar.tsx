'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getCurrentUser, logout, type AuthUser } from '@/services/auth';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import AdminChannelSwitcher from './AdminChannelSwitcher';
import { useI18n } from '@/i18n/I18nProvider';



export default function AdminTopBar() {
  const { t } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const me = await getCurrentUser();
      setUser(me);
      setLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    const ok = await logout();
    if (ok) {
      // Обновляем страницу, чтобы сбросить состояние
      window.location.href = '/admin';
    }
  };

  // Не показываем топ-бар, пока не выяснили авторизацию
  if (loading || !user) return null;

  const linkClasses = (href: string) => {
    const active = pathname.startsWith(href);
    return `text-sm font-medium transition-colors hover:text-foreground ${active ? 'text-foreground' : 'text-muted-foreground'}`;
  };

  return (
    <header className="w-full bg-background">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Left: logo placeholder + channel switcher */}
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-muted" aria-label="logo" />
            <AdminChannelSwitcher />
          </div>

          {/* Center: primary nav */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
            <Link href="/admin/schedule" className={linkClasses('/admin/schedule')}>
              {t('admin.nav.schedule')}
            </Link>
            <Link href="/admin/content" className={linkClasses('/admin/content')}>
              {t('admin.nav.content')}
            </Link>
          </nav>

          {/* Right: profile */}
          <div className="relative flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-none">{user.username}</div>
              <div className="text-xs text-muted-foreground">{user.email || t('admin.user.default')}</div>
            </div>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full focus:outline-none">
                  <Avatar>
                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>{t('admin.logout')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <Separator />
      </div>
    </header>
  );
}


