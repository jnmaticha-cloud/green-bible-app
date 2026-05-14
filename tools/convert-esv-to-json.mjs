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

function normalizeBookHeaderUpper(bookUpper) {
  let s = String(bookUpper || '').trim().replace(/\s+/g, ' ');
  // Convert Roman numeral prefixes to Arabic numerals
  s = s
    .replace(/^I\s+/, '1 ')
    .replace(/^II\s+/, '2 ')
    .replace(/^III\s+/, '3 ')
    .replace(/^IV\s+/, '4 ');

  // Common header variants
  if (s === 'PSALM') s = 'PSALMS';
  if (s === 'SONG OF SOLOMON') s = 'SONG OF SONGS';

  return s;
}

function normalizeWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function stripFootnoteMarkers(s) {
  // Remove bracketed footnote markers like [1]
  let out = s.replace(/\[\d+\]/g, '');
  // Remove standalone cross-reference letters like " a " or " b " (ESV uses many of these)
  out = out.replace(/\s+[a-z]\s+(?=[A-Za-z“(])/g, ' ');
  // Normalize spaces after stripping
  return normalizeWhitespace(out);
}

function extractVerseTokens(text) {
  // Returns list of {num, text} in sequence as they appear.
  // ESV often has tokens like "2 The" or "2And".
  const re = /(^|\s)(\d{1,3})(?=\s*[A-Za-z“(\[])/g;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push({ index: m.index + (m[1] ? m[1].length : 0), num: Number(m[2]) });
  }
  if (matches.length === 0) return [];

  const tokens = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const verseNum = matches[i].num;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(start, end);
    const cleaned = stripFootnoteMarkers(chunk.replace(/^\d{1,3}\s*/, ''));
    if (cleaned) tokens.push({ num: verseNum, text: cleaned });
  }

  return tokens;
}

function isPageMarker(line) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/.test(line.trim());
}

function isSkipSectionHeader(line) {
  const t = line.trim();
  return (
    /^CROSS-REFERENCES FOR\b/i.test(t) ||
    /^FOOTNOTES FOR\b/i.test(t) ||
    /^CROSS-REFERENCES\b/i.test(t) ||
    /^FOOTNOTES\b/i.test(t)
  );
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const inputTxtPath = path.join(projectRoot, 'tmp', 'esv.txt');
  const outDir = path.join(projectRoot, 'data_private', 'bibles');
  const outJsonPath = path.join(outDir, 'esv.json');

  const raw = await fs.readFile(inputTxtPath, 'utf-8');
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  const result = {};

  let started = false;
  let inBibleText = false;

  let currentBook = null;
  let currentChapter = 0;
  let currentVerse = 0;

  // Detect lines like "GENESIS 1 In the...", "1 CORINTHIANS 13 ..." or "EXODUS 8 [1] Then..."
  // Allow book headers beginning with digits (1/2/3 John, 1/2 Samuel, etc.)
  const bookChapterRe = /^([0-9A-Z][A-Z0-9 ]+?)\s+(\d{1,3})\b\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const tRaw = lines[i];
    if (!tRaw) continue;

    const t = tRaw.trim();
    if (!t) continue;
    if (isPageMarker(t)) continue;

    if (isSkipSectionHeader(t)) {
      inBibleText = false;
      continue;
    }

    const m = t.match(bookChapterRe);
    if (m) {
      const bookUpper = normalizeBookHeaderUpper(m[1]);
      const book = BOOKS_UPPER_TO_CANON[bookUpper];
      const chapterNum = Number(m[2]);
      const rest = stripFootnoteMarkers(m[3] ?? '');

      if (book && chapterNum > 0) {
        if (!started) {
          if (book === 'Genesis' && chapterNum === 1) {
            started = true;
            inBibleText = true;
          } else {
            continue;
          }
        } else {
          inBibleText = true;
        }

        currentBook = book;
        currentChapter = chapterNum;
        currentVerse = 0;

        if (rest) {
          const synthetic = `1 ${rest}`;
          const tokens = extractVerseTokens(synthetic);
          for (const tok of tokens) {
            if (!result[currentBook]) result[currentBook] = {};
            if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
            result[currentBook][String(currentChapter)][String(tok.num)] = tok.text;
            currentVerse = tok.num;
          }
        }

        continue;
      }
    }

    if (!started || !inBibleText || !currentBook || currentChapter === 0) {
      continue;
    }

    // Verse-numbered line or continuation line.
    const tokens = extractVerseTokens(t);
    if (tokens.length > 0) {
      for (const tok of tokens) {
        if (!result[currentBook]) result[currentBook] = {};
        if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
        result[currentBook][String(currentChapter)][String(tok.num)] = tok.text;
        currentVerse = tok.num;
      }
      continue;
    }

    // Continuation of the previous verse.
    if (currentVerse > 0) {
      const prev = result[currentBook]?.[String(currentChapter)]?.[String(currentVerse)];
      if (typeof prev === 'string') {
        result[currentBook][String(currentChapter)][String(currentVerse)] = stripFootnoteMarkers(`${prev} ${t}`);
      }
    }
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outJsonPath, JSON.stringify(result), 'utf-8');

  const bookCount = Object.keys(result).length;
  console.log(`Wrote ESV JSON to: ${outJsonPath}`);
  console.log(`Books detected: ${bookCount}`);
  console.log(`Genesis chapters: ${Object.keys(result.Genesis ?? {}).length}`);
  console.log(`Genesis 1:1: ${result?.Genesis?.['1']?.['1'] ?? '(missing)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
