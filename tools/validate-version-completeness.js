// Validate Bible Version Completeness
const fs = require('fs');
const path = require('path');

const EXPECTED_BOOKS = 66; // Protestant canon

function validateCompleteness(versionPath) {
  const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  
  const bookCount = data.books?.length || 0;
  const status = bookCount >= EXPECTED_BOOKS ? 'COMPLETE' : 'INCOMPLETE';
  
  console.log(`\n${path.basename(versionPath)}:`);
  console.log(`  Books: ${bookCount}/${EXPECTED_BOOKS}`);
  console.log(`  Status: ${status}`);
  
  return status === 'COMPLETE';
}

module.exports = { validateCompleteness };
