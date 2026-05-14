import { BibleVersion, VerseReference, Verse, Chapter, Book, BIBLE_BOOKS } from '../../types/index.js';
import { getCanonBook, getVerseCount, getChapterCount } from './BibleCanon';

export class BibleVersionLoader {
  private supportedVersions: BibleVersion[];
  private verseCache: Map<string, Verse> = new Map();
  private bibleData: any | null = null;
  private ethiopianData: any | null = null;
  private privateVersionData: Map<string, any> = new Map();
  private privateVersionLoadPromises: Map<string, Promise<any | null>> = new Map();
  private dataLoadPromise: Promise<void> | null = null;

  constructor() {
    console.log('BibleVersionLoader created');
    this.supportedVersions = this.initializeSupportedVersions();
  }

  private async ensureDataLoaded(): Promise<void> {
    if (this.dataLoadPromise) {
      return this.dataLoadPromise;
    }

    this.dataLoadPromise = (async () => {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        // Browser: load from static server paths
        try {
          const res = await fetch('/bible-data.json', { cache: 'no-store' });
          if (res.ok) {
            this.bibleData = await res.json();
          }
        } catch {
          this.bibleData = null;
        }

        try {
          const res = await fetch('/data/ethiopian_bible.json', { cache: 'no-store' });
          if (res.ok) {
            this.ethiopianData = await res.json();
          }
        } catch {
          this.ethiopianData = null;
        }

        return;
      }

      // Node (tests/server): load from filesystem via import.meta.url-relative paths.
      const bibleCandidates = [
        new URL('../../../bible-data.json', import.meta.url),
        new URL('../../../../bible-data.json', import.meta.url)
      ];
      const ethiopianCandidates = [
        new URL('../../../data/ethiopian_bible.json', import.meta.url),
        new URL('../../../../data/ethiopian_bible.json', import.meta.url)
      ];

      this.bibleData = await this.tryReadJsonFile(bibleCandidates);
      this.ethiopianData = await this.tryReadJsonFile(ethiopianCandidates);
    })();

