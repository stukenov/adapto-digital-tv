'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function TopNavWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname?.includes('/embed');
  const isAdmin = pathname?.startsWith('/admin');
  if (isEmbed || isAdmin) return null;
  return <>{children}</>;
}


