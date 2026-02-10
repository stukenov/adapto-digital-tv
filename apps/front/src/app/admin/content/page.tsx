'use client';

import { useEffect, useMemo, useState } from 'react';
import { checkAuth } from '@/services/auth';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminContentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const channel = useMemo(() => {
    const parts = (pathname || '').split('/').filter(Boolean);
    // expect /admin or /admin/[channel]/content
    return parts.length >= 3 ? parts[1] : null;
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace('/admin');
        return;
      }
      if (!channel) {
        router.replace('/admin/content');
        return;
      }
      setReady(true);
    })();
  }, [router, channel]);

  if (!ready) return null;

  return (
    <div className="p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Контент</h1>
        <p className="text-sm text-muted-foreground">Страница в разработке.</p>
      </div>
    </div>
  );
}


