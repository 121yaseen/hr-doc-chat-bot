"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

// Initialize the Google Generative AI client for embeddings
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Initialize Prisma client
const prisma = new PrismaClient();

// Simple in-memory vector store for caching
type VectorDocument = {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  embedding: number[];
};

// In-memory cache
let vectorCache: VectorDocument[] = [];
let isInitialized = false;

// Initialize the vector store
async function initVectorStore() {
  if (isInitialized) return;

  try {
    // Load vectors from database
    const dbVectors = await prisma.vectorStore.findMany();

    // Convert to our internal format
    vectorCache = dbVectors.map((vector) => ({
      id: vector.id,
      documentId: vector.documentId,
      documentName: vector.documentName,
      text: vector.text,
      embedding: vector.embedding,
    }));

    isInitialized = true;
  } catch (error) {
    console.error("Error initializing vector store:", error);
    vectorCache = [];
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

    // Store in database
    const dbVector = await prisma.vectorStore.create({
      data: {
        documentId: document.documentId,
        documentName: document.metadata.filename,
        text: document.text,
        embedding: embedding,
      },
    });

    // Update cache
    vectorCache.push({
      id: dbVector.id,
      documentId: dbVector.documentId,
      documentName: dbVector.documentName,
      text: dbVector.text,
      embedding: dbVector.embedding,
    });
  } catch (error) {
    console.error("Error indexing document:", error);
    throw new Error("Failed to index document");
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
    if (vectorCache.length === 0) {
      return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarity scores
    const results = vectorCache.map((doc) => ({
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
