// Unit tests for seeded study resources (Task 5.3)
import { describe, it, expect } from 'vitest';
import { StudyToolsService } from '@/services/study/StudyTools';
import { validateVerseReference } from '@/services/content/ReferenceParser';

describe('StudyToolsService - Study Resources', () => {
  it('should return commentary for seeded references', async () => {
    const study = new StudyToolsService();

    const commentary = await study.getCommentary({ book: 'John', chapter: 3, verse: 16 });
    expect(commentary.length).toBeGreaterThan(0);
    expect(commentary[0].author).toBeDefined();
    expect(commentary[0].text.length).toBeGreaterThan(0);
  });

  it('should return seeded word studies', async () => {
    const study = new StudyToolsService();

    const greek = await study.getWordStudy('agape', 'greek');
    expect(greek.originalLanguage).toBe('greek');
    expect(greek.definition.length).toBeGreaterThan(0);
    expect(greek.relatedVerses.length).toBeGreaterThan(0);
    expect(validateVerseReference(greek.relatedVerses[0])).toBe(true);

    const hebrew = await study.getWordStudy('chesed', 'hebrew');
    expect(hebrew.originalLanguage).toBe('hebrew');
    expect(hebrew.definition.length).toBeGreaterThan(0);
    expect(hebrew.relatedVerses.length).toBeGreaterThan(0);
    expect(validateVerseReference(hebrew.relatedVerses[0])).toBe(true);
  });

  it('should return a topical study for a seeded topic', async () => {
    const study = new StudyToolsService();

    const topical = await study.getTopicalReferences('Love');
    expect(topical.topic).toBe('Love');
    expect(topical.references.length).toBeGreaterThan(0);
    expect(validateVerseReference(topical.references[0])).toBe(true);
  });

  it('should return thematic studies', async () => {
    const study = new StudyToolsService();

    const thematics = await study.getThematicStudies();
    expect(thematics.length).toBeGreaterThan(0);
    expect(thematics[0].id).toBeDefined();
    expect(thematics[0].passages.length).toBeGreaterThan(0);
    expect(validateVerseReference(thematics[0].passages[0])).toBe(true);
  });

  it('should return parallel passages for seeded parallel references', async () => {
    const study = new StudyToolsService();

    const parallels = await study.getParallelPassages({ book: 'Genesis', chapter: 1, verse: 1 });
    expect(parallels.length).toBeGreaterThan(0);

    const first = parallels[0];
    expect(validateVerseReference(first.reference)).toBe(true);
    expect(first.similarity).toBeGreaterThan(0);
    expect(first.similarity).toBeLessThanOrEqual(1);
    expect(Array.isArray(first.differences)).toBe(true);
  });
});
