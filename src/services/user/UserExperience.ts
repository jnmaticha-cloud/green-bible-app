// User Experience Service Implementation
import { UserExperience } from '../interfaces';
import {
  VerseReference,
  Bookmark,
  Note,
  Highlight,
  ReadingPlan,
  UserReadingPlan,
  ReadingProgress,
  ShareResult,
  ExportResult
} from '../../types';

export class UserExperienceService implements UserExperience {
  private bookmarks: Map<string, Bookmark[]> = new Map();
  private notes: Map<string, Note[]> = new Map();
  private highlights: Map<string, Highlight[]> = new Map();
  private readingPlans: ReadingPlan[] = [];
  private userReadingPlans: Map<string, UserReadingPlan[]> = new Map();

  private storageKeyBookmarks = 'green-bible:bookmarks';
  private storageKeyNotes = 'green-bible:notes';
  private storageKeyHighlights = 'green-bible:highlights';

  constructor() {
    this.seedReadingPlans();
    this.loadPersistedData();
  }

  async addBookmark(reference: VerseReference, note?: string, category?: string): Promise<Bookmark> {
    // Implementation placeholder
    const bookmark: Bookmark = {
      id: this.generateId(),
      reference,
      note: note || undefined,
      category: category || undefined,
      createdAt: new Date(),
      userId: 'current-user' // Should come from auth context
    };

    const userId = bookmark.userId;
    const userBookmarks = this.bookmarks.get(userId) || [];
    userBookmarks.push(bookmark);
    this.bookmarks.set(userId, userBookmarks);

    this.persistBookmarks(userId);

    return bookmark;
  }

  async getBookmarks(userId: string, category?: string): Promise<Bookmark[]> {
    const userBookmarks = this.bookmarks.get(userId) || [];
    
    if (category) {
      return userBookmarks.filter(bookmark => bookmark.category === category);
    }
    
    return userBookmarks;
  }

