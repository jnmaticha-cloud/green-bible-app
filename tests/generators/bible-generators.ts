// Property-based test generators for Bible-related data
import * as fc from 'fast-check';
import { 
  VerseReference, 
  BibleVersion, 
  BIBLE_BOOKS, 
  OLD_TESTAMENT_BOOKS, 
  NEW_TESTAMENT_BOOKS,
  BookName 
} from '@/types';
import { BIBLE_CANON, getVerseCount } from '@/services/content/BibleCanon';

// Bible book generator
export const bookNameArb = fc.constantFrom(...BIBLE_BOOKS);

// Testament-specific book generators
export const oldTestamentBookArb = fc.constantFrom(...OLD_TESTAMENT_BOOKS);
export const newTestamentBookArb = fc.constantFrom(...NEW_TESTAMENT_BOOKS);

// Chapter number generator (1-150 for Psalms, 1-50 for most books)
export const chapterNumberArb = (book?: BookName) => {
  if (book === 'Psalms') {
    return fc.integer({ min: 1, max: 150 });
  }
  if (book === 'Genesis') {
    return fc.integer({ min: 1, max: 50 });
  }
  // Default range for most books
  return fc.integer({ min: 1, max: 28 });
};

// Verse number generator (typically 1-176 for Psalm 119, 1-52 for most chapters)
export const verseNumberArb = (book?: BookName, chapter?: number) => {
  if (book === 'Psalms' && chapter === 119) {
    return fc.integer({ min: 1, max: 176 });
  }
  // Default range for most verses
  return fc.integer({ min: 1, max: 31 });
};

// Verse reference generator
export const verseReferenceArb: fc.Arbitrary<VerseReference> = fc.record({
  book: bookNameArb,
  chapter: fc.integer({ min: 1, max: 50 }),
  verse: fc.integer({ min: 1, max: 31 }),
  endVerse: fc.option(fc.integer({ min: 1, max: 31 }))
});

// Valid verse reference generator (ensures endVerse > verse if present)
export const validVerseReferenceArb: fc.Arbitrary<VerseReference> = fc.record({
  book: bookNameArb,
  chapter: fc.integer({ min: 1, max: 50 }),
  verse: fc.integer({ min: 1, max: 31 })
}).chain(base => 
  fc.option(fc.integer({ min: base.verse + 1, max: base.verse + 10 })).map(endVerse => ({
    ...base,
    endVerse
  }))
);

// Canon-accurate verse reference generator (uses actual Bible canon data)
export const canonicalVerseReferenceArb: fc.Arbitrary<VerseReference> = bookNameArb.chain(book => {
  const canonBook = BIBLE_CANON.find(b => b.name === book);
  if (!canonBook) {
    // Fallback to simple generator
    return fc.record({
      book: fc.constant(book),
      chapter: fc.integer({ min: 1, max: 1 }),
      verse: fc.integer({ min: 1, max: 1 })
    });
  }
  
  const maxChapter = canonBook.chapters.length - 1; // -1 because index 0 is placeholder
  
  return fc.integer({ min: 1, max: maxChapter }).chain(chapter => {
    const maxVerse = canonBook.chapters[chapter];
    
    return fc.integer({ min: 1, max: maxVerse }).chain(verse => {
      // Generate optional endVerse
      const endVerseRange = maxVerse - verse;
      if (endVerseRange > 0) {
        return fc.option(
          fc.integer({ min: verse + 1, max: Math.min(verse + 5, maxVerse) }),
          { nil: undefined }
        ).map(endVerse => ({
          book,
          chapter,
          verse,
          endVerse
        }));
      } else {
        return fc.constant({
          book,
          chapter,
          verse,
          endVerse: undefined
        });
      }
    });
  });
});

// Invalid verse reference generator (for testing validation)
export const invalidVerseReferenceArb: fc.Arbitrary<VerseReference> = fc.oneof(
  // Invalid book name
  fc.record({
    book: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !BIBLE_BOOKS.includes(s as any)),
    chapter: fc.integer({ min: 1, max: 50 }),
    verse: fc.integer({ min: 1, max: 31 })
  }),
  // Invalid chapter (too high)
  bookNameArb.chain(book => {
    const canonBook = BIBLE_CANON.find(b => b.name === book);
    const maxChapter = canonBook ? canonBook.chapters.length - 1 : 50;
    return fc.record({
      book: fc.constant(book),
      chapter: fc.integer({ min: maxChapter + 1, max: maxChapter + 100 }),
      verse: fc.integer({ min: 1, max: 31 })
    });
  }),
  // Invalid verse (too high)
  bookNameArb.chain(book => {
    const canonBook = BIBLE_CANON.find(b => b.name === book);
    if (!canonBook) {
      return fc.record({
        book: fc.constant(book),
        chapter: fc.integer({ min: 1, max: 1 }),
        verse: fc.integer({ min: 1000, max: 2000 })
      });
    }
    
    const maxChapter = canonBook.chapters.length - 1;
    return fc.integer({ min: 1, max: maxChapter }).chain(chapter => {
      const maxVerse = canonBook.chapters[chapter];
      return fc.record({
        book: fc.constant(book),
        chapter: fc.constant(chapter),
        verse: fc.integer({ min: maxVerse + 1, max: maxVerse + 100 })
      });
    });
  }),
  // Invalid endVerse (less than or equal to verse)
  canonicalVerseReferenceArb.chain(ref => 
    fc.integer({ min: 1, max: ref.verse }).map(badEndVerse => ({
      book: ref.book,
      chapter: ref.chapter,
      verse: ref.verse,
      endVerse: badEndVerse
    }))
  )
);

