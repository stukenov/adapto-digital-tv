'use client';

import { Channel } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import LiveIndicator from './LiveIndicator';
import { useState } from 'react';

interface ChannelCardProps {
  channel: Channel;
  variant?: 'default' | 'featured' | 'compact';
}

export default function ChannelCard({ channel, variant = 'default' }: ChannelCardProps) {
  const [imageError, setImageError] = useState(false);

  if (variant === 'featured') {
    return (
      <Link 
        href={`/${channel.slug}`} 
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-3xl"
      >
        <div className="channel-card-featured relative flex flex-col justify-end p-6 sm:p-8">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-3xl" />
          
          {/* Shine effect */}
          <div className="card-shine" />
          
          {/* LIVE indicator */}
          <div className="absolute top-5 right-5 z-10">
            <LiveIndicator size="md" />
          </div>

          {/* Logo - centered and large */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-premium group-hover:scale-110">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32">
              <Image
                src={imageError ? '/placeholder-channel.svg' : channel.logo}
                alt={channel.name}
                fill
                className="object-contain drop-shadow-2xl"
                onError={() => setImageError(true)}
              />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h3 className="font-bold text-2xl sm:text-3xl text-white mb-2 transition-colors group-hover:text-[var(--accent-blue)]">
              {channel.name}
            </h3>
            {channel.currentProgram && (
              <p className="text-sm sm:text-base text-white/70 line-clamp-1">
                {channel.currentProgram.title}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link 
        href={`/${channel.slug}`} 
        className="block group focus:outline-none"
      >
        <div className="flex items-center gap-4 p-3 rounded-2xl transition-premium hover:bg-[var(--card-hover)]">
          {/* Logo */}
          <div className="relative w-14 h-14 rounded-xl bg-[var(--card)] flex items-center justify-center overflow-hidden flex-shrink-0">
            <Image
              src={imageError ? '/placeholder-channel.svg' : channel.logo}
              alt={channel.name}
              width={48}
              height={48}
              className="object-contain"
              onError={() => setImageError(true)}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-[var(--accent-blue)]">
              {channel.name}
            </h3>
            {channel.currentProgram && (
              <p className="text-sm text-[var(--foreground-muted)] line-clamp-1">
                {channel.currentProgram.title}
              </p>
            )}
          </div>

          {/* Live indicator */}
          <LiveIndicator size="sm" />
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link 
      href={`/${channel.slug}`} 
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
    >
      <div className="channel-card relative aspect-square flex flex-col items-center justify-center p-4 sm:p-6">
        {/* Shine effect */}
        <div className="card-shine" />
        
        {/* LIVE indicator */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <LiveIndicator size="sm" />
        </div>

        {/* Logo container with glow effect */}
        <div className="relative mb-4 transition-premium group-hover:scale-110">
          {/* Glow behind logo on hover */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
            style={{
              background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'scale(1.5)'
            }}
          />
          
          {/* Logo background */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden transition-premium group-hover:border-white/20 group-hover:bg-white/10">
            <Image
              src={imageError ? '/placeholder-channel.svg' : channel.logo}
              alt={channel.name}
              width={72}
              height={72}
              className="object-contain p-2 transition-premium"
              onError={() => setImageError(true)}
            />
          </div>
        </div>

        {/* Channel name */}
        <h3 className="font-semibold text-base sm:text-lg text-center text-foreground line-clamp-2 transition-colors group-hover:text-[var(--accent-blue)]">
          {channel.name}
        </h3>

        {/* Current program hint */}
        {channel.currentProgram && (
          <p className="mt-2 text-xs text-[var(--foreground-subtle)] text-center line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {channel.currentProgram.startTime} • {channel.currentProgram.title}
          </p>
        )}
      </div>
    </Link>
  );
}
