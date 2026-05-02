import fs from 'fs-extra';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SEED_DIR = path.join(process.cwd(), 'seed-data');

async function bootstrap() {
  console.log('🚀 Bootstrapping data directory...');

  // Ensure data directory exists
  await fs.ensureDir(DATA_DIR);

  // If metadata doesn't exist in the sermons dir, it's likely a fresh mount
  const metadataPath = path.join(DATA_DIR, 'sermons', 'metadata.json');
  
  if (!(await fs.pathExists(metadataPath))) {
    console.log('📦 Persistent data is empty. Seeding from repository...');
    if (await fs.pathExists(SEED_DIR)) {
      await fs.copy(SEED_DIR, DATA_DIR);
      console.log('✅ Data seeded successfully.');
    } else {
      console.log('⚠️ No seed data found at ' + SEED_DIR);
      // Create basic structure if nothing else
      await fs.ensureDir(path.join(DATA_DIR, 'sermons'));
      if (!(await fs.pathExists(metadataPath))) {
        await fs.writeJson(metadataPath, []);
      }
    }
  } else {
    console.log('✨ Persistent data already exists. Skipping seed.');
  }
}

bootstrap().catch(console.error);
