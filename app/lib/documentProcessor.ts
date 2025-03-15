"use server";

import { updateDocumentStatus, getDocument } from "./documentStore";
import { indexDocument } from "./vectorStore";
import { PdfDocument } from "@/models/types";
import { extname } from "path";
import mammoth from "mammoth";

/**
 * Process a document by extracting text and indexing it
 */
export async function processDocument(document: PdfDocument): Promise<boolean> {
  console.log(`Starting to process document: ${document.id}`);

  try {
    // Update status to processing
    await updateDocumentStatus(document.id, "processing");

    // Determine file type and extract text accordingly
    const fileExtension = extname(document.filename).toLowerCase();
    let text = "";

    // If fileContent is provided directly, use it
    if (document.fileContent) {
      if (fileExtension === ".pdf") {
        // Extract text from PDF buffer
        text = await extractTextFromPdfBuffer(
          Buffer.from(document.fileContent)
        );
      } else if (fileExtension === ".docx") {
        // Extract text from DOCX buffer
        text = await extractTextFromDocxBuffer(
          Buffer.from(document.fileContent)
        );
      } else {
        console.error(
          `Unsupported file type: ${fileExtension} for document: ${document.id}`
        );
        await updateDocumentStatus(document.id, "failed");
        return false;
      }
    }
    // Otherwise, fetch from blob URL
    else if (document.blobUrl) {
      // Fetch the file from the blob URL
      const response = await fetch(document.blobUrl);
      if (!response.ok) {
        console.error(
          `Failed to fetch document from blob storage: ${document.blobUrl}`
        );
        await updateDocumentStatus(document.id, "failed");
        return false;
      }

      const buffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);

      if (fileExtension === ".pdf") {
        // Extract text from PDF buffer
        text = await extractTextFromPdfBuffer(fileBuffer);
      } else if (fileExtension === ".docx") {
        // Extract text from DOCX buffer
        text = await extractTextFromDocxBuffer(fileBuffer);
      } else {
        console.error(
          `Unsupported file type: ${fileExtension} for document: ${document.id}`
        );
        await updateDocumentStatus(document.id, "failed");
        return false;
      }
    } else {
      console.error(
        `No file content or blob URL available for document: ${document.id}`
      );
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    console.log(`Extracted text from document: ${document.id}`, text);
    if (!text || text.trim().length === 0) {
      console.error(`No text could be extracted from document: ${document.id}`);
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    console.log(
      `Successfully extracted ${text.length} characters from document: ${document.id}`
    );

    // Index the full document text
    await indexDocument({
      id: document.id,
      documentId: document.id,
      text: text,
      metadata: {
        filename: document.filename,
        chunkIndex: 0,
        totalChunks: 1,
      },
    });

    // Update status to indexed
    await updateDocumentStatus(document.id, "indexed");
    console.log(`Successfully processed and indexed document: ${document.id}`);
    return true;
  } catch (error) {
    console.error(`Error processing document ${document.id}:`, error);
    try {
      await updateDocumentStatus(document.id, "failed");
    } catch (updateError) {
      console.error(
        `Error updating document status for ${document.id}:`,
        updateError
      );
    }
    return false;
  }
}

/**
 * Extract text from a PDF buffer
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log(`Attempting to extract text from PDF buffer`);

    // For Vercel deployment, we can't use Python scripts
    // Instead, we'll use a simple text extraction approach
    const text = buffer.toString("utf-8");
    const textContent = text.replace(/[^\x20-\x7E\n]/g, " ").trim();

    if (textContent.length > 0) {
      return textContent;
    }

    throw new Error("Failed to extract text from PDF buffer");
  } catch (error) {
    console.error(`Error extracting text from PDF buffer:`, error);
    throw error;
  }
}

/**
 * Extract text from a DOCX buffer
 */
async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log(`Attempting to extract text from DOCX buffer`);

    // Extract text using mammoth
    const result = await mammoth.extractRawText({
      buffer: buffer as Buffer,
    });

    if (result && result.value) {
      console.log(
        `Successfully extracted ${result.value.length} characters from DOCX`
      );
      return result.value;
    }

    throw new Error("Failed to extract text from DOCX");
  } catch (error) {
    console.error(`Error extracting text from DOCX:`, error);
    throw error;
  }
}

/**
 * Reprocess a document
 */
export async function reprocessDocument(documentId: string): Promise<boolean> {
  console.log(`Reprocessing document: ${documentId}`);

  try {
    const document = await getDocument(documentId);

    if (!document) {
      console.error(`Document not found for reprocessing: ${documentId}`);
      return false;
    }

    return await processDocument(document);
  } catch (error) {
    console.error(`Error reprocessing document ${documentId}:`, error);
    return false;
  }
}
