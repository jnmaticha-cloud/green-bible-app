// Verse Reference Parser and Validator
import { VerseReference } from '../../types';
import { getCanonBook, isValidReference } from './BibleCanon';

/**
 * Parses a verse reference string into a structured VerseReference object
 * Supports formats like:
 * - "John 3:16"
 * - "1 John 2:5"
 * - "Genesis 1:1-3" (verse ranges)
 * - "Psalm 119:1"
 * - "2 Corinthians 5:17"
 */
export function parseReference(reference: string): VerseReference | null {
  if (!reference || typeof reference !== 'string') {
    return null;
  }

  const trimmed = reference.trim();
  
  // Pattern: BookName Chapter:Verse or BookName Chapter:Verse-EndVerse
  // Handles books with numbers like "1 John", "2 Corinthians"
  const pattern = /^((?:\d\s)?[A-Za-z\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/;
  const match = trimmed.match(pattern);
  
  if (!match || !match[1] || !match[2] || !match[3]) {
    return null;
  }

  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

  // Validate book exists
  const book = getCanonBook(bookName);
  if (!book) {
    return null;
  }

  // Validate chapter and verse
  if (!isValidReference(book.name, chapter, verse)) {
    return null;
  }

  // If there's an end verse, validate it too
  if (endVerse !== undefined) {
    if (!isValidReference(book.name, chapter, endVerse)) {
      return null;
    }
    // End verse must be greater than start verse
    if (endVerse <= verse) {
      return null;
    }
  }

  const result: VerseReference = {
    book: book.name,
    chapter,
    verse
  };

  if (endVerse !== undefined) {
    result.endVerse = endVerse;
  }

  return result;
}

/**
 * Validates a VerseReference object against the Bible canon
 */
export function validateVerseReference(ref: VerseReference): boolean {
  if (!ref || typeof ref !== 'object') {
    return false;
  }

  const { book, chapter, verse, endVerse } = ref;

  // Validate required fields
  if (!book || typeof chapter !== 'number' || typeof verse !== 'number') {
    return false;
  }

  // Validate against canon
  if (!isValidReference(book, chapter, verse)) {
    return false;
  }

  // Validate end verse if present (check for both undefined and null)
  if (endVerse !== undefined && endVerse !== null) {
    if (typeof endVerse !== 'number') {
      return false;
    }
    if (!isValidReference(book, chapter, endVerse)) {
      return false;
    }
    if (endVerse <= verse) {
      return false;
    }
  }

  return true;
}

/**
 * Formats a VerseReference object into a readable string
 */
export function formatReference(ref: VerseReference): string {
  if (!validateVerseReference(ref)) {
    return '';
  }

  const { book, chapter, verse, endVerse } = ref;
  
  if (endVerse !== undefined) {
    return `${book} ${chapter}:${verse}-${endVerse}`;
  }
  
  return `${book} ${chapter}:${verse}`;
}

/**
 * Normalizes a book name to its canonical form
 */
export function normalizeBookName(bookName: string): string | null {
  const book = getCanonBook(bookName);
  return book ? book.name : null;
}
