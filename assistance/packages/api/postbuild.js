// postbuild.js
// Copies JavaScript files to the dist folder after build

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'functions');
const destDir = path.join(__dirname, 'dist', 'src', 'functions');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy direct-ingest.js
const directIngestSrc = path.join(srcDir, 'direct-ingest.js');
const directIngestDest = path.join(destDir, 'direct-ingest.js');

if (fs.existsSync(directIngestSrc)) {
  fs.copyFileSync(directIngestSrc, directIngestDest);
  console.log('Copied direct-ingest.js to dist/src/functions/');
}

// Copy ingest-on-startup.js if it exists
const ingestStartupSrc = path.join(srcDir, 'ingest-on-startup.js');
const ingestStartupDest = path.join(destDir, 'ingest-on-startup.js');

if (fs.existsSync(ingestStartupSrc)) {
  fs.copyFileSync(ingestStartupSrc, ingestStartupDest);
  console.log('Copied ingest-on-startup.js to dist/src/functions/');
}
