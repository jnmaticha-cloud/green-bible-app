import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANON_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];

const BOOKS_UPPER_TO_CANON = Object.fromEntries(
  CANON_BOOKS.map((b) => [b.toUpperCase(), b])
);

const BOOK_HEADER_PATTERNS = [
  { re: /^The First Book of Moses:\s*Called\s*Genesis\b/i, book: 'Genesis' },
  { re: /^The Second Book of Moses:\s*Called\s*Exodus\b/i, book: 'Exodus' },
  { re: /^The Third Book of Moses:\s*Called\s*Leviticus\b/i, book: 'Leviticus' },
  { re: /^The Fourth Book of Moses:\s*Called\s*Numbers\b/i, book: 'Numbers' },
  { re: /^The Fifth Book of Moses:\s*Called\s*Deuteronomy\b/i, book: 'Deuteronomy' },

  { re: /^The Book of Joshua\b/i, book: 'Joshua' },
  { re: /^The Book of Judges\b/i, book: 'Judges' },
  { re: /^The Book of Ruth\b/i, book: 'Ruth' },

  { re: /^The First Book of Samuel\b/i, book: '1 Samuel' },
  { re: /^The Second Book of Samuel\b/i, book: '2 Samuel' },
  // In this PDF, Samuel headings can also be followed by "Otherwise Called:" lines that mention Kings
  // (e.g. "Otherwise Called: The First Book of the Kings"), so treat those as Samuel too.
  { re: /^Otherwise Called:\s*The First Book of the Kings\b/i, book: '1 Samuel' },
  { re: /^Otherwise Called:\s*The Second Book of the Kings\b/i, book: '2 Samuel' },
  // NOTE: The KJV PDF uses "The First Book of the Kings" for BOTH 1 Kings and 2 Kings,
  // then disambiguates with "The Third/Fourth Book of the Kings" below. We handle this
  // disambiguation in detectBookAt().
  { re: /^The First Book of the Chronicles\b/i, book: '1 Chronicles' },
  { re: /^The Second Book of the Chronicles\b/i, book: '2 Chronicles' },

  { re: /^Ezra\b/i, book: 'Ezra' },
  { re: /^The Book of Nehemiah\b/i, book: 'Nehemiah' },
  { re: /^The Book of Esther\b/i, book: 'Esther' },
  { re: /^The Book of Job\b/i, book: 'Job' },
  { re: /^The Book of Psalms\b/i, book: 'Psalms' },
  { re: /^The Proverbs\b/i, book: 'Proverbs' },
  { re: /^Ecclesiastes\b/i, book: 'Ecclesiastes' },
  { re: /^The Song of Solomon\b/i, book: 'Song of Songs' },

  { re: /^The Book of the Prophet Isaiah\b/i, book: 'Isaiah' },
  { re: /^The Book of the Prophet Jeremiah\b/i, book: 'Jeremiah' },
  { re: /^The Lamentations of Jeremiah\b/i, book: 'Lamentations' },
  { re: /^The Book of the Prophet Ezekiel\b/i, book: 'Ezekiel' },
  { re: /^The Book of Daniel\b/i, book: 'Daniel' },

  { re: /^Hosea\b/i, book: 'Hosea' },
  { re: /^Joel\b/i, book: 'Joel' },
  { re: /^Amos\b/i, book: 'Amos' },
  { re: /^Obadiah\b/i, book: 'Obadiah' },
  { re: /^Jonah\b/i, book: 'Jonah' },
  { re: /^Micah\b/i, book: 'Micah' },
  { re: /^Nahum\b/i, book: 'Nahum' },
  { re: /^Habakkuk\b/i, book: 'Habakkuk' },
  { re: /^Zephaniah\b/i, book: 'Zephaniah' },
  { re: /^Haggai\b/i, book: 'Haggai' },
  { re: /^Zechariah\b/i, book: 'Zechariah' },
  { re: /^Malachi\b/i, book: 'Malachi' },

  { re: /^The Gospel According to Saint\s*Matthew\b/i, book: 'Matthew' },
  { re: /^The Gospel According to Saint\s*Mark\b/i, book: 'Mark' },
  { re: /^The Gospel According to Saint\s*Luke\b/i, book: 'Luke' },
  { re: /^The Gospel According to Saint\s*John\b/i, book: 'John' },

  { re: /^The Acts of the Apostles\b/i, book: 'Acts' },
  { re: /^The Epistle of Paul the Apostle to the Romans\b/i, book: 'Romans' },
  { re: /^The First Epistle of Paul the Apostle to the Corinthians\b/i, book: '1 Corinthians' },
  { re: /^The Second Epistle of Paul the Apostle to the Corinthians\b/i, book: '2 Corinthians' },
  { re: /^The Epistle of Paul the Apostle to the Galatians\b/i, book: 'Galatians' },
  { re: /^The Epistle of Paul the Apostle to the Ephesians\b/i, book: 'Ephesians' },
  { re: /^The Epistle of Paul the Apostle to the Philippians\b/i, book: 'Philippians' },
  { re: /^The Epistle of Paul the Apostle to the Colossians\b/i, book: 'Colossians' },
  { re: /^The First Epistle of Paul the Apostle to the Thessalonians\b/i, book: '1 Thessalonians' },
  { re: /^The Second Epistle of Paul the Apostle to the Thessalonians\b/i, book: '2 Thessalonians' },
  { re: /^The First Epistle of Paul the Apostle to Timothy\b/i, book: '1 Timothy' },
  { re: /^The Second Epistle of Paul the Apostle to Timothy\b/i, book: '2 Timothy' },
  { re: /^The Epistle of Paul the Apostle to Titus\b/i, book: 'Titus' },
  { re: /^The Epistle of Paul the Apostle to Philemon\b/i, book: 'Philemon' },
  { re: /^The Epistle of Paul the Apostle to the Hebrews\b/i, book: 'Hebrews' },
  { re: /^The General Epistle of James\b/i, book: 'James' },
  { re: /^The First Epistle General of Peter\b/i, book: '1 Peter' },
  { re: /^The Second Epistle General of Peter\b/i, book: '2 Peter' },
  { re: /^The Second General Epistle of Peter\b/i, book: '2 Peter' },
  { re: /^The First Epistle General of John\b/i, book: '1 John' },
  { re: /^The Second Epistle General of John\b/i, book: '2 John' },
  { re: /^The Third Epistle General of John\b/i, book: '3 John' },
  { re: /^The General Epistle of Jude\b/i, book: 'Jude' },
  { re: /^The Revelation of Saint John the Divine\b/i, book: 'Revelation' },
  { re: /^The Revelation of Saint John the Devine\b/i, book: 'Revelation' },
  { re: /^The Revelation of Saint John the\b/i, book: 'Revelation' }
];

function normalizeWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function isPageMarker(line) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/.test(line.trim());
}

function looksLikeBookTitleLine(line) {
  const t = line.trim();
  if (!t) return false;
  return BOOK_HEADER_PATTERNS.some((p) => p.re.test(t));
}

function matchBookFromHeader(line) {
  const t = line.trim();
  for (const p of BOOK_HEADER_PATTERNS) {
    if (p.re.test(t)) return p.book;
  }
  return null;
}

function detectBookAt(lines, i) {
  const t = (lines[i] ?? '').trim();
  if (!t) return null;

  // 1) Direct single-line matches
  const direct = matchBookFromHeader(t);
  if (direct) return { book: direct, consumed: 1 };

  const next = (lines[i + 1] ?? '').trim();
  if (!next) return null;

  // 2) Two-line patterns (common in this PDF)
  // e.g. "The First Book of Moses: Called" + "Genesis"
  const combined = normalizeWhitespace(`${t} ${next}`);
  const combinedMatch = matchBookFromHeader(combined);
  if (combinedMatch) return { book: combinedMatch, consumed: 2 };

  // e.g. "The Gospel According to Saint" + "Matthew"
  if (/^The Gospel According to Saint\b/i.test(t)) {
    const upper = next.toUpperCase();
    const canon = BOOKS_UPPER_TO_CANON[upper];
    if (canon && ['Matthew', 'Mark', 'Luke', 'John'].includes(canon)) {
      return { book: canon, consumed: 2 };
    }
  }

  // e.g. "The Second Book of the" + "Chronicles"
  if (/^The\s+Second\s+Book\s+of\s+the\b/i.test(t) && /^Chronicles\b/i.test(next)) {
    return { book: '2 Chronicles', consumed: 2 };
  }

  // 3) Kings special-case: the PDF uses "The First Book of the Kings" for both,
  // then distinguishes with "The Third/Fourth Book of the Kings" a few lines later.
  if (/^The First Book of the Kings\b/i.test(t) || /^The Second Book of the Kings\b/i.test(t)) {
    for (let j = 1; j <= 8; j++) {
      const look = (lines[i + j] ?? '').trim();
      if (!look) continue;
      if (/^The Third Book of the Kings\b/i.test(look)) return { book: '1 Kings', consumed: j + 1 };
      if (/^The Fourth Book of the Kings\b/i.test(look)) return { book: '2 Kings', consumed: j + 1 };
    }

    // Fallback if the disambiguation markers aren't present.
    if (/^The Second Book of the Kings\b/i.test(t)) return { book: '2 Kings', consumed: 1 };
    return { book: '1 Kings', consumed: 1 };
  }

  return null;
}

