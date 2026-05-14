import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngineService } from '@/services/search/SearchEngine';
import type { BibleContent, BibleVersion, Book, Chapter, Verse } from '@/types';

function makeSampleContent(version: BibleVersion): BibleContent {
  const verses: Verse[] = [
    {
      reference: { book: 'John', chapter: 3, verse: 16 },
      text: 'For God so loved the world that he gave his one and only Son',
      version,
      language: version.language
    },
    {
      reference: { book: 'John', chapter: 3, verse: 17 },
      text: 'For God did not send his Son into the world to condemn the world',
      version,
      language: version.language
    }
  ];

  const chapter: Chapter = { number: 3, verses };
  const book: Book = {
    name: 'John',
    abbreviation: 'John',
    testament: 'NT',
    chapters: [chapter],
    metadata: {}
  };

  return {
    version,
    books: [book],
    metadata: {
      loadedAt: new Date(),
      checksum: 'test-checksum',
      size: 2
    }
  };
}

describe('SearchEngineService', () => {
  let engine: SearchEngineService;
  const version: BibleVersion = {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'English',
    year: 1611,
    features: []
  };

  beforeEach(async () => {
    engine = new SearchEngineService();
    await engine.indexContent(makeSampleContent(version));
  });

  it('should find matches by keyword and highlight them', async () => {
    const results = await engine.searchText('loved world', { maxResults: 10 });
    expect(results.length).toBeGreaterThan(0);

    const top = results[0];
    expect(top.verse.reference.book).toBe('John');
    expect(top.highlightedText).toContain('<mark>');
  });

  it('should support phrase search using quotes when exactPhrase is true', async () => {
    const results = await engine.searchText('"one and only Son"', { exactPhrase: true, maxResults: 10 });
    expect(results.length).toBe(1);
    expect(results[0].verse.reference.verse).toBe(16);
  });

  it('should filter by testament', async () => {
    const resultsNt = await engine.searchText('world', { testament: 'NT', maxResults: 10 });
    expect(resultsNt.length).toBeGreaterThan(0);

    const resultsOt = await engine.searchText('world', { testament: 'OT', maxResults: 10 });
    expect(resultsOt.length).toBe(0);
  });

  it('should provide suggestions based on indexed terms', async () => {
    const suggestions = await engine.getSearchSuggestions('wo');
    expect(suggestions).toContain('world');
  });

  it('should find verses by reference string', async () => {
    const verses = await engine.searchByReference('John 3:16');
    expect(verses.length).toBe(1);
    expect(verses[0].reference.verse).toBe(16);
  });
});
