import fs from 'fs-extra';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SEED_DIR = path.join(process.cwd(), 'seed-data');

async function bootstrap() {
  console.log('🚀 Bootstrapping data directory...');

  // Ensure data directory exists
  await fs.ensureDir(DATA_DIR);
  await fs.ensureDir(path.join(DATA_DIR, 'sermons'));

  const metadataPath = path.join(DATA_DIR, 'sermons', 'metadata.json');
  const seedMetadataPath = path.join(SEED_DIR, 'sermons', 'metadata.json');

  if (!(await fs.pathExists(metadataPath))) {
    console.log('📦 Persistent data is empty. Seeding from repository...');
    if (await fs.pathExists(SEED_DIR)) {
      await fs.copy(SEED_DIR, DATA_DIR);
      console.log('✅ Data seeded successfully.');
    } else {
      console.log('⚠️ No seed data found at ' + SEED_DIR);
      if (!(await fs.pathExists(metadataPath))) {
        await fs.writeJson(metadataPath, []);
      }
    }
  } else {
    console.log('✨ Persistent data already exists. Merging new content...');
    
    // Copy static files like kjv.json and bibles/bible_versions.js from SEED_DIR if missing
    if (await fs.pathExists(SEED_DIR)) {
      // 1. Copy bibles/bible_versions.js and kjv.json and other files at the root of data if they don't exist
      const seedFiles = await fs.readdir(SEED_DIR);
      for (const item of seedFiles) {
        if (item === 'sermons' || item === 'cache' || item === 'commentary') continue;
        const targetPath = path.join(DATA_DIR, item);
        const seedPath = path.join(SEED_DIR, item);
        if (!(await fs.pathExists(targetPath))) {
          console.log(`📦 Copying missing static file: ${item}`);
          await fs.copy(seedPath, targetPath);
        }
      }

      // 2. Merge sermons/metadata.json
      if (await fs.pathExists(seedMetadataPath)) {
        try {
          const seedMeta = await fs.readJson(seedMetadataPath);
          const dataMeta = await fs.readJson(metadataPath);

          const existingIds = new Set(dataMeta.map((s: any) => s.id));
          const newSermons = seedMeta.filter((s: any) => !existingIds.has(s.id));

          if (newSermons.length > 0) {
            console.log(`📦 Found ${newSermons.length} new sermons in seed data. Merging...`);
            // Prepend new sermons to the metadata array
            const mergedMeta = [...newSermons, ...dataMeta];
            await fs.writeJson(metadataPath, mergedMeta, { spaces: 2 });
          }
        } catch (err: any) {
          console.error('⚠️ Failed to merge sermons metadata.json:', err.message);
        }
      }

      // 3. Copy missing individual sermon files (e.g. sermon ID JSON or MP3)
      const seedSermonsDir = path.join(SEED_DIR, 'sermons');
      const dataSermonsDir = path.join(DATA_DIR, 'sermons');
      if (await fs.pathExists(seedSermonsDir)) {
        const seedSermonFiles = await fs.readdir(seedSermonsDir);
        for (const file of seedSermonFiles) {
          if (file === 'metadata.json' || file === 'user_data.json') continue;
          const targetFilePath = path.join(dataSermonsDir, file);
          const seedFilePath = path.join(seedSermonsDir, file);
          if (!(await fs.pathExists(targetFilePath))) {
            console.log(`📦 Copying missing sermon file: ${file}`);
            await fs.copy(seedFilePath, targetFilePath);
          }
        }
      }
      
      console.log('✅ Synchronization completed successfully.');
    } else {
      console.log('⚠️ SEED_DIR not found, skipping sync.');
    }
  }
}

bootstrap().catch(console.error);
