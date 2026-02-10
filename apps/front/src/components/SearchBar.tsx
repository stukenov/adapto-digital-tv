'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nProvider';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ onSearch, placeholder, className = '' }: SearchBarProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      onSearch(value);
    },
    [onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  // Keyboard shortcut: Cmd/Ctrl + K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`relative ${className}`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--card)] border transition-apple ${
          isFocused
            ? 'border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/20'
            : 'border-[var(--border)]'
        }`}
      >
        <svg
          className="w-5 h-5 text-[var(--muted-foreground)] flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || t('search.placeholder')}
          className="flex-1 bg-transparent text-foreground placeholder-[var(--muted-foreground)] outline-none text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="w-6 h-6 rounded-full bg-[var(--muted-foreground)]/20 flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted-foreground)]/30 transition-apple"
            aria-label="Clear search"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {/* Keyboard shortcut hint */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)]">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)]">K</kbd>
        </div>
      </div>
    </div>
  );
}
