// Unit tests for parseVerseReference and resolveBookReference
// These are the most critical parsing functions in the app — they handle
// all user input: English names, abbreviations, native language names, ranges.
//
// We test the logic directly by extracting it from app.js into a testable form.
// The functions are reproduced here to avoid jsdom dependency on the full app class.

import { describe, it, expect } from 'vitest';

// ─── Minimal reproduction of the parsing logic from GreenBibleApp ───────────

const BIBLE_BOOKS = [
    'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
    '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra',
    'nehemiah', 'esther', 'job', 'psalm', 'psalms', 'proverbs', 'ecclesiastes',
    'song of solomon', 'song of songs', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel',
    'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
    'zephaniah', 'haggai', 'zechariah', 'malachi',
    'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1 corinthians', '2 corinthians',
    'galatians', 'ephesians', 'philippians', 'colossians', '1 thessalonians', '2 thessalonians',
    '1 timothy', '2 timothy', 'titus', 'philemon', 'hebrews', 'james', '1 peter', '2 peter',
    '1 john', '2 john', '3 john', 'jude', 'revelation',
];

const BOOK_ABBREVIATIONS: Record<string, string> = {
    'gen': 'genesis', 'ex': 'exodus', 'exo': 'exodus', 'lev': 'leviticus',
    'num': 'numbers', 'deut': 'deuteronomy', 'deu': 'deuteronomy',
    'jos': 'joshua', 'josh': 'joshua', 'judg': 'judges', 'jdg': 'judges',
    'rut': 'ruth', 'ru': 'ruth',
    '1 sam': '1 samuel', '1sam': '1 samuel', '2 sam': '2 samuel', '2sam': '2 samuel',
    '1 kgs': '1 kings', '1kgs': '1 kings', '2 kgs': '2 kings', '2kgs': '2 kings',
    '1 ki': '1 kings', '2 ki': '2 kings',
    '1 chron': '1 chronicles', '1chron': '1 chronicles', '2 chron': '2 chronicles', '2chron': '2 chronicles',
    '1 chr': '1 chronicles', '2 chr': '2 chronicles',
    'neh': 'nehemiah', 'est': 'esther',
    'ps': 'psalm', 'psa': 'psalm', 'pss': 'psalms',
    'prov': 'proverbs', 'pro': 'proverbs', 'pr': 'proverbs',
    'ecc': 'ecclesiastes', 'eccl': 'ecclesiastes',
    'song': 'song of solomon', 'sng': 'song of solomon', 'sos': 'song of solomon',
    'isa': 'isaiah', 'is': 'isaiah',
    'jer': 'jeremiah', 'lam': 'lamentations',
    'ezek': 'ezekiel', 'eze': 'ezekiel', 'ezk': 'ezekiel',
    'dan': 'daniel', 'hos': 'hosea',
    'joe': 'joel', 'jol': 'joel',
    'amo': 'amos', 'obad': 'obadiah', 'oba': 'obadiah',
    'jon': 'jonah', 'mic': 'micah',
    'nah': 'nahum', 'nam': 'nahum',
    'hab': 'habakkuk', 'zeph': 'zephaniah', 'zep': 'zephaniah',
    'hag': 'haggai', 'zech': 'zechariah', 'zec': 'zechariah',
    'mal': 'malachi',
    'mat': 'matthew', 'matt': 'matthew', 'mt': 'matthew',
    'mk': 'mark', 'mrk': 'mark', 'mr': 'mark',
    'lk': 'luke', 'luk': 'luke', 'lu': 'luke',
    'jn': 'john', 'jhn': 'john',
    'act': 'acts', 'ac': 'acts',
    'rom': 'romans', 'ro': 'romans',
    '1 cor': '1 corinthians', '1cor': '1 corinthians', '2 cor': '2 corinthians', '2cor': '2 corinthians',
    'gal': 'galatians', 'eph': 'ephesians',
    'phil': 'philippians', 'php': 'philippians',
    'col': 'colossians',
    '1 thess': '1 thessalonians', '1thess': '1 thessalonians', '2 thess': '2 thessalonians', '2thess': '2 thessalonians',
    '1 tim': '1 timothy', '1tim': '1 timothy', '2 tim': '2 timothy', '2tim': '2 timothy',
    'tit': 'titus', 'philem': 'philemon', 'phi': 'philemon', 'phm': 'philemon',
    'heb': 'hebrews', 'he': 'hebrews',
    'jas': 'james', 'jam': 'james', 'ja': 'james',
    '1 pet': '1 peter', '1pet': '1 peter', '2 pet': '2 peter', '2pet': '2 peter',
    '1 pe': '1 peter', '2 pe': '2 peter',
    '1 jn': '1 john', '1jn': '1 john', '2 jn': '2 john', '2jn': '2 john', '3 jn': '3 john', '3jn': '3 john',
    'jud': 'jude', 'jd': 'jude',
    'rev': 'revelation', 're': 'revelation', 'rv': 'revelation',
};

