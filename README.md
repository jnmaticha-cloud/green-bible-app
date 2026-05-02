# Green Bible App

A comprehensive Bible application with multiple translations, search functionality, verse comparison, and bookmarking features.

## Features

- **Multiple Bible Versions**: Access various translations including English (ESV, NIV, KJV, etc.), African languages (Swahili, Amharic, Afrikaans), and Kenyan local languages (Ekegusii, Kalenjin, Kikuyu, etc.)
- **Search**: Powerful search capabilities to find verses and passages
- **Compare**: Side-by-side comparison of different translations
- **Bookmarks**: Save and organize your favorite verses
- **Commentary**: Access biblical commentary (Matthew Henry sample included)

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run tests
npm test
```

## Project Structure

```
├── components/      # Frontend components
├── data/           # Bible data and configurations
├── src/            # TypeScript source code
│   ├── database/   # Database models and connection
│   ├── middleware/ # Express middleware
│   └── routes/     # API routes
├── tests/          # Test files
├── docs/           # Documentation
└── tools/          # Utility scripts
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/bibles/versions` - List available Bible versions
- `GET /api/bibles/passage` - Get specific passage
- `GET /api/bibles/search` - Search verses
- `GET /api/bookmarks/:userId` - Get user bookmarks

## License

MIT License
