// direct-ingest.js
// Direct PDF ingestion without HTTP calls

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { OllamaEmbeddings } = require('@langchain/ollama');

const pdfDir = path.join(process.cwd(), 'assistance', 'data');
const faissStoreFolder = '.faiss';
const ollamaEmbeddingsModel = 'nomic-embed-text';

async function directIngestPdfs() {
  console.log('Starting direct PDF ingestion...');
  
  // Ensure FAISS directory exists
  if (!fs.existsSync(faissStoreFolder)) {
    fs.mkdirSync(faissStoreFolder, { recursive: true });
  }

  const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    console.log('No PDF files found in', pdfDir);
    return;
  }

  console.log(`Found ${files.length} PDF files to ingest`);
  
  const embeddings = new OllamaEmbeddings({ model: ollamaEmbeddingsModel });
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  let allDocuments = [];

  for (const file of files) {
    try {
      console.log(`Processing ${file}...`);
      const filePath = path.join(pdfDir, file);
      const pdfBuffer = fs.readFileSync(filePath);
      
      // Extract text from PDF
      const pdfData = await pdf(pdfBuffer);
      const text = pdfData.text;
      
      if (!text || text.trim().length === 0) {
        console.warn(`No text extracted from ${file}`);
        continue;
      }

      // Split text into chunks
      const chunks = await textSplitter.splitText(text);
      
      // Create documents with metadata
      const documents = chunks.map(chunk => ({
        pageContent: chunk,
        metadata: { source: file }
      }));

      allDocuments.push(...documents);
      console.log(`Processed ${file}: ${chunks.length} chunks`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  if (allDocuments.length === 0) {
    console.error('No documents to index');
    return;
  }

  console.log(`Creating FAISS index with ${allDocuments.length} documents...`);
  
  try {
    // Create FAISS store
    const vectorStore = await FaissStore.fromDocuments(allDocuments, embeddings);
    
    // Save to disk
    await vectorStore.save(faissStoreFolder);
    
    console.log(`FAISS index saved to ${faissStoreFolder}`);
    console.log('PDF ingestion completed successfully!');
  } catch (err) {
    console.error('Error creating FAISS index:', err);
    throw err;
  }
}

module.exports = { directIngestPdfs };
