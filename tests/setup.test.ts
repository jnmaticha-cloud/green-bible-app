// Basic setup verification test
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BibleGenerators } from './generators/bible-generators';
import { PBTUtils } from './utils/test-helpers';

describe('Project Setup Verification', () => {
  it('should have TypeScript types available', () => {
    expect(typeof BibleGenerators).toBe('object');
    expect(BibleGenerators.bookName).toBeDefined();
  });

  it('should have fast-check working', () => {
    const result = fc.sample(fc.integer(), 5);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(5);
  });

  it('should generate valid Bible book names', () => {
    fc.assert(
      fc.property(BibleGenerators.bookName, (book) => {
        expect(typeof book).toBe('string');
        expect(book.length).toBeGreaterThan(0);
      }),
      PBTUtils.createPropertyTestConfig(10) // Small number for setup test
    );
  });

  it('should generate valid verse references', () => {
    fc.assert(
      fc.property(BibleGenerators.validVerseReference, (reference) => {
        expect(typeof reference.book).toBe('string');
        expect(reference.chapter).toBeGreaterThan(0);
        expect(reference.verse).toBeGreaterThan(0);
        if (reference.endVerse) {
          expect(reference.endVerse).toBeGreaterThanOrEqual(reference.verse);
        }
      }),
      PBTUtils.createPropertyTestConfig(10) // Small number for setup test
    );
  });

  it('should have proper test environment setup', () => {
    // Verify IndexedDB mock is available
    expect(typeof indexedDB).toBe('object');
    expect(typeof indexedDB.open).toBe('function');
    
    // Verify navigator.storage mock is available
    expect(typeof navigator.storage).toBe('object');
    expect(typeof navigator.storage.estimate).toBe('function');
  });
});