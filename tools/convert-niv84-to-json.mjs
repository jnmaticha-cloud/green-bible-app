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

const BOOKS_UPPER_NOSPACE_TO_CANON = Object.fromEntries(
  CANON_BOOKS.map((b) => [b.toUpperCase().replace(/\s+/g, ''), b])
);

const BOOK_INDEX = new Map(CANON_BOOKS.map((b, i) => [b, i]));

function strippedBookUpper(bookName) {
  return String(bookName || '')
    .trim()
    .toUpperCase()
    .replace(/^(?:1|2|3)\s+/, '');
}

function lookaheadHasPageHeaderForChapter(lines, i, currentBook, chapterNum) {
  if (!currentBook || !chapterNum) return false;
  const bookUpper = strippedBookUpper(currentBook);
  // Scan a small window for a page header referencing this exact chapter.
  // Example: "GENESIS 28:2" or "15 \tGENESIS 28:2"
  const re = new RegExp(`^(?:\\d+\\s+)?${bookUpper}\\s+${chapterNum}:\\d+\\b`);
  for (let j = 1; j <= 25; j++) {
    const t = String(lines[i + j] ?? '').trim();
    if (!t) continue;
    if (re.test(t)) return true;
    // Stop early if we hit another clear chapter/verse start; reduces false positives.
    if (/^\d{1,3}\s+/.test(t) && j >= 5) break;
  }
  return false;
}

