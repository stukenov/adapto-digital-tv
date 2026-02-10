import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Редирект со старых URL каналов на новые
  if (pathname.startsWith('/channel/')) {
    const channelSlug = pathname.replace('/channel/', '');
    
    // Проверяем, есть ли дополнительные сегменты (например, /embed)
    const segments = channelSlug.split('/');
    const slug = segments[0];
    const additionalPath = segments.slice(1).join('/');
    
    // Создаем новый URL без префикса /channel/
    const newPath = additionalPath ? `/${slug}/${additionalPath}` : `/${slug}`;
    
    // Выполняем постоянный редирект (301)
    return NextResponse.redirect(new URL(newPath, request.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Применяем middleware к путям, начинающимся с /channel/
    '/channel/:path*',
  ],
};
