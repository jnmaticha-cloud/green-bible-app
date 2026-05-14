// Service interface definitions for the Bible application

import {
  BibleVersion,
  VerseReference,
  Verse,
  Chapter,
  Book,
  BibleContent,
  SearchOptions,
  SearchResult,
  SearchFilters,
  CrossReference,
  Commentary,
  WordStudy,
  ParallelPassage,
  TopicalStudy,
  ThematicStudy,
  Bookmark,
  Note,
  Highlight,
  ReadingPlan,
  UserReadingPlan,
  ReadingProgress,
  ShareResult,
  ExportResult,
  SyncResult,
  OfflineChange,
  StorageInfo
} from '../types';

// Content Management Service Interface
export interface ContentManager {
  // Core content retrieval
  getVerse(reference: VerseReference, version: BibleVersion): Promise<Verse>;
  getChapter(book: string, chapter: number, version: BibleVersion): Promise<Chapter>;
  getBook(book: string, version: BibleVersion): Promise<Book>;
  
  // Content validation and utilities
  validateReference(reference: string): VerseReference | null;
  getSupportedVersions(): BibleVersion[];
  getBookList(testament?: 'OT' | 'NT'): BookInfo[];
  
  // Progressive loading
  preloadContent(references: VerseReference[], version: BibleVersion): Promise<void>;
  getCachedContent(reference: VerseReference): Verse | null;
}

export interface BookInfo {
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  chapterCount: number;
}

// Search Engine Service Interface
export interface SearchEngine {
  // Core search functionality
  searchText(query: string, options: SearchOptions): Promise<SearchResult[]>;
  searchByReference(reference: string): Promise<Verse[]>;
  
  // Advanced search features
  getSearchSuggestions(partialQuery: string): Promise<string[]>;
  searchWithFilters(query: string, filters: SearchFilters): Promise<SearchResult[]>;
  
  // Search optimization
  indexContent(content: BibleContent): Promise<void>;
  clearSearchIndex(): Promise<void>;
}

// Study Tools Service Interface
export interface StudyTools {
  // Cross-references
  getCrossReferences(reference: VerseReference): Promise<CrossReference[]>;
  getParallelPassages(reference: VerseReference): Promise<ParallelPassage[]>;
  
  // Commentary and study notes
  getCommentary(reference: VerseReference): Promise<Commentary[]>;
  getWordStudy(word: string, language: 'hebrew' | 'greek'): Promise<WordStudy>;
  
  // Topical studies
  getTopicalReferences(topic: string): Promise<TopicalStudy>;
  getThematicStudies(): Promise<ThematicStudy[]>;
}

// User Experience Service Interface
export interface UserExperience {
  // Bookmarks and notes
  addBookmark(reference: VerseReference, note?: string, category?: string): Promise<Bookmark>;
  getBookmarks(userId: string, category?: string): Promise<Bookmark[]>;
  addNote(reference: VerseReference, content: string): Promise<Note>;
  
  // Highlighting and annotations
  addHighlight(reference: VerseReference, color: string, text: string): Promise<Highlight>;
  getHighlights(userId: string): Promise<Highlight[]>;
  
  // Reading plans
  getReadingPlans(): Promise<ReadingPlan[]>;
  startReadingPlan(planId: string, userId: string): Promise<UserReadingPlan>;
  markReadingComplete(planId: string, day: number, userId: string): Promise<void>;
  getReadingProgress(planId: string, userId: string): Promise<ReadingProgress>;
  
  // Sharing and export
  shareVerse(reference: VerseReference, platform: string): Promise<ShareResult>;
  exportNotes(userId: string, format: 'json' | 'pdf' | 'txt'): Promise<ExportResult>;
}

// Offline Storage Service Interface
export interface OfflineStorage {
  // Content caching
  cacheContent(content: BibleContent): Promise<void>;
  getCachedContent(reference: VerseReference): Promise<Verse | null>;
  preloadForOffline(references: VerseReference[]): Promise<void>;
  
  // User data sync
  syncUserData(userId: string): Promise<SyncResult>;
  handleOfflineChanges(changes: OfflineChange[]): Promise<void>;
  
  // Storage management
  getStorageUsage(): Promise<StorageInfo>;
  clearCache(olderThan?: Date): Promise<void>;
  
  // Offline status
  isOffline(): boolean;
  onOfflineStatusChange(callback: (offline: boolean) => void): void;
}