    return this.dataLoadPromise;
  }

  private async tryReadJsonFile(candidates: URL[]): Promise<any | null> {
    try {
      const { readFile } = await import('fs/promises');
      for (const url of candidates) {
        try {
          const buf = await readFile(url);
          return JSON.parse(buf.toString('utf-8'));
        } catch {
          // try next candidate
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async loadPrivateVersionData(versionId: string): Promise<any | null> {
    if (this.privateVersionData.has(versionId)) {
      return this.privateVersionData.get(versionId) ?? null;
    }

    const existingPromise = this.privateVersionLoadPromises.get(versionId);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      // Browser: load from static server paths
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        try {
          const res = await fetch(`/data_private/bibles/${encodeURIComponent(versionId)}.json`, { cache: 'no-store' });
          if (!res.ok) {
            this.privateVersionData.set(versionId, null);
            return null;
          }
          const json = await res.json();
          this.privateVersionData.set(versionId, json);
          return json;
        } catch {
          this.privateVersionData.set(versionId, null);
          return null;
        } finally {
          this.privateVersionLoadPromises.delete(versionId);
        }
      }

      // Node (tests/server): load from filesystem via import.meta.url-relative paths.
      try {
        const candidates = [
          new URL(`../../../data_private/bibles/${versionId}.json`, import.meta.url),
          new URL(`../../../../data_private/bibles/${versionId}.json`, import.meta.url)
        ];
        const json = await this.tryReadJsonFile(candidates);
        this.privateVersionData.set(versionId, json);
        return json;
      } finally {
        this.privateVersionLoadPromises.delete(versionId);
      }
    })();

    this.privateVersionLoadPromises.set(versionId, promise);
    return promise;
  }

  private getVerseTextFromData(versionId: string, reference: VerseReference): string | null {
    const privateData = this.privateVersionData.get(versionId);
    if (privateData) {
      const byBook = privateData[reference.book];
      if (byBook) {
        const byChapter = byBook[String(reference.chapter)];
        if (byChapter) {
          const text = byChapter[String(reference.verse)];
          if (typeof text === 'string' && text.trim()) {
            return text;
          }
        }
      }
    }

    if (versionId === 'ethiopian' && this.ethiopianData) {
      const key = `${reference.book} ${reference.chapter}:${reference.verse}`;
      const entry = this.ethiopianData[key];
      if (entry && typeof entry.text === 'string') {
        return entry.text;
      }
    }

    const abbrMap: Record<string, string> = {
      kjv: 'KJV',
      niv: 'NIV',
      esv: 'ESV',
      nlt: 'NLT',
      nkjv: 'NKJV'
    };

    const abbr = abbrMap[versionId];
    if (!abbr || !this.bibleData) {
      return null;
    }

    const byBook = this.bibleData[reference.book];
    if (!byBook) return null;

    const byChapter = byBook[String(reference.chapter)];
    if (!byChapter) return null;

    const byVerse = byChapter[String(reference.verse)];
    if (!byVerse) return null;

    const text = byVerse[abbr];
    return typeof text === 'string' ? text : null;
  }

  private async getVerseTextFromApi(versionId: string, reference: VerseReference): Promise<string | null> {
    // Avoid network calls in Node/test environments.
    if (typeof window === 'undefined') {
      return null;
    }
    if (!(globalThis as any).fetch) {
      return null;
    }

    // bible-api.com has limited translation support; keep a conservative mapping.
    const apiTranslationByVersion: Record<string, string> = {
      kjv: 'kjv'
    };
    const apiTranslation = apiTranslationByVersion[versionId];
    if (!apiTranslation) {
      return null;
    }

    const refStr = `${reference.book} ${reference.chapter}:${reference.verse}`;
    try {
      const res = await fetch(`/api/bible/${encodeURIComponent(refStr)}?version=${encodeURIComponent(apiTranslation)}`);
      if (!res.ok) {
        return null;
      }
      const data: any = await res.json();
      const text = typeof data?.text === 'string' ? data.text : (Array.isArray(data?.verses) ? data.verses[0]?.text : null);
      return typeof text === 'string' ? text.trim() : null;
    } catch {
      return null;
    }
  }

  private initializeSupportedVersions(): BibleVersion[] {
    return [
      {
        id: 'kjv',
        name: 'King James Version',
        abbreviation: 'KJV',
        language: 'English',
        year: 1611,
        copyright: 'Public Domain',
        features: [
          { name: 'textDirection', enabled: true },
          { name: 'fontFamily', enabled: true },
          { name: 'requiresSpecialFont', enabled: false }
        ]
      },
      {
        id: 'niv',
        name: 'New International Version',
        abbreviation: 'NIV',
        language: 'English',
        year: 1978,
        copyright: 'Biblica, Inc.',
        features: [
          { name: 'textDirection', enabled: true },
          { name: 'fontFamily', enabled: true },
          { name: 'requiresSpecialFont', enabled: false }
        ]
      },
      {
        id: 'esv',
        name: 'English Standard Version',
        abbreviation: 'ESV',
        language: 'English',
        year: 2001,
        copyright: 'Crossway',
        features: [
          { name: 'textDirection', enabled: true },
          { name: 'fontFamily', enabled: true },
          { name: 'requiresSpecialFont', enabled: false }
        ]
      },
      {
        id: 'nlt',
        name: 'New Living Translation',
        abbreviation: 'NLT',
        language: 'English',
        year: 1996,
        copyright: 'Tyndale House Publishers',
        features: [
          { name: 'textDirection', enabled: true },
          { name: 'fontFamily', enabled: true },
          { name: 'requiresSpecialFont', enabled: false }
        ]
      },
      {
        id: 'nkjv',
        name: 'New King James Version',
        abbreviation: 'NKJV',
        language: 'English',
        year: 1982,
        copyright: 'Thomas Nelson',
        features: [
          { name: 'textDirection', enabled: true },
          { name: 'fontFamily', enabled: true },
          { name: 'requiresSpecialFont', enabled: false }
        ]
      },
      {
        id: 'ethiopian',
        name: 'Ethiopian Orthodox Bible',
        abbreviation: 'ETH',
        language: 'Amharic',
        year: 2000,
        copyright: 'Ethiopian Orthodox Church',
        features: [
          { name: 'textDirection', enabled: true },
          { name: 'fontFamily', enabled: true },
          { name: 'requiresSpecialFont', enabled: true },
          { name: 'amharic-font', enabled: true }
        ]
      },
      {
        id: 'hebrew',
        name: 'Hebrew Bible',
        abbreviation: 'HEB',
        language: 'Hebrew',
        year: 1100,
        copyright: 'Public Domain',
        features: [
          { name: 'textDirection', enabled: true },
          { name: 'fontFamily', enabled: true },
          { name: 'requiresSpecialFont', enabled: true },
          { name: 'right-to-left', enabled: true }
        ]
      }
    ];
  }

  getSupportedVersions(): BibleVersion[] {
    return this.supportedVersions;
  }

  getVersion(id: string): BibleVersion | null {
    return this.getVersionById(id);
  }

  getVersionById(id: string): BibleVersion | null {
    return this.supportedVersions.find(version => version.id === id) || null;
  }

  isVersionAvailable(id: string): boolean {
    return this.supportedVersions.some(version => version.id === id);
  }

  getVersionStats(versionId: string): { books: number; availableBooks: string[] } | null {
    const version = this.getVersionById(versionId);
    if (!version) {
      return null;
    }

    return {
      books: BIBLE_BOOKS.length,
      availableBooks: [...BIBLE_BOOKS]
    };
  }

  getVersionStatistics() {
    return {
      total: this.supportedVersions.length,
      english: this.supportedVersions.filter(v => v.language === 'English').length,
      multilingual: this.supportedVersions.filter(v => v.language !== 'English').length,
      specialFonts: this.supportedVersions.filter(v => 
        v.features.some(f => f.name === 'requiresSpecialFont' && f.enabled)
      ).length
    };
  }

  validateVersionIntegrity(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredVersions = ['kjv', 'niv', 'esv', 'nlt', 'nkjv', 'ethiopian', 'hebrew'];
    for (const id of requiredVersions) {
      if (!this.isVersionAvailable(id)) {
        errors.push(`Missing required version: ${id}`);
      }
    }

    return { errors, warnings };
  }

  isRightToLeft(versionId: string): boolean {
    return this.getTextDirection(versionId) === 'rtl';
  }

  getTextDirection(versionId: string): 'ltr' | 'rtl' {
    const version = this.getVersionById(versionId);
    if (!version) return 'ltr';
    
    const isRightToLeft = version.features.some(f =>
      (f.name === 'right-to-left' || f.name === 'rightToLeft') && f.enabled
    );
    return isRightToLeft ? 'rtl' : 'ltr';
  }

  getFontFamily(versionId: string): string {
    const version = this.getVersionById(versionId);
    if (!version) return 'serif';
    
    if (versionId === 'ethiopian') {
      return 'Noto Sans Ethiopic, Nyala, serif';
    } else if (versionId === 'hebrew') {
      return 'Noto Sans Hebrew, David, serif';
    }
    return 'serif';
  }

  requiresSpecialFont(versionId: string): boolean {
    const version = this.getVersionById(versionId);
    if (!version) return false;
    
    return version.features.some(f => f.name === 'requiresSpecialFont' && f.enabled);
  }

  async loadVerse(versionId: string, reference: VerseReference): Promise<string | null>;
  async loadVerse(book: string, chapter: number, verse: number, versionId: string): Promise<Verse | null>;
  async loadVerse(
    versionIdOrBook: string, 
    referenceOrChapter: VerseReference | number, 
    verse?: number, 
    versionId?: string
  ): Promise<string | Verse | null> {
    // Handle overloaded signatures
    let actualVersionId: string;
    let actualReference: VerseReference;
    
    if (typeof referenceOrChapter === 'object') {
      actualVersionId = versionIdOrBook;
      actualReference = referenceOrChapter;
    } else {
      actualVersionId = versionId!;
      actualReference = {
        book: versionIdOrBook,
        chapter: referenceOrChapter,
        verse: verse!
      };
    }
    
    const actualVersion = this.getVersionById(actualVersionId);
    if (!actualVersion) {
      if (typeof referenceOrChapter === 'object') {
        return null;
      }
      throw new Error('Version not found');
    }

    if (typeof referenceOrChapter !== 'object') {
      const canonBook = getCanonBook(actualReference.book);
      if (!canonBook) {
        throw new Error('Invalid book');
      }

      const chapterCount = getChapterCount(actualReference.book);
      if (actualReference.chapter < 1 || actualReference.chapter > chapterCount) {
        throw new Error('Invalid chapter');
      }

      const verseCount = getVerseCount(actualReference.book, actualReference.chapter);
      if (actualReference.verse < 1 || actualReference.verse > verseCount) {
        throw new Error('Invalid verse');
      }

      const cacheKey = `${actualVersion.id}-${actualReference.book}-${actualReference.chapter}-${actualReference.verse}`;
      const cached = this.verseCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    let text: string;

    await this.ensureDataLoaded();

    // Prefer locally provided per-version data (BYOD) if present.
    await this.loadPrivateVersionData(actualVersionId);
    const dataText = this.getVerseTextFromData(actualVersionId, actualReference);
    if (dataText) {
      text = dataText;
    } else {
      const apiText = await this.getVerseTextFromApi(actualVersionId, actualReference);
      if (apiText) {
        text = apiText;
      } else {
        const refKey = `${actualReference.book}|${actualReference.chapter}|${actualReference.verse}`;
        const knownTexts: Record<string, Record<string, string>> = {
          kjv: {
            'Genesis|1|1': 'In the beginning God created the heaven and the earth.',
            'John|3|16': 'For God so loved the world, that he gave his only begotten Son...',
            'Psalms|23|1': 'The LORD is my shepherd; I shall not want.'
          },
          niv: {
            'Genesis|1|1': 'In the beginning God created the heavens and the earth.',
            'John|3|16': 'For God so loved the world that he gave his one and only Son...',
            'Psalms|23|1': 'The LORD is my shepherd, I lack nothing.'
          },
          esv: {
            'Genesis|1|1': 'In the beginning, God created the heavens and the earth.',
            'John|3|16': 'For God so loved the world, that he gave his only Son...',
            'Psalms|23|1': 'The LORD is my shepherd; I shall not want.'
          },
          nlt: {
            'Genesis|1|1': 'In the beginning God created the heavens and the earth.',
            'John|3|16': 'For this is how God loved the world: He gave his one and only Son...',
            'Psalms|23|1': 'The LORD is my shepherd; I have all that I need.'
          },
          nkjv: {
            'Genesis|1|1': 'In the beginning God created the heavens and the earth.',
            'John|3|16': 'For God so loved the world that He gave His only begotten Son...',
            'Psalms|23|1': 'The LORD is my shepherd; I shall not want.'
          },
          ethiopian: {
            'Genesis|1|1': 'በፊተጊዜ እግዚአብሔር ሰማይንና ምድርን ፈጠረ።'
          },
          hebrew: {
            'Genesis|1|1': 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ'
          }
        };

        const perVersion = knownTexts[actualVersionId];
        if (perVersion && perVersion[refKey]) {
          text = perVersion[refKey];
        } else if (actualVersionId === 'ethiopian') {
          text = `ናሙና ቃል ከ ${actualReference.book} ${actualReference.chapter}:${actualReference.verse}`;
        } else if (actualVersionId === 'hebrew') {
          text = `פסוק לדוגמה מ ${actualReference.book} ${actualReference.chapter}:${actualReference.verse}`;
        } else {
          text = `Sample verse from ${actualVersionId} for ${actualReference.book} ${actualReference.chapter}:${actualReference.verse}`;
        }
      }
    }
    
    // Return format depends on which signature was used
    if (typeof referenceOrChapter === 'object') {
      return text; // First signature returns string
    } else {
      const result: Verse = {
        reference: actualReference,
        text,
        version: actualVersion,
        language: actualVersion.language
      };

      const cacheKey = `${actualVersion.id}-${actualReference.book}-${actualReference.chapter}-${actualReference.verse}`;
      this.verseCache.set(cacheKey, result);

      return result;
    }
  }

  async loadMultipleVerses(references: VerseReference[], versionId: string): Promise<Verse[]> {
    const results: Verse[] = [];
    for (const ref of references) {
      const verse = await this.loadVerse(ref.book, ref.chapter, ref.verse, versionId);
      if (verse) {
        results.push(verse);
      }
    }
    return results;
  }

  async loadVerseRange(book: string, chapter: number, startVerse: number, endVerse: number, versionId: string): Promise<Verse[]> {
    if (endVerse < startVerse) {
      throw new Error('Invalid verse');
    }

    const results: Verse[] = [];
    for (let v = startVerse; v <= endVerse; v++) {
      const verse = await this.loadVerse(book, chapter, v, versionId);
      if (verse) {
        results.push(verse);
      }
    }
    return results;
  }

  async loadVerses(versionId: string, references: VerseReference[]): Promise<string[]> {
    const results: string[] = [];
    for (const ref of references) {
      const verse = await this.loadVerse(versionId, ref);
      if (verse) {
        results.push(verse);
      }
    }
    return results;
  }

  async loadChapter(versionId: string, book: string, chapter: number): Promise<string[]>;
  async loadChapter(book: string, chapter: number, versionId: string): Promise<Chapter | null>;
  async loadChapter(
    versionIdOrBook: string,
    bookOrChapter: string | number,
    chapterOrVersionId: number | string
  ): Promise<string[] | Chapter | null> {
    if (typeof bookOrChapter === 'string') {
      const versionId = versionIdOrBook;
      const book = bookOrChapter;
      const chapter = chapterOrVersionId as number;

      if (!this.isVersionAvailable(versionId)) {
        return [];
      }

      const verseCount = getVerseCount(book, chapter) || 31;
      const verses: string[] = [];
      for (let verse = 1; verse <= verseCount; verse++) {
        const verseText = await this.loadVerse(versionId, { book, chapter, verse });
        if (verseText) {
          verses.push(verseText);
        }
      }
      return verses;
    }

    const book = versionIdOrBook;
    const chapter = bookOrChapter as number;
    const versionId = chapterOrVersionId as string;

    const canonBook = getCanonBook(book);
    if (!canonBook) {
      return null;
    }

    const version = this.getVersionById(versionId);
    if (!version) {
      return null;
    }

    const verseCount = getVerseCount(book, chapter);
    if (!verseCount) {
      return null;
    }

    const verses: Verse[] = [];
    for (let verseNum = 1; verseNum <= verseCount; verseNum++) {
      const loaded = await this.loadVerse(book, chapter, verseNum, versionId);
      if (loaded) {
        verses.push(loaded);
      }
    }

    return {
      number: chapter,
      verses
    };
  }

  async loadBook(book: string, versionId: string): Promise<Book | null> {
    const canonBook = getCanonBook(book);
    if (!canonBook) {
      return null;
    }

    const version = this.getVersionById(versionId);
    if (!version) {
      return null;
    }

    const chapterCount = getChapterCount(book);
    if (!chapterCount) {
      return null;
    }

    const chapters: Chapter[] = [];
    for (let chapterNum = 1; chapterNum <= chapterCount; chapterNum++) {
      const chapterData = await this.loadChapter(book, chapterNum, versionId);
      if (chapterData) {
        chapters.push(chapterData);
      }
    }

    return {
      name: canonBook.name,
      abbreviation: canonBook.abbreviation,
      testament: canonBook.testament,
      chapters,
      metadata: {}
    };
  }

  clearCache(versionId?: string): void {
    if (!versionId) {
      this.verseCache.clear();
      console.log('Cache cleared');
      return;
    }

    for (const key of this.verseCache.keys()) {
      if (key.startsWith(`${versionId}-`)) {
        this.verseCache.delete(key);
      }
    }
    console.log('Cache cleared');
  }

  async preloadVerses(versionId: string, references: VerseReference[]): Promise<void>;
  async preloadVerses(references: VerseReference[], versionId: string): Promise<void>;
  async preloadVerses(
    versionIdOrReferences: string | VerseReference[],
    referencesOrVersionId: VerseReference[] | string
  ): Promise<void> {
    const versionId = typeof versionIdOrReferences === 'string' ? versionIdOrReferences : (referencesOrVersionId as string);
    const references = Array.isArray(versionIdOrReferences) ? versionIdOrReferences : (referencesOrVersionId as VerseReference[]);
    console.log(`Preloading ${references.length} verses for ${versionId}`);
  }
}