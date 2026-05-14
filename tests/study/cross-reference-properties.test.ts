// Feature: comprehensive-bible-enhancement, Property 5: Cross-Reference Navigation
// **Validates: Requirements 3.3**

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { StudyToolsService } from '@/services/study/StudyTools';
import { validateVerseReference } from '@/services/content/ReferenceParser';
import { PBT_CONFIG } from '../setup';

describe('Cross-Reference Navigation - Property Tests', () => {
  test('Property 5: Returned cross-references must be valid and navigable', async () => {
    const study = new StudyToolsService();

    const knownSources = [
      { book: 'John', chapter: 3, verse: 16 },
      { book: 'Psalms', chapter: 23, verse: 1 },
      { book: 'Genesis', chapter: 1, verse: 1 }
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...knownSources),
        async (sourceRef) => {
          const refs = await study.getCrossReferences(sourceRef);
          expect(refs.length).toBeGreaterThan(0);

          for (const ref of refs) {
            expect(ref.sourceReference).toEqual(sourceRef);
            expect(ref.strength).toBeGreaterThanOrEqual(1);
            expect(ref.strength).toBeLessThanOrEqual(10);
            expect(['parallel', 'quotation', 'allusion', 'theme']).toContain(ref.relationship);

            // Navigation requirement: target reference should be a valid verse reference in canon
            expect(validateVerseReference(ref.targetReference)).toBe(true);
          }
        }
      ),
      { numRuns: Math.min(PBT_CONFIG.numRuns, 50), verbose: PBT_CONFIG.verbose }
    );
  });
});
