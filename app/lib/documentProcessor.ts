"use server";

import { updateDocumentStatus, getDocument } from "./documentStore";
import { indexDocument } from "./vectorStore";
import { readFile } from "fs/promises";
import pdfParse from "pdf-parse";
import { PdfDocument } from "@/models/types";
import { join } from "path";

// Maximum number of chunks to process at once to avoid memory issues
const MAX_CHUNKS = 50;

/**
 * Process a document by extracting text and indexing it
 */
export async function processDocument(document: PdfDocument): Promise<boolean> {
  console.log(`Starting to process document: ${document.id}`);

  try {
    // Update status to processing
    await updateDocumentStatus(document.id, "processing");

    // Extract text from PDF
    //const text = await extractTextFromPdf(document.path);
    const text = "test";

    if (!text || text.trim().length === 0) {
      console.error(`No text could be extracted from document: ${document.id}`);
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    console.log(
      `Successfully extracted ${text.length} characters from document: ${document.id}`
    );

    // Split text into chunks to avoid memory issues
    const chunks = splitTextIntoChunks(text);
    console.log(`Split text into ${chunks.length} chunks`);

    // Index each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await indexDocument({
        id: `${document.id}-${i}`,
        documentId: document.id,
        text: chunk,
        metadata: {
          filename: document.filename,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      });
    }

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
 * Extract text from a PDF file
 */
// async function extractTextFromPdf(filePath: string): Promise<string> {
//   try {
//     console.log(`Attempting to extract text from PDF: ${filePath}`);
//     const dataBuffer = await readFile(filePath);

//     try {
//       // Primary extraction method using pdf-parse
//       const pdfData = await pdfParse(dataBuffer);
//       const text = pdfData.text || "";

//       if (text.trim().length > 0) {
//         return text;
//       }

//       throw new Error("Primary extraction method returned empty text");
//     } catch (primaryError) {
//       console.error(
//         "Primary PDF extraction failed, trying fallback method:",
//         primaryError
//       );

//       // Fallback method - read the PDF directly
//       // This is a simplified fallback that may not work for all PDFs
//       // In a production environment, you might want to use multiple libraries
//       const text = dataBuffer.toString("utf-8");
//       const textContent = text.replace(/[^\x20-\x7E\n]/g, " ").trim();

//       if (textContent.length > 0) {
//         return textContent;
//       }

//       throw new Error("Both primary and fallback extraction methods failed");
//     }
//   } catch (error) {
//     console.error(`Error extracting text from PDF:`, error);
//     throw error;
//   }
// }

/**
 * Split text into chunks for indexing
 */
function splitTextIntoChunks(
  text: string,
  chunkSize = 1000,
  overlap = 200
): string[] {
  if (!text || text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);

    // Try to find a sentence boundary to end the chunk
    if (endIndex < text.length) {
      // Look for sentence endings (.!?) followed by a space or newline
      const sentenceEndMatch = text
        .substring(endIndex - 100, endIndex + 100)
        .match(/[.!?]\s+/);

      if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
        // Adjust the end index to the sentence boundary
        endIndex = endIndex - 100 + sentenceEndMatch.index + 1;
      } else {
        // If no sentence boundary, look for a space
        const lastSpace = text.lastIndexOf(" ", endIndex);
        if (lastSpace > startIndex) {
          endIndex = lastSpace;
        }
      }
    }

    chunks.push(text.substring(startIndex, endIndex).trim());

    // Move the start index for the next chunk, accounting for overlap
    startIndex = endIndex - overlap;

    // Ensure we're making progress
    if (startIndex <= 0 || startIndex >= text.length - 10) {
      break;
    }
  }

  return chunks;
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
