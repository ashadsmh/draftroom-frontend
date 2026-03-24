import { useState, useEffect, useRef } from 'react';
import { NbaPlayer, searchPlayers } from '../api/nba';

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NbaPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [forceShow, setForceShow] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchQuery.trim().length <= 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const results = await searchPlayers(searchQuery, controller.signal);
        setSearchResults(results);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        const status = err?.response?.status || 'Unknown Status';
        console.error(`[searchPlayers] Failed with status ${status}:`, err);
        setSearchError(err instanceof Error ? err.message : 'An unknown error occurred');
        setSearchResults([]);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, forceShow]);

  const triggerSearch = () => {
    if (searchQuery.trim().length >= 3) {
      setForceShow(n => n + 1);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    searchError,
    abortControllerRef,
    triggerSearch,
  };
}