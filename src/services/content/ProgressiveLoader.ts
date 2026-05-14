// Progressive Loading Strategy for Bible Content
import { VerseReference, BibleVersion, Chapter } from '../../types';

export interface LoadingStrategy {
  priority: 'high' | 'medium' | 'low';
  batchSize: number;
  concurrency: number;
}

export class ProgressiveLoader {
  private loadingQueue: Map<string, Promise<any>> = new Map();
  private loadedChapters: Set<string> = new Set();

  /**
   * Load content with progressive strategy
   * High priority content loads first with higher concurrency
   */
  async loadWithStrategy<T>(
    items: T[],
    loadFn: (item: T) => Promise<any>,
    strategy: LoadingStrategy = { priority: 'medium', batchSize: 10, concurrency: 3 }
  ): Promise<any[]> {
    const results: any[] = [];
    const { batchSize, concurrency } = strategy;

    // Split into batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch with controlled concurrency
      for (let j = 0; j < batch.length; j += concurrency) {
        const concurrent = batch.slice(j, j + concurrency);
        const batchResults = await Promise.all(
          concurrent.map(item => this.loadWithDeduplication(item, loadFn))
        );
        results.push(...batchResults);
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < items.length) {
        await this.delay(10);
      }
    }

    return results;
  }

  /**
   * Load with deduplication - prevents loading the same content multiple times
   */
  private async loadWithDeduplication<T>(
    item: T,
    loadFn: (item: T) => Promise<any>
  ): Promise<any> {
    const key = JSON.stringify(item);
    
    // Check if already loading
    const existing = this.loadingQueue.get(key);
    if (existing) {
      return existing;
    }

    // Start loading
    const promise = loadFn(item);
    this.loadingQueue.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.loadingQueue.delete(key);
    }
  }

  /**
   * Preload chapters in the background
   * Useful for loading adjacent chapters while user reads current chapter
   */
  async preloadAdjacentChapters(
    book: string,
    currentChapter: number,
    version: BibleVersion,
    maxChapters: number,
    loadChapterFn: (book: string, chapter: number, version: BibleVersion) => Promise<Chapter>
  ): Promise<void> {
    const chaptersToLoad: number[] = [];
    
    // Load next chapters
    for (let i = 1; i <= 2 && currentChapter + i <= maxChapters; i++) {
      chaptersToLoad.push(currentChapter + i);
    }
    
    // Load previous chapter
    if (currentChapter > 1) {
      chaptersToLoad.push(currentChapter - 1);
    }

    // Load in background (don't await)
    this.loadInBackground(async () => {
      for (const chapterNum of chaptersToLoad) {
        const key = `${version.id}-${book}-${chapterNum}`;
        if (!this.loadedChapters.has(key)) {
          try {
            await loadChapterFn(book, chapterNum, version);
            this.loadedChapters.add(key);
          } catch (error) {
            console.warn(`Failed to preload chapter ${book} ${chapterNum}:`, error);
          }
        }
      }
    });
  }

  /**
   * Load verses on demand with smart caching
   * Loads the entire chapter if multiple verses from same chapter are requested
   */
  async loadVersesOnDemand(
    references: VerseReference[],
    version: BibleVersion,
    loadChapterFn: (book: string, chapter: number, version: BibleVersion) => Promise<Chapter>
  ): Promise<void> {
    // Group references by chapter
    const chapterGroups = new Map<string, VerseReference[]>();
    
    for (const ref of references) {
      const key = `${ref.book}-${ref.chapter}`;
      if (!chapterGroups.has(key)) {
        chapterGroups.set(key, []);
      }
      chapterGroups.get(key)!.push(ref);
    }

    // Load chapters that have multiple verse requests
    const chaptersToLoad: { book: string; chapter: number }[] = [];
    
    for (const [key, refs] of chapterGroups) {
      // If requesting 3+ verses from same chapter, load entire chapter
      if (refs.length >= 3) {
        const parts = key.split('-');
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const book = parts[0];
          const chapter = parseInt(parts[1]);
          chaptersToLoad.push({ book, chapter });
        }
      }
    }

    // Load chapters progressively
    await this.loadWithStrategy(
      chaptersToLoad,
      async ({ book, chapter }) => {
        const chapterKey = `${version.id}-${book}-${chapter}`;
        if (!this.loadedChapters.has(chapterKey)) {
          const result = await loadChapterFn(book, chapter, version);
          this.loadedChapters.add(chapterKey);
          return result;
        }
        return null;
      },
      { priority: 'high', batchSize: 5, concurrency: 2 }
    );
  }

  /**
   * Estimate loading time based on content size
   */
  estimateLoadingTime(itemCount: number, avgItemSize: number): number {
    // Rough estimate: 1ms per KB + overhead
    const totalSize = itemCount * avgItemSize;
    const baseTime = totalSize / 1024; // ms
    const overhead = itemCount * 2; // 2ms overhead per item
    return baseTime + overhead;
  }

  /**
   * Check if content should be loaded based on priority and available resources
   */
  shouldLoadNow(priority: 'high' | 'medium' | 'low', currentQueueSize: number): boolean {
    const maxQueueSize = priority === 'high' ? 50 : priority === 'medium' ? 20 : 10;
    return currentQueueSize < maxQueueSize;
  }

  /**
   * Clear loading state
   */
  clearState(): void {
    this.loadingQueue.clear();
    this.loadedChapters.clear();
  }

  private async loadInBackground(fn: () => Promise<void>): Promise<void> {
    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => fn());
    } else {
      setTimeout(() => fn(), 0);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const progressiveLoader = new ProgressiveLoader();
