// Test utility functions and helpers
import { VerseReference, BibleVersion } from '@/types';

// Helper to create a reference key for testing
export function createReferenceKey(reference: VerseReference): string {
  return `${reference.book}_${reference.chapter}_${reference.verse}`;
}

// Helper to create a mock Bible version
export function createMockBibleVersion(overrides: Partial<BibleVersion> = {}): BibleVersion {
  return {
    id: 'test-version',
    name: 'Test Bible Version',
    abbreviation: 'TBV',
    language: 'English',
    year: 2023,
    features: [],
    ...overrides
  };
}

// Helper to validate verse reference format
export function isValidVerseReference(reference: VerseReference): boolean {
  return (
    typeof reference.book === 'string' &&
    reference.book.length > 0 &&
    typeof reference.chapter === 'number' &&
    reference.chapter > 0 &&
    typeof reference.verse === 'number' &&
    reference.verse > 0 &&
    (reference.endVerse === undefined || 
     (typeof reference.endVerse === 'number' && reference.endVerse >= reference.verse))
  );
}

// Helper to create a verse reference string
export function formatVerseReference(reference: VerseReference): string {
  if (reference.endVerse && reference.endVerse !== reference.verse) {
    return `${reference.book} ${reference.chapter}:${reference.verse}-${reference.endVerse}`;
  }
  return `${reference.book} ${reference.chapter}:${reference.verse}`;
}

// Helper to parse a verse reference string
export function parseVerseReference(referenceString: string): VerseReference | null {
  const match = referenceString.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const [, book, chapter, verse, endVerse] = match;
  return {
    book: book.trim(),
    chapter: parseInt(chapter, 10),
    verse: parseInt(verse, 10),
    endVerse: endVerse ? parseInt(endVerse, 10) : undefined
  };
}

// Helper to wait for async operations in tests
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to create a mock IndexedDB transaction
export function createMockIDBTransaction() {
  return {
    objectStore: () => ({
      add: () => ({ onsuccess: null, onerror: null }),
      get: () => ({ onsuccess: null, onerror: null }),
      put: () => ({ onsuccess: null, onerror: null }),
      delete: () => ({ onsuccess: null, onerror: null }),
      getAll: () => ({ onsuccess: null, onerror: null })
    }),
    oncomplete: null,
    onerror: null,
    onabort: null
  };
}

// Helper to simulate network conditions
export class NetworkSimulator {
  private static originalOnLine = navigator.onLine;
  
  static setOffline(): void {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    window.dispatchEvent(new Event('offline'));
  }
  
  static setOnline(): void {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    window.dispatchEvent(new Event('online'));
  }
  
  static restore(): void {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: this.originalOnLine
    });
  }
}

// Helper to generate test data
export class TestDataGenerator {
  static createVerseText(length: number = 50): string {
    const words = [
      'the', 'Lord', 'God', 'Jesus', 'Christ', 'love', 'faith', 'hope',
      'peace', 'joy', 'salvation', 'grace', 'mercy', 'truth', 'light',
      'life', 'eternal', 'kingdom', 'heaven', 'earth', 'spirit', 'holy'
    ];
    
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return result.join(' ') + '.';
  }
  
  static createUserId(): string {
    return 'user_' + Math.random().toString(36).substring(2, 15);
  }
  
  static createTimestamp(): Date {
    return new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
  }
}

// Property-based testing utilities
export class PBTUtils {
  static readonly DEFAULT_RUNS = 100;
  static readonly DEFAULT_TIMEOUT = 5000;
  
  static createPropertyTestConfig(runs: number = this.DEFAULT_RUNS) {
    return {
      numRuns: runs,
      timeout: this.DEFAULT_TIMEOUT,
      verbose: true
    };
  }
  
  static formatPropertyTestName(featureName: string, propertyNumber: number, propertyText: string): string {
    return `Feature: ${featureName}, Property ${propertyNumber}: ${propertyText}`;
  }
}