  async addNote(reference: VerseReference, content: string): Promise<Note> {
    // Implementation placeholder
    const note: Note = {
      id: this.generateId(),
      reference,
      content,
      isPrivate: true,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userId = 'current-user'; // Should come from auth context
    const userNotes = this.notes.get(userId) || [];
    userNotes.push(note);
    this.notes.set(userId, userNotes);

    this.persistNotes(userId);

    return note;
  }

  async addHighlight(reference: VerseReference, color: string, text: string): Promise<Highlight> {
    // Implementation placeholder
    const highlight: Highlight = {
      id: this.generateId(),
      reference,
      color,
      text,
      userId: 'current-user', // Should come from auth context
      createdAt: new Date()
    };

    const userId = highlight.userId;
    const userHighlights = this.highlights.get(userId) || [];
    userHighlights.push(highlight);
    this.highlights.set(userId, userHighlights);

    this.persistHighlights(userId);

    return highlight;
  }

  async getHighlights(userId: string): Promise<Highlight[]> {
    return this.highlights.get(userId) || [];
  }

  async getReadingPlans(): Promise<ReadingPlan[]> {
    return this.readingPlans;
  }

  async startReadingPlan(planId: string, userId: string): Promise<UserReadingPlan> {
    const readingPlan = this.readingPlans.find(p => p.id === planId);
    if (!readingPlan) {
      throw new Error('Reading plan not found');
    }

    const userPlan: UserReadingPlan = {
      planId,
      userId,
      startDate: new Date(),
      currentDay: 1,
      completedDays: [],
      isActive: true
    };

    const userPlans = this.userReadingPlans.get(userId) || [];
    userPlans.push(userPlan);
    this.userReadingPlans.set(userId, userPlans);

    return userPlan;
  }

  async markReadingComplete(planId: string, day: number, userId: string): Promise<void> {
    const readingPlan = this.readingPlans.find(p => p.id === planId);
    if (!readingPlan) {
      throw new Error('Reading plan not found');
    }

    const userPlans = this.userReadingPlans.get(userId) || [];
    const plan = userPlans.find(p => p.planId === planId && p.isActive);
    
    if (plan && !plan.completedDays.includes(day)) {
      plan.completedDays.push(day);
      plan.currentDay = Math.max(plan.currentDay, day + 1);
    }
  }

  async getReadingProgress(planId: string, userId: string): Promise<ReadingProgress> {
    const userPlans = this.userReadingPlans.get(userId) || [];
    const userPlan = userPlans.find(p => p.planId === planId && p.isActive);
    const readingPlan = this.readingPlans.find(p => p.id === planId);

    if (!userPlan || !readingPlan) {
      throw new Error('Reading plan not found');
    }

    const completionPercentage = (userPlan.completedDays.length / readingPlan.duration) * 100;

    const daysCompleted = userPlan.completedDays.length;
    const daysRemaining = readingPlan.duration - daysCompleted;
    const daysSinceStart = Math.floor((Date.now() - userPlan.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isOnTrack = daysCompleted >= daysSinceStart;

    return {
      planId,
      userId,
      completionPercentage,
      daysCompleted,
      daysRemaining,
      isOnTrack
    };
  }

  async shareVerse(reference: VerseReference, _platform: string): Promise<ShareResult> {
    // Implementation placeholder
    return {
      success: true,
      url: `https://bible-app.com/share/${reference.book}/${reference.chapter}/${reference.verse}`
    };
  }

  async exportNotes(userId: string, format: 'json' | 'pdf' | 'txt'): Promise<ExportResult> {
    // Implementation placeholder
    const userNotes = this.notes.get(userId) || [];
    
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(userNotes, null, 2),
        filename: `bible-notes-${userId}.json`
      };
    }

    return {
      success: false,
      error: `Export format ${format} not yet implemented`
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private loadPersistedData(): void {
    const hasStorage = typeof window !== 'undefined' && !!window.localStorage;
    if (!hasStorage) {
      return;
    }

    this.loadMapFromStorage(this.storageKeyBookmarks, this.bookmarks, this.reviveBookmark);
    this.loadMapFromStorage(this.storageKeyNotes, this.notes, this.reviveNote);
    this.loadMapFromStorage(this.storageKeyHighlights, this.highlights, this.reviveHighlight);
  }

  private loadMapFromStorage<T>(
    storageKey: string,
    target: Map<string, T[]>,
    revive: (raw: any) => T
  ): void {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: Record<string, any[]> = JSON.parse(raw);
      for (const [userId, items] of Object.entries(parsed)) {
        target.set(userId, (items || []).map(revive));
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private persistBookmarks(userId: string): void {
    this.persistMap(this.storageKeyBookmarks, userId, this.bookmarks.get(userId) || []);
  }

  private persistNotes(userId: string): void {
    this.persistMap(this.storageKeyNotes, userId, this.notes.get(userId) || []);
  }

  private persistHighlights(userId: string): void {
    this.persistMap(this.storageKeyHighlights, userId, this.highlights.get(userId) || []);
  }

  private persistMap(storageKey: string, userId: string, items: any[]): void {
    const hasStorage = typeof window !== 'undefined' && !!window.localStorage;
    if (!hasStorage) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed: Record<string, any[]> = raw ? JSON.parse(raw) : {};
      parsed[userId] = items;
      window.localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
      // ignore storage failures
    }
  }

  private reviveBookmark = (raw: any): Bookmark => {
    return {
      id: String(raw.id),
      reference: raw.reference,
      note: raw.note === undefined ? undefined : String(raw.note),
      category: raw.category === undefined ? undefined : String(raw.category),
      createdAt: new Date(raw.createdAt),
      userId: String(raw.userId)
    };
  };

  private reviveNote = (raw: any): Note => {
    return {
      id: String(raw.id),
      reference: raw.reference,
      content: String(raw.content),
      isPrivate: Boolean(raw.isPrivate),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt)
    };
  };

  private reviveHighlight = (raw: any): Highlight => {
    return {
      id: String(raw.id),
      reference: raw.reference,
      color: String(raw.color),
      text: String(raw.text),
      userId: String(raw.userId),
      createdAt: new Date(raw.createdAt)
    };
  };

  private seedReadingPlans(): void {
    this.readingPlans = [
      {
        id: 'bible-in-a-year',
        name: 'Bible in a Year',
        description: 'Read the entire Bible in one year',
        duration: 365,
        dailyReadings: [
          { day: 1, readings: [{ book: 'Genesis', chapter: 1, verse: 1 }], title: 'Day 1' },
          { day: 2, readings: [{ book: 'Genesis', chapter: 1, verse: 2 }], title: 'Day 2' }
        ]
      },
      {
        id: 'new-testament',
        name: 'New Testament in 90 Days',
        description: 'Read through the New Testament in 3 months',
        duration: 90,
        dailyReadings: [
          { day: 1, readings: [{ book: 'Matthew', chapter: 1, verse: 1 }], title: 'Day 1' }
        ]
      }
    ];
  }
}