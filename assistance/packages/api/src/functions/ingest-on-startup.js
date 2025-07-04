// ingest-on-startup.js
// Script to automatically ingest all PDFs in assistance/data/ when the server starts

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const apiUrl = 'http://localhost:7071/api/documents'; // Change port if needed
const pdfDir = path.join(process.cwd(), 'assistance', 'data');

async function ingestAllPdfs() {
  // Dynamically import node-fetch (ESM only)
  const fetch = (await import('node-fetch')).default;
  const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
  for (const file of files) {
    const filePath = path.join(pdfDir, file);
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        throw new Error(`Failed to ingest ${file}: ${res.statusText}`);
      }
      console.log(`Ingested ${file}`);
    } catch (err) {
      console.error(`Error ingesting ${file}:`, err);
    }
  }
}

module.exports = { ingestAllPdfs };
