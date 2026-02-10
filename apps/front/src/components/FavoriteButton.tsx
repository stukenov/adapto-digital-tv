'use client';

import { useFavorites } from '@/hooks/useFavorites';
import { useI18n } from '@/i18n/I18nProvider';

interface FavoriteButtonProps {
  channelSlug: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'full';
  className?: string;
}

export default function FavoriteButton({
  channelSlug,
  size = 'md',
  variant = 'icon',
  className = '',
}: FavoriteButtonProps) {
  const { t } = useI18n();
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites();

  const isFav = isFavorite(channelSlug);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (!isLoaded) {
    return null;
  }

  if (variant === 'full') {
    return (
      <button
        onClick={() => toggleFavorite(channelSlug)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-apple ${
          isFav
            ? 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]'
            : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:text-foreground'
        } ${className}`}
        aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
      >
        <svg
          className={iconSizes[size]}
          fill={isFav ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <span className="text-sm font-medium">
          {isFav ? t('favorites.remove') : t('favorites.add')}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => toggleFavorite(channelSlug)}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-apple ${
        isFav
          ? 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]'
          : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--card-hover)]'
      } ${className}`}
      aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
    >
      <svg
        className={iconSizes[size]}
        fill={isFav ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    </button>
  );
}
