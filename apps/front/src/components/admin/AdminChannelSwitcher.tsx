'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { channelsApi } from '@/services/api';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n/I18nProvider';

type Channel = {
  slug: string;
  name: string;
};

function extractAdminSection(pathname: string): { channel: string | null; section: string | null } {
  // Expected patterns: /admin, /admin/[channel]/schedule, /admin/[channel]/content
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'admin') return { channel: null, section: null };
  if (parts.length >= 3) {
    return { channel: parts[1], section: parts[2] };
  }
  return { channel: null, section: null };
}

export default function AdminChannelSwitcher() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { channel, section } = useMemo(() => extractAdminSection(pathname || ''), [pathname]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await channelsApi.getChannels();
        setChannels(list.map((c) => ({ slug: c.slug, name: c.name })));
      } catch {
        setChannels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = channels.find((c) => c.slug === channel) || null;

  const handleSelect = (slug: string) => {
    const nextSection = section || 'schedule';
    router.replace(`/admin/${slug}/${nextSection}`);
  };

  if (loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
          {current ? current.name : t('admin.channel.select')}
          <svg className="ml-2 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {channels.map((c) => (
          <DropdownMenuItem key={c.slug} onClick={() => handleSelect(c.slug)}>
            {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


