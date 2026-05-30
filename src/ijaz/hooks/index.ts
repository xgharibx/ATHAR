
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/ijaz/store/useStore';

export function useCursorLight() {
  const setCursorPosition = useStore((state) => state.setCursorPosition);
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          setCursorPosition(posRef.current);
          rafRef.current = null;
        });
      }
    },
    [setCursorPosition]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleMouseMove]);
}

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isAudioEnabled, currentAudioTrack } = useStore();

  useEffect(() => {
    if (!isAudioEnabled || !currentAudioTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(currentAudioTrack);
    audio.loop = true;
    audio.volume = 0.15;
    audioRef.current = audio;

    audio.play().catch(() => {
      // Autoplay blocked by browser — silent fail
    });

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [isAudioEnabled, currentAudioTrack]);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, vol));
    }
  }, []);

  return { setVolume };
}

export function useSearch() {
  const { searchQuery, setSearchQuery } = useStore();

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  return { searchQuery, handleSearch, clearSearch };
}
