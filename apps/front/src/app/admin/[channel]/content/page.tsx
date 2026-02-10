'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { checkAuth } from '@/services/auth';

export default function AdminChannelContentPage() {
  const router = useRouter();
  const params = useParams<{ channel: string }>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await checkAuth();
      if (!ok) {
        router.replace('/admin');
        return;
      }
      if (!params?.channel) {
        router.replace('/admin');
        return;
      }
      setReady(true);
    })();
  }, [router, params?.channel]);

  if (!ready) return null;

  return (
    <div className="p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Контент</h1>
        <p className="text-sm text-muted-foreground">Страница в разработке для канала: {params.channel}</p>
      </div>
    </div>
  );
}


