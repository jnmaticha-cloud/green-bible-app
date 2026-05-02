// Bible API Routes — Real Bible Data Integration
// Uses bible-api.com (KJV, WEB, ASV) and bible.helloao.org (1000+ translations)
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
        id: 'SWAHILI', name: 'Swahili Contemporary', language: 'Swahili', languageCode: 'swa',
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
        source: 'helloao', apiId: 'mer_bib', helloaoBookMap: true, available: true, copyright: 'Bible Society of Kenya'
    },
    MAASAI: {
        id: 'MAASAI', name: 'Biblia Sinyati (Maasai)', language: 'Maasai', languageCode: 'mas',
        source: 'helloao', apiId: 'mas_bib', helloaoBookMap: true, available: true, copyright: 'Bible Society of Kenya'
    },
    KALENJIN: {
        id: 'KALENJIN', name: 'Bukuit Ne Tilil (Kalenjin)', language: 'Kalenjin', languageCode: 'kln',
        source: 'helloao', apiId: 'spy_wbt', helloaoBookMap: true, available: true, copyright: 'Free Use (Sabaot NT)'
    },
    EMBU: {
        id: 'EMBU', name: 'Ivuku Ria Uvoro (Embu)', language: 'Embu', languageCode: 'ebu',
        source: 'helloao', apiId: 'ebu_bib', helloaoBookMap: true, available: true, copyright: 'Bible Society of Kenya'
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
    '3 jn': '3JN', 'rev': 'REV'
};

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

function getNativeBookName(bookName: string, languageCode: string): string {
    const map = NATIVE_BOOK_NAMES[languageCode];
    if (!map) return bookName;
    return map[bookName.toLowerCase().trim()] || bookName;
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
            copyright: v.copyright,
        }));

    // Group by language for convenience
    const byLanguage: Record<string, typeof versions> = {};
    versions.forEach(v => {
        if (!byLanguage[v.language]) byLanguage[v.language] = [];
        byLanguage[v.language].push(v);
    });

    res.json({ versions, byLanguage });
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

    res.json({ names: Array.from(allNames) });
});

// ============================================================
// API Route: GET /book-names/:languageCode — Get native book names
// ============================================================
router.get('/book-names/:languageCode', (req: Request, res: Response) => {
    const { languageCode } = req.params;
    const names = NATIVE_BOOK_NAMES[languageCode.toLowerCase()] || {};
    res.json({ languageCode, names });
});