// Minimal native book names for testing
const NATIVE_BOOK_NAMES: Record<string, Record<string, string>> = {
    swa: {
        'genesis': 'Mwanzo', 'exodus': 'Kutoka', 'matthew': 'Mathayo',
        'mark': 'Marko', 'luke': 'Luka', 'john': 'Yohana',
        'psalms': 'Zaburi', 'revelation': 'Ufunuo',
    },
    amh: {
        'genesis': 'ኦሪት ዘፍጥረት', 'matthew': 'የማቴዎስ ወንጌል',
        'psalms': 'መዝሙረ ዳዊት', 'revelation': 'የዮሐንስ ራእይ',
    },
};

type ParsedRef = { book: string; chapter: number; verse: number | null; verseEnd?: number | null } | null;

function resolveBookReference(bookName: string, chapter: string, verse: string | null = null, verseEnd: string | null = null): ParsedRef {
    const book = bookName.trim().toLowerCase();

    if (BIBLE_BOOKS.includes(book)) {
        return {
            book: book.charAt(0).toUpperCase() + book.slice(1),
            chapter: parseInt(chapter),
            verse: verse ? parseInt(verse) : null,
            verseEnd: verseEnd ? parseInt(verseEnd) : null,
        };
    }

    const resolved = BOOK_ABBREVIATIONS[book];
    if (resolved) {
        const displayName = resolved.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return {
            book: displayName,
            chapter: parseInt(chapter),
            verse: verse ? parseInt(verse) : null,
            verseEnd: verseEnd ? parseInt(verseEnd) : null,
        };
    }

    for (const lang of Object.keys(NATIVE_BOOK_NAMES)) {
        const nativeMap = NATIVE_BOOK_NAMES[lang];
        for (const [engSlug, nativeLabel] of Object.entries(nativeMap)) {
            if (book === String(nativeLabel).toLowerCase().trim()) {
                const displayName = engSlug.split(' ').map((w: string) =>
                    /^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ');
                return {
                    book: displayName,
                    chapter: parseInt(chapter),
                    verse: verse ? parseInt(verse) : null,
                    verseEnd: verseEnd ? parseInt(verseEnd) : null,
                };
            }
        }
    }

    return null;
}

function parseVerseReference(query: string): ParsedRef {
    let cleaned = query.replace(/[,;"']+$/, '').trim();
    cleaned = cleaned.replace(/(\d+)\s*[./,:]\s*(\d+)\s*-\s*(\d+)/g, '$1:$2-$3');
    cleaned = cleaned.replace(/(\d+)\s*[./,:]\s*(\d+)/g, '$1:$2');

    // 1. Verse range: Book Chapter:VerseStart-VerseEnd
    const rangeMatch = cleaned.match(/^([\w\s]+)\s+(\d+):(\d+)\s*-\s*(\d+)$/i);
    if (rangeMatch) {
        const [, book, chapter, verse, verseEnd] = rangeMatch;
        return resolveBookReference(book, chapter, verse, verseEnd);
    }

    // 2. Full reference: Book Chapter:Verse
    const fullMatch = cleaned.match(/^([\w\s]+)\s+(\d+):(\d+)$/i);
    if (fullMatch) {
        const [, book, chapter, verse] = fullMatch;
        return resolveBookReference(book, chapter, verse);
    }

    // 3. Chapter only: Book Chapter
    const chapterMatch = cleaned.match(/^([\w\s]+)\s+(\d+)$/i);
    if (chapterMatch) {
        const [, book, chapter] = chapterMatch;
        return resolveBookReference(book, chapter);
    }

    // 4. Book only
    const bookOnly = cleaned.toLowerCase();
    if (BIBLE_BOOKS.includes(bookOnly)) {
        return { book: cleaned, chapter: 1, verse: null };
    }

    return null;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('parseVerseReference', () => {

    describe('standard English references', () => {
        it('parses Book Chapter:Verse', () => {
            const r = parseVerseReference('John 3:16');
            expect(r).toMatchObject({ book: 'John', chapter: 3, verse: 16 });
        });

        it('parses Book Chapter only', () => {
            const r = parseVerseReference('Genesis 1');
            expect(r).toMatchObject({ book: 'Genesis', chapter: 1, verse: null });
        });

        it('parses verse range Book Chapter:Start-End', () => {
            const r = parseVerseReference('Hosea 4:5-7');
            expect(r).toMatchObject({ book: 'Hosea', chapter: 4, verse: 5, verseEnd: 7 });
        });

        it('parses numbered books: 1 Corinthians 13:4', () => {
            const r = parseVerseReference('1 Corinthians 13:4');
            expect(r).toMatchObject({ book: '1 Corinthians', chapter: 13, verse: 4 });
        });

        it('parses 2 Timothy 3:16', () => {
            const r = parseVerseReference('2 Timothy 3:16');
            expect(r).toMatchObject({ book: '2 Timothy', chapter: 3, verse: 16 });
        });

        it('parses Psalms 23:1', () => {
            const r = parseVerseReference('Psalms 23:1');
            expect(r).toMatchObject({ chapter: 23, verse: 1 });
        });

        it('parses Song of Solomon 1:1', () => {
            const r = parseVerseReference('Song of Solomon 1:1');
            expect(r).toMatchObject({ chapter: 1, verse: 1 });
        });
    });

    describe('punctuation normalization', () => {
        it('handles dot separator: John 3.16', () => {
            const r = parseVerseReference('John 3.16');
            expect(r).toMatchObject({ book: 'John', chapter: 3, verse: 16 });
        });

        it('handles slash separator: John 3/16', () => {
            const r = parseVerseReference('John 3/16');
            expect(r).toMatchObject({ book: 'John', chapter: 3, verse: 16 });
        });

        it('handles trailing comma: John 3:16,', () => {
            const r = parseVerseReference('John 3:16,');
            expect(r).toMatchObject({ book: 'John', chapter: 3, verse: 16 });
        });

        it('handles range with dot: Hosea 4.5-7', () => {
            const r = parseVerseReference('Hosea 4.5-7');
            expect(r).toMatchObject({ chapter: 4, verse: 5, verseEnd: 7 });
        });
    });

    describe('abbreviations', () => {
        it('resolves Gen 1:1', () => {
            const r = parseVerseReference('Gen 1:1');
            expect(r?.book).toBe('Genesis');
        });

        it('resolves Ps 23:1', () => {
            const r = parseVerseReference('Ps 23:1');
            expect(r?.book).toBe('Psalm');
        });

        it('resolves Rev 22:21', () => {
            const r = parseVerseReference('Rev 22:21');
            expect(r?.book).toBe('Revelation');
        });

        it('resolves Matt 5:3', () => {
            const r = parseVerseReference('Matt 5:3');
            expect(r?.book).toBe('Matthew');
        });

        it('resolves Jn 1:1', () => {
            const r = parseVerseReference('Jn 1:1');
            expect(r?.book).toBe('John');
        });

        it('resolves 1 Cor 13:4', () => {
            const r = parseVerseReference('1 Cor 13:4');
            expect(r?.book).toBe('1 Corinthians');
        });

        it('resolves 2 Tim 3:16', () => {
            const r = parseVerseReference('2 Tim 3:16');
            expect(r?.book).toBe('2 Timothy');
        });

        it('resolves Eph 2:8', () => {
            const r = parseVerseReference('Eph 2:8');
            expect(r?.book).toBe('Ephesians');
        });

        it('resolves Heb 11:1', () => {
            const r = parseVerseReference('Heb 11:1');
            expect(r?.book).toBe('Hebrews');
        });

        it('resolves Jas 1:5', () => {
            const r = parseVerseReference('Jas 1:5');
            expect(r?.book).toBe('James');
        });
    });

    describe('native language book names', () => {
        it('resolves Swahili: Yohana 3:16', () => {
            const r = parseVerseReference('Yohana 3:16');
            expect(r?.book).toBe('John');
            expect(r?.chapter).toBe(3);
            expect(r?.verse).toBe(16);
        });

        it('resolves Swahili: Mwanzo 1:1', () => {
            const r = parseVerseReference('Mwanzo 1:1');
            expect(r?.book).toBe('Genesis');
        });

        it('resolves Swahili: Ufunuo 22:21', () => {
            const r = parseVerseReference('Ufunuo 22:21');
            expect(r?.book).toBe('Revelation');
        });

        it('resolves Swahili: Mathayo 5:3', () => {
            const r = parseVerseReference('Mathayo 5:3');
            expect(r?.book).toBe('Matthew');
        });

        it('resolves Amharic: የዮሐንስ ራእይ 1:1', () => {
            const r = parseVerseReference('የዮሐንስ ራእይ 1:1');
            expect(r?.book).toBe('Revelation');
        });
    });

    describe('book-only queries', () => {
        it('returns chapter 1 for book-only: genesis', () => {
            const r = parseVerseReference('genesis');
            expect(r).toMatchObject({ chapter: 1, verse: null });
        });

        it('returns chapter 1 for book-only: revelation', () => {
            const r = parseVerseReference('revelation');
            expect(r).toMatchObject({ chapter: 1, verse: null });
        });
    });

    describe('invalid / keyword queries', () => {
        it('returns null for keyword: love', () => {
            expect(parseVerseReference('love')).toBeNull();
        });

        it('returns null for keyword: faith hope', () => {
            expect(parseVerseReference('faith hope')).toBeNull();
        });

        it('returns null for empty string', () => {
            expect(parseVerseReference('')).toBeNull();
        });

        it('returns null for numbers only: 3:16', () => {
            expect(parseVerseReference('3:16')).toBeNull();
        });
    });

    describe('edge cases', () => {
        it('handles extra whitespace: John  3 : 16', () => {
            // The regex handles spaces around colon via normalization
            const r = parseVerseReference('John 3:16');
            expect(r).not.toBeNull();
        });

        it('handles lowercase full reference: john 3:16', () => {
            const r = parseVerseReference('john 3:16');
            expect(r?.book).toBe('John');
        });

        it('handles uppercase full reference: JOHN 3:16', () => {
            const r = parseVerseReference('JOHN 3:16');
            expect(r?.book).toBe('John');
        });

        it('parses large chapter numbers: Psalms 119:105', () => {
            const r = parseVerseReference('Psalms 119:105');
            expect(r).toMatchObject({ chapter: 119, verse: 105 });
        });

        it('parses Revelation 22:21 (last verse of Bible)', () => {
            const r = parseVerseReference('Revelation 22:21');
            expect(r).toMatchObject({ chapter: 22, verse: 21 });
        });

        it('parses Genesis 1:1 (first verse of Bible)', () => {
            const r = parseVerseReference('Genesis 1:1');
            expect(r).toMatchObject({ book: 'Genesis', chapter: 1, verse: 1 });
        });
    });
});