function extractVerseRefTokens(text) {
  // KJV Duke Classics has verses like "1:1 In the beginning..." and can contain multiple refs on one line.
  const re = /(^|\s)(\d{1,3}):(\d{1,3})(?=\s)/g;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push({ index: m.index + (m[1] ? m[1].length : 0), chapter: Number(m[2]), verse: Number(m[3]) });
  }
  if (matches.length === 0) return [];

  const tokens = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(start, end);
    const cleaned = normalizeWhitespace(chunk.replace(/^\d{1,3}:\d{1,3}\s*/, ''));
    if (cleaned) tokens.push({ chapter: matches[i].chapter, verse: matches[i].verse, text: cleaned });
  }

  return tokens;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const inputTxtPath = path.join(projectRoot, 'tmp', 'kjv.txt');
  const outDir = path.join(projectRoot, 'data_private', 'bibles');
  const outJsonPath = path.join(outDir, 'kjv.json');

  const raw = await fs.readFile(inputTxtPath, 'utf-8');
  const lines = raw.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd());

  const result = {};

  let started = false;
  let currentBook = null;
  let currentChapter = 0;
  let currentVerse = 0;

  function lookaheadHasVerseRef(fromIndex, maxLookahead) {
    const end = Math.min(lines.length - 1, fromIndex + maxLookahead);
    for (let k = fromIndex; k <= end; k++) {
      const s = (lines[k] ?? '').trim();
      if (!s) continue;
      if (isPageMarker(s)) continue;
      if (/\b\d{1,3}:\d{1,3}\b/.test(s)) return true;
    }
    return false;
  }

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (isPageMarker(t)) continue;

    const det = detectBookAt(lines, i);
    if (det?.book) {
      // Avoid table-of-contents contamination: only start when we hit the REAL Genesis,
      // i.e. a Genesis header that is followed shortly by verse refs.
      if (!started) {
        if (det.book !== 'Genesis') {
          continue;
        }

        if (!lookaheadHasVerseRef(i, 12)) {
          continue;
        }

        started = true;
      }

      currentBook = det.book;
      currentChapter = 0;
      currentVerse = 0;

      i += Math.max(0, det.consumed - 1);
      continue;
    }

    if (!started || !currentBook) continue;

    const tokens = extractVerseRefTokens(t);
    if (tokens.length === 0) {
      // continuation line
      if (currentChapter > 0 && currentVerse > 0) {
        const prev = result[currentBook]?.[String(currentChapter)]?.[String(currentVerse)];
        if (typeof prev === 'string') {
          result[currentBook][String(currentChapter)][String(currentVerse)] = normalizeWhitespace(`${prev} ${t}`);
        }
      }
      continue;
    }

    for (const tok of tokens) {
      currentChapter = tok.chapter;
      currentVerse = tok.verse;

      if (!result[currentBook]) result[currentBook] = {};
      if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
      result[currentBook][String(currentChapter)][String(currentVerse)] = tok.text;
    }
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outJsonPath, JSON.stringify(result), 'utf-8');

  const bookCount = Object.keys(result).length;
  console.log(`Wrote KJV JSON to: ${outJsonPath}`);
  console.log(`Books detected: ${bookCount}`);
  console.log(`Genesis chapters: ${Object.keys(result.Genesis ?? {}).length}`);
  console.log(`Genesis 1:1: ${result?.Genesis?.['1']?.['1'] ?? '(missing)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
