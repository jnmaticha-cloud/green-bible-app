# Green Bible App

A comprehensive, multi-language Bible study companion with a strong African/Kenyan cultural focus. Supports scripture reading, search, verse comparison, sermon integration, bookmarking, commentary, and PDF viewing.

## Features

- **30+ Bible Translations** — English (KJV, WEB, ASV, BSB, YLT, DRA, NET, LSV...), African languages (Swahili, Amharic, Kikuyu, Dholuo, Ekegusii, Suba), and more
- **Smart Search** — Keyword, reference, verse range, abbreviation, and native-language book names. Falls back to semantic AI search when exact matches fail
- **Verse Comparison** — Side-by-side comparison across up to 4 translations
- **Sermons** — YouTube sermon integration with transcript sync, AI interpretation, bookmarks, playlists, and progress tracking
- **Commentary** — Matthew Henry commentary via helloao.org API
- **Interlinear** — Hebrew/Greek word-by-word breakdown with Strong's numbers
- **PDF Viewer** — Local Bible PDFs with text highlighting (NIV84, ESV, KJV, Ethiopian Orthodox, Amplified)
- **Offline Support** — Service worker caches Bible passages and sermons; Ekegusii Bible served from local text files
- **PWA** — Installable as a standalone app

## Quick Start

```bash
# Install dependencies
npm install

# Initialize the database (first time only)
npm run init-db

# Start the development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
server.ts              ← Active TypeScript server (Express + SQLite)
app.js                 ← Frontend application (GreenBibleApp class)
index.html             ← Main UI shell
sw.js                  ← Service worker (offline caching)
src/
  routes/
    api/bibles.ts      ← Bible passage, search, versions, books endpoints
    api/sermons.ts     ← Sermon CRUD, ingest, search, transcript
    auth.ts            ← JWT login/register/validate
    bookmarks.ts       ← Bookmark CRUD (SQLite)
    commentary.ts      ← Matthew Henry commentary proxy
  middleware/
    authentication.ts  ← JWT verification middleware
  database/
    connection.ts      ← SQLite connection wrapper
data/
  sermons/             ← Cached YouTube sermon JSON files
  bible.db             ← SQLite database (users, bookmarks)
Bible_Books/
  Ebibilia Enchenu/    ← Full Ekegusii Bible (800+ text files)
  Other Materials/     ← Apocrypha, Gospel of Thomas, etc.
tests/
  search/              ← parseVerseReference unit tests
  content/             ← Bible version integration tests
  auth/                ← Authentication tests
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/validate` | Validate JWT token |
| GET | `/api/bibles/versions` | List all Bible versions |
| GET | `/api/bibles/passage` | Fetch passage (`?version=KJV&book=John&chapter=3&verse=16`) |
| GET | `/api/bibles/search` | Keyword/semantic search (`?q=...&versions=KJV,WEB`) |
| GET | `/api/bibles/books/:versionId` | Book list for a version (OT/NT grouped) |
| GET | `/api/bibles/book-names/:langCode` | Native book names for a language |
| GET | `/api/bibles/interlinear` | Hebrew/Greek interlinear (`?reference=John+1:1`) |
| GET | `/api/commentary/:passage` | Matthew Henry commentary |
| GET | `/api/sermons` | List all sermons |
| GET | `/api/sermons/search` | Search sermons (`?q=...`) |
| POST | `/api/sermons/ingest` | Ingest a YouTube sermon |
| GET | `/api/sermons/:id` | Get sermon detail |
| GET | `/api/bookmarks/:userId` | Get user bookmarks |
| POST | `/api/bookmarks` | Create bookmark |
| DELETE | `/api/bookmarks/:id` | Delete bookmark |
| GET | `/api/materials` | List local PDF/DOCX materials |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=sqlite:./data/bible.db
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

## Running Tests

```bash
# Run all tests (requires jsdom: npm install --save-dev jsdom)
npm test

# Run a specific test file
node node_modules/vitest/vitest.mjs run tests/search/parse-verse-reference.test.ts
```

## Bible Version Sources

| Source | Versions |
|--------|----------|
| `bible-api.com` | KJV, WEB, Cherokee, Portuguese |
| `bible.helloao.org` | ESV (BSB), ASV, BBE, YLT, DRA, NET, LSV, Swahili, Kikuyu, Dholuo, Amharic, Kalenjin, Suba |
| Local text files | Ekegusii (Ebibilia Enchenu — full Bible) |
| PDF only | Ethiopian Orthodox, Kamba, Meru, Maasai, Embu |

## License

MIT
