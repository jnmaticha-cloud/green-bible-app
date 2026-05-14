// Unit tests for Bible version integration
import { describe, it, expect, beforeEach } from 'vitest';
import { BibleVersionLoader } from '../../src/services/content/BibleVersionLoader';
import { ContentManagerService } from '../../src/services/content/ContentManager';

describe('Bible Version Integration', () => {
  let versionLoader: BibleVersionLoader;
  let contentManager: ContentManagerService;

  beforeEach(() => {
    versionLoader = new BibleVersionLoader();
    contentManager = new ContentManagerService();
  });

  describe('Required English Versions', () => {
    it('should have KJV available', () => {
      const version = versionLoader.getVersion('kjv');
      expect(version).toBeDefined();
      expect(version?.abbreviation).toBe('KJV');
      expect(version?.name).toBe('King James Version');
      expect(version?.language).toBe('English');
    });

    it('should have NIV available', () => {
      const version = versionLoader.getVersion('niv');
      expect(version).toBeDefined();
      expect(version?.abbreviation).toBe('NIV');
      expect(version?.name).toBe('New International Version');
      expect(version?.language).toBe('English');
    });

    it('should have ESV available', () => {
      const version = versionLoader.getVersion('esv');
      expect(version).toBeDefined();
      expect(version?.abbreviation).toBe('ESV');
      expect(version?.name).toBe('English Standard Version');
      expect(version?.language).toBe('English');
    });

    it('should have NLT available', () => {
      const version = versionLoader.getVersion('nlt');
      expect(version).toBeDefined();
      expect(version?.abbreviation).toBe('NLT');
      expect(version?.name).toBe('New Living Translation');
      expect(version?.language).toBe('English');
    });

    it('should have NKJV available', () => {
      const version = versionLoader.getVersion('nkjv');
      expect(version).toBeDefined();
      expect(version?.abbreviation).toBe('NKJV');
      expect(version?.name).toBe('New King James Version');
      expect(version?.language).toBe('English');
    });

    it('should return all 5 English versions plus Ethiopian and Hebrew', () => {
      const versions = versionLoader.getSupportedVersions();
      expect(versions.length).toBeGreaterThanOrEqual(7);
      
      const englishVersions = versions.filter(v => v.language === 'English');
      expect(englishVersions.length).toBeGreaterThanOrEqual(5);
      
      const versionIds = versions.map(v => v.id);
      expect(versionIds).toContain('kjv');
      expect(versionIds).toContain('niv');
      expect(versionIds).toContain('esv');
      expect(versionIds).toContain('nlt');
      expect(versionIds).toContain('nkjv');
    });
  });

  describe('Ethiopian Bible Support', () => {
    it('should have Ethiopian version available', () => {
      const version = versionLoader.getVersion('ethiopian');
      expect(version).toBeDefined();
      expect(version?.abbreviation).toBe('ETH');
      expect(version?.language).toBe('Amharic');
    });

    it('should have Amharic font feature enabled', () => {
      const version = versionLoader.getVersion('ethiopian');
      expect(version).toBeDefined();
      
      const amharicFeature = version?.features.find(f => f.name === 'amharic-font');
      expect(amharicFeature).toBeDefined();
      expect(amharicFeature?.enabled).toBe(true);
    });

    it('should provide correct font family for Ethiopian text', () => {
      const fontFamily = versionLoader.getFontFamily('ethiopian');
      expect(fontFamily).toContain('Noto Sans Ethiopic');
      expect(fontFamily).toContain('Nyala');
    });

    it('should use left-to-right text direction for Ethiopian', () => {
      const textDirection = versionLoader.getTextDirection('ethiopian');
      expect(textDirection).toBe('ltr');
    });

    it('should indicate special font requirement for Ethiopian', () => {
      const requiresSpecialFont = versionLoader.requiresSpecialFont('ethiopian');
      expect(requiresSpecialFont).toBe(true);
    });

    it('should load Ethiopian text with Amharic characters', async () => {
      const verse = await versionLoader.loadVerse('Genesis', 1, 1, 'ethiopian');
      expect(verse).toBeDefined();
      expect(verse?.text).toBeDefined();
      // Check for Amharic characters (Ethiopic script Unicode range)
      const hasAmharicChars = /[\u1200-\u137F]/.test(verse?.text || '');
      expect(hasAmharicChars).toBe(true);
    });
  });

  describe('Hebrew Bible Support', () => {
    it('should have Hebrew version available', () => {
      const version = versionLoader.getVersion('hebrew');
      expect(version).toBeDefined();
      expect(version?.abbreviation).toBe('HEB');
      expect(version?.language).toBe('Hebrew');
    });

    it('should have right-to-left feature enabled', () => {
      const version = versionLoader.getVersion('hebrew');
      expect(version).toBeDefined();
      
      const rtlFeature = version?.features.find(f => f.name === 'right-to-left');
      expect(rtlFeature).toBeDefined();
      expect(rtlFeature?.enabled).toBe(true);
    });

    it('should use right-to-left text direction for Hebrew', () => {
      const textDirection = versionLoader.getTextDirection('hebrew');
      expect(textDirection).toBe('rtl');
    });

    it('should provide correct font family for Hebrew text', () => {
      const fontFamily = versionLoader.getFontFamily('hebrew');
      expect(fontFamily).toContain('Noto Sans Hebrew');
      expect(fontFamily).toContain('David');
    });

    it('should indicate right-to-left display for Hebrew', () => {
      const isRTL = versionLoader.isRightToLeft('hebrew');
      expect(isRTL).toBe(true);
    });

    it('should load Hebrew text with Hebrew characters', async () => {
      const verse = await versionLoader.loadVerse('Genesis', 1, 1, 'hebrew');
      expect(verse).toBeDefined();
      expect(verse?.text).toBeDefined();
      // Check for Hebrew characters (Hebrew Unicode range)
      const hasHebrewChars = /[\u0590-\u05FF]/.test(verse?.text || '');
      expect(hasHebrewChars).toBe(true);
    });
  });

  describe('Content Manager Integration', () => {
    it('should expose all versions through ContentManager', () => {
      const versions = contentManager.getSupportedVersions();
      expect(versions.length).toBeGreaterThanOrEqual(7);
      
      const versionIds = versions.map(v => v.id);
      expect(versionIds).toContain('kjv');
      expect(versionIds).toContain('niv');
      expect(versionIds).toContain('esv');
      expect(versionIds).toContain('nlt');
      expect(versionIds).toContain('nkjv');
      expect(versionIds).toContain('ethiopian');
      expect(versionIds).toContain('hebrew');
    });

    it('should provide display properties for Ethiopian version', () => {
      const props = contentManager.getVersionDisplayProperties('ethiopian');
      expect(props.textDirection).toBe('ltr');
      expect(props.requiresSpecialFont).toBe(true);
      expect(props.fontFamily).toContain('Noto Sans Ethiopic');
    });

    it('should provide display properties for Hebrew version', () => {
      const props = contentManager.getVersionDisplayProperties('hebrew');
      expect(props.textDirection).toBe('rtl');
      expect(props.fontFamily).toContain('Noto Sans Hebrew');
    });

    it('should load verses from different versions', async () => {
      const kjvVersion = contentManager.getVersion('kjv');
      const nivVersion = contentManager.getVersion('niv');
      
      expect(kjvVersion).toBeDefined();
      expect(nivVersion).toBeDefined();

      if (kjvVersion && nivVersion) {
        const kjvVerse = await contentManager.getVerse(
          { book: 'Genesis', chapter: 1, verse: 1 },
          kjvVersion
        );
        const nivVerse = await contentManager.getVerse(
          { book: 'Genesis', chapter: 1, verse: 1 },
          nivVersion
        );

        expect(kjvVerse.text).toBeDefined();
        expect(nivVerse.text).toBeDefined();
        expect(kjvVerse.text).not.toBe(nivVerse.text); // Different translations
      }
    });
  });

  describe('Version Loading', () => {
    it('should load verses from all English versions', async () => {
      const versions = ['kjv', 'niv', 'esv', 'nlt', 'nkjv'];
      
      for (const versionId of versions) {
        const verse = await versionLoader.loadVerse('John', 3, 16, versionId);
        expect(verse).toBeDefined();
        expect(verse?.text).toBeDefined();
        expect(verse?.text.length).toBeGreaterThan(0);
        expect(verse?.version.id).toBe(versionId);
      }
    });

    it('should load verses from Ethiopian version', async () => {
      const verse = await versionLoader.loadVerse('John', 3, 16, 'ethiopian');
      expect(verse).toBeDefined();
      expect(verse?.text).toBeDefined();
      expect(verse?.language).toBe('Amharic');
    });

    it('should load verses from Hebrew version', async () => {
      const verse = await versionLoader.loadVerse('Psalms', 23, 1, 'hebrew');
      expect(verse).toBeDefined();
      expect(verse?.text).toBeDefined();
      expect(verse?.language).toBe('Hebrew');
    });
  });
});