function lineHasEarlyVerseFlow(textAfterChapter) {
  // Some chapter starts include verse 1 and verse 2 inline:
  // "8 1Then ... 2If you refuse ..."
  const s = String(textAfterChapter ?? '').trim();
  if (!s) return false;
  if (!/^1(?=[:A-Za-z“(‘’])/.test(s)) return false;
  const tokens = extractVerseTokens(s);
  if (tokens.length < 2) return false;
  return tokens[0].num === 1 && tokens.some((t) => t.num === 2);
}

function lineHasImplicitVerse1ThenVerse2(textAfterChapter) {
  // Some chapter starts omit the explicit "1" but contain verse 2 inline:
  // "14 Then the LORD said ..., 2\"Tell ...\""
  const s = String(textAfterChapter ?? '').trim();
  if (!s) return false;
  // Must start with real text (implicit verse 1), not a verse number.
  if (/^\d/.test(s)) return false;
  const tokens = extractVerseTokens(s);
  if (tokens.length === 0) return false;
  // If the first detected token is verse 2, that's a strong chapter-start signal.
  return tokens[0].num === 2;
}

function lineContainsVerseOneToken(textAfterChapter) {
  // Some lines begin with the previous chapter's last verse but contain the next chapter's verse 1 later:
  // "... 36 master craftsmen and designers. 1So Bezalel, ..."
  const s = String(textAfterChapter ?? '').trim();
  if (!s) return false;
  return /(^|\s)1(?=[:A-Za-z“(‘’])/.test(s);
}

function splitImplicitVerse1FromVerse2(textAfterChapter) {
  const s = String(textAfterChapter ?? '').trim();
  if (!s) return null;
  if (/^\d/.test(s)) return null;

  const m = s.match(/(^|\s)2(?=[:A-Za-z“(‘’])/);
  if (!m || typeof m.index !== 'number') return null;

  const idx = m.index + (m[1]?.length ?? 0);
  const v1 = normalizeWhitespace(s.slice(0, idx).trim());
  const rest = s.slice(idx).trim();
  if (!v1 || !/^2(?=[:A-Za-z“(‘’])/.test(rest)) return null;
  return { v1, rest };
}

function lookaheadHasEarlyVerseFlow(lines, i) {
  // For true chapter starts, NIV often shows verse 2 very soon after:
  // - next line starts with "2" ("2 Now ...")
  // - or the next line contains " 2Now" / " 2Go" etc.
  for (let j = 1; j <= 6; j++) {
    const t = String(lines[i + j] ?? '').trim();
    if (!t) continue;
    if (isPageMarker(t)) continue;
    if (isFootnoteLine(t)) continue;
    if (/^2\s+/.test(t)) return true;
    if (/\b2(?=[A-Za-z“(‘’])/.test(t)) return true;
    // If we hit a new heading before verse 2 appears, bail.
    if (isHeadingLine(t)) return false;
  }
  return false;
}

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
  if (s === 'SONG OF SONGS') s = 'SONG OF SONGS';

  return s;
}

function normalizeWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function isPageMarker(line) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/.test(line.trim());
}

function isFootnoteLine(line) {
  // Typical NIV footnote starts: "a 2 Or ..." or "b 12 Hebrew ..."
  const t = String(line || '').trim();
  if (!t) return false;
  if (/^[a-z]\s+\d+\s+/.test(t)) return true;
  // Wrapped footnote continuations often contain "<letter> <number> That is," mid-line.
  // These should be skipped too, otherwise they can overwrite verse 1 text.
  if (/\b[a-z]\s+\d+\s+That is,\b/i.test(t)) return true;
  if (/\b[a-z]\s+\d+\s+Or\b/i.test(t)) return true;
  if (/\b[a-z]\s+\d+\s+Hebrew\b/i.test(t)) return true;
  return false;
}

function isHeadingLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (t === 'THE' || t === 'Old Testament' || t === 'New Testament') return true;
  // Section headings like "The Beginning", "Adam and Eve" etc.
  return /^[A-Z][A-Za-z'’\- ]{2,}$/.test(t) && !CANON_BOOKS.includes(t);
}

function extractVerseTokens(text) {
  // Returns list of {num, text} in sequence as they appear.
  // Handles patterns: "1 In ..." and inline "2Now ...".
  const re = /(^|\s|[\.,;:!\?\)\]”’])(\d{1,3})(?=\s*[-–—]?\s*[:\p{L}“(‘’])|(^|\s)(\d{2})(?=\d{2,3},\d)|(^|\s)(\d{1,3})(?=\s+\d{1,3},\d)|(^|\s)(\d{2})(?=\d{3,5}\s+[\p{L}“(‘’])|(^|\s)(\d{2})(?=\d{2,4}\s+[\p{L}“(‘’])|(?<=\p{L})(\d{1,3})(?=\s*[-–—]?\s*[:\p{L}“(‘’])/gu;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const leadSpace = m[1] ?? m[3] ?? m[5] ?? m[7] ?? m[9] ?? '';
    const numStr = m[2] ?? m[4] ?? m[6] ?? m[8] ?? m[10] ?? m[11];
    if (!numStr) continue;

    const num = Number(numStr);
    // Psalm 119 has the largest verse count (176). Larger numbers in text are almost
    // always list counts, measurements, or page/cross-ref noise.
    if (!Number.isFinite(num) || num < 1 || num > 176) continue;

    matches.push({ index: m.index + leadSpace.length, num, numLen: String(numStr).length });
  }
  if (matches.length === 0) return [];

  const tokens = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const verseNum = matches[i].num;
    const verseNumLen = matches[i].numLen;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(start, end);
    const cleaned = normalizeWhitespace(chunk.replace(new RegExp(`^\\d{${verseNumLen}}\\s*`), ''));
    if (cleaned) {
      tokens.push({ num: verseNum, text: cleaned });
    }
  }
  return tokens;
}

function detectForcedBookStartLine(t) {
  const line = String(t || '').trim();
  if (!line) return null;

  // Psalms often begins with section headers like "BOOK I", "Psalms 1–41", and then "Psalm 1".
  // If we miss the standalone "Psalms" book title line, we can still reliably enter the book here.
  if (/^Psalms\s+\d{1,3}\s*[–-]\s*\d{1,3}\b/i.test(line) || /^Psalm\s+\d{1,3}\b/i.test(line)) {
    return 'Psalms';
  }

  // Proverbs 1:1 prologue can appear before/without a standalone "Proverbs" header line.
  // Key on the full canonical opening to avoid false positives on later headings.
  if (/^1\s+The proverbs of Solomon\s+son of David,\s+king of Israel\b/i.test(line)) {
    return 'Proverbs';
  }

  if (/^1\s*The elder,/i.test(line)) {
    if (/\bTo\s+the\s+chosen\s+lady\b/i.test(line)) return '2 John';
    if (/\bTo\s+my\s+dear\s+friend\s+Gaius\b/i.test(line)) return '3 John';
  }

  if (/^1\s*Jude,/i.test(line)) return 'Jude';

  // Joshua's real opening can appear before a standalone "Joshua" book header line.
  if (/^1\s+After the death of Moses\b/i.test(line) || /^1\s*After the death of Moses\b/i.test(line)) {
    return 'Joshua';
  }

  // 1 Samuel's opening can appear before the standalone "1 Samuel" title line.
  if (/^1\s+There was a certain man from Ramathaim\b/i.test(line) || /^1\s*There was a certain man from Ramathaim\b/i.test(line)) {
    return '1 Samuel';
  }

  // 2 Samuel opening.
  if (/^1\s+After the death of Saul, David returned\b/i.test(line) || /^1\s*After the death of Saul, David returned\b/i.test(line)) {
    return '2 Samuel';
  }

  // 1 Kings opening.
  if (/^1\s+When King David was old and well advanced\b/i.test(line) || /^1\s*When King David was old and well advanced\b/i.test(line)) {
    return '1 Kings';
  }

  // 2 Kings opening.
  if (/^1\s+After Ahab’s death, Moab rebelled against Israel\b/i.test(line) || /^1\s*After Ahab’s death, Moab rebelled against Israel\b/i.test(line)) {
    return '2 Kings';
  }

  // Exodus often starts before a clean standalone "Exodus" title line.
  if (/^1\s+These are the names of the sons of Israel\b/i.test(line) || /^1\s*These are the names of the sons of Israel\b/i.test(line)) {
    return 'Exodus';
  }

  // Leviticus opening.
  if (
    /^1\s+The LORD called to Moses and spoke to him\b/i.test(line) ||
    /^1\s*The LORD called to Moses and spoke to him\b/i.test(line)
  ) {
    return 'Leviticus';
  }

  // Numbers opening.
  if (/^1\s+The LORD spoke to Moses in the Tent of Meeting\b/i.test(line) || /^1\s*The LORD spoke to Moses in the Tent of Meeting\b/i.test(line)) {
    return 'Numbers';
  }

  // Deuteronomy opening.
  if (/^1\s+These are the words Moses spoke to all Israel\b/i.test(line) || /^1\s*These are the words Moses spoke to all Israel\b/i.test(line)) {
    return 'Deuteronomy';
  }

  // Ezra opening.
  if (
    /^1\s+In the first year of Cyrus king of Persia,\s*in order to ful-\b/i.test(line) ||
    /^1\s*In the first year of Cyrus king of Persia,\s*in order to ful-\b/i.test(line) ||
    /^1\s+In the first year of Cyrus king of Persia,\s*in order to fulfill\b/i.test(line) ||
    /^1\s*In the first year of Cyrus king of Persia,\s*in order to fulfill\b/i.test(line) ||
    /^1\s+In the first year of Cyrus king of Persia,\s*in order to fulfil\b/i.test(line) ||
    /^1\s*In the first year of Cyrus king of Persia,\s*in order to fulfil\b/i.test(line)
  ) {
    return 'Ezra';
  }

  // Nehemiah opening.
  if (/^1\s+The words of Nehemiah son of Hacaliah:/i.test(line) || /^1\s*The words of Nehemiah son of Hacaliah:/i.test(line)) {
    return 'Nehemiah';
  }

  // Esther opening.
  if (
    /^1\s+This is what happened during the time of Xerxes,/i.test(line) ||
    /^1\s*This is what happened during the time of Xerxes,/i.test(line)
  ) {
    return 'Esther';
  }

  // Job opening.
  if (
    /^1\s+In the land of Uz there lived a man whose name was\b/i.test(line) ||
    /^1\s*In the land of Uz there lived a man whose name was\b/i.test(line)
  ) {
    return 'Job';
  }

  // Acts opening.
  if (/^1\s+In my former book,\s*Theophilus,/i.test(line) || /^1\s*In my former book,\s*Theophilus,/i.test(line)) {
    return 'Acts';
  }

  // Ezekiel opening.
  if (/^1\s+In the\b.*\bthirtieth year,/i.test(line) || /^1\s*In the\b.*\bthirtieth year,/i.test(line)) {
    return 'Ezekiel';
  }

  // Judges opening.
  if (/^1\s+After the death of Joshua\b/i.test(line) || /^1\s*After the death of Joshua\b/i.test(line)) {
    return 'Judges';
  }

  // Ruth opening.
  if (/^1\s+In the days when the judges ruled\b/i.test(line) || /^1\s*In the days when the judges ruled\b/i.test(line)) {
    return 'Ruth';
  }

  if (/^1\s*Adam,\s*Seth,\s*Enosh\b/i.test(line)) return '1 Chronicles';

  if (/^1\s*Solomon\s+son\s+of\s+David\s+established\s+himself\b/i.test(line)) return '2 Chronicles';

  if (/^1\s*Peter,\s+an\s+apostle\b/i.test(line)) return '1 Peter';

  if (/^1\s*The revelation of Jesus Christ\b/i.test(line)) return 'Revelation';

  return null;
}

function detectForcedChapterStartFromVerseLine(currentBook, currentChapter, line) {
  const t = String(line ?? '').trim();
  if (!t || !currentBook) return null;

  // Exodus 36 can begin as "1So Bezalel, Oholiab..." immediately after Ex 35:36.
  if (currentBook === 'Exodus' && currentChapter === 35) {
    if (/^1\s*So Bezalel,\s*Oholiab and every skilled person\b/i.test(t)) return 36;
    if (/^36\s+master craftsmen and designers\b/i.test(t)) return 36;
  }

  // Exodus 33/34 can begin as a verse-like line immediately after the previous chapter.
  // Example raw text: "33 Then the LORD said to Moses..." / "34 The LORD said to Moses..."
  if (currentBook === 'Exodus') {
    if (currentChapter === 32 && /^33\s+Then the LORD said to Moses\b/i.test(t)) return 33;
    if (currentChapter === 33 && /^34\s+The LORD said to Moses\b/i.test(t)) return 34;
    if (currentChapter === 36 && /^37\s+Bezalel made the ark\b/i.test(t)) return 37;
  }

  // Leviticus chapter starts can also appear as verse-like lines.
  if (currentBook === 'Leviticus') {
    if (currentChapter === 21 && /^22\s+The LORD said to Moses\b/i.test(t)) return 22;
    if (currentChapter === 22 && /^23\s+The LORD said to Moses\b/i.test(t)) return 23;
    if (currentChapter === 23 && /^24\s+The LORD said to Moses\b/i.test(t)) return 24;
  }

  // Deuteronomy chapter starts can appear as verse-like lines.
  if (currentBook === 'Deuteronomy') {
    if (currentChapter === 21 && /^22\s+If you see your brother[’']s ox\b/i.test(t)) return 22;
    if (currentChapter === 23 && /^24\s+If a man marries a woman\b/i.test(t)) return 24;
    if (currentChapter === 24 && /^25\s+When men have a dispute\b/i.test(t)) return 25;
    if (currentChapter === 25 && /^26\s+When you have entered the land\b/i.test(t)) return 26;
  }

  // 1 Samuel chapter starts are sometimes formatted as "4 And ..." without additional chapter-start cues.
  if (currentBook === '1 Samuel') {
    if (currentChapter === 3 && /^4\s+And Samuel’s word came to all Israel\b/i.test(t)) return 4;
    if (currentChapter === 4 && /^5\s+After the Philistines had captured the ark of God\b/i.test(t)) return 5;
    if (currentChapter === 5 && /^6\s+When the ark of the LORD had been in Philistine\b/i.test(t)) return 6;
    if (currentChapter === 6 && /^7\s+1So the men of Kiriath Jearim\b/i.test(t)) return 7;
  }

  if (currentBook === '1 Chronicles') {
    if (currentChapter === 8 && /^9\s+All Israel was listed in the genealogies recorded\b/i.test(t)) return 9;
    if (currentChapter === 9 && /^10\s+Now the Philistines fought against Israel\b/i.test(t)) return 10;
    if (currentChapter === 21 && /^22\s+Then David said,\s*“The house of the LORD God is to\b/i.test(t)) return 22;
    if (currentChapter === 22 && /^23\s+When David was old and full of years,\s*he made\b/i.test(t)) return 23;
  }

  // 2 Chronicles 14 can appear immediately after 2 Chronicles 13 as a verse-like line:
  // "14 And Abijah rested with his fathers..."
  if (currentBook === '2 Chronicles' && currentChapter === 13) {
    if (/^14\s+And Abijah rested with his fathers\b/i.test(t)) return 14;
  }

  // 2 Chronicles 23 can appear immediately after 2 Chronicles 22 as a verse-like line:
  // "23 In the seventh year Jehoiada showed his strength."
  if (currentBook === '2 Chronicles' && currentChapter === 22) {
    if (/^23\s+In the seventh year Jehoiada showed his strength\b/i.test(t)) return 23;
  }

  // 2 Chronicles 31 can appear immediately after 2 Chronicles 30 as a verse-like line:
  // "31 When all this had ended, the Israelites..."
  if (currentBook === '2 Chronicles' && currentChapter === 30) {
    if (/^31\s+When all this had ended, the Israelites\b/i.test(t)) return 31;
  }

  // Job 24 can appear immediately after Job 23 as a verse-like line:
  // "24 “Why does the Almighty not set times for judgment?"
  if (currentBook === 'Job' && currentChapter === 23) {
    if (/^24\s+[“"]?Why does the Almighty not set times for\b/i.test(t)) return 24;
  }

  return null;
}

function detectForcedChapterStart(currentBook, line) {
  const t = String(line ?? '').trim();
  if (!t || !currentBook) return null;

  // Exodus 15 can be misparsed due to noisy headers/footers; anchor it by its unique opening.
  if (currentBook === 'Exodus') {
    const m = t.match(/^(15)\s+Then Moses and the Israelites sang\b/i);
    if (m) return 15;

    const m21 = t.match(/^(21)\s+“These are the laws you are to set before them:/i);
    if (m21) return 21;

    const m22 = t.match(/^(22)\s+“If a man steals an ox or a sheep\b/i);
    if (m22) return 22;

    const m23 = t.match(/^(23)\s+“Do not spread false reports\b/i);
    if (m23) return 23;
  }

  if (currentBook === 'Judges') {
    const m3 = t.match(/^(3)\s+These are the nations the LORD left\b/i);
    if (m3) return 3;

    const m4 = t.match(/^(4)\s+After Ehud died, the Israelites once again did evil\b/i);
    if (m4) return 4;
  }

  return null;
}

function looksLikeStandaloneBookHeaderAt(lines, i) {
  // The extracted text sometimes contains Title-Case words that match canonical book names
  // (e.g. "Judges") as section headings inside other books. A real book header is typically
  // near a page marker.
  let inFootnotes = false;
  for (let j = 1; j <= 30; j++) {
    const look = String(lines[i + j] ?? '').trim();
    if (!look) continue;
    if (isPageMarker(look)) return true;
    if (isFootnoteLine(look)) {
      inFootnotes = true;
      continue;
    }

    // Footnote continuation lines in NIV84 often start with lowercase (e.g. "and 20. c 6 ...").
    if (inFootnotes) {
      // Keep scanning until the page marker; footnote continuation can start with any case.
      continue;
    }

    if (/^[a-z]/.test(look)) continue;

    // If we see verse-like content before a page marker, it's not a standalone book header.
    if (/^\d/.test(look)) break;

    // If we hit regular content before a page marker, this isn't a standalone book header.
    break;
  }
  return false;
}

function detectForcedBookStartAt(lines, i) {
  const t = String(lines[i] ?? '').trim();
  const direct = detectForcedBookStartLine(t);
  if (direct) return direct;

  if (/^1\s*The elder,/i.test(t)) {
    const next = String(lines[i + 1] ?? '').trim();
    if (/^To\s+the\s+chosen\s+lady\b/i.test(next)) return '2 John';
    if (/^To\s+my\s+dear\s+friend\s+Gaius\b/i.test(next)) return '3 John';
  }

  if (/^1\s*Paul,\s+Silas\b/i.test(t) || /^1\s+Paul,\s+Silas\b/i.test(t)) {
    const next = String(lines[i + 1] ?? '').trim();
    const next2 = String(lines[i + 2] ?? '').trim();
    const joined = `${next} ${next2}`;
    if (/\bTo\s+the\s+church\s+of\s+the\s+Thessalonians\b/i.test(joined)) {
      if (/\bin\s+God\s+our\s+Father\b/i.test(joined)) return '2 Thessalonians';
      if (/\bin\s+God\s+the\s+Father\b/i.test(joined)) return '1 Thessalonians';
      return '1 Thessalonians';
    }
  }

  return null;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const inputTxtPath = path.join(projectRoot, 'tmp', 'niv84.txt');
  const outDir = path.join(projectRoot, 'data_private', 'bibles');
  const outJsonPath = path.join(outDir, 'niv.json');

  const raw = await fs.readFile(inputTxtPath, 'utf-8');

  // Repair hyphenated line breaks ("emp-\n ty" -> "empty")
  const dehyphenated = raw.replace(/-\n([a-z])/g, '$1');

  const lines = dehyphenated
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd());

  const result = {};

  let currentBook = null;
  let currentChapter = 0;
  let currentVerse = 0;
  let chapterVerseCount = 0;
  let lastWasHeading = false;
  let inFootnotes = false;
  let lastWasPageMarker = false;

  // Heuristic starting point: the first occurrence of "The Beginning" followed by "1 In the beginning..."
  // is Genesis 1.
  let started = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (!t) continue;
    if (isPageMarker(t)) {
      inFootnotes = false;
      lastWasPageMarker = true;
      continue;
    }

    // Any non-page-marker line clears the page-marker context.
    // (Used to decide if a leading number is more likely a chapter start.)
    // NOTE: Do not clear when we're continuing to skip footnotes below.

    if (!started) {
      if (t === 'The Beginning') {
        const next = (lines[i + 1] ?? '').trim();
        if (/^1\s+In the beginning\b/i.test(next)) {
          started = true;
          currentBook = 'Genesis';
          currentChapter = 1;
          currentVerse = 0;
          chapterVerseCount = 0;
        }
      }
      continue;
    }

    const forcedBook = detectForcedBookStartAt(lines, i);
    if (forcedBook && forcedBook !== currentBook) {
      currentBook = forcedBook;
      currentChapter = 0;
      currentVerse = 0;
      chapterVerseCount = 0;
      lastWasHeading = false;
      lastWasPageMarker = false;
    }

    // Book header lines can appear (Title Case) e.g., "Genesis" as a page header.
    // Treat a repeated book name as a page header and DO NOT reset state, otherwise
    // we can lose chapter/verse tracking mid-book.
    if (CANON_BOOKS.includes(t)) {
      if (currentBook && t === currentBook) {
        continue;
      }

      if (currentBook && !looksLikeStandaloneBookHeaderAt(lines, i)) {
        continue;
      }

      // The extracted NIV84 text can contain out-of-order short-epistle title lines
      // (e.g. "2 John" and "3 John") that appear AFTER the book content.
      // Never allow book navigation to go backwards.
      if (currentBook) {
        const curIdx = BOOK_INDEX.get(currentBook);
        const nextIdx = BOOK_INDEX.get(t);
        if (Number.isFinite(curIdx) && Number.isFinite(nextIdx) && nextIdx <= curIdx) {
          continue;
        }
      }
      currentBook = t;
      currentChapter = 0;
      currentVerse = 0;
      chapterVerseCount = 0;
      lastWasHeading = false;
      continue;
    }

    // Skip footnote lines BEFORE trying to interpret any "BOOK CH:V" patterns as page headers.
    // Otherwise lines like "86  NUMBERS 22:17" can rewind chapter state mid-flow.
    if (isFootnoteLine(t)) {
      inFootnotes = true;
      lastWasPageMarker = false;
      continue;
    }

    // Page header style: "GENESIS 6:9" or prefixed with page number: "2 \tGENESIS 2:10"
    // Also supports headers where the book begins with a number: "1 SAMUEL 3:19".
    const headerMatch = t.match(/^(?:\d+\s+)?((?:[1-3]\s+)?[A-Z][A-Z0-9 ]+?)\s+(\d{1,3}):(\d{1,3})\b/);
    if (headerMatch) {
      const bookUpper = normalizeBookHeaderUpper(headerMatch[1]);
      let book = BOOKS_UPPER_TO_CANON[bookUpper] ?? null;

      if (!book) {
        const noSpace = bookUpper.replace(/\s+/g, '');
        book = BOOKS_UPPER_NOSPACE_TO_CANON[noSpace] ?? null;
      }

      // Some headers omit the leading book number (e.g., "SAMUEL" while currentBook is "1 Samuel").
      if (!book && currentBook) {
        const strippedCurrentUpper = currentBook.toUpperCase().replace(/^(?:1|2|3)\s+/, '');
        if (bookUpper === strippedCurrentUpper) {
          book = currentBook;
        }
      }

      if (book) {
        const headerChapter = Number(headerMatch[2]);
        const headerVerse = Number(headerMatch[3]);
        const curIdx = currentBook ? BOOK_INDEX.get(currentBook) : undefined;
        const nextIdx = BOOK_INDEX.get(book);

        // Ignore backward headers entirely.
        if (Number.isFinite(curIdx) && Number.isFinite(nextIdx) && nextIdx < curIdx) {
          continue;
        }

        // Same-book page header: accept only if it does not rewind chapter/verse.
        if (currentBook === book && currentChapter > 0) {
          inFootnotes = false;
          if (headerChapter < currentChapter) {
            continue;
          }
          if (headerChapter === currentChapter && headerVerse < currentVerse) {
            continue;
          }

          currentChapter = headerChapter;
          currentVerse = headerVerse;
          chapterVerseCount = Math.max(0, currentVerse - 1);
          lastWasHeading = false;
          continue;
        }

        // New-book (or uninitialized) header: accept if we haven't started a chapter yet, or it moves forward to a new book.
        if (!currentBook || currentChapter === 0 || (Number.isFinite(curIdx) && Number.isFinite(nextIdx) && nextIdx > curIdx)) {
          currentBook = book;
          currentChapter = headerChapter;
          currentVerse = headerVerse;
          chapterVerseCount = Math.max(0, currentVerse - 1);
          lastWasHeading = false;
          inFootnotes = false;
        }
        continue;
      }
    }

    if (isFootnoteLine(t)) {
      inFootnotes = true;
      continue;
    }

    // Footnotes often wrap across multiple lines; skip until we hit a new verse/chapter/heading.
    if (inFootnotes) {
      if (/^\d/.test(t) || CANON_BOOKS.includes(t) || isHeadingLine(t)) {
        inFootnotes = false;
      } else {
        continue;
      }
    }

    // Psalms are formatted as "Psalm 23" headings followed by verse-numbered lines.
    if (currentBook === 'Psalms') {
      const ps = t.match(/^Psalm\s+(\d{1,3})\b/i);
      if (ps) {
        currentChapter = Number(ps[1]);
        currentVerse = 0;
        chapterVerseCount = 0;
        lastWasHeading = false;
        continue;
      }
    }

    if (isHeadingLine(t)) {
      lastWasHeading = true;
      continue;
    }

    if (!currentBook) {
      continue;
    }

    // Some books begin with a chapter number (e.g., "3 Brothers, ..." or "3Brothers..." meaning 3:1)
    // and then embed verse numbers inline (e.g., "2I gave you...").
    // NOTE: Many verse numbers are also prefixed like "2Now ...". To avoid misclassifying those
    // as chapter numbers, we only treat it as a chapter start when:
    // - currentChapter === 0 (new book), OR
    // - it increments by 1 and we've already collected many verses in the current chapter.
    const chapterStart = t.match(/^(\d{1,3})(\s*)(?=[:0-9A-Za-z“(‘’])/);

    if (chapterStart) {
      const n = Number(chapterStart[1]);
      const gap = chapterStart[2] ?? '';
      const textAfter = normalizeWhitespace(t.replace(/^\d{1,3}\s*/, ''));

      // Guard: NIV84 layout around Numbers 23 can place verse 24 at a page break.
      // The line "24 The people rise like a lioness" is Numbers 23:24, not chapter 24.
      if (currentBook === 'Numbers' && currentChapter === 23 && n === 24 && /\bThe people rise like a lioness\b/i.test(textAfter)) {
        // Do not treat as a chapter transition; let normal verse token parsing handle it.
      } else if (currentBook === '1 Chronicles' && currentChapter === 2 && n === 3 && /\bThe sons of Judah\b/i.test(textAfter)) {
        // 1 Chronicles 2:3 is a verse line, not a chapter transition.
      } else if (currentBook === 'Job' && currentChapter === 14 && n === 15 && /^You will call and I will answer you;/i.test(textAfter)) {
        // Job 14:15 is formatted like a chapter number, but it's a verse number.
      } else {
        const forcedChapter = detectForcedChapterStart(currentBook, t);
        if (forcedChapter && forcedChapter !== currentChapter) {
          currentChapter = forcedChapter;
          currentVerse = 0;
          chapterVerseCount = 0;
          lastWasHeading = false;

          const synthetic = `1 ${textAfter}`;
          const tokens = extractVerseTokens(synthetic);
          if (tokens.length > 0) {
            for (const tok of tokens) {
              if (!result[currentBook]) result[currentBook] = {};
              if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
              result[currentBook][String(currentChapter)][String(tok.num)] = tok.text;
              currentVerse = tok.num;
              chapterVerseCount = Math.max(chapterVerseCount, tok.num);
            }
            continue;
          }
          if (textAfter) {
            if (!result[currentBook]) result[currentBook] = {};
            if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
            result[currentBook][String(currentChapter)]['1'] = textAfter;
            currentVerse = 1;
            chapterVerseCount = Math.max(chapterVerseCount, 1);
            continue;
          }
        }

        // Heuristics:
        // - If we're at a new book (currentChapter=0), treat the first leading number as the chapter.
        // - Otherwise, only treat it as a chapter transition if it increments by 1 and the prior chapter has many verses.
        //   This avoids misclassifying verse numbers like "2 Now..." as chapter 2.
        // Extra guard when currentChapter===0: if the leading number is large (e.g. "23Then...")
        // it's almost certainly a verse number, not a chapter number. Also prefer cases where
        // there's an actual space after the digits ("3 Brothers") for chapter starts.
        const hasSpace = gap.length > 0;

        const verseContinuationLikely =
          currentChapter > 0 &&
          n === currentChapter + 1 &&
          // If we're currently around verse (n-1), the leading n is extremely likely to be verse n.
          // Example: Numbers 23:24 can be misread as chapter 24.
          (currentVerse >= n - 3 && currentVerse <= n + 3) &&
          // If we've already seen verses up to (n-1), then a leading n is more likely a verse number.
          chapterVerseCount >= n - 1 &&
          // Only block when we lack stronger chapter evidence.
          !lastWasHeading &&
          !lookaheadHasPageHeaderForChapter(lines, i, currentBook, n) &&
          !lookaheadHasEarlyVerseFlow(lines, i) &&
          !lineHasEarlyVerseFlow(textAfter) &&
          !lineHasImplicitVerse1ThenVerse2(textAfter) &&
          !lineContainsVerseOneToken(textAfter);

        const allowHeaderLookaheadAsEvidence =
          n <= 9 ||
          currentChapter <= 5 ||
          lastWasHeading ||
          lineHasEarlyVerseFlow(textAfter) ||
          lineHasImplicitVerse1ThenVerse2(textAfter) ||
          lineContainsVerseOneToken(textAfter);

        const strongVerseContinuationLikely =
          currentChapter > 0 &&
          n === currentChapter + 1 &&
          currentVerse >= n - 2 &&
          currentVerse <= n + 3 &&
          chapterVerseCount >= n - 1 &&
          !lastWasHeading &&
          !lastWasPageMarker &&
          typeof textAfter === 'string' &&
          /^[A-Za-z]/.test(textAfter) &&
          !/^“/.test(textAfter);

        const lateChapterTransitionLikely =
          currentChapter > 0 &&
          n === currentChapter + 1 &&
          hasSpace &&
          textAfter &&
          !lastWasHeading &&
          !lastWasPageMarker &&
          currentVerse >= 10 &&
          chapterVerseCount >= 10 &&
          typeof textAfter === 'string' &&
          /^[A-Z]/.test(textAfter) &&
          !/^“/.test(textAfter);

        const shouldTreatAsChapter =
          (currentChapter === 0 && ((n === 1) || (n <= 9 && (hasSpace || lastWasHeading))) && textAfter) ||
          (n === currentChapter + 1 &&
            hasSpace &&
            textAfter &&
            (!strongVerseContinuationLikely &&
              !verseContinuationLikely &&
              (lastWasHeading ||
                (lastWasPageMarker && (n <= 9 || currentChapter <= 5)) ||
                (lookaheadHasPageHeaderForChapter(lines, i, currentBook, n) && allowHeaderLookaheadAsEvidence) ||
                lookaheadHasEarlyVerseFlow(lines, i) ||
                lineHasEarlyVerseFlow(textAfter) ||
                lineHasImplicitVerse1ThenVerse2(textAfter) ||
                lineContainsVerseOneToken(textAfter) ||
                lateChapterTransitionLikely)));

        if (shouldTreatAsChapter) {
          const forcedAtChapter = detectForcedBookStartLine(`${n} ${textAfter}`);
          if (forcedAtChapter && forcedAtChapter !== currentBook) {
            currentBook = forcedAtChapter;
          }

          currentChapter = n;
          currentVerse = 0;
          chapterVerseCount = 0;
          lastWasHeading = false;

          // Parse the rest of the line as verses in this chapter. Prefer real verse tokens if present.
          let tokens = extractVerseTokens(textAfter);
          let implicitVerse1 = null;
          if (tokens.length > 0 && tokens[0].num === 2 && !/^\d/.test(String(textAfter ?? '').trim())) {
            const split = splitImplicitVerse1FromVerse2(textAfter);
            if (split) {
              implicitVerse1 = split.v1;
              tokens = extractVerseTokens(split.rest);
            }
          }
          if (tokens.length === 0) {
            const synthetic = `1 ${textAfter}`;
            tokens = extractVerseTokens(synthetic);
          }
          if (tokens.length > 0) {
            if (implicitVerse1) {
              if (!result[currentBook]) result[currentBook] = {};
              if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
              result[currentBook][String(currentChapter)]['1'] = implicitVerse1;
              currentVerse = 1;
              chapterVerseCount = Math.max(chapterVerseCount, 1);
            }
            for (const tok of tokens) {
              if (!result[currentBook]) result[currentBook] = {};
              if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
              result[currentBook][String(currentChapter)][String(tok.num)] = tok.text;
              currentVerse = tok.num;
              chapterVerseCount = Math.max(chapterVerseCount, tok.num);
            }
            continue;
          }

          // If we couldn't detect tokens, still store verse 1.
          if (textAfter) {
            if (!result[currentBook]) result[currentBook] = {};
            if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
            result[currentBook][String(currentChapter)]['1'] = textAfter;
            currentVerse = 1;
            chapterVerseCount = 1;
            continue;
          }
        }
      }
    }

    // Extract verse tokens from the current line.
    const tokens = extractVerseTokens(t);
    if (tokens.length === 0) {
      // Continuation line.
      if (currentBook && currentChapter > 0 && currentVerse > 0) {
        const prev = result[currentBook]?.[String(currentChapter)]?.[String(currentVerse)];
        if (typeof prev === 'string') {
          const merged = normalizeWhitespace(`${prev} ${t}`);
          result[currentBook][String(currentChapter)][String(currentVerse)] = merged;
        }
      }

      // We have consumed a real content line; page-marker context no longer applies.
      lastWasPageMarker = false;
      continue;
    }

    lastWasHeading = false;

    const forcedChapterFromVerse = detectForcedChapterStartFromVerseLine(currentBook, currentChapter, t);
    if (forcedChapterFromVerse && forcedChapterFromVerse !== currentChapter) {
      currentChapter = forcedChapterFromVerse;
      currentVerse = 0;
      chapterVerseCount = 0;

      // Treat this same line as the start of the new chapter (verse 1), not as verse (chapterNum).
      const textAfterChapter = normalizeWhitespace(t.replace(/^\d{1,3}\s*/, ''));
      if (textAfterChapter) {
        const synthetic = `1 ${textAfterChapter}`;
        const chapterTokens = extractVerseTokens(synthetic);
        if (chapterTokens.length > 0) {
          for (const tok of chapterTokens) {
            if (!result[currentBook]) result[currentBook] = {};
            if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
            result[currentBook][String(currentChapter)][String(tok.num)] = tok.text;
            currentVerse = tok.num;
            chapterVerseCount = Math.max(chapterVerseCount, tok.num);
          }
        } else {
          if (!result[currentBook]) result[currentBook] = {};
          if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
          result[currentBook][String(currentChapter)]['1'] = textAfterChapter;
          currentVerse = 1;
          chapterVerseCount = 1;
        }

        lastWasPageMarker = false;
        continue;
      }
    }

    // Ensure chapter exists; if unknown, assume chapter 1.
    if (currentChapter === 0) {
      // If a new book begins mid-chapter (common at page breaks), the first verse numbers
      // can be high (e.g., 23Then...). In that case, we don't know the chapter yet, so skip
      // until we see a real chapter marker (e.g., "3 Early...").
      if (tokens[0]?.num === 1) {
        const forcedAtVerse = detectForcedBookStartLine(`1 ${tokens[0]?.text || ''}`);
        if (forcedAtVerse && forcedAtVerse !== currentBook) {
          currentBook = forcedAtVerse;
        }
        currentChapter = 1;
        currentVerse = 0;
        chapterVerseCount = 0;
      } else {
        continue;
      }
    }

    for (const tok of tokens) {
      if (!result[currentBook]) result[currentBook] = {};
      if (!result[currentBook][String(currentChapter)]) result[currentBook][String(currentChapter)] = {};
      result[currentBook][String(currentChapter)][String(tok.num)] = tok.text;
      currentVerse = tok.num;
      chapterVerseCount = Math.max(chapterVerseCount, tok.num);
    }

    // We have consumed a real content line; page-marker context no longer applies.
    lastWasPageMarker = false;
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outJsonPath, JSON.stringify(result), 'utf-8');

  const bookCount = Object.keys(result).length;
  console.log(`Wrote NIV JSON to: ${outJsonPath}`);
  console.log(`Books detected: ${bookCount}`);
  console.log(`Genesis chapters: ${Object.keys(result.Genesis ?? {}).length}`);
  console.log(`Genesis 1:1: ${result?.Genesis?.['1']?.['1'] ?? '(missing)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
