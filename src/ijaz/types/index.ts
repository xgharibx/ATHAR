// ============================================================
// TYPES - الإعجاز العلمي Platform Type Definitions
// ============================================================

export type MiracleCategory =
  | 'cosmological'
  | 'biological'
  | 'earth-sciences'
  | 'prophecies'
  | 'logical-philosophical';

export interface QuranicVerse {
  id: string;
  surah: string;
  surahNumber: number;
  ayahNumber: number;
  ayahNumberEnd?: number;
  arabicText: string;
  translation: string;
  transliteration?: string;
  keywords: string[];
}

export interface ScientificEvidence {
  id?: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  source: string;
  year?: string;
  scientist?: string;
}

export interface Miracle {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  category: MiracleCategory;
  subcategory: string;
  summary: string;
  summaryAr: string;
  description: string;
  descriptionAr: string;
  verses: QuranicVerse[];
  scientificEvidence: ScientificEvidence[];
  bookSource: BookSource;
  visualizationType: 'cosmos' | 'microscopic' | 'earth' | 'timeline' | 'logic';
  tags: string[];
  relatedMiracleIds: string[];
  videoIds: string[];
  order: number;
}

export interface BookSource {
  bookId: string;
  bookTitle: string;
  bookTitleAr: string;
  author: string;
  authorAr?: string;
  chapter?: string;
  chapterAr?: string;
  pageRange?: string;
  fullText: string;
  fullTextAr: string;
}

export interface Category {
  id: MiracleCategory;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  color: string;
  glowColor: string;
  sceneType: 'cosmos' | 'microscopic' | 'earth' | 'timeline' | 'logic';
  miracleCount: number;
}

export interface VideoResource {
  id: string;
  youtubeId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  thumbnailUrl: string;
  relatedMiracleIds: string[];
  category: MiracleCategory;
  duration?: string;
}

export interface SearchResult {
  miracle: Miracle;
  score: number;
  matchedField: string;
  highlight: string;
}

export interface LogicNode {
  id: string;
  claim: string;
  claimAr: string;
  type: 'atheist-claim' | 'refutation' | 'evidence' | 'conclusion';
  content: string;
  contentAr: string;
  children: string[];
  parentId?: string;
  source: string;
}

export interface TimelineEvent {
  id: string;
  year: number;
  yearEnd?: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: MiracleCategory;
  miracleId?: string;
  color: string;
}

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  category: MiracleCategory | 'ambient' | 'recitation';
}

export interface AppState {
  currentCategory: MiracleCategory | null;
  setCurrentCategory: (cat: MiracleCategory | null) => void;
  isAudioEnabled: boolean;
  toggleAudio: () => void;
  currentAudioTrack: string | null;
  setAudioTrack: (track: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  activeVisualization: string | null;
  setActiveVisualization: (v: string | null) => void;
  cursorPosition: { x: number; y: number };
  setCursorPosition: (pos: { x: number; y: number }) => void;
}