// ============================================================
// API Route: GET /passage — Fetch a Bible passage (real data)
// ============================================================
router.get('/passage', async (req: Request, res: Response) => {
    const { version, book, chapter = '1', verse, verseEnd } = req.query as Record<string, string>;

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

        if (versionConfig.source === 'bible-api') {
            result = await fetchFromBibleApi(versionConfig, translatedBook, chapter, verse, verseEnd);
        } else if (versionConfig.source === 'helloao') {
            result = await fetchFromHelloAo(versionConfig, translatedBook, chapter, verse, verseEnd);
        } else if (versionConfig.source === 'local-text') {
            result = await fetchFromLocalText(versionConfig, translatedBook, chapter, verse, verseEnd);
        } else if (versionConfig.source === 'pdf-only') {
            result = {
                version: versionConfig.id,
                versionName: versionConfig.name,
                reference: `${book} ${chapter}${verse ? ':' + verse : ''}${verseEnd ? '-' + verseEnd : ''}`,
                text: `This version is available as a high-fidelity PDF. Click "View Full PDF" below to read ${versionConfig.name}.`,
                verses: [{ number: 1, text: `This version is available as a high-fidelity PDF document.` }]
            };
        }

        return res.json({ ...result, pdfPath: versionConfig.pdfPath });
    } catch (error: any) {
        console.error(`Error fetching passage [${version} ${book} ${chapter}:${verse || 'all'}]:`, error.message);
        return res.status(500).json({ error: 'Failed to fetch passage', details: error.message });
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
async function performBroadSearch(query: string) {
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
    
    let groupedRefs = await fetchAndGroup(`https://api.biblesupersearch.com/api?bible=kjv&search=${encodeURIComponent(broadQuery)}&search_type=all_words`);
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
            fetch(`https://api.biblesupersearch.com/api?bible=kjv&search=${encodeURIComponent(combo)}&search_type=all_words&limit=5`)
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

async function fetchAndGroup(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        if (!data.results || !Array.isArray(data.results)) return [];
        
        const groupedRefs: Record<string, { book: string, chapter: string, verses: number[] }> = {};
        data.results.slice(0, 5).forEach((result: any) => {
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
        return [];
    }
}
async function performReferenceSearch(query: string) {
    const translatedQuery = translateNativeQueryToEnglish(query);
    const isPhraseSearch = /["']/.test(translatedQuery);
    
    // Clean and normalize the query
    let cleanQuery = translatedQuery
        .replace(/[()]/g, " ")
        .replace(/[,./';"\\]/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
        
    // Phase 1 Optimization: If not a literal phrase search, major on Keywords.
    // We strip stop words even in the initial search to avoid "article noise".
    if (!isPhraseSearch) {
        const words = cleanQuery.split(' ');
        const keywords = words.filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
        if (keywords.length > 0) {
            cleanQuery = keywords.join(' ');
        }
    }
        
    const searchType = isPhraseSearch ? "phrase" : "all_words";
    const url = `https://api.biblesupersearch.com/api?bible=kjv&search=${encodeURIComponent(cleanQuery)}&search_type=${searchType}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) return [];
        
        // Extract references and group by book and chapter
        const groupedRefs: Record<string, { book: string, chapter: string, verses: number[] }> = {};
        
        // Take up to 15 results to ensure fast API responses
        const resultsToProcess = data.results.slice(0, 15);
        
        resultsToProcess.forEach((result: any) => {
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
        console.error("SuperSearch error:", e);
        return [];
    }
}

// ============================================================
// Semantic Search: AI-powered meaning-based verse discovery
// Falls back here when exact keyword search returns 0 results.
// Uses free Pollinations AI (no API key needed).
// ============================================================
async function performSemanticSearch(query: string): Promise<any[]> {
    const cleanQ = query.replace(/["']/g, ' ').trim();
    const prompt = `Identify the Bible verses for: "${cleanQ}". Return JSON array of objects with {book, chapter, verse}. Return ONLY the JSON.`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const systemPrompt = "You are a JSON API. Output ONLY a raw JSON array. No reasoning. No markdown. No preamble. Ensure 'verse' is always a number.";
        const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(systemPrompt)}&model=openai`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        let text = await response.text();
        // Log to console instead of file to avoid triggering tsx --watch restarts
        console.log(`[Semantic Search] Response received for: ${query}`);
        
        try {
            const outerJson = JSON.parse(text);
            // Handle reasoning/content structure from some models
            text = outerJson.choices?.[0]?.message?.content || outerJson.content || outerJson.reasoning_content || text;
            if (typeof text !== 'string') text = JSON.stringify(text);
        } catch (e) {}

        // 1. Try to find JSON inside markdown blocks
        const markdownMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        let jsonStr = markdownMatch ? markdownMatch[1] : null;

        // 2. Fallback to finding the first [ and last ]
        if (!jsonStr) {
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                jsonStr = text.substring(start, end + 1);
            }
        }
        
        if (!jsonStr) {
            console.error('[Semantic Search] No JSON array found in AI response.');
            return [];
        }
        
        let verses = [];
        try {
            verses = JSON.parse(jsonStr);
        } catch (err: any) {
            const matches = jsonStr.match(/\{\s*"book"\s*:[\s\S]*?\}\s*/g);
            if (matches) {
                for (const m of matches) {
                    try { verses.push(JSON.parse(m)); } catch(e) {}
                }
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
    
    for (const group of groupedRefs) {
        try {
            let chapterData;
            if (versionConfig.source === 'bible-api') {
                chapterData = await fetchFromBibleApi(versionConfig, group.book, group.chapter);
            } else if (versionConfig.source === 'local-text') {
                chapterData = await fetchFromLocalText(versionConfig, group.book, group.chapter);
            } else if (versionConfig.source === 'helloao') {
                chapterData = await fetchFromHelloAo(versionConfig, group.book, group.chapter);
            } else {
                // Skip pdf-only or other types that don't support text lookup
                continue;
            }
            
            if (!chapterData || !chapterData.verses) continue;

            // Extract the specific verses
            const foundVerses = chapterData.verses.filter((v: any) => group.verses.includes(parseInt(v.number || v.verse)));
            
            if (foundVerses.length > 0) {
                foundVerses.forEach((fv: any) => {
                    results.push({
                        version: versionConfig.id,
                        versionCode: versionConfig.id,
                        versionName: versionConfig.name,
                        language: versionConfig.language,
                        reference: `${group.book} ${group.chapter}:${fv.number || fv.verse}`,
                        text: fv.text,
                        verses: [{
                            book: group.book,
                            chapter: parseInt(group.chapter),
                            verse: parseInt(fv.number || fv.verse),
                            text: fv.text
                        }]
                    });
                });
            }
        } catch (e: any) {
            console.warn(`[Search] Skipping ${versionConfig.id} for ${group.book} ${group.chapter}: ${e.message}`);
        }
    }
    return results;
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

// ============================================================
// API Route: GET /search/all — Search across all available versions
// ============================================================
// Simple in-memory cache for search results (5 min TTL)
const searchCache = new Map<string, { timestamp: number; data: any }>();

router.get('/search/all', async (req: Request, res: Response) => {
    const { q } = req.query as Record<string, string>;

    if (!q) {
        return res.status(400).json({ error: 'Missing query parameter: q' });
    }

    // Check cache
    const cacheKey = q.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
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
        
        res.json(responseData);
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
        console.error(`Verse nav error [${direction}]:`, error.message);
        return res.status(500).json({ error: 'Failed to fetch adjacent verse', details: error.message });
    }
});

// ============================================================
// API Route: GET /search — Parallel Multi-Version Search
router.get('/search', async (req: Request, res: Response) => {
    const { q, versions } = req.query as Record<string, string>;

    if (!q) {
        return res.status(400).json({ error: 'Missing query parameter: q' });
    }

    const versionList = versions ? versions.split(',').map(v => v.trim().toUpperCase()) : ['KJV'];

    try {
        let groupedRefs = await performReferenceSearch(q);
        let semanticFallback = false;

        // Phase 2: Broad keyword fallback when exact search fails
        if (groupedRefs.length === 0) {
            groupedRefs = await performBroadSearch(q);
        }

        // Phase 3: Semantic fallback when all keyword searches fail
        if (groupedRefs.length === 0) {
            console.log(`[Search] No exact or broad matches for "${q}", trying semantic search...`);
            groupedRefs = await performSemanticSearch(q);
            semanticFallback = groupedRefs.length > 0;
        }

        if (groupedRefs.length === 0) {
            return res.json({ query: q, results: [], semanticFallback: false });
        }

        const searchPromises = versionList.map(async (vCode) => {
            const versionConfig = BIBLE_VERSIONS[vCode];
            if (!versionConfig) return [];
            return await fetchVersesFromVersion(versionConfig, groupedRefs);
        });

        const allResultsArrays = await Promise.all(searchPromises);
        
        // Build an ordered list of unique references to preserve relevancy order
        // and group the same verses across different translations together.
        const refOrder: string[] = [];
        allResultsArrays.forEach(versionArray => {
            versionArray.forEach((res: any) => {
                if (!refOrder.includes(res.reference)) {
                    refOrder.push(res.reference);
                }
            });
        });

        const allResults = allResultsArrays.flat();
        
        // Calculate keyword match scores for each verse to prioritize "highest number of keywords found"
        const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
        const scores: Record<string, number> = {};

        allResults.forEach((res: any) => {
            const text = (res.text || "").toLowerCase();
            let score = 0;
            
            // Base: Keyword density (each unique keyword found)
            keywords.forEach(kw => {
                if (text.includes(kw)) score += 10;
            });

            // Boost 1: Exact phrase match (regardless of stop words)
            const cleanQ = q.toLowerCase().replace(/[()]/g, "").trim();
            if (text.includes(cleanQ)) {
                score += 50;
            }

            // Boost 2: Keyword order match (prioritize the sequence in which words were searched)
            let lastIdx = -1;
            let inOrderCount = 0;
            keywords.forEach(kw => {
                const idx = text.indexOf(kw, lastIdx + 1);
                if (idx !== -1) {
                    inOrderCount++;
                    lastIdx = idx;
                }
            });
            
            if (inOrderCount === keywords.length) {
                score += 25; // Perfect order match
            } else if (inOrderCount > 1) {
                score += inOrderCount * 2; // Partial order bonus
            }

            scores[res.reference] = Math.max(scores[res.reference] || 0, score);
            res.matchScore = scores[res.reference];
        });
        
        // Sort first by keyword score (DESC), then by original refOrder, then by version list order
        allResults.sort((a: any, b: any) => {
            const scoreDiff = (scores[b.reference] || 0) - (scores[a.reference] || 0);
            if (scoreDiff !== 0) return scoreDiff;
            
            const refDiff = refOrder.indexOf(a.reference) - refOrder.indexOf(b.reference);
            if (refDiff !== 0) return refDiff;
            
            return versionList.indexOf(a.version) - versionList.indexOf(b.version);
        });
        
        res.json({ query: q, results: allResults, semanticFallback });
    } catch (error: any) {
        console.error('[Search] Fatal error:', error);
        return res.status(500).json({ error: 'Search failed', details: error.message });
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

        res.json({
            passage,
            crossReferences: detailedRefs.filter(r => r.text)
        });
    } catch (error: any) {
        console.error('Cross-reference error:', error.message);
        res.status(500).json({ error: 'Failed to fetch cross-references' });
    }
});


// ============================================================
// Fetcher: bible-api.com
// Simple, clean API. Supports: kjv, web, cherokee, almeida, etc.
// ============================================================
async function fetchFromBibleApi(
    versionConfig: BibleVersion,
    book: string, chapter: string, verse?: string, verseEnd?: string
): Promise<any> {
    const ref = verse ? `${book}+${chapter}:${verse}${verseEnd ? '-' + verseEnd : ''}` : `${book}+${chapter}`;
    const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${versionConfig.apiId}`;

    console.log(`[bible-api.com] Fetching: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`bible-api.com returned ${response.status}`);
    }

    const data = await response.json();

    const nativeBook = getNativeBookName(book, versionConfig.languageCode);

    return {
        version: versionConfig.id,
        versionName: versionConfig.name,
        language: versionConfig.language,
        book: nativeBook,
        chapter: parseInt(chapter),
        reference: data.reference ? data.reference.replace(book, nativeBook) : `${nativeBook} ${chapter}${verse ? ':' + verse : ''}`,
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
}

// ============================================================
// Fetcher: bible.helloao.org
// Structured chapter-based API. Supports 1000+ translations
// Format: /api/{translationId}/{bookCode}/{chapter}.json
// ============================================================
async function fetchFromHelloAo(
    versionConfig: BibleVersion,
    book: string, chapter: string, verse?: string, verseEnd?: string
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
        const response = await fetch(url, { signal: controller.signal });
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
        finalContent = structuredContent.filter(item => 
            item.type === 'heading' || (item.type === 'verse' && item.number >= verseNum && item.number <= verseEndNum)
        );
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
