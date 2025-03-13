import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { PdfDocument } from "@/models/types";

// Path to store document metadata
const DOCUMENTS_PATH = join(process.cwd(), "data", "documents.json");

// In-memory cache of documents
let documents: PdfDocument[] = [];

// Ensure data directory exists
async function ensureDataDir() {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
}

// Load documents from disk
async function loadDocuments(): Promise<PdfDocument[]> {
  try {
    await ensureDataDir();

    if (existsSync(DOCUMENTS_PATH)) {
      const data = await readFile(DOCUMENTS_PATH, "utf-8");
      return JSON.parse(data);
    }

    return [];
  } catch (error) {
    console.error("Error loading documents:", error);
    return [];
  }
}

// Save documents to disk
async function saveDocuments(): Promise<void> {
  try {
    await ensureDataDir();
    await writeFile(DOCUMENTS_PATH, JSON.stringify(documents, null, 2));
  } catch (error) {
    console.error("Error saving documents:", error);
  }
}

// Initialize documents
async function initDocuments() {
  documents = await loadDocuments();
}

// Initialize on module load
initDocuments().catch(console.error);

/**
 * Get all documents
 */
export async function getDocuments(): Promise<PdfDocument[]> {
  // Ensure documents are loaded
  if (documents.length === 0) {
    documents = await loadDocuments();
  }

  return documents;
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<PdfDocument | null> {
  // Ensure documents are loaded
  if (documents.length === 0) {
    documents = await loadDocuments();
  }

  return documents.find((doc) => doc.id === id) || null;
}

/**
 * Add a new document
 */
export async function addDocument(document: PdfDocument): Promise<PdfDocument> {
  // Ensure documents are loaded
  if (documents.length === 0) {
    documents = await loadDocuments();
  }

  documents.push(document);
  await saveDocuments();

  return document;
}

/**
 * Update a document's status
 */
export async function updateDocumentStatus(
  id: string,
  status: "processing" | "indexed" | "failed"
): Promise<PdfDocument | null> {
  // Ensure documents are loaded
  if (documents.length === 0) {
    documents = await loadDocuments();
  }

  const document = documents.find((doc) => doc.id === id);

  if (!document) {
    return null;
  }

  document.status = status;
  await saveDocuments();

  return document;
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<PdfDocument | null> {
  // Ensure documents are loaded
  if (documents.length === 0) {
    documents = await loadDocuments();
  }

  const index = documents.findIndex((doc) => doc.id === id);

  if (index === -1) {
    return null;
  }

  const document = documents[index];
  documents.splice(index, 1);
  await saveDocuments();

  return document;
}
