// Unit tests for UserExperienceService baseline behavior (Task 6 audit)
import { describe, it, expect } from 'vitest';
import { UserExperienceService } from '@/services/user/UserExperience';

describe('UserExperienceService', () => {
  it('should add and retrieve bookmarks by user', async () => {
    const ux = new UserExperienceService();

    const ref = { book: 'John', chapter: 3, verse: 16 };
    const created = await ux.addBookmark(ref, 'test note', 'favorites');
    expect(created.reference).toEqual(ref);

    const all = await ux.getBookmarks('current-user');
    expect(all.length).toBeGreaterThan(0);

    const filtered = await ux.getBookmarks('current-user', 'favorites');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].category).toBe('favorites');
  });

  it('should add and retrieve highlights by user', async () => {
    const ux = new UserExperienceService();

    const ref = { book: 'Genesis', chapter: 1, verse: 1 };
    await ux.addHighlight(ref, '#ff0', 'highlighted text');

    const highlights = await ux.getHighlights('current-user');
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights[0].reference).toEqual(ref);
  });

  it('should start a seeded reading plan and compute progress', async () => {
    const ux = new UserExperienceService();

    const userId = 'user-1';
    const planId = 'bible-in-a-year';

    await ux.startReadingPlan(planId, userId);

    const initial = await ux.getReadingProgress(planId, userId);
    expect(initial.daysCompleted).toBe(0);

    await ux.markReadingComplete(planId, 1, userId);
    const after = await ux.getReadingProgress(planId, userId);
    expect(after.daysCompleted).toBe(1);
    expect(after.completionPercentage).toBeGreaterThan(0);
  });
});
