"use server";

import { PdfDocument } from "@/models/types";
import { PrismaClient } from "@prisma/client";
import { del } from "@vercel/blob";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Add a document to the database
 */
export async function addDocument(document: PdfDocument): Promise<PdfDocument> {
  try {
    // Ensure blobUrl is provided
    if (!document.blobUrl) {
      throw new Error("Blob URL is required");
    }

    // Create a new document in the database
    const dbDocument = await prisma.document.create({
      data: {
        id: document.id,
        userId: document.userId,
        filename: document.filename,
        blobUrl: document.blobUrl,
        contentType: document.contentType || "application/octet-stream", // Default content type if not provided
        uploadDate: new Date(document.uploadDate),
        status: document.status,
        size: document.size,
      },
    });

    return {
      id: dbDocument.id,
      userId: dbDocument.userId,
      filename: dbDocument.filename,
      blobUrl: dbDocument.blobUrl,
      contentType: dbDocument.contentType,
      uploadDate: dbDocument.uploadDate.toISOString(),
      status: dbDocument.status as "processing" | "indexed" | "failed",
      size: dbDocument.size,
      // Include the fileContent if it was provided in the original document
      fileContent: document.fileContent,
    };
  } catch (error) {
    console.error("Error adding document:", error);
    throw new Error("Failed to add document");
  }
}

/**
 * Get all documents
 */
export async function getDocuments(): Promise<PdfDocument[]> {
  try {
    const dbDocuments = await prisma.document.findMany();

    return dbDocuments.map((doc) => ({
      id: doc.id,
      userId: doc.userId,
      filename: doc.filename,
      blobUrl: doc.blobUrl,
      contentType: doc.contentType,
      uploadDate: doc.uploadDate.toISOString(),
      status: doc.status as "processing" | "indexed" | "failed",
      size: doc.size,
    }));
  } catch (error) {
    console.error("Error getting documents:", error);
    return [];
  }
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<PdfDocument | null> {
  try {
    const dbDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!dbDocument) {
      return null;
    }

    return {
      id: dbDocument.id,
      userId: dbDocument.userId,
      filename: dbDocument.filename,
      blobUrl: dbDocument.blobUrl,
      contentType: dbDocument.contentType,
      uploadDate: dbDocument.uploadDate.toISOString(),
      status: dbDocument.status as "processing" | "indexed" | "failed",
      size: dbDocument.size,
    };
  } catch (error) {
    console.error(`Error getting document ${id}:`, error);
    return null;
  }
}

/**
 * Update a document's status
 */
export async function updateDocumentStatus(
  id: string,
  status: "processing" | "indexed" | "failed"
): Promise<PdfDocument | null> {
  try {
    const dbDocument = await prisma.document.update({
      where: { id },
      data: { status },
    });

    return {
      id: dbDocument.id,
      userId: dbDocument.userId,
      filename: dbDocument.filename,
      blobUrl: dbDocument.blobUrl,
      contentType: dbDocument.contentType,
      uploadDate: dbDocument.uploadDate.toISOString(),
      status: dbDocument.status as "processing" | "indexed" | "failed",
      size: dbDocument.size,
    };
  } catch (error) {
    console.error(`Error updating document status ${id}:`, error);
    return null;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<PdfDocument | null> {
  try {
    // Get the document before deleting it
    const document = await getDocument(id);

    if (!document) {
      return null;
    }

    // Delete the document from the database
    await prisma.document.delete({
      where: { id },
    });

    // Delete the file from Vercel Blob Storage if blobUrl exists
    if (document.blobUrl) {
      try {
        await del(document.blobUrl);
        console.log(`Deleted file from Blob Storage: ${document.blobUrl}`);
      } catch (blobError) {
        console.error(
          `Error deleting file from Blob Storage: ${document.blobUrl}`,
          blobError
        );
        // Continue even if blob deletion fails
      }
    }

    return document;
  } catch (error) {
    console.error(`Error deleting document ${id}:`, error);
    return null;
  }
}
