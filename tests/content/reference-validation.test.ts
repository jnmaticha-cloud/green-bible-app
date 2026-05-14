// Feature: comprehensive-bible-enhancement, Property 2: Verse Reference Validation
// **Validates: Requirements 1.6**

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseReference, validateVerseReference, formatReference } from '@/services/content/ReferenceParser';
import { canonicalVerseReferenceArb, invalidVerseReferenceArb } from '../generators/bible-generators';
import { PBT_CONFIG } from '../setup';

describe('Verse Reference Validation - Property Tests', () => {
  test('Property 2: Valid verse references should be correctly identified', () => {
    fc.assert(
      fc.property(canonicalVerseReferenceArb, (ref) => {
        // For any valid verse reference from the Bible canon,
        // validateVerseReference should return true
        const isValid = validateVerseReference(ref);
        expect(isValid).toBe(true);
      }),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });

  test('Property 2: Invalid verse references should be rejected', () => {
    fc.assert(
      fc.property(invalidVerseReferenceArb, (ref) => {
        // For any invalid verse reference,
        // validateVerseReference should return false
        const isValid = validateVerseReference(ref);
        expect(isValid).toBe(false);
      }),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });

  test('Property 2: Parsing and formatting should be inverse operations', () => {
    fc.assert(
      fc.property(canonicalVerseReferenceArb, (ref) => {
        // For any valid verse reference,
        // formatting then parsing should produce an equivalent reference
        const formatted = formatReference(ref);
        const parsed = parseReference(formatted);
        
        expect(parsed).not.toBeNull();
        if (parsed) {
          expect(parsed.book).toBe(ref.book);
          expect(parsed.chapter).toBe(ref.chapter);
          expect(parsed.verse).toBe(ref.verse);
          expect(parsed.endVerse).toBe(ref.endVerse);
        }
      }),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });

  test('Property 2: Valid reference strings should parse successfully', () => {
    fc.assert(
      fc.property(canonicalVerseReferenceArb, (ref) => {
        // For any valid verse reference,
        // its formatted string representation should parse back successfully
        const formatted = formatReference(ref);
        const parsed = parseReference(formatted);
        
        expect(parsed).not.toBeNull();
        expect(validateVerseReference(parsed!)).toBe(true);
      }),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });

  test('Property 2: Invalid reference strings should fail to parse', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(s => !s.match(/^((?:\d\s)?[A-Za-z\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/)),
          fc.constant('InvalidBook 1:1'),
          fc.constant('Genesis 999:1'),
          fc.constant('Genesis 1:999'),
          fc.constant('Genesis 1:5-3') // endVerse < verse
        ),
        (invalidString) => {
          // For any invalid reference string,
          // parseReference should return null
          const parsed = parseReference(invalidString);
          
          // Either it fails to parse, or if it parses, it should be invalid
          if (parsed !== null) {
            expect(validateVerseReference(parsed)).toBe(false);
          }
        }
      ),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });

  test('Property 2: Verse ranges must have endVerse > verse', () => {
    fc.assert(
      fc.property(canonicalVerseReferenceArb, (ref) => {
        // For any verse reference with an endVerse,
        // the endVerse must be greater than verse
        if (ref.endVerse !== undefined) {
          expect(ref.endVerse).toBeGreaterThan(ref.verse);
          expect(validateVerseReference(ref)).toBe(true);
        }
      }),
      { numRuns: PBT_CONFIG.numRuns, verbose: PBT_CONFIG.verbose }
    );
  });
});

describe('Verse Reference Validation - Unit Tests', () => {
  test('should validate common verse references', () => {
    expect(parseReference('John 3:16')).toEqual({
      book: 'John',
      chapter: 3,
      verse: 16,
      endVerse: undefined
    });

    expect(parseReference('Genesis 1:1')).toEqual({
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      endVerse: undefined
    });

    expect(parseReference('Psalm 119:1')).toEqual({
      book: 'Psalms',
      chapter: 119,
      verse: 1,
      endVerse: undefined
    });
  });

  test('should validate verse ranges', () => {
    const ref = parseReference('John 3:16-17');
    expect(ref).toEqual({
      book: 'John',
      chapter: 3,
      verse: 16,
      endVerse: 17
    });
  });

  test('should handle books with numbers', () => {
    expect(parseReference('1 John 2:5')).toEqual({
      book: '1 John',
      chapter: 2,
      verse: 5,
      endVerse: undefined
    });

    expect(parseReference('2 Corinthians 5:17')).toEqual({
      book: '2 Corinthians',
      chapter: 5,
      verse: 17,
      endVerse: undefined
    });
  });

  test('should reject invalid book names', () => {
    expect(parseReference('InvalidBook 1:1')).toBeNull();
    expect(parseReference('NotABook 5:10')).toBeNull();
  });

  test('should reject invalid chapter numbers', () => {
    expect(parseReference('Genesis 999:1')).toBeNull();
    expect(parseReference('Matthew 100:1')).toBeNull();
  });

  test('should reject invalid verse numbers', () => {
    expect(parseReference('Genesis 1:999')).toBeNull();
    expect(parseReference('John 3:999')).toBeNull();
  });

  test('should reject invalid verse ranges', () => {
    expect(parseReference('John 3:17-16')).toBeNull(); // endVerse < verse
    expect(parseReference('John 3:16-16')).toBeNull(); // endVerse == verse
  });

  test('should format references correctly', () => {
    expect(formatReference({
      book: 'John',
      chapter: 3,
      verse: 16
    })).toBe('John 3:16');

    expect(formatReference({
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      endVerse: 3
    })).toBe('Genesis 1:1-3');
  });
});
