'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'adapto_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Failed to save favorites:', error);
      }
    }
  }, [favorites, isLoaded]);

  const addFavorite = useCallback((channelSlug: string) => {
    setFavorites((prev) => {
      if (prev.includes(channelSlug)) return prev;
      return [...prev, channelSlug];
    });
  }, []);

  const removeFavorite = useCallback((channelSlug: string) => {
    setFavorites((prev) => prev.filter((slug) => slug !== channelSlug));
  }, []);

  const toggleFavorite = useCallback((channelSlug: string) => {
    setFavorites((prev) => {
      if (prev.includes(channelSlug)) {
        return prev.filter((slug) => slug !== channelSlug);
      }
      return [...prev, channelSlug];
    });
  }, []);

  const isFavorite = useCallback(
    (channelSlug: string) => favorites.includes(channelSlug),
    [favorites]
  );

  return {
    favorites,
    isLoaded,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}
