// Tests for content loading and caching system
import { describe, it, expect, beforeEach } from 'vitest';
import { CompressionUtils } from '../../src/services/offline/CompressionUtils';
import { ContentManagerService } from '../../src/services/content/ContentManager';
import { progressiveLoader } from '../../src/services/content/ProgressiveLoader';
import { BibleVersion } from '../../src/types';

describe('Content Loading and Caching System', () => {
  const testVersion: BibleVersion = {
    id: 'test-kjv',
    name: 'Test King James Version',
    abbreviation: 'KJV',
    language: 'English',
    year: 1611,
    features: []
  };

  describe('ContentManager - Progressive Loading', () => {
    let contentManager: ContentManagerService;

    beforeEach(() => {
      contentManager = new ContentManagerService();
    });

    it('should have supported versions configured', () => {
      const versions = contentManager.getSupportedVersions();
      expect(versions).toBeDefined();
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0]).toHaveProperty('id');
      expect(versions[0]).toHaveProperty('name');
      expect(versions[0]).toHaveProperty('abbreviation');
    });

    it('should validate verse references', () => {
      const validRef = contentManager.validateReference('John 3:16');
      expect(validRef).toBeDefined();
      expect(validRef?.book).toBe('John');
      expect(validRef?.chapter).toBe(3);
      expect(validRef?.verse).toBe(16);
    });

    it('should return null for invalid references', () => {
      const invalidRef = contentManager.validateReference('InvalidBook 1:1');
      expect(invalidRef).toBeNull();
    });

    it('should get book list', () => {
      const allBooks = contentManager.getBookList();
      expect(allBooks).toBeDefined();
      expect(allBooks.length).toBe(66); // Complete Bible canon

      const otBooks = contentManager.getBookList('OT');
      expect(otBooks.length).toBe(39);

      const ntBooks = contentManager.getBookList('NT');
      expect(ntBooks.length).toBe(27);
    });

    it('should return cached content as null when not cached', () => {
      const cached = contentManager.getCachedContent({
        book: 'Genesis',
        chapter: 1,
        verse: 1
      });
      expect(cached).toBeNull();
    });

    it('should throw error for invalid verse reference in getVerse', async () => {
      await expect(
        contentManager.getVerse(
          { book: 'InvalidBook', chapter: 1, verse: 1 },
          testVersion
        )
      ).rejects.toThrow('Invalid verse reference');
    });

    it('should throw error for invalid book in getChapter', async () => {
      await expect(
        contentManager.getChapter('InvalidBook', 1, testVersion)
      ).rejects.toThrow('Invalid book');
    });

    it('should throw error for invalid chapter number', async () => {
      await expect(
        contentManager.getChapter('Genesis', 999, testVersion)
      ).rejects.toThrow('Invalid chapter');
    });

    it('should throw error for invalid book in getBook', async () => {
      await expect(
        contentManager.getBook('InvalidBook', testVersion)
      ).rejects.toThrow('Invalid book');
    });
  });

  describe('Progressive Loader', () => {
    it('should have loading strategy methods', () => {
      expect(progressiveLoader).toBeDefined();
      expect(typeof progressiveLoader.loadWithStrategy).toBe('function');
      expect(typeof progressiveLoader.estimateLoadingTime).toBe('function');
      expect(typeof progressiveLoader.shouldLoadNow).toBe('function');
    });

    it('should estimate loading time', () => {
      const time = progressiveLoader.estimateLoadingTime(10, 1024);
      expect(time).toBeGreaterThan(0);
      expect(typeof time).toBe('number');
    });

    it('should determine if content should load based on priority', () => {
      expect(progressiveLoader.shouldLoadNow('high', 10)).toBe(true);
      expect(progressiveLoader.shouldLoadNow('high', 100)).toBe(false);
      expect(progressiveLoader.shouldLoadNow('low', 5)).toBe(true);
      expect(progressiveLoader.shouldLoadNow('low', 20)).toBe(false);
    });

    it('should load items with strategy', async () => {
      const items = [1, 2, 3, 4, 5];
      const loadFn = async (item: number) => item * 2;
      
      const results = await progressiveLoader.loadWithStrategy(
        items,
        loadFn,
        { priority: 'high', batchSize: 2, concurrency: 2 }
      );

      expect(results).toHaveLength(5);
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should clear loading state', () => {
      progressiveLoader.clearState();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Compression Utilities', () => {
    it('should check if compression is supported', () => {
      const isSupported = CompressionUtils.isCompressionSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    it('should estimate compressed size', () => {
      const text = 'In the beginning God created the heaven and the earth.';
      const estimated = CompressionUtils.estimateCompressedSize(text);
      
      expect(estimated).toBeGreaterThan(0);
      expect(estimated).toBeLessThan(text.length);
    });

    it('should calculate compression ratio', () => {
      const original = 'In the beginning God created the heaven and the earth.';
      const compressed = new TextEncoder().encode(original);
      const ratio = CompressionUtils.calculateCompressionRatio(original, compressed);
      
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });

    it('should compress and decompress text', async () => {
      const original = 'In the beginning God created the heaven and the earth.';
      const compressed = await CompressionUtils.compressText(original);
      
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeGreaterThan(0);

      const decompressed = await CompressionUtils.decompressText(compressed);
      expect(decompressed).toBe(original);
    });

    it('should compress and decompress JSON', async () => {
      const original = { book: 'Genesis', chapter: 1, verse: 1 };
      const compressed = await CompressionUtils.compressJSON(original);
      
      expect(compressed).toBeDefined();

      const decompressed = await CompressionUtils.decompressJSON(compressed);
      expect(decompressed).toEqual(original);
    });
  });
});

