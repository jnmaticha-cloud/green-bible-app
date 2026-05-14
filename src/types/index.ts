// Core type definitions for the Bible application

export interface VerseReference {
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number; // for verse ranges
}

export interface BibleVersion {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  year: number;
  copyright?: string;
  features: VersionFeature[];
}

export interface VersionFeature {
  name: string;
  enabled: boolean;
}

export interface Verse {
  reference: VerseReference;
  text: string;
  version: BibleVersion;
  language: string;
  metadata?: VerseMetadata;
}

export interface VerseMetadata {
  footnotes?: Footnote[];
  crossReferences?: string[];
  originalLanguage?: string;
}

export interface Footnote {
  id: string;
  text: string;
  type: 'translation' | 'textual' | 'explanatory';
}

export interface Chapter {
  number: number;
  verses: Verse[];
  title?: string;
}

export interface Book {
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  chapters: Chapter[];
  metadata: BookMetadata;
}

export interface BookMetadata {
  author?: string;
  writtenDate?: string;
  theme?: string;
  keyVerses?: VerseReference[];
}

export interface SearchOptions {
  versions?: BibleVersion[];
  books?: string[];
  testament?: 'OT' | 'NT';
  exactPhrase?: boolean;
  maxResults?: number;
}

export interface SearchResult {
  verse: Verse;
  relevanceScore: number;
  highlightedText: string;
  context: string;
}

export interface SearchFilters {
  books?: string[];
  testament?: 'OT' | 'NT';
  versions?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface CrossReference {
  sourceReference: VerseReference;
  targetReference: VerseReference;
  relationship: 'parallel' | 'quotation' | 'allusion' | 'theme';
  strength: number; // 1-10 relevance score
}

export interface Commentary {
  reference: VerseReference;
  author: string;
  text: string;
  type: 'verse' | 'passage' | 'chapter';
  source: string;
}

export interface WordStudy {
  word: string;
  originalLanguage: 'hebrew' | 'greek';
  transliteration: string;
  definition: string;
  usage: string[];
  relatedVerses: VerseReference[];
}

export interface ParallelPassage {
  reference: VerseReference;
  similarity: number;
  differences: string[];
}

export interface TopicalStudy {
  topic: string;
  description: string;
  references: VerseReference[];
  keyThemes: string[];
}

export interface ThematicStudy {
  id: string;
  title: string;
  description: string;
  passages: VerseReference[];
  studyGuide: string;
}

export interface Bookmark {
  id: string;
  reference: VerseReference;
  note?: string | undefined;
  category?: string | undefined;
  createdAt: Date;
  userId: string;
}

export interface Note {
  id: string;
  reference: VerseReference;
  content: string;
  isPrivate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Highlight {
  id: string;
  reference: VerseReference;
  color: string;
  text: string;
  userId: string;
  createdAt: Date;
}

export interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  duration: number; // days
  dailyReadings: DailyReading[];
}

export interface DailyReading {
  day: number;
  readings: VerseReference[];
  title?: string;
  theme?: string;
}

export interface UserReadingPlan {
  planId: string;
  userId: string;
  startDate: Date;
  currentDay: number;
  completedDays: number[];
  isActive: boolean;
}

export interface ReadingProgress {
  planId: string;
  userId: string;
  completionPercentage: number;
  daysCompleted: number;
  daysRemaining: number;
  isOnTrack: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  preferences: UserPreferences;
  readingHistory: ReadingHistoryEntry[];
  createdAt: Date;
  lastSyncAt: Date;
}

export interface UserPreferences {
  defaultVersion: string;
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  language: string;
  autoSync: boolean;
  offlineMode: boolean;
}

export interface ReadingHistoryEntry {
  reference: VerseReference;
  timestamp: Date;
  duration?: number; // reading time in seconds
}

export interface ShareResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  data?: string | Buffer;
  filename?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  conflicts: DataConflict[];
  syncedItems: number;
  errors: SyncError[];
}

export interface DataConflict {
  id: string;
  type: 'bookmark' | 'note' | 'highlight' | 'progress';
  localData: any;
  serverData: any;
  resolution?: 'local' | 'server' | 'merge';
}

export interface SyncError {
  id: string;
  message: string;
  type: 'network' | 'validation' | 'conflict';
}

export interface OfflineChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'bookmark' | 'note' | 'highlight' | 'progress';
  data: any;
  timestamp: Date;
}

export interface StorageInfo {
  used: number; // bytes
  available: number; // bytes
  quota: number; // bytes
  percentage: number;
}

export interface BibleContent {
  version: BibleVersion;
  books: Book[];
  metadata: {
    loadedAt: Date;
    checksum: string;
    size: number;
  };
}

// Constants for Bible canon
export const BIBLE_BOOKS = [
  // Old Testament
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
  'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  // New Testament
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
  '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
] as const;

export type BookName = typeof BIBLE_BOOKS[number];

export const OLD_TESTAMENT_BOOKS = BIBLE_BOOKS.slice(0, 39);
export const NEW_TESTAMENT_BOOKS = BIBLE_BOOKS.slice(39);