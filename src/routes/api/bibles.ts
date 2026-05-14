// Bible API Routes — Real Bible Data Integration
// Uses bible-api.com (KJV, WEB, ASV) and bible.helloao.org (1000+ translations)
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pollinationsChatText } from '../../lib/pollinationsClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ============================================================
// Bible Version Registry
// Maps internal version codes to external API translation IDs
// ============================================================
interface BibleVersion {
    id: string;
    name: string;
    language: string;
    languageCode: string;
    source: 'bible-api' | 'helloao' | 'local-text' | 'pdf-only';
    apiId: string;          // translation id for the external API
    helloaoBookMap?: boolean; // helloao uses 3-char book codes
    available: boolean;
    copyright: string;
    localDir?: string;      // Path relative to project root
    pdfPath?: string;       // Optional link to PDF material
}

const BIBLE_VERSIONS: Record<string, BibleVersion> = {
    // ---- English (Public Domain / Free) ----
    KJV: {
        id: 'KJV', name: 'King James Version', language: 'English', languageCode: 'eng',
        source: 'bible-api', apiId: 'kjv', available: true, copyright: 'Public Domain'
    },
    WEB: {
        id: 'WEB', name: 'World English Bible', language: 'English', languageCode: 'eng',
        source: 'bible-api', apiId: 'web', available: true, copyright: 'Public Domain'
    },
    ESV: {
        id: 'ESV', name: 'Berean Standard Bible (ESV Alt)', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'BSB', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    ASV: {
        id: 'ASV', name: 'American Standard Version', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_asv', helloaoBookMap: true, available: true, copyright: 'Public Domain'
    },
    BBE: {
        id: 'BBE', name: 'Bible in Basic English', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_bbe', helloaoBookMap: true, available: true, copyright: 'Public Domain'
    },
    BSB: {
        id: 'BSB', name: 'Berean Standard Bible', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'BSB', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    YLT: {
        id: 'YLT', name: "Young's Literal Translation", language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_ylt', helloaoBookMap: true, available: true, copyright: 'Public Domain'
    },
    DRA: {
        id: 'DRA', name: 'Douay-Rheims 1899', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_dra', helloaoBookMap: true, available: true, copyright: 'Public Domain'
    },
    DBY: {
        id: 'DBY', name: 'Darby Translation', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_dby', helloaoBookMap: true, available: true, copyright: 'Public Domain'
    },
    GNV: {
        id: 'GNV', name: 'Geneva Bible 1599', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_gnv', helloaoBookMap: true, available: true, copyright: 'Public Domain'
    },
    FBV: {
        id: 'FBV', name: 'Free Bible Version', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_fbv', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    NET: {
        id: 'NET', name: 'NET Bible', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_net', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    LSV: {
        id: 'LSV', name: 'Literal Standard Version', language: 'English', languageCode: 'eng',
        source: 'helloao', apiId: 'eng_lsv', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },

    // ---- African Languages ----
    SWAHILI: {
        id: 'SWAHILI', name: 'Swahili Contemporary (Neno)', language: 'Swahili', languageCode: 'swa',
        source: 'helloao', apiId: 'swh_bib', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    SWAHILI_STD: {
        id: 'SWAHILI_STD', name: 'Swahili Standard (Union)', language: 'Swahili', languageCode: 'swa',
        source: 'helloao', apiId: 'swh_ulb', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    SUBA: {
        id: 'SUBA', name: 'Suba (Kenya)', language: 'Suba', languageCode: 'sxb',
        source: 'helloao', apiId: 'sxb_wbt', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    KIKUYU: {
        id: 'KIKUYU', name: 'Kikuyu Bible', language: 'Kikuyu', languageCode: 'kik',
        source: 'helloao', apiId: 'kik_bib', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    LUO: {
        id: 'LUO', name: 'Dholuo Bible', language: 'Dholuo', languageCode: 'luo',
        source: 'helloao', apiId: 'luo_bib', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    EKEGUSII: {
        id: 'EKEGUSII', name: 'Ebibilia Enchenu (Revised)', language: 'Ekegusii', languageCode: 'guz',
        source: 'local-text', apiId: 'guz_bsk', available: true, copyright: 'Bible Society of Kenya',
        localDir: 'Bible_Books/Ebibilia Enchenu'
    },
    ETHIOPIAN_ORTHODOX: {
        id: 'ETHIOPIAN_ORTHODOX', name: 'Ethiopian Orthodox Bible (88 Books)', language: 'Amharic', languageCode: 'amh',
        source: 'pdf-only', apiId: 'eth_ortho', available: true, copyright: 'EOTC (High Fidelity PDF)',
        pdfPath: '/Bible_Books/The_Ethiopian_Orthodox_Bible.pdf'
    },
    AMHARIC: {
        id: 'AMHARIC', name: 'Amharic Bible', language: 'Amharic', languageCode: 'amh',
        source: 'helloao', apiId: 'amh_amh', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },

    // ---- Additional languages via bible-api.com ----
    CHEROKEE: {
        id: 'CHEROKEE', name: 'Cherokee New Testament', language: 'Cherokee', languageCode: 'chr',
        source: 'bible-api', apiId: 'cherokee', available: true, copyright: 'Public Domain'
    },
    PORTUGUESE: {
        id: 'PORTUGUESE', name: 'João Ferreira de Almeida', language: 'Portuguese', languageCode: 'por',
        source: 'bible-api', apiId: 'almeida', available: true, copyright: 'Public Domain'
    },
    KAMBA: {
        id: 'KAMBA', name: 'Mbivilia (Kamba)', language: 'Kamba', languageCode: 'kam',
        source: 'pdf-only', apiId: 'kam_pdf', available: true, copyright: 'Historical Scan (Archive.org)',
        pdfPath: 'https://archive.org/details/rosettaproject_kam_gen-1'
    },
    MERU: {
        id: 'MERU', name: 'Iuku Ria Murungu (Meru)', language: 'Meru', languageCode: 'mer',
        source: 'pdf-only', apiId: 'mer_pdf', available: true, copyright: 'Bible Society of Kenya',
        pdfPath: 'https://archive.org/details/merubible'
    },
    MAASAI: {
        id: 'MAASAI', name: 'Biblia Sinyati (Maasai)', language: 'Maasai', languageCode: 'mas',
        source: 'pdf-only', apiId: 'mas_pdf', available: true, copyright: 'Bible Society of Kenya',
        pdfPath: 'https://archive.org/details/maasaibible'
    },
    KALENJIN: {
        id: 'KALENJIN', name: 'Kalenjin Bible (Sabaot)', language: 'Kalenjin', languageCode: 'kln',
        source: 'helloao', apiId: 'spy_wbt', helloaoBookMap: true, available: true, copyright: 'Free Use'
    },
    EMBU: {
        id: 'EMBU', name: 'Ivuku Ria Uvoro (Embu)', language: 'Embu', languageCode: 'ebu',
        source: 'pdf-only', apiId: 'ebu_pdf', available: true, copyright: 'Bible Society of Kenya',
        pdfPath: 'https://archive.org/details/embubible'
    },
};

// ============================================================
// Book Name → 3-letter USFM code mapping (for helloao.org)
// ============================================================
const BOOK_CODE_MAP: Record<string, string> = {
    'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
    'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
    '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
    '1 chronicles': '1CH', '2 chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
    'esther': 'EST', 'job': 'JOB', 'psalm': 'PSA', 'psalms': 'PSA',
    'proverbs': 'PRO', 'ecclesiastes': 'ECC', 'song of solomon': 'SNG',
    'songs of solomon': 'SNG', 'song of songs': 'SNG',
    'isaiah': 'ISA', 'jeremiah': 'JER', 'lamentations': 'LAM', 'ezekiel': 'EZK',
    'daniel': 'DAN', 'hosea': 'HOS', 'joel': 'JOL', 'amos': 'AMO',
    'obadiah': 'OBA', 'jonah': 'JON', 'micah': 'MIC', 'nahum': 'NAM',
    'habakkuk': 'HAB', 'zephaniah': 'ZEP', 'haggai': 'HAG', 'zechariah': 'ZEC',
    'malachi': 'MAL',
    'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN',
    'acts': 'ACT', 'romans': 'ROM', '1 corinthians': '1CO', '2 corinthians': '2CO',
    'galatians': 'GAL', 'ephesians': 'EPH', 'philippians': 'PHP',
    'colossians': 'COL', '1 thessalonians': '1TH', '2 thessalonians': '2TH',
    '1 timothy': '1TI', '2 timothy': '2TI', 'titus': 'TIT', 'philemon': 'PHM',
    'hebrews': 'HEB', 'james': 'JAS', '1 peter': '1PE', '2 peter': '2PE',
    '1 john': '1JN', '2 john': '2JN', '3 john': '3JN', 'jude': 'JUD',
    'revelation': 'REV', 'revelations': 'REV',
    
    // Common Shorthand & Abbreviations
    'gen': 'GEN', 'ex': 'EXO', 'lev': 'LEV', 'num': 'NUM', 'deut': 'DEU',
    'jos': 'JOS', 'judg': 'JDG', '1 sam': '1SA', '2 sam': '2SA',
    '1 kgs': '1KI', '2 kgs': '2KI', '1 chron': '1CH', '2 chron': '2CH',
    'neh': 'NEH', 'est': 'EST', 'ps': 'PSA', 'prov': 'PRO', 'ecc': 'ECC',
    'song': 'SNG', 'isa': 'ISA', 'jer': 'JER', 'lam': 'LAM', 'ezek': 'EZK',
    'dan': 'DAN', 'hos': 'HOS', 'obad': 'OBA', 'mic': 'MIC', 'nah': 'NAM',
    'hab': 'HAB', 'zeph': 'ZEP', 'hag': 'HAG', 'zech': 'ZEC', 'mal': 'MAL',
    'mat': 'MAT', 'matt': 'MAT', 'mrk': 'MRK', 'mk': 'MRK', 'luk': 'LUK', 'lk': 'LUK', 'jhn': 'JHN', 'jn': 'JHN',
    'rom': 'ROM', '1 cor': '1CO', '2 cor': '2CO', 'gal': 'GAL',
    'eph': 'EPH', 'phil': 'PHP', 'col': 'COL', '1 thess': '1TH', '2 thess': '2TH',
    '1 tim': '1TI', '2 tim': '2TI', 'tit': 'TIT', 'philem': 'PHM', 'heb': 'HEB',
    'jas': 'JAS', '1 pet': '1PE', '2 pet': '2PE', '1 jn': '1JN', '2 jn': '2JN',
    '3 jn': '3JN', 'rev': 'REV',

    // Deuterocanonical / local-text (Ekegusii & similar)
    'tobit': 'TOB', 'judith': 'JDT', 'wisdom': 'WIS', 'wisdom of solomon': 'WIS',
    'sirach': 'SIR', 'ecclesiasticus': 'SIR',
    '1 maccabees': '1MA', '2 maccabees': '2MA'
};

/** Protestant canon navigation order (lowercase slugs aligned with frontend selects). */
const PROTESTANT_OT_ORDER = [
    'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
    '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra', 'nehemiah', 'esther',
    'job', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel',
    'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'
] as const;

const PROTESTANT_NT_ORDER = [
    'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1 corinthians', '2 corinthians', 'galatians', 'ephesians', 'philippians', 'colossians',
    '1 thessalonians', '2 thessalonians', '1 timothy', '2 timothy', 'titus', 'philemon', 'hebrews', 'james', '1 peter', '2 peter',
    '1 john', '2 john', '3 john', 'jude', 'revelation'
] as const;

const NT_USFM_CODES = new Set([
    'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM',
    'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
]);

/** Maps USFM 3-letter codes to one canonical lowercase slug per book. */
const CODE_TO_CANON_SLUG: Record<string, string> = {};
for (const slug of PROTESTANT_OT_ORDER) {
    const code = BOOK_CODE_MAP[slug];
    if (code) CODE_TO_CANON_SLUG[code] = slug;
}
for (const slug of PROTESTANT_NT_ORDER) {
    const code = BOOK_CODE_MAP[slug];
    if (code) CODE_TO_CANON_SLUG[code] = slug;
}
Object.assign(CODE_TO_CANON_SLUG, {
    TOB: 'tobit', JDT: 'judith', WIS: 'wisdom', SIR: 'sirach', '1MA': '1 maccabees', '2MA': '2 maccabees'
});

const VERSION_BOOK_STRATEGY: Record<string, 'nt-only' | 'local-files' | 'protestant66'> = {
    CHEROKEE: 'nt-only',
    KALENJIN: 'nt-only',
    EKEGUSII: 'local-files'
};

function slugToUsfm(slug: string): string | null {
    return BOOK_CODE_MAP[slug.toLowerCase().trim()] || null;
}

function sortSlugList(slugs: string[], order: readonly string[]): string[] {
    const set = new Set(slugs);
    const ordered = order.filter(s => set.has(s));
    const rest = slugs.filter(s => !ordered.includes(s)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...rest];
}

function partitionOtNt(slugs: string[]): { ot: string[]; nt: string[] } {
    const ot: string[] = [];
    const nt: string[] = [];
    for (const slug of slugs) {
        const code = slugToUsfm(slug);
        if (code && NT_USFM_CODES.has(code)) nt.push(slug);
        else ot.push(slug);
    }
    return {
        ot: sortSlugList(ot, PROTESTANT_OT_ORDER),
        nt: sortSlugList(nt, PROTESTANT_NT_ORDER)
    };
}

function protestant66Grouped(): { ot: string[]; nt: string[] } {
    return { ot: [...PROTESTANT_OT_ORDER], nt: [...PROTESTANT_NT_ORDER] };
}

function ntOnlyGrouped(): { ot: string[]; nt: string[] } {
    return { ot: [], nt: [...PROTESTANT_NT_ORDER] };
}

function booksFromLocalVersionDir(config: BibleVersion): { ot: string[]; nt: string[] } | null {
    if (!config.localDir) return null;
    const rootDir = path.join(__dirname, '..', '..', '..');
    const versionDir = path.join(rootDir, config.localDir);
    if (!fs.existsSync(versionDir)) return null;

    const codes = new Set<string>();
    for (const f of fs.readdirSync(versionDir)) {
        if (!f.endsWith('_read.txt')) continue;
        const m = f.match(/_([A-Z0-9]{3})_(\d+)_read\.txt$/);
        if (m) codes.add(m[1]);
    }

    const slugs: string[] = [];
    for (const c of codes) {
        const slug = CODE_TO_CANON_SLUG[c];
        if (slug) slugs.push(slug);
    }
    return partitionOtNt(slugs);
}

function getBooksGroupedForVersion(versionId: string, config: BibleVersion): { ot: string[]; nt: string[] } {
    const strategy = VERSION_BOOK_STRATEGY[versionId] || 'protestant66';

    if (strategy === 'nt-only') {
        return ntOnlyGrouped();
    }
    if (strategy === 'local-files') {
        const scanned = booksFromLocalVersionDir(config);
        if (scanned && (scanned.ot.length + scanned.nt.length > 0)) {
            return scanned;
        }
        console.warn(`[books] Local scan empty or missing for ${versionId}; falling back to Protestant 66`);
    }
    return protestant66Grouped();
}

// ============================================================
// Native Book Name Mappings (for non-English versions)
// ============================================================
const NATIVE_BOOK_NAMES: Record<string, Record<string, string>> = {
    swa: { // Swahili
        'genesis': 'Mwanzo', 'exodus': 'Kutoka', 'leviticus': 'Mambo ya Walawi',
        'numbers': 'Hesabu', 'deuteronomy': 'Kumbukumbu la Torati',
        'joshua': 'Yoshua', 'judges': 'Waamuzi', 'ruth': 'Ruthu',
        '1 samuel': '1 Samweli', '2 samuel': '2 Samweli',
        '1 kings': '1 Wafalme', '2 kings': '2 Wafalme',
        '1 chronicles': '1 Mambo ya Nyakati', '2 chronicles': '2 Mambo ya Nyakati',
        'ezra': 'Ezra', 'nehemiah': 'Nehemia', 'esther': 'Esta',
        'job': 'Ayubu', 'psalm': 'Zaburi', 'psalms': 'Zaburi',
        'proverbs': 'Mithali', 'ecclesiastes': 'Mhubiri',
        'song of solomon': 'Wimbo Ulio Bora', 'song of songs': 'Wimbo Ulio Bora',
        'isaiah': 'Isaya', 'jeremiah': 'Yeremia', 'lamentations': 'Maombolezo',
        'ezekiel': 'Ezekieli', 'daniel': 'Danieli',
        'hosea': 'Hosea', 'joel': 'Yoeli', 'amos': 'Amosi',
        'obadiah': 'Obadia', 'jonah': 'Yona', 'micah': 'Mika',
        'nahum': 'Nahumu', 'habakkuk': 'Habakuki', 'zephaniah': 'Sefania',
        'haggai': 'Hagai', 'zechariah': 'Zekaria', 'malachi': 'Malaki',
        'matthew': 'Mathayo', 'mark': 'Marko', 'luke': 'Luka', 'john': 'Yohana',
        'acts': 'Matendo ya Mitume', 'romans': 'Warumi',
        '1 corinthians': '1 Wakorintho', '2 corinthians': '2 Wakorintho',
        'galatians': 'Wagalatia', 'ephesians': 'Waefeso',
        'philippians': 'Wafilipi', 'colossians': 'Wakolosai',
        '1 thessalonians': '1 Wathesalonike', '2 thessalonians': '2 Wathesalonike',
        '1 timothy': '1 Timotheo', '2 timothy': '2 Timotheo',
        'titus': 'Tito', 'philemon': 'Filemoni', 'hebrews': 'Waebrania',
        'james': 'Yakobo', '1 peter': '1 Petro', '2 peter': '2 Petro',
        '1 john': '1 Yohana', '2 john': '2 Yohana', '3 john': '3 Yohana',
        'jude': 'Yuda', 'revelation': 'Ufunuo'
    },
    amh: { // Amharic
        'genesis': 'ኦሪት ዘፍጥረት', 'exodus': 'ኦሪት ዘጸአት', 'leviticus': 'ኦሪት ዘሌዋውያን',
        'numbers': 'ኦሪት ዘኍልቍ', 'deuteronomy': 'ኦሪት ዘዳግም',
        'joshua': 'መጽሐፈ ኢያሱ', 'judges': 'መጽሐፈ መሳፍንት', 'ruth': 'መጽሐፈ ሩት',
        '1 samuel': '1 ሳሙኤል', '2 samuel': '2 ሳሙኤል',
        '1 kings': '1 ነገሥት', '2 kings': '2 ነገሥት',
        'psalm': 'መዝሙረ ዳዊት', 'psalms': 'መዝሙረ ዳዊት',
        'proverbs': 'መጽሐፈ ምሳሌ', 'isaiah': 'ኢሳይያስ',
        'matthew': 'የማቴዎስ ወንጌል', 'mark': 'የማርቆስ ወንጌል',
        'luke': 'የሉቃስ ወንጌል', 'john': 'የዮሐንስ ወንጌል',
        'acts': 'የሐዋርያት ሥራ', 'romans': 'ወደ ሮሜ ሰዎች',
        'revelation': 'የዮሐንስ ራእይ'
    },
    luo: { // Dholuo
        'genesis': 'Chakruok', 'exodus': 'Wuok', 'matthew': 'Mathayo',
        'mark': 'Mariko', 'luke': 'Luka', 'john': 'Johana',
        'acts': 'Tich Joote', 'romans': 'Jo-Rumi', 'revelation': 'Fweny'
    },
    kik: { // Kikuyu
        'genesis': 'Kĩambĩrĩria', 'exodus': 'Gũthiĩ', 'matthew': 'Mathayo',
        'mark': 'Mariko', 'luke': 'Luka', 'john': 'Johana',
        'acts': 'Atũmwo', 'romans': 'Aroma', 'revelation': 'Gũcũũrĩrio'
    },
    sxb: { // Suba
        'matthew': 'Mathaayo', 'mark': 'Mariiko', 'luke': 'Luuka', 'john': 'Yowaana',
        'acts': 'Awatumwa', 'romans': 'Awaruumi', '1 corinthians': '1 Awakorintho',
        '2 corinthians': '2 Awakorintho', 'galatians': 'Awagalatia', 'ephesians': 'Awaefeeso',
        'philippians': 'Awafiliipi', 'colossians': 'Awakolosaai', '1 thessalonians': '1 Awathesaloniika',
        '2 thessalonians': '2 Awathesaloniika', '1 timothy': '1 Timotheeo', '2 timothy': '2 Timotheeo',
        'titus': 'Tiito', 'philemon': 'Filemooni', 'hebrews': 'Awaibrania', 'james': 'Yakoobo',
        '1 peter': '1 Petro', '2 peter': '2 Petro', '1 john': '1 Yowaana', '2 john': '2 Yowaana',
        '3 john': '3 Yowaana', 'jude': 'Yuuda', 'revelation': 'Owusasuko'
    },
    por: { // Portuguese
        'genesis': 'Gênesis', 'exodus': 'Êxodo', 'leviticus': 'Levítico',
        'numbers': 'Números', 'deuteronomy': 'Deuteronômio',
        'joshua': 'Josué', 'judges': 'Juízes', 'ruth': 'Rute',
        '1 samuel': '1 Samuel', '2 samuel': '2 Samuel',
        '1 kings': '1 Reis', '2 kings': '2 Reis',
        '1 chronicles': '1 Crônicas', '2 chronicles': '2 Crônicas',
        'ezra': 'Esdras', 'nehemiah': 'Neemias', 'esther': 'Ester',
        'job': 'Jó', 'psalms': 'Salmos', 'proverbs': 'Provérbios',
        'ecclesiastes': 'Eclesiastes', 'song of solomon': 'Cânticos',
        'isaiah': 'Isaías', 'jeremiah': 'Jeremias', 'lamentations': 'Lamentações',
        'ezekiel': 'Ezequiel', 'daniel': 'Daniel',
        'hosea': 'Oseias', 'joel': 'Joel', 'amos': 'Amós',
        'obadiah': 'Obadias', 'jonah': 'Jonas', 'micah': 'Miqueias',
        'nahum': 'Naum', 'habakkuk': 'Habacuque', 'zephaniah': 'Sofonias',
        'haggai': 'Ageu', 'zechariah': 'Zacarias', 'malachi': 'Malaquias',
        'matthew': 'Mateus', 'mark': 'Marcos', 'luke': 'Lucas', 'john': 'João',
        'acts': 'Atos', 'romans': 'Romanos',
        '1 corinthians': '1 Coríntios', '2 corinthians': '2 Coríntios',
        'galatians': 'Gálatas', 'ephesians': 'Efésios',
        'philippians': 'Filipenses', 'colossians': 'Colossenses',
        '1 thessalonians': '1 Tessalonicenses', '2 thessalonians': '2 Tessalonicenses',
        '1 timothy': '1 Timóteo', '2 timothy': '2 Timóteo',
        'titus': 'Tito', 'philemon': 'Filemom', 'hebrews': 'Hebreus',
        'james': 'Tiago', '1 peter': '1 Pedro', '2 peter': '2 Pedro',
        '1 john': '1 João', '2 john': '2 João', '3 john': '3 João',
        'jude': 'Judas', 'revelation': 'Apocalipse'
    },
    chr: { // Cherokee
        'genesis': 'ᏗᏓᎴᏅᎲ', 'exodus': 'ᏗᏄᎪᎬ', 'psalms': 'ᏗᎧᏃᎩᏛ', 'proverbs': 'ᎠᎧᏁᎢᏍᏗ', 'matthew': 'ᎹᏚ', 'mark': 'ᎹᎩ', 
        'luke': 'ᎷᎦ', 'john': 'ᏣᏂ', 'acts': 'ᎨᏥᏅᏏᏛ', 'romans': 'ᎶᎻᏱ ᎠᏁᎯ', 
        '1 corinthians': 'ᎪᎵᏂᏗᏱ ᎠᏁᎯ ᎢᎬᏱᏱ', '2 corinthians': 'ᎪᎵᏂᏗᏱ ᎠᏁᎯ ᏔᎵᏁ', 
        'jude': 'ᏧᏓᏏ', 'revelation': 'ᎠᏥᎾᏄᎪᏫᏎᎸᎢ'
    },
    guz: { // Ekegusii
        'genesis': 'Omochakano', 'exodus': 'Exodus', 'leviticus': 'Lawi',
        'numbers': 'Okobara', 'deuteronomy': 'Deuteronomy',
        'joshua': 'Yoshua', 'judges': 'Omogambia', 'ruth': 'Ruthu',
        '1 samuel': '1 Samwel', '2 samuel': '2 Samwel',
        '1 kings': '1 Abaruoti', '2 kings': '2 Abaruoti',
        '1 chronicles': '1 Chronicles', '2 chronicles': '2 Chronicles',
        'ezra': 'Ezra', 'nehemiah': 'Nehemia', 'esther': 'Esther',
        'job': 'Ayubu', 'psalms': 'Zaburi', 'proverbs': 'Nainwe',
        'ecclesiastes': 'Ecclesiastes', 'song of solomon': 'Ogotera kwa Sulemani',
        'isaiah': 'Isaya', 'jeremiah': 'Yeremia', 'lamentations': 'Okorera Yeremia',
        'ezekiel': 'Ezekieli', 'daniel': 'Danieli',
        'hosea': 'Hosea', 'joel': 'Yoel', 'amos': 'Amos',
        'obadiah': 'Obadia', 'jonah': 'Yona', 'micah': 'Mika',
        'nahum': 'Nahum', 'habakkuk': 'Habakkuk', 'zephaniah': 'Zefania',
        'haggai': 'Haggai', 'zechariah': 'Zakaria', 'malachi': 'Malaki',
        'matthew': 'Mathayo', 'mark': 'Mariko', 'luke': 'Luka', 'john': 'Yohana',
        'acts': 'Ogokora', 'romans': 'AbaRumi',
        '1 corinthians': '1 AbaKorintho', '2 corinthians': '2 AbaKorintho',
        'galatians': 'AbaGalatia', 'ephesians': 'AbaEfeso',
        'philippians': 'AbaFilipi', 'colossians': 'AbaKolosai',
        '1 thessalonians': '1 AbaThesaloniki', '2 thessalonians': '2 AbaThesaloniki',
        '1 timothy': '1 Timotheo', '2 timothy': '2 Timotheo',
        'titus': 'Tito', 'philemon': 'Filemon', 'hebrews': 'AbaIbirania',
        'james': 'Yakobo', '1 peter': '1 Petero', '2 peter': '2 Petero',
        '1 john': '1 Yohana', '2 john': '2 Yohana', '3 john': '3 Yohana',
        'jude': 'Yuda', 'revelation': 'Okomanoka'
    },
    kam: { // Kamba
        'genesis': 'Kũambĩlĩlya', 'exodus': 'Kũtũma', 'leviticus': 'Alawĩ', 'numbers': 'Mũthasyo',
        'deuteronomy': 'Kũtiuluka', 'joshua': 'Yosua', 'judges': 'Alĩsili', 'ruth': 'Luti',
        '1 samuel': '1 Samũeli', '2 samuel': '2 Samũeli', '1 kings': '1 Asumbĩ', '2 kings': '2 Asumbĩ',
        '1 chronicles': '1 Syalika', '2 chronicles': '2 Syalika', 'ezra': 'Esela', 'nehemiah': 'Neemia',
        'esther': 'Esita', 'job': 'Yovu', 'psalms': 'Mbathi', 'proverbs': 'Nthimo',
        'ecclesiastes': 'Mũtavanyya', 'song of solomon': 'Wĩmbo wa Suleimani', 'isaiah': 'Isaia',
        'jeremiah': 'Yelemia', 'lamentations': 'Makuĩlo', 'ezekiel': 'Esekieli', 'daniel': 'Ndaniele',
        'hosea': 'Hosea', 'joel': 'Yoeli', 'amos': 'Amosi', 'obadiah': 'Obadia', 'jonah': 'Yona',
        'micah': 'Mika', 'nahum': 'Nahumu', 'habakkuk': 'Hapakuki', 'zephaniah': 'Sefania',
        'haggai': 'Hagai', 'zechariah': 'Sekalia', 'malachi': 'Malaki',
        'matthew': 'Mathayo', 'mark': 'Mako', 'luke': 'Luka', 'john': 'Yoana', 'acts': 'Atũmwa',
        'romans': 'Alumi', '1 corinthians': '1 Akolintho', '2 corinthians': '2 Akolintho',
        'galatians': 'Akalatia', 'ephesians': 'Aefeso', 'philippians': 'Afilipi', 'colossians': 'Akolosai',
        '1 thessalonians': '1 Athesalonike', '2 thessalonians': '2 Athesalonike', '1 timothy': '1 Timotheo',
        '2 timothy': '2 Timotheo', 'titus': 'Tito', 'philemon': 'Filemoni', 'hebrews': 'Ahibulu',
        'james': 'Yakovo', '1 peter': '1 Petelo', '2 peter': '2 Petelo', '1 john': '1 Yoana',
        '2 john': '2 Yoana', '3 john': '3 Yoana', 'jude': 'Yuta', 'revelation': 'Ũvuany\'o'
    },
    mer: { // Meru
        'genesis': 'Kiambiriria', 'exodus': 'Ku.', 'leviticus': 'Levi', 'numbers': 'Gu.',
        'deuteronomy': 'Kuriikanithia Maathana', 'joshua': 'Joshua', 'judges': 'Aar.', 'ruth': 'Rutu',
        '1 samuel': '1 Samweli', '2 samuel': '2 Samweli', '1 kings': '1 Kings', '2 kings': '2 Kings',
        '1 chronicles': '1 Kronika', '2 chronicles': '2 Kronika', 'ezra': 'Ezra', 'nehemiah': 'Nehemia',
        'esther': 'Esther', 'job': 'Ayubu', 'psalms': 'Zaburi', 'proverbs': 'Njuno',
        'ecclesiastes': 'Mu.', 'song of solomon': 'Solomoni', 'isaiah': 'Isaya', 'jeremiah': 'Jeremia',
        'lamentations': 'Kiriro Jeremia', 'ezekiel': 'Ezekieli', 'daniel': 'Danieli', 'hosea': 'Hosea',
        'joel': 'Joweli', 'amos': 'Amosi', 'obadiah': 'Obadia', 'jonah': 'Jona', 'micah': 'Mika',
        'nahum': 'Nahumu', 'habakkuk': 'Habakuku', 'zephaniah': 'Zefania', 'haggai': 'Hagai',
        'zechariah': 'Zekaria', 'malachi': 'Malaki',
        'matthew': 'Mathayo', 'mark': 'Maariko', 'luke': 'Luka', 'john': 'Johana', 'acts': 'Mathithio',
        'romans': 'ARoma', '1 corinthians': '1 Korintho', '2 corinthians': '2 Korintho',
        'galatians': 'AGalatia', 'ephesians': 'AEfeso', 'philippians': 'AFilipi', 'colossians': 'AKolosai',
        '1 thessalonians': '1 AThesalonike', '2 thessalonians': '2 AThesalonike', '1 timothy': '1 Timotheo',
        '2 timothy': '2 Timotheo', 'titus': 'Tito', 'philemon': 'Filemoni', 'hebrews': 'AHibirania',
        'james': 'Jakobu', '1 peter': '1 Peterû', '2 peter': '2 Peterû', '1 john': '1 Johana',
        '2 john': '2 Johana', '3 john': '3 Johana', 'jude': 'Juda', 'revelation': 'Kûguûrîrwa'
    },
    mas: { // Maasai
        'genesis': 'Enkiterunoto', 'exodus': 'Enaidurra', 'leviticus': 'Ilawi', 'numbers': 'Enkikena',
        'deuteronomy': 'Enkigilata oo Nkitanapat', 'joshua': 'Yoshua', 'judges': 'Ilarishak', 'ruth': 'Rusi',
        '1 samuel': '1 Samuel', '2 samuel': '2 Samuel', '1 kings': '1 Ilaiguanak', '2 kings': '2 Ilaiguanak',
        '1 chronicles': '1 Intepen', '2 chronicles': '2 Intepen', 'ezra': 'Esra', 'nehemiah': 'Nehemia',
        'esther': 'Esta', 'job': 'Yoab', 'psalms': 'Olkerempe le Nkai', 'proverbs': 'Ndung\'eta e Rashe',
        'ecclesiastes': 'Olaikooni', 'song of solomon': 'Osinkolio le Solomon', 'isaiah': 'Isaya',
        'jeremiah': 'Yeremia', 'lamentations': 'Nkishirat', 'ezekiel': 'Esekiel', 'daniel': 'Daniel',
        'hosea': 'Hosea', 'joel': 'Yoel', 'amos': 'Amos', 'obadiah': 'Obadia', 'jonah': 'Yona',
        'micah': 'Mika', 'nahum': 'Nahum', 'habakkuk': 'Habakuki', 'zephaniah': 'Sefania',
        'haggai': 'Hagai', 'zechariah': 'Sakaria', 'malachi': 'Malaki',
        'matthew': 'Matayo', 'mark': 'Marko', 'luke': 'Luka', 'john': 'Yohana', 'acts': 'Iasat',
        'romans': 'Iroma', '1 corinthians': '1 Ilkorintio', '2 corinthians': '2 Ilkorintio',
        'galatians': 'Ilgalatia', 'ephesians': 'Ile Efeso', 'philippians': 'Ilfilipi', 'colossians': 'Ilkolosai',
        '1 thessalonians': '1 Ilsesalonike', '2 thessalonians': '2 Ilsesalonike', '1 timothy': '1 Timoteo',
        '2 timothy': '2 Timoteo', 'titus': 'Tito', 'philemon': 'Filimon', 'hebrews': 'Ilhebrania',
        'james': 'Yakobo', '1 peter': '1 Petero', '2 peter': '2 Petero', '1 john': '1 Yohana',
        '2 john': '2 Yohana', '3 john': '3 Yohana', 'jude': 'Yuda', 'revelation': 'Embolunoto'
    },
    kln: { // Kalenjin
        'genesis': 'Taunet', 'exodus': 'Exodus', 'leviticus': 'Atebetab Lawik', 'numbers': 'Koitetab',
        'deuteronomy': 'Ne Kibwate Ng\'atutik', 'joshua': 'Josua', 'judges': 'Kirougik', 'ruth': 'Ruth',
        '1 samuel': '1 Samuel', '2 samuel': '2 Samuel', '1 kings': '1 Laitorinik', '2 kings': '2 Laitorinik',
        '1 chronicles': '1 Chronicles', '2 chronicles': '2 Chronicles', 'ezra': 'Esra', 'nehemiah': 'Nehemia',
        'esther': 'Ester', 'job': 'Job', 'psalms': 'Tiendab Kalosunet', 'proverbs': 'Kalewwnaik',
        'ecclesiastes': 'Ecclesiastes', 'song of solomon': 'Solomon', 'isaiah': 'Isaia', 'jeremiah': 'Jeremia',
        'lamentations': 'Rirekab Jeremia', 'ezekiel': 'Esekiel', 'daniel': 'Daniel', 'hosea': 'Hosea',
        'joel': 'Joel', 'amos': 'Amos', 'obadiah': 'Obadia', 'jonah': 'Jona', 'micah': 'Mika',
        'nahum': 'Nahum', 'habakkuk': 'Habakuk', 'zephaniah': 'Sepania', 'haggai': 'Hagai',
        'zechariah': 'Sakaria', 'malachi': 'Malaki',
        'matthew': 'Mataayo', 'mark': 'Māārkō', 'luke': 'Luuka', 'john': 'Yoowaana', 'acts': 'Yēyuutēk',
        'romans': 'Roomeek', '1 corinthians': '1 Kōōriintēēk', '2 corinthians': '2 Kōōriintēēk',
        'galatians': 'Kalatyeek', 'ephesians': 'Ēfēēsēēk', 'philippians': 'Filibiik', 'colossians': 'Kolosaayeek',
        '1 thessalonians': '1 Tēēsālōōnikēēk', '2 thessalonians': '2 Tēēsālōōnikēēk', '1 timothy': '1 Tēmētēēwō',
        '2 timothy': '2 Tēmētēēwō', 'titus': 'Tiitō', 'philemon': 'Filēmōōn', 'hebrews': 'Iburaneek',
        'james': 'Yāākōbō', '1 peter': '1 Bētērō', '2 peter': '2 Bētērō', '1 john': '1 Yoowaana',
        '2 john': '2 Yoowaana', '3 john': '3 Yoowaana', 'jude': 'Yuuta', 'revelation': 'Ng\'oong\'uutyēēt'
    },
    ebu: { // Embu
        'genesis': 'Kiamiriria', 'exodus': 'Kiuma', 'matthew': 'Mathayo', 'mark': 'Mariko', 'luke': 'Luka',
        'john': 'Johana', 'acts': 'Atumwa a Atumintwi', 'romans': 'Aroomi', '1 corinthians': '1 Akorintho',
        '2 corinthians': '2 Akorintho', 'galatians': 'Agalatia', 'ephesians': 'Aefeso', 'philippians': 'Afilipi',
        'colossians': 'Akolosai', '1 thessalonians': '1 Athetessalonike', '2 thessalonians': '2 Athetessalonike',
        '1 timothy': '1 Timotheo', '2 timothy': '2 Timotheo', 'titus': 'Tito', 'philemon': 'Filemoni',
        'hebrews': 'Ahibirania', 'james': 'Jakubu', '1 peter': '1 Petero', '2 peter': '2 Petero',
        '1 john': '1 Johana', '2 john': '2 Johana', '3 john': '3 Johana', 'jude': 'Juda', 'revelation': 'Kuumurirwa'
    }
};

const REVERSE_NATIVE_MAP: Record<string, string> = {};
for (const langMap of Object.values(NATIVE_BOOK_NAMES)) {
    for (const [eng, native] of Object.entries(langMap)) {
        REVERSE_NATIVE_MAP[native.toLowerCase().trim()] = eng;
    }
}
const SORTED_NATIVE_KEYS = Object.keys(REVERSE_NATIVE_MAP).sort((a, b) => b.length - a.length);

function translateNativeQueryToEnglish(query: string): string {
    let q = query.trim();
    for (const nativeName of SORTED_NATIVE_KEYS) {
        // Match the native name at the start, followed by space, a digit, or end of string.
        const regex = new RegExp(`^${nativeName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s+|\\d|$)`, 'i');
        if (regex.test(q)) {
            q = q.replace(new RegExp(`^${nativeName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'i'), REVERSE_NATIVE_MAP[nativeName]);
            break;
        }
    }
    return q;
}

function translateNativeBookName(bookName: string): string {
    const key = bookName.toLowerCase().trim();
    if (REVERSE_NATIVE_MAP[key]) {
        return REVERSE_NATIVE_MAP[key];
    }
    return bookName;
}

function titleCaseEnglishSlug(slug: string): string {
    return slug.split(/\s+/).filter(Boolean).map(w => (/^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

function getNativeBookName(bookName: string, languageCode: string): string {
    const slug = bookName.toLowerCase().trim();
    const map = NATIVE_BOOK_NAMES[languageCode];
    if (map && map[slug]) return map[slug];
    if (map) return bookName;
    return titleCaseEnglishSlug(slug);
}

/** Lowercase English slug for BOOK_CODE_MAP / APIs (native labels → English via reverse map). */
function canonEnglishBookSlug(bookLabel: string): string {
    return translateNativeBookName(bookLabel.trim()).toLowerCase().trim();
}

function getBookCode(bookName: string): string | null {
    const key = bookName.toLowerCase().trim();
    return BOOK_CODE_MAP[key] || null;
}

// ============================================================
// API Route: GET /versions — List all available Bible versions
// ============================================================
router.get('/versions', (_req: Request, res: Response) => {
    const versions = Object.values(BIBLE_VERSIONS)
        .filter(v => v.available)
        .map(v => ({
            id: v.id,
            name: v.name,
            language: v.language,
            languageCode: v.languageCode,
            source: v.source,
            available: v.available,
            copyright: v.copyright,
        }));

    // Group by language for convenience
    const byLanguage: Record<string, typeof versions> = {};
    versions.forEach(v => {
        if (!byLanguage[v.language]) byLanguage[v.language] = [];
        byLanguage[v.language].push(v);
    });

    return res.json({ versions, byLanguage });
});

// ============================================================
// API Route: GET /books/:versionId — Books available for a version (OT / NT)
// ============================================================
router.get('/books/:versionId', (req: Request, res: Response) => {
    const raw = (req.params.versionId || '').trim();
    const id = raw.toUpperCase();
    const config = BIBLE_VERSIONS[id];
    if (!config || !config.available) {
        return res.status(404).json({ error: `Bible version "${raw}" not found` });
    }
    const grouped = getBooksGroupedForVersion(id, config);
    return res.json({
        version: id,
        source: config.source,
        ot: grouped.ot,
        nt: grouped.nt
    });
});

// ============================================================
// API Route: GET /book-names — Get all unique book names (English + Native)
// ============================================================
router.get('/all-book-names', (_req: Request, res: Response) => {
    const allNames = new Set<string>();
    
    // Add English names
    Object.keys(BOOK_CODE_MAP).forEach(name => allNames.add(name.toLowerCase()));
    
    // Add all native names
    Object.values(NATIVE_BOOK_NAMES).forEach(langMap => {
        Object.values(langMap).forEach(name => allNames.add(name.toLowerCase()));
    });

    return res.json({ names: Array.from(allNames) });
});

// ============================================================
// API Route: GET /book-names/:languageCode — Get native book names
// ============================================================
// Combined duplicate route into the one below
// ============================================================

// ============================================================
// API Route: GET /passage — Fetch a Bible passage (real data)
// ============================================================
router.get('/passage', async (req: Request, res: Response) => {
    const { version, book, chapter = '1', verse, verseEnd: rawVerseEnd } = req.query as Record<string, string>;

    // Sanitize verseEnd — strip anything after a colon (e.g. "18:1" → "18")
    const verseEnd = rawVerseEnd ? rawVerseEnd.split(':')[0].trim() : undefined;

    if (!version || !book) {
        return res.status(400).json({ error: 'Missing parameters: version and book required' });
    }

    const versionConfig = BIBLE_VERSIONS[version.toUpperCase()];
    if (!versionConfig) {
        return res.status(404).json({ error: `Bible version "${version}" not found`, availableVersions: Object.keys(BIBLE_VERSIONS) });
    }

    try {
        let result;
        const translatedBook = translateNativeBookName(book);
        console.log(`[passage] Request: ${version} ${book} ${chapter}:${verse || 'all'}${verseEnd ? '-' + verseEnd : ''} -> Translated: ${translatedBook}`);

        if (versionConfig.source === 'pdf-only') {
            return res.json({
                version: versionConfig.id,
                versionName: versionConfig.name,
                book: translatedBook,
                chapter: parseInt(chapter),
                reference: `${book} ${chapter}${verse ? ':' + verse : ''}${verseEnd ? '-' + verseEnd : ''}`,
                text: `This version is available as a high-fidelity PDF document. Click the button below to view the full Bible in ${versionConfig.language}.`,
                verses: [{ number: 1, text: `This version is available as a high-fidelity PDF document.` }],
                pdfPath: versionConfig.pdfPath,
                source: 'pdf-only'
            });
        }

        const controller = new AbortController();

        if (versionConfig.source === 'bible-api') {
            result = await fetchFromBibleApi(versionConfig, translatedBook, chapter, verse, verseEnd, controller.signal);
        } else if (versionConfig.source === 'helloao') {
            result = await fetchFromHelloAo(versionConfig, translatedBook, chapter, verse, verseEnd, controller.signal);
        } else if (versionConfig.source === 'local-text') {
            result = await fetchFromLocalText(versionConfig, translatedBook, chapter, verse, verseEnd);
        } else {
            return res.status(400).json({ error: 'Passage fetch not supported for this version type' });
        }

        return res.json({ 
            ...result, 
            pdfPath: versionConfig.pdfPath,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error(`Error fetching passage [${version} ${book} ${chapter}:${verse || 'all'}]:`, error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch passage', 
            details: error.message,
            version,
            reference: `${book} ${chapter}:${verse || 'all'}`
        });
    }
});

// ============================================================
// Search Helper: Reference-First Architecture
// ============================================================
const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'from', 'by', 'for', 'with', 'in', 'on', 'to', 'of', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'we', 'us', 'our', 'ours', 'they', 'them', 'their', 'theirs']);

// ============================================================
// Broad Search: Keyword-based discovery for imperfect queries
// Falls back here when exact search returns 0 results.
// ============================================================
async function performBroadSearch(query: string, signal?: AbortSignal) {
    const cleanQuery = query.replace(/["']/g, ' ').replace(/[,./';"\\]/g, " ").replace(/\s{2,}/g," ").trim();
    const words = cleanQuery.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
    
    if (words.length === 0) return [];

    // Strategy 0: Direct Common Misquote Overrides (Instant)
    const qLower = query.toLowerCase();
    const overrides: Record<string, any[]> = {
        'people perish': [{ book: "Hosea", chapter: "4", verses: [6] }, { book: "Proverbs", chapter: "29", verses: [18] }],
        'lack of knowledge': [{ book: "Hosea", chapter: "4", verses: [6] }],
        'ignorant of his devices': [{ book: "2 Corinthians", chapter: "2", verses: [11] }],
        'be aware of the devices': [{ book: "2 Corinthians", chapter: "2", verses: [11] }],
        'beware of the devices': [{ book: "2 Corinthians", chapter: "2", verses: [11] }],
        'devices of the enemy': [{ book: "2 Corinthians", chapter: "2", verses: [11] }],
        'no vision people perish': [{ book: "Proverbs", chapter: "29", verses: [18] }]
    };

    for (const [phrase, refs] of Object.entries(overrides)) {
        if (qLower.includes(phrase)) {
            console.log(`[Search] Instant override triggered for: "${phrase}"`);
            return refs;
        }
    }
    
    const broadQuery = words.join(' ');
    console.log(`[Broad Search] Attempting all-keywords match: "${broadQuery}"`);
    
    let groupedRefs = await fetchAndGroup(`https://api.biblesupersearch.com/api?bible=kjv&search=${encodeURIComponent(broadQuery)}&search_type=all_words`, signal);
    if (groupedRefs.length > 0) return groupedRefs;

    // Phase 2: Combination Search for misquotes (e.g. "people perish" + "people lack")
    console.log(`[Broad Search] Attempting keyword combinations for: "${broadQuery}"`);
    try {
        const combos = [];
        if (words.length >= 3) {
            combos.push(words.slice(0, 2).join(' ')); // e.g. "people perish"
            combos.push([words[0], words[words.length-1]].join(' ')); // e.g. "people lack"
            combos.push(words.slice(1).join(' ')); // e.g. "perish lack"
        } else if (words.length === 2) {
            combos.push(words.join(' '));
        }

        const resultsPromises = combos.map(combo => 
            fetch(`https://api.biblesupersearch.com/api?bible=kjv&search=${encodeURIComponent(combo)}&search_type=all_words&limit=5`, { signal })
                .then(r => r.json())
                .catch(() => ({ results: [] }))
        );

        const allComboData = await Promise.all(resultsPromises);
        const combinedResults = allComboData.flatMap(data => data.results || []);
        
        if (combinedResults.length > 0) {
            return groupRawResults(combinedResults);
        }
    } catch (e) {
        console.error("[Broad Search] Combination search error:", e);
    }

    return [];
}

function groupRawResults(results: any[]) {
    const groupedRefs: Record<string, { book: string, chapter: string, verses: number[] }> = {};
    results.forEach((result: any) => {
        const bookName = result.book_name;
        const cv = result.chapter_verse.split(':');
        const chapter = cv[0];
        const verse = parseInt(cv[1]);
        const groupKey = `${bookName}-${chapter}`;
        if (!groupedRefs[groupKey]) {
            groupedRefs[groupKey] = { book: bookName, chapter, verses: [] };
        }
        if (!groupedRefs[groupKey].verses.includes(verse)) {
            groupedRefs[groupKey].verses.push(verse);
        }
    });
    return Object.values(groupedRefs);
}

async function fetchAndGroup(url: string, signal?: AbortSignal) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { signal: signal || controller.signal });
        clearTimeout(timeout);
        if (!response.ok) return [];
        const data = await response.json();
        if (!data.results || !Array.isArray(data.results)) return [];
        
        const groupedRefs: Record<string, { book: string, chapter: string, verses: number[] }> = {};
        data.results.forEach((result: any) => {
            const bookName = result.book_name;
            const cv = result.chapter_verse.split(':');
            const chapter = cv[0];
            const verse = parseInt(cv[1]);
            const groupKey = `${bookName}-${chapter}`;
            if (!groupedRefs[groupKey]) {
                groupedRefs[groupKey] = { book: bookName, chapter, verses: [] };
            }
            if (!groupedRefs[groupKey].verses.includes(verse)) {
                groupedRefs[groupKey].verses.push(verse);
            }
        });
        return Object.values(groupedRefs);
    } catch (e) {
        clearTimeout(timeout);
        return [];
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function performReferenceSearch(query: string, signal?: AbortSignal) {
    const translatedQuery = translateNativeQueryToEnglish(query);
    const isPhraseSearch = /["']/.test(translatedQuery);
    
    // Clean and normalize the query
    let cleanQuery = translatedQuery
        .replace(/[()]/g, " ")
        .replace(/[,./';"\\]/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
        
    if (!isPhraseSearch) {
        const words = cleanQuery.split(' ');
        const keywords = words.filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
        if (keywords.length > 0) {
            cleanQuery = keywords.join(' ');
        }
    }
        
    const searchType = isPhraseSearch ? "phrase" : "all_words";
    const url = `https://api.biblesupersearch.com/api?bible=kjv&search=${encodeURIComponent(cleanQuery)}&search_type=${searchType}`;
    
    console.log(`[Search] BibleSuperSearch: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { signal: signal || controller.signal });
        clearTimeout(timeout);
        if (!response.ok) return [];
        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) return [];
        
        const groupedRefs: Record<string, { book: string, chapter: string, verses: number[], kjvTexts: Record<number, string> }> = {};
        const resultsToProcess = data.results;
        
        resultsToProcess.forEach((result: any) => {
            const bookName = result.book_name;
            const cv = result.chapter_verse.split(':');
            const chapter = cv[0];
            const verse = parseInt(cv[1]);
            
            const groupKey = `${bookName}-${chapter}`;
            if (!groupedRefs[groupKey]) {
                groupedRefs[groupKey] = { book: bookName, chapter, verses: [], kjvTexts: {} };
            }
            if (!groupedRefs[groupKey].verses.includes(verse)) {
                groupedRefs[groupKey].verses.push(verse);
                
                // Extract KJV text if available
                try {
                    const text = result.verses?.kjv?.[chapter]?.[verse]?.text;
                    if (text) groupedRefs[groupKey].kjvTexts[verse] = text;
                } catch (e) {}
            }
        });
        
        return Object.values(groupedRefs);
    } catch (e) {
        clearTimeout(timeout);
        console.error("SuperSearch error:", e);
        return [];
    }
}

// ============================================================
// Semantic Search: AI-powered meaning-based verse discovery
// Falls back here when exact keyword search returns 0 results.
// Pollinations: keys from https://enter.pollinations.ai — see pollinationsClient.ts / .env.example
// ============================================================
async function performSemanticSearch(query: string): Promise<any[]> {
    const cleanQ = query.replace(/["']/g, ' ').trim();
    const userPrompt = `Identify the Bible verses for: "${cleanQ}". Return ONLY valid JSON with this exact shape: {"verses":[{"book":"...","chapter":1,"verse":1}]}. The "verse" field must always be a number. Use standard English book names.`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const systemPrompt =
            'You are a JSON API. Output ONLY a single JSON object with key "verses" (array). No markdown, no preamble, no reasoning text.';
        let text: string;
        try {
            text = await pollinationsChatText(systemPrompt, userPrompt, {
                jsonObject: true,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        console.log(`[Semantic Search] Response received for: ${query}`);

        let verses: any[] = [];
        try {
            const outer = JSON.parse(text);
            verses = outer.verses;
        } catch {
            const markdownMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
            let jsonStr = markdownMatch ? markdownMatch[1] : null;
            if (!jsonStr) {
                const start = text.indexOf('[');
                const end = text.lastIndexOf(']');
                if (start !== -1 && end !== -1 && end > start) {
                    jsonStr = text.substring(start, end + 1);
                }
            }
            if (!jsonStr) {
                console.error('[Semantic Search] No JSON found in AI response.');
                return [];
            }
            try {
                verses = JSON.parse(jsonStr);
            } catch {
                const matches = jsonStr.match(/\{\s*"book"\s*:[\s\S]*?\}\s*/g);
                if (matches) {
                    for (const m of matches) {
                        try {
                            verses.push(JSON.parse(m));
                        } catch {
                            /* skip */
                        }
                    }
                }
            }
        }

        if (!Array.isArray(verses)) {
            if (typeof verses === 'object' && verses !== null) {
                verses = [verses];
            } else {
                return [];
            }
        }

        console.log(`[Semantic Search] AI returned ${verses.length} verse references`);

        const groupedRefs: Record<string, { book: string; chapter: string; verses: number[] }> = {};

        for (const v of verses) {
            if (!v.book || !v.chapter) continue;
            
            const bookName = translateNativeBookName(v.book);
            const groupKey = `${bookName}-${v.chapter}`;
            if (!groupedRefs[groupKey]) {
                groupedRefs[groupKey] = { book: bookName, chapter: v.chapter.toString(), verses: [] };
            }
            
            const verseVal = (v.verse || v.number || "").toString();
            let verseNum = parseInt(verseVal);
            
            // If parseInt failed, try to extract first number found in string
            if (isNaN(verseNum)) {
                const numMatch = verseVal.match(/\d+/);
                if (numMatch) verseNum = parseInt(numMatch[0]);
            }

            // Semantic Fallback: If we still don't have a number, but we have text that looks like a verse reference
            // or if it's a known misquoted verse like Romans 12:2 "renewal of the mind"
            if (isNaN(verseNum)) {
                const text = verseVal.toLowerCase();
                const book = bookName.toLowerCase();
                const chapter = v.chapter.toString();

                if (book.includes('roman') && chapter === '12' && (text.includes('renewal') || text.includes('transformed'))) {
                    verseNum = 2;
                } else if (book.includes('hosea') && chapter === '4' && (text.includes('knowledge') || text.includes('knolwedge') || text.includes('perish') || text.includes('destroyed'))) {
                    verseNum = 6;
                }
            }

            if (!isNaN(verseNum) && !groupedRefs[groupKey].verses.includes(verseNum)) {
                groupedRefs[groupKey].verses.push(verseNum);
            }
        }

        return Object.values(groupedRefs);
    } catch (e: any) {
        console.error('[Semantic Search] Unexpected Error:', e);
        return [];
    }
}

async function fetchVersesFromVersion(versionConfig: BibleVersion, groupedRefs: any[]) {
    const results: any[] = [];
    // Per-version timeout: if a version takes more than 8s total, return what we have
    const VERSION_TIMEOUT = 8000;
    
    // If KJV and we have texts from BibleSuperSearch, use them immediately
    if (versionConfig.id === 'KJV') {
        let allKjvFound = true;
        const kjvResults: any[] = [];
        
        for (const group of groupedRefs) {
            if (group.kjvTexts && Object.keys(group.kjvTexts).length === group.verses.length) {
                const englishSlug = canonEnglishBookSlug(group.book);
                const displayBook = getNativeBookName(englishSlug, versionConfig.languageCode);
                group.verses.forEach((vNum: number) => {
                    kjvResults.push({
                        version: 'KJV',
                        versionCode: 'KJV',
                        versionName: 'King James Version',
                        language: 'English',
                        reference: `${displayBook} ${group.chapter}:${vNum}`,
                        text: group.kjvTexts[vNum],
                        book: englishSlug,
                        nativeBookName: displayBook,
                        chapter: parseInt(group.chapter),
                        verse: vNum,
                        verses: [{
                            book: englishSlug,
                            chapter: parseInt(group.chapter),
                            verse: vNum,
                            text: group.kjvTexts[vNum]
                        }]
                    });
                });
            } else {
                allKjvFound = false;
                break;
            }
        }
        
        if (allKjvFound && kjvResults.length > 0) {
            console.log(`[Search] Using cached KJV results for ${kjvResults.length} verses`);
            return kjvResults;
        }
    }

    // Parallelize fetches with no artificial delay — each fetch has its own timeout
    const fetchPromises = groupedRefs.map(async (group, index) => {
        try {
            const englishSlug = canonEnglishBookSlug(group.book);
            const displayBook = getNativeBookName(englishSlug, versionConfig.languageCode);

            let chapterData;
            let retryCount = 0;
            const maxRetries = 1;

            while (retryCount <= maxRetries) {
                try {
                    if (versionConfig.source === 'bible-api') {
                        chapterData = await fetchFromBibleApi(versionConfig, englishSlug, group.chapter);
                    } else if (versionConfig.source === 'local-text') {
                        chapterData = await fetchFromLocalText(versionConfig, englishSlug, group.chapter);
                    } else if (versionConfig.source === 'helloao') {
                        chapterData = await fetchFromHelloAo(versionConfig, englishSlug, group.chapter);
                    } else {
                        break;
                    }
                    break;
                } catch (e: any) {
                    if (e.message.includes('429') && retryCount < maxRetries) {
                        retryCount++;
                        await sleep(retryCount * 1000);
                        continue;
                    }
                    throw e;
                }
            }
            
            if (!chapterData || !chapterData.verses) return [];

            return chapterData.verses
                .filter((v: any) => group.verses.includes(parseInt(v.number || v.verse)))
                .map((fv: any) => ({
                    version: versionConfig.id,
                    versionCode: versionConfig.id,
                    versionName: versionConfig.name,
                    language: versionConfig.language,
                    reference: `${displayBook} ${group.chapter}:${fv.number || fv.verse}`,
                    text: fv.text,
                    book: englishSlug,
                    nativeBookName: displayBook,
                    chapter: parseInt(group.chapter),
                    verse: parseInt(fv.number || fv.verse),
                    verses: [{
                        book: englishSlug,
                        chapter: parseInt(group.chapter),
                        verse: parseInt(fv.number || fv.verse),
                        text: fv.text
                    }]
                }));
        } catch (e: any) {
            console.warn(`[Search] Skipping ${versionConfig.id} for ${group.book} ${group.chapter}: ${e.message}`);
            return [];
        }
    });

    const nestedResults = await Promise.race([
        Promise.all(fetchPromises),
        new Promise<any[][]>(resolve => setTimeout(() => {
            console.warn(`[Search] Version ${versionConfig.id} timed out after ${VERSION_TIMEOUT}ms`);
            resolve([]);
        }, VERSION_TIMEOUT))
    ]);
    return (nestedResults as any[][]).flat();
}

/**
 * Local Text Fetcher
 * Reads Bible verses from flat text files in Bible_Books
 * Format: guz_NNN_BBB_CC_read.txt (NNN=seq, BBB=book code, CC=chapter)
 */
async function fetchFromLocalText(config: BibleVersion, book: string, chapter: string, verse?: string, verseEnd?: string) {
    if (!config.localDir) throw new Error("Local directory not specified for version " + config.id);

    const bookCode = getBookCode(book);
    if (!bookCode) throw new Error("Unknown book: " + book);

    // Path to the version directory
    // Note: __dirname is in src/routes/api, so we go up 3 levels to reach project root
    const rootDir = path.join(__dirname, '..', '..', '..');
    const versionDir = path.join(rootDir, config.localDir);

    if (!fs.existsSync(versionDir)) {
        throw new Error(`Local directory not found: ${versionDir}`);
    }

    // Find the file: guz_NNN_BBB_CC_read.txt
    // Some books use 2-digit padding (GEN_01), others use 3-digit (PSA_023)
    const pad2 = chapter.padStart(2, '0');
    const pad3 = chapter.padStart(3, '0');
    const files = fs.readdirSync(versionDir);
    
    // Try 2-digit first, then 3-digit padding
    const pattern2 = `_${bookCode}_${pad2}_read.txt`;
    const pattern3 = `_${bookCode}_${pad3}_read.txt`;
    const fileName = files.find(f => f.includes(pattern2)) || files.find(f => f.includes(pattern3));

    if (!fileName) {
        throw new Error(`Passage not found: ${book} ${chapter} in ${config.name}`);
    }

    const filePath = path.join(versionDir, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Parse lines:
    // Line 1: Book Name (in native language)
    // Line 2: Chapter
    // Lines 3+: Verses
    const rawName = lines[0].replace(/\.$/, ''); // Remove trailing period
    // Convert from ALL CAPS to Title Case if needed
    const nativeBookName = rawName === rawName.toUpperCase() 
        ? rawName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        : rawName;
    const chapterNum = lines[1];
    const versesRaw = lines.slice(2);

    const verses = versesRaw.map((text, index) => ({
        number: index + 1,
        text: text
    }));

    // If a specific verse or range is requested
    if (verse) {
        const vNum = parseInt(verse);
        const vEndNum = verseEnd ? parseInt(verseEnd) : vNum;
        const filteredVerses = verses.filter(v => v.number >= vNum && v.number <= vEndNum);
        if (filteredVerses.length === 0) throw new Error(`Verse ${verse}${verseEnd ? '-' + verseEnd : ''} not found in ${book} ${chapter}`);
        
        return {
            version: config.id,
            versionName: config.name,
            reference: `${nativeBookName} ${chapter}:${verse}${verseEnd ? '-' + verseEnd : ''}`,
            nativeBookName,
            text: filteredVerses.map(v => v.text).join(' '),
            verses: filteredVerses
        };
    }

    return {
        version: config.id,
        versionName: config.name,
        reference: `${nativeBookName} ${chapter}`,
        nativeBookName,
        text: verses.map(v => `${v.number} ${v.text}`).join(' '),
        verses: verses
    };
}

/**
 * Local Text Keyword Search
 * Searches all local flat files for a keyword query
 */
async function searchLocalKeyword(config: BibleVersion, query: string) {
    if (!config.localDir) return [];
    
    // Path to the version directory
    const rootDir = path.join(__dirname, '..', '..', '..');
    const versionDir = path.join(rootDir, config.localDir);
    
    if (!fs.existsSync(versionDir)) return [];

    const files = fs.readdirSync(versionDir).filter(f => f.endsWith('_read.txt'));
    const results: any[] = [];
    const qLower = query.toLowerCase();
    const queryWords = qLower.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !['the','and','for','with','that','this','are'].includes(w));

    for (const file of files) {
        const filePath = path.join(versionDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 3) continue;

        const rawName = lines[0].replace(/\.$/, '');
        const nativeBookName = rawName === rawName.toUpperCase() 
            ? rawName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
            : rawName;
        const chapterNum = parseInt(lines[1]);
        
        // Match standard book code from filename like _GEN_01_read.txt
        const bookCodeMatch = file.match(/_([A-Z0-9]{3})_/);
        const bookCode = bookCodeMatch ? bookCodeMatch[1] : '';

        for (let i = 2; i < lines.length; i++) {
            const verseText = lines[i];
            const vLower = verseText.toLowerCase();
            
            let isMatch = false;
            if (vLower.includes(qLower)) {
                isMatch = true;
            } else if (queryWords.length > 1) {
                let matchCount = 0;
                for (const w of queryWords) {
                    if (vLower.includes(w)) matchCount++;
                }
                // If it's a common misquote "perish" for "destroy", check it explicitly
                if (!isMatch && queryWords.includes('perish') && vLower.includes('destroy')) matchCount++;
                
                if (matchCount >= Math.min(3, queryWords.length)) {
                    isMatch = true;
                } else if (matchCount === 2 && queryWords.length <= 3) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                const verseNum = i - 1; // line 2 is verse 1
                const canonSlug = bookCode ? CODE_TO_CANON_SLUG[bookCode] : null;
                const englishSlug = canonSlug || canonEnglishBookSlug(nativeBookName);
                results.push({
                    version: config.id,
                    versionCode: config.id,
                    versionName: config.name,
                    language: config.language,
                    reference: `${nativeBookName} ${chapterNum}:${verseNum}`,
                    text: verseText,
                    book: englishSlug,
                    nativeBookName,
                    chapter: chapterNum,
                    verse: verseNum,
                    verses: [{
                        book: englishSlug,
                        chapter: chapterNum,
                        verse: verseNum,
                        text: verseText
                    }]
                });
                
                // Show all results as requested by user
                // if (results.length >= 30) return results;
            }
        }
    }
    return results;
}

// ============================================================
// ============================================================
// API Route: GET /book-names/:langCode — Get localized book names
// ============================================================
router.get('/book-names/:langCode', async (req: Request, res: Response) => {
    const { langCode } = req.params;
    const key = langCode.toLowerCase();

    // Use the canonical NATIVE_BOOK_NAMES registry — no duplication needed
    const names = NATIVE_BOOK_NAMES[key] || {};
    return res.json({ langCode: key, names });
});

// API Route: GET /interlinear — Fetch interlinear breakdown for a verse
router.get('/interlinear', async (req: Request, res: Response) => {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: 'Reference is required' });

    try {
        // Determine language based on book (Hebrew for OT, Greek for NT)
        // Simplified check for common OT books
        const otBooks = ['genesis','exodus','leviticus','numbers','deuteronomy','joshua','judges','ruth',
            '1 samuel','2 samuel','1 kings','2 kings','1 chronicles','2 chronicles','ezra','nehemiah','esther',
            'job','psalm','psalms','proverbs','ecclesiastes','song of solomon','song of songs','isaiah','jeremiah',
            'lamentations','ezekiel','daniel','hosea','joel','amos','obadiah','jonah','micah','nahum','habakkuk',
            'zephaniah','haggai','zechariah','malachi'];
        
        const refStr = String(reference).trim();
        const bookFromRef = refStr.match(/^(.+?)\s+\d+:\d+/i);
        const bookName = (bookFromRef ? bookFromRef[1] : refStr.split(/\s+/)[0] || '').trim().toLowerCase();
        const isOT = otBooks.includes(bookName);
        const originalLang = isOT ? 'Hebrew' : 'Greek';

        // --- Cache Check ---
        const cacheDir = path.join(process.cwd(), 'data', 'cache', 'interlinear');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        
        const cacheFileName = `${reference.toString().replace(/[:\s]/g, '_')}.json`;
        const cachePath = path.join(cacheDir, cacheFileName);

        if (fs.existsSync(cachePath)) {
            try {
                const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                console.log(`[Interlinear] Serving from cache: ${reference}`);
                return res.json({ reference, originalLang, data: cachedData, source: 'cache' });
            } catch (err) {
                console.error(`[Interlinear] Cache read error for ${reference}:`, err);
            }
        }

        const groundingExample = isOT 
            ? 'GROUNDING EXAMPLE (Gen 1:1 Hebrew): {"words":[{"word":"בְּרֵאשִׁית","transliteration":"Bereshit","translation":"In the beginning","strongs":"H7225","parsing":"Prep"}]}'
            : 'GROUNDING EXAMPLE (John 1:1 Greek): {"words":[{"word":"Ἐν","transliteration":"En","translation":"In","strongs":"G1722","parsing":"Prep"}]}';

        const userPrompt = `Break down the Bible verse ${reference} into a word-by-word ${originalLang} interlinear JSON. 
For every word, provide: original ${originalLang} word, transliteration, Strong's number, English meaning, and brief grammatical parsing.

${groundingExample}

CRITICAL: You MUST provide the breakdown for ${reference}, NOT the example verse.
Return ONLY the JSON object for ${reference}.`;

        const systemPrompt =
            `You are a scholarly ${originalLang} Bible API. Output ONLY a single JSON object with key "words" (array). No markdown, no conversational text.`;

        let text = '';
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
            try {
                text = await pollinationsChatText(systemPrompt, userPrompt, { jsonObject: true });
                console.log(`[Interlinear] AI Response received for: ${reference} (Attempt ${attempts + 1})`);
                break; // Success!
            } catch (aiError: any) {
                attempts++;
                if (aiError.name === 'AbortError' && attempts < maxAttempts) {
                    console.warn(`[Interlinear] AI timeout on ${reference}, retrying...`);
                    continue;
                }
                console.warn(`[Interlinear] AI fetch failed on ${reference}:`, aiError.message);
                break;
            }
        }

        let data: any[] = [];
        if (text) {
            try {
                const outer = JSON.parse(text);
                data = outer.words || (Array.isArray(outer) ? outer : []);
            } catch {
                // ... (Parsing recovery logic kept same for robustness)
                const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                let jsonStr = markdownMatch ? markdownMatch[1] : null;
                if (!jsonStr) {
                    const start = text.indexOf('{');
                    const end = text.lastIndexOf('}');
                    if (start !== -1 && end !== -1 && end > start) {
                        jsonStr = text.substring(start, end + 1);
                    }
                }
                if (jsonStr) {
                    try {
                        const parsed = JSON.parse(jsonStr);
                        data = parsed.words || (Array.isArray(parsed) ? parsed : []);
                    } catch {
                        /* fallback to regex matching if JSON is mangled */
                        const matches = jsonStr.match(/\{\s*"word"\s*:[\s\S]*?\}\s*/g);
                        if (matches) {
                            for (const m of matches) {
                                try { data.push(JSON.parse(m)); } catch { }
                            }
                        }
                    }
                }
            }
        }

        if (Array.isArray(data) && data.length > 0) {
            // --- Save to Cache ---
            try {
                fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
                console.log(`[Interlinear] Saved to cache: ${reference}`);
            } catch (err) {
                console.error(`[Interlinear] Cache write error:`, err);
            }
            return res.json({ reference, originalLang, data, source: 'ai-generated' });
        }

        return res.status(503).json({ 
            error: 'AI Study Assistant is currently overwhelmed. Please try again in a few moments.',
            reference, 
            originalLang
        });
    } catch (error) {
        console.error('Interlinear route critical error:', error);
        return res.status(500).json({ error: 'Failed to fetch interlinear data' });
    }
});

// API Route: GET /ai-commentary — AI scholarly commentary (server-side Pollinations)
router.get('/ai-commentary', async (req: Request, res: Response) => {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: 'Reference is required' });

    try {
        const cacheDir = path.join(process.cwd(), 'data', 'cache', 'commentary');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        
        const cacheFileName = `${reference.toString().replace(/[:\s]/g, '_')}.md`;
        const cachePath = path.join(cacheDir, cacheFileName);

        if (fs.existsSync(cachePath)) {
            const cachedCommentary = fs.readFileSync(cachePath, 'utf8');
            console.log(`[Commentary] Serving from cache: ${reference}`);
            return res.json({ reference: String(reference), commentary: cachedCommentary, source: 'cache' });
        }

        const userPrompt = `Provide a scholarly and inspiring Bible commentary for ${reference}. 
Include 3 sections: 
1. Historical Context
2. Theological Significance
3. Devotional Reflection.

Format with markdown. Keep it under 250 words.`;

        const systemPrompt =
            'You are a world-class Bible scholar and theologian. Provide balanced, accurate, and inspiring commentary.';
        
        const commentary = await pollinationsChatText(systemPrompt, userPrompt);
        
        if (commentary && !commentary.includes('error')) {
            try {
                fs.writeFileSync(cachePath, commentary);
                console.log(`[Commentary] Saved to cache: ${reference}`);
            } catch (err) {
                console.error(`[Commentary] Cache write error:`, err);
            }
        }

        return res.json({ reference: String(reference), commentary, source: 'ai-generated' });
    } catch (error: any) {
        console.error('AI commentary error:', error.message);
        return res.status(500).json({ error: 'Failed to generate commentary' });
    }
});

// API Route: GET /ai-cross-references — AI-suggested related verses (JSON)
router.get('/ai-cross-references', async (req: Request, res: Response) => {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: 'Reference is required' });

    try {
        const cacheDir = path.join(process.cwd(), 'data', 'cache', 'cross_references');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        
        const cacheFileName = `${reference.toString().replace(/[:\s]/g, '_')}.json`;
        const cachePath = path.join(cacheDir, cacheFileName);

        if (fs.existsSync(cachePath)) {
            try {
                const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                console.log(`[Cross-Refs] Serving from cache: ${reference}`);
                return res.json({ reference: String(reference), references: cachedData, source: 'cache' });
            } catch (err) {
                console.error(`[Cross-Refs] Cache read error:`, err);
            }
        }

        const userPrompt = `For ${reference}, list the top 6 most relevant cross-reference Bible verses. 
For each give: reference, a brief reason why it relates. 

GROUNDING EXAMPLE:
{"references":[{"reference":"John 3:16","reason":"Both verses speak of God's love for humanity."}]}

Return ONLY valid JSON for ${reference}.`;

        const systemPrompt =
            'You are a JSON API for Bible cross-references. Output ONLY a single JSON object with key "references" (array). No markdown, no conversational text.';
        
        const raw = await pollinationsChatText(systemPrompt, userPrompt, { jsonObject: true });
        let references: any[] = [];
        try {
            const parsed = JSON.parse(raw);
            references = parsed.references || (Array.isArray(parsed) ? parsed : []);
        } catch {
            // Robust parsing recovery
            const start = raw.indexOf('{');
            const end = raw.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                try {
                    const extracted = JSON.parse(raw.substring(start, end + 1));
                    references = extracted.references || [];
                } catch { }
            }
        }

        if (Array.isArray(references) && references.length > 0) {
            try {
                fs.writeFileSync(cachePath, JSON.stringify(references, null, 2));
                console.log(`[Cross-Refs] Saved to cache: ${reference}`);
            } catch (err) {
                console.error(`[Cross-Refs] Cache write error:`, err);
            }
        }

        return res.json({ reference: String(reference), references, source: 'ai-generated' });
    } catch (error: any) {
        console.error('AI cross-references error:', error.message);
        return res.status(500).json({ error: 'Failed to generate cross references' });
    }
});

// API Route: GET /passage — Fetch a specific passage or chapter
// ============================================================
// Combined duplicate route into the one above
// ============================================================

// ============================================================
// API Route: GET /search/all — Search across all available versions
// ============================================================
// Simple in-memory cache for search results (30 min TTL)
const searchCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

router.get('/search/all', async (req: Request, res: Response) => {
    const { q } = req.query as Record<string, string>;

    if (!q) {
        return res.status(400).json({ error: 'Missing query parameter: q' });
    }

    // Check cache
    const cacheKey = q.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
    }

    try {
        let groupedRefs = await performReferenceSearch(q);
        let semanticFallback = false;

        // Phase 2: Semantic fallback when exact keyword search finds nothing
        if (groupedRefs.length === 0) {
            console.log(`[Search All] No exact matches for "${q}", trying semantic search...`);
            groupedRefs = await performSemanticSearch(q);
            semanticFallback = groupedRefs.length > 0;
        }

        if (groupedRefs.length === 0) {
            return res.json({ query: q, results: [], semanticFallback: false });
        }

        const versionList = Object.keys(BIBLE_VERSIONS).filter(v => BIBLE_VERSIONS[v].available);
        
        const searchPromises = versionList.map(async (vCode) => {
            const versionConfig = BIBLE_VERSIONS[vCode];
            return await fetchVersesFromVersion(versionConfig, groupedRefs);
        });

        const allResultsArrays = await Promise.all(searchPromises);
        const allResults = allResultsArrays.flat();
        
        const responseData = { query: q, results: allResults, semanticFallback };
        searchCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
        
        return res.json(responseData);
    } catch (error: any) {
        console.error('Search all error:', error.message);
        return res.status(500).json({ error: 'Search failed' });
    }
});

// ============================================================
// API Route: GET /verse/:book/:chapter/:verse/prev and /next
// ============================================================
router.get('/verse/:book/:chapter/:verse/:direction(prev|next)', async (req: Request, res: Response) => {
    const { book, chapter, verse, direction } = req.params;
    const { version = 'KJV' } = req.query as Record<string, string>;

    const versionConfig = BIBLE_VERSIONS[version.toUpperCase()];
    if (!versionConfig) {
        return res.status(404).json({ error: `Bible version "${version}" not found` });
    }

    try {
        const currentChapter = parseInt(chapter);
        const currentVerse = parseInt(verse);
        
        let targetChapter = currentChapter;
        let targetVerse = direction === 'next' ? currentVerse + 1 : currentVerse - 1;

        if (targetVerse < 1) {
            targetChapter -= 1;
            if (targetChapter < 1) targetChapter = 1;
            targetVerse = 1; // Rough fallback, real prev chapter last verse requires fetching it first
        }

        let result;
        if (versionConfig.source === 'bible-api') {
            result = await fetchFromBibleApi(versionConfig, book, targetChapter.toString(), targetVerse.toString());
        } else {
            result = await fetchFromHelloAo(versionConfig, book, targetChapter.toString(), targetVerse.toString());
        }

        return res.json({ ...result, pdfPath: versionConfig.pdfPath });
    } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error(`Verse nav error [${direction}]:`, error.message);
        return res.status(500).json({ error: 'Failed to fetch adjacent verse', details: error.message });
    }
});

// ============================================================
// API Route: GET /search — Parallel Multi-Version Search
// ============================================================
router.get('/search', async (req: Request, res: Response) => {
    const { q, versions } = req.query;
    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
    }

    // Cap at 8 versions per search to prevent timeout — prioritise user-selected ones
    const MAX_SEARCH_VERSIONS = 8;
    const rawVersionList = versions
        ? (versions as string).split(',').map(v => v.trim().toUpperCase()).filter(Boolean)
        : ['KJV'];
    const versionList = rawVersionList.slice(0, MAX_SEARCH_VERSIONS);

    if (rawVersionList.length > MAX_SEARCH_VERSIONS) {
        console.log(`[Search] Capped versions from ${rawVersionList.length} to ${MAX_SEARCH_VERSIONS}`);
    }

    const cacheKey = `${q.toLowerCase().trim()}_${versionList.join('_')}`;

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Search] Returning cached results for: ${q}`);
        return res.json(cached.data);
    }

    const clientController = new AbortController();
    req.on('close', () => {
        clientController.abort();
    });

    let allResults: any[] = [];
    let semanticFallback = false;

    try {
        // Phase 1: Reference/Keyword Search & Local Search in Parallel
        const [groupedRefs, localResultsArrays] = await Promise.all([
            performReferenceSearch(q, clientController.signal).catch(e => []),
            Promise.all(versionList.map(async (vCode) => {
                const versionConfig = Object.values(BIBLE_VERSIONS).find(v => v.id === vCode);
                if (versionConfig && versionConfig.source === 'local-text') {
                    return await searchLocalKeyword(versionConfig, q);
                }
                return [];
            }))
        ]);

        // If no reference results, try broad search immediately
        let finalRefs = groupedRefs;
        if (finalRefs.length === 0 && !clientController.signal.aborted) {
            finalRefs = await performBroadSearch(q, clientController.signal).catch(e => []);
        }

        // Last-resort: try any_words search (catches single keywords like "love", "faith", "grace")
        if (finalRefs.length === 0 && !clientController.signal.aborted) {
            const cleanQ = q.replace(/[,./';"\\]/g, ' ').replace(/\s{2,}/g, ' ').trim();
            finalRefs = await fetchAndGroup(
                `https://api.biblesupersearch.com/api?bible=kjv&search=${encodeURIComponent(cleanQ)}&search_type=any_word&limit=20`,
                clientController.signal
            ).catch(() => []);
            if (finalRefs.length > 0) {
                console.log(`[Search] any_word fallback found ${finalRefs.length} refs for: "${q}"`);
            }
        }

        // Fetch verses for all versions in parallel (optimized batching)
        if (finalRefs.length > 0 && !clientController.signal.aborted) {
            const searchPromises = versionList.map(async (vCode) => {
                const versionConfig = Object.values(BIBLE_VERSIONS).find(v => v.id === vCode);
                if (!versionConfig || versionConfig.source === 'local-text') return [];
                return await fetchVersesFromVersion(versionConfig, finalRefs);
            });
            const resultsArrays = await Promise.all(searchPromises);
            allResults = resultsArrays.flat();
        }

        // Add local results
        const existingRefs = new Set(allResults.map(r => `${r.version}-${r.reference}`));
        const uniqueLocalResults = localResultsArrays.flat().filter(r => !existingRefs.has(`${r.version}-${r.reference}`));
        allResults.push(...uniqueLocalResults);

        // Phase 2: Semantic Search (Run if results are sparse or lack diversity)
        const uniqueRefsCount = new Set(allResults.map(r => r.reference)).size;
        if (!clientController.signal.aborted && uniqueRefsCount < 3) {
            const semanticGroups = await performSemanticSearch(q);
            if (semanticGroups.length > 0) {
                const semanticPromises = versionList.map(async (vCode) => {
                    const versionConfig = Object.values(BIBLE_VERSIONS).find(v => v.id === vCode);
                    if (!versionConfig) return [];
                    return await fetchVersesFromVersion(versionConfig, semanticGroups);
                });
                const semanticResultsArrays = await Promise.all(semanticPromises);
                const semanticResults = semanticResultsArrays.flat();
                
                semanticResults.forEach(r => r.isSemantic = true);
                const updatedRefs = new Set(allResults.map(r => `${r.version}-${r.reference}`));
                const uniqueSemanticResults = semanticResults.filter(r => !updatedRefs.has(`${r.version}-${r.reference}`));
                allResults.push(...uniqueSemanticResults);
                semanticFallback = true;
            }
        }

        if (clientController.signal.aborted) return;

        // Phase 3: Scoring & Prioritization
        const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
        allResults.forEach((res: any) => {
            const text = (res.text || "").toLowerCase();
            const ref = (res.reference || "").toLowerCase();
            const cleanQ = q.toLowerCase().trim();
            let score = 0;
            
            if (text.includes(cleanQ)) score += 1000;
            if (res.isSemantic) score += 300;
            
            keywords.forEach(kw => {
                if (text.includes(kw)) score += 50;
                if (ref.includes(kw)) score += 80; 
            });

            if (ref.includes(cleanQ)) score += 200;
            res.matchScore = score;
        });

        allResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        const responseData = { query: q, results: allResults, semanticFallback };
        
        // Cache successful results
        if (allResults.length > 0) {
            searchCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
        }

        return res.json(responseData);

    } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Search route error:', error);
        return res.status(500).json({ error: 'Search failed', details: error.message });
    }
});

// ============================================================
// API Route: GET /study-guide/:passage — AI Study Guide
// ============================================================
router.get('/study-guide/:passage', async (req: Request, res: Response) => {
    const { passage } = req.params;
    
    try {
        const userPrompt = `For the Bible passage ${passage}, provide a concise study guide in 3 parts: 
1. Key Themes (3 bullet points)
2. Life Application (1-2 sentences)
3. Prayer Focus (1 sentence)
Use markdown for formatting. Keep the total response under 200 words.`;

        const systemPrompt = 'You are a biblical scholar and pastor. Provide inspiring and accurate study insights.';
        const text = await pollinationsChatText(systemPrompt, userPrompt);

        return res.json({ passage, guide: text });
    } catch (error: any) {
        console.error('Study guide error:', error.message);
        return res.status(500).json({ error: 'Failed to generate study guide' });
    }
});

// ============================================================
// API Route: GET /cross-references/:passage — Dynamic Cross Refs
// ============================================================
router.get('/cross-references/:passage', async (req: Request, res: Response) => {
    const { passage } = req.params;
    const { translation = 'kjv' } = req.query;

    const match = passage.match(/^([\w\s]+)\s+(\d+)(?::(\d+))?$/i);
    if (!match) {
        return res.status(400).json({ error: 'Invalid passage format' });
    }

    const bookName = match[1].trim();
    const chapter = match[2];
    const verse = match[3];
    
    const translatedBookName = translateNativeBookName(bookName);
    const bookCode = getBookCode(translatedBookName);

    if (!bookCode) {
        return res.status(404).json({ error: `Book ${bookName} not found` });
    }

    try {
        const url = `https://bible.helloao.org/api/d/open-cross-ref/${bookCode}/${chapter}.json`;
        console.log(`[cross-refs] Fetching: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) return res.json({ passage, crossReferences: [] });

        const data = await response.json();
        let refs = data.verses || [];

        // If a specific verse was requested, filter for it
        if (verse) {
            const verseNum = parseInt(verse);
            refs = refs.filter((r: any) => r.number === verseNum);
        }

        // Flatten all references
        let crossRefItems: any[] = [];
        refs.forEach((r: any) => {
            if (r.references) {
                r.references.forEach((ref: any) => {
                    crossRefItems.push({
                        ...ref,
                        sourceVerse: r.number
                    });
                });
            }
        });

        // Limit and fetch text for the top 10
        const topRefs = crossRefItems.slice(0, 10);
        
        const detailedRefs = await Promise.all(topRefs.map(async (ref) => {
            const refString = `${ref.book} ${ref.chapter}:${ref.verse}`;
            try {
                // Use bible-api.com for quick text lookup
                const textRes = await fetch(`https://bible-api.com/${encodeURIComponent(refString)}?translation=${translation}`);
                if (!textRes.ok) return { ...ref, reference: refString, text: '' };
                const textData = await textRes.json();
                return {
                    ...ref,
                    reference: textData.reference || refString,
                    text: textData.text?.trim() || '',
                    relevance: ref.score || 80
                };
            } catch (e) {
                return { ...ref, reference: refString, text: '', relevance: ref.score || 80 };
            }
        }));

        return res.json({
            passage,
            crossReferences: detailedRefs.filter(r => r.text)
        });
    } catch (error: any) {
        console.error('Cross-reference error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch cross-references' });
    }
});


// ============================================================
// Fetcher: bible-api.com
// Simple, clean API. Supports: kjv, web, cherokee, almeida, etc.
// ============================================================
async function fetchFromBibleApi(
    versionConfig: BibleVersion,
    book: string, chapter: string, verse?: string, verseEnd?: string,
    signal?: AbortSignal
): Promise<any> {
    // Use spaces as separators, encodeURIComponent will handle them as %20
    // bible-api.com handles %20 correctly for both book names and separators
    const ref = verse ? `${book} ${chapter}:${verse}${verseEnd ? '-' + verseEnd : ''}` : `${book} ${chapter}`;
    const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${versionConfig.apiId}`;

    console.log(`[bible-api.com] Fetching: ${url}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { signal: signal || controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`bible-api.com returned ${response.status}`);
        }

        const data = await response.json();

    const nativeBook = getNativeBookName(book, versionConfig.languageCode);
    const bookEsc = book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const refFromApi = data.reference && typeof data.reference === 'string'
        ? data.reference.replace(new RegExp(`^${bookEsc}\\b`, 'i'), nativeBook)
        : null;

    return {
        version: versionConfig.id,
        versionName: versionConfig.name,
        language: versionConfig.language,
        book: nativeBook,
        chapter: parseInt(chapter),
        reference: refFromApi || `${nativeBook} ${chapter}${verse ? ':' + verse : ''}`,
        nativeBookName: nativeBook,
        text: data.text?.trim(),
        verses: (data.verses || []).map((v: any) => ({
            number: v.verse,
            text: v.text?.trim(),
            book: nativeBook,
            chapter: v.chapter,
        })),
        copyright: versionConfig.copyright,
        source: 'bible-api.com',
    };
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

// ============================================================
// Fetcher: bible.helloao.org
// Structured chapter-based API. Supports 1000+ translations
// Format: /api/{translationId}/{bookCode}/{chapter}.json
// ============================================================
async function fetchFromHelloAo(
    versionConfig: BibleVersion,
    book: string, chapter: string, verse?: string, verseEnd?: string,
    signal?: AbortSignal
): Promise<any> {
    const bookCode = getBookCode(book);
    if (!bookCode) {
        throw new Error(`Unknown book name: "${book}". Check spelling.`);
    }

    const url = `https://bible.helloao.org/api/${versionConfig.apiId}/${bookCode}/${chapter}.json`;
    console.log(`[helloao.org] Fetching: ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, { signal: signal || controller.signal });
        clearTimeout(timeout);
    if (!response.ok) {
        throw new Error(`helloao.org returned ${response.status} for ${url}`);
    }

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Passage not found in this version (API returned non-JSON data)`);
    }

    const chapterData = data.chapter;
    if (!chapterData || !chapterData.content) {
        throw new Error('Unexpected response format from helloao.org');
    }

    // Extract structured content (including headings)
    const structuredContent: any[] = [];
    const versesOnly: any[] = [];

    for (const item of chapterData.content) {
        if (item.type === 'heading') {
            structuredContent.push({
                type: 'heading',
                text: Array.isArray(item.content) ? item.content.join(' ') : item.content
            });
        } else if (item.type === 'verse' && item.number) {
            let verseText = '';
            if (Array.isArray(item.content)) {
                verseText = item.content.map((c: any) => {
                    if (typeof c === 'string') return c;
                    if (c && c.text) return c.text;
                    return '';
                }).join(' ').trim();
            } else if (typeof item.content === 'string') {
                verseText = item.content.trim();
            }

            const verseObj = {
                number: item.number,
                text: verseText,
                book: book,
                chapter: parseInt(chapter),
            };

            versesOnly.push(verseObj);
            structuredContent.push({
                type: 'verse',
                ...verseObj
            });
        }
    }

    // Filter to specific verse if requested
    let finalContent = structuredContent;
    let finalVerses = versesOnly;

    if (verse) {
        const verseNum = parseInt(verse);
        const verseEndNum = verseEnd ? parseInt(verseEnd) : verseNum;
        finalVerses = versesOnly.filter(v => v.number >= verseNum && v.number <= verseEndNum);
        
        // Lenient Fallback: If specific verse not found but chapter has content, return chapter
        if (finalVerses.length === 0 && versesOnly.length > 0) {
            console.log(`[helloao.org] Verse ${verse} not found in ${book} ${chapter} for ${versionConfig.id}, falling back to chapter.`);
            finalVerses = versesOnly;
            finalContent = structuredContent;
        } else {
            finalContent = structuredContent.filter(item => 
                item.type === 'heading' || (item.type === 'verse' && item.number >= verseNum && item.number <= verseEndNum)
            );
        }

        if (finalVerses.length === 0) {
            throw new Error(`Verse ${verse}${verseEnd ? '-' + verseEnd : ''} not found in ${book} ${chapter}`);
        }
    }

    const nativeBook = getNativeBookName(book, versionConfig.languageCode);

    const reference = verse
        ? `${nativeBook} ${chapter}:${verse}${verseEnd ? '-' + verseEnd : ''}`
        : `${nativeBook} ${chapter}`;

        return {
            version: versionConfig.id,
            versionName: versionConfig.name,
            language: versionConfig.language,
            book: nativeBook,
            chapter: parseInt(chapter),
            reference,
            nativeBookName: nativeBook,
            text: finalVerses.map(v => v.text).join(' '),
            verses: finalVerses,
            structuredContent: finalContent,
            totalVersesInChapter: data.numberOfVerses || versesOnly.length,
            copyright: versionConfig.copyright,
            source: 'helloao.org',
        };
    } catch (error: any) {
        clearTimeout(timeout);
        throw error;
    }
}

export default router;
