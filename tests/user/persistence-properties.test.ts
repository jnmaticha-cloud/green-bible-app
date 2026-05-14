// Feature: comprehensive-bible-enhancement, Property 6/7: Bookmark Persistence & Highlight Persistence
// **Validates: Requirements 4.1, 4.6**

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserExperienceService } from '@/services/user/UserExperience';
import { canonicalVerseReferenceArb } from '../generators/bible-generators';
import { PBT_CONFIG } from '../setup';

describe('User Experience - Persistence Property Tests', () => {
  test('Property 6: Bookmark Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(canonicalVerseReferenceArb, async (ref) => {
        const userId = 'current-user';

        const ux1 = new UserExperienceService();
        await ux1.addBookmark(ref, 'note', 'cat');

        // New service instance should load bookmarks from localStorage
        const ux2 = new UserExperienceService();
        const bookmarks = await ux2.getBookmarks(userId);

        expect(bookmarks.length).toBeGreaterThan(0);
        expect(bookmarks.some(b => b.reference.book === ref.book && b.reference.chapter === ref.chapter && b.reference.verse === ref.verse)).toBe(true);
      }),
      { numRuns: Math.min(PBT_CONFIG.numRuns, 50), verbose: PBT_CONFIG.verbose }
    );
  });

  test('Property 7: Highlight Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(canonicalVerseReferenceArb, async (ref) => {
        const userId = 'current-user';

        const ux1 = new UserExperienceService();
        await ux1.addHighlight(ref, '#ffff00', 'text');

        const ux2 = new UserExperienceService();
        const highlights = await ux2.getHighlights(userId);

        expect(highlights.length).toBeGreaterThan(0);
        expect(highlights.some(h => h.reference.book === ref.book && h.reference.chapter === ref.chapter && h.reference.verse === ref.verse)).toBe(true);
      }),
      { numRuns: Math.min(PBT_CONFIG.numRuns, 50), verbose: PBT_CONFIG.verbose }
    );
  });
});
