// Check Bible Alignment Tool
const fs = require('fs');
const path = require('path');

function checkAlignment(bibleFile) {
  const data = JSON.parse(fs.readFileSync(bibleFile, 'utf8'));
  
  console.log(`Checking alignment for: ${path.basename(bibleFile)}`);
  console.log(`Books: ${data.books?.length || 0}`);
  
  // Check structure
  if (!data.books) {
    console.error('ERROR: Missing books array');
    return false;
  }
  
  return true;
}

// Run if called directly
if (require.main === module) {
  const file = process.argv[2];
  if (file) {
    checkAlignment(file);
  } else {
    console.log('Usage: node check-bible-alignment.cjs <bible-file.json>');
  }
}

module.exports = { checkAlignment };