// Bible version generator
export const bibleVersionArb: fc.Arbitrary<BibleVersion> = fc.record({
  id: fc.string({ minLength: 2, maxLength: 10 }).map(s => s.toLowerCase()),
  name: fc.constantFrom(
    'King James Version',
    'New International Version', 
    'English Standard Version',
    'New Living Translation',
    'New King James Version',
    'Ethiopian Orthodox Bible',
    'Hebrew Bible'
  ),
  abbreviation: fc.constantFrom('KJV', 'NIV', 'ESV', 'NLT', 'NKJV', 'EOB', 'HEB'),
  language: fc.constantFrom('English', 'Amharic', 'Hebrew'),
  year: fc.integer({ min: 1500, max: 2023 }),
  copyright: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
  features: fc.array(fc.record({
    name: fc.constantFrom('footnotes', 'cross-references', 'commentary', 'audio'),
    enabled: fc.boolean()
  }), { maxLength: 4 })
});

// Supported Bible versions (commonly used ones)
export const supportedVersionArb = fc.constantFrom(
  { id: 'kjv', name: 'King James Version', abbreviation: 'KJV', language: 'English', year: 1611, features: [] },
  { id: 'niv', name: 'New International Version', abbreviation: 'NIV', language: 'English', year: 1978, features: [] },
  { id: 'esv', name: 'English Standard Version', abbreviation: 'ESV', language: 'English', year: 2001, features: [] },
  { id: 'nlt', name: 'New Living Translation', abbreviation: 'NLT', language: 'English', year: 1996, features: [] },
  { id: 'nkjv', name: 'New King James Version', abbreviation: 'NKJV', language: 'English', year: 1982, features: [] }
);

// Search query generator
export const searchQueryArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  fc.constantFrom('love', 'faith', 'hope', 'peace', 'joy', 'salvation', 'grace', 'mercy'),
  fc.array(fc.string({ minLength: 3, maxLength: 10 }), { minLength: 1, maxLength: 3 }).map(words => words.join(' '))
);

// Phrase search query generator (with quotes)
export const phraseSearchQueryArb = searchQueryArb.map(query => `"${query}"`);

// Bible text generator (realistic verse content)
export const bibleTextArb = fc.oneof(
  fc.constantFrom(
    'In the beginning God created the heavens and the earth.',
    'For God so loved the world that he gave his one and only Son.',
    'The Lord is my shepherd, I lack nothing.',
    'Trust in the Lord with all your heart and lean not on your own understanding.',
    'I can do all this through him who gives me strength.',
    'Be strong and courageous. Do not be afraid; do not be discouraged.',
    'Cast all your anxiety on him because he cares for you.'
  ),
  fc.string({ minLength: 20, maxLength: 200 }).filter(s => s.trim().length > 10)
);

// User ID generator
export const userIdArb = fc.string({ minLength: 8, maxLength: 24 }).map(s => 
  s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
).filter(s => s.length >= 8);

// Category name generator for bookmarks
export const categoryArb = fc.constantFrom(
  'Favorites', 'Prayer', 'Study', 'Comfort', 'Wisdom', 'Promises', 'Prophecy'
);

// Color generator for highlights
export const highlightColorArb = fc.constantFrom(
  '#ffff00', '#00ff00', '#ff0000', '#0000ff', '#ff00ff', '#00ffff', '#ffa500'
);

// Note content generator
export const noteContentArb = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0);

// Testament generator
export const testamentArb = fc.constantFrom('OT', 'NT');

// Language generator
export const languageArb = fc.constantFrom('English', 'Amharic', 'Hebrew', 'Greek');

// Export all generators for easy import
export const BibleGenerators = {
  bookName: bookNameArb,
  oldTestamentBook: oldTestamentBookArb,
  newTestamentBook: newTestamentBookArb,
  chapterNumber: chapterNumberArb,
  verseNumber: verseNumberArb,
  verseReference: verseReferenceArb,
  validVerseReference: validVerseReferenceArb,
  canonicalVerseReference: canonicalVerseReferenceArb,
  invalidVerseReference: invalidVerseReferenceArb,
  bibleVersion: bibleVersionArb,
  supportedVersion: supportedVersionArb,
  searchQuery: searchQueryArb,
  phraseSearchQuery: phraseSearchQueryArb,
  bibleText: bibleTextArb,
  userId: userIdArb,
  category: categoryArb,
  highlightColor: highlightColorArb,
  noteContent: noteContentArb,
  testament: testamentArb,
  language: languageArb
};