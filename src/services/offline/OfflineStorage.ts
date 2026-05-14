// Offline Storage Service Implementation
import { OfflineStorage } from '../interfaces';
import {
  BibleContent,
  VerseReference,
  Verse,
  SyncResult,
  OfflineChange,
  StorageInfo
} from '../../types';
import { indexedDBManager } from './IndexedDBManager';
import { CompressionUtils } from './CompressionUtils';

export class OfflineStorageService implements OfflineStorage {
  private isOfflineMode: boolean = false;
  private offlineCallbacks: ((offline: boolean) => void)[] = [];
  private pendingChanges: OfflineChange[] = [];
  private compressionEnabled: boolean = true;

  constructor() {
    // Check if compression is supported
    this.compressionEnabled = CompressionUtils.isCompressionSupported();
    if (!this.compressionEnabled) {
      console.warn('Browser compression not supported, using uncompressed storage');
    }
  }

  async cacheContent(content: BibleContent): Promise<void> {
    try {
      // Cache the version metadata
      await indexedDBManager.cacheVersion(content.version);

      // Cache all books in the content
      for (const book of content.books) {
        await indexedDBManager.cacheBook(book, content.version, this.compressionEnabled);

        // Also cache individual chapters for faster access
        for (const chapter of book.chapters) {
          await indexedDBManager.cacheChapter(chapter, book.name, content.version, this.compressionEnabled);

          // Cache individual verses for granular access
          for (const verse of chapter.verses) {
            await indexedDBManager.cacheVerse(verse, this.compressionEnabled);
          }
        }
      }

      // Store metadata about the cached content
      await indexedDBManager.setMetadata(`content-${content.version.id}`, {
        loadedAt: content.metadata.loadedAt,
        checksum: content.metadata.checksum,
        size: content.metadata.size,
        bookCount: content.books.length
      });

      console.log(`Successfully cached content for version: ${content.version.name}`);
    } catch (error) {
      console.error('Failed to cache content:', error);
      throw error;
    }
  }

  async getCachedContent(reference: VerseReference): Promise<Verse | null> {
    try {
      // Try to get from cache - we need to know which version to use
      // For now, we'll try to get from any cached version
      const versions = await indexedDBManager.getAllCachedVersions();
      
      for (const version of versions) {
        const verse = await indexedDBManager.getCachedVerse(
          reference.book,
          reference.chapter,
          reference.verse,
          version.id
        );
        if (verse) {
          return verse;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached content:', error);
      return null;
    }
  }

  async preloadForOffline(references: VerseReference[]): Promise<void> {
    console.log(`Preloading ${references.length} references for offline use`);
    // This would fetch and cache the specified references
    // Implementation depends on having a content source (API or local data)
    // For now, this is a placeholder that will be completed when we integrate with actual content sources
  }

  async syncUserData(_userId: string): Promise<SyncResult> {
    // Implementation placeholder
    return {
      success: true,
      conflicts: [],
      syncedItems: 0,
      errors: []
    };
  }

  async handleOfflineChanges(changes: OfflineChange[]): Promise<void> {
    // Implementation placeholder
    this.pendingChanges.push(...changes);
  }

  async getStorageUsage(): Promise<StorageInfo> {
    try {
      const estimate = await indexedDBManager.getStorageEstimate();
      const used = estimate.used;
      const quota = estimate.quota;
      
      return {
        used,
        available: quota - used,
        quota,
        percentage: quota > 0 ? (used / quota) * 100 : 0
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      // Fallback values
      return {
        used: 0,
        available: 0,
        quota: 0,
        percentage: 0
      };
    }
  }

  async clearCache(olderThan?: Date): Promise<void> {
    try {
      if (olderThan) {
        const olderThanMs = Date.now() - olderThan.getTime();
        await indexedDBManager.clearOldCache(olderThanMs);
        console.log(`Cleared cache older than ${olderThan}`);
      } else {
        await indexedDBManager.clearAllCache();
        console.log('Cleared all cache');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  isOffline(): boolean {
    return this.isOfflineMode || !navigator.onLine;
  }

  onOfflineStatusChange(callback: (offline: boolean) => void): void {
    this.offlineCallbacks.push(callback);
    
    // Set up network status listeners if not already done
    if (this.offlineCallbacks.length === 1) {
      this.setupNetworkListeners();
    }
  }

  private setupNetworkListeners(): void {
    const updateOfflineStatus = () => {
      const wasOffline = this.isOfflineMode;
      this.isOfflineMode = !navigator.onLine;
      
      if (wasOffline !== this.isOfflineMode) {
        this.offlineCallbacks.forEach(callback => callback(this.isOfflineMode));
      }
    };

    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
  }
}