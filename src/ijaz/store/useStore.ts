import { create } from 'zustand';
import { MiracleCategory, AppState } from '@/ijaz/types';

export const useStore = create<AppState>((set) => ({
  currentCategory: null,
  setCurrentCategory: (cat: MiracleCategory | null) => set({ currentCategory: cat }),

  isAudioEnabled: false,
  toggleAudio: () => set((state) => ({ isAudioEnabled: !state.isAudioEnabled })),

  currentAudioTrack: null,
  setAudioTrack: (track: string | null) => set({ currentAudioTrack: track }),

  searchQuery: '',
  setSearchQuery: (q: string) => set({ searchQuery: q }),

  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  activeVisualization: null,
  setActiveVisualization: (v: string | null) => set({ activeVisualization: v }),

  cursorPosition: { x: 0, y: 0 },
  setCursorPosition: (pos: { x: number; y: number }) => set({ cursorPosition: pos }),
}));
