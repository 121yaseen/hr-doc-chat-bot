"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { join } from "path";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

// Initialize the Google Generative AI client for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Path to store the vector database
const METADATA_PATH = join(process.cwd(), "data", "metadata.json");
const MAX_BATCH_SIZE = 10; // Process embeddings in batches of 10

// Ensure data directory exists
async function ensureDataDir() {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
}

// Simple in-memory vector store instead of FAISS
type VectorDocument = {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  embedding: number[];
};

// In-memory storage
let vectorStore: VectorDocument[] = [];
let isInitialized = false;

// Load the vector database and metadata if they exist
async function initVectorStore() {
  if (isInitialized) return;

  try {
    await ensureDataDir();

    // Load metadata if it exists
    if (existsSync(METADATA_PATH)) {
      const metadataContent = await readFile(METADATA_PATH, "utf-8");
      const data = JSON.parse(metadataContent);
      vectorStore = data.documents || [];
    }
    isInitialized = true;
  } catch (error) {
    console.error("Error initializing vector store:", error);
    vectorStore = [];
    isInitialized = true;
  }
}

// Initialize the vector store
initVectorStore().catch(console.error);

/**
 * Generate embeddings for text using Google's embedding model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const results = await Promise.all(
      texts.map((text) => generateEmbedding(text))
    );
    return results;
  } catch (error) {
    console.error("Error generating embeddings batch:", error);
    throw new Error("Failed to generate embeddings batch");
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Index a document by generating embeddings for its chunks and storing them
 */
export async function indexDocument(document: {
  id: string;
  documentId: string;
  text: string;
  metadata: {
    filename: string;
    chunkIndex: number;
    totalChunks: number;
  };
}): Promise<void> {
  try {
    await initVectorStore();

    // Generate embedding for the document
    const embedding = await generateEmbedding(document.text);

    // Store document with embedding
    vectorStore.push({
      id: document.id,
      documentId: document.documentId,
      documentName: document.metadata.filename,
      text: document.text,
      embedding: embedding,
    });

    // Save to disk
    await saveVectorStore();
  } catch (error) {
    console.error("Error indexing document:", error);
    throw new Error("Failed to index document");
  }
}

/**
 * Save the vector store to disk
 */
async function saveVectorStore(): Promise<void> {
  try {
    await ensureDataDir();

    // Save the metadata and embeddings
    await writeFile(
      METADATA_PATH,
      JSON.stringify({ documents: vectorStore }, null, 2)
    );
  } catch (error) {
    console.error("Error saving vector store:", error);
    throw new Error("Failed to save vector store");
  }
}

/**
 * Search the vector store for relevant document chunks
 */
export async function searchVectorStore(
  query: string,
  k: number = 5
): Promise<
  Array<{
    documentId: string;
    documentName: string;
    text: string;
    score: number;
  }>
> {
  try {
    await initVectorStore();

    // If the vector store is empty, return empty results
    if (vectorStore.length === 0) {
      return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarity scores
    const results = vectorStore.map((doc) => ({
      documentId: doc.documentId,
      documentName: doc.documentName,
      text: doc.text,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Return top k results
    return results.slice(0, k);
  } catch (error) {
    console.error("Error searching vector store:", error);
    throw new Error("Failed to search vector store");
  }
}
