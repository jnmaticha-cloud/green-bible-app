// Content Management Service Implementation
import { ContentManager, BookInfo } from '../interfaces';
import {
  BibleVersion,
  VerseReference,
  Verse,
  Chapter,
  Book,
  BIBLE_BOOKS,
  OLD_TESTAMENT_BOOKS,
  NEW_TESTAMENT_BOOKS
} from '../../types';
import { parseReference, validateVerseReference } from './ReferenceParser';
import { getCanonBook, getChapterCount as getCanonChapterCount } from './BibleCanon';
import { indexedDBManager } from '../offline/IndexedDBManager';
import { BibleVersionLoader } from './BibleVersionLoader';

export class ContentManagerService implements ContentManager {
  private versionLoader: BibleVersionLoader;
  private contentCache: Map<string, Verse> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  constructor() {
    // Initialize the version loader with all supported versions
    this.versionLoader = new BibleVersionLoader();
  }

  async getVerse(reference: VerseReference, version: BibleVersion): Promise<Verse> {
    // Validate reference first
    if (!validateVerseReference(reference)) {
      throw new Error(`Invalid verse reference: ${JSON.stringify(reference)}`);
    }
    
    // Check in-memory cache first
    const cacheKey = this.getVerseCacheKey(reference, version);
    const cached = this.contentCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check IndexedDB cache
    const dbCached = await indexedDBManager.getCachedVerse(
      reference.book,
      reference.chapter,
      reference.verse,
      version.id
    );
    if (dbCached) {
      // Store in memory cache for faster subsequent access
      this.contentCache.set(cacheKey, dbCached);
      return dbCached;
    }

    // Load from version loader
    const verse = await this.versionLoader.loadVerse(
      reference.book,
      reference.chapter,
      reference.verse,
      version.id
    );

    if (!verse) {
      throw new Error(`Verse not found: ${reference.book} ${reference.chapter}:${reference.verse} (${version.abbreviation})`);
    }

    // Cache in memory and IndexedDB
    this.contentCache.set(cacheKey, verse);
    await indexedDBManager.cacheVerse(verse);

    return verse;
  }

  async getChapter(book: string, chapter: number, version: BibleVersion): Promise<Chapter> {
    // Validate book and chapter
    const canonBook = getCanonBook(book);
    if (!canonBook) {
      throw new Error(`Invalid book: ${book}`);
    }
    
    const chapterCount = getCanonChapterCount(book);
    if (chapter < 1 || chapter > chapterCount) {
      throw new Error(`Invalid chapter ${chapter} for book ${book}. Valid range: 1-${chapterCount}`);
    }
    
    // Check IndexedDB cache
    const cached = await indexedDBManager.getCachedChapter(book, chapter, version.id);
    if (cached) {
      return cached;
    }

    // Load from version loader
    const chapterData = await this.versionLoader.loadChapter(book, chapter, version.id);
    
    if (!chapterData) {
      throw new Error(`Chapter not found: ${book} ${chapter} (${version.abbreviation})`);
    }

    // Cache in IndexedDB
    await indexedDBManager.cacheChapter(chapterData, book, version);

    return chapterData;
  }

  async getBook(book: string, version: BibleVersion): Promise<Book> {
    // Validate book
    const canonBook = getCanonBook(book);
    if (!canonBook) {
      throw new Error(`Invalid book: ${book}`);
    }
    
    // Check IndexedDB cache
    const cached = await indexedDBManager.getCachedBook(book, version.id);
    if (cached) {
      return cached;
    }

    // Load from version loader
    const bookData = await this.versionLoader.loadBook(book, version.id);
    
    if (!bookData) {
      throw new Error(`Book not found: ${book} (${version.abbreviation})`);
    }

    // Cache in IndexedDB
    await indexedDBManager.cacheBook(bookData, version);

    return bookData;
  }

  validateReference(reference: string): VerseReference | null {
    return parseReference(reference);
  }

  getSupportedVersions(): BibleVersion[] {
    return this.versionLoader.getSupportedVersions();
  }

  getBookList(testament?: 'OT' | 'NT'): BookInfo[] {
    const books = testament === 'OT' ? OLD_TESTAMENT_BOOKS : 
                  testament === 'NT' ? NEW_TESTAMENT_BOOKS : 
                  BIBLE_BOOKS;
    
    return books.map(book => {
      const canonBook = getCanonBook(book);
      return {
        name: book,
        abbreviation: canonBook?.abbreviation || book.substring(0, 3),
        testament: OLD_TESTAMENT_BOOKS.includes(book as any) ? 'OT' : 'NT',
        chapterCount: getCanonChapterCount(book)
      };
    });
  }

  async preloadContent(references: VerseReference[], version: BibleVersion): Promise<void> {
    // Validate all references first
    for (const ref of references) {
      if (!validateVerseReference(ref)) {
        throw new Error(`Invalid verse reference: ${JSON.stringify(ref)}`);
      }
    }
    
    // Use version loader's preload functionality
    await this.versionLoader.preloadVerses(version.id, references);
  }

  getCachedContent(reference: VerseReference): Verse | null {
    if (!validateVerseReference(reference)) {
      return null;
    }
    
    // Check in-memory cache
    // We need to check all versions since we don't know which one to use
    for (const version of this.getSupportedVersions()) {
      const key = this.getVerseCacheKey(reference, version);
      const cached = this.contentCache.get(key);
      if (cached) {
        return cached;
      }
    }
    
    return null;
  }

  /**
   * Get version-specific display properties
   */
  getVersionDisplayProperties(versionId: string): {
    fontFamily: string;
    textDirection: 'ltr' | 'rtl';
    requiresSpecialFont: boolean;
  } {
    return {
      fontFamily: this.versionLoader.getFontFamily(versionId),
      textDirection: this.versionLoader.getTextDirection(versionId),
      requiresSpecialFont: this.versionLoader.requiresSpecialFont(versionId)
    };
  }

  /**
   * Get a specific version by ID
   */
  getVersion(versionId: string): BibleVersion | null {
    return this.versionLoader.getVersion(versionId);
  }

  private getVerseCacheKey(reference: VerseReference, version: BibleVersion): string {
    return `${version.id}-${reference.book}-${reference.chapter}-${reference.verse}`;
  }

  // Helper method to load content in chunks (progressive loading)
  async loadChapterProgressive(book: string, chapter: number, version: BibleVersion): Promise<Chapter> {
    const cacheKey = `loading-${version.id}-${book}-${chapter}`;
    
    // Check if already loading
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Create loading promise
    const loadingPromise = this.getChapter(book, chapter, version);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      // Clean up loading promise
      this.loadingPromises.delete(cacheKey);
    }
  }

  // Helper method to batch load multiple chapters
  async loadChaptersBatch(
    book: string,
    startChapter: number,
    endChapter: number,
    version: BibleVersion
  ): Promise<Chapter[]> {
    const chapters: Chapter[] = [];
    
    // Load chapters in parallel but with controlled concurrency
    const CONCURRENT_LOADS = 3;
    for (let i = startChapter; i <= endChapter; i += CONCURRENT_LOADS) {
      const batch = [];
      for (let j = i; j < Math.min(i + CONCURRENT_LOADS, endChapter + 1); j++) {
        batch.push(this.loadChapterProgressive(book, j, version));
      }
      const results = await Promise.all(batch);
      chapters.push(...results);
    }

    return chapters;
  }
}