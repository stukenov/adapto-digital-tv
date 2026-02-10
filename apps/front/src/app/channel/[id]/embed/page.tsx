"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import HLSPlayer from '@/components/HLSPlayer';
import { channelsApi } from '@/services/api';
import { convertApiChannelToChannel } from '@/types';
import { localChannels } from '@/data/local-channels';

export default function EmbedChannelPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id;
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const useLocal = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOCALDATA === 'true';

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        if (!slug) {
          return;
        }
        if (useLocal) {
          const lc = localChannels.find((c) => c.slug === slug);
          if (lc && isMounted) setStreamUrl(lc.streamUrl);
          return;
        }
        const apiChannel = await channelsApi.getChannel(slug);
        const ch = convertApiChannelToChannel(apiChannel);
        if (isMounted) setStreamUrl(ch.streamUrl);
      } catch (e) {
        console.error('Failed to load channel for embed:', e);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [slug, useLocal]);

  if (!streamUrl) {
    return (
      <div className="bg-black w-screen h-screen flex items-center justify-center">
        <div className="text-white opacity-70 text-sm">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="bg-black w-screen h-screen">
      <HLSPlayer src={streamUrl} className="w-full h-full" autoPlay={true} muted={false} />
    </div>
  );
}


