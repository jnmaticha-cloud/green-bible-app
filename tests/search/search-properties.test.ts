// Feature: comprehensive-bible-enhancement, Property 3/4: Search Completeness & Highlighting
// **Validates: Requirements 2.1, 2.2, 2.3**

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SearchEngineService } from '@/services/search/SearchEngine';
import type { BibleContent, BibleVersion, Book, Chapter, Verse } from '@/types';
import { PBT_CONFIG } from '../setup';

function makeContentWithVerses(version: BibleVersion, verses: Verse[]): BibleContent {
  const chapter: Chapter = { number: 1, verses };
  const book: Book = {
    name: 'Genesis',
    abbreviation: 'Gen',
    testament: 'OT',
    chapters: [chapter],
    metadata: {}
  };

  return {
    version,
    books: [book],
    metadata: {
      loadedAt: new Date(),
      checksum: 'pbt-checksum',
      size: verses.length
    }
  };
}

describe('Search Engine - Property Tests', () => {
  let engine: SearchEngineService;

  const version: BibleVersion = {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'English',
    year: 1611,
    features: []
  };

  beforeEach(() => {
    engine = new SearchEngineService();
  });

  test('Property 3: Search Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 2, maxLength: 10, unit: fc.char() }).filter(s => /^[A-Za-z]+$/.test(s)), {
          minLength: 3,
          maxLength: 6
        }),
        async (words) => {
          const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
          fc.pre(uniqueWords.length >= 3);

          const verseText = uniqueWords.join(' ');
          const verse: Verse = {
            reference: { book: 'Genesis', chapter: 1, verse: 1 },
            text: verseText,
            version,
            language: version.language
          };

          await engine.clearSearchIndex();
          await engine.indexContent(makeContentWithVerses(version, [verse]));

          const query = uniqueWords[0];
          const results = await engine.searchText(query, { maxResults: 10 });

          expect(results.length).toBeGreaterThan(0);
          expect(results.some(r => r.verse.reference.book === 'Genesis' && r.verse.reference.verse === 1)).toBe(true);
        }
      ),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });

  test('Property 4: Search Result Highlighting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 12, unit: fc.char() }).filter(s => /^[A-Za-z]+$/.test(s)),
        async (term) => {
          const cleanTerm = term.toLowerCase();
          const verse: Verse = {
            reference: { book: 'Genesis', chapter: 1, verse: 1 },
            text: `prefix ${cleanTerm} suffix`,
            version,
            language: version.language
          };

          await engine.clearSearchIndex();
          await engine.indexContent(makeContentWithVerses(version, [verse]));

          const results = await engine.searchText(cleanTerm, { maxResults: 10 });
          expect(results.length).toBeGreaterThan(0);

          const top = results[0];
          expect(top.highlightedText.toLowerCase()).toContain(`<mark>${cleanTerm}</mark>`);
        }
      ),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });
});
