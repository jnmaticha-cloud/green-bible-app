// Feature: comprehensive-bible-enhancement, Property 8: Reading Plan Progress Tracking
// **Validates: Requirements 5.2, 5.4, 5.6**

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserExperienceService } from '@/services/user/UserExperience';
import { PBT_CONFIG } from '../setup';

describe('Reading Plan Progress Tracking - Property Tests', () => {
  test('Property 8: completion percentage increases with completed days', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (n) => {
          const ux = new UserExperienceService();
          const userId = `user-${Math.random().toString(36).slice(2)}`;
          const planId = 'bible-in-a-year';

          await ux.startReadingPlan(planId, userId);

          const initial = await ux.getReadingProgress(planId, userId);
          expect(initial.daysCompleted).toBe(0);
          expect(initial.completionPercentage).toBe(0);

          for (let day = 1; day <= n; day++) {
            await ux.markReadingComplete(planId, day, userId);
          }

          const after = await ux.getReadingProgress(planId, userId);
          expect(after.daysCompleted).toBe(n);
          expect(after.completionPercentage).toBeGreaterThan(0);
          expect(after.completionPercentage).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: Math.min(PBT_CONFIG.numRuns, 50), verbose: PBT_CONFIG.verbose }
    );
  });
});
