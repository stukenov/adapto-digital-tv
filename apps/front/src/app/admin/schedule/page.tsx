'use client';

import { useEffect, useMemo, useState } from 'react';
import { checkAuth } from '@/services/auth';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminSchedulePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const channel = useMemo(() => {
    const parts = (pathname || '').split('/').filter(Boolean);
    // expect /admin or /admin/[channel]/schedule
    return parts.length >= 3 ? parts[1] : null;
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace('/admin');
        return;
      }
      // if no channel in URL, redirect to first known channel via switcher path
      if (!channel) {
        router.replace('/admin/schedule');
        return;
      }
      setReady(true);
    })();
  }, [router, channel]);

  if (!ready) return null;

  return (
    <div className="p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Расписание</h1>
        <p className="text-sm text-muted-foreground">Страница в разработке.</p>
      </div>
    </div>
  );
}


