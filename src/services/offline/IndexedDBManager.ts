// IndexedDB Manager for Bible Content Storage
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Verse, Chapter, Book, BibleVersion } from '../../types';

interface BibleDBSchema extends DBSchema {
  verses: {
    key: string; // format: "version-book-chapter-verse"
    value: {
      key: string;
      verse: Verse;
      cachedAt: number;
      compressed: boolean;
    };
  };
  chapters: {
    key: string; // format: "version-book-chapter"
    value: {
      key: string;
      chapter: Chapter;
      cachedAt: number;
      compressed: boolean;
    };
  };
  books: {
    key: string; // format: "version-book"
    value: {
      key: string;
      book: Book;
      cachedAt: number;
      compressed: boolean;
    };
  };
  versions: {
    key: string; // version id
    value: {
      version: BibleVersion;
      cachedAt: number;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      data: any;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'BibleContentDB';
const DB_VERSION = 1;

export class IndexedDBManager {
  private db: IDBPDatabase<BibleDBSchema> | null = null;
  private initPromise: Promise<void> | null = null;

  private isIndexedDBSupported(): boolean {
    const g = globalThis as any;
    return typeof g.indexedDB !== 'undefined' && typeof g.IDBRequest !== 'undefined';
  }

  async init(): Promise<void> {
    if (this.db) return;

    if (!this.isIndexedDBSupported()) {
      return;
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeDB();
    return this.initPromise;
  }

  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB<BibleDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create object stores if they don't exist
          if (!db.objectStoreNames.contains('verses')) {
            db.createObjectStore('verses', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('chapters')) {
            db.createObjectStore('chapters', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('books')) {
            db.createObjectStore('books', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('versions')) {
            db.createObjectStore('versions', { keyPath: 'version.id' });
          }
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      this.db = null;
    }
  }

  // Verse operations
  async cacheVerse(verse: Verse, compressed: boolean = false): Promise<void> {
    await this.init();
    if (!this.db) return;

    const key = this.getVerseKey(verse.reference, verse.version);
    await this.db.put('verses', {
      key,
      verse,
      cachedAt: Date.now(),
      compressed
    });
  }

  async getCachedVerse(book: string, chapter: number, verse: number, versionId: string): Promise<Verse | null> {
    await this.init();
    if (!this.db) return null;

    const key = `${versionId}-${book}-${chapter}-${verse}`;
    const cached = await this.db.get('verses', key);
    return cached?.verse || null;
  }

  // Chapter operations
  async cacheChapter(chapter: Chapter, book: string, version: BibleVersion, compressed: boolean = false): Promise<void> {
    await this.init();
    if (!this.db) return;

    const key = `${version.id}-${book}-${chapter.number}`;
    await this.db.put('chapters', {
      key,
      chapter,
      cachedAt: Date.now(),
      compressed
    });
  }

  async getCachedChapter(book: string, chapter: number, versionId: string): Promise<Chapter | null> {
    await this.init();
    if (!this.db) return null;

    const key = `${versionId}-${book}-${chapter}`;
    const cached = await this.db.get('chapters', key);
    return cached?.chapter || null;
  }

  // Book operations
  async cacheBook(book: Book, version: BibleVersion, compressed: boolean = false): Promise<void> {
    await this.init();
    if (!this.db) return;

    const key = `${version.id}-${book.name}`;
    await this.db.put('books', {
      key,
      book,
      cachedAt: Date.now(),
      compressed
    });
  }

  async getCachedBook(bookName: string, versionId: string): Promise<Book | null> {
    await this.init();
    if (!this.db) return null;

    const key = `${versionId}-${bookName}`;
    const cached = await this.db.get('books', key);
    return cached?.book || null;
  }

  // Version operations
  async cacheVersion(version: BibleVersion): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.put('versions', {
      version,
      cachedAt: Date.now()
    });
  }

  async getCachedVersion(versionId: string): Promise<BibleVersion | null> {
    await this.init();
    if (!this.db) return null;

    const cached = await this.db.get('versions', versionId);
    return cached?.version || null;
  }

  async getAllCachedVersions(): Promise<BibleVersion[]> {
    await this.init();
    if (!this.db) return [];

    const all = await this.db.getAll('versions');
    return all.map(item => item.version);
  }

  // Metadata operations
  async setMetadata(key: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.put('metadata', {
      key,
      data,
      updatedAt: Date.now()
    });
  }

  async getMetadata(key: string): Promise<any | null> {
    await this.init();
    if (!this.db) return null;

    const cached = await this.db.get('metadata', key);
    return cached?.data || null;
  }

  // Storage management
  async clearOldCache(olderThanMs: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    const cutoffTime = Date.now() - olderThanMs;
    const tx = this.db.transaction(['verses', 'chapters', 'books'], 'readwrite');

    // Clear old verses
    const versesCursor = await tx.objectStore('verses').openCursor();
    if (versesCursor) {
      for await (const cursor of versesCursor) {
        if (cursor.value.cachedAt < cutoffTime) {
          await cursor.delete();
        }
      }
    }

    // Clear old chapters
    const chaptersCursor = await tx.objectStore('chapters').openCursor();
    if (chaptersCursor) {
      for await (const cursor of chaptersCursor) {
        if (cursor.value.cachedAt < cutoffTime) {
          await cursor.delete();
        }
      }
    }

    // Clear old books
    const booksCursor = await tx.objectStore('books').openCursor();
    if (booksCursor) {
      for await (const cursor of booksCursor) {
        if (cursor.value.cachedAt < cutoffTime) {
          await cursor.delete();
        }
      }
    }

    await tx.done;
  }

  async clearAllCache(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction(['verses', 'chapters', 'books', 'versions', 'metadata'], 'readwrite');
    await Promise.all([
      tx.objectStore('verses').clear(),
      tx.objectStore('chapters').clear(),
      tx.objectStore('books').clear(),
      tx.objectStore('versions').clear(),
      tx.objectStore('metadata').clear()
    ]);
    await tx.done;
  }

  async getStorageEstimate(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }

  private getVerseKey(reference: { book: string; chapter: number; verse: number }, version: BibleVersion): string {
    return `${version.id}-${reference.book}-${reference.chapter}-${reference.verse}`;
  }
}

// Singleton instance
export const indexedDBManager = new IndexedDBManager();
