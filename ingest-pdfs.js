// ingest-pdfs.js
// Script to upload all PDFs in assistance/data/ to the /api/documents endpoint

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const apiUrl = 'http://localhost:7071/api/documents'; // Change port if needed
const pdfDir = path.join(process.cwd(), 'assistance', 'data');

async function uploadPdf(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  const res = await fetch(apiUrl, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });
  if (!res.ok) {
    console.error(`Failed to upload ${filePath}:`, await res.text());
  } else {
    console.log(`Uploaded ${filePath}`);
  }
}

async function main() {
  const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
  for (const file of files) {
    await uploadPdf(path.join(pdfDir, file));
  }
}

main();
