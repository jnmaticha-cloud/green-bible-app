# Commentary Data

This directory contains biblical commentary files.

## Structure
- Each commentary is a JSON file
- Follows the CommentaryFileFormat schema
- Named as `{author}-sample.json`

## Adding Commentary
1. Create a new JSON file
2. Follow the schema in `src/schemas/CommentaryFileFormat.ts`
3. Include version, author, source, and entries array
