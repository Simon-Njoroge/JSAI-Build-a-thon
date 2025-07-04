// ingest-on-startup.js
// Script to automatically ingest all PDFs in assistance/data/ when the server starts

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const apiUrl = 'http://localhost:7071/api/documents'; // Change port if needed
const pdfDir = path.join(process.cwd(), 'assistance', 'data');

export async function ingestAllPdfs() {
  const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
  for (const file of files) {
    const filePath = path.join(pdfDir, file);
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      });
      if (!res.ok) {
        console.error(`Failed to upload ${file}:`, await res.text());
      } else {
        console.log(`Uploaded ${file}`);
      }
    } catch (err) {
      console.error(`Error uploading ${file}:`, err);
    }
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  ingestAllPdfs();
}
