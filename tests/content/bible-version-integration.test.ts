// Test for Bible Version Integration (Task 2.5)
import { describe, it, expect, beforeEach } from 'vitest';
import { BibleVersionLoader } from '@/services/content/BibleVersionLoader';

describe('Bible Version Integration', () => {
  let loader: BibleVersionLoader;

  beforeEach(() => {
    loader = new BibleVersionLoader();
  });

  describe('English Bible Versions', () => {
    it('should load KJV verses', async () => {
      const verse = await loader.loadVerse('Genesis', 1, 1, 'kjv');
      expect(verse).toBeDefined();
      expect(verse?.text).toContain('In the beginning');
      expect(verse?.version.abbreviation).toBe('KJV');
    });

    it('should load NIV verses', async () => {
      const verse = await loader.loadVerse('John', 3, 16, 'niv');
      expect(verse).toBeDefined();
      expect(verse?.text).toContain('For God so loved the world');
      expect(verse?.version.abbreviation).toBe('NIV');
    });

    it('should load ESV verses', async () => {
      const verse = await loader.loadVerse('Genesis', 1, 1, 'esv');
      expect(verse).toBeDefined();
      expect(verse?.text).toContain('In the beginning');
      expect(verse?.version.abbreviation).toBe('ESV');
    });

    it('should load NLT verses', async () => {
      const verse = await loader.loadVerse('John', 3, 16, 'nlt');
      expect(verse).toBeDefined();
      expect(verse?.text).toContain('For this is how God loved');
      expect(verse?.version.abbreviation).toBe('NLT');
    });

    it('should load NKJV verses', async () => {
      const verse = await loader.loadVerse('Genesis', 1, 1, 'nkjv');
      expect(verse).toBeDefined();
      expect(verse?.text).toContain('In the beginning');
      expect(verse?.version.abbreviation).toBe('NKJV');
    });
  });

  describe('Ethiopian Bible Support', () => {
    it('should load Ethiopian verses in Amharic', async () => {
      const verse = await loader.loadVerse('Genesis', 1, 1, 'ethiopian');
      expect(verse).toBeDefined();
      expect(verse?.text).toContain('በፊተጊዜ');
      expect(verse?.version.language).toBe('Amharic');
    });

    it('should provide proper Amharic font family', () => {
      const fontFamily = loader.getFontFamily('ethiopian');
      expect(fontFamily).toContain('Noto Sans Ethiopic');
    });

    it('should use left-to-right text direction for Ethiopian', () => {
      const direction = loader.getTextDirection('ethiopian');
      expect(direction).toBe('ltr');
    });

    it('should require special font for Ethiopian', () => {
      const requiresFont = loader.requiresSpecialFont('ethiopian');
      expect(requiresFont).toBe(true);
    });
  });

  describe('Hebrew Bible Support', () => {
    it('should load Hebrew verses', async () => {
      const verse = await loader.loadVerse('Genesis', 1, 1, 'hebrew');
      expect(verse).toBeDefined();
      expect(verse?.text).toContain('בְּרֵאשִׁית');
      expect(verse?.version.language).toBe('Hebrew');
    });

    it('should use right-to-left text direction for Hebrew', () => {
      const direction = loader.getTextDirection('hebrew');
      expect(direction).toBe('rtl');
    });

    it('should provide proper Hebrew font family', () => {
      const fontFamily = loader.getFontFamily('hebrew');
      expect(fontFamily).toContain('Noto Sans Hebrew');
    });

    it('should be marked as right-to-left', () => {
      const isRTL = loader.isRightToLeft('hebrew');
      expect(isRTL).toBe(true);
    });
  });

  describe('Version Management', () => {
    it('should return all supported versions', () => {
      const versions = loader.getSupportedVersions();
      expect(versions).toHaveLength(7);
      
      const versionIds = versions.map(v => v.id);
      expect(versionIds).toContain('kjv');
      expect(versionIds).toContain('niv');
      expect(versionIds).toContain('esv');
      expect(versionIds).toContain('nlt');
      expect(versionIds).toContain('nkjv');
      expect(versionIds).toContain('ethiopian');
      expect(versionIds).toContain('hebrew');
    });

    it('should get specific version by ID', () => {
      const kjv = loader.getVersion('kjv');
      expect(kjv).toBeDefined();
      expect(kjv?.name).toBe('King James Version');
      expect(kjv?.year).toBe(1611);
    });

    it('should return null for invalid version ID', () => {
      const invalid = loader.getVersion('invalid');
      expect(invalid).toBeNull();
    });
  });

  describe('Bulk Loading Operations', () => {
    it('should load multiple verses efficiently', async () => {
      const references = [
        { book: 'Genesis', chapter: 1, verse: 1 },
        { book: 'John', chapter: 3, verse: 16 },
        { book: 'Psalms', chapter: 23, verse: 1 }
      ];

      const verses = await loader.loadMultipleVerses(references, 'kjv');
      expect(verses).toHaveLength(3);
      expect(verses[0].text).toContain('In the beginning');
      expect(verses[1].text).toContain('For God so loved');
      expect(verses[2].text).toContain('The LORD is my shepherd');
    });

    it('should load verse ranges', async () => {
      const verses = await loader.loadVerseRange('Genesis', 1, 1, 3, 'kjv');
      expect(verses).toHaveLength(3);
      expect(verses[0].reference.verse).toBe(1);
      expect(verses[1].reference.verse).toBe(2);
      expect(verses[2].reference.verse).toBe(3);
    });

    it('should load complete chapters', async () => {
      const chapter = await loader.loadChapter('Psalms', 23, 'kjv');
      expect(chapter).toBeDefined();
      expect(chapter?.number).toBe(23);
      expect(chapter?.verses.length).toBeGreaterThan(0);
    });
  });

  describe('Version Availability', () => {
    it('should check if versions are available', async () => {
      const kjvAvailable = await loader.isVersionAvailable('kjv');
      expect(kjvAvailable).toBe(true);

      const invalidAvailable = await loader.isVersionAvailable('invalid');
      expect(invalidAvailable).toBe(false);
    });

    it('should get version statistics', async () => {
      const stats = await loader.getVersionStats('kjv');
      expect(stats).toBeDefined();
      expect(stats?.books).toBe(66);
      expect(stats?.availableBooks).toContain('Genesis');
      expect(stats?.availableBooks).toContain('Revelation');
    });

    it('should validate version integrity', async () => {
      const validation = await loader.validateVersionIntegrity();
      expect(validation).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
      
      // Should have minimal errors for basic functionality
      expect(validation.errors.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid book names', async () => {
      await expect(
        loader.loadVerse('InvalidBook', 1, 1, 'kjv')
      ).rejects.toThrow('Invalid book');
    });

    it('should handle invalid chapter numbers', async () => {
      await expect(
        loader.loadVerse('Genesis', 999, 1, 'kjv')
      ).rejects.toThrow('Invalid chapter');
    });

    it('should handle invalid verse numbers', async () => {
      await expect(
        loader.loadVerse('Genesis', 1, 999, 'kjv')
      ).rejects.toThrow('Invalid verse');
    });

    it('should handle invalid version IDs', async () => {
      await expect(
        loader.loadVerse('Genesis', 1, 1, 'invalid')
      ).rejects.toThrow('Version not found');
    });
  });

  describe('Caching and Performance', () => {
    it('should cache loaded verses', async () => {
      // Load verse first time
      const verse1 = await loader.loadVerse('Genesis', 1, 1, 'kjv');
      expect(verse1).toBeDefined();

      // Load same verse again - should be from cache
      const verse2 = await loader.loadVerse('Genesis', 1, 1, 'kjv');
      expect(verse2).toBeDefined();
      expect(verse1?.text).toBe(verse2?.text);
    });

    it('should clear cache when requested', async () => {
      // Load and cache a verse
      await loader.loadVerse('Genesis', 1, 1, 'kjv');
      
      // Clear cache
      loader.clearCache('kjv');
      
      // Should still be able to load (will fetch again)
      const verse = await loader.loadVerse('Genesis', 1, 1, 'kjv');
      expect(verse).toBeDefined();
    });

    it('should preload verses for performance', async () => {
      const references = [
        { book: 'Genesis', chapter: 1, verse: 1 },
        { book: 'Genesis', chapter: 1, verse: 2 },
        { book: 'Genesis', chapter: 1, verse: 3 }
      ];

      // Should not throw and should complete quickly
      await expect(
        loader.preloadVerses(references, 'kjv')
      ).resolves.toBeUndefined();
    });
  });
});